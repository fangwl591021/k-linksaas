const appConfig = {
  siteUrl: "https://k-linksaas.fangwl591021.workers.dev/",
  liffId: "2007221311-jwiMeoXT",
  liffUrl: "https://liff.line.me/2007221311-jwiMeoXT",
  slug: "wang-li-chung"
};

const appState = {
  metrics: { views: 0, clicks: 0, leads: 0 },
  liffReady: false,
  lineProfile: null,
  profile: null,
  editor: { type: "", buttonIndex: -1, pendingCoverBlob: null, pendingCoverObjectUrl: "" }
};

Object.assign(appConfig, getRouteConfig());

const cardConfig = {
  id: "demo-card",
  layout: "landscape",
  coverUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  coverLink: "",
  title: "Ruflo Cards Demo",
  desc: "SaaS 電子名片 demo，可編輯、儲存、收集名單並分享到 LINE。",
  chatText: "",
  descColor: "#61707a",
  descAlign: "center",
  buttons: [
    { label: "LINE 登入", url: appConfig.liffUrl, color: "#06C755" },
    { label: "Book a Demo", url: appConfig.siteUrl, color: "#2c5f9e" },
    { label: "Download vCard", url: "#vcard", color: "#c8792d" }
  ]
};

const layoutLabels = {
  landscape: "標準",
  portrait: "滿版",
  square: "方形"
};

const layoutKeys = ["landscape", "portrait", "square"];

function cloneButtons(buttons) {
  return Array.isArray(buttons)
    ? buttons.map((button) => ({ ...button }))
    : [];
}

function createLayoutSnapshot(source = cardConfig) {
  return {
    coverUrl: source.coverUrl || "",
    coverLink: source.coverLink || "",
    title: source.title || "",
    desc: source.desc || source.description || "",
    chatText: source.chatText || "",
    descColor: source.descColor || "#61707a",
    descAlign: source.descAlign || "center",
    buttons: cloneButtons(source.buttons),
    detached: Boolean(source.detached)
  };
}

function normalizeLayoutSnapshot(source, fallback) {
  const base = fallback || createLayoutSnapshot(cardConfig);
  return {
    coverUrl: source?.coverUrl || source?.cover_url || base.coverUrl,
    coverLink: source?.coverLink || source?.cover_link || base.coverLink || "",
    title: source?.title || base.title,
    desc: source?.desc || source?.description || base.desc,
    chatText: source?.chatText || source?.chat_text || base.chatText || "",
    descColor: source?.descColor || source?.desc_color || base.descColor,
    descAlign: source?.descAlign || source?.desc_align || base.descAlign,
    buttons: cloneButtons(source?.buttons?.length ? source.buttons : base.buttons),
    detached: Boolean(source?.detached)
  };
}

function ensureLayoutCards() {
  const current = createLayoutSnapshot(cardConfig);
  const existing = cardConfig.layoutCards && typeof cardConfig.layoutCards === "object"
    ? cardConfig.layoutCards
    : {};
  cardConfig.layoutCards = {};
  layoutKeys.forEach((layout) => {
    cardConfig.layoutCards[layout] = normalizeLayoutSnapshot(existing[layout], current);
  });
}

function saveActiveLayoutSnapshot(options = {}) {
  ensureLayoutCards();
  const layout = normalizeLayout(cardConfig.layout);
  const previous = cardConfig.layoutCards[layout] || {};
  const snapshot = createLayoutSnapshot(cardConfig);
  snapshot.detached = options.markDetached ? true : Boolean(previous.detached);
  cardConfig.layoutCards[layout] = snapshot;
}

function commitActiveLayoutEdit(options = {}) {
  ensureLayoutCards();
  const activeLayout = normalizeLayout(cardConfig.layout);
  const syncLinked = options.syncLinked !== false;
  const activeWasDetached = Boolean(cardConfig.layoutCards[activeLayout]?.detached);
  const snapshot = createLayoutSnapshot(cardConfig);
  layoutKeys.forEach((layout) => {
    const existing = cardConfig.layoutCards[layout] || {};
    if (layout === activeLayout || (syncLinked && !activeWasDetached && !existing.detached)) {
      cardConfig.layoutCards[layout] = {
        ...snapshot,
        buttons: cloneButtons(snapshot.buttons),
        detached: layout === activeLayout ? true : Boolean(existing.detached)
      };
    }
  });
}

function applyActiveLayoutSnapshot() {
  ensureLayoutCards();
  const snapshot = cardConfig.layoutCards[normalizeLayout(cardConfig.layout)];
  Object.assign(cardConfig, {
    coverUrl: snapshot.coverUrl,
    coverLink: snapshot.coverLink,
    title: snapshot.title,
    desc: snapshot.desc,
    chatText: snapshot.chatText,
    descColor: snapshot.descColor,
    descAlign: snapshot.descAlign,
    buttons: cloneButtons(snapshot.buttons)
  });
}

const els = {
  metricViews: document.querySelector("#metricViews"),
  metricClicks: document.querySelector("#metricClicks"),
  metricLeads: document.querySelector("#metricLeads"),
  sourceLabel: document.querySelector("#sourceLabel"),
  leadRows: document.querySelector("#leadRows"),
  formNote: document.querySelector("#formNote"),
  loginNote: document.querySelector("#loginNote"),
  liffStatusText: document.querySelector("#liffStatusText"),
  liffProfileText: document.querySelector("#liffProfileText"),
  builderNote: document.querySelector("#builderNote"),
  wysiwygCanvas: document.querySelector("#wysiwygCanvas"),
  editModal: document.querySelector("#cardEditModal"),
  editModalTitle: document.querySelector("#editModalTitle"),
  cardEditForm: document.querySelector("#cardEditForm")
};

const mobileTabs = ["home", "login", "card", "crm", "builder"];

function getRouteConfig() {
  const path = location.pathname || "/";
  const cardMatch = path.match(/^\/c\/([^/]+)/);
  const profileMatch = path.match(/^\/u\/([^/]+)/);
  if (profileMatch) {
    return {
      mode: "profile",
      profileCode: decodeURIComponent(profileMatch[1]),
      slug: appConfig.slug
    };
  }
  if (cardMatch) {
    return {
      mode: "card",
      profileCode: "",
      slug: decodeURIComponent(cardMatch[1])
    };
  }
  return {
    mode: "home",
    profileCode: "",
    slug: appConfig.slug
  };
}

