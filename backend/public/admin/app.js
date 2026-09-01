/* ============================================================
   Social Media Admin Panel — Super App
   Vanilla JS SPA. Talks to /api/adminpanel.
   ============================================================ */

const API = "/api/adminpanel";
const TOKEN_KEY = "sa_admin_token";
const SESSION_TOKEN_KEY = "sa_admin_session_token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY) || null,
  admin: null,
  route: "dashboard",
  bootstrapMode: false,
  badges: {},
};

/* ------------------------------------------------------------------ */
/* tiny DOM helpers                                                    */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const num = (n) => Number(n || 0).toLocaleString();

const money = (cents) => "$" + (Number(cents || 0) / 100).toFixed(2);

const initials = (name = "?") =>
  String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

const date = (d) => {
  if (!d) return "—";
  const t = new Date(d);
  if (isNaN(t)) return "—";
  return t.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const dateTime = (d) => {
  if (!d) return "—";
  const t = new Date(d);
  if (isNaN(t)) return "—";
  return t.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const ago = (d) => {
  if (!d) return "—";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date(d);
};

// Media paths in the DB are a mix of absolute URLs and server-relative paths.
const mediaUrl = (u) => {
  if (!u || typeof u !== "string") return null;
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("data:")) return u;
  return "/" + u.replace(/^\.?\//, "");
};

const isVideo = (u) => /\.(mp4|mov|m4v|webm|m3u8)(\?|$)/i.test(u || "");

const toast = (msg, kind = "") => {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s";
    setTimeout(() => el.remove(), 250);
  }, 3200);
};

const avatar = (user, cls = "") => {
  const img = mediaUrl(user?.image);
  return img
    ? `<img class="avatar ${cls}" src="${esc(img)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar ${cls}',textContent:'${esc(initials(user?.name))}'}))">`
    : `<div class="avatar ${cls}">${esc(initials(user?.name))}</div>`;
};

const userChip = (user, sub) => {
  if (!user) return `<span class="muted">Unknown</span>`;
  return `<div class="userchip">
    ${avatar(user)}
    <div class="userchip-text">
      <strong>${esc(user.name || "Unnamed")}${user.verifiedBadge ? ' <span class="tick">✔</span>' : ""}</strong>
      <span>${esc(sub ?? user.email ?? "")}</span>
    </div>
  </div>`;
};

/* ------------------------------------------------------------------ */
/* api                                                                 */
/* ------------------------------------------------------------------ */

async function api(path, { method = "GET", body, params } = {}) {
  let url = API + path;
  if (params) {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    ).toString();
    if (q) url += "?" + q;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* non-JSON body */ }

  if (res.status === 401 && state.token) {
    logout();
    throw new Error(data.message || "Session expired — sign in again");
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* modal                                                               */
/* ------------------------------------------------------------------ */

function openModal({ title, body, footer = "", wide = false, onMount }) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modalFoot").innerHTML = footer;
  $("#modalBackdrop .modal").classList.toggle("wide", !!wide);
  $("#modalBackdrop").classList.remove("hidden");
  if (onMount) onMount($("#modalBackdrop"));
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
  $("#modalBody").innerHTML = "";
  $("#modalFoot").innerHTML = "";
}

