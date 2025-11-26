/* ------------------------------------------------------------
   FIREBASE INIT
------------------------------------------------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyCrclPpgN8jAZ6KjMa2dD2ia97HhN9yq2o",
  authDomain: "leo-study-app.firebaseapp.com",
  projectId: "leo-study-app",
  storageBucket: "leo-study-app.firebasestorage.app",
  messagingSenderId: "877469644202",
  appId: "1:877469644202:web:4af50e10f8c09cf7eee7d3",
  measurementId: "G-BJ1Z3ZY01M"
};

firebase.initializeApp(firebaseConfig);

let auth = firebase.auth();
let db   = firebase.firestore();
let currentUser = null;

/* NEW */
let guestMode = true;  



/* ------------------------------------------------------------
   SOUND
------------------------------------------------------------ */
function playSFX(id){
  const audio = document.getElementById(id);
  if(!audio) return;
  audio.currentTime = 0;
  audio.play().catch(()=>{});
}



/* ------------------------------------------------------------
   AMBIENCE
------------------------------------------------------------ */
let ambienceStarted = false;

function unlockAmbience() {
  if (ambienceStarted) return;
  ambienceStarted = true;

  const amb = document.getElementById("bgAmbience");
  if (!amb) return;

  amb.volume = 0.15;

  amb.play()
    .then(() => console.log("AMBIENCE PLAYING"))
    .catch(err => console.log("AMBIENCE ERROR:", err));
}

document.addEventListener("click", unlockAmbience, { once: true });
document.addEventListener("touchstart", unlockAmbience, { once: true });



/* ------------------------------------------------------------
   POPUPS / TOAST
------------------------------------------------------------ */
function popup(msg){
  const p = document.getElementById("popup");
  if(!p) return;
  p.innerText = msg;
  p.style.display = "block";
  setTimeout(()=>p.style.display="none",2000);
}

function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(()=>t.style.display="none",2000);
}



/* ------------------------------------------------------------
   SYNC STATUS
------------------------------------------------------------ */
function updateSyncStatus(msg){
  const el = document.getElementById("syncStatus");
  if(!el) return;

  el.innerText = `SYNC: ${msg}`;
  el.classList.add("good");
  setTimeout(() => el.classList.remove("good"), 500);
}



/* NEW — block actions for guests */
function requireLogin(){
  popup("Login required to save progress!");
  return false;
}



/* ------------------------------------------------------------
   VARIABLES
------------------------------------------------------------ */
let xp = 0;
let totalXP = 0;
let xpBase = 0;
let levelXP = 0;
let level = 1;
let xpNeeded = 500;

let minutes = 0;
let streak = 0;
let lastStudyDay = null;

let prestige = 0;
let xpMultiplier = 1;

const PRESTIGE_UNLOCK = 20;

let badgesUnlocked = {};
let missionLocal = {};

let rewards = [
  { id:"r1", name:"1 Hour Break Pass", cost:300, type:"consumable", uses:0, unlocked:false },
  { id:"r2", name:"Double XP (1 Session)", cost:500, type:"session", active:false, unlocked:false },
  { id:"r3", name:"Skip Mission", cost:700, type:"consumable", uses:0, unlocked:false },
  { id:"r4", name:"Epic Theme Color", cost:1000, type:"permanent", unlocked:false },
  { id:"r5", name:"Legendary Badge", cost:2000, type:"badge", unlocked:false }
];

let badges = [
  { id:"L5", name:"Beginner’s Mark", desc:"Reach Level 5", icon:"⬆️", check:()=>level>=5 },
  { id:"L20", name:"Rising Force", icon:"🔷", desc:"Reach Level 20", check:()=>level>=20 },
  { id:"L50", name:"Elite Grinder", icon:"💠", desc:"Reach Level 50", check:()=>level>=50 },
  { id:"L100",name:"Master’s Path", icon:"🏆", desc:"Reach Level 100", check:()=>level>=100 },

  { id:"P1", name:"Prestiged I", icon:"🔁", desc:"Prestige once", check:()=>prestige>=1 },
  { id:"P5", name:"Prestiged V", icon:"🔄", desc:"Prestige 5 times", check:()=>prestige>=5 },

  { id:"T10", name:"Active", icon:"⏱️", desc:"Study 10 minutes", check:()=>minutes>=10 },
  { id:"T60", name:"Grinder", icon:"⌛", desc:"Study 1 hour", check:()=>minutes>=60 },

  { id:"S3", name:"On a Roll", icon:"🔥", desc:"3-day streak", check:()=>streak>=3 },
  { id:"S7", name:"One Week", icon:"💥", desc:"7-day streak", check:()=>streak>=7 },

  { id:"XP10K", name:"XP Hunter", icon:"💎", desc:"10k XP", check:()=>totalXP>=10000 },

  { id:"GOD", name:"Ascendant", icon:"🌈", desc:"Unlock all badges",
    check:()=>badges.filter(b=>b.id!=="GOD").every(b=>badgesUnlocked[b.id]) }
];