function apiUrl(path) {
  return path;
}

function isFilePreview() {
  return location.protocol === "file:";
}

async function apiRequest(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `API 錯誤：${response.status}`);
  }
  return data;
}

function publicUrl(path) {
  return new URL(path.replace(/^\//, ""), appConfig.siteUrl).toString();
}

function currentShareUrl() {
  if (appConfig.mode === "profile" && appConfig.profileCode) {
    return publicUrl(`/u/${encodeURIComponent(appConfig.profileCode)}`);
  }
  return publicUrl(`/c/${encodeURIComponent(appConfig.slug)}`);
}

function ensureProfileHomeElement() {
  let section = document.querySelector("#profileHome");
  if (section) return section;
  section = document.createElement("section");
  section.id = "profileHome";
  section.className = "workspace profile-home hidden";
  section.innerHTML = `
    <div class="profile-home-cover" data-profile-cover></div>
    <div class="profile-home-body">
      <div class="profile-home-avatar" data-profile-avatar>U</div>
      <p class="eyebrow">個人首頁</p>
      <h2 data-profile-name>會員首頁</h2>
      <p class="profile-home-code" data-profile-code></p>
      <p class="profile-home-headline" data-profile-headline></p>
      <p class="profile-home-intro" data-profile-intro></p>
      <div class="profile-home-actions">
        <a class="button primary" data-profile-line href="#card">LINE 聯絡</a>
        <a class="button secondary" data-profile-phone href="#card">行動電話</a>
        <a class="button secondary" data-profile-website href="#card">官方網站</a>
      </div>
    </div>
  `;
  const cardSection = document.querySelector("#card");
  document.querySelector("main")?.insertBefore(section, cardSection || null);
  return section;
}

function renderProfileHome(profile) {
  if (!profile) return;
  const section = ensureProfileHomeElement();
  section.classList.remove("hidden");
  const displayName = profile.displayName || profile.storeCode || "會員首頁";
  const coverUrl = profile.coverUrl || cardConfig.coverUrl || "";
  const avatarText = displayName.trim().slice(0, 1).toUpperCase() || "U";
  const cover = section.querySelector("[data-profile-cover]");
  if (cover) {
    cover.style.backgroundImage = coverUrl ? `url("${coverUrl.replace(/"/g, "%22")}")` : "";
  }
  section.querySelector("[data-profile-avatar]").textContent = avatarText;
  section.querySelector("[data-profile-name]").textContent = displayName;
  section.querySelector("[data-profile-code]").textContent = `專屬網址 /u/${profile.storeCode || appConfig.profileCode}`;
  section.querySelector("[data-profile-headline]").textContent = profile.headline || "";
  section.querySelector("[data-profile-intro]").textContent = profile.intro || "";

  const line = section.querySelector("[data-profile-line]");
  const phone = section.querySelector("[data-profile-phone]");
  const website = section.querySelector("[data-profile-website]");
  setProfileAction(line, profile.lineFriendUrl, "LINE 聯絡");
  setProfileAction(phone, profile.phone ? `tel:${profile.phone}` : "", "行動電話");
  setProfileAction(website, profile.website, "官方網站");
}

function setProfileAction(element, url, label) {
  if (!element) return;
  element.textContent = label;
  if (url) {
    element.href = escapeUrl(url);
    element.classList.remove("disabled");
    element.setAttribute("aria-disabled", "false");
  } else {
    element.href = "#card";
    element.classList.add("disabled");
    element.setAttribute("aria-disabled", "true");
  }
}

async function loadProfileHome() {
  const data = await apiRequest(`/api/profiles/${encodeURIComponent(appConfig.profileCode)}`);
  appState.profile = data.profile || null;
  if (data.card) {
    Object.assign(cardConfig, data.card);
    appConfig.slug = data.card.slug || appConfig.slug;
    cardConfig.layout = normalizeLayout(cardConfig.layout);
    ensureLayoutCards();
    applyActiveLayoutSnapshot();
    syncLayoutButtons();
    renderWysiwygCard();
    updatePublicCardFromConfig();
  }
  renderProfileHome(appState.profile);
  return data;
}

async function loadCardFromD1() {
  try {
    const data = await apiRequest(`/api/cards/${appConfig.slug}`);
    Object.assign(cardConfig, data.card);
    cardConfig.layout = normalizeLayout(cardConfig.layout);
    ensureLayoutCards();
    applyActiveLayoutSnapshot();
    syncLayoutButtons();
    renderWysiwygCard();
    updatePublicCardFromConfig();
    setBuilderNote(`已載入名片資料：${data.card.updatedAt || "尚未更新"}`);
  } catch (error) {
    setBuilderNote(`名片資料讀取失敗：${error.message}`);
  }
}

async function saveCardToD1() {
  setBuilderNote("正在儲存名片...");
  saveActiveLayoutSnapshot();
  const owner = appState.lineProfile
    ? {
        authProvider: "line",
        providerUserId: appState.lineProfile.userId,
        displayName: appState.lineProfile.displayName
      }
    : {
        authProvider: "demo",
        providerUserId: "demo-owner",
        displayName: "Demo Owner",
        email: "owner@k-linksaas.local"
      };

  try {
    const data = await apiRequest(`/api/cards/${appConfig.slug}`, {
      method: "PUT",
      body: JSON.stringify({ owner, card: cardConfig })
    });
    Object.assign(cardConfig, data.card);
    cardConfig.layout = normalizeLayout(cardConfig.layout);
    ensureLayoutCards();
    applyActiveLayoutSnapshot();
    renderWysiwygCard();
    updatePublicCardFromConfig();
    setBuilderNote("名片已儲存。");
  } catch (error) {
    setBuilderNote(`名片儲存失敗：${error.message}`);
  }
}

async function uploadImageDataUrl(dataUrl) {
  if (isFilePreview()) {
    throw new Error("本機 HTML 預覽無法上傳圖片，請使用已部署網站。");
  }
  const data = await apiRequest("/api/uploads/image", {
    method: "POST",
    body: JSON.stringify({
      folder: `cards/${appConfig.slug}`,
      dataUrl
    })
  });
  return data.url;
}

async function uploadImageBlob(blob) {
  if (isFilePreview()) {
    throw new Error("本機 HTML 預覽無法上傳圖片，請使用已部署網站。");
  }
  const form = new FormData();
  form.append("folder", `cards/${appConfig.slug}`);
  form.append("file", blob, "cover.jpg");
  const response = await fetch("/api/uploads/image", {
    method: "POST",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `API 錯誤：${response.status}`);
  }
  return data.url;
}

async function loadDashboard() {
  try {
    const data = await apiRequest(`/api/dashboard?slug=${encodeURIComponent(appConfig.slug)}`);
    appState.metrics = data.metrics || appState.metrics;
    renderMetrics();
    renderLeadRows(data.leads || []);
  } catch {
    renderMetrics();
  }
}

function renderMetrics() {
  if (els.metricViews) els.metricViews.textContent = appState.metrics.views;
  if (els.metricClicks) els.metricClicks.textContent = appState.metrics.clicks;
  if (els.metricLeads) els.metricLeads.textContent = appState.metrics.leads;
}

function renderLeadRows(leads) {
  if (!els.leadRows || leads.length === 0) return;
  els.leadRows.replaceChildren();
  leads.forEach((lead) => {
    const row = document.createElement("tr");
    row.append(
      tableCell(lead.source || "web"),
      tableCell(lead.message || lead.contact || "New lead"),
      statusCell(lead.status || "new"),
      tableCell(lead.name || "Guest")
    );
    els.leadRows.append(row);
  });
}

function tableCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function statusCell(text) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "status new";
  badge.textContent = text === "new" ? "新名單" : text;
  cell.append(badge);
  return cell;
}

function setBuilderNote(text) {
  if (els.builderNote) els.builderNote.textContent = text;
}

function normalizeLayout(layout) {
  return ["landscape", "portrait", "square"].includes(layout) ? layout : "landscape";
}

function syncLayoutButtons() {
  const layout = normalizeLayout(cardConfig.layout);
  document.querySelectorAll("[data-layout]").forEach((item) => {
    item.classList.toggle("active", item.dataset.layout === layout);
  });
}

function setCardLayout(layout) {
  saveActiveLayoutSnapshot();
  cardConfig.layout = normalizeLayout(layout);
  applyActiveLayoutSnapshot();
  syncLayoutButtons();
  renderWysiwygCard();
  updatePublicCardFromConfig();
  setBuilderNote(`版型已切換：${layoutLabels[cardConfig.layout] || "標準"}`);
}

function lockButton(button, processingText = "處理中...", doneText = "已完成", options = {}) {
  if (!button || button.disabled) return null;
  const originalText = button.textContent;
  button.dataset.originalText = originalText;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = processingText;
  return {
    done() {
      button.textContent = doneText;
      button.setAttribute("aria-busy", "false");
      if (options.resetAfterMs) {
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = originalText;
        }, options.resetAfterMs);
      }
    },
    fail() {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
      button.textContent = originalText;
    }
  };
}

