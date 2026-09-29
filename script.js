/* =============================================
   INSOMNIA KILLER — script.js
   ============================================= */

// ── CONFIG ──────────────────────────────────
const TEST_HOUR = null; // set to e.g. 23 to simulate time

// ── WEEKLY DATA ──────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function loadWeeklyData(){
  try {
    const stored = localStorage.getItem('ik_weekly_data');
    const storedWeek = localStorage.getItem('ik_data_week');
    const thisWeek = getWeekKey();
    if(stored && storedWeek === thisWeek){
      return JSON.parse(stored);
    }
  } catch(e){}
  return [1.2, 3.4, 2.8, 4.1, 1.5, 2.9, 3.3];
}

function getWeekKey(){
  const d = new Date();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay()+6)%7));
  return mon.toISOString().slice(0,10);
}

function saveWeeklyData(){
  try {
    localStorage.setItem('ik_weekly_data', JSON.stringify(weeklyData));
    localStorage.setItem('ik_data_week', getWeekKey());
  } catch(e){}
}

function loadGoodWeekStreak(){
  try {
    const s = localStorage.getItem('ik_good_streak');
    return s ? parseInt(s,10) : 0;
  } catch(e){ return 0; }
}
function saveGoodWeekStreak(n){
  try { localStorage.setItem('ik_good_streak', String(n)); } catch(e){}
}

const weeklyData = loadWeeklyData();
let goodWeekStreak = loadGoodWeekStreak();

// ── SCREEN TIME ──────────────────────────────
const sessionStart = Date.now();
let sessionSeconds = 0;

function pad(n){ return String(n).padStart(2,'0'); }

function formatTime(s){
  return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
}

