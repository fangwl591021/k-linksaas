const state = {
  data: null,
  activeButton: null,
  userSearch: ""
};

const el = {
  refreshButton: document.querySelector("#refreshButton"),
  logoutButton: document.querySelector("#logoutButton"),
  sessionUser: document.querySelector("#sessionUser"),
  userSearchInput: document.querySelector("#userSearchInput"),
  toggleRecordForm: document.querySelector("#toggleRecordForm"),
  recordForm: document.querySelector("#recordForm"),
  memberCrmForm: document.querySelector("#memberCrmForm"),
  recordStatus: document.querySelector("#recordStatus"),
  editPanel: document.querySelector("#editPanel"),
  editTitle: document.querySelector("#editTitle"),
  editForm: document.querySelector("#editForm"),
  closeEditPanel: document.querySelector("#closeEditPanel")
};

function text(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
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

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && !button.matches("[data-tab], #closeEditPanel, #toggleRecordForm")) {
    state.activeButton = button;
  }
}, true);

function shortDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").replace(".000Z", "");
}

function cell(value, className = "") {
  const td = document.createElement("td");
  td.textContent = text(toZh(value));
  if (className) td.className = className;
  return td;
}

function detailCell(lines) {
  const td = document.createElement("td");
  td.className = "detail-cell";
  lines.filter((line) => line.value !== null && line.value !== undefined && line.value !== "").forEach((line) => {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = line.label;
    value.textContent = text(toZh(line.value));
    item.append(label, value);
    td.append(item);
  });
  if (!td.childElementCount) td.textContent = "-";
  return td;
}

function pill(value, extra = "") {
  const span = document.createElement("span");
  span.className = `pill ${extra}`.trim();
  span.textContent = text(toZh(value));
  return span;
}

function badgeCell(value, extra = "") {
  const td = document.createElement("td");
  td.append(pill(value, extra));
  return td;
}

function actionCell(label, handler) {
  const td = document.createElement("td");
  td.className = "row-action";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", handler);
  td.append(button);
  return td;
}

function setCount(id, rows) {
  const target = document.querySelector(id);
  if (target) target.textContent = `共 ${rows.length} 筆`;
}

function toZh(value) {
  const map = {
    owner: "擁有者",
    manager: "管理員",
    member: "會員",
    viewer: "檢視者",
    active: "啟用",
    invited: "已邀請",
    disabled: "停用",
    free: "免費版",
    starter: "入門版",
    team: "團隊版",
    enterprise: "企業版",
    general: "一般",
    card: "名片",
    lead: "名單",
    points: "點數",
    payment: "付款",
    bug: "問題",
    open: "待處理",
    doing: "處理中",
    done: "完成",
    blocked: "卡住",
    normal: "一般",
    high: "高",
    low: "低",
    password: "帳密登入",
    line: "LINE",
    google: "Google",
    facebook: "Facebook",
    demo: "示範",
    published: "已發布",
    draft: "草稿",
    landscape: "橫式",
    portrait: "直式",
    square: "方形",
    web: "網頁"
  };
  return map[value] || value;
}

function translateError(message) {
  const map = {
    "Authentication required": "請先登入",
    "User not found": "找不到會員",
    "Card not found": "找不到名片",
    "Not found": "找不到資料",
    "Internal error": "系統錯誤"
  };
  return map[message] || message || "發生錯誤";
}

function replaceRows(id, rows, renderer) {
  const tbody = document.querySelector(id);
  if (!tbody) return;
  tbody.replaceChildren();
  rows.forEach((item) => tbody.append(renderer(item)));
}

function normalizeSearchText(value) {
  return String(value ?? "").toLowerCase().trim();
}

function searchableUserText(item) {
  return [
    item.member_no,
    item.display_name,
    item.email,
    item.phone,
    item.company,
    item.job_title,
    item.line_user_id,
    item.provider_user_id,
    item.auth_provider,
    item.role,
    item.status,
    item.plan
  ].map(normalizeSearchText).join(" ");
}

function filterUsers(users) {
  const keyword = normalizeSearchText(state.userSearch);
  if (!keyword) return users;
  return users.filter((item) => searchableUserText(item).includes(keyword));
}