function confirmAction(message, onYes, { danger = true, confirmLabel = "Confirm" } = {}) {
  openModal({
    title: "Please confirm",
    body: `<p style="margin:0">${esc(message)}</p>`,
    footer: `
      <button class="btn" data-act="cancel">Cancel</button>
      <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="yes">${esc(confirmLabel)}</button>`,
    onMount(root) {
      $('[data-act="cancel"]', root).onclick = closeModal;
      $('[data-act="yes"]', root).onclick = async () => {
        closeModal();
        await onYes();
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* shared renderers                                                    */
/* ------------------------------------------------------------------ */

const loading = () => `<div class="loading"><div class="spinner"></div><span>Loading…</span></div>`;

const empty = (title, sub, icon = "📭") =>
  `<div class="empty"><div class="big">${icon}</div><h4>${esc(title)}</h4><p>${esc(sub || "")}</p></div>`;

function statCard({ label, value, sub, subClass = "", icon = "" }) {
  return `<div class="stat">
    <div class="stat-label">${icon ? `<span>${icon}</span>` : ""}${esc(label)}</div>
    <div class="stat-value">${value}</div>
    ${sub ? `<div class="stat-sub ${subClass}">${sub}</div>` : ""}
  </div>`;
}

function pager(ctx, total) {
  const pages = Math.max(Math.ceil(total / ctx.limit), 1);
  const from = total === 0 ? 0 : (ctx.page - 1) * ctx.limit + 1;
  const to = Math.min(ctx.page * ctx.limit, total);
  return `<div class="pager">
    <span>Showing <strong>${from}–${to}</strong> of <strong>${num(total)}</strong></span>
    <span class="spacer"></span>
    <button class="btn btn-sm" data-page="${ctx.page - 1}" ${ctx.page <= 1 ? "disabled" : ""}>Previous</button>
    <span class="muted">Page ${ctx.page} / ${pages}</span>
    <button class="btn btn-sm" data-page="${ctx.page + 1}" ${ctx.page >= pages ? "disabled" : ""}>Next</button>
  </div>`;
}

function bindPager(root, ctx, reload) {
  $$("[data-page]", root).forEach((b) => {
    b.onclick = () => {
      ctx.page = parseInt(b.dataset.page, 10);
      reload();
    };
  });
}

// Debounced search-box binding
function bindFilters(root, ctx, reload) {
  $$("[data-filter]", root).forEach((el) => {
    const key = el.dataset.filter;
    if (el.tagName === "INPUT" && (el.type === "search" || el.type === "text")) {
      let timer;
      el.oninput = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          ctx[key] = el.value;
          ctx.page = 1;
          reload();
        }, 350);
      };
    } else {
      el.onchange = () => {
        ctx[key] = el.value;
        ctx.page = 1;
        reload();
      };
    }
  });
}

// Minimal dependency-free line chart
function lineChart(series, keys) {
  const w = 720, h = 220, padL = 38, padR = 12, padT = 14, padB = 26;
  const max = Math.max(1, ...series.flatMap((d) => keys.map((k) => d[k.key])));
  const stepX = (w - padL - padR) / Math.max(series.length - 1, 1);
  const y = (v) => padT + (h - padT - padB) * (1 - v / max);

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = Math.round(max * (1 - f));
    const yy = padT + (h - padT - padB) * f;
    return `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="#e3e8f0" stroke-width="1"/>
            <text x="${padL - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#8792a8">${val}</text>`;
  }).join("");

  const paths = keys.map((k) => {
    const pts = series.map((d, i) => `${padL + i * stepX},${y(d[k.key])}`);
    const area = `M ${padL},${h - padB} L ${pts.join(" L ")} L ${padL + (series.length - 1) * stepX},${h - padB} Z`;
    return `<path d="${area}" fill="${k.color}" opacity=".1"/>
            <polyline points="${pts.join(" ")}" fill="none" stroke="${k.color}" stroke-width="2"
                      stroke-linejoin="round" stroke-linecap="round"/>
            ${series.map((d, i) => `<circle cx="${padL + i * stepX}" cy="${y(d[k.key])}" r="2.5" fill="${k.color}"><title>${d.date}: ${d[k.key]} ${k.label}</title></circle>`).join("")}`;
  }).join("");

  const labels = series.map((d, i) =>
    i % 2 === 0
      ? `<text x="${padL + i * stepX}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#8792a8">${d.date.slice(5)}</text>`
      : ""
  ).join("");

  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${gridY}${paths}${labels}</svg>
    <div class="chart-legend">${keys.map((k) => `<span><i style="background:${k.color}"></i>${esc(k.label)}</span>`).join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* navigation                                                          */
/* ------------------------------------------------------------------ */

const NAV = [
  { group: "Overview" },
  { id: "dashboard", icon: "📊", label: "Dashboard", title: "Dashboard", sub: "Overview of the social media module" },

  { group: "Community" },
  { id: "users", icon: "👥", label: "Users", title: "Users", sub: "Manage all accounts, ban & suspend" },
  { id: "verifications", icon: "✔️", label: "Verification", title: "Verification Requests", sub: "Approve the blue tick", badge: "pendingVerification" },
  { id: "groups", icon: "🏘️", label: "Groups", title: "Groups & Community", sub: "Public and private groups" },

  { group: "Content" },
  { id: "content", icon: "🖼️", label: "Posts & Reels", title: "Content Moderation", sub: "Posts, reels and stories" },
  { id: "comments", icon: "💬", label: "Comments", title: "Comments", sub: "Moderate comments across all content" },
  { id: "live", icon: "🔴", label: "Live Streams", title: "Live Streaming", sub: "Active and past broadcasts" },
  { id: "hashtags", icon: "#️⃣", label: "Hashtags & Trending", title: "Hashtags & Trending", sub: "Curate what trends in the app" },
  { id: "music", icon: "🎵", label: "Music Library", title: "Music Library", sub: "Tracks available for reels and stories" },

  { group: "Safety" },
  { id: "reports", icon: "🚩", label: "Reports", title: "Reports Queue", sub: "Reported users, posts and comments", badge: "pendingReports" },
  { id: "support", icon: "🎧", label: "Support Tickets", title: "Support Tickets", sub: "User-submitted issues", badge: "openTickets" },

  { group: "Growth" },
  { id: "monetisation", icon: "💰", label: "Monetisation", title: "Monetisation", sub: "Coins, gifts and revenue" },
  { id: "promos", icon: "📣", label: "Ads & Promotions", title: "Ads & Promotions", sub: "Promo codes and campaigns" },
  { id: "notifications", icon: "🔔", label: "Notifications", title: "Push Notifications", sub: "Broadcast to the app" },
  { id: "messaging", icon: "✉️", label: "Messaging", title: "Messaging Overview", sub: "Conversation volume (read-only)" },

  { group: "System" },
  { id: "categories", icon: "🗂️", label: "Categories", title: "Categories", sub: "Content categories" },
  { id: "admins", icon: "🔐", label: "Admin Users", title: "Admin Users", sub: "Who can access this panel" },
];

function renderNav() {
  $("#nav").innerHTML = NAV.map((n) => {
    if (n.group) return `<div class="nav-group">${esc(n.group)}</div>`;
    const badgeVal = n.badge ? state.badges[n.badge] : 0;
    return `<button class="nav-item ${state.route === n.id ? "active" : ""}" data-route="${n.id}">
      <span class="ico">${n.icon}</span>
      <span>${esc(n.label)}</span>
      ${badgeVal ? `<span class="nav-badge">${badgeVal > 99 ? "99+" : badgeVal}</span>` : ""}
    </button>`;
  }).join("");

  $$("[data-route]", $("#nav")).forEach((b) => {
    b.onclick = () => {
      go(b.dataset.route);
      $("#sidebar").classList.remove("open");
    };
  });
}

function go(route) {
  state.route = route;
  location.hash = route;
  const meta = NAV.find((n) => n.id === route) || NAV[1];
  $("#pageTitle").textContent = meta.title;
  $("#pageSubtitle").textContent = meta.sub;
  $("#topbarActions").innerHTML = "";
  renderNav();
  (VIEWS[route] || VIEWS.dashboard)();
}

/* ------------------------------------------------------------------ */
/* views                                                               */
/* ------------------------------------------------------------------ */

const view = () => $("#view");

const VIEWS = {};

/* ---------- dashboard ---------- */

VIEWS.dashboard = async () => {
  view().innerHTML = loading();
  $("#topbarActions").innerHTML = `<button class="btn btn-sm" id="refreshBtn">↻ Refresh</button>`;
  $("#refreshBtn").onclick = () => VIEWS.dashboard();

  try {
    const d = await api("/dashboard");
    const s = d.stats;

    state.badges = {
      pendingReports: s.pendingReports,
      pendingVerification: s.pendingVerification,
      openTickets: s.openTickets,
    };
    renderNav();

    const engagementRate = s.totalContent
      ? (((s.likes + s.comments) / s.totalContent)).toFixed(1)
      : "0";

    view().innerHTML = `
      <div class="grid stat-grid" style="margin-bottom:16px">
        ${statCard({ label: "Total users", value: num(s.totalUsers), sub: `+${num(s.newUsers24h)} in last 24h`, subClass: s.newUsers24h ? "up" : "", icon: "👥" })}
        ${statCard({ label: "Content items", value: num(s.totalContent), sub: `+${num(s.contentToday)} today`, subClass: s.contentToday ? "up" : "", icon: "🖼️" })}
        ${statCard({ label: "Live now", value: num(s.liveNow), sub: `${num(s.liveTotal)} streams all-time`, icon: "🔴" })}
        ${statCard({ label: "Engagement", value: num(s.likes + s.comments), sub: `${engagementRate} avg per post`, icon: "❤️" })}
        ${statCard({ label: "Coins in circulation", value: num(s.coinsInCirculation), sub: `${num(s.giftCoins)} gifted`, icon: "🪙" })}
        ${statCard({ label: "Revenue", value: money(s.revenueAmount), sub: `${num(s.revenueCount)} purchases`, icon: "💳" })}
        ${statCard({ label: "Needs attention", value: num(s.pendingReports + s.pendingVerification + s.openTickets), sub: `${s.pendingReports} reports · ${s.pendingVerification} verifications · ${s.openTickets} tickets`, subClass: s.pendingReports ? "down" : "", icon: "🚩" })}
        ${statCard({ label: "Restricted accounts", value: num(s.suspended + s.banned), sub: `${s.suspended} suspended · ${s.banned} banned`, icon: "🚫" })}
      </div>

      <div class="grid cols-2" style="margin-bottom:16px">
        <div class="card">
          <div class="card-head"><div><h3>Growth — last 14 days</h3><p>New signups vs new content</p></div></div>
          <div class="card-body">${lineChart(d.series, [
            { key: "users", label: "New users", color: "#5b5bd6" },
            { key: "content", label: "New content", color: "#12a150" },
          ])}</div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Content breakdown</h3><p>By post type</p></div></div>
          <div class="card-body">
            ${[
              { label: "Reels", value: s.reels, color: "#5b5bd6" },
              { label: "Posts", value: s.posts, color: "#1570cf" },
              { label: "Stories", value: s.stories, color: "#7839ee" },
              { label: "Other / untyped", value: Math.max(s.totalContent - s.reels - s.posts - s.stories, 0), color: "#8792a8" },
            ].map((r) => `
              <div class="bar-row" style="grid-template-columns:1fr">
                <div style="display:flex;justify-content:space-between;font-size:13px">
                  <span>${r.label}</span><strong>${num(r.value)}</strong>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:${s.totalContent ? (r.value / s.totalContent * 100) : 0}%;background:${r.color}"></div></div>
              </div>`).join("")}

            <div class="section-title">Interactions</div>
            <div class="grid" style="grid-template-columns:repeat(2,1fr);gap:10px;font-size:13px">
              <div>❤️ Likes <strong>${num(s.likes)}</strong></div>
              <div>💬 Comments <strong>${num(s.comments)}</strong></div>
              <div>🔁 Shares <strong>${num(s.shares)}</strong></div>
              <div>🔖 Saves <strong>${num(s.saves)}</strong></div>
              <div>✉️ Messages <strong>${num(s.messages)}</strong></div>
              <div>🏘️ Groups <strong>${num(s.groups)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><div><h3>Top creators</h3><p>By engagement received</p></div></div>
          <div class="table-wrap">
            ${d.topCreators.length ? `<table>
              <thead><tr><th>Creator</th><th class="num">Posts</th><th class="num">Likes</th><th class="num">Followers</th></tr></thead>
              <tbody>${d.topCreators.map((c) => `<tr>
                <td>${userChip({ name: c.name, image: c.image, email: c.email })}</td>
                <td class="num">${num(c.posts)}</td>
                <td class="num">${num(c.likes)}</td>
                <td class="num">${num(c.followers)}</td>
              </tr>`).join("")}</tbody></table>` : empty("No creators yet", "Content posted from the app will show up here", "🌱")}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Newest members</h3><p>Latest signups</p></div>
            <span class="spacer"></span>
            <button class="btn btn-sm" data-goto="users">View all</button>
          </div>
          <div class="table-wrap">
            ${d.recentUsers.length ? `<table>
              <thead><tr><th>User</th><th>Status</th><th class="nowrap">Joined</th></tr></thead>
              <tbody>${d.recentUsers.map((u) => `<tr>
                <td>${userChip(u)}</td>
                <td>${statusBadge(u.accountStatus)}</td>
                <td class="nowrap muted">${ago(u.enteredby)}</td>
              </tr>`).join("")}</tbody></table>` : empty("No users yet", "Sign someone up from the mobile app", "👋")}
          </div>
        </div>
      </div>`;

    $$("[data-goto]").forEach((b) => (b.onclick = () => go(b.dataset.goto)));
  } catch (e) {
    view().innerHTML = empty("Could not load the dashboard", e.message, "⚠️");
  }
};

const statusBadge = (s) => {
  const map = {
    active: ["green", "Active"],
    suspended: ["amber", "Suspended"],
    banned: ["red", "Banned"],
  };
  const [cls, label] = map[s] || map.active;
  return `<span class="badge ${cls}">${label}</span>`;
};

/* ---------- users ---------- */

VIEWS.users = () => {
  const ctx = { page: 1, limit: 20, q: "", status: "", verified: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/users", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr>
                <th>User</th><th>Status</th><th>Type</th>
                <th class="num">Followers</th><th class="num">Coins</th>
                <th class="nowrap">Joined</th><th></th>
              </tr></thead>
              <tbody>${d.rows.map((u) => `<tr>
                <td>${userChip(u)}</td>
                <td>${statusBadge(u.accountStatus)}</td>
                <td><span class="badge ${u.accountType === "personal" || !u.accountType ? "" : "violet"}">${esc(u.accountType || "personal")}</span></td>
                <td class="num">${num(u.followers)}</td>
                <td class="num">${num(u.coins)}</td>
                <td class="nowrap muted">${date(u.enteredby)}</td>
                <td><div class="cell-actions">
                  <button class="btn btn-sm" data-open="${u._id}">Open</button>
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("No users found", "Try clearing the filters", "🔍")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-open]").forEach((b) => (b.onclick = () => openUser(b.dataset.open, load)));
    } catch (e) {
      view().innerHTML = shell(empty("Could not load users", e.message, "⚠️"));
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <input type="search" placeholder="Search name, email or phone…" data-filter="q" value="${esc(ctx.q)}" />
      <select data-filter="status">
        <option value="">All statuses</option>
        <option value="active" ${ctx.status === "active" ? "selected" : ""}>Active</option>
        <option value="suspended" ${ctx.status === "suspended" ? "selected" : ""}>Suspended</option>
        <option value="banned" ${ctx.status === "banned" ? "selected" : ""}>Banned</option>
      </select>
      <select data-filter="verified">
        <option value="">Any badge</option>
        <option value="yes" ${ctx.verified === "yes" ? "selected" : ""}>Verified only</option>
        <option value="no" ${ctx.verified === "no" ? "selected" : ""}>Not verified</option>
      </select>
    </div>
    ${inner}`;

  load();
};

async function openUser(id, reload) {
  openModal({ title: "User", body: loading(), wide: true });
  try {
    const { user: u, stats, recentContent } = await api(`/users/${id}`);

    openModal({
      title: u.name || "User",
      wide: true,
      body: `
        <div style="display:flex;gap:16px;align-items:center">
          ${avatar(u, "lg")}
          <div style="min-width:0">
            <div style="font-size:17px;font-weight:600">
              ${esc(u.name || "Unnamed")} ${u.verifiedBadge ? '<span class="tick">✔</span>' : ""}
            </div>
            <div class="muted">${esc(u.email || "")}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              ${statusBadge(u.accountStatus)}
              <span class="badge">${esc(u.accountType || "personal")}</span>
              <span class="badge ${u.privacy === "private" ? "amber" : ""}">${esc(u.privacy || "public")} profile</span>
              ${u.regby ? `<span class="badge blue">${esc(u.regby)}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">
          ${[
            ["Followers", num(u.followersCount)],
            ["Following", num(u.followingCount)],
            ["Content", num(stats.contentCount)],
            ["Coins", num(u.coins)],
            ["Gifts received", num(stats.giftCoinsReceived)],
            ["Reports", num(stats.reportsAgainst)],
          ].map(([l, v]) => `<div class="stat" style="padding:12px 14px"><div class="stat-label">${l}</div><div class="stat-value" style="font-size:19px">${v}</div></div>`).join("")}
        </div>

        <div>
          <div class="section-title">Profile</div>
          <dl class="kv">
            <dt>Phone</dt><dd>${esc(u.mobileno || "—")}</dd>
            <dt>Gender</dt><dd>${esc(u.gender || "—")}</dd>
            <dt>Birthday</dt><dd>${esc(u.dateofbirth || "—")}</dd>
            <dt>Bio</dt><dd>${esc(u.bio || "—")}</dd>
            <dt>Interests</dt><dd>${esc(u.interest || "—")}</dd>
            <dt>Joined</dt><dd>${dateTime(u.enteredby)}</dd>
            ${u.suspendedUntil ? `<dt>Suspended until</dt><dd>${dateTime(u.suspendedUntil)}</dd>` : ""}
            ${u.moderationNote ? `<dt>Moderator note</dt><dd>${esc(u.moderationNote)}</dd>` : ""}
          </dl>
        </div>

        <div>
          <div class="section-title">Admin actions</div>
          <div class="form-row">
            <label class="field"><span>Verified badge (blue tick)</span>
              <select id="uVerified">
                <option value="false" ${!u.verifiedBadge ? "selected" : ""}>Not verified</option>
                <option value="true" ${u.verifiedBadge ? "selected" : ""}>Verified</option>
              </select>
            </label>
            <label class="field"><span>Account type</span>
              <select id="uType">
                ${["personal", "creator", "business"].map((t) => `<option value="${t}" ${u.accountType === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
            <label class="field"><span>Profile privacy</span>
              <select id="uPrivacy">
                ${["public", "private"].map((t) => `<option value="${t}" ${u.privacy === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
            <label class="field"><span>Adjust coins (+ / −)</span>
              <div style="display:flex;gap:8px">
                <input type="number" id="uCoins" placeholder="e.g. 100 or -50" />
                <button class="btn" id="uCoinsBtn">Apply</button>
              </div>
            </label>
          </div>
          <label class="field" style="margin-top:12px"><span>Moderation note</span>
            <input type="text" id="uNote" value="${esc(u.moderationNote || "")}" placeholder="Reason for the action…" />
          </label>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn" id="actActivate">Reactivate</button>
            <button class="btn" id="actSuspend">Suspend 7 days</button>
            <button class="btn btn-danger" id="actBan">Ban account</button>
          </div>
        </div>

        ${recentContent.length ? `<div>
          <div class="section-title">Recent content</div>
          <div class="media-grid">${recentContent.slice(0, 6).map(mediaCard).join("")}</div>
        </div>` : ""}`,
      footer: `
        <button class="btn btn-danger" id="uDelete">Delete user</button>
        <span style="flex:1"></span>
        <button class="btn" id="uClose">Close</button>
        <button class="btn btn-primary" id="uSave">Save changes</button>`,
      onMount(root) {
        $("#uClose", root).onclick = closeModal;

        $("#uSave", root).onclick = async () => {
          try {
            await api(`/users/${id}`, {
              method: "PUT",
              body: {
                verifiedBadge: $("#uVerified", root).value === "true",
                accountType: $("#uType", root).value,
                privacy: $("#uPrivacy", root).value,
              },
            });
            toast("User updated", "ok");
            closeModal();
            reload?.();
          } catch (e) { toast(e.message, "err"); }
        };

        $("#uCoinsBtn", root).onclick = async () => {
          const amount = parseInt($("#uCoins", root).value, 10);
          if (!amount) return toast("Enter a non-zero amount", "err");
          try {
            const r = await api(`/users/${id}/coins`, { method: "POST", body: { amount } });
            toast(`Balance is now ${num(r.coins)} coins`, "ok");
            $("#uCoins", root).value = "";
          } catch (e) { toast(e.message, "err"); }
        };

        const moderate = async (action, days) => {
          try {
            await api(`/users/${id}/moderate`, {
              method: "POST",
              body: { action, days, note: $("#uNote", root).value },
            });
            toast(`Account ${action === "activate" ? "reactivated" : action + "ned"}`, "ok");
            closeModal();
            reload?.();
          } catch (e) { toast(e.message, "err"); }
        };

        $("#actActivate", root).onclick = () => moderate("activate");
        $("#actSuspend", root).onclick = () => moderate("suspend", 7);
        $("#actBan", root).onclick = () =>
          confirmAction(`Ban ${u.name || "this user"}? They will lose access to the app.`, () => moderate("ban"), { confirmLabel: "Ban account" });

        $("#uDelete", root).onclick = () =>
          confirmAction(`Permanently delete ${u.name || "this user"}? This cannot be undone.`, async () => {
            try {
              await api(`/users/${id}`, { method: "DELETE" });
              toast("User deleted", "ok");
              closeModal();
              reload?.();
            } catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete user" });
      },
    });
  } catch (e) {
    openModal({ title: "User", body: empty("Could not load this user", e.message, "⚠️") });
  }
}

/* ---------- content moderation ---------- */

function mediaCard(c, selectable = false) {
  const url = mediaUrl(c.media);
  const thumb = !url
    ? `<div class="placeholder">${c.posttype?.toLowerCase() === "story" ? "📖" : "📝"}</div>`
    : isVideo(url)
      ? `<video src="${esc(url)}" muted preload="metadata"></video>`
      : `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'🖼️'}))">`;

  return `<div class="media-card" data-card="${c._id}">
    <div class="media-thumb">
      ${thumb}
      <span class="type-tag">${esc(c.posttype || "post")}</span>
      ${c.status === "hidden" ? `<span class="hidden-tag">Hidden</span>` : ""}
      ${selectable ? `<input type="checkbox" class="media-select" data-select="${c._id}" title="Select">` : ""}
    </div>
    <div class="media-body">
      <div class="media-title">${esc(c.title || "(no caption)")}</div>
      <div class="userchip" style="gap:7px">
        ${avatar(c.user)}
        <div class="userchip-text">
          <strong style="font-size:12.5px">${esc(c.user?.name || "Unknown")}</strong>
          <span>${ago(c.createdAt)}</span>
        </div>
      </div>
      <div class="media-metrics">
        <span>❤️ ${num(c.likes)}</span><span>💬 ${num(c.comments)}</span>
        <span>🔁 ${num(c.shares)}</span><span>🔖 ${num(c.saves)}</span>
      </div>
    </div>
    <div class="media-foot">
      <button class="btn btn-sm" data-view="${c._id}">Review</button>
      <button class="btn btn-sm" data-toggle="${c._id}" data-status="${esc(c.status)}">${c.status === "hidden" ? "Unhide" : "Hide"}</button>
    </div>
  </div>`;
}

VIEWS.content = () => {
  const ctx = { page: 1, limit: 24, type: "", q: "", status: "", publishState: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/content", { params: ctx });
      view().innerHTML = shell(
        d.rows.length
          ? `<div class="media-grid">${d.rows.map((c) => mediaCard(c, true)).join("")}</div>
             <div class="card" style="margin-top:16px">${pager(ctx, d.total)}</div>`
          : `<div class="card">${empty("No content found", "Nothing matches these filters yet", "🖼️")}</div>`
      );

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);

      $$("[data-tab]").forEach((b) => (b.onclick = () => { ctx.type = b.dataset.tab; ctx.page = 1; load(); }));
      $$("[data-view]").forEach((b) => (b.onclick = () => openContent(b.dataset.view, load)));
      $$("[data-toggle]").forEach((b) => (b.onclick = async () => {
        try {
          await api(`/content/${b.dataset.toggle}/moderate`, {
            method: "POST",
            body: { action: b.dataset.status === "hidden" ? "unhide" : "hide" },
          });
          toast(b.dataset.status === "hidden" ? "Content is visible again" : "Content hidden from the app", "ok");
          load();
        } catch (e) { toast(e.message, "err"); }
      }));

      const selected = () => $$("[data-select]:checked").map((c) => c.dataset.select);
      const bulk = async (action, message) => {
        const ids = selected();
        if (!ids.length) return toast("Select some content first", "err");
        const run = async () => {
          try {
            const r = await api("/content/bulk", { method: "POST", body: { ids, action } });
            toast(`${r.affected} item(s) updated`, "ok");
            load();
          } catch (e) { toast(e.message, "err"); }
        };
        action === "delete" ? confirmAction(`${message} ${ids.length} item(s)?`, run, { confirmLabel: "Delete" }) : run();
      };

      $("#bulkHide").onclick = () => bulk("hide");
      $("#bulkUnhide").onclick = () => bulk("unhide");
      $("#bulkDelete").onclick = () => bulk("delete", "Permanently delete");
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load content", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <div class="tabs">
        ${[["", "All"], ["post", "Posts"], ["reel", "Reels"], ["story", "Stories"]].map(
          ([v, l]) => `<button class="tab ${ctx.type === v ? "active" : ""}" data-tab="${v}">${l}</button>`
        ).join("")}
      </div>
      <input type="search" placeholder="Search captions…" data-filter="q" value="${esc(ctx.q)}" />
      <select data-filter="status">
        <option value="">All visibility</option>
        <option value="visible" ${ctx.status === "visible" ? "selected" : ""}>Visible</option>
        <option value="hidden" ${ctx.status === "hidden" ? "selected" : ""}>Hidden</option>
      </select>
      <select data-filter="publishState">
        <option value="">Draft &amp; published</option>
        <option value="Publish" ${ctx.publishState === "Publish" ? "selected" : ""}>Published</option>
        <option value="Draft" ${ctx.publishState === "Draft" ? "selected" : ""}>Draft</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-sm" id="bulkHide">Hide selected</button>
      <button class="btn btn-sm" id="bulkUnhide">Unhide</button>
      <button class="btn btn-sm btn-danger" id="bulkDelete">Delete</button>
    </div>
    ${inner}`;

  load();
};

async function openContent(id, reload) {
  openModal({ title: "Review content", body: loading(), wide: true });
  try {
    const { content: c, comments, reports } = await api(`/content/${id}`);
    const url = mediaUrl(c.media);

    openModal({
      title: c.title ? c.title.slice(0, 60) : "Content",
      wide: true,
      body: `
        <div style="display:grid;grid-template-columns:220px 1fr;gap:20px" class="review-grid">
          <div class="media-thumb" style="border-radius:10px">
            ${!url ? `<div class="placeholder">📝</div>`
              : isVideo(url) ? `<video src="${esc(url)}" controls></video>`
              : `<img src="${esc(url)}" alt="">`}
          </div>
          <div>
            ${userChip(c.user)}
            <p style="margin:12px 0;white-space:pre-wrap">${esc(c.title || "(no caption)")}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
              <span class="badge violet">${esc(c.posttype || "post")}</span>
              ${c.posttypechild ? `<span class="badge">${esc(c.posttypechild)}</span>` : ""}
              <span class="badge ${c.status === "hidden" ? "red" : "green"}">${c.status === "hidden" ? "Hidden" : "Visible"}</span>
              <span class="badge ${c.publishState === "Draft" ? "amber" : "blue"}">${esc(c.publishState)}</span>
              ${c.location ? `<span class="badge">📍 ${esc(c.location)}</span>` : ""}
            </div>
            <dl class="kv">
              <dt>Posted</dt><dd>${dateTime(c.createdAt)}</dd>
              <dt>Engagement</dt><dd>❤️ ${num(c.likes)} · 💬 ${num(c.comments)} · 🔁 ${num(c.shares)} · 🔖 ${num(c.saves)}</dd>
              <dt>Media URL</dt><dd class="muted" style="font-size:12px">${esc(url || "none")}</dd>
            </dl>
          </div>
        </div>

        ${reports.length ? `<div>
          <div class="section-title">⚠️ ${reports.length} report(s) on this content</div>
          ${reports.map((r) => `<div class="card" style="padding:10px 12px;margin-bottom:8px">
            <strong>${esc(r.reason || "No reason given")}</strong>
            <div class="muted" style="font-size:12.5px">by ${esc(r.reporter?.name || "unknown")} · ${ago(r.createdAt)} · ${esc(r.status)}</div>
          </div>`).join("")}
        </div>` : ""}

        <div>
          <div class="section-title">Comments (${comments.length})</div>
          ${comments.length ? comments.slice(0, 25).map((cm) => `
            <div class="comment-row" style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
              ${avatar(cm.user)}
              <div style="flex:1;min-width:0">
                <strong style="font-size:13px">${esc(cm.user?.name || "Unknown")}</strong>
                <span class="muted" style="font-size:12px"> · ${ago(cm.createdAt)}</span>
                <div>${esc(cm.message)}</div>
                <div class="muted" style="font-size:12px">❤️ ${cm.likes} · ${cm.replies} replies</div>
              </div>
              <button class="btn btn-sm btn-danger" data-delcom="${cm._id}">Delete</button>
            </div>`).join("")
            : `<p class="muted" style="margin:0">No comments yet.</p>`}
        </div>`,
      footer: `
        <button class="btn btn-danger" id="cDelete">Delete content</button>
        <span style="flex:1"></span>
        <button class="btn" id="cPublish">${c.publishState === "Draft" ? "Publish" : "Unpublish"}</button>
        <button class="btn" id="cHide">${c.status === "hidden" ? "Unhide" : "Hide"}</button>
        <button class="btn btn-primary" id="cClose">Done</button>`,
      onMount(root) {
        $("#cClose", root).onclick = () => { closeModal(); reload?.(); };

        const act = async (action) => {
          try {
            await api(`/content/${id}/moderate`, { method: "POST", body: { action } });
            toast("Content updated", "ok");
            closeModal();
            reload?.();
          } catch (e) { toast(e.message, "err"); }
        };

        $("#cHide", root).onclick = () => act(c.status === "hidden" ? "unhide" : "hide");
        $("#cPublish", root).onclick = () => act(c.publishState === "Draft" ? "publish" : "unpublish");

        $("#cDelete", root).onclick = () =>
          confirmAction("Permanently delete this content?", async () => {
            try {
              await api(`/content/${id}`, { method: "DELETE" });
              toast("Content deleted", "ok");
              closeModal();
              reload?.();
            } catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete" });

        $$("[data-delcom]", root).forEach((b) => (b.onclick = async () => {
          try {
            await api(`/comments/${id}/${b.dataset.delcom}`, { method: "DELETE" });
            toast("Comment deleted", "ok");
            b.closest(".comment-row")?.remove();
          } catch (e) { toast(e.message, "err"); }
        }));
      },
    });
  } catch (e) {
    openModal({ title: "Content", body: empty("Could not load this content", e.message, "⚠️") });
  }
}

/* ---------- comments ---------- */

VIEWS.comments = () => {
  const ctx = { page: 1, limit: 25, q: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/comments", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Author</th><th>Comment</th><th>On</th><th class="num">❤️</th><th class="nowrap">When</th><th></th></tr></thead>
              <tbody>${d.rows.map((c) => `<tr>
                <td>${userChip(c.user, "")}</td>
                <td><div class="truncate">${esc(c.message)}</div></td>
                <td><div class="truncate" style="max-width:180px">
                  <span class="badge">${esc(c.posttype || "post")}</span> ${esc(c.contentTitle || "(no caption)")}
                </div></td>
                <td class="num">${num(c.likes)}</td>
                <td class="nowrap muted">${ago(c.createdAt)}</td>
                <td><div class="cell-actions">
                  <button class="btn btn-sm" data-open="${c.contentId}">View post</button>
                  <button class="btn btn-sm btn-danger" data-del="${c.contentId}|${c.commentId}">Delete</button>
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("No comments", "Nothing matches this search", "💬")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-open]").forEach((b) => (b.onclick = () => openContent(b.dataset.open, load)));
      $$("[data-del]").forEach((b) => (b.onclick = () => {
        const [contentId, commentId] = b.dataset.del.split("|");
        confirmAction("Delete this comment?", async () => {
          try {
            await api(`/comments/${contentId}/${commentId}`, { method: "DELETE" });
            toast("Comment deleted", "ok");
            load();
          } catch (e) { toast(e.message, "err"); }
        }, { confirmLabel: "Delete" });
      }));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load comments", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <input type="search" placeholder="Search comment text…" data-filter="q" value="${esc(ctx.q)}" />
    </div>${inner}`;

  load();
};

/* ---------- reports ---------- */

VIEWS.reports = () => {
  const ctx = { page: 1, limit: 20, status: "pending", targetType: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/reports", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Reported</th><th>Type</th><th>Reason</th><th>Reporter</th><th>Status</th><th class="nowrap">When</th><th></th></tr></thead>
              <tbody>${d.rows.map((r) => `<tr>
                <td>${r.targetUser ? userChip(r.targetUser) : `<span class="muted">${esc(String(r.targetId).slice(-8))}</span>`}</td>
                <td><span class="badge violet">${esc(r.targetType)}</span></td>
                <td><div class="truncate">${esc(r.reason || "—")}${r.details ? `<div class="muted" style="font-size:12px">${esc(r.details)}</div>` : ""}</div></td>
                <td>${r.reporter ? userChip(r.reporter, "") : `<span class="muted">Anonymous</span>`}</td>
                <td>${reportBadge(r.status)}</td>
                <td class="nowrap muted">${ago(r.createdAt)}</td>
                <td><div class="cell-actions">
                  ${r.targetType !== "user" ? `<button class="btn btn-sm" data-content="${r.targetId}">View</button>` : ""}
                  <button class="btn btn-sm btn-primary" data-resolve="${r._id}">Action</button>
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("Queue is clear", "No reports match this filter", "✅")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-tab]").forEach((b) => (b.onclick = () => { ctx.status = b.dataset.tab; ctx.page = 1; load(); }));
      $$("[data-content]").forEach((b) => (b.onclick = () => openContent(b.dataset.content, load)));
      $$("[data-resolve]").forEach((b) => (b.onclick = () => {
        const r = d.rows.find((x) => x._id === b.dataset.resolve);
        openResolve(r, load);
      }));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load reports", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <div class="tabs">
        ${[["pending", "Pending"], ["reviewing", "Reviewing"], ["resolved", "Resolved"], ["dismissed", "Dismissed"], ["", "All"]].map(
          ([v, l]) => `<button class="tab ${ctx.status === v ? "active" : ""}" data-tab="${v}">${l}</button>`
        ).join("")}
      </div>
      <select data-filter="targetType">
        <option value="">All target types</option>
        ${["post", "reel", "story", "comment", "user", "group", "livestream", "message"].map(
          (t) => `<option value="${t}" ${ctx.targetType === t ? "selected" : ""}>${t}</option>`
        ).join("")}
      </select>
    </div>${inner}`;

  load();
};

const reportBadge = (s) => {
  const map = { pending: ["amber", "Pending"], reviewing: ["blue", "Reviewing"], resolved: ["green", "Resolved"], dismissed: ["", "Dismissed"] };
  const [cls, label] = map[s] || ["", s];
  return `<span class="badge ${cls}">${label}</span>`;
};

function openResolve(r, reload) {
  openModal({
    title: "Take action on report",
    body: `
      <dl class="kv">
        <dt>Target</dt><dd>${esc(r.targetType)} · ${esc(r.targetUser?.name || String(r.targetId))}</dd>
        <dt>Reason</dt><dd>${esc(r.reason || "—")}</dd>
        <dt>Details</dt><dd>${esc(r.details || "—")}</dd>
        <dt>Reported</dt><dd>${dateTime(r.createdAt)}</dd>
      </dl>
      <label class="field"><span>Outcome</span>
        <select id="rStatus">
          <option value="resolved">Resolved</option>
          <option value="reviewing">Still reviewing</option>
          <option value="dismissed">Dismiss — no violation</option>
        </select>
      </label>
      <label class="field"><span>Action to apply</span>
        <select id="rAction">
          <option value="none">No action</option>
          <option value="content_hidden">Hide the content</option>
          <option value="content_deleted">Delete the content</option>
          <option value="user_warned">Warn the user</option>
          <option value="user_suspended">Suspend the user (7 days)</option>
          <option value="user_banned">Ban the user</option>
        </select>
      </label>
      <label class="field"><span>Admin note</span>
        <textarea id="rNote" placeholder="Internal note about this decision…">${esc(r.adminNote || "")}</textarea>
      </label>`,
    footer: `
      <button class="btn btn-danger" id="rDelete">Delete report</button>
      <span style="flex:1"></span>
      <button class="btn" id="rCancel">Cancel</button>
      <button class="btn btn-primary" id="rSave">Apply</button>`,
    onMount(root) {
      $("#rCancel", root).onclick = closeModal;
      $("#rSave", root).onclick = async () => {
        try {
          await api(`/reports/${r._id}/resolve`, {
            method: "POST",
            body: {
              status: $("#rStatus", root).value,
              actionTaken: $("#rAction", root).value,
              adminNote: $("#rNote", root).value,
            },
          });
          toast("Report actioned", "ok");
          closeModal();
          reload();
        } catch (e) { toast(e.message, "err"); }
      };
      $("#rDelete", root).onclick = () =>
        confirmAction("Delete this report from the queue?", async () => {
          try {
            await api(`/reports/${r._id}`, { method: "DELETE" });
            toast("Report deleted", "ok");
            closeModal();
            reload();
          } catch (e) { toast(e.message, "err"); }
        }, { confirmLabel: "Delete" });
    },
  });
}

/* ---------- groups ---------- */

VIEWS.groups = () => {
  const ctx = { page: 1, limit: 20, q: "", visibility: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/groups", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Group</th><th>Creator</th><th>Visibility</th><th class="num">Members</th><th class="num">Pending</th><th class="nowrap">Created</th><th></th></tr></thead>
              <tbody>${d.rows.map((g) => `<tr>
                <td>${userChip({ name: g.name, image: g.logo }, g.description || "")}</td>
                <td>${userChip(g.creator, "")}</td>
                <td><span class="badge ${g.isPrivate ? "amber" : "green"}">${g.isPrivate ? "Private" : "Public"}</span></td>
                <td class="num">${num(g.members)}</td>
                <td class="num">${g.pending ? `<span class="badge amber">${g.pending}</span>` : "0"}</td>
                <td class="nowrap muted">${date(g.createdAt)}</td>
                <td><div class="cell-actions"><button class="btn btn-sm" data-open="${g._id}">Manage</button></div></td>
              </tr>`).join("")}</tbody></table>` : empty("No groups yet", "Groups created in the app will show here", "🏘️")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-open]").forEach((b) => (b.onclick = () => openGroup(b.dataset.open, load)));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load groups", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <input type="search" placeholder="Search group name…" data-filter="q" value="${esc(ctx.q)}" />
      <select data-filter="visibility">
        <option value="">All groups</option>
        <option value="public" ${ctx.visibility === "public" ? "selected" : ""}>Public only</option>
        <option value="private" ${ctx.visibility === "private" ? "selected" : ""}>Private only</option>
      </select>
    </div>${inner}`;

  load();
};

async function openGroup(id, reload) {
  openModal({ title: "Group", body: loading(), wide: true });
  try {
    const { group: g } = await api(`/groups/${id}`);

    const memberRow = (u, actions) => `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      ${avatar(u)}
      <div style="flex:1;min-width:0">
        <strong style="font-size:13px">${esc(u.name || "Unnamed")}</strong>
        <div class="muted" style="font-size:12px">${esc(u.email || "")}</div>
      </div>
      <div class="cell-actions">${actions}</div>
    </div>`;

    openModal({
      title: g.name,
      wide: true,
      body: `
        <div class="form-row">
          <label class="field"><span>Group name</span><input id="gName" value="${esc(g.name)}" /></label>
          <label class="field"><span>Visibility</span>
            <select id="gPrivate">
              <option value="false" ${!g.isPrivate ? "selected" : ""}>Public — anyone can join</option>
              <option value="true" ${g.isPrivate ? "selected" : ""}>Private — approval required</option>
            </select>
          </label>
        </div>
        <label class="field"><span>Description</span><textarea id="gDesc">${esc(g.description || "")}</textarea></label>

        <div>
          <div class="section-title">Join requests (${(g.pendingRequests || []).length})</div>
          ${(g.pendingRequests || []).length
            ? g.pendingRequests.map((u) => memberRow(u, `
                <button class="btn btn-sm btn-primary" data-member="approve|${u._id}">Approve</button>
                <button class="btn btn-sm" data-member="reject|${u._id}">Reject</button>`)).join("")
            : `<p class="muted" style="margin:0">No pending requests.</p>`}
        </div>

        <div>
          <div class="section-title">Members (${(g.members || []).length}) · Admins (${(g.admins || []).length})</div>
          ${(g.members || []).slice(0, 40).map((u) => {
            const isAdmin = (g.admins || []).some((a) => String(a._id) === String(u._id));
            return memberRow(u, `
              ${isAdmin ? `<span class="badge violet">Admin</span><button class="btn btn-sm" data-member="demote|${u._id}">Demote</button>`
                        : `<button class="btn btn-sm" data-member="promote|${u._id}">Make admin</button>`}
              <button class="btn btn-sm btn-danger" data-member="remove|${u._id}">Remove</button>`);
          }).join("") || `<p class="muted" style="margin:0">No members yet.</p>`}
        </div>`,
      footer: `
        <button class="btn btn-danger" id="gDelete">Delete group</button>
        <span style="flex:1"></span>
        <button class="btn" id="gCancel">Close</button>
        <button class="btn btn-primary" id="gSave">Save</button>`,
      onMount(root) {
        $("#gCancel", root).onclick = closeModal;

        $("#gSave", root).onclick = async () => {
          try {
            await api(`/groups/${id}`, {
              method: "PUT",
              body: {
                name: $("#gName", root).value,
                description: $("#gDesc", root).value,
                isPrivate: $("#gPrivate", root).value === "true",
              },
            });
            toast("Group updated", "ok");
            closeModal();
            reload();
          } catch (e) { toast(e.message, "err"); }
        };

        $$("[data-member]", root).forEach((b) => (b.onclick = async () => {
          const [action, userId] = b.dataset.member.split("|");
          try {
            await api(`/groups/${id}/members`, { method: "POST", body: { action, userId } });
            toast(`Member ${action}d`, "ok");
            closeModal();
            openGroup(id, reload);
          } catch (e) { toast(e.message, "err"); }
        }));

        $("#gDelete", root).onclick = () =>
          confirmAction(`Delete the group "${g.name}"? All its membership data is lost.`, async () => {
            try {
              await api(`/groups/${id}`, { method: "DELETE" });
              toast("Group deleted", "ok");
              closeModal();
              reload();
            } catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete group" });
      },
    });
  } catch (e) {
    openModal({ title: "Group", body: empty("Could not load this group", e.message, "⚠️") });
  }
}

/* ---------- live streams ---------- */

VIEWS.live = () => {
  const ctx = { page: 1, limit: 20, status: "", q: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/live", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Stream</th><th>Host</th><th>Status</th><th class="num">Viewers</th><th class="num">Coins</th><th class="num">Chat</th><th class="nowrap">Started</th><th></th></tr></thead>
              <tbody>${d.rows.map((s) => `<tr>
                <td><div class="truncate"><strong>${esc(s.title || s.channelName)}</strong>
                  <div class="muted" style="font-size:12px">${esc(s.channelName)}${s.location ? " · 📍 " + esc(s.location) : ""}</div></div></td>
                <td>${userChip(s.hoster, "")}</td>
                <td><span class="badge ${s.status === "live" ? "red" : ""}">${s.status === "live" ? "● LIVE" : "Ended"}</span></td>
                <td class="num">${num(s.viewers)}</td>
                <td class="num">${num(s.coins)}</td>
                <td class="num">${num(s.messages)}</td>
                <td class="nowrap muted">${ago(s.createdAt)}</td>
                <td><div class="cell-actions">
                  <button class="btn btn-sm" data-open="${s._id}">Details</button>
                  ${s.status === "live" ? `<button class="btn btn-sm btn-danger" data-end="${s._id}">End</button>` : ""}
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("No live streams", "Broadcasts started from the app appear here", "📡")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-open]").forEach((b) => (b.onclick = () => openLive(b.dataset.open, load)));
      $$("[data-end]").forEach((b) => (b.onclick = () =>
        confirmAction("Force-end this live stream? Viewers will be disconnected.", async () => {
          try {
            await api(`/live/${b.dataset.end}/end`, { method: "POST" });
            toast("Stream ended", "ok");
            load();
          } catch (e) { toast(e.message, "err"); }
        }, { confirmLabel: "End stream" })));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load streams", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <input type="search" placeholder="Search title or channel…" data-filter="q" value="${esc(ctx.q)}" />
      <select data-filter="status">
        <option value="">All streams</option>
        <option value="live" ${ctx.status === "live" ? "selected" : ""}>Live now</option>
        <option value="ended" ${ctx.status === "ended" ? "selected" : ""}>Ended</option>
      </select>
    </div>${inner}`;

  load();
};

async function openLive(id, reload) {
  openModal({ title: "Live stream", body: loading(), wide: true });
  try {
    const { stream: s, gifts } = await api(`/live/${id}`);

    openModal({
      title: s.title || s.channelName,
      wide: true,
      body: `
        <dl class="kv">
          <dt>Channel</dt><dd>${esc(s.channelName)}</dd>
          <dt>Host</dt><dd>${esc(s.hoster?.name || "Unknown")}</dd>
          <dt>Status</dt><dd><span class="badge ${s.status === "live" ? "red" : ""}">${s.status}</span></dd>
          <dt>Viewers</dt><dd>${num(s.viewers_count)}</dd>
          <dt>Coins earned</dt><dd>${num(s.coins)}</dd>
          <dt>Started</dt><dd>${dateTime(s.xtime)}</dd>
        </dl>

        <div>
          <div class="section-title">Co-hosts (${(s.cohoster || []).length})</div>
          ${(s.cohoster || []).length
            ? s.cohoster.map((c) => `<div style="display:flex;gap:10px;align-items:center;padding:6px 0">
                ${avatar(c.user)}
                <div style="flex:1"><strong style="font-size:13px">${esc(c.user?.name || "Unknown")}</strong></div>
                <span class="badge ${c.status === "approved" ? "green" : c.status === "rejected" ? "red" : "amber"}">${esc(c.status)}</span>
              </div>`).join("")
            : `<p class="muted" style="margin:0">No co-hosts.</p>`}
        </div>

        <div>
          <div class="section-title">Gifts received (${gifts.length})</div>
          ${gifts.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>From</th><th>Gift</th><th class="num">Coins</th><th class="nowrap">When</th></tr></thead>
                <tbody>${gifts.map((g) => `<tr>
                  <td>${esc(g.sender?.name || "Unknown")}</td>
                  <td>${esc(g.gift?.name || "—")}</td>
                  <td class="num">${num(g.coins)}</td>
                  <td class="nowrap muted">${ago(g.createdAt)}</td>
                </tr>`).join("")}</tbody></table></div>`
            : `<p class="muted" style="margin:0">No gifts sent during this stream.</p>`}
        </div>

        <div>
          <div class="section-title">Live chat (${(s.messages || []).length})</div>
          <div style="max-height:220px;overflow:auto">
            ${(s.messages || []).slice(-40).map((m) => `<div style="padding:4px 0;font-size:13px">
              <strong>${esc(m.userid?.name || "User")}:</strong> ${esc(m.message || "")}
            </div>`).join("") || `<p class="muted" style="margin:0">No chat messages.</p>`}
          </div>
        </div>`,
      footer: `
        <button class="btn btn-danger" id="lDelete">Delete record</button>
        <span style="flex:1"></span>
        ${s.status === "live" ? `<button class="btn btn-danger" id="lEnd">Force end</button>` : ""}
        <button class="btn btn-primary" id="lClose">Close</button>`,
      onMount(root) {
        $("#lClose", root).onclick = closeModal;
        if ($("#lEnd", root)) {
          $("#lEnd", root).onclick = async () => {
            try {
              await api(`/live/${id}/end`, { method: "POST" });
              toast("Stream ended", "ok");
              closeModal();
              reload();
            } catch (e) { toast(e.message, "err"); }
          };
        }
        $("#lDelete", root).onclick = () =>
          confirmAction("Delete this stream record?", async () => {
            try {
              await api(`/live/${id}`, { method: "DELETE" });
              toast("Deleted", "ok");
              closeModal();
              reload();
            } catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete" });
      },
    });
  } catch (e) {
    openModal({ title: "Live stream", body: empty("Could not load this stream", e.message, "⚠️") });
  }
}

/* ---------- hashtags ---------- */

VIEWS.hashtags = () => {
  const ctx = { page: 1, limit: 30, q: "", filter: "" };

  $("#topbarActions").innerHTML = `
    <button class="btn btn-sm" id="rebuildBtn">↻ Rebuild from content</button>
    <button class="btn btn-sm btn-primary" id="addTagBtn">+ Add hashtag</button>`;

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/hashtags", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Hashtag</th><th class="num">Posts</th><th>Trending</th><th class="num">Rank</th><th>Blocked</th><th class="nowrap">Last used</th><th></th></tr></thead>
              <tbody>${d.rows.map((h) => `<tr>
                <td><strong>#${esc(h.tag)}</strong></td>
                <td class="num">${num(h.postCount)}</td>
                <td>${h.isTrending ? `<span class="badge green">Trending</span>` : `<span class="muted">—</span>`}</td>
                <td class="num">${h.trendingRank || "—"}</td>
                <td>${h.isBlocked ? `<span class="badge red">Blocked</span>` : `<span class="muted">—</span>`}</td>
                <td class="nowrap muted">${h.lastUsedAt ? ago(h.lastUsedAt) : "—"}</td>
                <td><div class="cell-actions">
                  <button class="btn btn-sm" data-trend="${h._id}|${h.isTrending}">${h.isTrending ? "Untrend" : "Make trending"}</button>
                  <button class="btn btn-sm" data-block="${h._id}|${h.isBlocked}">${h.isBlocked ? "Unblock" : "Block"}</button>
                  <button class="btn btn-sm btn-danger" data-del="${h._id}">✕</button>
                </div></td>
              </tr>`).join("")}</tbody></table>`
              : empty("No hashtags indexed", 'Click "Rebuild from content" to scan captions for #tags', "#️⃣")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);

      $$("[data-trend]").forEach((b) => (b.onclick = async () => {
        const [id, cur] = b.dataset.trend.split("|");
        try {
          await api(`/hashtags/${id}`, { method: "PUT", body: { isTrending: cur !== "true" } });
          load();
        } catch (e) { toast(e.message, "err"); }
      }));

      $$("[data-block]").forEach((b) => (b.onclick = async () => {
        const [id, cur] = b.dataset.block.split("|");
        try {
          await api(`/hashtags/${id}`, { method: "PUT", body: { isBlocked: cur !== "true" } });
          load();
        } catch (e) { toast(e.message, "err"); }
      }));

      $$("[data-del]").forEach((b) => (b.onclick = () =>
        confirmAction("Delete this hashtag from the index?", async () => {
          try { await api(`/hashtags/${b.dataset.del}`, { method: "DELETE" }); load(); }
          catch (e) { toast(e.message, "err"); }
        }, { confirmLabel: "Delete" })));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load hashtags", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <input type="search" placeholder="Search hashtag…" data-filter="q" value="${esc(ctx.q)}" />
      <select data-filter="filter">
        <option value="">All hashtags</option>
        <option value="trending" ${ctx.filter === "trending" ? "selected" : ""}>Trending only</option>
        <option value="blocked" ${ctx.filter === "blocked" ? "selected" : ""}>Blocked only</option>
      </select>
    </div>${inner}`;

  $("#rebuildBtn").onclick = async () => {
    const btn = $("#rebuildBtn");
    btn.disabled = true;
    btn.textContent = "Scanning…";
    try {
      const r = await api("/hashtags/rebuild", { method: "POST" });
      toast(r.message, "ok");
      load();
    } catch (e) { toast(e.message, "err"); }
    finally { btn.disabled = false; btn.textContent = "↻ Rebuild from content"; }
  };

  $("#addTagBtn").onclick = () => openModal({
    title: "Add hashtag",
    body: `
      <label class="field"><span>Hashtag</span><input id="tTag" placeholder="travel" /></label>
      <label class="field"><span>Pin as trending</span>
        <select id="tTrend"><option value="true">Yes</option><option value="false">No</option></select>
      </label>
      <label class="field"><span>Trending rank (lower shows first)</span><input type="number" id="tRank" value="0" /></label>`,
    footer: `<button class="btn" id="tCancel">Cancel</button><button class="btn btn-primary" id="tSave">Add</button>`,
    onMount(root) {
      $("#tCancel", root).onclick = closeModal;
      $("#tSave", root).onclick = async () => {
        try {
          await api("/hashtags", {
            method: "POST",
            body: {
              tag: $("#tTag", root).value,
              isTrending: $("#tTrend", root).value === "true",
              trendingRank: $("#tRank", root).value,
            },
          });
          toast("Hashtag saved", "ok");
          closeModal();
          load();
        } catch (e) { toast(e.message, "err"); }
      };
    },
  });

  load();
};

/* ---------- generic CRUD table builder ---------- */

/*
  Small factory shared by the simpler admin sections (music, coin packages,
  gifts, categories, promotions, admins). Each caller supplies its columns and
  form fields; everything else — fetch, render, create, edit, delete — is here.
*/
function crudView({ endpoint, columns, fields, title, emptyText, emptyIcon = "📄", idKey = "_id", paged = true, extra }) {
  return () => {
    const ctx = { page: 1, limit: 20, q: "" };
    let rows = [];

    const openForm = (row) => openModal({
      title: row ? `Edit ${title}` : `New ${title}`,
      body: fields.map((f) => {
        const val = row ? row[f.key] ?? "" : f.default ?? "";
        if (f.type === "select") {
          return `<label class="field"><span>${esc(f.label)}</span><select id="f_${f.key}">
            ${f.options.map((o) => {
              const [v, l] = Array.isArray(o) ? o : [o, o];
              return `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(l)}</option>`;
            }).join("")}
          </select></label>`;
        }
        if (f.type === "textarea") {
          return `<label class="field"><span>${esc(f.label)}</span><textarea id="f_${f.key}" placeholder="${esc(f.placeholder || "")}">${esc(val)}</textarea></label>`;
        }
        const v = f.type === "date" && val ? new Date(val).toISOString().slice(0, 10) : val;
        return `<label class="field"><span>${esc(f.label)}</span>
          <input type="${f.type || "text"}" id="f_${f.key}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" /></label>`;
      }).join(""),
      footer: `<button class="btn" id="fCancel">Cancel</button><button class="btn btn-primary" id="fSave">Save</button>`,
      onMount(root) {
        $("#fCancel", root).onclick = closeModal;
        $("#fSave", root).onclick = async () => {
          const body = {};
          fields.forEach((f) => (body[f.key] = $(`#f_${f.key}`, root).value));
          try {
            await api(row ? `${endpoint}/${row[idKey]}` : endpoint, { method: row ? "PUT" : "POST", body });
            toast("Saved", "ok");
            closeModal();
            load();
          } catch (e) { toast(e.message, "err"); }
        };
      },
    });

    const load = async () => {
      view().innerHTML = loading();
      try {
        const d = await api(endpoint, { params: paged ? ctx : {} });
        rows = d.rows || [];

        view().innerHTML = `
          ${extra ? extra(d) : ""}
          <div class="card">
            <div class="table-wrap">
              ${rows.length ? `<table>
                <thead><tr>${columns.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("")}<th></th></tr></thead>
                <tbody>${rows.map((r, i) => `<tr>
                  ${columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.render(r)}</td>`).join("")}
                  <td><div class="cell-actions">
                    <button class="btn btn-sm" data-edit="${i}">Edit</button>
                    <button class="btn btn-sm btn-danger" data-del="${esc(r[idKey])}">Delete</button>
                  </div></td>
                </tr>`).join("")}</tbody></table>` : empty(emptyText, "Use the button above to add one", emptyIcon)}
            </div>
            ${paged ? pager(ctx, d.total ?? rows.length) : ""}
          </div>`;

        if (paged) bindPager(view(), ctx, load);
        $$("[data-edit]").forEach((b) => (b.onclick = () => openForm(rows[+b.dataset.edit])));
        $$("[data-del]").forEach((b) => (b.onclick = () =>
          confirmAction(`Delete this ${title.toLowerCase()}?`, async () => {
            try { await api(`${endpoint}/${b.dataset.del}`, { method: "DELETE" }); toast("Deleted", "ok"); load(); }
            catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete" })));
      } catch (e) {
        view().innerHTML = empty(`Could not load ${title.toLowerCase()}s`, e.message, "⚠️");
      }
    };

    $("#topbarActions").innerHTML = `<button class="btn btn-sm btn-primary" id="addBtn">+ New ${esc(title)}</button>`;
    $("#addBtn").onclick = () => openForm(null);
    load();
  };
}

/* ---------- music ---------- */

VIEWS.music = crudView({
  endpoint: "/music",
  title: "track",
  emptyText: "No music tracks",
  emptyIcon: "🎵",
  columns: [
    { label: "Track", render: (r) => `<strong>${esc(r.musicname || "Untitled")}</strong>${r.music_group ? `<div class="muted" style="font-size:12px">${esc(r.music_group)}</div>` : ""}` },
    { label: "Type", render: (r) => `<span class="badge">${esc(r.musictype || "—")}</span>` },
    { label: "File", render: (r) => `<div class="truncate muted" style="font-size:12px">${esc(r.musicfile || "—")}</div>` },
    { label: "Status", render: (r) => `<span class="badge ${r.status === "Active" ? "green" : ""}">${esc(r.status || "—")}</span>` },
    { label: "Added", render: (r) => `<span class="muted nowrap">${date(r.xtime)}</span>` },
  ],
  fields: [
    { key: "musicname", label: "Track name", placeholder: "Summer Vibes" },
    { key: "music_group", label: "Artist / group", placeholder: "DJ Example" },
    { key: "musictype", label: "Category", placeholder: "Pop, Hip-hop, Arabic…" },
    { key: "musicfile", label: "Audio file URL", placeholder: "https://… or uploads/music/track.mp3" },
    { key: "image", label: "Cover image URL", placeholder: "https://…" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Draft"], default: "Active" },
  ],
});

/* ---------- categories ---------- */

VIEWS.categories = crudView({
  endpoint: "/categories",
  title: "category",
  emptyText: "No categories",
  emptyIcon: "🗂️",
  paged: false,
  columns: [
    { label: "Name", render: (r) => `<strong>${esc(r.name)}</strong>` },
    { label: "Type", render: (r) => `<span class="badge">${esc(r.type || "—")}</span>` },
    { label: "Icon", render: (r) => `<span class="muted truncate" style="font-size:12px">${esc(r.icon || "—")}</span>` },
    { label: "Parent", render: (r) => (r.parentId ? `<span class="muted">nested</span>` : `<span class="muted">top level</span>`) },
    { label: "Created", render: (r) => `<span class="muted nowrap">${date(r.createdAt)}</span>` },
  ],
  fields: [
    { key: "name", label: "Category name", placeholder: "Comedy" },
    { key: "type", label: "Type", placeholder: "social, reel, interest…" },
    { key: "icon", label: "Icon URL or emoji", placeholder: "😂" },
    { key: "image", label: "Image URL", placeholder: "https://…" },
  ],
});

/* ---------- promotions ---------- */

VIEWS.promos = crudView({
  endpoint: "/promos",
  title: "promotion",
  emptyText: "No promotions",
  emptyIcon: "📣",
  columns: [
    { label: "Code", render: (r) => `<strong>${esc(r.promo_code)}</strong>${r.message ? `<div class="muted truncate" style="font-size:12px">${esc(r.message)}</div>` : ""}` },
    { label: "Discount", render: (r) => `${num(r.discount)}${r.discount_type === "percentage" ? "%" : ""}` },
    { label: "Module", render: (r) => `<span class="badge violet">${esc(r.modulename || "—")}</span>` },
    { label: "Window", render: (r) => `<span class="nowrap muted">${date(r.start_date)} → ${date(r.end_date)}</span>` },
    { label: "Status", render: (r) => `<span class="badge ${r.status ? "green" : "red"}">${r.status ? "Active" : "Inactive"}</span>` },
  ],
  fields: [
    { key: "promo_code", label: "Promo code", placeholder: "SOCIAL20" },
    { key: "message", label: "Message", type: "textarea", placeholder: "20% off your first coin pack" },
    { key: "discount", label: "Discount value", type: "number", default: 10 },
    { key: "discount_type", label: "Discount type", type: "select", options: [["percentage", "Percentage"], ["amount", "Fixed amount"]] },
    { key: "start_date", label: "Starts", type: "date" },
    { key: "end_date", label: "Ends", type: "date" },
    { key: "no_of_users", label: "Usage limit (0 = unlimited)", type: "number", default: 0 },
    { key: "modulename", label: "Module", type: "select", options: ["shopping", "food", "shop"] },
  ],
});

/* ---------- admins ---------- */

VIEWS.admins = crudView({
  endpoint: "/admins",
  title: "admin",
  emptyText: "No admin accounts",
  emptyIcon: "🔐",
  paged: false,
  columns: [
    { label: "Admin", render: (r) => userChip({ name: r.name, email: r.email }) },
    { label: "Designation", render: (r) => esc(r.designation || "—") },
    { label: "Status", render: (r) => `<span class="badge ${r.status ? "green" : "red"}">${r.status ? "Active" : "Disabled"}</span>` },
    { label: "Created", render: (r) => `<span class="muted nowrap">${date(r.createdAt)}</span>` },
  ],
  fields: [
    { key: "name", label: "Full name", placeholder: "Jane Doe" },
    { key: "username", label: "Username", placeholder: "jane.admin" },
    { key: "email", label: "Email", type: "email", placeholder: "jane@superapp.com" },
    { key: "designation", label: "Designation", placeholder: "Content Moderator" },
    { key: "password", label: "Password (leave blank to keep current)", type: "password" },
    { key: "status", label: "Status", type: "select", options: [["true", "Active"], ["false", "Disabled"]] },
  ],
});

/* ---------- verification ---------- */

VIEWS.verifications = () => {
  const ctx = { page: 1, limit: 20, status: "pending", kind: "" };

  const summary = (v) =>
    v.kind === "social"
      ? `<strong>${esc(v.fullName || "—")}</strong>${v.knownAs ? ` <span class="muted">(${esc(v.knownAs)})</span>` : ""}
         <div class="muted" style="font-size:12px">${esc((v.category || "").replace(/_/g, " "))}${v.country ? " · " + esc(v.country) : ""}</div>`
      : `<strong>${esc(v.companyName || "—")}</strong>
         <div class="muted" style="font-size:12px">Licence ${esc(v.licenseNumber || "—")}${v.telephone ? " · " + esc(v.telephone) : ""}</div>`;

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/verifications", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Applicant</th><th>Type</th><th>Details</th><th>Docs</th><th>Status</th><th class="nowrap">Submitted</th><th></th></tr></thead>
              <tbody>${d.rows.map((v, i) => `<tr>
                <td>${v.user ? userChip(v.user) : `<span class="muted">${esc(String(v.userid).slice(-8))}</span>`}</td>
                <td><span class="badge ${v.kind === "social" ? "blue" : "violet"}">${v.kind === "social" ? "Blue tick" : "Business"}</span></td>
                <td><div class="truncate" style="max-width:260px">${summary(v)}</div></td>
                <td>${(v.images || []).length
                  ? (v.images || []).map((im) => `<a href="${esc(mediaUrl(im.image))}" target="_blank" rel="noopener" class="badge blue">Doc ${im.slNo}</a>`).join(" ")
                  : `<span class="muted">none</span>`}</td>
                <td>${verifyBadge(v.status)}</td>
                <td class="nowrap muted">${v.createdAt ? ago(v.createdAt) : "—"}</td>
                <td><div class="cell-actions">
                  <button class="btn btn-sm btn-primary" data-review="${i}">Review</button>
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("Nothing to review", "No verification requests with this status", "✔️")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-tab]").forEach((b) => (b.onclick = () => { ctx.status = b.dataset.tab; ctx.page = 1; load(); }));
      $$("[data-review]").forEach((b) => (b.onclick = () => openVerification(d.rows[+b.dataset.review], load)));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load requests", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <div class="tabs">
        ${[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All"]].map(
          ([v, l]) => `<button class="tab ${ctx.status === v ? "active" : ""}" data-tab="${v}">${l}</button>`
        ).join("")}
      </div>
      <select data-filter="kind">
        <option value="">All request types</option>
        <option value="social" ${ctx.kind === "social" ? "selected" : ""}>Blue tick (social)</option>
        <option value="business" ${ctx.kind === "business" ? "selected" : ""}>Business licence</option>
      </select>
    </div>${inner}`;

  load();
};

function openVerification(v, reload) {
  const social = v.kind === "social";
  openModal({
    title: social ? "Blue tick application" : "Business verification",
    wide: true,
    body: `
      <div style="display:flex;gap:14px;align-items:center">
        ${avatar(v.user, "lg")}
        <div>
          <div style="font-size:16px;font-weight:600">${esc(v.user?.name || "Unknown user")}</div>
          <div class="muted">${esc(v.user?.email || v.userid)}</div>
          <div style="margin-top:6px">${verifyBadge(v.status)}
            ${v.user?.verifiedBadge ? `<span class="badge blue">Already verified</span>` : ""}</div>
        </div>
      </div>

      <dl class="kv">
        ${social ? `
          <dt>Legal name</dt><dd>${esc(v.fullName || "—")}</dd>
          <dt>Known as</dt><dd>${esc(v.knownAs || "—")}</dd>
          <dt>Category</dt><dd>${esc((v.category || "—").replace(/_/g, " "))}</dd>
          <dt>Country</dt><dd>${esc(v.country || "—")}</dd>
          <dt>ID document</dt><dd>${esc((v.idDocumentType || "—").replace(/_/g, " "))}</dd>
          <dt>Applicant notes</dt><dd>${esc(v.notes || "—")}</dd>
          <dt>Reference links</dt><dd>${(v.referenceLinks || []).length
            ? v.referenceLinks.map((l) => `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`).join("<br>")
            : "—"}</dd>
        ` : `
          <dt>Company</dt><dd>${esc(v.companyName || "—")}</dd>
          <dt>Licence number</dt><dd>${esc(v.licenseNumber || "—")}</dd>
          <dt>Telephone</dt><dd>${esc(v.telephone || "—")}</dd>
        `}
        <dt>Submitted</dt><dd>${v.createdAt ? dateTime(v.createdAt) : "—"}</dd>
        ${v.reviewedAt ? `<dt>Last reviewed</dt><dd>${dateTime(v.reviewedAt)}</dd>` : ""}
      </dl>

      ${(v.images || []).length ? `<div>
        <div class="section-title">Submitted documents</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${v.images.map((im) => `<a href="${esc(mediaUrl(im.image))}" target="_blank" rel="noopener">
            <img src="${esc(mediaUrl(im.image))}" alt="Document ${im.slNo}"
                 style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
          </a>`).join("")}
        </div>
      </div>` : ""}

      <label class="field"><span>Review note (shown to the applicant)</span>
        <textarea id="vNote" placeholder="Why this was approved or rejected…">${esc(v.reviewNote || "")}</textarea>
      </label>`,
    footer: `
      <button class="btn" id="vCancel">Close</button>
      <span style="flex:1"></span>
      <button class="btn btn-danger" id="vReject">Reject</button>
      <button class="btn btn-primary" id="vApprove">Approve &amp; grant tick</button>`,
    onMount(root) {
      $("#vCancel", root).onclick = closeModal;

      const decide = async (status) => {
        try {
          await api(`/verifications/${v._id}/decide`, {
            method: "POST",
            body: { status, reviewNote: $("#vNote", root).value },
          });
          toast(status === "approved" ? "Approved — blue tick granted" : "Request rejected", "ok");
          closeModal();
          reload();
        } catch (e) { toast(e.message, "err"); }
      };

      $("#vApprove", root).onclick = () => decide("approved");
      $("#vReject", root).onclick = () => decide("rejected");
    },
  });
}

const verifyBadge = (s) => {
  const map = { pending: ["amber", "Pending"], approved: ["green", "Approved"], rejected: ["red", "Rejected"] };
  const [cls, label] = map[s] || ["", s];
  return `<span class="badge ${cls}">${label}</span>`;
};

/* ---------- support ---------- */

VIEWS.support = () => {
  const ctx = { page: 1, limit: 20, status: "" };

  const load = async () => {
    view().innerHTML = shell(loading());
    try {
      const d = await api("/support", { params: ctx });
      view().innerHTML = shell(`
        <div class="card">
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>User</th><th>Department</th><th>Subject</th><th>Status</th><th class="nowrap">Opened</th><th></th></tr></thead>
              <tbody>${d.rows.map((t) => `<tr>
                <td>${userChip(t.user)}</td>
                <td><span class="badge violet">${esc(t.departmenttype || "—")}</span></td>
                <td><div class="truncate"><strong>${esc(t.subject || "(no subject)")}</strong>
                  <div class="muted" style="font-size:12px">${esc((t.message || "").slice(0, 90))}</div></div></td>
                <td><span class="badge ${t.status === "Pending" ? "amber" : t.status === "Closed" ? "" : "blue"}">${esc(t.status || "Pending")}</span></td>
                <td class="nowrap muted">${ago(t.createdAt)}</td>
                <td><div class="cell-actions">
                  <select data-status="${t._id}" style="width:auto;padding:4px 8px;font-size:12.5px">
                    ${["Pending", "In Progress", "Resolved", "Closed"].map((s) => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}
                  </select>
                </div></td>
              </tr>`).join("")}</tbody></table>` : empty("No tickets", "Support requests from the app appear here", "🎧")}
          </div>
          ${pager(ctx, d.total)}
        </div>`);

      bindFilters(view(), ctx, load);
      bindPager(view(), ctx, load);
      $$("[data-status]").forEach((sel) => (sel.onchange = async () => {
        try {
          await api(`/support/${sel.dataset.status}`, { method: "PUT", body: { status: sel.value } });
          toast("Ticket updated", "ok");
        } catch (e) { toast(e.message, "err"); }
      }));
    } catch (e) {
      view().innerHTML = shell(`<div class="card">${empty("Could not load tickets", e.message, "⚠️")}</div>`);
    }
  };

  const shell = (inner) => `
    <div class="toolbar">
      <select data-filter="status">
        <option value="">All tickets</option>
        ${["Pending", "In Progress", "Resolved", "Closed"].map((s) => `<option value="${s}" ${ctx.status === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>${inner}`;

  load();
};

/* ---------- monetisation ---------- */

VIEWS.monetisation = () => {
  let tab = "packages";

  const render = async () => {
    view().innerHTML = `
      <div class="toolbar">
        <div class="tabs">
          ${[["packages", "Coin packages"], ["gifts", "Gifts"], ["gifttx", "Gift activity"], ["tx", "Purchases"]].map(
            ([v, l]) => `<button class="tab ${tab === v ? "active" : ""}" data-tab="${v}">${l}</button>`
          ).join("")}
        </div>
        <span class="spacer"></span>
        ${tab === "packages" ? `<button class="btn btn-sm btn-primary" id="newPack">+ New package</button>` : ""}
        ${tab === "gifts" ? `<button class="btn btn-sm btn-primary" id="newGift">+ New gift</button>` : ""}
      </div>
      <div id="monBody">${loading()}</div>`;

    $$("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));

    try {
      if (tab === "packages") {
        const d = await api("/coin-packages");
        $("#monBody").innerHTML = `<div class="card"><div class="table-wrap">
          ${d.rows.length ? `<table>
            <thead><tr><th>Package</th><th class="num">Coins</th><th class="num">Price</th><th>Status</th><th></th></tr></thead>
            <tbody>${d.rows.map((p, i) => `<tr>
              <td><strong>${esc(p.groupname || "Coin pack")}</strong></td>
              <td class="num">${num(p.coins)}</td>
              <td class="num">${Number(p.priceAED || 0).toFixed(2)} ${esc((p.currency || "aed").toUpperCase())}</td>
              <td><span class="badge ${p.status === "active" ? "green" : ""}">${esc(p.status || "active")}</span></td>
              <td><div class="cell-actions">
                <button class="btn btn-sm" data-editpack="${i}">Edit</button>
                <button class="btn btn-sm btn-danger" data-delpack="${p._id}">Delete</button>
              </div></td>
            </tr>`).join("")}</tbody></table>` : empty("No coin packages", "Add one so users can buy coins", "🪙")}
        </div></div>`;

        $$("[data-editpack]").forEach((b) => (b.onclick = () => packForm(d.rows[+b.dataset.editpack])));
        $$("[data-delpack]").forEach((b) => (b.onclick = () =>
          confirmAction("Delete this coin package?", async () => {
            try { await api(`/coin-packages/${b.dataset.delpack}`, { method: "DELETE" }); toast("Deleted", "ok"); render(); }
            catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete" })));
        if ($("#newPack")) $("#newPack").onclick = () => packForm(null);

      } else if (tab === "gifts") {
        const d = await api("/gifts");
        $("#monBody").innerHTML = `<div class="card"><div class="table-wrap">
          ${d.rows.length ? `<table>
            <thead><tr><th>Gift</th><th>Group</th><th class="num">Coin cost</th><th></th></tr></thead>
            <tbody>${d.rows.map((g, i) => `<tr>
              <td><div class="userchip">${g.icon ? `<img class="avatar" src="${esc(mediaUrl(g.icon))}" alt="">` : `<div class="avatar">🎁</div>`}
                <div class="userchip-text"><strong>${esc(g.name)}</strong></div></div></td>
              <td><span class="badge violet">${esc(g.groupname || "—")}</span></td>
              <td class="num">${num(g.coinCost)}</td>
              <td><div class="cell-actions">
                <button class="btn btn-sm" data-editgift="${i}">Edit</button>
                <button class="btn btn-sm btn-danger" data-delgift="${g._id}">Delete</button>
              </div></td>
            </tr>`).join("")}</tbody></table>` : empty("No gifts configured", "Gifts are what viewers send during live streams", "🎁")}
        </div></div>`;

        $$("[data-editgift]").forEach((b) => (b.onclick = () => giftForm(d.rows[+b.dataset.editgift])));
        $$("[data-delgift]").forEach((b) => (b.onclick = () =>
          confirmAction("Delete this gift?", async () => {
            try { await api(`/gifts/${b.dataset.delgift}`, { method: "DELETE" }); toast("Deleted", "ok"); render(); }
            catch (e) { toast(e.message, "err"); }
          }, { confirmLabel: "Delete" })));
        if ($("#newGift")) $("#newGift").onclick = () => giftForm(null);

      } else if (tab === "gifttx") {
        const ctx = { page: 1, limit: 20 };
        const d = await api("/gift-transactions", { params: ctx });
        $("#monBody").innerHTML = `<div class="card"><div class="table-wrap">
          ${d.rows.length ? `<table>
            <thead><tr><th>From</th><th>To</th><th>Gift</th><th class="num">Coins</th><th>Channel</th><th class="nowrap">When</th></tr></thead>
            <tbody>${d.rows.map((t) => `<tr>
              <td>${userChip(t.sender, "")}</td>
              <td>${userChip(t.receiver, "")}</td>
              <td>${esc(t.gift?.name || "—")}</td>
              <td class="num">${num(t.coins)}</td>
              <td class="muted truncate" style="max-width:150px">${esc(t.channelName || "—")}</td>
              <td class="nowrap muted">${ago(t.createdAt)}</td>
            </tr>`).join("")}</tbody></table>` : empty("No gifts sent yet", "Gift activity from live streams shows here", "🎁")}
        </div>${pager(ctx, d.total)}</div>`;
        bindPager($("#monBody"), ctx, render);

      } else {
        const ctx = { page: 1, limit: 20 };
        const d = await api("/transactions", { params: ctx });
        $("#monBody").innerHTML = `
          <div class="grid stat-grid" style="margin-bottom:16px">
            ${statCard({ label: "Approved revenue", value: money(d.totals.amount), icon: "💳" })}
            ${statCard({ label: "Coins sold", value: num(d.totals.coins), icon: "🪙" })}
            ${statCard({ label: "Transactions", value: num(d.total), icon: "🧾" })}
          </div>
          <div class="card"><div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>User</th><th>Method</th><th class="num">Amount</th><th class="num">Coins</th><th>Status</th><th class="nowrap">When</th></tr></thead>
              <tbody>${d.rows.map((t) => `<tr>
                <td>${userChip(t.userId)}</td>
                <td><span class="badge">${esc(t.paymentType || "—")}</span></td>
                <td class="num">${money(t.amount)}</td>
                <td class="num">${num(t.coins)}</td>
                <td><span class="badge ${t.paymentStatus === "approved" ? "green" : t.paymentStatus === "failed" ? "red" : "amber"}">${esc(t.paymentStatus)}</span></td>
                <td class="nowrap muted">${ago(t.date)}</td>
              </tr>`).join("")}</tbody></table>` : empty("No purchases yet", "Coin purchases via Stripe show here", "💳")}
          </div>${pager(ctx, d.total)}</div>`;
        bindPager($("#monBody"), ctx, render);
      }
    } catch (e) {
      $("#monBody").innerHTML = empty("Could not load this section", e.message, "⚠️");
    }
  };

  const packForm = (p) => openModal({
    title: p ? "Edit coin package" : "New coin package",
    body: `
      <label class="field"><span>Package name</span><input id="pName" value="${esc(p?.groupname || "")}" placeholder="Starter pack" /></label>
      <div class="form-row">
        <label class="field"><span>Coins</span><input type="number" id="pCoins" value="${esc(p?.coins ?? 100)}" /></label>
        <label class="field"><span>Price</span><input type="number" step="0.01" id="pPrice" value="${esc(p?.priceAED ?? 10)}" /></label>
      </div>
      <label class="field"><span>Currency</span>
        <select id="pCurrency">
          <option value="aed" ${(p?.currency || "aed") === "aed" ? "selected" : ""}>AED</option>
          <option value="usd" ${p?.currency === "usd" ? "selected" : ""}>USD</option>
        </select>
      </label>
      <label class="field"><span>Thumbnail URL</span><input id="pThumb" value="${esc(p?.thumbnail || "")}" placeholder="https://…" /></label>
      <label class="field"><span>Status</span>
        <select id="pStatus">
          <option value="active" ${p?.status !== "Inactive" ? "selected" : ""}>Active</option>
          <option value="Inactive" ${p?.status === "Inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </label>`,
    footer: `<button class="btn" id="pCancel">Cancel</button><button class="btn btn-primary" id="pSave">Save</button>`,
    onMount(root) {
      $("#pCancel", root).onclick = closeModal;
      $("#pSave", root).onclick = async () => {
        try {
          await api(p ? `/coin-packages/${p._id}` : "/coin-packages", {
            method: p ? "PUT" : "POST",
            body: {
              groupname: $("#pName", root).value,
              coins: $("#pCoins", root).value,
              priceAED: $("#pPrice", root).value,
              currency: $("#pCurrency", root).value,
              thumbnail: $("#pThumb", root).value,
              status: $("#pStatus", root).value,
            },
          });
          toast("Saved", "ok");
          closeModal();
          render();
        } catch (e) { toast(e.message, "err"); }
      };
    },
  });

  const giftForm = (g) => openModal({
    title: g ? "Edit gift" : "New gift",
    body: `
      <label class="field"><span>Gift name</span><input id="gfName" value="${esc(g?.name || "")}" placeholder="Rose" /></label>
      <div class="form-row">
        <label class="field"><span>Group</span><input id="gfGroup" value="${esc(g?.groupname || "")}" placeholder="Popular" /></label>
        <label class="field"><span>Coin cost</span><input type="number" id="gfCost" value="${esc(g?.coinCost ?? 10)}" /></label>
      </div>
      <label class="field"><span>Icon / animation URL</span><input id="gfIcon" value="${esc(g?.icon || "")}" placeholder="https://…" /></label>`,
    footer: `<button class="btn" id="gfCancel">Cancel</button><button class="btn btn-primary" id="gfSave">Save</button>`,
    onMount(root) {
      $("#gfCancel", root).onclick = closeModal;
      $("#gfSave", root).onclick = async () => {
        try {
          await api(g ? `/gifts/${g._id}` : "/gifts", {
            method: g ? "PUT" : "POST",
            body: {
              name: $("#gfName", root).value,
              groupname: $("#gfGroup", root).value,
              coinCost: $("#gfCost", root).value,
              icon: $("#gfIcon", root).value,
            },
          });
          toast("Saved", "ok");
          closeModal();
          render();
        } catch (e) { toast(e.message, "err"); }
      };
    },
  });

  render();
};

