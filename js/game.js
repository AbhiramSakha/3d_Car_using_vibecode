// ================================
// MINI RACER – FIXED LANE VERSION
// ================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = window.innerHeight;

const hud = document.getElementById("hud");
const scoreValue = document.getElementById("score-value");

const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finalScore = document.getElementById("final-score");

let player;
let enemies = [];
let score = 0;
let gameRunning = false;
let lastTime = 0;

const laneCount = 3;
let lanes = [];

// ================================
// BUILD LANES
// ================================
function buildLanes() {
    const laneWidth = canvas.width / laneCount;
    lanes = [];

    for (let i = 0; i < laneCount; i++) {
        lanes.push(laneWidth * i + laneWidth / 2 - 25);
    }
}

// ================================
// INIT GAME
// ================================
function initGame() {
    buildLanes();

    player = {
        lane: 1,
        x: lanes[1],
        targetX: lanes[1],
        y: canvas.height - 130,
        w: 50,
        h: 100
    };

    enemies = [];
    score = 0;
    scoreValue.textContent = "0";
}

// ================================
// KEY CONTROL (ALWAYS ACTIVE)
// ================================
document.addEventListener("keydown", (e) => {

    // Prevent arrow keys from scrolling page
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    }

    if (!gameRunning) return;

    if (e.key === "ArrowLeft" && player.lane > 0) {
        player.lane--;
        player.targetX = lanes[player.lane];
    }

    if (e.key === "ArrowRight" && player.lane < laneCount - 1) {
        player.lane++;
        player.targetX = lanes[player.lane];
    }
});

// ================================
// SPAWN ENEMY
// ================================
function spawnEnemy() {
    const lane = Math.floor(Math.random() * laneCount);

    enemies.push({
        lane: lane,
        x: lanes[lane],
        y: -120,
        w: 50,
        h: 100,
        speed: 250
    });
}

// ================================
// UPDATE
// ================================
function update(dt) {
    if (!gameRunning) return;

    // Smooth lane movement
    player.x += (player.targetX - player.x) * 0.2;

    // Move enemies
    enemies.forEach(enemy => {
        enemy.y += enemy.speed * dt;
    });

    enemies = enemies.filter(enemy => enemy.y < canvas.height + 100);

    if (Math.random() < 0.02) spawnEnemy();

    // Collision
    enemies.forEach(enemy => {
        if (
            player.x < enemy.x + enemy.w &&
            player.x + player.w > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + player.h > enemy.y
        ) {
            gameOver();
        }
    });

    score++;
    scoreValue.textContent = score;
}

// ================================
// DRAW ROAD
// ================================
function drawRoad() {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 30]);

    for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo((canvas.width / laneCount) * i, 0);
        ctx.lineTo((canvas.width / laneCount) * i, canvas.height);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

// ================================
// DRAW CAR
// ================================
function drawCar(car, color, isPlayer = false) {
    const { x, y, w, h } = car;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(x + 4, y + 4, w, h);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.25);

    ctx.fillStyle = "#111";
    ctx.fillRect(x - 6, y + 20, 6, 30);
    ctx.fillRect(x + w, y + 20, 6, 30);

    if (isPlayer) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 8, y, 12, 6);
        ctx.fillRect(x + w - 20, y, 12, 6);
    } else {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(x + 8, y + h - 6, 12, 6);
        ctx.fillRect(x + w - 20, y + h - 6, 12, 6);
    }
}

// ================================
// DRAW
// ================================
function draw() {
    drawRoad();
    drawCar(player, "#00e5ff", true);
    enemies.forEach(enemy => drawCar(enemy, "#ff3c78"));
}

// ================================
// LOOP
// ================================
function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    if (gameRunning) requestAnimationFrame(gameLoop);
}

// ================================
// START
// ================================
function startGame() {
    initGame();
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    hud.classList.add("visible");

    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// ================================
// GAME OVER
// ================================
function gameOver() {
    gameRunning = false;
    finalScore.textContent = score;
    hud.classList.remove("visible");
    gameOverScreen.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);