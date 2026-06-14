window.KritikalChat = (function () {
  const STORAGE_CHAT_NAME = "kritikal-chat-display-name";
  const STORAGE_CHAT_KEY = "kritikal-chat-author-key";
  const STORAGE_DEVICE_HWID = "kritikal-device-hwid";

  const chatGate = document.getElementById("chat-gate");
  const chatMain = document.getElementById("chat-main");
  const chatNameInput = document.getElementById("chat-name-input");
  const chatJoinBtn = document.getElementById("chat-join");
  const chatYouDisplay = document.getElementById("chat-you-display");
  const chatChangeName = document.getElementById("chat-change-name");
  const chatBlocked = document.getElementById("chat-blocked");
  const chatBlockedText = document.getElementById("chat-blocked-text");
  const chatSyncWrap = document.getElementById("chat-sync-wrap");
  const chatSyncStatus = document.getElementById("chat-sync-status");
  const chatMessagesEl = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatMsgInput = document.getElementById("chat-msg-input");
  const siteBlocked = document.getElementById("site-blocked");

  let chatPollTimer = null;
  let chatSyncClearTimer = null;
  let lastChatRevision = null;
  let chatSendLocked = false;
  let blockStatus = { siteBlocked: false, chatBlocked: false };

  function randomId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return (
      "id-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function readDeviceHwid() {
    let hwid = localStorage.getItem(STORAGE_DEVICE_HWID);
    if (!hwid) {
      hwid = randomId();
      localStorage.setItem(STORAGE_DEVICE_HWID, hwid);
    }
    return hwid;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const nextInit = init ? Object.assign({}, init) : {};
    const headers = new Headers(nextInit.headers || {});
    headers.set("X-Device-HWID", readDeviceHwid());
    nextInit.headers = headers;
    return nativeFetch(input, nextInit);
  };

  function readChatAuthorKey() {
    let key = localStorage.getItem(STORAGE_CHAT_KEY);
    if (!key) {
      key = randomId();
      localStorage.setItem(STORAGE_CHAT_KEY, key);
    }
    return key;
  }

  function applyBlockStatusUi() {
    if (siteBlocked) {
      siteBlocked.hidden = !blockStatus.siteBlocked;
      siteBlocked.classList.toggle("site-blocked--hidden", !blockStatus.siteBlocked);
    }
    if (chatBlocked && chatBlockedText) {
      if (blockStatus.chatBlocked || blockStatus.siteBlocked) {
        chatBlocked.hidden = false;
        chatBlockedText.textContent = blockStatus.siteBlocked
          ? "This device is blacklisted from the website."
          : "This device is blacklisted from chat.";
        if (chatForm) chatForm.hidden = true;
      } else {
        chatBlocked.hidden = true;
        if (chatForm) chatForm.hidden = false;
      }
    }
  }

  async function fetchBlockStatus() {
    try {
      const res = await fetch("/api/block-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      blockStatus = {
        siteBlocked: Boolean(data && data.siteBlocked),
        chatBlocked: Boolean(data && data.chatBlocked),
      };
      applyBlockStatusUi();
    } catch (e) {}
  }

  function syncChatGate() {
    if (!chatGate || !chatMain) return;
    const name = localStorage.getItem(STORAGE_CHAT_NAME);
    if (chatNameInput) chatNameInput.value = name || "";
    if (name) {
      chatGate.classList.add("chat__gate--hidden");
      chatMain.classList.remove("chat__main--hidden");
      if (chatYouDisplay) chatYouDisplay.textContent = name;
      readChatAuthorKey();
    } else {
      chatGate.classList.remove("chat__gate--hidden");
      chatMain.classList.add("chat__main--hidden");
    }
  }

  function formatChatTime(ts) {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function setChatSync(text, variant, ttlMs) {
    if (!chatSyncWrap || !chatSyncStatus) return;
    if (chatSyncClearTimer) {
      clearTimeout(chatSyncClearTimer);
      chatSyncClearTimer = null;
    }
    chatSyncStatus.classList.remove("chat__sync--warn", "chat__sync--error");
    if (!text) {
      chatSyncWrap.hidden = true;
      chatSyncStatus.textContent = "";
      return;
    }
    chatSyncWrap.hidden = false;
    chatSyncStatus.textContent = text;
    if (variant === "warn") chatSyncStatus.classList.add("chat__sync--warn");
    if (variant === "error") chatSyncStatus.classList.add("chat__sync--error");
    const ttl = ttlMs === undefined ? 6500 : ttlMs;
    if (ttl > 0) {
      chatSyncClearTimer = window.setTimeout(function () {
        chatSyncWrap.hidden = true;
        chatSyncStatus.textContent = "";
        chatSyncStatus.classList.remove("chat__sync--warn", "chat__sync--error");
        chatSyncClearTimer = null;
      }, ttl);
    }
  }

  function applyRevisionHeader(res) {
    const revHdr = res.headers.get("X-Chat-Revision");
    if (revHdr !== null && revHdr !== "") {
      const parsed = Number.parseInt(revHdr, 10);
      if (Number.isFinite(parsed)) lastChatRevision = parsed;
    }
  }

  function renderChatMessages(rows) {
    if (!chatMessagesEl) return;
    const el = chatMessagesEl;
    const prevSH = el.scrollHeight;
    const prevST = el.scrollTop;
    const threshold = 72;
    const stickToBottom = rows.length === 0 || prevSH - prevST - el.clientHeight <= threshold;

    el.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "site__ann-empty";
      empty.style.margin = "0";
      empty.textContent = "No messages yet";
      el.appendChild(empty);
      requestAnimationFrame(function () {
        el.scrollTop = el.scrollHeight;
      });
      return;
    }
    const frag = document.createDocumentFragment();
    rows.forEach(function (row) {
      const wrap = document.createElement("article");
      wrap.className = "chat-msg";
      wrap.dataset.id = row.id;

      const top = document.createElement("div");
      top.className = "chat-msg__top";

      const nameEl = document.createElement("span");
      nameEl.className = "chat-msg__name";
      nameEl.textContent = row.name || "Someone";

      const timeEl = document.createElement("time");
      timeEl.className = "chat-msg__time";
      timeEl.dateTime = new Date(row.ts).toISOString();
      timeEl.textContent = formatChatTime(row.ts);

      top.appendChild(nameEl);
      top.appendChild(timeEl);
      wrap.appendChild(top);

      const cap = (row.text || "").trim();
      if (cap) {
        const textEl = document.createElement("p");
        textEl.className = "chat-msg__text";
        textEl.textContent = cap;
        wrap.appendChild(textEl);
      }

      if (row.mine) {
        const actions = document.createElement("div");
        actions.className = "chat-msg__actions";
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "chat-msg__del";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", function () {
          deleteChatMessage(row.id);
        });
        actions.appendChild(delBtn);
        wrap.appendChild(actions);
      }

      frag.appendChild(wrap);
    });
    el.appendChild(frag);
    requestAnimationFrame(function () {
      if (stickToBottom) el.scrollTop = el.scrollHeight;
      else el.scrollTop = prevST;
    });
  }

  async function fetchChatMessages(forceFull) {
    try {
      const key = localStorage.getItem(STORAGE_CHAT_KEY);
      const headers = {};
      if (key) headers["X-Author-Key"] = key;
      let url = "/api/chat/messages";
      if (!forceFull && lastChatRevision !== null && lastChatRevision !== undefined) {
        url += "?rev=" + encodeURIComponent(String(lastChatRevision));
      }
      const res = await fetch(url, { headers: headers, cache: "no-store" });
      if (res.status === 204) return;
      if (!res.ok) {
        if (res.status === 403) {
          let code = "";
          try {
            const b = await res.json();
            code = String((b && b.error) || "");
          } catch (e) {}
          if (code === "chat_blocked" || code === "site_blocked") {
            await fetchBlockStatus();
            if (code === "chat_blocked") setChatSync("This device is blacklisted from chat.", "error", 0);
            else setChatSync("This device is blacklisted from the website.", "error", 0);
          }
          return;
        }
        throw new Error(String(res.status));
      }
      applyRevisionHeader(res);
      const data = await res.json();
      if (Array.isArray(data)) renderChatMessages(data);
    } catch (e) {
      setChatSync("Could not refresh messages.", "warn", 8000);
    }
  }

  async function deleteChatMessage(id) {
    try {
      const key = localStorage.getItem(STORAGE_CHAT_KEY);
      if (!key) return;
      const res = await fetch("/api/chat/messages/" + encodeURIComponent(id), {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Author-Key": key,
        },
        body: JSON.stringify({ authorKey: key }),
      });
      if (res.ok) await fetchChatMessages(true);
      else if (res.status === 403) setChatSync("You can only delete your own messages.", "warn");
      else setChatSync("Could not delete message.", "warn");
    } catch (e) {
      setChatSync("Could not delete message.", "warn");
    }
  }

  function stopPoll() {
    if (chatPollTimer) {
      clearInterval(chatPollTimer);
      chatPollTimer = null;
    }
  }

  function startPoll() {
    stopPoll();
    lastChatRevision = null;
    syncChatGate();
    fetchBlockStatus();
    fetchChatMessages(true);
    chatPollTimer = window.setInterval(function () {
      if (document.hidden) return;
      if (navigator.onLine === false) return;
      fetchChatMessages();
    }, 2800);
  }

  if (chatJoinBtn) {
    chatJoinBtn.addEventListener("click", function () {
      const raw = chatNameInput.value.trim().slice(0, 40);
      if (!raw) return;
      localStorage.setItem(STORAGE_CHAT_NAME, raw);
      readChatAuthorKey();
      syncChatGate();
      lastChatRevision = null;
      fetchChatMessages(true);
    });
  }

  if (chatChangeName) {
    chatChangeName.addEventListener("click", function () {
      localStorage.removeItem(STORAGE_CHAT_NAME);
      syncChatGate();
      if (chatNameInput) chatNameInput.focus();
    });
  }

  if (chatForm) {
    chatForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = localStorage.getItem(STORAGE_CHAT_NAME);
      const text = chatMsgInput.value.trim();
      const authorKey = readChatAuthorKey();
      if (!name || chatSendLocked || !text) return;
      chatSendLocked = true;
      try {
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, text: text, authorKey: authorKey }),
        });
        if (res.ok) {
          chatMsgInput.value = "";
          await fetchChatMessages(true);
          setChatSync("", "", 0);
        } else if (res.status === 429) {
          setChatSync("Sending too fast. Try again in about 60 seconds.", "warn", 10000);
        } else if (res.status === 403) {
          await fetchBlockStatus();
          setChatSync("This device is blacklisted from chat.", "error", 0);
        } else {
          setChatSync("Message was not sent.", "error");
        }
      } catch (e) {
        setChatSync("Network error. Message not sent. Try again.", "error");
      } finally {
        chatSendLocked = false;
      }
    });
  }

  fetchBlockStatus();

  return {
    start: startPoll,
    stop: stopPoll,
    refreshBlockStatus: fetchBlockStatus,
  };
})();