async function runLocked(button, task, processingText = "處理中...", doneText = "已完成", options = {}) {
  const lock = lockButton(button, processingText, doneText, options);
  if (!lock) return;
  try {
    await task();
    lock.done();
  } catch (error) {
    lock.fail();
    throw error;
  }
}

function setMobileTab(tabId, updateHash = true) {
  const id = mobileTabs.includes(tabId) ? tabId : "home";
  document.body.classList.add("mobile-tab-mode");
  document.querySelectorAll("main > section").forEach((section) => {
    section.classList.toggle("mobile-tab-active", section.id === id);
  });
  document.querySelectorAll(".topbar nav a[href^='#']").forEach((link) => {
    link.classList.toggle("mobile-tab-active", link.getAttribute("href") === `#${id}`);
  });
  if (updateHash) {
    history.replaceState(null, "", `#${id}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initMobileTabs() {
  document.querySelectorAll(".topbar nav a[href^='#'], .hero-actions a[href^='#'], .top-action[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      if (!mobileTabs.includes(id)) return;
      event.preventDefault();
      setMobileTab(id);
    });
  });

  window.addEventListener("hashchange", () => {
    setMobileTab(location.hash.replace("#", ""), false);
  });

  setMobileTab(location.hash.replace("#", ""), false);
}

async function logEvent(eventType, metadata = {}) {
  try {
    await apiRequest("/api/events", {
      method: "POST",
      body: JSON.stringify({
        slug: appConfig.slug,
        eventType,
        source: "web",
        metadata
      })
    });
  } catch {
    // Analytics failure should not block the main user action.
  }
}

document.querySelectorAll("[data-track]").forEach((button) => {
  button.addEventListener("click", async () => {
    await runLocked(button, async () => {
      appState.metrics.clicks += 1;
      renderMetrics();
      if (els.formNote) els.formNote.textContent = `已點擊 CTA：${button.dataset.track}`;
      await logEvent(`click:${button.dataset.track}`);
    });
  });
});

const leadForm = document.querySelector("#leadForm");
if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lock = lockButton(event.submitter, "送出中...", "已送出");
    if (!lock) return;
    const name = document.querySelector("#leadName")?.value.trim() || "訪客";
    const contact = document.querySelector("#leadContact")?.value.trim() || "";
    const message = document.querySelector("#leadMessage")?.value.trim() || "";

    try {
      await apiRequest("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          slug: appConfig.slug,
          name,
          contact,
          message,
          source: els.sourceLabel?.textContent || "web"
        })
      });
      appState.metrics.leads += 1;
      renderMetrics();
      if (els.formNote) els.formNote.textContent = "已送出名單。";
      leadForm.reset();
      await loadDashboard();
      lock.done();
    } catch (error) {
      lock.fail();
      if (els.formNote) els.formNote.textContent = `名單寫入失敗：${error.message}`;
    }
  });
}

document.querySelectorAll("[data-login]").forEach((button) => {
  button.addEventListener("click", async () => {
    await runLocked(button, async () => {
      if (button.dataset.login === "LINE Login") {
        await handleLineLogin();
        return;
      }
      if (els.loginNote) {
        els.loginNote.textContent = `${button.dataset.login} 尚未串接 OAuth，這裡先保留入口。`;
      }
    }, "登入中...", "已完成");
  });
});

document.querySelectorAll("[data-layout]").forEach((button) => {
  button.addEventListener("click", () => {
    setCardLayout(button.dataset.layout);
  });
});

const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#loginEmail")?.value.trim() || "demo@k-linksaas.local";
    const role = document.querySelector("#loginRole")?.value || "owner";
    if (els.loginNote) {
      els.loginNote.textContent = `${email} 已登入 ${role} demo。`;
    }
  });
}

document.querySelector("#closeEditModal")?.addEventListener("click", closeEditModal);
els.editModal?.addEventListener("click", (event) => {
  if (event.target === els.editModal) closeEditModal();
});

function installSaveButton() {
  const toolbar = document.querySelector(".wysiwyg-toolbar");
  if (!toolbar || document.querySelector("#saveCardButton")) return;
  const button = document.createElement("button");
  button.id = "saveCardButton";
  button.type = "button";
  button.className = "submit-button";
  button.textContent = "儲存名片";
  button.addEventListener("click", () => runLocked(button, saveCardToD1, "儲存中...", "已儲存"));
  toolbar.append(button);
}

function escapeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|mailto:|tel:|line:\/\/|data:image\/|#)/i.test(raw)) return raw;
  return `https://${raw}`;
}

function createShareLaunchUrl(slug = appConfig.slug) {
  return `${appConfig.liffUrl}?target=share&slug=${encodeURIComponent(slug)}`;
}

function createEditIcon(label) {
  const icon = document.createElement("span");
  icon.className = "edit-icon";
  icon.textContent = label;
  return icon;
}

function createTarget(type, iconLabel, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `edit-target ${className}`.trim();
  button.dataset.editType = type;
  button.append(createEditIcon(iconLabel));
  return button;
}

function renderWysiwygCard() {
  if (!els.wysiwygCanvas) return;
  els.wysiwygCanvas.replaceChildren();

  const shell = document.createElement("div");
  shell.className = "editable-card-shell";

  const cardHeader = document.createElement("div");
  cardHeader.className = "card-share-header editable-card-header";
  const coverWrap = document.createElement("div");
  coverWrap.className = "editable-cover-wrap";
  const coverTarget = createTarget("cover", "圖", "flush");
  const cover = document.createElement("img");
  cover.className = `editable-cover ${cardConfig.layout}`;
  cover.src = cardConfig.coverUrl;
  cover.alt = "名片封面";
  cover.onerror = () => {
    cover.src = "https://placehold.co/800x520?text=Cover";
  };
  coverTarget.append(cover);

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "share-top-button";
  shareButton.textContent = "分享";
  shareButton.addEventListener("click", () => runLocked(shareButton, shareCardDemo, "分享中...", "已完成", { resetAfterMs: 1200 }));
  cardHeader.append(shareButton);
  coverWrap.append(coverTarget);
  shell.append(cardHeader);
  shell.append(coverWrap);

  const content = document.createElement("div");
  content.className = "editable-content";

  const titleTarget = createTarget("title", "文");
  const title = document.createElement("div");
  title.className = "editable-title";
  title.textContent = cardConfig.title || "未命名名片";
  titleTarget.append(title);

  const descTarget = createTarget("desc", "編");
  const desc = document.createElement("div");
  desc.className = "editable-desc";
  desc.textContent = cardConfig.desc || "點擊編輯名片介紹";
  desc.style.color = cardConfig.descColor;
  desc.style.textAlign = cardConfig.descAlign;
  descTarget.append(desc);

  content.append(titleTarget, descTarget);
  shell.append(content);

  const buttons = document.createElement("div");
  buttons.className = "editable-buttons";
  cardConfig.buttons.forEach((item, index) => {
    const buttonTarget = createTarget("button", "鈕");
    buttonTarget.dataset.buttonIndex = String(index);
    const inner = document.createElement("div");
    inner.className = "editable-button";
    inner.style.background = item.color || "#06C755";
    inner.textContent = item.label || "按鈕";
    buttonTarget.append(inner);
    buttons.append(buttonTarget);
  });

  const add = document.createElement("button");
  add.type = "button";
  add.className = "add-card-button";
  add.textContent = "+ 新增按鈕";
  add.addEventListener("click", () => {
    if (cardConfig.buttons.length >= 4) {
      setBuilderNote("最多只能保留 4 個按鈕。請先刪除一個按鈕再新增。");
      return;
    }
    cardConfig.buttons.push({ label: "新增按鈕", url: "", color: "#06C755" });
    commitActiveLayoutEdit();
    renderWysiwygCard();
    openEditModal("button", cardConfig.buttons.length - 1);
  });
  buttons.append(add);
  shell.append(buttons);
  els.wysiwygCanvas.append(shell);

  els.wysiwygCanvas.querySelectorAll("[data-edit-type]").forEach((target) => {
    target.addEventListener("click", () => {
      const index = target.dataset.buttonIndex ? Number(target.dataset.buttonIndex) : -1;
      openEditModal(target.dataset.editType, index);
    });
  });
}

function openEditModal(type, buttonIndex = -1) {
  appState.editor.type = type;
  appState.editor.buttonIndex = buttonIndex;
  els.editModal.classList.remove("hidden");
  els.editModal.setAttribute("aria-hidden", "false");
  els.cardEditForm.replaceChildren();

  if (type === "cover") {
    els.editModalTitle.textContent = "編輯封面圖片";
    appendCoverUpload(cardConfig.coverUrl);
    appendTextInput("點圖連結", "editCoverLink", cardConfig.coverLink, "https:// / tel: / mailto: / line://");
  } else if (type === "title") {
    els.editModalTitle.textContent = "編輯標題 / 名稱";
    appendTextInput("標題", "editTitleInput", cardConfig.title, "請輸入名稱");
  } else if (type === "desc") {
    els.editModalTitle.textContent = "編輯介紹內容";
    appendTextarea("介紹內容", "editDescInput", cardConfig.desc);
    appendTextInput("聊天室顯示文字", "editChatText", cardConfig.chatText, "分享到 LINE 時顯示的文字");
    appendSelect("文字對齊", "editDescAlign", cardConfig.descAlign, [
      ["left", "靠左"],
      ["center", "置中"],
      ["right", "靠右"]
    ]);
    appendColorInput("文字顏色", "editDescColor", cardConfig.descColor);
  } else if (type === "button") {
    const item = cardConfig.buttons[buttonIndex] || { label: "", url: "", color: "#06C755" };
    els.editModalTitle.textContent = `編輯按鈕 ${buttonIndex + 1}`;
    appendTextInput("按鈕文字", "editButtonLabel", item.label, "按鈕文字");
    appendTextInput("按鈕連結", "editButtonUrl", item.url, "https:// / tel: / mailto: / line://");
    appendColorInput("按鈕顏色", "editButtonColor", item.color || "#06C755");
  }

  const actions = document.createElement("div");
  actions.className = "edit-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "muted-button";
  cancel.textContent = "取消";
  cancel.addEventListener("click", closeEditModal);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.className = "submit-button";
  apply.textContent = "套用";
  actions.append(cancel, apply);
  els.cardEditForm.append(actions);

  if (type === "button") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-button";
    remove.textContent = "刪除此按鈕";
    remove.addEventListener("click", () => {
      if (cardConfig.buttons.length <= 1) {
        setBuilderNote("至少需要保留 1 個按鈕。");
        return;
      }
      cardConfig.buttons.splice(buttonIndex, 1);
      commitActiveLayoutEdit();
      closeEditModal();
      renderWysiwygCard();
      updatePublicCardFromConfig();
    });
    els.cardEditForm.append(remove);
  }
}

function appendTextInput(labelText, id, value, placeholder) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.value = value || "";
  input.placeholder = placeholder || "";
  label.append(input);
  els.cardEditForm.append(label);
}

