// ========== ЗАГРУЗКА С ВИДЕО ==========
const loadingScreen = document.getElementById('loadingScreen');
const loadingVideo = document.getElementById('loadingVideo');
const soundBtn = document.getElementById('soundBtn');
const appContent = document.getElementById('appContent');

let actionTaken = false;

// Обработка ошибок видео
loadingVideo.addEventListener('error', () => {
    console.warn('⚠️ Ошибка загрузки видео');
    loadingScreen.classList.add('hidden');
    appContent.style.display = 'block';
});

function startVideo(useSound) {
    if (actionTaken) return;
    actionTaken = true;
    soundBtn.style.display = 'none';
    loadingVideo.muted = !useSound;
    
    loadingVideo.play().catch(e => {
        console.log('📱 Автовоспроизведение заблокировано:', e);
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            appContent.style.display = 'block';
            loadingVideo.pause();
        }, 3000);
    });
    
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContent.style.display = 'block';
            loadingVideo.pause();
        }, 500);
    }, 3000);
}

soundBtn.addEventListener('click', (e) => { e.stopPropagation(); startVideo(true); });
setTimeout(() => { if (!actionTaken) startVideo(false); }, 2000);
loadingVideo.load();

// ========== ПЕРЕКЛЮЧЕНИЕ ТАБОВ ==========
function switchDiaryTab(tab) {
    const tabs = document.querySelectorAll('.diary-tab');
    const diaryContent = document.getElementById('diaryContent');
    const statsContent = document.getElementById('statsContent');
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'diary') {
        tabs[0].classList.add('active');
        diaryContent.style.display = 'block';
        statsContent.style.display = 'none';
    } else {
        tabs[1].classList.add('active');
        diaryContent.style.display = 'none';
        statsContent.style.display = 'block';
        renderStats();
    }
}

// ========== ЗВУКИ ПРИРОДЫ ==========
let natureCtx = null, natureGain = null, naturePlaying = false, natureScriptNode = null;

function toggleNatureSound() {
    if (!naturePlaying) {
        try {
            if (!natureCtx) natureCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (natureCtx.state === 'suspended') natureCtx.resume();
            const bufferSize = 4096;
            const noise = (() => {
                let lastOut = 0;
                return () => {
                    const white = Math.random() * 2 - 1;
                    const pink = (lastOut + (white - lastOut) * 0.2);
                    lastOut = pink;
                    return pink * 0.25;
                };
            })();
            natureScriptNode = natureCtx.createScriptProcessor(bufferSize, 1, 1);
            natureScriptNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) output[i] = noise();
            };
            const gainNode = natureCtx.createGain();
            gainNode.gain.value = 0.08;
            natureScriptNode.connect(gainNode);
            gainNode.connect(natureCtx.destination);
            natureGain = gainNode;
            naturePlaying = true;
            document.getElementById('natureBtn').style.background = 'rgba(107,165,217,0.4)';
            document.getElementById('natureBtn').style.borderColor = 'rgba(107,165,217,0.7)';
        } catch(e) { console.log('Nature sound error:', e); }
    } else {
        if (natureGain) natureGain.gain.value = 0;
        if (natureScriptNode) natureScriptNode.disconnect();
        naturePlaying = false;
        document.getElementById('natureBtn').style.background = '';
        document.getElementById('natureBtn').style.borderColor = '';
    }
}

// Service Worker
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e=>console.log(e));

// Переменные
let breathingInterval = null, breathTimerInterval = null, breathPhase = 0, breathCount = 0;
let balloonInterval = null, emergencyInterval = null, stressLevel = 100;
let diaryEntries = JSON.parse(localStorage.getItem('diary') || '[]'), gameActive = true;
let audioCtx = null;

// ЗВУК УДАРА
function playHitSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const gain = audioCtx.createGain();
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle'; osc.frequency.value = 180;
        osc.connect(gain); osc.start(); osc.stop(now + 0.2);
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine'; osc2.frequency.value = 70;
            const gain2 = audioCtx.createGain();
            gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
            osc2.connect(gain2); gain2.connect(audioCtx.destination);
            osc2.start(); osc2.stop(audioCtx.currentTime + 0.3);
        }, 10);
    } catch(e) {}
}

function copyPhoneNumber() { navigator.clipboard.writeText("8-920-227-56-76"); alert("📋 Номер скопирован! Спасибо ❤️"); }
function stopBossVideo() { const v = document.getElementById('bossVideo'); if(v) { v.pause(); v.currentTime = 0; } }
function startBossVideo() { const v = document.getElementById('bossVideo'); if(v) v.play().catch(e=>{}); }