/* ---------- notifications ---------- */

VIEWS.notifications = async () => {
  view().innerHTML = loading();
  try {
    const a = await api("/notifications/audience");
    view().innerHTML = `
      <div class="grid stat-grid" style="margin-bottom:16px">
        ${statCard({ label: "Total users", value: num(a.total), icon: "👥" })}
        ${statCard({ label: "Reachable devices", value: num(a.withTokens), sub: `${a.total ? Math.round(a.withTokens / a.total * 100) : 0}% of users have a device token`, icon: "📱" })}
      </div>

      <div class="card" style="max-width:640px">
        <div class="card-head"><div><h3>Send a push notification</h3><p>Delivered through Firebase Cloud Messaging</p></div></div>
        <div class="card-body" style="display:grid;gap:16px">
          <label class="field"><span>Audience</span>
            <select id="nAudience">
              <option value="all">Everyone with the app installed</option>
              <option value="user">A single user</option>
            </select>
          </label>
          <label class="field hidden" id="nUserField"><span>User ID</span>
            <input id="nUserId" placeholder="MongoDB user _id" />
          </label>
          <label class="field"><span>Title</span><input id="nTitle" placeholder="New feature is live 🎉" maxlength="60" /></label>
          <label class="field"><span>Message</span><textarea id="nBody" placeholder="Tell your users what's new…" maxlength="200"></textarea></label>
          <button class="btn btn-primary" id="nSend">Send notification</button>
          <p class="muted" style="margin:0;font-size:12.5px">
            Push requires Firebase credentials in <code>.env</code>. Without them this call returns
            "Push service unavailable".
          </p>
        </div>
      </div>`;

    $("#nAudience").onchange = (e) => $("#nUserField").classList.toggle("hidden", e.target.value !== "user");

    $("#nSend").onclick = async () => {
      const btn = $("#nSend");
      const body = {
        audience: $("#nAudience").value,
        userId: $("#nUserId").value.trim(),
        title: $("#nTitle").value.trim(),
        body: $("#nBody").value.trim(),
      };
      if (!body.title || !body.body) return toast("Title and message are required", "err");

      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const r = await api("/notifications/send", { method: "POST", body });
        toast(`Sent to ${r.sent} device(s)`, "ok");
        $("#nTitle").value = "";
        $("#nBody").value = "";
      } catch (e) { toast(e.message, "err"); }
      finally { btn.disabled = false; btn.textContent = "Send notification"; }
    };
  } catch (e) {
    view().innerHTML = empty("Could not load notification settings", e.message, "⚠️");
  }
};

