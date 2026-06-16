const shareConfig = {
  siteUrl: "https://k-linksaas.fangwl591021.workers.dev/",
  liffId: "2007221311-jwiMeoXT",
  slug: "wang-li-chung"
};

const statusEl = document.querySelector("#shareStatus");
const titleEl = document.querySelector("#shareTitle");
const retryButton = document.querySelector("#retryShare");
const diagnosticsEl = document.querySelector("#shareDiagnostics");
const diagnostics = {
  pageUrl: location.href,
  userAgent: navigator.userAgent,
  liffSdkLoaded: Boolean(window.liff),
  liffInit: "pending",
  loggedIn: "unknown",
  shareTargetPickerAvailable: "unknown",
  slug: "",
  apiStatus: "pending",
  shareStatus: "pending",
  errorName: "",
  errorMessage: "",
  errorCode: "",
  errorStack: ""
};

function setShareStatus(title, message, canRetry = false) {
  if (titleEl) titleEl.textContent = title;
  if (statusEl) statusEl.textContent = message;
  if (retryButton) {
    retryButton.disabled = !canRetry;
    retryButton.textContent = canRetry ? "重新開啟分享" : "處理中...";
  }
}

function updateDiagnostics(patch = {}) {
  Object.assign(diagnostics, patch);
  if (!diagnosticsEl) return;
  diagnosticsEl.textContent = JSON.stringify(diagnostics, null, 2);
}

function formatError(error) {
  return {
    errorName: error?.name || "",
    errorMessage: error?.message || String(error || ""),
    errorCode: error?.code || error?.errorCode || "",
    errorStack: error?.stack || ""
  };
}

function getLaunchParams() {
  const params = new URLSearchParams(location.search);
  const state = params.get("liff.state") || "";
  const decoded = decodeURIComponent(state || "");
  if (decoded) {
    const stateQuery = decoded.includes("?") ? decoded.slice(decoded.indexOf("?") + 1) : decoded.replace(/^\//, "");
    const stateParams = new URLSearchParams(stateQuery);
    stateParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  return params;
}

function escapeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|mailto:|tel:|line:\/\/|#)/i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeCard(card) {
  const layout = ["landscape", "portrait", "square"].includes(card.layout) ? card.layout : "landscape";
  const snapshot = card.layoutCards?.[layout] || {};
  return {
    ...card,
    layout,
    title: snapshot.title || card.title || "電子名片",
    desc: snapshot.desc || card.desc || "點擊開啟電子名片",
    chatText: snapshot.chatText || card.chatText || "",
    coverUrl: snapshot.coverUrl || card.coverUrl || "",
    coverLink: snapshot.coverLink || card.coverLink || "",
    buttons: Array.isArray(snapshot.buttons) && snapshot.buttons.length ? snapshot.buttons : (card.buttons || [])
  };
}

async function loadShareCard(slug) {
  updateDiagnostics({ slug, apiStatus: "loading" });
  const response = await fetch(`/api/cards/${encodeURIComponent(slug)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    updateDiagnostics({ apiStatus: `failed:${response.status}` });
    throw new Error(data.error || "名片資料讀取失敗");
  }
  updateDiagnostics({ apiStatus: "success" });
  return normalizeCard(data.card || {});
}

function buildShareMessages(card, shareUrl) {
  const title = card.title || "電子名片";
  const desc = (card.desc || "點擊開啟電子名片").replace(/\s+/g, " ").slice(0, 120);
  const chatText = (card.chatText || `${title} - 電子名片`).replace(/\s+/g, " ").slice(0, 400);
  const coverActionUrl = escapeUrl(card.coverLink || shareUrl);
  const heroUrl = /^https:\/\//i.test(card.coverUrl || "") ? card.coverUrl : "";
  const shareLaunchUrl = `https://liff.line.me/${shareConfig.liffId}?target=share&slug=${encodeURIComponent(card.slug || shareConfig.slug)}`;
  const buttons = (card.buttons || []).slice(0, 4).map((button) => {
    const rawUrl = String(button.url || "").trim();
    return {
      type: "button",
      style: "primary",
      height: "sm",
      color: button.color || "#147d64",
      action: {
        type: "uri",
        label: String(button.label || "開啟").slice(0, 20),
        uri: rawUrl.startsWith("#") ? `${shareUrl}${rawUrl}` : escapeUrl(rawUrl || shareUrl)
      }
    };
  });
  if (!buttons.length) {
    buttons.push({
      type: "button",
      style: "primary",
      height: "sm",
      color: "#147d64",
      action: { type: "uri", label: "開啟名片", uri: shareUrl }
    });
  }

  const contents = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "lg",
      paddingAll: "18px",
      contents: [
        { type: "text", text: title, weight: "bold", size: "xl", wrap: true },
        { type: "text", text: desc, size: "sm", color: "#61707a", wrap: true }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "18px",
      contents: buttons
    }
  };

  if (heroUrl) {
    contents.hero = {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      contents: [
        {
          type: "image",
          url: heroUrl,
          size: "full",
          aspectRatio: card.layout === "square" ? "1:1" : card.layout === "portrait" ? "2:3" : "20:13",
          aspectMode: "cover",
          action: { type: "uri", uri: coverActionUrl }
        },
        {
          type: "box",
          layout: "vertical",
          position: "absolute",
          offsetTop: "10px",
          offsetEnd: "10px",
          width: "74px",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              color: "#f0444f",
              action: { type: "uri", label: "分享", uri: shareLaunchUrl }
            }
          ]
        }
      ]
    };
  }

  return [
    { type: "text", text: chatText },
    { type: "flex", altText: chatText, contents }
  ];
}

