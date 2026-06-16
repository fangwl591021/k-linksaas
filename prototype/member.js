const fields = [
  "slug",
  "title",
  "displayName",
  "company",
  "jobTitle",
  "phone",
  "email",
  "website",
  "lineUrl",
  "address",
  "themeColor",
  "isPublished",
  "description",
  "publicNote"
];

const els = {
  form: document.querySelector("#cardForm"),
  saveStatus: document.querySelector("#saveStatus"),
  publicCardLink: document.querySelector("#publicCardLink"),
  copyLinkButton: document.querySelector("#copyLinkButton"),
  logoutButton: document.querySelector("#logoutButton"),
  crmStatus: document.querySelector("#crmStatus"),
  crmRows: document.querySelector("#crmRows")
};

let currentCardId = "";
let currentSlug = "";

function setStatus(message, danger = false) {
  els.saveStatus.textContent = message;
  els.saveStatus.style.color = danger ? "#b42318" : "#64748b";
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
    "Authentication required": "請先登入",
    "Card not found": "找不到名片",
    "Slug already used": "網址代稱已被使用",
    "No card found": "找不到可編輯的名片"
  };
  return map[message] || message || "發生錯誤";
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.href = `/login?next=${encodeURIComponent("/member")}`;
    throw new Error("請先登入");
  }
  if (!response.ok || data.ok === false) throw new Error(translateError(data.error || `HTTP ${response.status}`));
  return data;
}

function value(id) {
  return document.querySelector(`#${id}`)?.value || "";
}

function fillField(id, fieldValue) {
  const input = document.querySelector(`#${id}`);
  if (input) input.value = fieldValue ?? "";
}

function setPublicLink(slug) {
  currentSlug = slug || "";
  const url = `${location.origin}/c/${currentSlug}`;
  els.publicCardLink.href = currentSlug ? url : "/";
}

function fillMember(data) {
  document.querySelector("#memberName").textContent = data.user.displayName || data.user.email || "會員";
  document.querySelector("#memberNo").textContent = data.user.memberNo || "-";
  document.querySelector("#memberPoints").textContent = data.user.points || 0;
  document.querySelector("#memberPlan").textContent = data.user.plan === "free" ? "免費版" : data.user.plan || "-";
}

function fillCard(card) {
  currentCardId = card.id || "";
  fillField("slug", card.slug);
  fillField("title", card.title);
  fillField("displayName", card.displayName);
  fillField("company", card.company);
  fillField("jobTitle", card.jobTitle);
  fillField("phone", card.phone);
  fillField("email", card.email);
  fillField("website", card.website);
  fillField("lineUrl", card.lineUrl);
  fillField("address", card.address);
  fillField("themeColor", card.themeColor || "#147d64");
  fillField("isPublished", card.isPublished ? "1" : "0");
  fillField("description", card.description);
  fillField("publicNote", card.publicNote);
  setPublicLink(card.slug);
}

function shortDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").replace(".000Z", "");
}

function crmCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined || value === "" ? "-" : String(value);
  if (className) cell.className = className;
  return cell;
}

function renderCrmRows(records) {
  if (!els.crmRows) return;
  els.crmRows.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr");
    const empty = document.createElement("td");
    empty.colSpan = 6;
    empty.textContent = "目前尚無CRM紀錄";
    row.append(empty);
    els.crmRows.append(row);
    return;
  }
  records.forEach((item) => {
    const row = document.createElement("tr");
    row.append(
      crmCell(shortDate(item.created_at)),
      crmCell(item.category),
      crmCell(item.status),
      crmCell(item.title),
      crmCell(item.body, "muted"),
      crmCell(shortDate(item.next_follow_up_at))
    );
    els.crmRows.append(row);
  });
}

async function loadCrmRecords() {
  if (els.crmStatus) els.crmStatus.textContent = "讀取中...";
  const data = await request("/api/member/crm");
  renderCrmRows(data.records || []);
  if (els.crmStatus) els.crmStatus.textContent = `${(data.records || []).length} 筆紀錄`;
}

async function loadMember() {
  setStatus("讀取中...");
  const data = await request("/api/member/me");
  fillMember(data);
  if (data.card) fillCard(data.card);
  await loadCrmRecords();
  setStatus("已載入");
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const lock = lockButton(event.submitter, "儲存中...", "已儲存");
  if (!lock) return;
  setStatus("儲存中...");
  try {
    const payload = Object.fromEntries(fields.map((id) => [id, value(id)]));
    const data = await request("/api/member/card", {
      method: "PATCH",
      body: JSON.stringify({ id: currentCardId, ...payload })
    });
    fillCard(data.card);
    lock.done();
    setStatus("名片已儲存");
  } catch (error) {
    lock.fail();
    setStatus(`儲存失敗：${translateError(error.message)}`, true);
  }
});

els.copyLinkButton.addEventListener("click", async () => {
  if (!currentSlug) return;
  const lock = lockButton(els.copyLinkButton, "複製中...", "已完成");
  if (!lock) return;
  const url = `${location.origin}/c/${currentSlug}`;
  try {
    await navigator.clipboard.writeText(url);
    lock.done();
    setStatus("名片連結已複製");
  } catch {
    lock.fail();
    setStatus(url);
  }
});

els.logoutButton.addEventListener("click", async () => {
  const lock = lockButton(els.logoutButton, "登出中...", "已完成");
  if (!lock) return;
  await request("/api/logout", { method: "POST", body: "{}" }).catch(() => null);
  lock.done();
  location.href = "/login";
});

loadMember().catch((error) => {
  setStatus(`讀取失敗：${translateError(error.message)}`, true);
});