function getCoverCropSize(layout) {
  if (layout === "portrait") return { width: 720, height: 1080, ratio: "2 / 3" };
  if (layout === "square") return { width: 900, height: 900, ratio: "1 / 1" };
  return { width: 1000, height: 650, ratio: "20 / 13" };
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

async function exportCoverBlob(canvas) {
  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46];
  let fallback = null;
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) continue;
    fallback = blob;
    if (blob.size <= 900 * 1024) return blob;
  }
  return fallback;
}

function appendCoverUpload(value) {
  if (appState.editor.pendingCoverObjectUrl) {
    URL.revokeObjectURL(appState.editor.pendingCoverObjectUrl);
  }
  appState.editor.pendingCoverBlob = null;
  appState.editor.pendingCoverObjectUrl = "";
  const cropSize = getCoverCropSize(cardConfig.layout);
  const wrapper = document.createElement("div");
  wrapper.className = `upload-space ${cardConfig.layout || "landscape"}`;


  const input = document.createElement("input");
  input.id = "editCoverFile";
  input.type = "file";
  input.accept = "image/*";

  const preview = document.createElement("img");
  preview.id = "editCoverPreview";
  preview.alt = "封面預覽";
  preview.src = value || "";

  wrapper.append(input, preview);
  els.cardEditForm.append(wrapper);

  const fallback = document.createElement("label");
  fallback.textContent = "圖片網址";
  const urlInput = document.createElement("input");
  urlInput.id = "editCoverUrl";
  urlInput.value = value || "";
  urlInput.placeholder = "https://...";
  fallback.append(urlInput);
  els.cardEditForm.append(fallback);

  const cropper = document.createElement("div");
  cropper.className = "photo-cropper hidden";

  const cropHead = document.createElement("div");
  cropHead.className = "photo-cropper-head";
  const cropTitle = document.createElement("strong");
  cropTitle.textContent = "裁切封面";
  const cropHint = document.createElement("span");
  cropHint.textContent = "圖片會先完整放入畫面，可再放大或微調位置。";
  cropHead.append(cropTitle, cropHint);

  const canvas = document.createElement("canvas");
  canvas.id = "coverCropCanvas";
  canvas.width = cropSize.width;
  canvas.height = cropSize.height;
  canvas.style.aspectRatio = cropSize.ratio;

  const controls = document.createElement("div");
  controls.className = "crop-controls";
  const zoom = createCropRange("縮放", "coverCropZoom", 1, 3, 1, 0.01);
  const offsetX = createCropRange("左右", "coverCropX", -100, 100, 0, 1);
  const offsetY = createCropRange("上下", "coverCropY", -100, 100, 0, 1);
  controls.append(zoom.label, offsetX.label, offsetY.label);

  const applyCrop = document.createElement("button");
  applyCrop.type = "button";
  applyCrop.className = "submit-button";
  applyCrop.textContent = "套用裁切";

  cropper.append(cropHead, canvas, controls, applyCrop);
  els.cardEditForm.append(cropper);

  let cropImage = null;
  let dragState = null;

  function getCropGeometry() {
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = cropImage.naturalWidth / cropImage.naturalHeight;
    const zoomValue = Number(zoom.input.value);
    let drawWidth;
    let drawHeight;

    if (imageRatio > canvasRatio) {
      drawWidth = canvas.width * zoomValue;
      drawHeight = drawWidth / imageRatio;
    } else {
      drawHeight = canvas.height * zoomValue;
      drawWidth = drawHeight * imageRatio;
    }

    const maxMoveX = Math.max(0, (drawWidth - canvas.width) / 2);
    const maxMoveY = Math.max(0, (drawHeight - canvas.height) / 2);
    const x = (canvas.width - drawWidth) / 2 + (Number(offsetX.input.value) / 100) * maxMoveX;
    const y = (canvas.height - drawHeight) / 2 + (Number(offsetY.input.value) / 100) * maxMoveY;
    return { canvasRatio, imageRatio, drawWidth, drawHeight, maxMoveX, maxMoveY, x, y };
  }

  function drawCrop() {
    if (!cropImage) return;
    const context = canvas.getContext("2d");
    const geometry = getCropGeometry();
    const { canvasRatio, imageRatio, drawWidth, drawHeight, x, y } = geometry;

    let bgWidth;
    let bgHeight;
    if (imageRatio > canvasRatio) {
      bgHeight = canvas.height;
      bgWidth = bgHeight * imageRatio;
    } else {
      bgWidth = canvas.width;
      bgHeight = bgWidth / imageRatio;
    }
    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.filter = "blur(24px)";
    context.drawImage(cropImage, bgX - 24, bgY - 24, bgWidth + 48, bgHeight + 48);
    context.restore();
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(cropImage, x, y, drawWidth, drawHeight);
  }

  function clampCropOffset(value) {
    return Math.max(-100, Math.min(100, value));
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  [zoom.input, offsetX.input, offsetY.input].forEach((range) => {
    range.addEventListener("input", drawCrop);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!cropImage) return;
    const point = canvasPoint(event);
    dragState = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startOffsetX: Number(offsetX.input.value),
      startOffsetY: Number(offsetY.input.value)
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId || !cropImage) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const geometry = getCropGeometry();
    const dx = point.x - dragState.startX;
    const dy = point.y - dragState.startY;
    if (geometry.maxMoveX > 0) {
      offsetX.input.value = String(clampCropOffset(dragState.startOffsetX + (dx / geometry.maxMoveX) * 100));
    }
    if (geometry.maxMoveY > 0) {
      offsetY.input.value = String(clampCropOffset(dragState.startOffsetY + (dy / geometry.maxMoveY) * 100));
    }
    drawCrop();
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    canvas.addEventListener(eventName, () => {
      dragState = null;
      canvas.classList.remove("dragging");
    });
  });

  applyCrop.addEventListener("click", async () => {
    if (!cropImage) return;
    const lock = lockButton(applyCrop, "裁切中...", "已套用");
    if (!lock) return;
    drawCrop();
    const blob = await exportCoverBlob(canvas);
    if (!blob) {
      lock.fail();
      setBuilderNote("封面裁切失敗，請重新選擇圖片。");
      return;
    }
    if (appState.editor.pendingCoverObjectUrl) {
      URL.revokeObjectURL(appState.editor.pendingCoverObjectUrl);
    }
    appState.editor.pendingCoverBlob = blob;
    appState.editor.pendingCoverObjectUrl = URL.createObjectURL(blob);
    preview.src = appState.editor.pendingCoverObjectUrl;
    preview.dataset.pendingUpload = "1";
    preview.dataset.uploadedUrl = "";
    cropper.classList.add("hidden");
    setBuilderNote(`封面已裁切，檔案約 ${Math.round(blob.size / 1024)}KB，套用後會上傳。`);
    lock.done();
  });

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setBuilderNote("原始圖片超過 12MB，請先縮小後再選擇。裁切後系統會自動降 K 數。");
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        cropImage = image;
        zoom.input.value = "1";
        offsetX.input.value = "0";
        offsetY.input.value = "0";
        wrapper.classList.add("has-file");
        cropper.classList.remove("hidden");
        drawCrop();
        setBuilderNote("圖片已裁切完成，套用後會上傳。請按套用儲存。");
        cropper.scrollIntoView({ behavior: "smooth", block: "center" });
      };
      image.onerror = () => {
        setBuilderNote("圖片讀取失敗，請改用 JPG、PNG 或 WebP。.");
        input.value = "";
      };
      image.src = String(reader.result || "");
    };
    reader.onerror = () => {
      setBuilderNote("圖片讀取失敗，請重新選擇圖片。");
      input.value = "";
    };
    reader.readAsDataURL(file);
  });

}

