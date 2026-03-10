class AudioManager {
    constructor() {
        this.ctx = null;
        this.engine = null;
        this.engineGain = null;
    }

    init() {
        if (!this.ctx)
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    tone(freq, duration, type = "square", volume = 0.1) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    startEngine() {
        this.init();
        this.engine = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engine.type = "sawtooth";
        this.engine.frequency.value = 80;
        this.engineGain.gain.value = 0.04;
        this.engine.connect(this.engineGain).connect(this.ctx.destination);
        this.engine.start();
    }

    stopEngine() {
        if (this.engine) this.engine.stop();
    }
}

export const audio = new AudioManager();