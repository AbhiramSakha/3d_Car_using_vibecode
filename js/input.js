/* =============================================
   MINI CAR RACING – game.js
   A beginner-friendly, top-down car dodging game.
   Everything runs directly in the browser.
   ============================================= */

// ──────────────────────────────────────────────
//  1.  GRAB DOM ELEMENTS
// ──────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('score-value');
const startScr = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const overScr = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const finalScore = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');

// ──────────────────────────────────────────────
//  2.  CANVAS SIZING
//      The canvas fills the viewport height and
//      uses a fixed aspect ratio for the road.
// ──────────────────────────────────────────────
const ROAD_ASPECT = 0.55; // width / height

function resizeCanvas() {
    const h = window.innerHeight;
    const w = Math.min(window.innerWidth, Math.floor(h * ROAD_ASPECT));
    canvas.width = w;
    canvas.height = h;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ──────────────────────────────────────────────
//  3.  SOUND ENGINE  (Web Audio API)
//      We create tiny synthesised sounds so we
//      don't need any audio files.
// ──────────────────────────────────────────────
let audioCtx = null;

/** Lazily create the AudioContext (must happen after user gesture). */
function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

/** Play a short beep / tone. */
function playTone(freq, duration, type = 'square', volume = 0.15) {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

/** Engine hum – a looping low-frequency buzz. */
let engineNode = null;
let engineGain = null;

function startEngine() {
    ensureAudio();
    engineNode = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineNode.type = 'sawtooth';
    engineNode.frequency.value = 80;
    engineGain.gain.value = 0.04;
    engineNode.connect(engineGain).connect(audioCtx.destination);
    engineNode.start();
}

function stopEngine() {
    if (engineNode) {
        engineNode.stop();
        engineNode = null;
    }
}

/** Crash – a noisy burst. */
function playCrash() {
    ensureAudio();
    const bufferSize = audioCtx.sampleRate * 0.35;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    src.connect(gain).connect(audioCtx.destination);
    src.start();
}

/** Score milestone sound. */
function playMilestone() {
    playTone(880, 0.12, 'sine', 0.18);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.18), 100);
}

/** Horn honk – realistic dual-tone car horn with vibrato (press H). */
function playHorn() {
    ensureAudio();
    const now = audioCtx.currentTime;
    const duration = 0.55;

    // ── Tone 1: low fundamental ──
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(420, now);
    // Slight vibrato for realism
    const lfo1 = audioCtx.createOscillator();
    const lfoGain1 = audioCtx.createGain();
    lfo1.frequency.value = 6;    // 6 Hz vibrato
    lfoGain1.gain.value = 8;    // ±8 Hz wobble
    lfo1.connect(lfoGain1).connect(osc1.frequency);
    lfo1.start(now); lfo1.stop(now + duration);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.setValueAtTime(0.18, now + duration * 0.75);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain1).connect(audioCtx.destination);
    osc1.start(now); osc1.stop(now + duration);

    // ── Tone 2: higher harmonic (classic dual-horn) ──
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(530, now);
    const lfo2 = audioCtx.createOscillator();
    const lfoGain2 = audioCtx.createGain();
    lfo2.frequency.value = 6;
    lfoGain2.gain.value = 10;
    lfo2.connect(lfoGain2).connect(osc2.frequency);
    lfo2.start(now); lfo2.stop(now + duration);
    gain2.gain.setValueAtTime(0.14, now);
    gain2.gain.setValueAtTime(0.14, now + duration * 0.75);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc2.connect(gain2).connect(audioCtx.destination);
    osc2.start(now); osc2.stop(now + duration);

    // ── Tone 3: sub-bass body ──
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.value = 210;
    gain3.gain.setValueAtTime(0.10, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);
    osc3.connect(gain3).connect(audioCtx.destination);
    osc3.start(now); osc3.stop(now + duration);
}

/** Flash headlights visual state. */
let flashActive = false;
let flashTimer = 0;
const FLASH_DURATION = 300; // ms

/** Horn cooldown to prevent spamming. */
let hornCooldown = 0;
const HORN_COOLDOWN = 500; // ms