async function request(path, options = {}) {
  const lock = lockButton(state.activeButton, "處理中...", "已完成");
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.href = `/login?next=${encodeURIComponent("/admin")}`;
    throw new Error("請先登入");
  }
  if (!response.ok || data.ok === false) {
    lock?.fail();
    state.activeButton = null;
    throw new Error(translateError(data.error || `HTTP ${response.status}`));
  }
  lock?.done();
  state.activeButton = null;
  return data;
}

async function loadSession() {
  const data = await request("/api/session");
  if (el.sessionUser) {
    el.sessionUser.textContent = `${data.user.displayName || data.user.email || "管理員"}（${toZh(data.user.role)}）`;
  }
  return data.user;
}

async function loadAdmin() {
  if (el.recordStatus) el.recordStatus.textContent = "讀取中...";
  const data = await request("/api/admin/overview");
  state.data = data;
  render(data);
  if (el.recordStatus) el.recordStatus.textContent = `已更新 ${new Date().toLocaleString("zh-TW")}`;
}

function render(data) {
  const filteredUsers = filterUsers(data.users || []);
  document.querySelector("#totalUsers").textContent = data.totals.users;
  document.querySelector("#totalCards").textContent = data.totals.cards;
  document.querySelector("#totalLeads").textContent = data.totals.leads;
  document.querySelector("#totalEvents").textContent = data.totals.events;
  document.querySelector("#totalPoints").textContent = data.totals.points;

  setCount("#recordsCount", data.records);
  setCount("#usersCount", filteredUsers);
  if (state.userSearch && document.querySelector("#usersCount")) {
    document.querySelector("#usersCount").textContent = `共 ${filteredUsers.length} / ${data.users.length} 筆`;
  }
  setCount("#cardsCount", data.cards);
  setCount("#memberCrmCount", data.memberCrmRecords || []);
  setCount("#leadsCount", data.leads);
  setCount("#eventsCount", data.events);

  replaceRows("#recordsRows", data.records, renderRecord);
  replaceRows("#usersRows", filteredUsers, renderUser);
  replaceRows("#cardsRows", data.cards, renderCard);
  replaceRows("#memberCrmRows", data.memberCrmRecords || [], renderMemberCrm);
  replaceRows("#leadsRows", data.leads, renderLead);
  replaceRows("#eventsRows", data.events, renderEvent);
}

function renderRecord(item) {
  const row = document.createElement("tr");
  row.append(
    cell(shortDate(item.created_at)),
    badgeCell(item.category),
    badgeCell(item.status, item.status === "blocked" ? "blocked" : ""),
    badgeCell(item.priority, item.priority === "high" ? "high" : ""),
    cell(item.title),
    cell(item.body, "muted")
  );
  return row;
}

function renderUser(item) {
  const row = document.createElement("tr");
  row.append(
    actionCell("編修", () => openUserEditor(item)),
    detailCell([
      { label: "會員編號", value: item.member_no },
      { label: "名稱", value: item.display_name },
      { label: "公司", value: item.company },
      { label: "職稱", value: item.job_title }
    ]),
    detailCell([
      { label: "電子郵件", value: item.email },
      { label: "電話", value: item.phone },
      { label: "LINE 識別碼", value: item.line_user_id }
    ]),
    detailCell([
      { label: "登入", value: item.auth_provider },
      { label: "角色", value: item.role },
      { label: "狀態", value: item.status },
      { label: "方案", value: item.plan }
    ]),
    detailCell([
      { label: "點數", value: item.points },
      { label: "名片", value: item.card_count },
      { label: "名單", value: item.lead_count }
    ]),
    detailCell([
      { label: "登入識別碼", value: item.provider_user_id },
      { label: "最後登入", value: shortDate(item.last_login_at) }
    ]),
    detailCell([
      { label: "建立", value: shortDate(item.created_at) },
      { label: "更新", value: shortDate(item.updated_at) }
    ])
  );
  return row;
}

