import { Game } from "./game.js";
import { audio } from "./audio.js";

const canvas = document.getElementById("gameCanvas");
canvas.width = Math.min(window.innerWidth, 500);
canvas.height = window.innerHeight;

const game = new Game(canvas);

let last = 0;

function loop(timestamp) {
    const dt = timestamp - last;
    last = timestamp;

    game.update(dt);
    game.draw();

    if (game.running)
        requestAnimationFrame(loop);
}

document.getElementById("start-btn").addEventListener("click", () => {
    game.init();
    game.running = true;
    audio.startEngine();
    requestAnimationFrame(loop);
});