function createCropRange(labelText, id, min, max, value, step) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.step = String(step);
  label.append(input);
  return { label, input };
}

function appendTextarea(labelText, id, value) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("textarea");
  input.id = id;
  input.rows = 5;
  input.value = value || "";
  label.append(input);
  els.cardEditForm.append(label);
}

function appendColorInput(labelText, id, value) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.type = "color";
  input.value = value || "#06C755";
  label.append(input);
  els.cardEditForm.append(label);
}

function appendSelect(labelText, id, value, options) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  options.forEach(([optionValue, text]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = text;
    option.selected = optionValue === value;
    select.append(option);
  });
  label.append(select);
  els.cardEditForm.append(label);
}

els.cardEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = event.submitter || els.cardEditForm.querySelector(".edit-actions .submit-button");
  const lock = lockButton(submitButton, "套用中...", "已完成");
  if (!lock) return;
  if (appState.editor.type === "cover") {
    const preview = document.querySelector("#editCoverPreview");
    const uploadedUrl = preview?.dataset.uploadedUrl || "";
    const typedUrl = document.querySelector("#editCoverUrl")?.value || "";
    if (appState.editor.pendingCoverBlob) {
      if (isFilePreview()) {
        cardConfig.coverUrl = appState.editor.pendingCoverObjectUrl || URL.createObjectURL(appState.editor.pendingCoverBlob);
        setBuilderNote("本機預覽已套用封面；正式網站才會上傳圖片。");
      } else {
      setBuilderNote("正在上傳封面圖片...");
      try {
        cardConfig.coverUrl = await uploadImageBlob(appState.editor.pendingCoverBlob);
        appState.editor.pendingCoverBlob = null;
        if (appState.editor.pendingCoverObjectUrl) {
          URL.revokeObjectURL(appState.editor.pendingCoverObjectUrl);
          appState.editor.pendingCoverObjectUrl = "";
        }
      } catch (error) {
        lock.fail();
        setBuilderNote(`封面圖片上傳失敗：${error.message}`);
        return;
      }
      }
    } else if (uploadedUrl.startsWith("data:image/")) {
      if (isFilePreview()) {
        cardConfig.coverUrl = uploadedUrl;
        setBuilderNote("本機預覽已套用封面；正式網站才會上傳圖片。");
      } else {
      setBuilderNote("正在上傳封面圖片...");
      try {
        cardConfig.coverUrl = await uploadImageDataUrl(uploadedUrl);
      } catch (error) {
        lock.fail();
        setBuilderNote(`封面圖片上傳失敗：${error.message}`);
        return;
      }
      }
    } else {
      cardConfig.coverUrl = uploadedUrl || escapeUrl(typedUrl);
    }
    cardConfig.coverLink = escapeUrl(document.querySelector("#editCoverLink")?.value || "");
  } else if (appState.editor.type === "title") {
    cardConfig.title = document.querySelector("#editTitleInput").value.trim() || "未命名名片";
  } else if (appState.editor.type === "desc") {
    cardConfig.desc = document.querySelector("#editDescInput").value.trim() || "點擊編輯名片介紹";
    cardConfig.chatText = document.querySelector("#editChatText")?.value.trim() || "";
    cardConfig.descAlign = document.querySelector("#editDescAlign").value;
    cardConfig.descColor = document.querySelector("#editDescColor").value || "#61707a";
  } else if (appState.editor.type === "button") {
    const item = cardConfig.buttons[appState.editor.buttonIndex];
    if (item) {
      item.label = document.querySelector("#editButtonLabel").value.trim() || "按鈕";
      item.url = escapeUrl(document.querySelector("#editButtonUrl").value);
      item.color = document.querySelector("#editButtonColor").value || "#06C755";
    }
  }

  commitActiveLayoutEdit({ syncLinked: appState.editor.type !== "cover" });
  closeEditModal();
  renderWysiwygCard();
  updatePublicCardFromConfig();
  setBuilderNote("已套用修改，請儲存名片。") ;
  lock.done();
});