function getTodayIndex(){
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function updateScreenTime(){
  sessionSeconds = Math.floor((Date.now()-sessionStart)/1000);
  const fmt = formatTime(sessionSeconds);

  const strip = document.getElementById('screen-time-strip');
  if(strip) strip.textContent = fmt;
  const big = document.getElementById('screen-time-big');
  if(big) big.textContent = fmt;

  const hours = sessionSeconds / 3600;
  const warn = document.getElementById('screen-time-warning');
  if(warn){
    if(hours < 1)       warn.textContent = '✅ Great — under 1 hour. Keep it up!';
    else if(hours < 2)  warn.textContent = '⚠️ Approaching 2 hours. Consider a break.';
    else if(hours < 4)  warn.textContent = '🔶 Over 2 hours — your eyes need rest.';
    else                warn.textContent = '🔴 Over 4 hours! Please put the screen down.';
  }

  const pct = Math.min(100,(sessionSeconds/14400)*100);
  const circ = 213.6;
  const ring = document.getElementById('st-ring-fill');
  if(ring){
    ring.style.strokeDashoffset = circ-(pct/100)*circ;
    ring.style.stroke = pct<25?'#22c55e':pct<50?'#fbbf24':pct<75?'#f97316':'#ef4444';
  }
  const pctEl = document.getElementById('st-ring-pct');
  if(pctEl) pctEl.textContent = Math.round(pct)+'%';

  weeklyData[getTodayIndex()] = parseFloat((sessionSeconds/3600).toFixed(2));
  saveWeeklyData();
}

// ── NAVIGATION ───────────────────────────────
function showPage(name, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(btn) btn.classList.add('active');
  if(name==='report') renderCharts();
}

// ── STARS ────────────────────────────────────
function generateStars(){
  const layer = document.getElementById('stars-layer');
  for(let i=0;i<120;i++){
    const s = document.createElement('div');
    s.className = 'star-dot';
    const sz = Math.random()*3+1;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*4}s;animation-duration:${2+Math.random()*3}s;`;
    layer.appendChild(s);
  }
}

// ── VOICE OUTPUT ─────────────────────────────
function speak(text, rate=0.9, pitch=1){
  if(!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = rate;
  utt.pitch = pitch;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

// ── CLOCK & COLOR ────────────────────────────
let midnightTriggered = false;
let noonAnnouncedToday = false;
let lateNightAnnouncedToday = false;
let lateNightPanelShown = false;
let voiceAnnouncedHours = {};

function getTimeData(){
  const now = new Date();
  const h = TEST_HOUR !== null ? TEST_HOUR : now.getHours();
  return { h, m:now.getMinutes(), s:now.getSeconds(), now };
}

function computeMeterPercent(h,m){
  if(h >= 22) return Math.min(100,((h-22)*60+m)/120*100);
  if(h === 0) return 100;
  return 0;
}

function getStatusText(h){
  if(h>=0&&h<5)  return {icon:'🌙',text:"It's past midnight — seriously, please sleep."};
  if(h>=5&&h<9)  return {icon:'🌅',text:"Early morning — get some rest if you haven't."};
  if(h>=9&&h<18) return {icon:'☀️',text:"Daytime — you're fine to be online!"};
  if(h>=18&&h<21)return {icon:'🌆',text:'Evening — start winding down soon.'};
  if(h>=21&&h<23)return {icon:'🌛',text:'Getting late — prepare to rest.'};
  if(h===23)     return {icon:'⚠️',text:'Almost midnight — close those screens!'};
  return {icon:'🌸',text:'Sweet dreams await.'};
}

function applyYellow(){
  const root = document.documentElement;
  root.style.setProperty('--bg1',   'rgb(255,200,60)');
  root.style.setProperty('--bg2',   'rgb(255,220,80)');
  root.style.setProperty('--bg3',   'rgb(255,210,50)');
  root.style.setProperty('--accent','rgb(180,110,0)');
  root.style.setProperty('--text',  'rgb(60,35,0)');
  root.style.setProperty('--glow',  'rgba(220,160,0,0.5)');
}

function triggerMidnight(){
  if(midnightTriggered) return;
  midnightTriggered = true;
  document.body.classList.add('midnight');
  const ov = document.getElementById('midnight-overlay');
  ov.classList.add('flash');
  speak("It is midnight. Time to put your screen down and rest. Sweet dreams.", 0.85, 0.85);
  setTimeout(()=>{
    ov.style.opacity='0'; ov.style.transition='opacity 1.5s ease';
    setTimeout(()=>{ ov.classList.remove('flash'); ov.style.opacity=''; ov.style.transition=''; },1500);
  },4000);
}

function closeLateNightPanel(){
  const p = document.getElementById('late-night-panel');
  if(p) p.classList.add('hidden');
}

function showLateNightPanel(){
  const p = document.getElementById('late-night-panel');
  if(p){ p.classList.remove('hidden'); }
  if(!lateNightAnnouncedToday){
    lateNightAnnouncedToday = true;
    speak("It's getting late. Your eyes and mind need rest. Here are some relaxation options to help you wind down.", 0.88, 0.95);
  }
}

function tick(){
  const {h,m,s,now} = getTimeData();
  const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const lc=document.getElementById('live-clock'); if(lc) lc.textContent=timeStr;
  const bc=document.getElementById('big-clock');  if(bc) bc.textContent=timeStr;
  const dd=document.getElementById('dash-date');  if(dd) dd.textContent=dateStr;

  const pct = computeMeterPercent(h,m);
  const mf=document.getElementById('meter-fill'); if(mf) mf.style.width=pct+'%';

  const ml=document.getElementById('meter-label');
  if(ml) ml.textContent = pct===0
    ? 'Screen-free evening — your future self thanks you 🙏'
    : pct>=100 ? "🌙 Midnight reached — it's time to sleep now!"
    : `${Math.round(pct)}% shifted — ${Math.round(120-pct*1.2)} minutes to midnight`;

  const sb=document.getElementById('status-badge');
  const st=getStatusText(h);
  if(sb) sb.textContent=`${st.icon} ${st.text}`;

  const tips=['Dim your screen brightness now.','Blue light blocks melatonin. Rest your eyes.','The best sleep starts before midnight.','Put the phone down. Your bed misses you.','Sweet dreams are waiting for you.'];
  const tip=document.getElementById('sleep-tip');
  if(tip) tip.textContent=tips[Math.floor(Date.now()/8000)%tips.length];

  if(h===12 && m===0 && s < 5 && !noonAnnouncedToday){
    noonAnnouncedToday = true;
    speak("Good afternoon! It is 12 PM. Stay mindful of your screen time today for a healthier night's sleep.", 0.9, 1.05);
  }
  if(h !== 12) noonAnnouncedToday = false;

  if((h >= 22 || h === 0 || h === 1) && !lateNightPanelShown){
    lateNightPanelShown = true;
    setTimeout(showLateNightPanel, 2000);
  }
  if(h >= 5 && h < 22){
    lateNightPanelShown = false;
    lateNightAnnouncedToday = false;
  }

  const hourKey = `${h}`;
  if(m===0 && s < 5 && !voiceAnnouncedHours[hourKey]){
    voiceAnnouncedHours[hourKey] = true;
    const hourReminders = {
      21: "It's 9 PM. Time to start winding down for the night.",
      22: "It's 10 PM. Reduce your screen brightness and prepare for rest.",
      23: "It's 11 PM. Almost midnight. Please consider putting your screens away."
    };
    if(hourReminders[h]) speak(hourReminders[h], 0.88, 0.95);
  }

  if(h >= 22 && h < 24){
    document.body.classList.remove('midnight');
    applyYellow();
  } else if(h === 0){
    document.body.classList.add('midnight');
  } else {
    ['--bg1','--bg2','--bg3','--accent','--text','--glow'].forEach(v=>document.documentElement.style.removeProperty(v));
    document.body.classList.remove('midnight');
    midnightTriggered = false;
  }
  if(h===0&&m===0&&s<5) triggerMidnight();
}

// ── HOME BANNER ──────────────────────────────
function updateHomeBanner(){
  const avg = weeklyData.reduce((a,b)=>a+b,0)/weeklyData.length;
  let icon, label;
  if(avg<=3)      { icon='🟢'; label=`Avg ${avg.toFixed(1)}h · 🟢 Excellent`; }
  else if(avg<=5) { icon='🟡'; label=`Avg ${avg.toFixed(1)}h · 🟡 Average`;   }
  else            { icon='🔴'; label=`Avg ${avg.toFixed(1)}h · 🔴 High`;       }

  const nl=document.getElementById('nav-report-label');
  if(nl) nl.textContent=label;
  const dt=document.getElementById('dash-banner-title');
  if(dt) dt.textContent=`${icon} Weekly Sleep Report`;
  const dd=document.getElementById('dash-banner-desc');
  if(dd) dd.textContent=`Avg ${avg.toFixed(1)}h/day · Tap to view charts & verdict`;
}

function switchChart(type){
  document.getElementById('chart-bar').classList.toggle('hidden',type!=='bar');
  document.getElementById('chart-line').classList.toggle('hidden',type!=='line');
  document.getElementById('btn-bar').classList.toggle('active',type==='bar');
  document.getElementById('btn-line').classList.toggle('active',type==='line');
}

// ── RENDER CHARTS ────────────────────────────
function renderCharts(){
  updateScreenTime();
  renderBarChart();
  renderLineChart();
  renderStats();
}

// ── BAR CHART ────────────────────────────────
function renderBarChart(){
  const container = document.getElementById('bar-chart-render');
  const xLabels   = document.getElementById('bar-x-labels');
  const yAxis     = document.getElementById('bar-y-axis');
  if(!container) return;

  const CHART_H  = 200;
  const maxVal   = Math.max(...weeklyData, 1);
  const todayIdx = getTodayIndex();

  yAxis.innerHTML = '';
  for(let i=5;i>=0;i--){
    const lbl = document.createElement('span');
    lbl.textContent = ((maxVal/5)*i).toFixed(1)+'h';
    yAxis.appendChild(lbl);
  }

  container.innerHTML = '';
  weeklyData.forEach((val,i)=>{
    const targetPx = Math.max(6, (val/maxVal)*CHART_H);
    const col  = document.createElement('div');
    col.className = 'bar-col'+(i===todayIdx?' today':'');
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.height     = '6px';
    fill.style.transition = `height 0.75s cubic-bezier(0.34,1.45,0.64,1) ${i*90}ms`;
    fill.innerHTML = `<span class="bar-tooltip">${val.toFixed(1)}h</span>`;
    col.appendChild(fill);
    container.appendChild(col);
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ fill.style.height = targetPx+'px'; });
    });
  });

  if(xLabels){
    xLabels.innerHTML = '';
    DAYS.forEach((day,i)=>{
      const lbl = document.createElement('div');
      lbl.className = 'x-label'+(i===todayIdx?' today':'');
      lbl.textContent = day;
      xLabels.appendChild(lbl);
    });
  }
}

// ── LINE CHART ───────────────────────────────
function renderLineChart(){
  const svg = document.getElementById('line-chart-svg');
  if(!svg) return;

  const W=700,H=260,padL=48,padR=20,padT=20,padB=30;
  const chartW=W-padL-padR, chartH=H-padT-padB;
  const maxVal=Math.max(...weeklyData,1);
  const xStep=chartW/(weeklyData.length-1);
  const todayIdx=getTodayIndex();

  const pts=weeklyData.map((v,i)=>({
    x:padL+i*xStep,
    y:padT+chartH-(v/maxVal)*chartH
  }));

  const pathD='M '+pts.map(p=>`${p.x},${p.y}`).join(' L ');
  const areaD=`M ${pts[0].x},${padT+chartH} L ${pathD.slice(2)} L ${pts[pts.length-1].x},${padT+chartH} Z`;

  let gridHTML='';
  for(let i=0;i<=4;i++){
    const y=padT+(i/4)*chartH;
    const val=(maxVal-(maxVal/4)*i).toFixed(1);
    gridHTML+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    gridHTML+=`<text x="${padL-8}" y="${y+4}" font-size="10" fill="rgba(255,255,255,0.45)" text-anchor="end">${val}h</text>`;
  }

  let xHTML='';
  DAYS.forEach((day,i)=>{
    const x=padL+i*xStep;
    xHTML+=`<text x="${x}" y="${H-6}" font-size="11" fill="${i===todayIdx?'#ff85c2':'rgba(255,255,255,0.55)'}" text-anchor="middle" font-weight="${i===todayIdx?'700':'400'}">${day}</text>`;
  });

  let dotsHTML='';
  pts.forEach((p,i)=>{
    dotsHTML+=`<circle cx="${p.x}" cy="${p.y}" r="${i===todayIdx?7:5}" fill="${i===todayIdx?'#ff3a80':'var(--accent)'}" stroke="white" stroke-width="${i===todayIdx?2.5:1.5}"><title>${DAYS[i]}: ${weeklyData[i].toFixed(1)}h</title></circle>`;
  });

  svg.innerHTML=`
    <defs>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridHTML}
    <path d="${areaD}" fill="url(#lineGrad)"/>
    <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dotsHTML}
    ${xHTML}
  `;
}

// ── STATS ROW ────────────────────────────────
function renderStats(){
  const container=document.getElementById('stats-row');
  if(!container) return;
  const total=weeklyData.reduce((a,b)=>a+b,0);
  const avg=total/weeklyData.length;
  const maxDay=DAYS[weeklyData.indexOf(Math.max(...weeklyData))];
  const minDay=DAYS[weeklyData.indexOf(Math.min(...weeklyData))];
  const todayVal=weeklyData[getTodayIndex()];
  const stats=[
    {val:avg.toFixed(1)+'h',   lbl:'Daily Average'},
    {val:total.toFixed(1)+'h', lbl:'Weekly Total'},
    {val:maxDay,               lbl:'Most Screen Time'},
    {val:minDay,               lbl:'Least Screen Time'},
    {val:todayVal.toFixed(1)+'h',lbl:"Today's Session"},
  ];
  container.innerHTML=stats.map(s=>`
    <div class="stat-card">
      <span class="stat-val">${s.val}</span>
      <span class="stat-lbl">${s.lbl}</span>
    </div>`).join('');
}

// ── GENERATE REPORT ──────────────────────────
function generateReport(){
  updateScreenTime();

  const avg      = weeklyData.reduce((a,b)=>a+b,0)/weeklyData.length;
  const max      = Math.max(...weeklyData);
  const daysOver4= weeklyData.filter(v=>v>4).length;
  const daysOver6= weeklyData.filter(v=>v>6).length;

  let grade,emoji,verdict,summary,tips,cssClass;

  if(avg<=3&&daysOver4===0){
    grade='Excellent'; cssClass='good'; emoji='🌟';
    verdict='Your sleep cycle is in great shape!';
    summary=`With an average of just ${avg.toFixed(1)} hours of screen time per day and no days exceeding 4 hours, your digital habits are well within healthy limits. Your body is likely getting consistent, quality sleep. Keep it up!`;
    tips=['✅ Maintain your current screen-time schedule.','✅ Keep using night mode or blue-light filters in the evenings.','✅ Aim to keep screens off at least 45 minutes before bed.'];
  } else if(avg<=5&&daysOver6<=1){
    grade='Average'; cssClass='average'; emoji='🌙';
    verdict='Your sleep cycle is average — room for improvement.';
    summary=`Your weekly average is ${avg.toFixed(1)} hours/day with ${daysOver4} day(s) over 4 hours. This level of screen time may be slightly disrupting your melatonin rhythm. Small adjustments now will have a big impact.`;
    tips=[`⚠️ Set a hard "screens off" time 1 hour before bed.`,`⚠️ On high-usage days (${max.toFixed(1)}h), take a 10-min screen break every 90 minutes.`,'⚠️ Replace the last 30 mins of screen time with reading or stretching.','⚠️ Enable night mode automatically after 8 PM.'];
  } else {
    grade='Needs Attention'; cssClass='poor'; emoji='🔴';
    verdict='Your sleep cycle needs serious attention.';
    summary=`Your weekly average is ${avg.toFixed(1)} hours/day with ${daysOver6} day(s) over 6 hours. This is very likely disrupting your melatonin production and sleep quality. If you've been feeling tired or unfocused — this is why.`;
    tips=['🔴 Immediately set a daily screen-time limit of 4 hours.','🔴 Remove all devices from your bedroom.','🔴 Delete or temporarily uninstall your most time-consuming apps.','🔴 Start a bedtime routine: dim lights at 9 PM, screens off by 10 PM.','🔴 Consider a full "digital detox" day this weekend.'];
  }

  const resultEl = document.getElementById('report-result');
  resultEl.className=`report-result ${cssClass}`;
  resultEl.innerHTML=`
    <span class="report-emoji">${emoji}</span>
    <div class="report-verdict">${verdict}</div>
    <p class="report-summary">${summary}</p>
    <div class="report-tips">${tips.map(t=>`<div class="report-tip">${t}</div>`).join('')}</div>
    <p style="margin-top:1.5rem;font-size:0.78rem;opacity:0.5;">
      Report generated ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · Grade: <strong>${grade}</strong> · Avg: <strong>${avg.toFixed(1)}h/day</strong>
    </p>`;
  resultEl.classList.remove('hidden');

  const wrap      = document.getElementById('badge-download-wrap');
  const goldBadge = document.getElementById('sleep-badge');
  const silverBadge = document.getElementById('silver-badge');
  const noBadge   = document.getElementById('no-badge');
  wrap.classList.remove('hidden');

  if(cssClass==='good'){
    goodWeekStreak++;
    saveGoodWeekStreak(goodWeekStreak);
    const now = new Date();
    const weekLabel = 'WEEK OF '+now.toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();

    if(goodWeekStreak >= 2){
      goldBadge.classList.remove('hidden');
      silverBadge.classList.add('hidden');
      noBadge.classList.add('hidden');
      const wt = document.getElementById('medal-week-text');
      if(wt) wt.textContent = weekLabel;
      speak(`Congratulations! You have earned the Golden Sleep Champion Badge for two consecutive weeks of excellent screen habits. Outstanding work!`, 0.88, 1.05);
    } else {
      silverBadge.classList.remove('hidden');
      goldBadge.classList.add('hidden');
      noBadge.classList.add('hidden');
      const swt = document.getElementById('silver-week-text');
      if(swt) swt.textContent = weekLabel;
      speak(`Excellent! You've earned the Week 1 Silver Badge for great screen habits this week. Keep it up next week to unlock the Golden Badge!`, 0.88, 1.05);
    }
  } else {
    goodWeekStreak = 0;
    saveGoodWeekStreak(0);
    goldBadge.classList.add('hidden');
    silverBadge.classList.add('hidden');
    noBadge.classList.remove('hidden');
    if(cssClass==='average'){
      speak(`Your report grade is Average. Your daily average is ${avg.toFixed(1)} hours. Try reducing screen time before bed to improve your sleep quality.`, 0.88, 0.98);
    } else {
      speak(`Your report needs attention. Your daily average is ${avg.toFixed(1)} hours. Please take action now to protect your sleep health.`, 0.88, 0.92);
    }
  }

  wrap.scrollIntoView({behavior:'smooth',block:'start'});
  updateHomeBanner();
}

