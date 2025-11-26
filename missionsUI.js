/* =====================================================================
   STUDY ADDICT — FIXED MISSIONS SYSTEM
   Daily + Weekly tracking • Correct progress • Auto reset · No bugs
===================================================================== */

/* ------------------------------------------------------------
   STORAGE FOR RESET (local only, not cloud)
------------------------------------------------------------ */
let missionLocal = JSON.parse(localStorage.getItem("missionLocal")) || {
  dailyMin: 0,
  dailyXP: 0,
  lastDaily: null,

  weeklyMin: 0,
  weeklyXP: 0,
  lastWeekly: null
};

function saveMissionLocal() {
  localStorage.setItem("missionLocal", JSON.stringify(missionLocal));
}

/* ------------------------------------------------------------
   AUTO RESET SYSTEM
------------------------------------------------------------ */
function checkMissionResets() {
  const today = new Date().toDateString();

  // DAILY RESET
  if (missionLocal.lastDaily !== today) {
    missionLocal.dailyMinutes = 0;
    missionLocal.dailyXP = 0;
    missionLocal.lastDaily = today;

    dailyMissions.forEach(m => {
      m.done = false;
      m.claimed = false;
    });
  }

  // WEEKLY RESET — Monday
  const now = new Date();
  const weekID = `${now.getFullYear()}-${now.getWeek?.() ?? now.getMonth()}-${now.getDay()}`;

  if (missionLocal.lastWeekly !== weekID && now.getDay() === 1) {
    missionLocal.weeklyMinutes = 0;
    missionLocal.weeklyXP = 0;
    missionLocal.lastWeekly = weekID;

    weeklyMissions.forEach(m => {
      m.done = false;
      m.claimed = false;
    });
  }

  saveMissionLocal();
}

/* ------------------------------------------------------------
   OVERRIDE addMinutes + addXP CONNECTION
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  checkMissionResets();
});

/* CALLED BY app.js AFTER XP GAIN */
function missionTrackMinutes(min) {
  missionLocal.dailyMin += min;
  missionLocal.weeklyMin += min;
  saveMissionLocal();
}

function missionTrackXP(xp) {
  missionLocal.dailyXP += xp;
  missionLocal.weeklyXP += xp;
  saveMissionLocal();
}

/* ------------------------------------------------------------
   BLUEPRINTS
------------------------------------------------------------ */
const dailyMissions = [
  { id: "d1", title: "Study 20 minutes", need: 20, type: "dailyMinutes", xp: 80, done: false, claimed: false },
  { id: "d2", title: "Study 1 hour", need: 60, type: "dailyMinutes", xp: 200, done: false, claimed: false },
  { id: "d3", title: "Earn 150 XP", need: 150, type: "dailyXP", xp: 150, done: false, claimed: false }
];

const weeklyMissions = [
  { id: "w1", title: "Study 3 hours", need: 180, type: "weeklyMinutes", xp: 350, done: false, claimed: false },
  { id: "w2", title: "Earn 1000 XP", need: 1000, type: "weeklyXP", xp: 500, done: false, claimed: false },
  { id: "w3", title: "7-day streak", need: 7, type: "streak", xp: 800, done: false, claimed: false },
  { id: "w4", title: "Study 6 hours", need: 360, type: "weeklyMinutes", xp: 1200, done: false, claimed: false }
];

/* ------------------------------------------------------------
   PROGRESS CALCULATOR (FIXED!)
------------------------------------------------------------ */
function getMissionProgress(m) {
  let current = 0;

  if (m.type === "dailyMinutes") current = missionLocal.dailyMinutes;
  if (m.type === "weeklyMinutes") current = missionLocal.weeklyMinutes;
  if (m.type === "dailyXP") current = missionLocal.dailyXP;
  if (m.type === "weeklyXP") current = missionLocal.weeklyXP;
  if (m.type === "streak") current = streak;

  const percent = Math.min(100, Math.floor((current / m.need) * 100));

  return { value: current, percent };
}