function closeEditModal() {
  els.editModal?.classList.add("hidden");
  els.editModal?.setAttribute("aria-hidden", "true");
  els.cardEditForm?.replaceChildren();
}

function updatePublicCardFromConfig() {
  const previewCover = document.querySelector("#previewCover");
  const previewName = document.querySelector("#previewName");
  const previewTitle = document.querySelector("#previewTitle");
  const previewBio = document.querySelector("#previewBio");
  const previewAvatar = document.querySelector(".profile-band .avatar");
  const previewBrand = document.querySelector(".profile-band .eyebrow");
  const contactList = document.querySelector(".contact-list");
  if (previewCover) {
    previewCover.src = cardConfig.coverUrl || "https://placehold.co/800x520?text=Cover";
    previewCover.className = `public-cover ${normalizeLayout(cardConfig.layout)}`;
    previewCover.onclick = cardConfig.coverLink ? () => window.open(escapeUrl(cardConfig.coverLink), "_blank", "noopener") : null;
    previewCover.style.cursor = cardConfig.coverLink ? "pointer" : "";
  }
  if (previewName) previewName.textContent = cardConfig.title;
  if (previewTitle) {
    const subtitle = cardConfig.ownerName || cardConfig.ownerMemberNo || "";
    previewTitle.textContent = subtitle;
    previewTitle.hidden = !subtitle;
  }
  if (previewBio) previewBio.textContent = cardConfig.desc.replace(/\n/g, " ");
  if (previewAvatar) previewAvatar.hidden = true;
  if (previewBrand) {
    previewBrand.hidden = true;
  }
  if (contactList) {
    const contacts = [
      cleanContactValue(cardConfig.ownerEmail)
    ].filter(Boolean);
    contactList.replaceChildren(...contacts.map((text) => {
      const item = document.createElement("span");
      item.textContent = text;
      return item;
    }));
    contactList.hidden = contacts.length === 0;
  }

  const actionButtons = document.querySelectorAll(".actions .action-button");
  cardConfig.buttons.slice(0, actionButtons.length).forEach((item, index) => {
    actionButtons[index].textContent = item.label;
    actionButtons[index].style.background = item.color;
  });
}