// ── EYE EXERCISE ─────────────────────────────
let eyeExerciseTimer = null;
let eyeExerciseRunning = false;
let currentEyeStep = 0;
let eyeSecondsLeft = 30;
const eyeSteps = [
  { duration:30, label:'Follow the dot slowly with your eyes',  instruction:'👁️ Follow the moving dot' },
  { duration:20, label:'Roll your eyes clockwise, then counter-clockwise', instruction:'🔄 Roll your eyes gently' },
  { duration:20, label:'Close your eyes and blink rapidly 15 times', instruction:'😌 Blink & relax' },
  { duration:30, label:'Cover your eyes with your palms. Breathe deeply.', instruction:'🌿 Palm your eyes & rest' },
];

function startEyeExercise(){
  const modal = document.getElementById('eye-exercise-modal');
  if(modal) modal.classList.remove('hidden');
  speak("Eye relaxation exercise. Follow the dot with your eyes and blink naturally. Press Begin to start.", 0.88, 1.0);
}

function closeEyeExercise(){
  const modal = document.getElementById('eye-exercise-modal');
  if(modal) modal.classList.add('hidden');
  if(eyeExerciseTimer){ clearInterval(eyeExerciseTimer); eyeExerciseTimer=null; }
  eyeExerciseRunning = false;
  currentEyeStep = 0;
  eyeSecondsLeft = eyeSteps[0].duration;
  resetEyeUI();
}

