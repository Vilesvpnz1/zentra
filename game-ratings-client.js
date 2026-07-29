window.KobranGameRatings = (function () {
  var cache = {};
  var votes = {};
  var enabled = true;
  var VOTE_KEY = "kobran-game-votes-v1";

  function loadLocalVotes() {
    try {
      var raw = localStorage.getItem(VOTE_KEY);
      votes = raw ? JSON.parse(raw) : {};
    } catch (e) {
      votes = {};
    }
  }

  function saveLocalVotes() {
    try {
      localStorage.setItem(VOTE_KEY, JSON.stringify(votes));
    } catch (e) {}
  }

  function hwidHeader() {
    var key = "kobran-device-hwid";
    var id = localStorage.getItem(key);
    if (!id) {
      id = "hw_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return { "X-Device-Hwid": id };
  }

  function refresh() {
    return fetch("/api/games/ratings", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : { ratings: {} };
      })
      .then(function (data) {
        cache = (data && data.ratings) || {};
      })
      .catch(function () {});
  }

  function get(gameId) {
    var row = cache[gameId] || { up: 0, down: 0 };
    return {
      up: Number(row.up) || 0,
      down: Number(row.down) || 0,
      score: (Number(row.up) || 0) - (Number(row.down) || 0),
      myVote: votes[gameId] || "",
    };
  }

  function vote(gameId, kind) {
    if (!enabled || !gameId) return Promise.resolve(get(gameId));
    if (votes[gameId]) return Promise.resolve(get(gameId));
    return fetch("/api/games/" + encodeURIComponent(gameId) + "/rate", {
      method: "POST",
      credentials: "same-origin",
      headers: Object.assign({ "Content-Type": "application/json" }, hwidHeader()),
      body: JSON.stringify({ vote: kind }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (pack) {
        if (pack.ok && pack.body && pack.body.ratings) {
          cache[gameId] = pack.body.ratings;
          votes[gameId] = kind;
          saveLocalVotes();
        } else if (pack.body && pack.body.error === "already_voted" && pack.body.vote) {
          votes[gameId] = pack.body.vote;
          saveLocalVotes();
        }
        return get(gameId);
      })
      .catch(function () {
        return get(gameId);
      });
  }

  function mount(card, gameId) {
    if (!enabled || !card || !gameId) return null;
    var row = document.createElement("div");
    row.className = "site__card-rating";
    var upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "site__card-rate site__card-rate--up";
    upBtn.setAttribute("aria-label", "Rate up");
    var downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "site__card-rate site__card-rate--down";
    downBtn.setAttribute("aria-label", "Rate down");
    var count = document.createElement("span");
    count.className = "site__card-rate-count";

    function paint() {
      var data = get(gameId);
      var total = data.up + data.down;
      count.textContent = total > 0 ? String(data.score > 0 ? "+" + data.score : data.score) : "0";
      upBtn.classList.toggle("site__card-rate--picked", data.myVote === "up");
      downBtn.classList.toggle("site__card-rate--picked", data.myVote === "down");
      upBtn.disabled = !!data.myVote;
      downBtn.disabled = !!data.myVote;
    }

    upBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      vote(gameId, "up").then(paint);
    });
    downBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      vote(gameId, "down").then(paint);
    });

    row.append(upBtn, count, downBtn);
    paint();
    return row;
  }

  function setEnabled(on) {
    enabled = !!on;
  }

  loadLocalVotes();
  refresh();

  window.addEventListener("kobran-site-config", function (e) {
    var features = e.detail && e.detail.features;
    if (features && typeof features.gameRatings === "boolean") {
      setEnabled(features.gameRatings);
    }
  });

  return {
    refresh: refresh,
    get: get,
    vote: vote,
    mount: mount,
    setEnabled: setEnabled,
  };
})();
