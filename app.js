const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const resultEl = document.getElementById("result");
const shortUrlInput = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const statusEl = document.getElementById("status");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

const STORAGE_KEY = "shorten_history";
const MAX_HISTORY = 20;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
}

function addToHistory(original, short) {
  let items = loadHistory().filter((i) => i.short !== short);
  items.unshift({ original, short, ts: Date.now() });
  saveHistory(items);
  renderHistory();
}

function renderHistory() {
  const items = loadHistory();
  if (items.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historySection.classList.remove("hidden");
  historyList.innerHTML = items
    .map(
      (item) => `
    <li>
      <div class="history-short"><a href="${escapeHtml(item.short)}" target="_blank" rel="noopener">${escapeHtml(item.short)}</a></div>
      <div class="history-long" title="${escapeHtml(item.original)}">${escapeHtml(item.original)}</div>
    </li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (type ? ` ${type}` : "");
}

function showResult(shortUrl) {
  shortUrlInput.value = shortUrl;
  resultEl.classList.remove("hidden");
  setStatus("Ready to copy.", "success");
}

async function shortenUrl(longUrl) {
  const body = new URLSearchParams({ url: longUrl });

  const res = await fetch("https://cleanuri.com/api/v1/shorten", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.result_url) {
    throw new Error("Unexpected response from the shortening service.");
  }

  return data.result_url;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const longUrl = urlInput.value.trim();
  if (!longUrl) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Working…";
  resultEl.classList.add("hidden");
  setStatus("");

  try {
    const shortUrl = await shortenUrl(longUrl);
    showResult(shortUrl);
    addToHistory(longUrl, shortUrl);
  } catch (err) {
    resultEl.classList.remove("hidden");
    shortUrlInput.value = "";
    setStatus(err.message || "Failed to shorten. Try again.", "error");
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

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
});

renderHistory();