function resetEyeUI(){
  document.querySelectorAll('.eye-step').forEach(s=>s.classList.remove('active'));
  const d = document.getElementById('eye-timer-display');
  if(d) d.textContent = '00:30';
  const dot = document.getElementById('eye-dot');
  if(dot){ dot.style.top='50%'; dot.style.left='50%'; }
  const instr = document.getElementById('eye-instruction');
  if(instr) instr.textContent = 'Press Begin to start';
  const btn = document.getElementById('eye-start-btn');
  if(btn){ btn.textContent = '▶ Begin Exercise'; btn.disabled = false; }
}

let dotAngle = 0;
let dotAnimFrame = null;

function animateEyeDot(){
  const stage = document.getElementById('eye-stage');
  const dot = document.getElementById('eye-dot');
  if(!stage || !dot) return;

  const W = stage.offsetWidth - 30;
  const H = stage.offsetHeight - 30;
  const cx = W / 2;
  const cy = H / 2;
  const rx = cx * 0.7;
  const ry = cy * 0.6;

  dotAngle += 0.012;
  const x = cx + rx * Math.cos(dotAngle);
  const y = cy + ry * Math.sin(dotAngle);
  dot.style.left = x + 'px';
  dot.style.top  = y + 'px';

  if(currentEyeStep === 0 && eyeExerciseRunning){
    dotAnimFrame = requestAnimationFrame(animateEyeDot);
  }
}

function beginEyeExercise(){
  if(eyeExerciseRunning) return;
  eyeExerciseRunning = true;
  currentEyeStep = 0;
  const btn = document.getElementById('eye-start-btn');
  if(btn) btn.disabled = true;
  runEyeStep();
}

function runEyeStep(){
  if(currentEyeStep >= eyeSteps.length){
    eyeExerciseRunning = false;
    const instr = document.getElementById('eye-instruction');
    if(instr) instr.textContent = '✅ Exercise complete! Your eyes are refreshed.';
    const d = document.getElementById('eye-timer-display');
    if(d) d.textContent = '✓';
    const btn = document.getElementById('eye-start-btn');
    if(btn){ btn.textContent = '↺ Restart'; btn.disabled = false; btn.onclick = ()=>{ currentEyeStep=0; eyeExerciseRunning=false; resetEyeUI(); }; }
    speak("Eye relaxation exercise complete. Your eyes are refreshed. Remember to look away from the screen every 20 minutes.", 0.88, 1.0);
    return;
  }

  const step = eyeSteps[currentEyeStep];
  eyeSecondsLeft = step.duration;

  document.querySelectorAll('.eye-step').forEach((s,i)=>{
    s.classList.toggle('active', i===currentEyeStep);
  });

  const instr = document.getElementById('eye-instruction');
  if(instr) instr.textContent = step.instruction;

  speak(step.label, 0.88, 1.0);

  if(currentEyeStep === 0){
    if(dotAnimFrame) cancelAnimationFrame(dotAnimFrame);
    animateEyeDot();
  } else {
    if(dotAnimFrame){ cancelAnimationFrame(dotAnimFrame); dotAnimFrame=null; }
    const dot = document.getElementById('eye-dot');
    if(dot){ dot.style.left='50%'; dot.style.top='50%'; }
  }

  if(eyeExerciseTimer) clearInterval(eyeExerciseTimer);
  eyeExerciseTimer = setInterval(()=>{
    eyeSecondsLeft--;
    const d = document.getElementById('eye-timer-display');
    if(d) d.textContent = `${pad(Math.floor(eyeSecondsLeft/60))}:${pad(eyeSecondsLeft%60)}`;
    if(eyeSecondsLeft <= 0){
      clearInterval(eyeExerciseTimer);
      eyeExerciseTimer = null;
      currentEyeStep++;
      runEyeStep();
    }
  }, 1000);
}

// ── MEDITATION ───────────────────────────────
let medTimer = null;
let medRunning = false;
let medTotalSeconds = 120;
let medSecondsLeft = 120;

function showMeditation(){
  const m = document.getElementById('meditation-modal');
  if(m) m.classList.remove('hidden');
  speak("Guided meditation. A two minute breathing session to calm your mind before sleep. Press Start when you are ready.", 0.88, 1.0);
}
function closeMeditation(){
  const m = document.getElementById('meditation-modal');
  if(m) m.classList.add('hidden');
  if(medTimer){ clearInterval(medTimer); medTimer=null; }
  medRunning = false;
  medSecondsLeft = medTotalSeconds;
  const c = document.getElementById('breath-circle');
  if(c){ c.className='breath-circle'; }
  const lbl = document.getElementById('breath-label');
  if(lbl) lbl.textContent='Ready';
  const instr = document.getElementById('med-instruction');
  if(instr) instr.textContent='Press Start to begin your 2-minute session';
  const btn = document.getElementById('med-start-btn');
  if(btn){ btn.textContent='▶ Start Session'; btn.disabled=false; }
}

