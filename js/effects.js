(function () {
  "use strict";

  class Particle {
    constructor(x, y, color, options) {
      const settings = options || {};
      const angle = Math.random() * Math.PI * 2;
      const speed = settings.speed || 40 + Math.random() * 160;
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = settings.life || 0.45 + Math.random() * 0.55;
      this.maxLife = this.life;
      this.size = settings.size || 1.5 + Math.random() * 3;
      this.color = color;
      this.gravity = settings.gravity || 10;
    }

    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      this.vx *= 0.985;
    }

    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color || "#74f7ff";
      this.life = 1;
    }

    update(dt) {
      this.life -= dt;
      this.y -= 36 * dt;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.font = "700 14px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  window.Particle = Particle;
  window.FloatingText = FloatingText;
}());
