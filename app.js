// ---------------------------------------------------------------------------
// CONFIGURATION — paste your deployed Google Apps Script Web App URL below.
// See README.md for the one-time Google Sheet + Apps Script setup steps.
// ---------------------------------------------------------------------------
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxdHMlYzUT4C-Ai2Jer3_F3jL1SkTYtHcG0caNDDr1sSuBZOHBnWdUVIXjAbLeC_kxC4A/exec",
  STARTING_BUDGET: 250,
  ROSTER_SIZE: 15,
  FANTASY_POSITIONS: ["QB", "RB", "WR", "TE", "K", "DEF"],
  SLEEPER_CACHE_KEY: "auctionBoard.sleeperPlayers.v1",
  SLEEPER_CACHE_HOURS: 12
};

function isConfigured() {
  return CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL.indexOf("http") === 0;
}

// ---------------------------------------------------------------------------
// Nav bar — injected on every page so there's one place to edit it.
// ---------------------------------------------------------------------------
function renderNav(activePage) {
  const mount = document.getElementById("topbar");
  if (!mount) return;
  const links = [
    { href: "index.html", label: "Submit pick", key: "submit" },
    { href: "auction-log.html", label: "Auction log", key: "log" },
    { href: "teams.html", label: "Team board", key: "teams" }
  ];
  const linksHtml = links
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.key === activePage ? "active" : ""}">${l.label}</a>`
    )
    .join("");
  mount.innerHTML = `
    <div class="topbar-inner">
      <div class="brand">Auction <span>Draft Board</span></div>
      <nav class="tabs">${linksHtml}</nav>
    </div>
  `;
}

function renderSetupNoteIfNeeded(container) {
  if (isConfigured() || !container) return;
  const div = document.createElement("div");
  div.className = "setup-note";
  div.innerHTML = `This board isn't connected to a Google Sheet yet. Open <code>app.js</code> and set
    <code>CONFIG.APPS_SCRIPT_URL</code> to your deployed Apps Script Web App URL — see
    <code>README.md</code> for the setup steps.`;
  container.prepend(div);
}

// ---------------------------------------------------------------------------
// Money formatting
// ---------------------------------------------------------------------------
function money(n) {
  const v = Number(n) || 0;
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Apps Script API
// ---------------------------------------------------------------------------
async function fetchBoardData() {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "GET" });
  if (!res.ok) throw new Error("Could not reach the Google Sheet (HTTP " + res.status + ")");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data; // { teams, log, draftedIds }
}

async function submitPick(pick) {
  // Sent as text/plain to avoid a CORS preflight request, which Apps Script
  // web apps don't handle. The server still parses it as JSON.
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(pick)
  });
  if (!res.ok) throw new Error("Could not reach the Google Sheet (HTTP " + res.status + ")");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data; // { success, data }
}

// ---------------------------------------------------------------------------
// Sleeper players — fetched once, trimmed to what we need, cached locally.
// ---------------------------------------------------------------------------
async function loadSleeperPlayers() {
  const cached = readSleeperCache();
  if (cached) return cached;

  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  if (!res.ok) throw new Error("Could not load the Sleeper player list (HTTP " + res.status + ")");
  const raw = await res.json();

  const players = [];
  for (const id in raw) {
    const p = raw[id];
    if (!p || p.active !== true) continue;
    if (CONFIG.FANTASY_POSITIONS.indexOf(p.position) === -1) continue;
    const name =
      p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || id;
    players.push({
      id: String(p.player_id || id),
      name: p.position === "DEF" ? name + " D/ST" : name,
      team: p.team || "FA",
      position: p.position,
      searchRank: typeof p.search_rank === "number" ? p.search_rank : null
    });
  }

  players.sort((a, b) => {
    const ra = a.searchRank === null ? Infinity : a.searchRank;
    const rb = b.searchRank === null ? Infinity : b.searchRank;
    return ra - rb;
  });

  writeSleeperCache(players);
  return players;
}

function readSleeperCache() {
  try {
    const raw = localStorage.getItem(CONFIG.SLEEPER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageHours = (Date.now() - parsed.savedAt) / 36e5;
    if (ageHours > CONFIG.SLEEPER_CACHE_HOURS) return null;
    return parsed.players;
  } catch (e) {
    return null;
  }
}

function writeSleeperCache(players) {
  try {
    localStorage.setItem(
      CONFIG.SLEEPER_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), players })
    );
  } catch (e) {
    // Storage full or unavailable — fine, we just re-fetch next time.
  }
}