function startMeditation(){
  if(medRunning) return;
  medRunning = true;
  medSecondsLeft = medTotalSeconds;
  const btn = document.getElementById('med-start-btn');
  if(btn) btn.disabled = true;

  speak("Let us begin. Breathe in slowly for 4 counts.", 0.82, 0.88);

  const phases = [
    {name:'inhale', label:'Breathe In',  cls:'expand',   dur:4, voice:'Breathe in...'},
    {name:'hold',   label:'Hold',         cls:'',         dur:1, voice:null},
    {name:'exhale', label:'Breathe Out', cls:'contract',  dur:4, voice:'Breathe out...'},
    {name:'rest',   label:'Rest',         cls:'',         dur:1, voice:null},
  ];
  let phaseIdx = 0;
  let phaseSeconds = 0;

  const c  = document.getElementById('breath-circle');
  const lbl= document.getElementById('breath-label');
  const instr= document.getElementById('med-instruction');

  function applyPhase(){
    const p = phases[phaseIdx];
    if(c){ c.className='breath-circle'+(p.cls?' '+p.cls:''); }
    if(lbl) lbl.textContent = p.label;
    if(instr) instr.textContent = p.label === 'Breathe In' ? 'Inhale slowly through your nose...'
                                 : p.label === 'Breathe Out' ? 'Exhale gently through your mouth...'
                                 : p.label === 'Hold' ? 'Hold your breath...'
                                 : 'Rest and relax...';
    if(p.voice) speak(p.voice, 0.78, 0.82);
    phaseSeconds = p.dur;
  }
  applyPhase();

  medTimer = setInterval(()=>{
    medSecondsLeft--;
    phaseSeconds--;

    const btn2 = document.getElementById('med-start-btn');
    if(btn2) btn2.textContent = `${Math.floor(medSecondsLeft/60)}:${pad(medSecondsLeft%60)} remaining`;

    if(phaseSeconds <= 0){
      phaseIdx = (phaseIdx + 1) % phases.length;
      applyPhase();
    }

    if(medSecondsLeft <= 0){
      clearInterval(medTimer); medTimer=null; medRunning=false;
      if(c) c.className='breath-circle';
      if(lbl) lbl.textContent='Complete ✓';
      if(instr) instr.textContent='Session complete. Rest peacefully.';
      if(btn2){ btn2.textContent='↺ Repeat'; btn2.disabled=false; btn2.onclick=()=>{ btn2.onclick=null; startMeditation(); }; }
      speak("Meditation complete. Your mind is calm. Rest peacefully and let sleep come naturally.", 0.82, 0.88);
    }
  }, 1000);
}

// ── RELAXING MUSIC — YouTube Embed Player ────
// Each track uses a curated YouTube video ID for real ambient audio.
// The iframe is hidden; we use YouTube IFrame API to control playback.
const tracks = [
  {
    name: 'Ocean Waves',
    emoji: '🌊',
    videoId: 'BHACKCNDMW8', // "Ocean Waves" relaxing sounds
    color: '#4488cc',
    desc: 'Gentle ocean waves washing on shore'
  },
  {
    name: 'Rainfall',
    emoji: '🌧️',
    videoId: 'mPZkdNFkNps', // "Rainfall" ambient
    color: '#5599aa',
    desc: 'Soft rain on leaves and windows'
  },
  {
    name: 'Forest Breeze',
    emoji: '🌿',
    videoId: 'eKFTSSKCzWA', // "Forest sounds" ambient
    color: '#44aa66',
    desc: 'Wind through trees, birds in distance'
  },
  {
    name: 'Cosmic Drift',
    emoji: '✨',
    videoId: 'UfcAVejslrU', // "Space ambient" music
    color: '#8844cc',
    desc: 'Deep space drones and ethereal tones'
  },
];

let currentTrack = 0;
let ytPlayer = null;
let musicPlaying = false;
let ytApiReady = false;

// Load YouTube IFrame API
function loadYouTubeAPI(){
  if(document.getElementById('yt-api-script')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

// Called automatically by YouTube API when ready
window.onYouTubeIframeAPIReady = function(){
  ytApiReady = true;
  createYTPlayer();
};

function createYTPlayer(){
  // Create hidden container if not exists
  let container = document.getElementById('yt-player-container');
  if(!container){
    container = document.createElement('div');
    container.id = 'yt-player-container';
    container.style.cssText = 'position:fixed;bottom:-200px;left:-200px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(container);
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player';
    container.appendChild(playerDiv);
  }

  ytPlayer = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    videoId: tracks[currentTrack].videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      loop: 1,
      playlist: tracks[currentTrack].videoId,
      mute: 0,
    },
    events: {
      onReady: onYTPlayerReady,
      onStateChange: onYTStateChange,
    }
  });
}

function onYTPlayerReady(event){
  // Player is ready
}

function onYTStateChange(event){
  // If ended, replay
  if(event.data === YT.PlayerState.ENDED){
    ytPlayer.playVideo();
  }
}

function showMusic(){
  loadYouTubeAPI();
  const m = document.getElementById('music-modal');
  if(m) m.classList.remove('hidden');
  renderMusicUI();
}

function closeMusic(){
  stopMusic();
  const m = document.getElementById('music-modal');
  if(m) m.classList.add('hidden');
}

function renderMusicUI(){
  // Update track info display
  const t = tracks[currentTrack];
  const trackInfo = document.getElementById('current-track-info');
  if(trackInfo){
    trackInfo.innerHTML = `<span style="font-size:2rem">${t.emoji}</span><div><strong>${t.name}</strong><p style="opacity:0.7;font-size:0.85rem;margin:0">${t.desc}</p></div>`;
  }
}

