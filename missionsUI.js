/* ============================================================
   LEO STUDY APP — MISSIONS UI SYSTEM (v1.0 Clean Rewrite)
   Handles ONLY:
   - Mission completion visuals
   - Claiming XP rewards
   - XP particles
   - Card animations
   No XP logic, no streak logic — all in app.js.
   ============================================================ */


/* ------------------------------------------------------------
   UPDATE MISSION PROGRESS (UI ONLY)
------------------------------------------------------------ */
function updateMissionProgress() {

    // DAILY MISSIONS
    if (minutes >= 20)
        markMission("mission1");

    if (minutes >= 60)
        markMission("mission2");

    if (totalXP >= 150)
        markMission("mission3");


    // WEEKLY MISSIONS
    if (minutes >= 180)
        markMission("mission4");

    if (totalXP >= 1000)
        markMission("mission5");

    if (streak >= 7)
        markMission("mission6");

    if (minutes >= 360)
        markMission("mission7");
}


/* ------------------------------------------------------------
   MARK A MISSION COMPLETED (UI ONLY)
------------------------------------------------------------ */
function markMission(id){
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.add("completed");
}


/* ------------------------------------------------------------
   CLAIM A MISSION
------------------------------------------------------------ */
function claimCardMission(cardId, rewardXP) {

    const card = document.getElementById(cardId);
    if (!card) return;

    const btn = card.querySelector(".claim-btn");
    if (!btn) return;

    // Prevent cheating
    if (!card.classList.contains("completed"))
        return popup("Mission not completed!");

    if (btn.classList.contains("disabled"))
        return popup("Already claimed!");

    // Reward
    addXP(rewardXP);

    // Update button
    btn.classList.add("disabled");
    btn.innerText = "CLAIMED";

    // Flash effect
    card.classList.add("flash");
    setTimeout(()=> card.classList.remove("flash"), 600);

    // XP particle effect
    spawnXPParticle(card, `+${rewardXP}`);
}


/* ------------------------------------------------------------
   XP PARTICLE EFFECT
------------------------------------------------------------ */
function spawnXPParticle(card, text){

    const p = document.createElement("div");
    p.classList.add("xp-pop");
    p.innerText = text;

    card.appendChild(p);

    setTimeout(()=> p.remove(), 700);
}


/* ------------------------------------------------------------
   LEGACY SUPPORT FUNCTION
------------------------------------------------------------ */
function displayMissions(){
    // Not used anymore — kept for compatibility
}