// ──────────────────────────────────────────────
//  4.  GAME STATE
// ──────────────────────────────────────────────
let player = {};   // Player car object
let enemies = [];   // Array of enemy car objects
let lanes = [];   // X-centre positions of each lane
let dashes = [];   // Road dashes for animation
let score = 0;
let highScore = 0;
let gameRunning = false;
let frameId = null;
let lastTime = 0;
let difficultyTimer = 0;
let spawnTimer = 0;

// Difficulty knobs (increase over time)
let enemySpeed = 0;
let spawnInterval = 0;

// Key tracking
const keys = { left: false, right: false, horn: false, flash: false };

// ──────────────────────────────────────────────
//  5.  CONSTANTS  (scale with canvas width)
// ──────────────────────────────────────────────
const LANE_COUNT = 3;
const CAR_W_RATIO = 0.16;   // car width  relative to canvas width
const CAR_H_RATIO = 0.065;  // car height relative to canvas height
const PLAYER_SPEED = 0.55;   // pixels per ms
const INITIAL_ENEMY_SPEED = 0.25; // px/ms
const MAX_ENEMY_SPEED = 0.7;
const INITIAL_SPAWN_INTERVAL = 1200; // ms
const MIN_SPAWN_INTERVAL = 400;
const DASH_SPEED_RATIO = 0.6;  // dashes move at 60 % of enemy speed
const SCORE_PER_SECOND = 10;

// ──────────────────────────────────────────────
//  6.  HELPER: BUILD LANES & DASHES
// ──────────────────────────────────────────────
function buildLanes() {
    const w = canvas.width;
    const margin = w * 0.12;           // left & right kerb
    const roadW = w - margin * 2;
    const laneW = roadW / LANE_COUNT;
    lanes = [];
    for (let i = 0; i < LANE_COUNT; i++) {
        lanes.push(margin + laneW * i + laneW / 2);
    }
}

function buildDashes() {
    dashes = [];
    const gap = canvas.height / 8;
    for (let y = 0; y < canvas.height + gap; y += gap) {
        dashes.push(y);
    }
}

// ──────────────────────────────────────────────
//  7.  INIT / RESET
// ──────────────────────────────────────────────
function initGame() {
    resizeCanvas();
    buildLanes();
    buildDashes();

    const carW = canvas.width * CAR_W_RATIO;
    const carH = canvas.height * CAR_H_RATIO;

    // Place player in the middle lane near the bottom
    player = {
        x: lanes[Math.floor(LANE_COUNT / 2)] - carW / 2,
        y: canvas.height - carH - 30,
        w: carW,
        h: carH,
        targetLane: Math.floor(LANE_COUNT / 2),
        color: '#00e5ff'
    };

    enemies = [];
    score = 0;
    difficultyTimer = 0;
    spawnTimer = 0;
    enemySpeed = INITIAL_ENEMY_SPEED;
    spawnInterval = INITIAL_SPAWN_INTERVAL;

    scoreVal.textContent = '0';
}

// ──────────────────────────────────────────────
//  8.  INPUT HANDLERS
// ──────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;

    // Horn – press H
    if ((e.key === 'h' || e.key === 'H') && gameRunning && hornCooldown <= 0) {
        keys.horn = true;
        playHorn();
        hornCooldown = HORN_COOLDOWN;
        scareEnemies();  // enemies may swerve out of the way
    }

    // Flash headlights – press F
    if ((e.key === 'f' || e.key === 'F') && gameRunning && !flashActive) {
        keys.flash = true;
        flashActive = true;
        flashTimer = FLASH_DURATION;
        playTone(1200, 0.06, 'sine', 0.08); // subtle click sound
        scareEnemies();  // enemies may swerve out of the way
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'h' || e.key === 'H') keys.horn = false;
    if (e.key === 'f' || e.key === 'F') keys.flash = false;
});

// Touch controls for mobile
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    if (dx < -20) { keys.left = true; keys.right = false; }
    else if (dx > 20) { keys.right = true; keys.left = false; }
}, { passive: false });
canvas.addEventListener('touchend', () => { keys.left = false; keys.right = false; });

