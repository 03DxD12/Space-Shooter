(function () {
  "use strict";

  const SPECIAL_COLORS = {
    golden: "#ffd15c",
    shield: "#7a8cff",
    health: "#ff668c",
    freeze: "#65f5ff",
    nova: "#ff8bf3",
    dual: "#82ff9d",
    normal: "#a9bad0"
  };

  class Asteroid {
    constructor(word, x, y, speed, type, radius) {
      this.word = word;
      this.x = x;
      this.y = y;
      this.speed = speed;
      this.type = type || "normal";
      this.radius = radius || Math.max(28, Math.min(48, 22 + word.length * 2.25));
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.8;
      this.shapeSeed = Array.from({ length: 10 }, () => 0.78 + Math.random() * 0.27);
      this.typed = 0;
      this.targeted = false;
      this.locked = false;
      this.removed = false;
    }

    update(dt, speedFactor) {
      if (this.locked) return;
      this.y += this.speed * speedFactor * dt;
      this.rotation += this.rotationSpeed * dt;
    }

    draw(ctx, time) {
      const color = SPECIAL_COLORS[this.type] || SPECIAL_COLORS.normal;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.type === "normal" ? "#283243" : color;
      ctx.strokeStyle = this.targeted ? "#65f5ff" : color;
      ctx.lineWidth = this.targeted ? 3 : 1.5;
      ctx.shadowColor = this.targeted ? "#65f5ff" : color;
      ctx.shadowBlur = this.targeted ? 20 + Math.sin(time * 0.01) * 5 : (this.type === "normal" ? 2 : 12);
      ctx.beginPath();
      this.shapeSeed.forEach((factor, index) => {
        const angle = (index / this.shapeSeed.length) * Math.PI * 2;
        const r = this.radius * factor;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#050817";
      ctx.beginPath();
      ctx.arc(-this.radius * 0.22, -this.radius * 0.25, this.radius * 0.2, 0, Math.PI * 2);
      ctx.arc(this.radius * 0.25, this.radius * 0.12, this.radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.targeted) this.drawTargetBrackets(ctx, color);
      this.drawWord(ctx, color);
    }

    drawTargetBrackets(ctx) {
      const r = this.radius + 12;
      const s = 10;
      ctx.save();
      ctx.strokeStyle = "#65f5ff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#65f5ff";
      ctx.shadowBlur = 8;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(this.x + sx * r, this.y + sy * (r - s));
        ctx.lineTo(this.x + sx * r, this.y + sy * r);
        ctx.lineTo(this.x + sx * (r - s), this.y + sy * r);
        ctx.stroke();
      });
      ctx.restore();
    }

    drawWord(ctx, color) {
      const fontSize = this.word.length > 12 ? 12 : this.word.length > 8 ? 13 : 15;
      ctx.save();
      ctx.font = `700 ${fontSize}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fullWidth = ctx.measureText(this.word).width;
      const startX = this.x - fullWidth / 2;
      ctx.textAlign = "left";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(3, 7, 19, .9)";
      ctx.strokeText(this.word, startX, this.y);
      const typedText = this.word.slice(0, this.typed);
      const remaining = this.word.slice(this.typed);
      ctx.fillStyle = this.typed ? "#65f5ff" : (this.type === "normal" ? "#ffffff" : color);
      ctx.fillText(typedText, startX, this.y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(remaining, startX + ctx.measureText(typedText).width, this.y);
      if (this.type !== "normal") {
        ctx.font = "700 8px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.fillText(this.type.toUpperCase(), this.x, this.y - this.radius - 9);
      }
      ctx.restore();
    }
  }

  window.Asteroid = Asteroid;
}());