function createInitials(value) {
  const text = String(value || "").trim();
  if (!text) return "名";
  const asciiWords = text.match(/[A-Za-z0-9]+/g);
  if (asciiWords?.length) {
    return asciiWords.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }
  return text.slice(0, 1);
}

function cleanContactValue(value) {
  const text = String(value || "").trim();
  if (!text || text.endsWith("@k-linksaas.local")) return "";
  return text;
}

document.querySelector("#publicShareButton")?.addEventListener("click", (event) => {
  runLocked(event.currentTarget, shareCardDemo, "分享中...", "已完成", { resetAfterMs: 1200 });
});

function setLiffStatus(status, detail) {
  if (els.liffStatusText) els.liffStatusText.textContent = status;
  if (els.liffProfileText) els.liffProfileText.textContent = detail || "";
}

async function initializeLiff() {
  if (appState.liffReady) return true;
  if (!window.liff) {
    setLiffStatus("LIFF SDK 未載入", "請使用 LINE LIFF URL 或 HTTPS 網址。") ;
    return false;
  }

  try {
    await window.liff.init({ liffId: appConfig.liffId });
    appState.liffReady = true;
    if (window.liff.isLoggedIn()) {
      appState.lineProfile = await window.liff.getProfile();
      setLiffStatus("LINE 已登入", `${appState.lineProfile.displayName} / ${appState.lineProfile.userId}`);
      if (els.loginNote) els.loginNote.textContent = `LINE 已登入：${appState.lineProfile.displayName}`;
    } else {
      setLiffStatus("LINE 尚未登入", `請使用 LINE 登入，或開啟 ${appConfig.liffUrl}`);
    }
    return true;
  } catch (error) {
    appState.liffReady = false;
    setLiffStatus("LIFF 初始化失敗", error?.message || "請確認 LIFF Endpoint URL。");
    return false;
  }
}

async function handleLineLogin() {
  if (els.loginNote) els.loginNote.textContent = "正在啟動 LINE 登入...";
  const ready = await initializeLiff();
  if (!ready) {
    if (els.loginNote) els.loginNote.textContent = `請確認 LIFF URL 設定：${appConfig.liffUrl}`;
    return;
  }

  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: appConfig.siteUrl });
    return;
  }

  appState.lineProfile = await window.liff.getProfile();
  setLiffStatus("LINE 已登入", `${appState.lineProfile.displayName} / ${appState.lineProfile.userId}`);
  if (els.loginNote) els.loginNote.textContent = `LINE 已登入：${appState.lineProfile.displayName}`;
}

function buildLineShareMessages(shareUrl) {
  const title = cardConfig.title || "電子名片";
  const desc = (cardConfig.desc || "點擊開啟電子名片").replace(/\s+/g, " ").slice(0, 120);
  const chatText = (cardConfig.chatText || `${title} - 電子名片`).replace(/\s+/g, " ").slice(0, 400);
  const coverActionUrl = escapeUrl(cardConfig.coverLink || shareUrl);
  const heroUrl = /^https:\/\//i.test(cardConfig.coverUrl || "") ? cardConfig.coverUrl : "";
  const autoShareUrl = createShareLaunchUrl();
  const shareButtons = (cardConfig.buttons || [])
    .slice(0, 4)
    .map((button) => {
      const rawUrl = String(button.url || "").trim();
      const uri = rawUrl.startsWith("#") ? `${shareUrl}${rawUrl}` : escapeUrl(rawUrl || shareUrl);
      return {
        type: "button",
        style: "primary",
        height: "sm",
        color: button.color || "#147d64",
        action: {
          type: "uri",
          label: String(button.label || "開啟").slice(0, 20),
          uri
        }
      };
    });
  if (shareButtons.length === 0) {
    shareButtons.push({
      type: "button",
      style: "primary",
      height: "sm",
      color: "#147d64",
      action: {
        type: "uri",
        label: "開啟名片",
        uri: shareUrl
      }
    });
  }
  const contents = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "horizontal",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingAll: "12px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          width: "65px",
          height: "25px",
          backgroundColor: "#f0444f",
          cornerRadius: "8px",
          justifyContent: "center",
          alignItems: "center",
          action: {
            type: "uri",
            label: "\u5206\u4eab",
            uri: autoShareUrl
          },
          contents: [
            {
              type: "text",
              text: "\u5206\u4eab",
              color: "#ffffff",
              size: "sm",
              weight: "bold",
              align: "center",
              gravity: "center"
            }
          ]
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "xl",
          wrap: true
        },
        {
          type: "text",
          text: desc,
          size: "sm",
          color: "#61707a",
          wrap: true
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#147d64",
          action: {
            type: "uri",
            label: "開啟名片",
            uri: shareUrl
          }
        }
      ]
    }
  };

  contents.body.spacing = "lg";
  contents.body.paddingAll = "18px";
  contents.footer.spacing = "md";
  contents.footer.paddingAll = "18px";
  contents.footer.contents = shareButtons;

  if (heroUrl) {
    const heroRatio = cardConfig.layout === "square" ? "1:1" : cardConfig.layout === "portrait" ? "2:3" : "20:13";
    contents.hero = {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      contents: [
        {
          type: "image",
          url: heroUrl,
          size: "full",
          aspectRatio: heroRatio,
          aspectMode: "cover",
          action: {
            type: "uri",
            uri: coverActionUrl
          }
        }
      ]
    };
  }

  return [
    {
      type: "text",
      text: chatText
    },
    {
      type: "flex",
      altText: chatText,
      contents
    }
  ];
}

