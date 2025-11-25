/* =====================================================================
   STUDY ADDICT — NEXT-GEN MISSIONS SYSTEM
   Neon progress bars • Animated claim • Auto tracking • XP particles
===================================================================== */

/* -----------------------------------------
   MISSION BLUEPRINTS
------------------------------------------ */

// DAILY MISSIONS
const dailyMissions = [
  { id: "d1", title: "Study 20 minutes", need: 20, type: "minutes", xp: 80, done: false },
  { id: "d2", title: "Study 1 hour", need: 60, type: "minutes", xp: 200, done: false },
  { id: "d3", title: "Earn 150 XP", need: 150, type: "xp", xp: 150, done: false }
];

// WEEKLY MISSIONS
const weeklyMissions = [
  { id: "w1", title: "Study 3 hours", need: 180, type: "minutes", xp: 350, done: false },
  { id: "w2", title: "Earn 1000 XP", need: 1000, type: "xp", xp: 500, done: false },
  { id: "w3", title: "7-day streak", need: 7, type: "streak", xp: 800, done: false },
  { id: "w4", title: "Study 6 hours", need: 360, type: "minutes", xp: 1200, done: false }
];


/* -----------------------------------------
   AUTO-CHECK PROGRESS
------------------------------------------ */
function updateMissionProgress() {

  // DAILY
  dailyMissions.forEach(m => {
    if (!m.done) {
      if (m.type === "minutes" && minutes >= m.need) m.done = true;
      if (m.type === "xp" && totalXP >= m.need) m.done = true;
    }
  });

  // WEEKLY
  weeklyMissions.forEach(m => {
    if (!m.done) {
      if (m.type === "minutes" && minutes >= m.need) m.done = true;
      if (m.type === "xp" && totalXP >= m.need) m.done = true;
      if (m.type === "streak" && streak >= m.need) m.done = true;
    }
  });

  renderMissionsUI();
}


/* -----------------------------------------
   RENDER MISSIONS UI IN SCREEN
------------------------------------------ */
function renderMissionsUI() {
  const screen = document.getElementById("missionsScreen");

  let html = `
    <div class="back" onclick="closeScreen('missionsScreen')">BACK</div>
    <h1 class="section-title">DAILY MISSIONS</h1>
    <div class="mission-list">
  `;

  dailyMissions.forEach(m => {
    html += missionCard(m);
  });

  html += `
    </div>
    <h1 class="section-title">WEEKLY MISSIONS</h1>
    <div class="mission-list">
  `;

  weeklyMissions.forEach(m => {
    html += missionCard(m);
  });

  html += `</div>`;

  screen.innerHTML = html;
}


/* -----------------------------------------
   BUILD INDIVIDUAL MISSION CARD
------------------------------------------ */
function missionCard(m) {
  const p = getMissionProgress(m);

  return `
    <div class="mission-card ${m.done ? 'complete' : ''}">
      <div class="mission-info">
        <h2>${m.title}</h2>
        <p>${p.value}/${m.need} ${m.type === 'minutes' ? 'min' : m.type === 'xp' ? 'XP' : 'days'}</p>
        
        <div class="mission-bar">
          <div class="mission-fill" style="width:${p.percent}%;"></div>
        </div>
      </div>

      ${m.done ? `
        <button class="claim-btn" onclick="claimMission('${m.id}')">CLAIM</button>
      ` : `
        <button class="claim-btn locked">...</button>
      `}
    </div>
  `;
}


/* -----------------------------------------
   PROGRESS CALCULATOR
------------------------------------------ */
function getMissionProgress(m) {
  let current = 0;

  if (m.type === "minutes") current = minutes;
  if (m.type === "xp") current = totalXP;
  if (m.type === "streak") current = streak;

  const percent = Math.min(100, Math.floor((current / m.need) * 100));

  return { value: current, percent };
}


/* -----------------------------------------
   CLAIM MISSION
------------------------------------------ */
function claimMission(id) {
  let m = dailyMissions.find(x => x.id === id) ||
          weeklyMissions.find(x => x.id === id);

  if (!m || !m.done) return popup("Mission not completed!");

  playSFX("sfxMission");
  addXP(m.xp);

  // animate
  spawnMissionXP(id, `+${m.xp} XP`);

  m.done = "claimed";

  renderMissionsUI();
}


/* -----------------------------------------
   XP FLOAT ANIMATION
------------------------------------------ */
function spawnMissionXP(id, text) {
  const card = document.querySelector(`[onclick="claimMission('${id}')"]`)?.closest(".mission-card");
  if (!card) return;

  const fx = document.createElement("div");
  fx.className = "mission-xp-pop";
  fx.innerText = text;

  card.appendChild(fx);

  setTimeout(() => fx.remove(), 800);
}


/* -----------------------------------------
   INIT WHEN PAGE LOADS
------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  renderMissionsUI();
});------------------------------------------------------------ */
function displayMissions(){
    // Not used anymore — kept for compatibility
}