// ──────────────────────────────────────────────
//  9.  SPAWN ENEMY
// ──────────────────────────────────────────────
function spawnEnemy() {
    const carW = canvas.width * CAR_W_RATIO;
    const carH = canvas.height * CAR_H_RATIO;
    const lane = Math.floor(Math.random() * LANE_COUNT);

    // Pick a random warm-ish color for variety
    const colors = ['#ff3c78', '#ffa726', '#e040fb', '#ff6e40', '#ffeb3b', '#76ff03'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const xPos = lanes[lane] - carW / 2;
    enemies.push({
        x: xPos,
        y: -carH,
        w: carW,
        h: carH,
        color,
        lane: lane,       // track which lane this enemy is in
        targetX: xPos,    // target X for smooth swerving
        swerving: false   // whether currently swerving
    });
}

// ──────────────────────────────────────────────
//  9b.  SCARE ENEMIES (horn / flash reaction)
//       Enemies in the player's lane randomly
//       decide to swerve to another lane.
// ──────────────────────────────────────────────
const SWERVE_SPEED = 0.35; // px per ms – how fast they change lanes

/** Determine which lane a car is currently closest to. */
function getLane(car) {
    const carCentre = car.x + car.w / 2;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < lanes.length; i++) {
        const d = Math.abs(carCentre - lanes[i]);
        if (d < minDist) { minDist = d; closest = i; }
    }
    return closest;
}

/** Get the lane the player is currently in. */
function getPlayerLane() {
    return getLane(player);
}

/** Make enemies in the same lane as the player swerve away. */
function scareEnemies() {
    const playerLane = getPlayerLane();
    const carW = canvas.width * CAR_W_RATIO;

    for (const enemy of enemies) {
        // Only affect enemies that are in the player's lane & visible on screen
        const eLane = getLane(enemy);
        if (eLane !== playerLane) continue;
        if (enemy.y + enemy.h < 0) continue;       // not visible yet
        if (enemy.swerving) continue;               // already swerving

        // Random chance to react (70 %)
        if (Math.random() > 0.7) continue;

        // Pick a random DIFFERENT lane
        let newLane = eLane;
        while (newLane === eLane) {
            newLane = Math.floor(Math.random() * LANE_COUNT);
        }
        enemy.lane = newLane;
        enemy.targetX = lanes[newLane] - carW / 2;
        enemy.swerving = true;
    }
}

// ──────────────────────────────────────────────
//  10.  COLLISION DETECTION  (AABB)
// ──────────────────────────────────────────────
function isColliding(a, b) {
    // Shrink hitboxes slightly so near-misses feel fair
    const pad = 4;
    return (
        a.x + pad < b.x + b.w - pad &&
        a.x + a.w - pad > b.x + pad &&
        a.y + pad < b.y + b.h - pad &&
        a.y + a.h - pad > b.y + pad
    );
}

// ──────────────────────────────────────────────
//  11.  DRAW HELPERS
// ──────────────────────────────────────────────

