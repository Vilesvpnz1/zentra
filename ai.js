(function () {
  var registry = window.KobranAiRegistry || { providers: [], disclaimer: "" };
  var providers = registry.providers || [];
  var panel = document.getElementById("view-ai");
  var providerSelect = document.getElementById("ai-provider");
  var modelSelect = document.getElementById("ai-model");
  var keyInput = document.getElementById("ai-key");
  var keyHelp = document.getElementById("ai-key-help");
  var keyLink = document.getElementById("ai-key-link");
  var saveKeyBtn = document.getElementById("ai-save-key");
  var chatLog = document.getElementById("ai-chat-log");
  var chatInput = document.getElementById("ai-chat-input");
  var chatSend = document.getElementById("ai-chat-send");
  var chatStatus = document.getElementById("ai-chat-status");
  var messages = [];
  var busy = false;

  function storageKey(id) {
    return "kobran-ai-key-" + id;
  }

  function activeProvider() {
    if (!providerSelect) return providers[0];
    var id = providerSelect.value;
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].id === id) return providers[i];
    }
    return providers[0];
  }

  function fillProviders() {
    if (!providerSelect) return;
    providerSelect.innerHTML = "";
    providers.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      providerSelect.appendChild(opt);
    });
  }

  function fillModels(p) {
    if (!modelSelect || !p) return;
    modelSelect.innerHTML = "";
    (p.models || []).forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });
  }

  function loadKeyForProvider(p) {
    if (!keyInput || !p) return;
    try {
      keyInput.value = sessionStorage.getItem(storageKey(p.id)) || "";
    } catch (e) {
      keyInput.value = "";
    }
  }

  function updateHelp(p) {
    if (!p) return;
    if (keyHelp) keyHelp.textContent = p.keyHelp || "";
    if (keyLink) {
      keyLink.href = p.keyUrl || "#";
      keyLink.textContent = p.keyUrl ? "Get API key" : "";
      keyLink.hidden = !p.keyUrl;
    }
    if (keyInput) keyInput.placeholder = p.keyLabel || "API key";
  }

  function appendBubble(role, text) {
    if (!chatLog) return;
    var row = document.createElement("div");
    row.className = "ai-chat__row ai-chat__row--" + role;
    var bubble = document.createElement("div");
    bubble.className = "ai-chat__bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function setStatus(text, show) {
    if (!chatStatus) return;
    chatStatus.hidden = !show;
    chatStatus.textContent = text || "";
  }

  function onProviderChange() {
    var p = activeProvider();
    fillModels(p);
    loadKeyForProvider(p);
    updateHelp(p);
  }

  function saveKey() {
    var p = activeProvider();
    if (!p || !keyInput) return;
    try {
      sessionStorage.setItem(storageKey(p.id), keyInput.value.trim());
    } catch (e) {}
    setStatus("Key saved for this browser session only.", true);
    setTimeout(function () {
      setStatus("", false);
    }, 2200);
  }

  function sendMessage() {
    if (busy || !chatInput) return;
    var text = chatInput.value.trim();
    if (!text) return;
    var p = activeProvider();
    var apiKey = keyInput ? keyInput.value.trim() : "";
    var model = modelSelect ? modelSelect.value : "";
    if (!apiKey) {
      setStatus("Enter your API key first.", true);
      return;
    }
    busy = true;
    if (chatSend) chatSend.disabled = true;
    setStatus("Thinking…", true);
    messages.push({ role: "user", content: text });
    appendBubble("user", text);
    chatInput.value = "";
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: p.id,
        apiKey: apiKey,
        model: model,
        messages: messages.slice(-20),
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (out) {
        if (!out.ok || !out.data || !out.data.reply) {
          var err = (out.data && out.data.error) || "Request failed";
          appendBubble("assistant", err);
          return;
        }
        messages.push({ role: "assistant", content: out.data.reply });
        appendBubble("assistant", out.data.reply);
      })
      .catch(function () {
        appendBubble("assistant", "Could not reach the AI service.");
      })
      .finally(function () {
        busy = false;
        if (chatSend) chatSend.disabled = false;
        setStatus("", false);
      });
  }

  function render() {
    if (!panel) return;
    fillProviders();
    onProviderChange();
    if (chatLog && !chatLog.dataset.ready) {
      chatLog.dataset.ready = "1";
      appendBubble("assistant", "Pick a provider, paste your API key, and send a message.");
    }
  }

  if (providerSelect) providerSelect.addEventListener("change", onProviderChange);
  if (saveKeyBtn) saveKeyBtn.addEventListener("click", saveKey);
  if (chatSend) chatSend.addEventListener("click", sendMessage);
  if (chatInput) {
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  window.KobranAi = { render: render };
})();
