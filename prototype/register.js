const config = {
  liffId: "2007221311-jwiMeoXT"
};

const form = document.querySelector("#registerForm");
const result = document.querySelector("#registerResult");
const lineButton = document.querySelector("#lineRegisterButton");

function setResult(message, ok = true) {
  result.textContent = message;
  result.style.color = ok ? "#147d64" : "#b42318";
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

async function apiRegister(payload) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const lock = lockButton(event.submitter, "註冊中...", "已完成");
  if (!lock) return;
  setResult("正在建立會員...");
  try {
    const data = await apiRegister({
      provider: "password",
      displayName: document.querySelector("#displayName").value.trim(),
      company: document.querySelector("#company").value.trim(),
      email: document.querySelector("#email").value.trim(),
      password: document.querySelector("#password").value,
      slug: document.querySelector("#slug").value.trim(),
      cardTitle: document.querySelector("#cardTitle").value.trim()
    });
    setResult(`註冊完成。會員編號 ${data.user.memberNo}，名片網址 /c/${data.card.slug}`);
    form.reset();
    lock.done();
  } catch (error) {
    lock.fail();
    setResult(`註冊失敗：${error.message}`, false);
  }
});

lineButton.addEventListener("click", async () => {
  const lock = lockButton(lineButton, "處理中...", "已完成");
  if (!lock) return;
  setResult("正在啟動 LINE 註冊...");
  try {
    if (!window.liff) throw new Error("LIFF SDK 尚未載入，請用 LIFF URL 測試");
    await window.liff.init({ liffId: config.liffId });
    if (!window.liff.isLoggedIn()) {
      window.liff.login({ redirectUri: `${location.origin}/register` });
      return;
    }
    const profile = await window.liff.getProfile();
    const data = await apiRegister({
      provider: "line",
      providerUserId: profile.userId,
      displayName: profile.displayName,
      cardTitle: `${profile.displayName} 的電子名片`
    });
    setResult(`LINE 註冊完成。會員編號 ${data.user.memberNo}，名片網址 /c/${data.card.slug}`);
  } catch (error) {
    setResult(`LINE 註冊失敗：${error.message}`, false);
  }
});

document.querySelector("#googleRegisterButton").addEventListener("click", () => {
  setResult("Google 登入入口已保留，正式版會接登入回呼。", false);
});

document.querySelector("#facebookRegisterButton").addEventListener("click", () => {
  setResult("Facebook 登入入口已保留，正式版會接登入回呼。", false);
});