/* ------------------------------------------------------------
   CLOUD SAVE  (GUEST MODE PROTECTED)
------------------------------------------------------------ */
async function saveCloud(){
  if(guestMode || !currentUser){
    updateSyncStatus("GUEST");
    return;
  }

  await db.collection("users").doc(currentUser.uid).set({
    xp,totalXP,xpBase,levelXP,level,xpNeeded,
    minutes,streak,lastStudyDay,
    prestige,xpMultiplier:(1+prestige*0.25),
    badgesUnlocked,
    missionLocal,
    rewards,
    updatedAt:new Date().toISOString()
  },{merge:true});

  updateSyncStatus("OK");
}



/* ------------------------------------------------------------
   LOAD CLOUD (GUEST-SAFE)
------------------------------------------------------------ */
async function loadCloud(){
  if(guestMode || !currentUser) return;

  const doc = await db.collection("users").doc(currentUser.uid).get();
  if(!doc.exists){
    await saveCloud();
    return;
  }

  const d = doc.data() || {};

  xp = d.xp ?? xp;
  totalXP = d.totalXP ?? totalXP;
  xpBase = d.xpBase ?? xpBase;
  levelXP = d.levelXP ?? levelXP;
  level = d.level ?? level;
  xpNeeded = d.xpNeeded ?? xpNeeded;

  minutes = d.minutes ?? minutes;
  streak = d.streak ?? streak;
  lastStudyDay = d.lastStudyDay ?? lastStudyDay;

  prestige = d.prestige ?? prestige;
  xpMultiplier = 1 + prestige * 0.25;

  badgesUnlocked = d.badgesUnlocked ?? {};
  missionLocal = d.missionLocal ?? {};
  rewards = Array.isArray(d.rewards) ? d.rewards : rewards;

  updateAllUI();
}



/* ------------------------------------------------------------
   XP SYSTEM
------------------------------------------------------------ */
function calcXP(min){
  min *= 1.5;
  if(min<=20) return min*1;
  if(min<=60) return 20 + (min-20)*2;
  return 20 + 40 + (min-60)*3;
}

function addMinutes(m){
  minutes += m;
  addXP(calcXP(m));
  updateStreak();
  checkBadges();
}

function addXP(amount){
  const gain = Math.floor(amount * xpMultiplier);
  xp += gain;
  totalXP += gain;
  levelXP = xp - xpBase;

  while(levelXP >= xpNeeded){
    levelXP -= xpNeeded;
    xpBase += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.10);
    popup("LEVEL UP!");
  }

  updateAllUI();
  saveCloud();
  popup(`+${gain} XP`);
}



/* ------------------------------------------------------------
   PRESTIGE (GUEST BLOCKED)
------------------------------------------------------------ */
function tryPrestige(){
  if(guestMode) return requireLogin();
  if(level < PRESTIGE_UNLOCK)
    return popup(`Reach Level ${PRESTIGE_UNLOCK} to Prestige`);
  doPrestige();
}

function doPrestige(){
  prestige++;
  xpMultiplier = 1 + prestige * 0.25;

  xp = 0;
  xpBase = 0;
  levelXP = 0;
  xpNeeded = 500;
  level = 1;

  updateAllUI();
  checkBadges();
  saveCloud();
  popup(`✨ Prestige ${prestige}!`);
}



/* ------------------------------------------------------------
   STREAK
------------------------------------------------------------ */
function updateStreak(){
  const today = new Date().toDateString();

  if(lastStudyDay !== today){
    streak++;
    lastStudyDay = today;
    popup(`🔥 Streak: ${streak} days`);
  }

  document.getElementById("streakCount").innerText = `${streak} days`;
  saveCloud();
}



/* ------------------------------------------------------------
   BADGES
------------------------------------------------------------ */
function checkBadges(){
  badges.forEach(b=>{
    if(!badgesUnlocked[b.id] && b.check()){
      badgesUnlocked[b.id] = true;
      popup(`🏆 ${b.name}`);
    }
  });
  renderBadges();
  saveCloud();
}

function renderBadges(){
  const grid = document.getElementById("badgeGrid");
  if(!grid) return;

  grid.innerHTML = "";

  badges.forEach(b=>{
    const unlocked = badgesUnlocked[b.id];

    grid.innerHTML += `
      <div class="badge-tile ${unlocked?'unlocked':'locked'}">
        <div class="badge-icon">${b.icon}</div>
        <div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>
      </div>
    `;
  });
}