function renderCard(item) {
  const row = document.createElement("tr");
  row.append(
    actionCell("編修", () => openCardEditor(item)),
    detailCell([
      { label: "代碼", value: item.slug },
      { label: "標題", value: item.title },
      { label: "公開姓名", value: item.display_name },
      { label: "描述", value: item.description }
    ]),
    detailCell([
      { label: "會員", value: `${item.member_no || "-"} ${item.owner_name || ""}`.trim() },
      { label: "公司", value: item.company },
      { label: "職稱", value: item.job_title }
    ]),
    detailCell([
      { label: "電話", value: item.phone },
      { label: "電子郵件", value: item.email },
      { label: "網站", value: item.website },
      { label: "LINE 連結", value: item.line_url },
      { label: "地址", value: item.address }
    ]),
    detailCell([
      { label: "版型", value: item.layout },
      { label: "主色", value: item.theme_color },
      { label: "狀態", value: item.is_published ? "published" : "draft" }
    ]),
    detailCell([
      { label: "名單", value: item.lead_count },
      { label: "事件", value: item.event_count }
    ]),
    detailCell([
      { label: "更新", value: shortDate(item.updated_at) },
      { label: "備註", value: item.public_note }
    ])
  );
  return row;
}

function createField({ name, label, value, type = "text", options = null, full = false }) {
  const wrapper = document.createElement("label");
  if (full) wrapper.className = "full";
  wrapper.textContent = label;
  let input;
  if (options) {
    input = document.createElement("select");
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = String(option.value) === String(value ?? "");
      input.append(item);
    });
  } else if (type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 4;
  } else {
    input = document.createElement("input");
    input.type = type;
  }
  input.name = name;
  input.value = value ?? "";
  wrapper.append(input);
  return wrapper;
}

function openEditor(title, fields, onSubmit) {
  el.editTitle.textContent = title;
  el.editPanel.classList.remove("collapsed");
  el.editForm.className = "edit-form";
  el.editForm.replaceChildren();
  fields.forEach((field) => el.editForm.append(createField(field)));
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "儲存";
  el.editForm.append(submit);
  el.editForm.onsubmit = async (event) => {
    event.preventDefault();
    const lock = lockButton(event.submitter, "儲存中...", "已儲存");
    if (!lock) return;
    const payload = Object.fromEntries(new FormData(el.editForm).entries());
    try {
      await onSubmit(payload);
      lock.done();
    } catch (error) {
      lock.fail();
      if (el.recordStatus) el.recordStatus.textContent = `儲存失敗：${error.message}`;
    }
  };
  el.editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function escapeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|mailto:|tel:|line:\/\/|#)/i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeAdminButton(button = {}) {
  return {
    label: String(button.label || "按鈕").slice(0, 20),
    url: String(button.url || ""),
    color: String(button.color || "#147d64")
  };
}

function defaultAdminButtons(item) {
  return [
    { label: "加 LINE 好友", url: item.line_url || "", color: "#06C755" },
    { label: "行動電話", url: item.phone ? `tel:${item.phone}` : "", color: "#147d64" },
    { label: "電子郵件", url: item.email ? `mailto:${item.email}` : "", color: "#2c5f9e" }
  ];
}

function createAdminSnapshot(source = {}) {
  return {
    title: source.title || "未命名名片",
    desc: source.desc || source.description || "",
    chatText: source.chatText || source.chat_text || "",
    coverUrl: source.coverUrl || source.cover_url || source.cover || "",
    coverLink: source.coverLink || source.cover_link || "",
    descColor: source.descColor || source.desc_color || "#61707a",
    descAlign: source.descAlign || source.desc_align || "center",
    buttons: Array.isArray(source.buttons) ? source.buttons.slice(0, 8).map(normalizeAdminButton) : [],
    detached: Boolean(source.detached)
  };
}

