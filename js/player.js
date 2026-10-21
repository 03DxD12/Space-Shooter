(function () {
  "use strict";

  class Player {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.pulse = 0;
    }

    resize(width, height, isMobile) {
      this.x = width / 2;
      this.y = isMobile ? height - 60 : height - Math.max(50, height * 0.09);
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y;
    }

    update(dt) {
      this.pulse += dt * 7;
    }

    draw(ctx) {
      const glow = 12 + Math.sin(this.pulse) * 4;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowColor = "#45e8ff";
      ctx.shadowBlur = glow;

      const flame = ctx.createLinearGradient(0, 18, 0, 42);
      flame.addColorStop(0, "#fff6b5");
      flame.addColorStop(0.35, "#ff8a3d");
      flame.addColorStop(1, "rgba(116,247,255,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-7, 18);
      ctx.quadraticCurveTo(0, 38 + Math.sin(this.pulse) * 5, 7, 18);
      ctx.fill();

      const hull = ctx.createLinearGradient(-24, -22, 20, 25);
      hull.addColorStop(0, "#eafcff");
      hull.addColorStop(0.35, "#6fe9fb");
      hull.addColorStop(1, "#184f78");
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(11, -4);
      ctx.lineTo(30, 17);
      ctx.lineTo(10, 13);
      ctx.lineTo(0, 25);
      ctx.lineTo(-10, 13);
      ctx.lineTo(-30, 17);
      ctx.lineTo(-11, -4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#08152d";
      ctx.beginPath();
      ctx.ellipse(0, -5, 6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.65)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  class Projectile {
    constructor(x, y, target, mega, lethal) {
      this.x = x;
      this.y = y;
      this.target = target;
      this.mega = Boolean(mega);
      this.lethal = Boolean(lethal);
      this.speed = mega ? 1500 : 1050;
      this.done = false;
      this.trail = [];
    }

    update(dt) {
      if (!this.target || this.target.removed) {
        this.done = true;
        return false;
      }
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < Math.max(18, this.speed * dt)) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.done = true;
        return true;
      }
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 3) this.trail.shift();
      this.x += (dx / distance) * this.speed * dt;
      this.y += (dy / distance) * this.speed * dt;
      return false;
    }

    draw(ctx) {
      ctx.save();
      const color = this.mega ? "#ffd15c" : "#65f5ff";
      ctx.strokeStyle = color;
      ctx.lineWidth = this.mega ? 5 : 2.5;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = this.mega ? 18 : 12;
      ctx.beginPath();
      if (this.trail.length) ctx.moveTo(this.trail[0].x, this.trail[0].y);
      this.trail.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.mega ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.mega ? 8 : 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  window.Player = Player;
  window.Projectile = Projectile;
}());