/* ---------- messaging ---------- */

VIEWS.messaging = () => {
  const ctx = { page: 1, limit: 25 };

  const load = async () => {
    view().innerHTML = loading();
    try {
      const d = await api("/messaging", { params: ctx });
      view().innerHTML = `
        <div class="grid stat-grid" style="margin-bottom:16px">
          ${statCard({ label: "Conversations", value: num(d.total), icon: "💬" })}
          ${statCard({ label: "Messages sent", value: num(d.messageCount), icon: "✉️" })}
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Recent conversations</h3><p>Volume only — message content is not exposed here</p></div></div>
          <div class="table-wrap">
            ${d.rows.length ? `<table>
              <thead><tr><th>Type</th><th>Participants</th><th class="num">Messages</th><th class="nowrap">Last activity</th></tr></thead>
              <tbody>${d.rows.map((c) => `<tr>
                <td><span class="badge ${c.type === "group" ? "violet" : "blue"}">${esc(c.type)}</span></td>
                <td>${c.type === "group" ? `<span class="muted">Group conversation</span>`
                  : `${esc(c.sender?.name || "?")} ↔ ${esc(c.receiver?.name || "?")}`}</td>
                <td class="num">${num(c.messages)}</td>
                <td class="nowrap muted">${ago(c.updatedAt)}</td>
              </tr>`).join("")}</tbody></table>` : empty("No conversations", "Chats started in the app appear here", "✉️")}
          </div>
          ${pager(ctx, d.total)}
        </div>`;
      bindPager(view(), ctx, load);
    } catch (e) {
      view().innerHTML = empty("Could not load messaging data", e.message, "⚠️");
    }
  };

  load();
};