function normalizeAdminCardDraft(item) {
  const payload = safeJson(item.buttons_json, []);
  const buttons = Array.isArray(payload)
    ? payload.slice(0, 8).map(normalizeAdminButton)
    : (Array.isArray(payload?.buttons) ? payload.buttons.slice(0, 8).map(normalizeAdminButton) : defaultAdminButtons(item));
  const base = createAdminSnapshot({
    title: item.title,
    desc: item.description,
    coverUrl: item.cover_url,
    descColor: item.desc_color,
    descAlign: item.desc_align,
    buttons
  });
  const layoutCards = {};
  ["landscape", "portrait", "square"].forEach((layout) => {
    layoutCards[layout] = createAdminSnapshot(payload?.layoutCards?.[layout] || base);
  });
  const layout = ["landscape", "portrait", "square"].includes(item.layout) ? item.layout : "landscape";
  const active = layoutCards[layout] || base;
  return {
    id: item.id,
    slug: item.slug || "",
    layout,
    isPublished: item.is_published ? "1" : "0",
    displayName: item.display_name || "",
    company: item.company || "",
    jobTitle: item.job_title || "",
    phone: item.phone || "",
    email: item.email || "",
    website: item.website || "",
    lineUrl: item.line_url || "",
    address: item.address || "",
    themeColor: item.theme_color || "#147d64",
    publicNote: item.public_note || "",
    layoutCards,
    title: active.title,
    description: active.desc,
    chatText: active.chatText,
    coverUrl: active.coverUrl,
    coverLink: active.coverLink,
    descColor: active.descColor,
    descAlign: active.descAlign,
    buttons: active.buttons
  };
}

function saveAdminActiveLayout(draft, markDetached = true) {
  draft.layoutCards[draft.layout] = createAdminSnapshot({
    title: draft.title,
    desc: draft.description,
    chatText: draft.chatText,
    coverUrl: draft.coverUrl,
    coverLink: draft.coverLink,
    descColor: draft.descColor,
    descAlign: draft.descAlign,
    buttons: draft.buttons,
    detached: markDetached
  });
}

function applyAdminLayout(draft, layout) {
  saveAdminActiveLayout(draft, false);
  draft.layout = layout;
  const active = draft.layoutCards[layout] || createAdminSnapshot(draft);
  draft.title = active.title;
  draft.description = active.desc;
  draft.chatText = active.chatText;
  draft.coverUrl = active.coverUrl;
  draft.coverLink = active.coverLink;
  draft.descColor = active.descColor;
  draft.descAlign = active.descAlign;
  draft.buttons = active.buttons.slice(0, 8).map(normalizeAdminButton);
}

function createAdminInput(labelText, value, options = {}) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement(options.textarea ? "textarea" : options.select ? "select" : "input");
  if (options.textarea) input.rows = options.rows || 4;
  if (options.type) input.type = options.type;
  if (options.select) {
    options.select.forEach(([optionValue, text]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = text;
      option.selected = String(optionValue) === String(value ?? "");
      input.append(option);
    });
  } else {
    input.value = value ?? "";
  }
  label.append(input);
  return { label, input };
}

function adminCardPayload(draft) {
  saveAdminActiveLayout(draft, true);
  const buttons = draft.buttons.map((button) => ({
    ...button,
    url: escapeUrl(button.url)
  }));
  const layoutCards = {};
  Object.entries(draft.layoutCards).forEach(([layout, card]) => {
    layoutCards[layout] = {
      ...card,
      coverUrl: escapeUrl(card.coverUrl),
      coverLink: escapeUrl(card.coverLink),
      buttons: (card.buttons || []).map((button) => ({ ...button, url: escapeUrl(button.url) }))
    };
  });
  return {
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    coverUrl: escapeUrl(draft.coverUrl),
    descColor: draft.descColor,
    descAlign: draft.descAlign,
    buttons,
    layoutCards,
    displayName: draft.displayName,
    company: draft.company,
    jobTitle: draft.jobTitle,
    phone: draft.phone,
    email: draft.email,
    website: escapeUrl(draft.website),
    lineUrl: escapeUrl(draft.lineUrl),
    address: draft.address,
    themeColor: draft.themeColor,
    publicNote: draft.publicNote,
    layout: draft.layout,
    isPublished: draft.isPublished
  };
}