async function openShareTargetPicker() {
  const params = getLaunchParams();
  const slug = params.get("slug") || shareConfig.slug;
  const shareUrl = `${shareConfig.siteUrl}c/${encodeURIComponent(slug)}`;
  updateDiagnostics({
    pageUrl: location.href,
    liffSdkLoaded: Boolean(window.liff),
    slug,
    shareStatus: "starting",
    errorName: "",
    errorMessage: "",
    errorCode: "",
    errorStack: ""
  });
  setShareStatus("正在開啟 LINE 通訊錄", "正在載入名片資料...");

  if (!window.liff) {
    updateDiagnostics({ liffSdkLoaded: false, shareStatus: "failed:no-liff-sdk" });
    setShareStatus("LIFF 尚未載入", "請從 LINE 內重新開啟分享。", true);
    return;
  }

  const card = await loadShareCard(slug);
  setShareStatus("正在開啟 LINE 通訊錄", "正在初始化 LINE 分享功能...");
  try {
    await window.liff.init({ liffId: shareConfig.liffId });
    updateDiagnostics({ liffInit: "success" });
  } catch (error) {
    updateDiagnostics({ liffInit: "failed", shareStatus: "failed:liff-init", ...formatError(error) });
    throw error;
  }

  if (!window.liff.isLoggedIn()) {
    updateDiagnostics({ loggedIn: false, shareStatus: "login-redirect" });
    window.liff.login({ redirectUri: location.href });
    return;
  }
  updateDiagnostics({ loggedIn: true });

  if (!window.liff.isApiAvailable?.("shareTargetPicker")) {
    updateDiagnostics({ shareTargetPickerAvailable: false, shareStatus: "failed:api-unavailable" });
    setShareStatus("無法開啟 LINE 通訊錄", "請確認 LIFF 後台已啟用 Share target picker。", true);
    return;
  }
  updateDiagnostics({ shareTargetPickerAvailable: true });

  setShareStatus("正在開啟 LINE 通訊錄", "請選擇要分享的好友或群組...");
  let result;
  try {
    result = await window.liff.shareTargetPicker(buildShareMessages(card, shareUrl), { isMultiple: true });
  } catch (error) {
    updateDiagnostics({ shareStatus: "failed:share-target-picker", ...formatError(error) });
    throw error;
  }
  if (result?.status === "success") {
    updateDiagnostics({ shareStatus: "success" });
    setShareStatus("分享已送出", "名片已送到你選擇的 LINE 對象。", true);
    return;
  }
  updateDiagnostics({ shareStatus: `cancel:${result?.status || "empty-result"}` });
  setShareStatus("已取消分享", "你可以按下方按鈕重新開啟 LINE 通訊錄。", true);
}

retryButton?.addEventListener("click", () => {
  retryButton.disabled = true;
  openShareTargetPicker().catch((error) => {
    updateDiagnostics(formatError(error));
    setShareStatus("分享啟動失敗", error?.message || "請稍後再試。", true);
  });
});

openShareTargetPicker().catch((error) => {
  updateDiagnostics(formatError(error));
  setShareStatus("分享啟動失敗", error?.message || "請稍後再試。", true);
});

updateDiagnostics();