/* ------------------------------------------------------------
   REWARDS  (GUEST BLOCKED)
------------------------------------------------------------ */
function updateRewardsDisplay(){
  const shop = document.getElementById("shop");
  document.getElementById("xpDisplay").innerText = xp;

  shop.innerHTML = "";

  rewards.forEach(r=>{
    let rarity =
      r.cost>=2000 ? "reward-legendary" :
      r.cost>=1000 ? "reward-epic" :
      r.cost>=500  ? "reward-rare" :
                    "reward-common";

    shop.innerHTML += `
      <div class="rewardItem ${rarity}">
        <span>${r.name}</span>
        ${
          r.unlocked
          ? `<span class="unlockedTag">✓ UNLOCKED</span>`
          : `<button class="buyBtn" onclick="buyReward('${r.id}')">${r.cost} XP</button>`
        }
      </div>
    `;
  });
}

function buyReward(id){
  if(guestMode) return requireLogin();

  let r = rewards.find(x=>x.id===id);
  if(!r) return;

  if(xp < r.cost) return popup("Not enough XP!");

  xp -= r.cost;
  r.unlocked = true;

  saveCloud();
  updateAllUI();
  popup(`Unlocked: ${r.name}!`);
}

function updateAllUI(){
  updateXPBar();
  updateRewardsDisplay();
  renderBadges();
  updateLoggedUserBar(currentUser);
}

/* ------------------------------------------------------------
   UI UPDATE
------------------------------------------------------------ */
function updateXPBar(){
  document.getElementById("levelNum").innerText = level;
  document.getElementById("xpText").innerText = `${xp} XP`;
  document.getElementById("prestigeInfo").innerText = `Prestige ${prestige} • x${xpMultiplier.toFixed(2)} XP`;
  document.getElementById("totalXPText").innerText = `Total XP: ${totalXP}`;

  const pct = ((xp - xpBase) / xpNeeded) * 100;
  document.getElementById("xpFill").style.width = Math.min(100,pct) + "%";
}

function updateLoggedUserBar(user){
  const bar = document.getElementById("loggedUserBar");
  if(!bar) return;

  if(guestMode || !user){
    bar.innerText = "GUEST MODE";
    bar.style.opacity = "0.5";
    return;
  }

  bar.innerText = `LOGGED IN: ${user.email}`;
  bar.style.opacity = "1";
}

/* ------------------------------------------------------------
   MENU / SCREENS
------------------------------------------------------------ */
function refreshMenu(){
  const guestBtn = document.getElementById("guestLoginBtn");

  if(guestMode){
    guestBtn.style.display = "block";
  } else {
    guestBtn.style.display = "none";
  }
}

function openScreen(id){
  playSFX("sfxClick");
  document.getElementById("menu").style.display = "none";

  document.querySelectorAll(".screen").forEach(s=>s.style.display="none");

  const bar = document.getElementById("loggedUserBar");
  if(bar){
    bar.style.opacity = "0";
    bar.style.pointerEvents = "none";
  }

  document.getElementById(id).style.display = "block";
}

function closeScreen(id){
  playSFX("sfxClick");

  document.getElementById(id).style.display = "none";
  document.getElementById("menu").style.display = "flex";

  const bar = document.getElementById("loggedUserBar");
  if(currentUser && bar){
    bar.style.opacity = "1";
    bar.style.pointerEvents = "auto";
  }
}



/* ------------------------------------------------------------
   AUTH
------------------------------------------------------------ */
function registerUser(){
  const email=document.getElementById("regEmail").value;
  const pass=document.getElementById("regPassword").value;

  if(!email||!pass) return alert("Enter details");

  auth.createUserWithEmailAndPassword(email,pass)
  .then(async user=>{
    currentUser = user.user;
    guestMode = false;
    await saveCloud();
    refreshMenu();
    closeScreen("registerScreen");
  }).catch(e=>alert(e.message));
}

function loginUser(){
  const email=document.getElementById("loginEmail").value;
  const pass=document.getElementById("loginPassword").value;

  if(!email||!pass) return alert("Enter details");

  auth.signInWithEmailAndPassword(email,pass)
  .then(async user=>{
    currentUser = user.user;
    guestMode = false;
    await loadCloud();
    refreshMenu();
    closeScreen("loginScreen");
  }).catch(e=>alert(e.message));
}

function logout() {
  auth.signOut().then(() => {
    localStorage.clear();

    xp = 0;
    totalXP = 0;
    level = 1;
    streak = 0;
    prestige = 0;

    try { document.getElementById("bgAmbience").pause(); } catch(e){}

    guestMode = true;
    currentUser = null;

    showToast("Logged out");
    location.reload();
  });
}



/* ------------------------------------------------------------
   AUTH LISTENER
------------------------------------------------------------ */
auth.onAuthStateChanged(async user=>{
  currentUser = user || null;

  if(user){
    guestMode = false;
    await loadCloud();
  } else {
    guestMode = true;
  }

  updateAllUI();
  refreshMenu();
});



/* ------------------------------------------------------------
   DEV RESET MISSIONS
------------------------------------------------------------ */
function devResetMissions() {
  localStorage.removeItem("missionLocal");
  popup("Missions reset locally");
}