function selectTrack(idx, btn){
  currentTrack = idx;
  document.querySelectorAll('.track-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  renderMusicUI();

  if(ytPlayer && ytApiReady){
    const wasPlaying = musicPlaying;
    ytPlayer.loadVideoById({
      videoId: tracks[idx].videoId,
      startSeconds: 0,
    });
    if(wasPlaying){
      // loadVideoById auto-plays, keep playing
      musicPlaying = true;
      updatePlayBtn(true);
      animateViz(true);
    } else {
      ytPlayer.stopVideo();
      musicPlaying = false;
      updatePlayBtn(false);
      animateViz(false);
    }
  }
}

function toggleMusic(){
  if(!ytApiReady || !ytPlayer){
    // API not ready yet — show loading message
    const btn = document.getElementById('music-play-btn');
    if(btn){ btn.textContent = '⏳ Loading...'; btn.disabled = true; }
    // Retry after a moment
    setTimeout(()=>{
      const btn2 = document.getElementById('music-play-btn');
      if(btn2){ btn2.textContent = musicPlaying ? '⏸ Pause' : '▶ Play'; btn2.disabled = false; }
    }, 3000);
    return;
  }

  if(musicPlaying){
    stopMusic();
  } else {
    startMusic();
  }
}

function startMusic(){
  if(!ytPlayer || !ytApiReady) return;

  // Load current track
  ytPlayer.loadVideoById({
    videoId: tracks[currentTrack].videoId,
    startSeconds: 0,
  });
  ytPlayer.setVolume(80);

  musicPlaying = true;
  updatePlayBtn(true);
  animateViz(true);
}

function stopMusic(){
  if(ytPlayer && ytApiReady){
    try { ytPlayer.stopVideo(); } catch(e){}
  }
  musicPlaying = false;
  updatePlayBtn(false);
  animateViz(false);
}

function updatePlayBtn(playing){
  const btn = document.getElementById('music-play-btn');
  if(btn) btn.textContent = playing ? '⏸ Pause' : '▶ Play';
}

function animateViz(playing){
  const viz = document.getElementById('music-viz');
  if(viz) viz.classList.toggle('playing', playing);
}

// ── DRAW MEDAL ON CANVAS ─────────────────────
function drawMedalOnCanvas(canvas, weekLabel){
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const cx=W/2, medalY=190;

  const bgG = ctx.createLinearGradient(0,0,W,H);
  bgG.addColorStop(0,'#0d0b1e'); bgG.addColorStop(0.5,'#1a1040'); bgG.addColorStop(1,'#0d0b1e');
  ctx.fillStyle=bgG; ctx.fillRect(0,0,W,H);

  const rng=(seed)=>{ let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; };
  const rand=rng(77);
  for(let i=0;i<50;i++){
    ctx.beginPath();ctx.arc(rand()*W,rand()*H*0.6,rand()*1.5+0.3,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${0.3+rand()*0.7})`;ctx.fill();
  }

  ctx.save();ctx.translate(cx,medalY);ctx.globalAlpha=0.15;
  for(let i=0;i<12;i++){
    ctx.save();ctx.rotate((i/12)*Math.PI*2);
    const g=ctx.createLinearGradient(0,-40,0,-130);
    g.addColorStop(0,'#ffd700');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.lineTo(3,-130);ctx.lineTo(-3,-130);ctx.closePath();
    ctx.fill();ctx.restore();
  }
  ctx.restore();ctx.globalAlpha=1;

  ctx.fillStyle='#e0448a';
  ctx.beginPath();ctx.moveTo(cx-18,medalY-80);ctx.lineTo(cx-4,medalY-80);ctx.lineTo(cx-12,medalY-10);ctx.lineTo(cx-28,medalY-10);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ff85c2';
  ctx.beginPath();ctx.moveTo(cx+4,medalY-80);ctx.lineTo(cx+18,medalY-80);ctx.lineTo(cx+28,medalY-10);ctx.lineTo(cx+12,medalY-10);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e85ca0';ctx.fillRect(cx-4,medalY-80,8,70+30);

  ctx.save();ctx.shadowColor='rgba(255,200,0,0.8)';ctx.shadowBlur=20;
  const og=ctx.createRadialGradient(cx-12,medalY-14,4,cx,medalY,65);
  og.addColorStop(0,'#ffe580');og.addColorStop(0.45,'#f0a500');og.addColorStop(1,'#7a4800');
  ctx.fillStyle=og;ctx.beginPath();ctx.arc(cx,medalY,65,0,Math.PI*2);ctx.fill();
  ctx.restore();

  const ig=ctx.createRadialGradient(cx-10,medalY-12,3,cx,medalY,52);
  ig.addColorStop(0,'#fff8dc');ig.addColorStop(0.5,'#ffd700');ig.addColorStop(1,'#c8860a');
  ctx.fillStyle=ig;ctx.beginPath();ctx.arc(cx,medalY,52,0,Math.PI*2);ctx.fill();

  const sg=ctx.createRadialGradient(cx-12,medalY-14,1,cx-4,medalY-8,50);
  sg.addColorStop(0,'rgba(255,255,255,0.5)');sg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sg;ctx.beginPath();ctx.arc(cx,medalY,52,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='rgba(255,248,220,0.85)';ctx.beginPath();ctx.arc(cx-7,medalY-6,18,0,Math.PI*2);ctx.fill();
  const mg=ctx.createRadialGradient(cx+6,medalY-10,1,cx+6,medalY-4,14);
  mg.addColorStop(0,'#fff8dc');mg.addColorStop(1,'#f0a500');
  ctx.fillStyle=mg;ctx.beginPath();ctx.arc(cx+6,medalY-10,14,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='rgba(90,50,0,0.9)';
  ctx.font='bold 9px Georgia';ctx.textAlign='left';
  ctx.fillText('z',cx-16,medalY+2);ctx.font='bold 11px Georgia';
  ctx.fillText('z',cx-7,medalY-6);ctx.font='bold 13px Georgia';
  ctx.fillText('z',cx+3,medalY-14);

  ctx.font='10px serif';ctx.fillStyle='#f0a500';ctx.textAlign='center';
  ctx.fillText('★',cx-22,medalY-10);ctx.fillText('★',cx+22,medalY-10);

  ctx.save();ctx.font='bold 7px Georgia,serif';ctx.fillStyle='#7a4f00';
  const arcR2=38,aStart=Math.PI+0.3,aEnd=Math.PI*2-0.3;
  const txt2='SLEEP CHAMPION',arcSpan=aEnd-aStart;
  for(let i=0;i<txt2.length;i++){
    const a=aStart+(i/(txt2.length-1))*arcSpan;
    ctx.save();ctx.translate(cx+Math.cos(a)*arcR2,medalY+Math.sin(a)*arcR2);
    ctx.rotate(a+Math.PI/2);ctx.fillText(txt2[i],0,0);ctx.restore();
  }
  ctx.restore();

  ctx.font='7.5px "DM Sans",sans-serif';ctx.fillStyle='#a06000';ctx.textAlign='center';
  ctx.fillText(weekLabel,cx,medalY+42);

  ctx.save();ctx.shadowColor='rgba(255,200,50,0.6)';ctx.shadowBlur=18;
  ctx.font='bold 22px "Cormorant Garamond",Georgia,serif';
  ctx.fillStyle='#ffe066';ctx.textAlign='center';
  ctx.fillText('INSOMNIA KILLER',cx,50);ctx.restore();

  ctx.font='13px "DM Sans",sans-serif';
  ctx.fillStyle='rgba(200,180,255,0.85)';ctx.textAlign='center';
  ctx.fillText('Sleep Champion Certificate',cx,74);

  const dateStr=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  ctx.font='11px "DM Sans",sans-serif';
  ctx.fillStyle='rgba(180,160,255,0.7)';ctx.textAlign='center';
  ctx.fillText('Awarded: '+dateStr,cx,H-48);

  const avg=(weeklyData.reduce((a,b)=>a+b,0)/weeklyData.length).toFixed(1);
  ctx.font='bold 11px "DM Sans",sans-serif';ctx.fillStyle='rgba(255,215,100,0.8)';
  ctx.fillText(`Weekly Avg: ${avg}h/day  ·  Grade: Excellent 🌟`,cx,H-28);
  ctx.textAlign='left';
}

// ── DOWNLOAD REPORT ──────────────────────────
function downloadReport(){
  const avg       = weeklyData.reduce((a,b)=>a+b,0)/weeklyData.length;
  const max       = Math.max(...weeklyData);
  const min       = Math.min(...weeklyData);
  const maxDay    = DAYS[weeklyData.indexOf(max)];
  const minDay    = DAYS[weeklyData.indexOf(min)];
  const total     = weeklyData.reduce((a,b)=>a+b,0);
  const daysOver4 = weeklyData.filter(v=>v>4).length;
  const isGood    = avg<=3 && daysOver4===0;
  const isAvg     = avg<=5;
  const dateStr   = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const W=800, H=900;
  const canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0,0,W,H);
  if(isGood){
    bgGrad.addColorStop(0,'#0d0b1e'); bgGrad.addColorStop(0.5,'#1a1040'); bgGrad.addColorStop(1,'#0d0b1e');
  } else if(isAvg){
    bgGrad.addColorStop(0,'#1a1200'); bgGrad.addColorStop(0.5,'#2a1e00'); bgGrad.addColorStop(1,'#1a1200');
  } else {
    bgGrad.addColorStop(0,'#1a0000'); bgGrad.addColorStop(0.5,'#2a0a0a'); bgGrad.addColorStop(1,'#1a0000');
  }
  ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H);

  const rng=(seed)=>{ let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; };
  const rand=rng(42);
  for(let i=0;i<80;i++){
    const sx=rand()*W, sy=rand()*H*0.55, sr=rand()*1.8+0.3;
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${0.4+rand()*0.6})`; ctx.fill();
  }

  const borderCol = isGood?'#ffd700':isAvg?'#f0a500':'#cc3333';
  ctx.strokeStyle=borderCol; ctx.lineWidth=3;
  roundRect(ctx,18,18,W-36,H-36,18); ctx.stroke();
  ctx.strokeStyle=`${borderCol}55`; ctx.lineWidth=1;
  roundRect(ctx,26,26,W-52,H-52,14); ctx.stroke();

  ctx.font='48px serif'; ctx.textAlign='center';
  ctx.fillText('🌙',W/2,80);

  ctx.save();
  ctx.shadowColor=isGood?'rgba(255,215,0,0.8)':isAvg?'rgba(255,180,0,0.7)':'rgba(255,80,80,0.7)';
  ctx.shadowBlur=20;
  ctx.font='bold 34px "Cormorant Garamond",Georgia,serif';
  ctx.fillStyle='#ffffff'; ctx.textAlign='center';
  ctx.fillText('INSOMNIA KILLER', W/2, 128);
  ctx.restore();

  ctx.font='15px "DM Sans",Arial,sans-serif';
  ctx.fillStyle='rgba(200,185,255,0.75)'; ctx.textAlign='center';
  ctx.fillText('Weekly Sleep Report', W/2, 155);

  ctx.font='12px "DM Sans",Arial,sans-serif';
  ctx.fillStyle='rgba(180,165,220,0.6)'; ctx.textAlign='center';
  ctx.fillText(dateStr, W/2, 175);

  drawDivider(ctx,60,192,W-60, borderCol);

  if(isGood){
    drawMiniMedal(ctx, W/2, 270);
    ctx.font='bold 20px Georgia,serif';
    ctx.fillStyle='#ffd700'; ctx.textAlign='center';
    ctx.shadowColor='rgba(255,215,0,0.6)'; ctx.shadowBlur=12;
    ctx.fillText('⭐  SLEEP CHAMPION BADGE  ⭐', W/2, 360);
    ctx.shadowBlur=0;
    ctx.font='13px "DM Sans",Arial,sans-serif';
    ctx.fillStyle='rgba(200,220,255,0.75)';
    ctx.fillText(goodWeekStreak >= 2 ? 'Golden Badge — 2nd consecutive excellent week!' : 'Silver Badge — Week 1 excellent habits!', W/2, 382);
  } else {
    const pillCol  = isAvg?'#f0a500':'#cc3333';
    const pillText = isAvg?'🌙  AVERAGE':'🔴  NEEDS ATTENTION';
    const pillW=280, pillH=50, pillX=W/2-pillW/2, pillY=215;
    ctx.fillStyle=`${pillCol}33`;
    ctx.strokeStyle=pillCol; ctx.lineWidth=2;
    roundRect(ctx,pillX,pillY,pillW,pillH,25); ctx.fill(); ctx.stroke();
    ctx.font='bold 18px Georgia,serif';
    ctx.fillStyle=pillCol; ctx.textAlign='center';
    ctx.fillText(pillText, W/2, pillY+33);
    ctx.font='13px "DM Sans",Arial,sans-serif';
    ctx.fillStyle='rgba(200,185,255,0.65)'; ctx.textAlign='center';
    ctx.fillText(isAvg
      ? 'Reduce screen time to earn the Sleep Champion badge!'
      : 'Take action now — your sleep health needs attention.',
      W/2, 290);
  }

  const secY = isGood ? 410 : 320;
  drawSectionLabel(ctx, 60, secY, '📊  WEEKLY SCREEN TIME (REAL-TIME DATA)', borderCol);

  const barAreaX=60, barAreaW=W-120;
  const barMaxH=70, barBaseY=secY+140;
  const barMaxVal=Math.max(...weeklyData,1);
  const barW=(barAreaW/7)-12;
  const todayIdx=getTodayIndex();

  weeklyData.forEach((val,i)=>{
    const bx = barAreaX + i*(barAreaW/7) + 6;
    const bh = Math.max(6,(val/barMaxVal)*barMaxH);
    const by = barBaseY-bh;
    if(i===todayIdx){ ctx.shadowColor='rgba(255,100,180,0.6)'; ctx.shadowBlur=14; }
    const barG=ctx.createLinearGradient(bx,by,bx,barBaseY);
    if(i===todayIdx){
      barG.addColorStop(0,'#ff3a80'); barG.addColorStop(1,'rgba(255,60,128,0.3)');
    } else if(val>4){
      barG.addColorStop(0,'#f0a500'); barG.addColorStop(1,'rgba(240,165,0,0.3)');
    } else {
      barG.addColorStop(0,'#7b6fff'); barG.addColorStop(1,'rgba(123,111,255,0.3)');
    }
    ctx.fillStyle=barG;
    roundRect(ctx,bx,by,barW,bh,4); ctx.fill();
    ctx.shadowBlur=0;
    ctx.font=`bold 11px "DM Sans",Arial,sans-serif`;
    ctx.fillStyle=i===todayIdx?'#ff85c2':val>4?'#f0c060':'rgba(200,185,255,0.9)';
    ctx.textAlign='center';
    ctx.fillText(val.toFixed(1)+'h', bx+barW/2, by-6);
    ctx.font=`${i===todayIdx?'bold ':''}11px "DM Sans",Arial,sans-serif`;
    ctx.fillStyle=i===todayIdx?'#ff85c2':'rgba(180,165,220,0.75)';
    ctx.fillText(DAYS[i], bx+barW/2, barBaseY+16);
  });

  const statsY = barBaseY+38;
  drawDivider(ctx,60,statsY,W-60,borderCol);
  drawSectionLabel(ctx,60,statsY+24,'📈  STATS', borderCol);

  const stats=[
    ['Daily Average', avg.toFixed(1)+' hrs'],
    ['Weekly Total',  total.toFixed(1)+' hrs'],
    ['Highest Day',   `${maxDay} (${max.toFixed(1)}h)`],
    ['Lowest Day',    `${minDay} (${min.toFixed(1)}h)`],
    ['Days Over 4h',  daysOver4+' day'+( daysOver4!==1?'s':'')],
  ];
  const colW=(W-120)/3;
  stats.forEach((s,i)=>{
    const col=i%3, row=Math.floor(i/3);
    const sx=60+col*colW+colW/2, sy=statsY+68+row*52;
    ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    roundRect(ctx, 60+col*colW+8, sy-26, colW-16, 44, 10);
    ctx.fill(); ctx.stroke();
    ctx.font='bold 17px "Cormorant Garamond",Georgia,serif';
    ctx.fillStyle=borderCol; ctx.textAlign='center';
    ctx.fillText(s[1], sx, sy-4);
    ctx.font='10px "DM Sans",Arial,sans-serif';
    ctx.fillStyle='rgba(180,165,220,0.65)';
    ctx.fillText(s[0].toUpperCase(), sx, sy+13);
  });

  const recY = statsY+68+Math.ceil(stats.length/3)*52+10;
  drawDivider(ctx,60,recY,W-60,borderCol);
  drawSectionLabel(ctx,60,recY+22,'💡  RECOMMENDATIONS', borderCol);

  const recs = isGood
    ? ['✅  Keep screen time under 3 hours daily — you\'re nailing it!',
       '✅  Continue night mode & blue-light filters after 8 PM.',
       '✅  Screens off 45 minutes before bed — great habit!']
    : isAvg
      ? ['⚠️  Set a hard screens-off time at least 1 hour before bed.',
         '⚠️  Take a 10-minute break every 90 minutes on heavy days.',
         '⚠️  Enable automatic night mode after 8 PM on all devices.']
      : ['🔴  Limit daily screen time to 4 hours — start today.',
         '🔴  Remove all devices from your bedroom completely.',
         '🔴  Bedtime routine: lights dim at 9 PM, screens off at 10 PM.'];

  recs.forEach((r,i)=>{
    const ry=recY+52+i*30;
    ctx.font='13px "DM Sans",Arial,sans-serif';
    ctx.fillStyle='rgba(210,200,255,0.85)'; ctx.textAlign='left';
    ctx.fillText(r, 72, ry);
  });

  drawDivider(ctx,60,H-52,W-60,borderCol);
  ctx.font='11px "DM Sans",Arial,sans-serif';
  ctx.fillStyle='rgba(160,150,200,0.55)'; ctx.textAlign='center';
  ctx.fillText('Insomnia Killer  ·  Crafted with care for better sleep  🌙', W/2, H-28);

  canvas.toBlob(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`insomnia-killer-report-${new Date().toISOString().slice(0,10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
  speak("Your sleep report has been downloaded.", 0.9, 1.0);
}

// ── Canvas helpers ────────────────────────────
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function drawDivider(ctx,x1,y,x2,col){
  const g=ctx.createLinearGradient(x1,y,x2,y);
  g.addColorStop(0,'transparent'); g.addColorStop(0.3,col+'88');
  g.addColorStop(0.7,col+'88'); g.addColorStop(1,'transparent');
  ctx.strokeStyle=g; ctx.lineWidth=1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
}

function drawSectionLabel(ctx,x,y,text,col){
  ctx.font='bold 13px "DM Sans",Arial,sans-serif';
  ctx.fillStyle=col+'cc'; ctx.textAlign='left';
  ctx.fillText(text, x, y+14);
}

function drawMiniMedal(ctx,cx,cy){
  const R=52;
  ctx.save(); ctx.translate(cx,cy); ctx.globalAlpha=0.18;
  for(let i=0;i<12;i++){
    ctx.save(); ctx.rotate((i/12)*Math.PI*2);
    const g=ctx.createLinearGradient(0,-R*0.3,0,-R*1.8);
    g.addColorStop(0,'#ffd700'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.lineTo(3,-R*1.8); ctx.lineTo(-3,-R*1.8); ctx.closePath();
    ctx.fill(); ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha=1;

  ctx.fillStyle='#e0448a';
  ctx.beginPath(); ctx.moveTo(cx-18,cy-R-20); ctx.lineTo(cx-4,cy-R-20); ctx.lineTo(cx-12,cy-R+10); ctx.lineTo(cx-28,cy-R+10); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ff85c2';
  ctx.beginPath(); ctx.moveTo(cx+4,cy-R-20); ctx.lineTo(cx+18,cy-R-20); ctx.lineTo(cx+28,cy-R+10); ctx.lineTo(cx+12,cy-R+10); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#e85ca0'; ctx.fillRect(cx-4,cy-R-20,8,R+30);

  ctx.save(); ctx.shadowColor='rgba(255,200,0,0.8)'; ctx.shadowBlur=20;
  const og=ctx.createRadialGradient(cx-12,cy-14,4,cx,cy,R);
  og.addColorStop(0,'#ffe580'); og.addColorStop(0.45,'#f0a500'); og.addColorStop(1,'#7a4800');
  ctx.fillStyle=og; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
  ctx.restore();

  for(let i=0;i<20;i++){
    const a=(i/20)*Math.PI*2;
    ctx.fillStyle='#c87800';
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*(R-2),cy+Math.sin(a)*(R-2),4,0,Math.PI*2); ctx.fill();
  }

  const ig=ctx.createRadialGradient(cx-10,cy-12,3,cx,cy,R-8);
  ig.addColorStop(0,'#fff8dc'); ig.addColorStop(0.5,'#ffd700'); ig.addColorStop(1,'#c8860a');
  ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(cx,cy,R-8,0,Math.PI*2); ctx.fill();

  const sg=ctx.createRadialGradient(cx-12,cy-14,1,cx-4,cy-8,R-10);
  sg.addColorStop(0,'rgba(255,255,255,0.5)'); sg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,R-8,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='rgba(255,248,220,0.85)';
  ctx.beginPath(); ctx.arc(cx-7,cy-6,18,0,Math.PI*2); ctx.fill();
  const mg=ctx.createRadialGradient(cx+6,cy-10,1,cx+6,cy-4,14);
  mg.addColorStop(0,'#fff8dc'); mg.addColorStop(1,'#f0a500');
  ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(cx+6,cy-10,14,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='rgba(90,50,0,0.9)';
  ctx.font='bold 9px Georgia'; ctx.textAlign='left';
  ctx.fillText('z',cx-16,cy+2); ctx.font='bold 11px Georgia';
  ctx.fillText('z',cx-7,cy-6); ctx.font='bold 13px Georgia';
  ctx.fillText('z',cx+3,cy-14);

  ctx.font='10px serif'; ctx.fillStyle='#f0a500'; ctx.textAlign='center';
  ctx.fillText('★',cx-22,cy-10); ctx.fillText('★',cx+22,cy-10);

  ctx.save(); ctx.font='bold 7px Georgia,serif'; ctx.fillStyle='#7a4f00';
  const arcR2=38, aStart=Math.PI+0.3, aEnd=Math.PI*2-0.3;
  const txt2='SLEEP CHAMPION', arcSpan=aEnd-aStart;
  for(let i=0;i<txt2.length;i++){
    const a=aStart+(i/(txt2.length-1))*arcSpan;
    ctx.save(); ctx.translate(cx+Math.cos(a)*arcR2,cy+Math.sin(a)*arcR2);
    ctx.rotate(a+Math.PI/2); ctx.fillText(txt2[i],0,0); ctx.restore();
  }
  ctx.restore();
}

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  generateStars();
  updateHomeBanner();
  tick();
  updateScreenTime();
  setInterval(()=>{ tick(); updateScreenTime(); },1000);
});