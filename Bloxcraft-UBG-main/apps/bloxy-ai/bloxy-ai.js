const chat = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const SCTRIPT_BATCH = "AIzaSyDB3iqa4qNqKgaGSP_8w-9ps-qUQaktLIU";
const SCTRIPT_BATCH_2 = "AIzaSyBJyRjymA4PXG9E25vLRUOQthoj8fp6stI";
const SCTRIPT_BATCH_3 = "AIzaSyBJEf6p9x7PgS7sMkjZJikyb4HJkTc__JA";

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${SCTRIPT_BATCH}`;
const API_URL2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${SCTRIPT_BATCH_2}`;
const API_URL3 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${SCTRIPT_BATCH_3}`;

const SYSTEM_PROMPT = "Your Name Is: Bloxy AI. You're Created By: Bloxcraft Studios And Tharun9772Gaming. You Somthings Send Messages With Emojis! Act Cool And Sigma. Act Nice And Chill. 😎. People can also call you 'Bloxy' or 'Bloxy The AI'";

let chatHistory = [];
const MAX_TURNS = 6;
const MAX_CHARS = 1200;
const ERROR_TEXT = "ERROR: Try Again In 1 Minute Or More (Up To 48 Hours)";

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);

function appendMessage(content, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  if (sender === "bot") {
    msg.innerHTML = marked.parse(content);
    msg.querySelectorAll("pre").forEach(pre => {
      const btn = document.createElement("button");
      btn.textContent = "Copy";
      btn.className = "copy-btn";
      btn.onclick = () => {
        navigator.clipboard.writeText(pre.innerText);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1500);
      };
      pre.appendChild(btn);
    });
  } else {
    msg.textContent = content;
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function truncateText(s, n) {
  if (!s) return s;
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + "...";
}

function buildPayload() {
  const recent = chatHistory.slice(-MAX_TURNS * 2);
  const contents = [];


  let fullHistory = [...recent];
  if (fullHistory.length === 0) {
    return {
      contents: [
        {
          role: "user",
          parts: [{ text: truncateText(SYSTEM_PROMPT, MAX_CHARS) }]
        }
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
    };
  }

  fullHistory[0] = {
    role: "user",
    text: SYSTEM_PROMPT + "\n\n" + fullHistory[0].text
  };

  for (const m of fullHistory) {
    const role = m.role === "user" ? "user" : "model";
    contents.push({ role, parts: [{ text: truncateText(m.text, MAX_CHARS) }] });
  }

  return {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
  };
}

async function fetchWithFallback(urls, body) {
  let lastResponse = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      lastResponse = res;
      if (res.ok) return res;

      let text;
      try { text = await res.text(); } catch (e) { text = "<no body>"; }
      console.warn(`[bloxy-ai] endpoint ${url} returned ${res.status}`, { status: res.status, body: text });
    } catch (err) {
      console.warn(`[bloxy-ai] network error on ${url}`, err);
    }
  }
  return lastResponse;
}

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  chatHistory.push({ role: "user", text: message });
  userInput.value = "";

  const payload = buildPayload();

  try {
    const res = await fetchWithFallback([API_URL, API_URL2, API_URL3], payload);

    if (!res) {
      appendMessage(ERROR_TEXT, "bot");
      return;
    }

    if (!res.ok) {
      const bodyText = await res.text();
      console.warn("[bloxy-ai] non-ok final response:", res.status, bodyText);
      appendMessage(ERROR_TEXT, "bot");
      return;
    }

    const data = await res.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      data.output?.[0]?.content?.[0]?.text ??
      null;

    if (!reply) {
      console.warn("[bloxy-ai] unexpected response shape:", data);
      appendMessage(ERROR_TEXT, "bot");
      return;
    }

    appendMessage(reply, "bot");
    chatHistory.push({ role: "bot", text: reply });

  } catch (err) {
    console.error("[bloxy-ai] sendMessage error:", err);
    appendMessage(ERROR_TEXT, "bot");
  }
}