function showScreen(id) {
    document.querySelectorAll('.section-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('menuScreen').classList.add('hidden');
    if (id === 'main') { document.getElementById('menuScreen').classList.remove('hidden'); stopAll(); stopBossVideo(); return; }
    const map = { emergency:'emergencyScreen', quick:'quickScreen', breathing:'breathingScreen', balloon:'balloonScreen', physical:'physicalScreen', diary:'diaryScreen', instruction:'instructionScreen', support:'supportScreen' };
    const target = document.getElementById(map[id]);
    if (target) target.classList.add('active');
    if (id === 'physical') { gameActive = true; resetBoss(); startBossVideo(); }
    if (id === 'diary') { renderDiary(); switchDiaryTab('diary'); }
    stopAll();
}
function backToMenu() { showScreen('main'); }

function stopAll() {
    if (breathingInterval) clearInterval(breathingInterval);
    if (breathTimerInterval) clearInterval(breathTimerInterval);
    if (balloonInterval) clearInterval(balloonInterval);
    if (emergencyInterval) clearInterval(emergencyInterval);
    const bc = document.getElementById('breathCircle'); if (bc) bc.className = 'circle-anim';
    const bt = document.getElementById('breathTimer'); if (bt) bt.textContent = '0';
    const bp = document.getElementById('breathPhaseText'); if (bp) bp.textContent = '';
    breathPhase = 0; breathCount = 0;
    const ball = document.getElementById('balloon'); const ballText = document.getElementById('balloonText');
    if (ball) ball.className = 'balloon';
    if (ballText) ballText.textContent = 'Нажми чтобы начать';
}

function startEmergency() {
    let sec = 120;
    const el = document.getElementById('emergTimer');
    const circle = document.getElementById('emergBreath');
    if (!el || !circle) return;
    el.textContent = '02:00';
    if (emergencyInterval) clearInterval(emergencyInterval);
    emergencyInterval = setInterval(() => {
        sec--;
        const m = Math.floor(sec/60).toString().padStart(2,'0');
        const s = (sec%60).toString().padStart(2,'0');
        el.textContent = m+':'+s;
        circle.className = sec%8 < 4 ? 'breath-circle inhale breathing-circle' : 'breath-circle exhale';
        if(sec<=0) { clearInterval(emergencyInterval); el.textContent='✅ Готово'; circle.className='breath-circle'; }
    }, 1000);
}

function startBreath() {
    const circle = document.getElementById('breathCircle');
    const timerEl = document.getElementById('breathTimer');
    const phaseEl = document.getElementById('breathPhaseText');
    if (!circle || !timerEl) return;
    stopBreath();
    breathPhase = 1; breathCount = 1;
    function updateDisplay() {
        if (!timerEl || !phaseEl) return;
        if (breathPhase === 1) {
            phaseEl.textContent = 'Вдох'; timerEl.textContent = breathCount;
            if (breathCount > 4) { breathPhase = 2; breathCount = 7; phaseEl.textContent = 'Задержка'; timerEl.textContent = 7; }
        } else if (breathPhase === 2) {
            phaseEl.textContent = 'Задержка'; timerEl.textContent = breathCount;
            if (breathCount < 1) { breathPhase = 3; breathCount = 8; phaseEl.textContent = 'Выдох'; timerEl.textContent = 8; circle.className = 'circle-anim exhale'; }
        } else if (breathPhase === 3) {
            phaseEl.textContent = 'Выдох'; timerEl.textContent = breathCount;
            if (breathCount < 1) { breathPhase = 1; breathCount = 1; phaseEl.textContent = 'Вдох'; timerEl.textContent = 1; circle.className = 'circle-anim inhale'; }
        }
    }
    phaseEl.textContent = 'Вдох'; timerEl.textContent = 1; circle.className = 'circle-anim inhale';
    if (breathTimerInterval) clearInterval(breathTimerInterval);
    breathTimerInterval = setInterval(() => {
        if (breathPhase === 1) breathCount++;
        else if (breathPhase === 2 || breathPhase === 3) breathCount--;
        updateDisplay();
    }, 1000);
}
function stopBreath() {
    if (breathTimerInterval) clearInterval(breathTimerInterval);
    const circle = document.getElementById('breathCircle');
    const timerEl = document.getElementById('breathTimer');
    const phaseEl = document.getElementById('breathPhaseText');
    if (circle) circle.className = 'circle-anim';
    if (timerEl) timerEl.textContent = '0';
    if (phaseEl) phaseEl.textContent = '';
    breathPhase = 0; breathCount = 0;
}

function startBalloon() {
    if (balloonInterval) return;
    const b = document.getElementById('balloon');
    const txt = document.getElementById('balloonText');
    if (!b || !txt) return;
    stopBalloon();
    const breath = () => {
        txt.textContent = 'Вдох — шар надувается...'; b.className = 'balloon inflate';
        setTimeout(() => { txt.textContent = 'Выдох — шар сдувается...'; b.className = 'balloon'; }, 2000);
    };
    breath(); balloonInterval = setInterval(breath, 4000);
}
function stopBalloon() {
    if (balloonInterval) clearInterval(balloonInterval);
    balloonInterval = null;
    const b = document.getElementById('balloon');
    const txt = document.getElementById('balloonText');
    if (b) b.className = 'balloon';
    if (txt) txt.textContent = 'Нажми чтобы начать';
}

function hitBoss(zone, e) {
    if (!gameActive) return;
    e.stopPropagation();
    const clickX = e.clientX, clickY = e.clientY;
    const container = document.getElementById('bossContainer');
    const containerRect = container.getBoundingClientRect();
    const startX = clickX, startY = containerRect.bottom - 30;
    const randomOffset = () => (Math.random() - 0.5) * 30;
    const endX = clickX + randomOffset(), endY = clickY + randomOffset();
    const items = { head:'📎', face:'✏️', body:'📄', legs:'📌' };
    const item = items[zone] || '💥';
    const isGreenClip = (zone === 'head');
    playHitSound();
    
    for (let t = 0; t < 3; t++) {
        setTimeout(() => {
            const trace = document.createElement('div');
            trace.className = 'flying-item trace';
            if (isGreenClip) trace.classList.add('green-clip');
            trace.textContent = item;
            trace.style.left = (startX - 20 + (t * 5)) + 'px';
            trace.style.top = (startY - 20 + (t * 3)) + 'px';
            trace.style.opacity = 0.3 - t * 0.1;
            document.body.appendChild(trace);
            setTimeout(() => trace.remove(), 200);
        }, t * 30);
    }
    
    const flying = document.createElement('div');
    flying.className = 'flying-item';
    if (isGreenClip) flying.classList.add('green-clip');
    flying.textContent = item;
    flying.style.left = (startX - 20) + 'px';
    flying.style.top = (startY - 20) + 'px';
    document.body.appendChild(flying);
    
    const startLeft = startX - 20, startTop = startY - 20;
    const endLeft = endX - 20, endTop = endY - 20;
    const startTime = performance.now();
    const duration = 180;
    
    function animateFly(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - t, 2);
        const currentX = startLeft + (endLeft - startLeft) * ease;
        const currentY = startTop + (endTop - startTop) * ease;
        flying.style.left = currentX + 'px';
        flying.style.top = currentY + 'px';
        flying.style.transform = `rotate(${t * 540}deg)`;
        if (t < 1) { requestAnimationFrame(animateFly); }
        else {
            flying.remove();
            const bossVideo = document.getElementById('bossVideo');
            bossVideo.classList.add('hit');
            setTimeout(() => bossVideo.classList.remove('hit'), 150);
            stressLevel = Math.max(0, stressLevel - 2);
            const stressFill = document.getElementById('stressFill');
            const stressText = document.getElementById('stressText');
            if (stressFill) stressFill.style.width = stressLevel + '%';
            if (stressText) stressText.textContent = stressLevel + '%';
            for(let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                if (isGreenClip) particle.classList.add('green-clip');
                particle.textContent = item;
                particle.style.left = endX + 'px';
                particle.style.top = endY + 'px';
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 80;
                const tx = Math.cos(angle) * speed;
                const ty = Math.sin(angle) * speed - 40;
                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 500);
            }
            if (navigator.vibrate) navigator.vibrate(50);
            if(stressLevel === 0 && gameActive) {
                gameActive = false;
                if (stressText) stressText.textContent = '🎉 0% — Гнев выплеснут!';
                stopBossVideo();
                setTimeout(() => { alert('Отличная работа!'); backToMenu(); }, 600);
            }
        }
    }
    requestAnimationFrame(animateFly);
}