/** Draw the road surface, lane markers, and kerbs. */
function drawRoad() {
    const w = canvas.width;
    const h = canvas.height;
    const margin = w * 0.12;

    // Road surface
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(margin, 0, w - margin * 2, h);

    // Kerbs (red/white candy stripe feel)
    const kerbW = 6;
    ctx.fillStyle = '#ff3c78';
    ctx.fillRect(margin - kerbW, 0, kerbW, h);
    ctx.fillRect(w - margin, 0, kerbW, h);

    // Lane dashes
    const laneW = (w - margin * 2) / LANE_COUNT;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 24]);

    for (let i = 1; i < LANE_COUNT; i++) {
        const x = margin + laneW * i;
        ctx.beginPath();
        // Offset dashes to simulate movement
        ctx.lineDashOffset = -dashes[0];
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

/** Draw a simple car shape (body + cabin + wheels). */
function drawCar(car, isPlayer) {
    const { x, y, w, h, color } = car;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    roundRect(ctx, x + 3, y + 3, w, h, 6);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();

    // Cabin (darker rectangle)
    const cabinH = h * 0.35;
    const cabinY = isPlayer ? y + h * 0.18 : y + h * 0.47;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    roundRect(ctx, x + w * 0.15, cabinY, w * 0.7, cabinH, 3);
    ctx.fill();

    // Windshield highlight
    ctx.fillStyle = 'rgba(150,220,255,0.25)';
    ctx.beginPath();
    const wsY = isPlayer ? y + h * 0.18 : y + h * 0.47;
    roundRect(ctx, x + w * 0.18, wsY + 2, w * 0.64, cabinH * 0.45, 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#222';
    const wheelW = w * 0.14;
    const wheelH = h * 0.22;
    // Front wheels
    const frontY = isPlayer ? y + 2 : y + h - wheelH - 2;
    ctx.fillRect(x - wheelW * 0.3, frontY, wheelW, wheelH);
    ctx.fillRect(x + w - wheelW * 0.7, frontY, wheelW, wheelH);
    // Rear wheels
    const rearY = isPlayer ? y + h - wheelH - 2 : y + 2;
    ctx.fillRect(x - wheelW * 0.3, rearY, wheelW, wheelH);
    ctx.fillRect(x + w - wheelW * 0.7, rearY, wheelW, wheelH);

    // Headlights / taillights
    if (isPlayer) {
        // Headlights (top of player car)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + w * 0.12, y, w * 0.18, 4);
        ctx.fillRect(x + w * 0.70, y, w * 0.18, 4);
    } else {
        // Taillights (bottom of enemy car — facing player)
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(x + w * 0.10, y + h - 4, w * 0.2, 4);
        ctx.fillRect(x + w * 0.70, y + h - 4, w * 0.2, 4);
    }
}

/** Helper: rounded rectangle path. */
function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ──────────────────────────────────────────────
//  12.  MAIN GAME LOOP
// ──────────────────────────────────────────────
function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Guard against huge dt (e.g. tab was hidden)
    const delta = Math.min(dt, 50);

    update(delta);
    draw();

    frameId = requestAnimationFrame(gameLoop);
}

// ──────────────────────────────────────────────
//  13.  UPDATE
// ──────────────────────────────────────────────
function update(dt) {
    // ── Player movement ──
    const speed = PLAYER_SPEED * dt;
    const margin = canvas.width * 0.12;
    if (keys.left) player.x -= speed;
    if (keys.right) player.x += speed;
    // Clamp inside the road
    player.x = Math.max(margin + 2, Math.min(canvas.width - margin - player.w - 2, player.x));

    // ── Animate road dashes ──
    const dashSpeed = enemySpeed * DASH_SPEED_RATIO * dt;
    for (let i = 0; i < dashes.length; i++) {
        dashes[i] += dashSpeed;
        if (dashes[i] > canvas.height + 40) dashes[i] -= canvas.height + canvas.height / 8;
    }

    // ── Spawn enemies ──
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnEnemy();
        // Little "whoosh" when a new car spawns
        playTone(300 + Math.random() * 200, 0.08, 'sine', 0.06);
    }

    // ── Move enemies ──
    const eSpeed = enemySpeed * dt;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += eSpeed;

        // Smooth swerve toward targetX
        if (e.swerving) {
            const diff = e.targetX - e.x;
            if (Math.abs(diff) < 2) {
                e.x = e.targetX;
                e.swerving = false;
            } else {
                e.x += Math.sign(diff) * SWERVE_SPEED * dt;
            }
        }

        // Remove if off-screen
        if (e.y > canvas.height + 20) {
            enemies.splice(i, 1);
            continue;
        }
        // Check collision
        if (isColliding(player, e)) {
            gameOver();
            return;
        }
    }

    // ── Score ──
    score += SCORE_PER_SECOND * (dt / 1000);
    const displayScore = Math.floor(score);
    scoreVal.textContent = displayScore;

    // Milestone sound every 50 points
    if (Math.floor((score - SCORE_PER_SECOND * (dt / 1000))) / 50 < Math.floor(score) / 50) {
        if (displayScore > 0 && displayScore % 50 === 0) playMilestone();
    }

    // ── Flash headlight timer ──
    if (flashActive) {
        flashTimer -= dt;
        if (flashTimer <= 0) {
            flashActive = false;
            flashTimer = 0;
        }
    }

    // ── Horn cooldown ──
    if (hornCooldown > 0) hornCooldown -= dt;

    // ── Ramp difficulty ──
    difficultyTimer += dt;
    if (difficultyTimer > 3000) {
        difficultyTimer = 0;
        enemySpeed = Math.min(enemySpeed + 0.02, MAX_ENEMY_SPEED);
        spawnInterval = Math.max(spawnInterval - 50, MIN_SPAWN_INTERVAL);
        // Raise engine pitch slightly
        if (engineNode) engineNode.frequency.value = 80 + (enemySpeed - INITIAL_ENEMY_SPEED) * 180;
    }
}

