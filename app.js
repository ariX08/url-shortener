/* global supabase */

const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const resultEl = document.getElementById("result");
const shortUrlInput = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const statusEl = document.getElementById("status");
const qrPreview = document.getElementById("qr-preview");
const qrCanvas = document.getElementById("qr-canvas");

const historyToggle = document.getElementById("history-toggle");
const historyPanel = document.getElementById("history-panel");
const historyOverlay = document.getElementById("history-overlay");
const closeHistory = document.getElementById("close-history");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

const cookieBanner = document.getElementById("cookie-banner");
const cookieAcceptAll = document.getElementById("cookie-accept-all");
const cookieEssential = document.getElementById("cookie-essential");
const cookieCustomize = document.getElementById("cookie-customize");
const openCookiePrefs = document.getElementById("open-cookie-prefs");
const cookieModal = document.getElementById("cookie-modal");
const prefAnalytics = document.getElementById("pref-analytics");
const savePrefs = document.getElementById("save-prefs");
const closeModal = document.getElementById("close-modal");

const LOCAL_HISTORY_KEY = "shortly_local_history";
const COOKIE_CONSENT_KEY = "shortly_cookie_consent";
const MAX_LOCAL = 40;

let sb = null;
let currentTab = "link";

function initSupabase() {
  if (
    !window.SUPABASE_URL ||
    window.SUPABASE_URL.includes("YOUR_PROJECT") ||
    !window.SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY.includes("YOUR_ANON")
  ) {
    return null;
  }
  return supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

sb = initSupabase();

function generateCode(length = 5) {
  const alphabet = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[arr[i] % alphabet.length];
  }
  return out;
}

function loadLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalHistory(items) {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_LOCAL)));
}

function addLocalHistory(entry) {
  let items = loadLocalHistory().filter((i) => i.code !== entry.code);
  items.unshift(entry);
  saveLocalHistory(items);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (type ? " " + type : "");
}

function buildShortUrl(code) {
  const base = (window.SHORT_BASE || window.location.origin).replace(/\/$/, "");
  // Prefer path relative to current folder
  const path = window.location.pathname.replace(/\/[^/]*$/, "") || "";
  return `${window.location.origin}${path}/r.html?c=${code}`;
}

function getSelectedExpiry() {
  const el = document.querySelector('input[name="expiry"]:checked');
  return el ? el.value : "forever";
}

function expiryToTimestamp(value) {
  if (value === "12h") return new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  if (value === "24h") return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return null; // forever
}

function formatExpiry(ts) {
  if (!ts) return "Forever";
  const d = new Date(ts);
  if (d < new Date()) return "Expired";
  return "Until " + d.toLocaleString();
}

async function createLink(originalUrl) {
  const code = generateCode(5);
  const expiryVal = getSelectedExpiry();
  const expires_at = expiryToTimestamp(expiryVal);

  if (sb) {
    const row = {
      short_code: code,
      original_url: originalUrl,
      clicks: 0,
      expires_at,
    };
    const { error } = await sb.from("links").insert(row);
    if (error) {
      if (error.code === "23505") return createLink(originalUrl);
      throw new Error(error.message || "Database error");
    }
  }

  const short = buildShortUrl(code);
  return { code, short, original: originalUrl, expires_at, expiryLabel: expiryVal };
}

function drawSimpleQR(text, canvas) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 160, 160);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => ctx.drawImage(img, 0, 0, 160, 160);
  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" +
    encodeURIComponent(text);
}

async function refreshHistoryClicks() {
  const items = loadLocalHistory();
  if (!sb || items.length === 0) {
    renderHistory(items);
    return;
  }
  const codes = items.map((i) => i.code);
  try {
    const { data, error } = await sb
      .from("links")
      .select("short_code, clicks, expires_at, created_at")
      .in("short_code", codes);
    if (error || !data) {
      renderHistory(items);
      return;
    }
    const map = Object.fromEntries(data.map((r) => [r.short_code, r]));
    const merged = items.map((item) => {
      const live = map[item.code];
      if (!live) return { ...item, clicks: item.clicks ?? 0, missing: true };
      return {
        ...item,
        clicks: live.clicks,
        expires_at: live.expires_at,
        created_at: live.created_at,
        missing: false,
      };
    });
    saveLocalHistory(merged);
    renderHistory(merged);
  } catch {
    renderHistory(items);
  }
}

