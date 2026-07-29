const https = require("https");
const { URL } = require("url");

function httpsRequest(options, body) {
  return new Promise(function (resolve, reject) {
    var req = https.request(options, function (res) {
      var chunks = [];
      res.on("data", function (c) {
        chunks.push(c);
      });
      res.on("end", function () {
        var text = Buffer.concat(chunks).toString("utf8");
        var json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          json = { raw: text };
        }
        resolve({ status: res.statusCode || 0, json: json, text: text });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function openAiStyle(url, apiKey, model, messages, extraHeaders) {
  var parsed = new URL(url);
  var payload = JSON.stringify({
    model: model,
    messages: messages,
    temperature: 0.7,
  });
  var headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    Authorization: "Bearer " + apiKey,
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  return httpsRequest(
    {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: headers,
    },
    payload
  );
}

function extractOpenAiText(json) {
  if (!json) return "";
  if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
    return String(json.choices[0].message.content);
  }
  if (json.error && json.error.message) return "Error: " + json.error.message;
  return "";
}

async function chatWithProvider(provider, apiKey, model, messages) {
  if (!apiKey) return { error: "Missing API key", status: 400 };
  if (!model) return { error: "Missing model", status: 400 };
  if (!Array.isArray(messages) || !messages.length) return { error: "Missing messages", status: 400 };

  var result;
  var reply = "";

  if (provider === "groq") {
    result = await openAiStyle("https://api.groq.com/openai/v1/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "openai") {
    result = await openAiStyle("https://api.openai.com/v1/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "openrouter") {
    result = await openAiStyle("https://openrouter.ai/api/v1/chat/completions", apiKey, model, messages, {
      "HTTP-Referer": "https://kobran.local/",
      "X-Title": "Kobran",
    });
    reply = extractOpenAiText(result.json);
  } else if (provider === "mistral") {
    result = await openAiStyle("https://api.mistral.ai/v1/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "deepseek") {
    result = await openAiStyle("https://api.deepseek.com/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "together") {
    result = await openAiStyle("https://api.together.xyz/v1/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "perplexity") {
    result = await openAiStyle("https://api.perplexity.ai/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "xai") {
    result = await openAiStyle("https://api.x.ai/v1/chat/completions", apiKey, model, messages);
    reply = extractOpenAiText(result.json);
  } else if (provider === "anthropic") {
    var anthropicPayload = JSON.stringify({
      model: model,
      max_tokens: 1024,
      messages: messages.map(function (m) {
        return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
      }),
    });
    result = await httpsRequest(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(anthropicPayload),
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
      anthropicPayload
    );
    if (result.json && result.json.content && result.json.content[0] && result.json.content[0].text) {
      reply = String(result.json.content[0].text);
    } else if (result.json && result.json.error && result.json.error.message) {
      reply = "Error: " + result.json.error.message;
    }
  } else if (provider === "gemini") {
    var geminiBody = JSON.stringify({
      contents: messages.map(function (m) {
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        };
      }),
    });
    result = await httpsRequest(
      {
        hostname: "generativelanguage.googleapis.com",
        path: "/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(geminiBody),
        },
      },
      geminiBody
    );
    if (
      result.json &&
      result.json.candidates &&
      result.json.candidates[0] &&
      result.json.candidates[0].content &&
      result.json.candidates[0].content.parts &&
      result.json.candidates[0].content.parts[0]
    ) {
      reply = String(result.json.candidates[0].content.parts[0].text || "");
    } else if (result.json && result.json.error && result.json.error.message) {
      reply = "Error: " + result.json.error.message;
    }
  } else if (provider === "cohere") {
    var cohereMessages = messages.map(function (m) {
      return { role: m.role === "assistant" ? "CHATBOT" : "USER", message: m.content };
    });
    var coherePayload = JSON.stringify({
      model: model,
      message: messages[messages.length - 1].content,
      chat_history: cohereMessages.slice(0, -1),
    });
    result = await httpsRequest(
      {
        hostname: "api.cohere.com",
        path: "/v2/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(coherePayload),
          Authorization: "Bearer " + apiKey,
        },
      },
      coherePayload
    );
    if (result.json && result.json.text) reply = String(result.json.text);
    else if (result.json && result.json.message && result.json.message.content && result.json.message.content[0]) {
      reply = String(result.json.message.content[0].text || "");
    } else if (result.json && result.json.message) reply = "Error: " + JSON.stringify(result.json.message);
  } else {
    return { error: "Unknown provider", status: 400 };
  }

  if (!reply) {
    return {
      error: (result && result.json && result.json.error && result.json.error.message) || "No response from provider",
      status: result && result.status ? result.status : 502,
      raw: result && result.json ? result.json : null,
    };
  }

  return { reply: reply, status: result.status || 200 };
}

function attachAiChat(app) {
  app.post("/api/ai/chat", function (req, res) {
    var body = req.body && typeof req.body === "object" ? req.body : {};
    var provider = String(body.provider || "").trim();
    var apiKey = String(body.apiKey || "").trim();
    var model = String(body.model || "").trim();
    var messages = Array.isArray(body.messages) ? body.messages : [];
    chatWithProvider(provider, apiKey, model, messages)
      .then(function (out) {
        if (out.error) return res.status(out.status || 502).json({ error: out.error, raw: out.raw || null });
        res.json({ reply: out.reply });
      })
      .catch(function () {
        res.status(502).json({ error: "AI request failed" });
      });
  });
}

module.exports = { attachAiChat, chatWithProvider };