async function shareByLineTargetPicker(shareUrl) {
  const autoShareUrl = createShareLaunchUrl();
  const isAutoShareMode = shouldAutoOpenSharePicker();
  const isShareLaunchMode = shouldRedirectToShareLauncher();
  const exitAutoShareMode = (message) => {
    if (!isAutoShareMode && !isShareLaunchMode) return;
    document.documentElement.classList.remove("auto-share-mode");
    document.body.classList.remove("mobile-tab-mode");
    setMobileTab("card", false);
    if (message) setBuilderNote(message);
  };
  if (!window.liff) {
    if (!isAutoShareMode && !isShareLaunchMode) {
      window.location.href = autoShareUrl;
      return true;
    }
    const message = "LINE LIFF 未載入，請在 LINE 或 LIFF 網址開啟分享。";
    exitAutoShareMode(message);
    setBuilderNote(message);
    return false;
  }
  const ready = await initializeLiff();
  if (!ready) {
    if (!isAutoShareMode && !isShareLaunchMode) {
      window.location.href = autoShareUrl;
      return true;
    }
    const message = "LINE LIFF 初始化失敗，請在 LINE 中重新開啟。";
    exitAutoShareMode(message);
    setBuilderNote(message);
    return false;
  }
  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: location.href });
    return true;
  }
  if (!window.liff.isApiAvailable?.("shareTargetPicker")) {
    if (!isAutoShareMode && !isShareLaunchMode) {
      window.location.href = autoShareUrl;
      return true;
    }
    const message = "目前環境不支援 LINE Share Target Picker，請在 LINE LIFF 中開啟。";
    exitAutoShareMode(message);
    setBuilderNote(message);
    window.alert(message);
    return true;
  }
  let result;
  try {
    result = await window.liff.shareTargetPicker(buildLineShareMessages(shareUrl), { isMultiple: true });
  } catch (error) {
    if (!isAutoShareMode && !isShareLaunchMode) {
      window.location.href = autoShareUrl;
      return true;
    }
    const message = `LINE 分享啟動失敗：${error?.code || error?.errorCode || error?.message || "未知錯誤"}`;
    exitAutoShareMode(message);
    setBuilderNote(message);
    window.alert(message);
    return true;
  }
  if (result?.status === "success") {
    setBuilderNote("已開啟 LINE 分享流程。");
    await logEvent("click:shareTargetPicker", { shareUrl, status: "success" });
  } else {
    exitAutoShareMode("已取消 LINE 分享。");
    setBuilderNote("已取消 LINE 分享。");
    await logEvent("click:shareTargetPicker", { shareUrl, status: "cancel" });
  }
  return true;
}

async function shareCardDemo() {
  const shareUrl = currentShareUrl();
  const shareText = `${cardConfig.title}\n${shareUrl}`;
  await logEvent("click:share", { shareUrl });
  try {
    if (await shareByLineTargetPicker(shareUrl)) return;
    if (navigator.share) {
      await navigator.share({
        title: cardConfig.title,
        text: "這是我的電子名片",
        url: shareUrl
      });
      setBuilderNote("已開啟系統分享。") ;
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      setBuilderNote("分享連結已複製。") ;
      return;
    }
  } catch {
    setBuilderNote("分享失敗，請稍後再試或複製連結。") ;
    return;
  }
  window.prompt("請複製分享連結", shareUrl);
}

function shouldAutoOpenSharePicker() {
  const params = new URLSearchParams(location.search);
  const state = params.get("liff.state") || "";
  const decodedState = decodeURIComponent(state || "");
  return params.get("share") === "1"
    || location.hash.includes("share=1")
    || decodedState.includes("share=1");
}

function shouldRedirectToShareLauncher() {
  const params = new URLSearchParams(location.search);
  const state = params.get("liff.state") || "";
  const decodedState = decodeURIComponent(state || "");
  return params.get("target") === "share"
    || decodedState.includes("target=share")
    || decodedState.startsWith("/share");
}

async function boot() {
  if (shouldRedirectToShareLauncher()) {
    initMobileTabs();
    installSaveButton();
    renderWysiwygCard();
    updatePublicCardFromConfig();
    renderMetrics();
    if (appConfig.mode === "profile") {
      await loadProfileHome();
    } else {
      await loadCardFromD1();
    }
    await shareByLineTargetPicker(currentShareUrl());
    return;
  }
  if (shouldAutoOpenSharePicker()) {
    if (appConfig.mode === "profile") {
      await loadProfileHome();
    } else {
      await loadCardFromD1();
    }
    await shareByLineTargetPicker(currentShareUrl());
    return;
  }
  initMobileTabs();
  installSaveButton();
  renderWysiwygCard();
  updatePublicCardFromConfig();
  renderMetrics();
  if (appConfig.mode === "profile") {
    await loadProfileHome();
  } else {
    await loadCardFromD1();
  }
  await loadDashboard();
  await logEvent("view");
  initializeLiff();
}

boot();