/* ------------------------------------------------------------
   MAIN UPDATE CALL (CALLED FROM app.js)
------------------------------------------------------------ */
function updateMissionProgress() {
  checkMissionResets();

  [...dailyMissions, ...weeklyMissions].forEach(m => {
    const p = getMissionProgress(m);
    if (!m.done && p.value >= m.need) {
      m.done = true;
    }
  });

  renderMissionsUI();
}

/* ------------------------------------------------------------
   RENDER UI
------------------------------------------------------------ */
function renderMissionsUI() {
  const screen = document.getElementById("missionsScreen");

  let html = `
    <div class="back" onclick="closeScreen('missionsScreen')">BACK</div>
    <h1 class="section-title">DAILY MISSIONS</h1>
    <div class="mission-list">
  `;

  dailyMissions.forEach(m => html += missionCard(m));

  html += `
    </div>
    <h1 class="section-title">WEEKLY MISSIONS</h1>
    <div class="mission-list">
  `;

  weeklyMissions.forEach(m => html += missionCard(m));

  html += `</div>`;

  screen.innerHTML = html;
}

/* ------------------------------------------------------------
   CARD BUILDER
------------------------------------------------------------ */
function missionCard(m) {
  const p = getMissionProgress(m);

  // Correct unit label
  let unit = "units";
  if (m.type.includes("Minutes")) unit = "min";
  else if (m.type.includes("XP")) unit = "XP";
  else if (m.type === "streak") unit = "days";

  return `
    <div class="mission-card ${m.done ? "complete" : ""}">
      <div class="mission-info">
        <h2>${m.title}</h2>
        <p>${p.value}/${m.need} ${unit}</p>

        <div class="mission-bar">
          <div class="mission-fill" style="width:${p.percent}%"></div>
        </div>
      </div>

      ${
        m.claimed
          ? `<button class="claim-btn claimed">CLAIMED</button>`
          : m.done
          ? `<button class="claim-btn" onclick="claimMission('${m.id}')">CLAIM</button>`
          : `<button class="claim-btn locked">...</button>`
      }
    </div>
  `;
}

/* ------------------------------------------------------------
   CLAIM
------------------------------------------------------------ */
function claimMission(id) {
  let m = dailyMissions.find(x => x.id === id) ||
          weeklyMissions.find(x => x.id === id);

  if (!m) return;
  if (!m.done) return popup("Mission not completed!");
  if (m.claimed) return popup("Already claimed!");

  playSFX("sfxMission");
  m.claimed = true;
  addXP(m.xp);
  spawnMissionXP(id, `+${m.xp} XP`);

  renderMissionsUI();
}

/* ------------------------------------------------------------
   XP FLOATING POP-UP
------------------------------------------------------------ */
function spawnMissionXP(id, text) {
  const btn = document.querySelector(`[onclick="claimMission('${id}')"]`);
  if (!btn) return;

  const card = btn.closest(".mission-card");
  if (!card) return;

  const fx = document.createElement("div");
  fx.className = "mission-xp-pop";
  fx.innerText = text;

  card.appendChild(fx);
  setTimeout(() => fx.remove(), 900);
}

/* ------------------------------------------------------------
   INIT LOAD
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  checkMissionResets();
  renderMissionsUI();
});
/* ------------------------------------------------------------
   HIDDEN DEV RESET — HOLD BACK 3 SECONDS
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.querySelector("#missionsScreen .back");
  if (!backBtn) return;

  let holdTimer = null;

  backBtn.addEventListener("touchstart", startHold);
  backBtn.addEventListener("mousedown", startHold);

  backBtn.addEventListener("touchend", cancelHold);
  backBtn.addEventListener("mouseup", cancelHold);
  backBtn.addEventListener("mouseleave", cancelHold);

  function startHold() {
    holdTimer = setTimeout(() => {
      localStorage.removeItem("missionLocal");
      popup("Missions Reset");
      updateMissionProgress();
    }, 3000); // 3 seconds
  }

  function cancelHold() {
    clearTimeout(holdTimer);
  }
});