function openUserEditor(item) {
  openEditor(`編修會員 ${item.member_no || ""}`, [
    { name: "displayName", label: "顯示名稱", value: item.display_name },
    { name: "email", label: "電子郵件", value: item.email, type: "email" },
    { name: "company", label: "公司 / 單位", value: item.company },
    { name: "jobTitle", label: "職稱", value: item.job_title },
    { name: "phone", label: "電話", value: item.phone },
    { name: "lineUserId", label: "LINE 識別碼", value: item.line_user_id },
    { name: "points", label: "點數", value: item.points, type: "number" },
    { name: "role", label: "權限角色", value: item.role, options: [
      { value: "owner", label: "擁有者" },
      { value: "manager", label: "管理員" },
      { value: "member", label: "會員" },
      { value: "viewer", label: "檢視者" }
    ] },
    { name: "status", label: "帳號狀態", value: item.status, options: [
      { value: "active", label: "啟用" },
      { value: "invited", label: "已邀請" },
      { value: "disabled", label: "停用" }
    ] },
    { name: "plan", label: "方案", value: item.plan, options: [
      { value: "free", label: "免費版" },
      { value: "starter", label: "入門版" },
      { value: "team", label: "團隊版" },
      { value: "enterprise", label: "企業版" }
    ] },
    { name: "notes", label: "備註", value: item.notes, type: "textarea", full: true }
  ], async (payload) => {
    await request(`/api/admin/users/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    await loadAdmin();
    if (el.recordStatus) el.recordStatus.textContent = "會員資料已儲存";
  });
}

function openCardEditor(item) {
  openEditor(`編修名片 ${item.slug || ""}`, [
    { name: "slug", label: "網址代稱", value: item.slug },
    { name: "title", label: "名片標題", value: item.title },
    { name: "displayName", label: "公開名稱", value: item.display_name },
    { name: "company", label: "公司 / 單位", value: item.company },
    { name: "jobTitle", label: "職稱", value: item.job_title },
    { name: "phone", label: "電話", value: item.phone },
    { name: "email", label: "電子郵件", value: item.email, type: "email" },
    { name: "website", label: "網站", value: item.website },
    { name: "lineUrl", label: "LINE 連結", value: item.line_url },
    { name: "address", label: "地址", value: item.address },
    { name: "themeColor", label: "主題色", value: item.theme_color, type: "color" },
    { name: "layout", label: "版型", value: item.layout, options: [
      { value: "landscape", label: "橫式" },
      { value: "portrait", label: "直式" },
      { value: "square", label: "方形" }
    ] },
    { name: "isPublished", label: "發布狀態", value: item.is_published ? "1" : "0", options: [
      { value: "1", label: "已發布" },
      { value: "0", label: "草稿" }
    ] },
    { name: "description", label: "介紹內容", value: item.description, type: "textarea", full: true },
    { name: "publicNote", label: "公開備註", value: item.public_note, type: "textarea", full: true }
  ], async (payload) => {
    await request(`/api/admin/cards/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    await loadAdmin();
    if (el.recordStatus) el.recordStatus.textContent = "名片資料已儲存";
  });
}

function openCardEditor(item) {
  const draft = normalizeAdminCardDraft(item);
  el.editTitle.textContent = `編修名片 ${draft.slug || ""}`;
  el.editPanel.classList.remove("collapsed");
  el.editForm.className = "edit-form admin-wysiwyg-form";
  el.editForm.replaceChildren();

  const workspace = document.createElement("div");
  workspace.className = "admin-card-workspace";
  const preview = document.createElement("div");
  preview.className = "admin-card-preview-wrap";
  const inspector = document.createElement("div");
  inspector.className = "admin-card-inspector";
  workspace.append(preview, inspector);

  const details = document.createElement("div");
  details.className = "admin-card-details";

  const save = document.createElement("button");
  save.type = "submit";
  save.className = "admin-save-card";
  save.textContent = "儲存名片";

  const renderAll = () => {
    renderAdminCardPreview(draft, preview, inspector, renderAll);
    renderAdminCardDetails(draft, details, renderAll);
  };
  renderAll();

  el.editForm.append(workspace, details, save);
  el.editForm.onsubmit = async (event) => {
    event.preventDefault();
    const lock = lockButton(event.submitter, "儲存中...", "已儲存");
    if (!lock) return;
    try {
      await request(`/api/admin/cards/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify(adminCardPayload(draft))
      });
      await loadAdmin();
      if (el.recordStatus) el.recordStatus.textContent = "名片資料已儲存";
      lock.done();
    } catch (error) {
      lock.fail();
      if (el.recordStatus) el.recordStatus.textContent = `名片儲存失敗：${error.message}`;
    }
  };
  el.editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAdminCardPreview(draft, target, inspector, renderAll) {
  target.replaceChildren();
  const layoutTabs = document.createElement("div");
  layoutTabs.className = "admin-layout-tabs";
  [
    ["landscape", "標準"],
    ["portrait", "滿版"],
    ["square", "方形"]
  ].forEach(([layout, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = draft.layout === layout ? "active" : "";
    button.addEventListener("click", () => {
      applyAdminLayout(draft, layout);
      renderAll();
    });
    layoutTabs.append(button);
  });

  const card = document.createElement("div");
  card.className = "admin-live-card";
  const header = document.createElement("div");
  header.className = "admin-live-header";
  const share = document.createElement("span");
  share.textContent = "分享";
  header.append(share);

  const coverButton = document.createElement("button");
  coverButton.type = "button";
  coverButton.className = "admin-live-cover-target";
  coverButton.addEventListener("click", () => renderAdminInspector(draft, inspector, "cover", -1, renderAll));
  const cover = document.createElement("img");
  cover.className = `admin-live-cover ${draft.layout}`;
  cover.src = draft.coverUrl || "https://placehold.co/900x585?text=Cover";
  cover.alt = "名片封面";
  cover.onerror = () => { cover.src = "https://placehold.co/900x585?text=Cover"; };
  coverButton.append(cover);

  const content = document.createElement("div");
  content.className = "admin-live-content";
  const title = document.createElement("button");
  title.type = "button";
  title.className = "admin-live-title";
  title.textContent = draft.title || "未命名名片";
  title.addEventListener("click", () => renderAdminInspector(draft, inspector, "title", -1, renderAll));
  const desc = document.createElement("button");
  desc.type = "button";
  desc.className = "admin-live-desc";
  desc.textContent = draft.description || "點擊編輯名片介紹";
  desc.style.color = draft.descColor;
  desc.style.textAlign = draft.descAlign;
  desc.addEventListener("click", () => renderAdminInspector(draft, inspector, "desc", -1, renderAll));
  content.append(title, desc);

  const buttons = document.createElement("div");
  buttons.className = "admin-live-buttons";
  draft.buttons.forEach((item, index) => {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "admin-live-action";
    action.style.background = item.color || "#147d64";
    action.textContent = item.label || "按鈕";
    action.addEventListener("click", () => renderAdminInspector(draft, inspector, "button", index, renderAll));
    buttons.append(action);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "admin-add-button";
  add.textContent = "+ 新增按鈕";
  add.addEventListener("click", () => {
    if (draft.buttons.length >= 8) return;
    draft.buttons.push({ label: "新增按鈕", url: "", color: "#147d64" });
    saveAdminActiveLayout(draft, true);
    renderAll();
    renderAdminInspector(draft, inspector, "button", draft.buttons.length - 1, renderAll);
  });
  buttons.append(add);

  card.append(header, coverButton, content, buttons);
  target.append(layoutTabs, card);
  if (!inspector.childElementCount) renderAdminInspector(draft, inspector, "title", -1, renderAll);
}

function renderAdminInspector(draft, target, type, index, renderAll) {
  target.replaceChildren();
  const title = document.createElement("h4");
  title.textContent = type === "cover" ? "編輯封面" : type === "desc" ? "編輯介紹" : type === "button" ? "編輯按鈕" : "編輯標題";
  target.append(title);
  const fields = [];
  if (type === "cover") {
    fields.push(["封面圖片網址", "coverUrl", draft.coverUrl, {}]);
    fields.push(["點圖連結", "coverLink", draft.coverLink, {}]);
  } else if (type === "title") {
    fields.push(["名片標題", "title", draft.title, {}]);
  } else if (type === "desc") {
    fields.push(["介紹文字", "description", draft.description, { textarea: true, rows: 5 }]);
    fields.push(["聊天室顯示文字", "chatText", draft.chatText, { textarea: true, rows: 3 }]);
    fields.push(["文字顏色", "descColor", draft.descColor, { type: "color" }]);
    fields.push(["對齊", "descAlign", draft.descAlign, { select: [["left", "靠左"], ["center", "置中"], ["right", "靠右"]] }]);
  } else if (type === "button") {
    const button = draft.buttons[index] || normalizeAdminButton();
    fields.push(["按鈕文字", "label", button.label, {}]);
    fields.push(["按鈕連結", "url", button.url, {}]);
    fields.push(["按鈕顏色", "color", button.color, { type: "color" }]);
  }

  let coverUrlInput = null;
  fields.forEach(([labelText, key, value, options]) => {
    const field = createAdminInput(labelText, value, options);
    if (type === "cover" && key === "coverUrl") coverUrlInput = field.input;
    field.input.addEventListener("input", () => {
      if (type === "button") {
        draft.buttons[index][key] = field.input.value;
      } else {
        draft[key] = field.input.value;
      }
      saveAdminActiveLayout(draft, true);
      renderAdminCardPreview(draft, document.querySelector(".admin-card-preview-wrap"), target, renderAll);
    });
    target.append(field.label);
  });

  if (type === "cover") {
    appendAdminCoverUpload(draft, target, coverUrlInput, renderAll);
  }

  if (type === "button") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-remove-button";
    remove.textContent = "刪除按鈕";
    remove.addEventListener("click", () => {
      draft.buttons.splice(index, 1);
      saveAdminActiveLayout(draft, true);
      renderAll();
    });
    target.append(remove);
  }
}

function appendAdminCoverUpload(draft, target, coverUrlInput, renderAll) {
  const uploadWrap = document.createElement("div");
  uploadWrap.className = "admin-upload-wrap";
  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.textContent = "上傳封面圖片";
  const uploadNote = document.createElement("small");
  uploadNote.textContent = "支援 JPG、PNG、WebP，單檔 2MB 內。";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.hidden = true;

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const lock = lockButton(uploadButton, "上傳中...", "已上傳");
    if (!lock) return;
    try {
      const form = new FormData();
      form.append("folder", `cards-${draft.slug || draft.id || "admin-card"}`);
      form.append("file", file, file.name || "cover.jpg");
      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: form,
        credentials: "same-origin"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(translateError(data.error || `HTTP ${response.status}`));
      }
      draft.coverUrl = data.url;
      if (coverUrlInput) coverUrlInput.value = data.url;
      saveAdminActiveLayout(draft, true);
      renderAdminCardPreview(draft, document.querySelector(".admin-card-preview-wrap"), target, renderAll);
      if (el.recordStatus) el.recordStatus.textContent = "封面已上傳，請按「儲存名片」寫入資料。";
      lock.done();
    } catch (error) {
      lock.fail();
      if (el.recordStatus) el.recordStatus.textContent = `封面上傳失敗：${error.message}`;
    } finally {
      fileInput.value = "";
    }
  });

  uploadWrap.append(uploadButton, uploadNote, fileInput);
  target.append(uploadWrap);
}

function renderAdminCardDetails(draft, target, renderAll) {
  target.replaceChildren();
  const fields = [
    ["公開網址代稱", "slug", draft.slug, {}],
    ["顯示名稱", "displayName", draft.displayName, {}],
    ["公司 / 組織", "company", draft.company, {}],
    ["職稱", "jobTitle", draft.jobTitle, {}],
    ["電話", "phone", draft.phone, {}],
    ["Email", "email", draft.email, { type: "email" }],
    ["網站", "website", draft.website, {}],
    ["LINE 連結", "lineUrl", draft.lineUrl, {}],
    ["地址", "address", draft.address, {}],
    ["主題色", "themeColor", draft.themeColor, { type: "color" }],
    ["發布狀態", "isPublished", draft.isPublished, { select: [["1", "已發布"], ["0", "草稿"]] }],
    ["公開備註", "publicNote", draft.publicNote, { textarea: true, rows: 3 }]
  ];
  fields.forEach(([labelText, key, value, options]) => {
    const field = createAdminInput(labelText, value, options);
    field.input.addEventListener("input", () => {
      draft[key] = field.input.value;
      saveAdminActiveLayout(draft, true);
    });
    target.append(field.label);
  });
}

function renderLead(item) {
  const row = document.createElement("tr");
  row.append(
    cell(shortDate(item.created_at)),
    cell(item.card_slug),
    cell(item.name),
    cell(item.contact),
    badgeCell(item.source),
    cell(item.message, "muted")
  );
  return row;
}

function renderMemberCrm(item) {
  const row = document.createElement("tr");
  row.append(
    cell(shortDate(item.created_at)),
    detailCell([
      { label: "會員", value: `${item.member_no || "-"} ${item.user_name || ""}`.trim() },
      { label: "建立者", value: item.created_by }
    ]),
    badgeCell(item.category),
    badgeCell(item.status, item.status === "blocked" ? "blocked" : ""),
    cell(item.title),
    cell(item.body, "muted"),
    cell(shortDate(item.next_follow_up_at)),
    detailCell([
      { label: "關聯會員", value: `${item.related_member_no || ""} ${item.related_user_name || ""}`.trim() },
      { label: "關聯名片", value: item.related_card_slug || item.related_card_title }
    ])
  );
  return row;
}

function renderEvent(item) {
  const row = document.createElement("tr");
  row.append(
    cell(shortDate(item.created_at)),
    cell(item.card_slug),
    badgeCell(item.event_type),
    cell(item.source),
    cell(JSON.stringify(item.metadata || {}), "muted")
  );
  return row;
}

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".data-section").forEach((section) => {
      section.classList.toggle("active", section.id === `tab-${button.dataset.tab}`);
    });
  });
});

el.userSearchInput?.addEventListener("input", () => {
  state.userSearch = el.userSearchInput.value;
  if (state.data) render(state.data);
});

el.refreshButton?.addEventListener("click", () => {
  loadAdmin().catch((error) => {
    if (el.recordStatus) el.recordStatus.textContent = `讀取失敗：${error.message}`;
  });
});

el.logoutButton?.addEventListener("click", async () => {
  if (el.recordStatus) el.recordStatus.textContent = "登出中...";
  try {
    await request("/api/logout", { method: "POST", body: "{}" });
  } finally {
    location.href = "/login";
  }
});

el.closeEditPanel?.addEventListener("click", () => {
  el.editPanel.classList.add("collapsed");
  el.editForm.replaceChildren();
});

el.toggleRecordForm?.addEventListener("click", () => {
  const collapsed = el.recordForm.classList.toggle("collapsed");
  el.toggleRecordForm.textContent = collapsed ? "展開" : "收合";
  el.toggleRecordForm.setAttribute("aria-expanded", String(!collapsed));
});

el.recordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (el.recordStatus) el.recordStatus.textContent = "儲存中...";
  try {
    await request("/api/admin/records", {
      method: "POST",
      body: JSON.stringify({
        category: document.querySelector("#recordCategory").value,
        status: document.querySelector("#recordStatusInput").value,
        priority: document.querySelector("#recordPriority").value,
        title: document.querySelector("#recordTitle").value.trim(),
        body: document.querySelector("#recordBody").value.trim(),
        createdBy: "後台"
      })
    });
    el.recordForm.reset();
    el.recordForm.classList.add("collapsed");
    if (el.toggleRecordForm) {
      el.toggleRecordForm.textContent = "展開";
      el.toggleRecordForm.setAttribute("aria-expanded", "false");
    }
    await loadAdmin();
  } catch (error) {
    if (el.recordStatus) el.recordStatus.textContent = `儲存失敗：${error.message}`;
  }
});

el.memberCrmForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (el.recordStatus) el.recordStatus.textContent = "CRM紀錄儲存中...";
  try {
    await request("/api/admin/member-crm", {
      method: "POST",
      body: JSON.stringify({
        memberNo: document.querySelector("#crmMemberRef").value.trim(),
        category: document.querySelector("#crmCategory").value,
        status: document.querySelector("#crmStatus").value,
        priority: document.querySelector("#crmPriority").value,
        nextFollowUpAt: document.querySelector("#crmNextFollowUpAt").value,
        relatedMemberNo: document.querySelector("#crmRelatedMemberNo").value.trim(),
        title: document.querySelector("#crmTitle").value.trim(),
        body: document.querySelector("#crmBody").value.trim(),
        createdBy: "admin"
      })
    });
    el.memberCrmForm.reset();
    await loadAdmin();
    if (el.recordStatus) el.recordStatus.textContent = "會員CRM紀錄已新增";
  } catch (error) {
    if (el.recordStatus) el.recordStatus.textContent = `CRM紀錄儲存失敗：${error.message}`;
  }
});

async function boot() {
  await loadSession();
  await loadAdmin();
}

boot().catch((error) => {
  if (el.recordStatus) el.recordStatus.textContent = `讀取失敗：${error.message}`;
});
