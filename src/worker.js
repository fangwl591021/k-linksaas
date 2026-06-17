const DEFAULT_SLUG = "wang-li-chung";
const SESSION_COOKIE = "klink_session";
const SESSION_DAYS = 7;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    if (url.pathname.startsWith("/uploads/")) {
      return getUploadedImage(env, url);
    }

    if (url.pathname === "/admin") {
      const session = await getSessionUser(request, env);
      if (!session || !isAdminRole(session.user.role)) {
        return redirectToLogin(url);
      }
      return env.ASSETS.fetch(new Request(new URL("/admin.html", url.origin), request));
    }

    if (url.pathname === "/login") {
      return env.ASSETS.fetch(new Request(new URL("/login.html", url.origin), request));
    }

    if (url.pathname === "/member") {
      const session = await getSessionUser(request, env);
      if (!session) {
        return redirectToLogin(url);
      }
      return env.ASSETS.fetch(new Request(new URL("/member.html", url.origin), request));
    }

    if (url.pathname === "/register") {
      return env.ASSETS.fetch(new Request(new URL("/register.html", url.origin), request));
    }

    if (url.pathname === "/share") {
      return env.ASSETS.fetch(new Request(new URL("/share.html", url.origin), request));
    }

    if (url.pathname === "/" || url.pathname.startsWith("/c/") || url.pathname.startsWith("/u/")) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url.origin), request));
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  try {
    if (!env.DB) {
      return json({ ok: false, error: "D1 binding DB is not configured" }, 500);
    }

    if (request.method === "OPTIONS") return cors();

    if (url.pathname === "/api/health" && request.method === "GET") {
      const row = await env.DB.prepare("SELECT COUNT(*) AS card_count FROM cards").first();
      return json({ ok: true, d1: true, cardCount: row?.card_count || 0 });
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      return registerUser(request, env);
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      return loginUser(request, env);
    }

    if (url.pathname === "/api/line-login" && request.method === "POST") {
      return loginLineUser(request, env);
    }

    if (url.pathname === "/api/session" && request.method === "GET") {
      return getSessionResponse(request, env);
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {
      return logoutUser(request, env);
    }

    if (url.pathname === "/api/uploads/image" && request.method === "POST") {
      return uploadImage(request, env, url);
    }

    if (url.pathname === "/api/member/me" && request.method === "GET") {
      return getMemberMe(request, env);
    }

    if (url.pathname === "/api/member/card" && request.method === "PATCH") {
      return updateMemberCard(request, env);
    }

    if (url.pathname === "/api/member/crm" && request.method === "GET") {
      return getMemberCrmRecords(request, env);
    }

    const cardMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
    if (cardMatch && request.method === "GET") {
      return getCard(env, decodeURIComponent(cardMatch[1]));
    }

    const profileMatch = url.pathname.match(/^\/api\/profiles\/([^/]+)$/);
    if (profileMatch && request.method === "GET") {
      return getPublicProfile(env, decodeURIComponent(profileMatch[1]));
    }

    if (cardMatch && request.method === "PUT") {
      return saveCard(request, env, decodeURIComponent(cardMatch[1]));
    }

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return createLead(request, env);
    }

    if (url.pathname === "/api/events" && request.method === "POST") {
      return logEvent(request, env);
    }

    if (url.pathname === "/api/dashboard" && request.method === "GET") {
      return getDashboard(env, url.searchParams.get("slug") || DEFAULT_SLUG);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      const session = await getSessionUser(request, env);
      if (!session || !isAdminRole(session.user.role)) {
        return json({ ok: false, error: "Authentication required" }, 401);
      }
    }

    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      return getAdminOverview(env);
    }

    const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUserMatch && request.method === "PATCH") {
      return updateAdminUser(request, env, decodeURIComponent(adminUserMatch[1]));
    }

    const adminCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([^/]+)$/);
    if (adminCardMatch && request.method === "PATCH") {
      return updateAdminCard(request, env, decodeURIComponent(adminCardMatch[1]));
    }

    if (url.pathname === "/api/admin/records" && request.method === "GET") {
      return getAdminRecords(env);
    }

    if (url.pathname === "/api/admin/records" && request.method === "POST") {
      return createAdminRecord(request, env);
    }

    if (url.pathname === "/api/admin/member-crm" && request.method === "POST") {
      return createAdminMemberCrmRecord(request, env);
    }

    return json({ ok: false, error: "Not found" }, 404);
  } catch (error) {
    return json({ ok: false, error: error?.message || "Internal error" }, 500);
  }
}

function redirectToLogin(url) {
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
  return new Response(null, {
    status: 302,
    headers: { location: loginUrl.toString() }
  });
}

async function loginUser(request, env) {
  const body = await readJson(request);
  const email = cleanText(String(body.email || "").toLowerCase(), 180);
  const password = String(body.password || "");
  if (!email || !password) return json({ ok: false, error: "Email and password are required" }, 400);

  const account = await env.DB.prepare(`
    SELECT aa.id AS account_id, aa.user_id, aa.password_hash, aa.salt,
      u.display_name, u.email, u.member_no, u.points, u.role, u.status, u.plan
    FROM auth_accounts aa
    JOIN users u ON u.id = aa.user_id
    WHERE aa.provider = 'password' AND lower(aa.email) = lower(?)
    LIMIT 1
  `).bind(email).first();

  if (!account || !account.password_hash || !(await verifyPassword(password, account))) {
    return json({ ok: false, error: "Invalid email or password" }, 401);
  }
  if (account.status === "disabled") {
    return json({ ok: false, error: "Account is disabled" }, 403);
  }

  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  const tokenHash = await hashText(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_hint, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      account.user_id,
      tokenHash,
      cleanText(request.headers.get("user-agent") || "", 500),
      cleanText(request.headers.get("cf-connecting-ip") || "", 80),
      expiresAt,
      now.toISOString()
    ),
    env.DB.prepare("UPDATE auth_accounts SET last_login_at = ? WHERE id = ?").bind(now.toISOString(), account.account_id)
  ]);

  return jsonWithHeaders({
    ok: true,
    user: serializeSessionUser(account)
  }, 200, {
    "set-cookie": createSessionCookie(token, SESSION_DAYS * 24 * 60 * 60)
  });
}

