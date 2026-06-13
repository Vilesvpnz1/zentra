  const openPopup = document.getElementById("openPopup");
  const popupOverlay = document.getElementById("popupOverlay");
  const closePopup = document.getElementById("closePopup");
  const submitCode = document.getElementById("submitCode");
  const secretInput = document.getElementById("secretInput");
  const message = document.getElementById("message");

  function openModal() {
    if (!popupOverlay) return;
    popupOverlay.classList.add("secret-overlay--open");
    if (secretInput) {
      secretInput.focus();
      secretInput.select();
    }
  }

  function closeModal() {
    if (!popupOverlay) return;
    popupOverlay.classList.remove("secret-overlay--open");
    if (message) {
      message.textContent = "";
      message.classList.remove("secret-message--ok");
    }
    if (secretInput) secretInput.value = "";
  }

  if (openPopup) openPopup.addEventListener("click", openModal);
  if (closePopup) closePopup.addEventListener("click", closeModal);

  if (popupOverlay) {
    popupOverlay.addEventListener("click", function (e) {
      if (e.target === popupOverlay) closeModal();
    });
  }

  if (submitCode) {
    submitCode.addEventListener("click", function () {
      const code = secretInput ? secretInput.value.trim() : "";
      if (!code) {
        if (message) {
          message.textContent = "Wrong code. Try again.";
          message.classList.remove("secret-message--ok");
        }
        return;
      }
      submitCode.disabled = true;
      fetch("/api/secret-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.path) {
            window.location.href = result.data.path;
            return;
          }
          if (message) {
            message.textContent = "Wrong code. Try again.";
            message.classList.remove("secret-message--ok");
          }
        })
        .catch(function () {
          if (message) {
            message.textContent = "Wrong code. Try again.";
            message.classList.remove("secret-message--ok");
          }
        })
        .finally(function () {
          submitCode.disabled = false;
        });
    });
  }

  if (secretInput) {
    secretInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && submitCode) submitCode.click();
      if (e.key === "Escape") closeModal();
    });
  }
