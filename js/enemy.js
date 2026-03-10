import { roundRect } from "./utils.js";

export class Enemy {
    constructor(canvas, laneX) {
        this.canvas = canvas;
        this.w = canvas.width * 0.16;
        this.h = canvas.height * 0.065;
        this.x = laneX - this.w / 2;
        this.y = -this.h;
        this.speed = 0.25;
        this.color = "#ff3c78";
    }

    update(dt) {
        this.y += this.speed * dt;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        roundRect(ctx, this.x, this.y, this.w, this.h, 6);
        ctx.fill();
    }
}