async function loginLineUser(request, env) {
  const body = await readJson(request);
  const providerUserId = cleanText(body.providerUserId || "", 160);
  const displayName = cleanText(body.displayName || "LINE User", 120);
  const pictureUrl = cleanText(body.pictureUrl || "", 1000);
  const accessToken = cleanText(body.accessToken || "", 2000);
  const now = new Date().toISOString();

  if (!providerUserId) {
    return json({ ok: false, error: "LINE user id is required" }, 400);
  }
  if (!accessToken) {
    return json({ ok: false, error: "LINE access token is required" }, 401);
  }

  const verifiedProfile = await verifyLineAccessToken(accessToken);
  if (!verifiedProfile || verifiedProfile.userId !== providerUserId) {
    return json({ ok: false, error: "LINE identity verification failed" }, 401);
  }

  let account = await env.DB.prepare(`
    SELECT aa.id AS account_id, aa.user_id,
      u.id, u.display_name, u.email, u.member_no, u.points, u.role, u.status, u.plan
    FROM auth_accounts aa
    JOIN users u ON u.id = aa.user_id
    WHERE aa.provider = 'line' AND aa.provider_user_id = ?
    LIMIT 1
  `).bind(providerUserId).first();

  if (!account) {
    const userId = normalizeId(`user-line-${providerUserId}`);
    const memberNo = generateMemberNo(providerUserId);
    const slug = await uniqueSlug(env, slugify(displayName || `line-${providerUserId.slice(-6)}`));
    const cardId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const buttonsPayload = {
      version: 2,
      buttons: [
        { label: "LINE Login", url: "https://liff.line.me/2007221311-jwiMeoXT", color: "#06C755" },
        { label: "Book a Demo", url: "https://k-linksaas.fangwl591021.workers.dev/", color: "#2c5f9e" },
        { label: "Download vCard", url: "#vcard", color: "#c8792d" }
      ]
    };

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (
          id, auth_provider, provider_user_id, display_name, email, member_no, points, role,
          company, job_title, phone, status, plan, line_user_id, created_at, updated_at
        )
        VALUES (?, 'line', ?, ?, NULL, ?, 0, 'owner', '', '', '', 'active', 'free', ?, ?, ?)
      `).bind(userId, providerUserId, displayName, memberNo, providerUserId, now, now),
      env.DB.prepare(`
        INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, email, password_hash, salt, created_at)
        VALUES (?, ?, 'line', ?, NULL, NULL, NULL, ?)
      `).bind(accountId, userId, providerUserId, now),
      env.DB.prepare(`
        INSERT INTO cards (
          id, owner_id, slug, title, description, cover_url, layout, desc_color, desc_align,
          buttons_json, is_published, display_name, theme_color, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'landscape', '#61707a', 'center', ?, 1, ?, '#147d64', ?, ?)
      `).bind(
        cardId,
        userId,
        slug,
        displayName,
        "SaaS 電子名片",
        pictureUrl || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
        JSON.stringify(buttonsPayload),
        displayName,
        now,
        now
      ),
      env.DB.prepare(`
        INSERT INTO admin_records (id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at)
        VALUES (?, 'member', ?, ?, 'done', 'normal', 'user', ?, 'line-login-api', ?, ?)
      `).bind(
        crypto.randomUUID(),
        `LINE member created: ${displayName}`,
        `member_no=${memberNo}, provider=line, slug=${slug}`,
        userId,
        now,
        now
      )
    ]);

    account = await env.DB.prepare(`
      SELECT ? AS account_id, ? AS user_id,
        u.id, u.display_name, u.email, u.member_no, u.points, u.role, u.status, u.plan
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `).bind(accountId, userId, userId).first();
  } else {
    await env.DB.prepare("UPDATE auth_accounts SET last_login_at = ? WHERE id = ?").bind(now, account.account_id).run();
  }

  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  const tokenHash = await hashText(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_hint, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    account.user_id,
    tokenHash,
    cleanText(request.headers.get("user-agent") || "", 500),
    cleanText(request.headers.get("cf-connecting-ip") || "", 80),
    expiresAt,
    now
  ).run();

  const card = await env.DB.prepare(`
    SELECT id, slug, title, description, cover_url, layout, is_published,
      display_name, company, job_title, phone, email, website, line_url, address,
      theme_color, public_note, updated_at
    FROM cards
    WHERE owner_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(account.user_id).first();

  return jsonWithHeaders({
    ok: true,
    user: serializeSessionUser(account),
    card: card ? serializeMemberCard(card) : null
  }, 200, {
    "set-cookie": createSessionCookie(token, SESSION_DAYS * 24 * 60 * 60)
  });
}