function resetBoss() { gameActive = true; stressLevel = 100; const fill = document.getElementById('stressFill'); const txt = document.getElementById('stressText'); if (fill) fill.style.width = '100%'; if (txt) txt.textContent = '100%'; }

function saveDiary() {
    const trigger = document.getElementById('angerTrigger').value.trim();
    const level = parseInt(document.getElementById('angerLevel').value);
    if(!trigger) { alert('Опишите ситуацию'); return; }
    diaryEntries.unshift({ id: Date.now(), date: new Date().toISOString(), trigger, level });
    localStorage.setItem('diary', JSON.stringify(diaryEntries.slice(0, 50)));
    document.getElementById('angerTrigger').value = '';
    renderDiary();
    alert('✅ Сохранено');
}
function renderDiary() {
    const el = document.getElementById('diaryList');
    if (!el) return;
    const html = diaryEntries.slice(0, 10).map(e => {
        const d = new Date(e.date).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        return `<div class="diary-entry"><div class="diary-entry-head"><span>${escapeHtml(d)}</span><span class="diary-entry-level">${e.level}/10</span></div><div>${escapeHtml(e.trigger)}</div></div>`;
    }).join('');
    el.innerHTML = '<h3 style="margin-bottom:10px;color:var(--text-muted);font-size:13px">Последние записи</h3>' + html;
}
function renderStats() {
    const week = Date.now() - 7*24*60*60*1000;
    const weekEntries = diaryEntries.filter(d => new Date(d.date).getTime() > week);
    document.getElementById('weekCount').textContent = weekEntries.length;
    const avg = weekEntries.length ? (weekEntries.reduce((s,d) => s + d.level, 0) / weekEntries.length).toFixed(1) : '0';
    document.getElementById('avgLevel').textContent = avg;
}
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

document.addEventListener('DOMContentLoaded', () => {
    const sl = document.getElementById('angerLevel');
    const disp = document.getElementById('levelValue');
    if(sl && disp) sl.addEventListener('input', e => disp.textContent = e.target.value);
});
renderDiary();