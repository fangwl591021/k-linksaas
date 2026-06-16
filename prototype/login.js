const form = document.querySelector("#loginForm");
const statusEl = document.querySelector("#loginStatus");
const params = new URLSearchParams(location.search);
const nextPath = params.get("next") || "/member";

function setStatus(message, danger = true) {
  statusEl.textContent = message;
  statusEl.style.color = danger ? "#b42318" : "#147d64";
}

function safeNext(path) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/member";
  return path;
}

function lockButton(button, processingText = "處理中...", doneText = "已完成") {
  if (!button || button.disabled) return null;
  const originalText = button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = processingText;
  return {
    done() {
      button.textContent = doneText;
      button.setAttribute("aria-busy", "false");
    },
    fail() {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
      button.textContent = originalText;
    }
  };
}

function translateError(message) {
  const map = {
    "Email and password are required": "請輸入電子郵件與密碼",
    "Invalid email or password": "電子郵件或密碼錯誤",
    "Account is disabled": "帳號已停用",
    "Authentication required": "請先登入"
  };
  return map[message] || message || "登入失敗";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const lock = lockButton(event.submitter, "登入中...", "已完成");
  if (!lock) return;
  setStatus("登入中...", false);

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#email").value.trim(),
        password: document.querySelector("#password").value
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(translateError(data.error || `HTTP ${response.status}`));
    }
    setStatus("登入成功，正在進入後台...", false);
    lock.done();
    location.href = safeNext(nextPath);
  } catch (error) {
    lock.fail();
    setStatus(translateError(error.message));
  }
});