/* ------------------------------------------------------------------ */
/* auth flow                                                           */
/* ------------------------------------------------------------------ */

function showAuth() {
  $("#shell").classList.add("hidden");
  $("#auth").classList.remove("hidden");
}

function showApp() {
  $("#auth").classList.add("hidden");
  $("#shell").classList.remove("hidden");
  $("#whoName").textContent = state.admin?.name || "Admin";
  $("#whoEmail").textContent = state.admin?.username ? `@${state.admin.username}` : (state.admin?.email || "");
  $("#whoAvatar").textContent = initials(state.admin?.name);
  go(location.hash.replace("#", "") || "dashboard");
}

function logout() {
  state.token = null;
  state.admin = null;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  showAuth();
}

async function initAuth() {
  if (state.token) {
    try {
      const { admin } = await api("/me");
      state.admin = admin;
      return showApp();
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      state.token = null;
    }
  }

  try {
    const { needsBootstrap } = await api("/bootstrap-status");
    state.bootstrapMode = needsBootstrap;
  } catch {
    state.bootstrapMode = false;
  }

  if (state.bootstrapMode) {
    $("#bootstrapNotice").classList.remove("hidden");
    $("#authSubmit").textContent = "Create admin account";
    $("#authPassword").autocomplete = "new-password";
  }

  showAuth();
}

$("#authForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = $("#authSubmit");
  const err = $("#authError");
  err.classList.add("hidden");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Please wait…";

  try {
    const body = {
      username: $("#authUsername").value.trim(),
      password: $("#authPassword").value,
    };
    const d = await api(state.bootstrapMode ? "/bootstrap" : "/login", { method: "POST", body });

    state.token = d.token;
    state.admin = d.admin;
    const remember = $("#rememberMe").checked;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(remember ? TOKEN_KEY : SESSION_TOKEN_KEY, d.token);
    toast(`Welcome, ${d.admin.name || "Admin"}`, "ok");
    showApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
};

/* ------------------------------------------------------------------ */
/* wiring                                                              */
/* ------------------------------------------------------------------ */

$("#logoutBtn").onclick = logout;
$("#modalClose").onclick = closeModal;
$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");

$("#modalBackdrop").onclick = (e) => {
  if (e.target === $("#modalBackdrop")) closeModal();
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modalBackdrop").classList.contains("hidden")) closeModal();
});

window.addEventListener("hashchange", () => {
  const r = location.hash.replace("#", "");
  if (r && r !== state.route && state.token) go(r);
});

renderNav();
initAuth();