function renderHistory(items) {
  if (!items) items = loadLocalHistory();
  if (items.length === 0) {
    historyList.innerHTML = "";
    historyEmpty.classList.remove("hidden");
    return;
  }
  historyEmpty.classList.add("hidden");
  historyList.innerHTML = items
    .map((item) => {
      const clicks = item.clicks != null ? item.clicks : 0;
      const exp = formatExpiry(item.expires_at);
      const created = item.ts
        ? new Date(item.ts).toLocaleString()
        : item.created_at
        ? new Date(item.created_at).toLocaleString()
        : "";
      const missingNote = item.missing
        ? '<span class="hist-meta">Removed from database</span>'
        : "";
      return `
    <li>
      <div class="hist-short"><a href="${escapeHtml(item.short)}" target="_blank" rel="noopener">${escapeHtml(item.short)}</a></div>
      <div class="hist-long" title="${escapeHtml(item.original)}">${escapeHtml(item.original)}</div>
      <div class="hist-meta">${clicks} click${clicks === 1 ? "" : "s"} · ${exp}</div>
      <div class="hist-meta">${created}</div>
      ${missingNote}
    </li>`;
    })
    .join("");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const longUrl = urlInput.value.trim();
  if (!longUrl) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";
  resultEl.classList.add("hidden");
  qrPreview.classList.add("hidden");
  setStatus("");

  try {
    const { code, short, original, expires_at, expiryLabel } = await createLink(longUrl);
    shortUrlInput.value = short;
    resultEl.classList.remove("hidden");
    const expMsg =
      expiryLabel === "forever"
        ? "Link saved (forever)."
        : `Link saved (expires in ${expiryLabel}).`;
    setStatus(
      sb ? expMsg : "Link created in local mode — add Supabase keys for permanent storage.",
      "success"
    );

    addLocalHistory({
      code,
      short,
      original,
      clicks: 0,
      expires_at,
      ts: Date.now(),
    });

    if (currentTab === "qr") {
      qrPreview.classList.remove("hidden");
      drawSimpleQR(short, qrCanvas);
    }
  } catch (err) {
    resultEl.classList.remove("hidden");
    shortUrlInput.value = "";
    setStatus(err.message || "Something went wrong.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Shorten";
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortUrlInput.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard.", "success");
  } catch {
    shortUrlInput.select();
    document.execCommand("copy");
    setStatus("Copied to clipboard.", "success");
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    if (currentTab === "qr" && shortUrlInput.value) {
      qrPreview.classList.remove("hidden");
      drawSimpleQR(shortUrlInput.value, qrCanvas);
    } else {
      qrPreview.classList.add("hidden");
    }
  });
});

function openHistory() {
  historyPanel.classList.add("open");
  historyPanel.setAttribute("aria-hidden", "false");
  historyOverlay.classList.remove("hidden");
  refreshHistoryClicks();
}

function closeHistoryPanel() {
  historyPanel.classList.remove("open");
  historyPanel.setAttribute("aria-hidden", "true");
  historyOverlay.classList.add("hidden");
}

historyToggle.addEventListener("click", openHistory);
closeHistory.addEventListener("click", closeHistoryPanel);
historyOverlay.addEventListener("click", closeHistoryPanel);

function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

function setConsent(obj) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(obj));
}

function showBannerIfNeeded() {
  if (!getConsent()) cookieBanner.classList.remove("hidden");
}

cookieAcceptAll.addEventListener("click", () => {
  setConsent({ essential: true, analytics: true, ts: Date.now() });
  cookieBanner.classList.add("hidden");
});

cookieEssential.addEventListener("click", () => {
  setConsent({ essential: true, analytics: false, ts: Date.now() });
  cookieBanner.classList.add("hidden");
});

cookieCustomize.addEventListener("click", () => {
  const c = getConsent() || { analytics: false };
  prefAnalytics.checked = !!c.analytics;
  cookieModal.classList.remove("hidden");
});

openCookiePrefs.addEventListener("click", () => {
  const c = getConsent() || { analytics: false };
  prefAnalytics.checked = !!c.analytics;
  cookieModal.classList.remove("hidden");
});

savePrefs.addEventListener("click", () => {
  setConsent({ essential: true, analytics: prefAnalytics.checked, ts: Date.now() });
  cookieModal.classList.add("hidden");
  cookieBanner.classList.add("hidden");
});

closeModal.addEventListener("click", () => cookieModal.classList.add("hidden"));
cookieModal.querySelector(".modal-backdrop").addEventListener("click", () => {
  cookieModal.classList.add("hidden");
});

showBannerIfNeeded();
renderHistory();