// ──────────────────────────────────────────────
//  14.  DRAW
// ──────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (offroad area)
    ctx.fillStyle = '#0d0d19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoad();

    // Draw enemies
    enemies.forEach(e => drawCar(e, false));

    // Draw player
    drawCar(player, true);

    // ── Headlight flash effect ──
    if (flashActive) {
        const intensity = flashTimer / FLASH_DURATION; // 1 → 0 fade
        const cx = player.x + player.w / 2;
        const cy = player.y;

        // Bright headlight beams (two cones from headlights)
        const beamLen = canvas.height * 0.45 * intensity;
        const beamW = player.w * 1.8;

        // Left beam
        const lx = player.x + player.w * 0.2;
        const grad1 = ctx.createLinearGradient(lx, cy, lx, cy - beamLen);
        grad1.addColorStop(0, `rgba(255, 255, 220, ${0.5 * intensity})`);
        grad1.addColorStop(1, 'rgba(255, 255, 220, 0)');
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.moveTo(lx - 4, cy);
        ctx.lineTo(lx - beamW * 0.3, cy - beamLen);
        ctx.lineTo(lx + beamW * 0.15, cy - beamLen);
        ctx.lineTo(lx + 4, cy);
        ctx.closePath();
        ctx.fill();

        // Right beam
        const rx = player.x + player.w * 0.8;
        const grad2 = ctx.createLinearGradient(rx, cy, rx, cy - beamLen);
        grad2.addColorStop(0, `rgba(255, 255, 220, ${0.5 * intensity})`);
        grad2.addColorStop(1, 'rgba(255, 255, 220, 0)');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.moveTo(rx - 4, cy);
        ctx.lineTo(rx - beamW * 0.15, cy - beamLen);
        ctx.lineTo(rx + beamW * 0.3, cy - beamLen);
        ctx.lineTo(rx + 4, cy);
        ctx.closePath();
        ctx.fill();

        // Glow around the car
        ctx.shadowColor = 'rgba(255, 255, 200, 0.6)';
        ctx.shadowBlur = 30 * intensity;
        ctx.fillStyle = `rgba(255, 255, 200, ${0.12 * intensity})`;
        ctx.fillRect(player.x - 10, player.y - 10, player.w + 20, player.h + 20);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

// ──────────────────────────────────────────────
//  15.  GAME OVER
// ──────────────────────────────────────────────
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(frameId);
    stopEngine();
    playCrash();

    const finalS = Math.floor(score);
    finalScore.textContent = finalS;
    if (finalS > highScore) highScore = finalS;
    highScoreEl.textContent = highScore;

    hud.classList.remove('visible');
    overScr.classList.remove('hidden');
}

// ──────────────────────────────────────────────
//  16.  START / RESTART
// ──────────────────────────────────────────────
function startGame() {
    initGame();
    hud.classList.add('visible');
    startScr.classList.add('hidden');
    overScr.classList.add('hidden');

    gameRunning = true;
    lastTime = performance.now();
    startEngine();
    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Also allow pressing Enter / Space to start / restart
window.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !gameRunning) {
        e.preventDefault();
        startGame();
    }
});