async function verifyLineAccessToken(accessToken) {
  try {
    const response = await fetch("https://api.line.me/v2/profile", {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function getSessionResponse(request, env) {
  const session = await getSessionUser(request, env);
  if (!session) return json({ ok: false, error: "Authentication required" }, 401);
  return json({ ok: true, user: serializeSessionUser(session.user) });
}

async function getMemberMe(request, env) {
  const session = await getSessionUser(request, env);
  if (!session) return json({ ok: false, error: "Authentication required" }, 401);

  const [cardResult, leadCount, eventCount] = await env.DB.batch([
    env.DB.prepare(`
      SELECT id, slug, title, description, cover_url, layout, is_published,
        display_name, company, job_title, phone, email, website, line_url, address,
        theme_color, public_note, updated_at
      FROM cards
      WHERE owner_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(session.user.id),
    env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM leads l
      JOIN cards c ON c.id = l.card_id
      WHERE c.owner_id = ?
    `).bind(session.user.id),
    env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM events e
      JOIN cards c ON c.id = e.card_id
      WHERE c.owner_id = ?
    `).bind(session.user.id)
  ]);

  const card = cardResult.results?.[0] || null;
  return json({
    ok: true,
    user: serializeSessionUser(session.user),
    metrics: {
      leads: Number(leadCount.results?.[0]?.count || 0),
      events: Number(eventCount.results?.[0]?.count || 0)
    },
    card: card ? serializeMemberCard(card) : null
  });
}

async function updateMemberCard(request, env) {
  const session = await getSessionUser(request, env);
  if (!session) return json({ ok: false, error: "Authentication required" }, 401);

  const body = await readJson(request);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(`
    SELECT id, slug
    FROM cards
    WHERE owner_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(session.user.id).first();
  if (!existing) return json({ ok: false, error: "No card found" }, 404);

  const nextSlug = slugify(body.slug || existing.slug);
  const slugOwner = await env.DB.prepare(`
    SELECT id
    FROM cards
    WHERE slug = ? AND id <> ?
    LIMIT 1
  `).bind(nextSlug, existing.id).first();
  if (slugOwner) return json({ ok: false, error: "Slug already used" }, 409);

  await env.DB.prepare(`
    UPDATE cards
    SET slug = ?, title = ?, description = ?, display_name = ?, company = ?, job_title = ?,
      phone = ?, email = ?, website = ?, line_url = ?, address = ?, theme_color = ?,
      public_note = ?, is_published = ?, updated_at = ?
    WHERE id = ? AND owner_id = ?
  `).bind(
    nextSlug,
    cleanText(body.title || "", 160),
    cleanText(body.description || "", 3000),
    cleanText(body.displayName || body.display_name || "", 160),
    cleanText(body.company || "", 160),
    cleanText(body.jobTitle || body.job_title || "", 120),
    cleanText(body.phone || "", 60),
    cleanText(String(body.email || "").toLowerCase(), 180) || null,
    cleanText(body.website || "", 500),
    cleanText(body.lineUrl || body.line_url || "", 500),
    cleanText(body.address || "", 500),
    cleanText(body.themeColor || body.theme_color || "#147d64", 24),
    cleanText(body.publicNote || body.public_note || "", 3000),
    body.isPublished === false || body.isPublished === "0" || body.is_published === 0 || body.is_published === "0" ? 0 : 1,
    now,
    existing.id,
    session.user.id
  ).run();

  await writeAdminSystemRecord(env, "card", `Member card updated: ${existing.id}`, `updated_at=${now}`, existing.id, now);

  const card = await env.DB.prepare(`
    SELECT id, slug, title, description, cover_url, layout, is_published,
      display_name, company, job_title, phone, email, website, line_url, address,
      theme_color, public_note, updated_at
    FROM cards
    WHERE id = ?
    LIMIT 1
  `).bind(existing.id).first();

  return json({ ok: true, card: serializeMemberCard(card) });
}

async function getMemberCrmRecords(request, env) {
  const session = await getSessionUser(request, env);
  if (!session) return json({ ok: false, error: "Authentication required" }, 401);

  const result = await env.DB.prepare(`
    SELECT r.id, r.category, r.title, r.body, r.status, r.priority, r.next_follow_up_at,
      r.created_by, r.created_at, r.updated_at,
      u.member_no AS related_member_no,
      u.display_name AS related_user_name,
      c.slug AS related_card_slug,
      c.title AS related_card_title
    FROM member_crm_records r
    LEFT JOIN users u ON u.id = r.related_user_id
    LEFT JOIN cards c ON c.id = r.related_card_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 80
  `).bind(session.user.id).all();

  return json({ ok: true, records: result.results || [] });
}

async function logoutUser(request, env) {
  const token = getSessionToken(request);
  if (token) {
    const tokenHash = await hashText(token);
    await env.DB.prepare(`
      UPDATE sessions
      SET revoked_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL
    `).bind(new Date().toISOString(), tokenHash).run();
  }

  return jsonWithHeaders({ ok: true }, 200, {
    "set-cookie": clearSessionCookie()
  });
}

async function getSessionUser(request, env) {
  if (!env?.DB) return null;
  const token = getSessionToken(request);
  if (!token) return null;
  const tokenHash = await hashText(token);
  const row = await env.DB.prepare(`
    SELECT s.id AS session_id, s.expires_at,
      u.id, u.display_name, u.email, u.member_no, u.points, u.role, u.status, u.plan
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();
  if (!row || row.status === "disabled") return null;
  return { sessionId: row.session_id, user: row };
}

function getSessionToken(request) {
  return parseCookies(request.headers.get("cookie") || "")[SESSION_COOKIE] || "";
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

async function verifyPassword(password, account) {
  const passwordHash = await hashText(`${account.salt}:${password}`);
  return timingSafeEqual(passwordHash, account.password_hash);
}

function timingSafeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function hashText(value) {
  const input = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function serializeSessionUser(user) {
  return {
    id: user.id || user.user_id,
    displayName: user.display_name,
    email: user.email,
    memberNo: user.member_no,
    points: Number(user.points || 0),
    role: user.role,
    status: user.status,
    plan: user.plan
  };
}

function isAdminRole(role) {
  return role === "owner" || role === "manager";
}

async function getCard(env, slug) {
  const card = await findCard(env, slug);
  if (!card) return json({ ok: false, error: "Card not found" }, 404);
  return json({ ok: true, card: serializeCard(card) });
}

async function getPublicProfile(env, storeCode) {
  const profile = await env.DB.prepare(`
    SELECT
      mp.user_id,
      mp.store_code,
      mp.headline,
      mp.intro,
      mp.avatar_url,
      mp.cover_url,
      mp.line_friend_url,
      mp.phone,
      mp.website,
      mp.public_status,
      mp.updated_at,
      u.display_name,
      u.member_no,
      u.points,
      u.role
    FROM member_profiles mp
    JOIN users u ON u.id = mp.user_id
    WHERE lower(mp.store_code) = lower(?) AND mp.public_status = 'published'
    LIMIT 1
  `).bind(storeCode).first();

  if (!profile) return json({ ok: false, error: "Profile not found" }, 404);

  const card = await env.DB.prepare(`
    SELECT c.*, u.display_name AS owner_name, u.email AS owner_email,
      u.member_no AS owner_member_no, u.points AS owner_points
    FROM cards c
    JOIN users u ON u.id = c.owner_id
    WHERE c.owner_id = ? AND c.is_published = 1
    ORDER BY c.updated_at DESC
    LIMIT 1
  `).bind(profile.user_id).first();

  return json({
    ok: true,
    profile: {
      userId: profile.user_id,
      storeCode: profile.store_code,
      displayName: profile.display_name,
      memberNo: profile.member_no,
      points: Number(profile.points || 0),
      headline: profile.headline,
      intro: profile.intro,
      avatarUrl: profile.avatar_url,
      coverUrl: profile.cover_url,
      lineFriendUrl: profile.line_friend_url,
      phone: profile.phone,
      website: profile.website,
      updatedAt: profile.updated_at
    },
    card: card ? serializeCard(card) : null
  });
}

async function saveCard(request, env, slug) {
  const session = await getSessionUser(request, env);
  if (!session) return json({ ok: false, error: "Authentication required" }, 401);

  const body = await readJson(request);
  const now = new Date().toISOString();
  const card = body.card || {};
  const ownerId = session.user.id;
  const existing = await env.DB.prepare(`
    SELECT id, owner_id
    FROM cards
    WHERE slug = ?
    LIMIT 1
  `).bind(slug).first();

  if (existing && existing.owner_id !== ownerId) {
    return json({ ok: false, error: "You do not have permission to edit this card" }, 403);
  }

  const cardId = existing?.id || normalizeId(`${ownerId}-${slug}-card`);
  const title = cleanText(card.title || "Untitled Card", 160);
  const description = cleanText(card.desc || card.description || "", 3000);
  const coverUrl = cleanText(card.coverUrl || card.cover_url || "", 1000);
  const coverLink = cleanText(card.coverLink || card.cover_link || "", 1000);
  const chatText = cleanText(card.chatText || card.chat_text || "", 400);
  const layout = cleanText(card.layout || "landscape", 32);
  const descColor = cleanText(card.descColor || "#61707a", 24);
  const descAlign = cleanText(card.descAlign || "center", 24);
  const buttons = Array.isArray(card.buttons) ? card.buttons.slice(0, 8) : [];
  const layoutCards = normalizeLayoutCards(card.layoutCards, {
    title,
    desc: description,
    coverUrl,
    coverLink,
    chatText,
    descColor,
    descAlign,
    buttons
  });
  const buttonsPayload = {
    version: 2,
    buttons: buttons.map(normalizeButton),
    layoutCards
  };

  await env.DB.prepare(`
    INSERT INTO cards (
      id, owner_id, slug, title, description, cover_url, layout, desc_color, desc_align,
      buttons_json, is_published, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      cover_url = excluded.cover_url,
      layout = excluded.layout,
      desc_color = excluded.desc_color,
      desc_align = excluded.desc_align,
      buttons_json = excluded.buttons_json,
      is_published = 1,
      updated_at = excluded.updated_at
  `).bind(
    cardId,
    ownerId,
    slug,
    title,
    description,
    coverUrl,
    layout,
    descColor,
    descAlign,
    JSON.stringify(buttonsPayload),
    now,
    now
  ).run();

  return getCard(env, slug);
}

async function uploadImage(request, env, url) {
  if (!env.IMAGES) {
    return json({ ok: false, error: "Image storage is not configured" }, 500);
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const folder = normalizeId(form.get("folder") || "cards");
    if (!(file instanceof File)) return json({ ok: false, error: "Image file is required" }, 400);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return json({ ok: false, error: "Unsupported image type" }, 400);
    }
    if (file.size > 2 * 1024 * 1024) {
      return json({ ok: false, error: "Image is too large" }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return storeUploadedImage(env, url, folder, bytes, file.type);
  }

  const body = await readJson(request);
  const dataUrl = cleanText(body.dataUrl || "", 5000000);
  const folder = normalizeId(body.folder || "cards");
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return json({ ok: false, error: "Invalid image data" }, 400);
  if (!["image/jpeg", "image/png", "image/webp"].includes(decoded.contentType)) {
    return json({ ok: false, error: "Unsupported image type" }, 400);
  }
  if (decoded.bytes.byteLength > 2 * 1024 * 1024) {
    return json({ ok: false, error: "Image is too large" }, 400);
  }

  return storeUploadedImage(env, url, folder, decoded.bytes, decoded.contentType);
}

async function storeUploadedImage(env, url, folder, bytes, contentType) {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });

  return json({
    ok: true,
    key,
    url: `${url.origin}/uploads/${key}`
  });
}

async function getUploadedImage(env, url) {
  if (!env.IMAGES) return new Response("Image storage is not configured", { status: 500 });
  const key = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ""));
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });
  const object = await env.IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(object.body, { headers });
}

async function registerUser(request, env) {
  const body = await readJson(request);
  const now = new Date().toISOString();
  const provider = cleanText(body.provider || "password", 32);
  const displayName = cleanText(body.displayName || body.name || "", 120);
  const email = cleanText(String(body.email || "").toLowerCase(), 180);
  const password = String(body.password || "");
  const providerUserId = cleanText(body.providerUserId || email || crypto.randomUUID(), 160);
  const company = cleanText(body.company || "", 160);
  const jobTitle = cleanText(body.jobTitle || "", 120);
  const phone = cleanText(body.phone || "", 60);
  const lineUserId = provider === "line" ? providerUserId : "";
  const cardTitle = cleanText(body.cardTitle || displayName || company || "My Business Card", 160);
  const baseSlug = slugify(body.slug || displayName || company || email || "member");
  const slug = await uniqueSlug(env, baseSlug);
  const userId = normalizeId(`user-${provider}-${providerUserId}`);
  const memberNo = generateMemberNo(providerUserId || email || userId);
  const cardId = crypto.randomUUID();

  if (!displayName) return json({ ok: false, error: "displayName is required" }, 400);
  if (provider === "password" && !email) return json({ ok: false, error: "email is required" }, 400);
  if (provider === "password" && password.length < 8) {
    return json({ ok: false, error: "password must be at least 8 characters" }, 400);
  }

  const existing = email
    ? await env.DB.prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1").bind(email).first()
    : null;
  if (existing) return json({ ok: false, error: "email already registered" }, 409);

  const account = provider === "password"
    ? await buildPasswordAccount(password)
    : { passwordHash: null, salt: null };

  const defaultButtons = [
    { label: "加入 LINE", url: "https://liff.line.me/2007221311-jwiMeoXT", color: "#06C755" },
    { label: "聯絡我", url: email ? `mailto:${email}` : "", color: "#147d64" },
    { label: "留下需求", url: "#leadForm", color: "#2c5f9e" }
  ];

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (
        id, auth_provider, provider_user_id, display_name, email, member_no, points, role,
        company, job_title, phone, status, plan, line_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, 'owner', ?, ?, ?, 'active', 'free', ?, ?, ?)
    `).bind(userId, provider, providerUserId, displayName, email || null, memberNo, company, jobTitle, phone, lineUserId || null, now, now),
    env.DB.prepare(`
      INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, email, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), userId, provider, providerUserId, email || null, account.passwordHash, account.salt, now),
    env.DB.prepare(`
      INSERT INTO cards (
        id, owner_id, slug, title, description, cover_url, layout, desc_color, desc_align,
        buttons_json, is_published, display_name, company, job_title, phone, email, line_url,
        theme_color, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'landscape', '#61707a', 'center', ?, 1, ?, ?, ?, ?, ?, ?, '#147d64', ?, ?)
    `).bind(
      cardId,
      userId,
      slug,
      cardTitle,
      company ? `${company}｜電子名片` : "我的電子名片",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      JSON.stringify(defaultButtons),
      displayName,
      company,
      jobTitle,
      phone,
      email || null,
      "https://liff.line.me/2007221311-jwiMeoXT",
      now,
      now
    ),
    env.DB.prepare(`
      INSERT INTO admin_records (id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at)
      VALUES (?, 'member', ?, ?, 'done', 'normal', 'user', ?, 'register-api', ?, ?)
    `).bind(
      crypto.randomUUID(),
      `New member registered: ${displayName}`,
      `member_no=${memberNo}, provider=${provider}, slug=${slug}`,
      userId,
      now,
      now
    )
  ]);

  return json({
    ok: true,
    user: {
      id: userId,
      displayName,
      email,
      memberNo,
      points: 0
    },
    card: {
      id: cardId,
      slug,
      url: `/c/${slug}`
    }
  }, 201);
}

async function createLead(request, env) {
  const body = await readJson(request);
  const slug = cleanText(body.slug || DEFAULT_SLUG, 160);
  const card = await findCard(env, slug);
  if (!card) return json({ ok: false, error: "Card not found" }, 404);

  const leadId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO leads (id, card_id, name, contact, message, source, status)
    VALUES (?, ?, ?, ?, ?, ?, 'new')
  `).bind(
    leadId,
    card.id,
    cleanText(body.name || "Guest", 120),
    cleanText(body.contact || "", 180),
    cleanText(body.message || "", 2000),
    cleanText(body.source || "web", 80)
  ).run();

  return json({ ok: true, leadId }, 201);
}

async function logEvent(request, env) {
  const body = await readJson(request);
  const slug = cleanText(body.slug || DEFAULT_SLUG, 160);
  const card = await findCard(env, slug);
  await env.DB.prepare(`
    INSERT INTO events (id, card_id, event_type, source, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    card?.id || null,
    cleanText(body.eventType || body.type || "unknown", 80),
    cleanText(body.source || "web", 80),
    JSON.stringify(body.metadata || {})
  ).run();

  return json({ ok: true }, 201);
}

async function getDashboard(env, slug) {
  const card = await findCard(env, slug);
  if (!card) return json({ ok: false, error: "Card not found" }, 404);

  const [views, clicks, leads, recentLeads] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS count FROM events WHERE card_id = ? AND event_type = 'view'").bind(card.id),
    env.DB.prepare("SELECT COUNT(*) AS count FROM events WHERE card_id = ? AND event_type LIKE 'click:%'").bind(card.id),
    env.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE card_id = ?").bind(card.id),
    env.DB.prepare(`
      SELECT name, contact, message, source, status, created_at
      FROM leads
      WHERE card_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(card.id)
  ]);

  return json({
    ok: true,
    metrics: {
      views: Number(views.results?.[0]?.count || 0),
      clicks: Number(clicks.results?.[0]?.count || 0),
      leads: Number(leads.results?.[0]?.count || 0)
    },
    leads: recentLeads.results || []
  });
}

async function getAdminOverview(env) {
  const [
    userCount,
    cardCount,
    leadCount,
    eventCount,
    pointTotal,
    users,
    cards,
    leads,
    events,
    records,
    memberCrmRecords
  ] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users"),
    env.DB.prepare("SELECT COUNT(*) AS count FROM cards"),
    env.DB.prepare("SELECT COUNT(*) AS count FROM leads"),
    env.DB.prepare("SELECT COUNT(*) AS count FROM events"),
    env.DB.prepare("SELECT COALESCE(SUM(points), 0) AS total FROM users"),
    env.DB.prepare(`
      SELECT u.id, u.member_no, u.display_name, u.email, u.auth_provider, u.provider_user_id,
        u.points, u.role, u.company, u.job_title, u.phone, u.status, u.plan, u.line_user_id,
        u.created_at, u.updated_at,
        COUNT(DISTINCT c.id) AS card_count,
        COUNT(DISTINCT l.id) AS lead_count,
        MAX(aa.last_login_at) AS last_login_at
      FROM users u
      LEFT JOIN cards c ON c.owner_id = u.id
      LEFT JOIN leads l ON l.card_id = c.id
      LEFT JOIN auth_accounts aa ON aa.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 50
    `),
    env.DB.prepare(`
      SELECT c.id, c.slug, c.title, c.layout, c.is_published, c.updated_at,
        c.description, c.cover_url, c.desc_color, c.desc_align, c.buttons_json,
        c.display_name, c.company, c.job_title, c.phone, c.email,
        c.website, c.line_url, c.address, c.theme_color, c.public_note,
        u.member_no, u.display_name AS owner_name,
        COUNT(DISTINCT l.id) AS lead_count,
        COUNT(DISTINCT e.id) AS event_count
      FROM cards c
      JOIN users u ON u.id = c.owner_id
      LEFT JOIN leads l ON l.card_id = c.id
      LEFT JOIN events e ON e.card_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 50
    `),
    env.DB.prepare(`
      SELECT l.id, l.name, l.contact, l.message, l.source, l.status, l.created_at,
        c.slug AS card_slug, c.title AS card_title
      FROM leads l
      JOIN cards c ON c.id = l.card_id
      ORDER BY l.created_at DESC
      LIMIT 50
    `),
    env.DB.prepare(`
      SELECT e.id, e.event_type, e.source, e.metadata_json, e.created_at,
        c.slug AS card_slug
      FROM events e
      LEFT JOIN cards c ON c.id = e.card_id
      ORDER BY e.created_at DESC
      LIMIT 80
    `),
    env.DB.prepare(`
      SELECT id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at
      FROM admin_records
      ORDER BY created_at DESC
      LIMIT 50
    `),
    env.DB.prepare(`
      SELECT r.id, r.user_id, r.related_user_id, r.related_card_id, r.category, r.title, r.body,
        r.status, r.priority, r.next_follow_up_at, r.created_by, r.created_at, r.updated_at,
        u.member_no, u.display_name AS user_name,
        ru.member_no AS related_member_no, ru.display_name AS related_user_name,
        c.slug AS related_card_slug, c.title AS related_card_title
      FROM member_crm_records r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN users ru ON ru.id = r.related_user_id
      LEFT JOIN cards c ON c.id = r.related_card_id
      ORDER BY r.created_at DESC
      LIMIT 80
    `)
  ]);

  return json({
    ok: true,
    totals: {
      users: Number(userCount.results?.[0]?.count || 0),
      cards: Number(cardCount.results?.[0]?.count || 0),
      leads: Number(leadCount.results?.[0]?.count || 0),
      events: Number(eventCount.results?.[0]?.count || 0),
      points: Number(pointTotal.results?.[0]?.total || 0)
    },
    users: users.results || [],
    cards: cards.results || [],
    leads: leads.results || [],
    events: normalizeEvents(events.results || []),
    records: records.results || [],
    memberCrmRecords: memberCrmRecords.results || []
  });
}

async function getAdminRecords(env) {
  const result = await env.DB.prepare(`
    SELECT id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at
    FROM admin_records
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  return json({ ok: true, records: result.results || [] });
}

async function updateAdminUser(request, env, userId) {
  const body = await readJson(request);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!existing) return json({ ok: false, error: "User not found" }, 404);

  await env.DB.prepare(`
    UPDATE users
    SET display_name = ?, email = ?, company = ?, job_title = ?, phone = ?,
      status = ?, plan = ?, role = ?, points = ?, line_user_id = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    cleanText(body.displayName || body.display_name || "", 120),
    cleanText(String(body.email || "").toLowerCase(), 180) || null,
    cleanText(body.company || "", 160),
    cleanText(body.jobTitle || body.job_title || "", 120),
    cleanText(body.phone || "", 60),
    cleanText(body.status || "active", 32),
    cleanText(body.plan || "free", 32),
    cleanText(body.role || "owner", 32),
    Number.isFinite(Number(body.points)) ? Number(body.points) : 0,
    cleanText(body.lineUserId || body.line_user_id || "", 180) || null,
    cleanText(body.notes || "", 3000),
    now,
    userId
  ).run();

  await writeAdminSystemRecord(env, "member", `User updated: ${userId}`, `updated_at=${now}`, userId, now);
  return json({ ok: true, userId });
}

async function updateAdminCard(request, env, cardId) {
  const body = await readJson(request);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id FROM cards WHERE id = ?").bind(cardId).first();
  if (!existing) return json({ ok: false, error: "Card not found" }, 404);

  await env.DB.prepare(`
    UPDATE cards
    SET slug = ?, title = ?, description = ?, display_name = ?, company = ?, job_title = ?,
      phone = ?, email = ?, website = ?, line_url = ?, address = ?, theme_color = ?,
      public_note = ?, cover_url = ?, desc_color = ?, desc_align = ?, buttons_json = ?,
      layout = ?, is_published = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    slugify(body.slug || ""),
    cleanText(body.title || "", 160),
    cleanText(body.description || "", 3000),
    cleanText(body.displayName || body.display_name || "", 160),
    cleanText(body.company || "", 160),
    cleanText(body.jobTitle || body.job_title || "", 120),
    cleanText(body.phone || "", 60),
    cleanText(String(body.email || "").toLowerCase(), 180) || null,
    cleanText(body.website || "", 500),
    cleanText(body.lineUrl || body.line_url || "", 500),
    cleanText(body.address || "", 500),
    cleanText(body.themeColor || body.theme_color || "#147d64", 24),
    cleanText(body.publicNote || body.public_note || "", 3000),
    cleanText(body.coverUrl || body.cover_url || "", 1000),
    cleanText(body.descColor || body.desc_color || "#61707a", 24),
    cleanText(body.descAlign || body.desc_align || "center", 24),
    JSON.stringify({
      buttons: Array.isArray(body.buttons) ? body.buttons.slice(0, 8).map(normalizeButton) : [],
      layoutCards: normalizeLayoutCards(body.layoutCards, {
        title: body.title,
        desc: body.description,
        coverUrl: body.coverUrl || body.cover_url,
        descColor: body.descColor || body.desc_color,
        descAlign: body.descAlign || body.desc_align,
        buttons: Array.isArray(body.buttons) ? body.buttons.slice(0, 8).map(normalizeButton) : []
      })
    }),
    cleanText(body.layout || "landscape", 32),
    body.isPublished === false || body.is_published === 0 || body.is_published === "0" ? 0 : 1,
    now,
    cardId
  ).run();

  await writeAdminSystemRecord(env, "card", `Card updated: ${cardId}`, `updated_at=${now}`, cardId, now);
  return json({ ok: true, cardId });
}

async function writeAdminSystemRecord(env, category, title, body, relatedId, now) {
  await env.DB.prepare(`
    INSERT INTO admin_records (id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'done', 'normal', ?, ?, 'admin-edit', ?, ?)
  `).bind(
    crypto.randomUUID(),
    cleanText(category, 40),
    cleanText(title, 160),
    cleanText(body, 3000),
    cleanText(category, 64),
    cleanText(relatedId, 128),
    now,
    now
  ).run();
}

async function createAdminRecord(request, env) {
  const body = await readJson(request);
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    category: cleanText(body.category || "general", 40),
    title: cleanText(body.title || "Untitled record", 160),
    body: cleanText(body.body || "", 3000),
    status: cleanText(body.status || "open", 32),
    priority: cleanText(body.priority || "normal", 32),
    relatedType: cleanText(body.relatedType || "", 64),
    relatedId: cleanText(body.relatedId || "", 128),
    createdBy: cleanText(body.createdBy || "admin", 80)
  };

  await env.DB.prepare(`
    INSERT INTO admin_records (
      id, category, title, body, status, priority, related_type, related_id, created_by, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.id,
    record.category,
    record.title,
    record.body,
    record.status,
    record.priority,
    record.relatedType || null,
    record.relatedId || null,
    record.createdBy,
    now,
    now
  ).run();

  return json({ ok: true, recordId: record.id }, 201);
}

async function createAdminMemberCrmRecord(request, env) {
  const body = await readJson(request);
  const now = new Date().toISOString();
  const userRef = cleanText(body.userId || body.user_id || body.memberNo || body.member_no || "", 160);
  if (!userRef) return json({ ok: false, error: "user is required" }, 400);

  const user = await env.DB.prepare(`
    SELECT id, member_no
    FROM users
    WHERE id = ? OR member_no = ?
    LIMIT 1
  `).bind(userRef, userRef).first();
  if (!user) return json({ ok: false, error: "User not found" }, 404);

  const relatedUserRef = cleanText(body.relatedUserId || body.related_user_id || body.relatedMemberNo || body.related_member_no || "", 160);
  const relatedUser = relatedUserRef
    ? await env.DB.prepare("SELECT id FROM users WHERE id = ? OR member_no = ? LIMIT 1").bind(relatedUserRef, relatedUserRef).first()
    : null;

  const relatedCardRef = cleanText(body.relatedCardId || body.related_card_id || body.relatedCardSlug || body.related_card_slug || "", 180);
  const relatedCard = relatedCardRef
    ? await env.DB.prepare("SELECT id FROM cards WHERE id = ? OR slug = ? LIMIT 1").bind(relatedCardRef, relatedCardRef).first()
    : null;

  const record = {
    id: crypto.randomUUID(),
    category: cleanText(body.category || "general", 40),
    title: cleanText(body.title || "會員CRM紀錄", 160),
    body: cleanText(body.body || "", 3000),
    status: cleanText(body.status || "open", 32),
    priority: cleanText(body.priority || "normal", 32),
    nextFollowUpAt: cleanText(body.nextFollowUpAt || body.next_follow_up_at || "", 64),
    createdBy: cleanText(body.createdBy || body.created_by || "admin", 80)
  };

  await env.DB.prepare(`
    INSERT INTO member_crm_records (
      id, user_id, related_user_id, related_card_id, category, title, body,
      status, priority, next_follow_up_at, created_by, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.id,
    user.id,
    relatedUser?.id || null,
    relatedCard?.id || null,
    record.category,
    record.title,
    record.body,
    record.status,
    record.priority,
    record.nextFollowUpAt || null,
    record.createdBy,
    now,
    now
  ).run();

  await writeAdminSystemRecord(env, "member", `Member CRM record created: ${user.member_no}`, record.title, user.id, now);
  return json({ ok: true, recordId: record.id }, 201);
}

async function findCard(env, slug) {
  return env.DB.prepare(`
    SELECT c.*, u.display_name AS owner_name, u.email AS owner_email,
      u.member_no AS owner_member_no, u.points AS owner_points
    FROM cards c
    JOIN users u ON u.id = c.owner_id
    WHERE c.slug = ? AND c.is_published = 1
  `).bind(slug).first();
}

function serializeCard(row) {
  const buttonPayload = parseButtonsPayload(row.buttons_json, {
    title: row.title,
    desc: row.description,
    coverUrl: row.cover_url,
    descColor: row.desc_color,
    descAlign: row.desc_align
  });
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerMemberNo: row.owner_member_no,
    ownerPoints: Number(row.owner_points || 0),
    slug: row.slug,
    title: row.title,
    desc: row.description,
    coverUrl: row.cover_url,
    layout: row.layout,
    descColor: row.desc_color,
    descAlign: row.desc_align,
    buttons: buttonPayload.buttons,
    layoutCards: buttonPayload.layoutCards,
    updatedAt: row.updated_at
  };
}

function serializeMemberCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    layout: row.layout,
    isPublished: row.is_published === 1 || row.is_published === true,
    displayName: row.display_name,
    company: row.company,
    jobTitle: row.job_title,
    phone: row.phone,
    email: row.email,
    website: row.website,
    lineUrl: row.line_url,
    address: row.address,
    themeColor: row.theme_color,
    publicNote: row.public_note,
    updatedAt: row.updated_at
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function parseButtonsPayload(value, fallbackCard = {}) {
  const parsed = safeJson(value, []);
  if (Array.isArray(parsed)) {
    const buttons = parsed.slice(0, 8).map(normalizeButton);
    return {
      buttons,
      layoutCards: normalizeLayoutCards(null, { ...fallbackCard, buttons })
    };
  }
  const buttons = Array.isArray(parsed?.buttons) ? parsed.buttons.slice(0, 8).map(normalizeButton) : [];
  return {
    buttons,
    layoutCards: normalizeLayoutCards(parsed?.layoutCards, { ...fallbackCard, buttons })
  };
}

function normalizeLayoutCards(source, fallbackCard = {}) {
  const fallback = normalizeLayoutCardSnapshot(fallbackCard);
  const cards = source && typeof source === "object" ? source : {};
  return {
    landscape: normalizeLayoutCardSnapshot(cards.landscape, fallback),
    portrait: normalizeLayoutCardSnapshot(cards.portrait, fallback),
    square: normalizeLayoutCardSnapshot(cards.square, fallback)
  };
}

function normalizeLayoutCardSnapshot(source, fallback = {}) {
  return {
    title: cleanText(source?.title || fallback.title || "Untitled Card", 160),
    desc: cleanText(source?.desc || source?.description || fallback.desc || "", 3000),
    chatText: cleanText(source?.chatText || source?.chat_text || fallback.chatText || "", 400),
    coverUrl: cleanText(source?.coverUrl || source?.cover_url || fallback.coverUrl || "", 1000),
    coverLink: cleanText(source?.coverLink || source?.cover_link || fallback.coverLink || "", 1000),
    descColor: cleanText(source?.descColor || source?.desc_color || fallback.descColor || "#61707a", 24),
    descAlign: cleanText(source?.descAlign || source?.desc_align || fallback.descAlign || "center", 24),
    buttons: Array.isArray(source?.buttons)
      ? source.buttons.slice(0, 8).map(normalizeButton)
      : cloneNormalizedButtons(fallback.buttons),
    detached: Boolean(source?.detached)
  };
}

function cloneNormalizedButtons(buttons) {
  return Array.isArray(buttons) ? buttons.slice(0, 8).map(normalizeButton) : [];
}

function normalizeButton(button) {
  return {
    label: cleanText(button.label || "Button", 80),
    url: cleanText(button.url || "", 1000),
    color: cleanText(button.color || "#06C755", 24)
  };
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function decodeDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { contentType, bytes };
}

function normalizeId(value) {
  return cleanText(value, 128).replace(/[^a-zA-Z0-9:_-]/g, "-") || crypto.randomUUID();
}

function slugify(value) {
  const slug = cleanText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `card-${Date.now()}`;
}

async function uniqueSlug(env, baseSlug) {
  let slug = baseSlug;
  for (let index = 1; index <= 20; index += 1) {
    const row = await env.DB.prepare("SELECT id FROM cards WHERE slug = ? LIMIT 1").bind(slug).first();
    if (!row) return slug;
    slug = `${baseSlug}-${index + 1}`;
  }
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

async function buildPasswordAccount(password) {
  const salt = crypto.randomUUID();
  const input = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const passwordHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { passwordHash, salt };
}

function generateMemberNo(value) {
  const source = cleanText(value, 128) || crypto.randomUUID();
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `M${String(hash % 1000000).padStart(6, "0")}`;
}

function normalizeEvents(events) {
  return events.map((event) => ({
    ...event,
    metadata: safeJson(event.metadata_json, {}),
    metadata_json: undefined
  }));
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function json(payload, status = 200) {
  return jsonWithHeaders(payload, status);
}

function jsonWithHeaders(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...extraHeaders
    }
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
