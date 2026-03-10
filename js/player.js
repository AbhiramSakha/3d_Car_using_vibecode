import { clamp, roundRect } from "./utils.js";

export class Player {
    constructor(canvas, lanes) {
        this.canvas = canvas;
        this.lanes = lanes;

        this.w = canvas.width * 0.16;
        this.h = canvas.height * 0.065;

        this.x = lanes[1] - this.w / 2;
        this.y = canvas.height - this.h - 30;

        this.speed = 0.55;
    }

    update(dt, keys) {
        const move = this.speed * dt;
        if (keys.left) this.x -= move;
        if (keys.right) this.x += move;

        const margin = this.canvas.width * 0.12;
        this.x = clamp(this.x, margin, this.canvas.width - margin - this.w);
    }

    draw(ctx) {
        ctx.fillStyle = "#00e5ff";
        roundRect(ctx, this.x, this.y, this.w, this.h, 6);
        ctx.fill();
    }
}