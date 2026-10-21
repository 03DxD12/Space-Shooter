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
      this.drawCometTail(ctx, time, color);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // Celestial 3D shaded rock gradient
      const bodyGrad = ctx.createRadialGradient(
        -this.radius * 0.35, -this.radius * 0.35, this.radius * 0.1,
        0, 0, this.radius
      );
      if (this.type === "normal") {
        bodyGrad.addColorStop(0, "#4a688f");
        bodyGrad.addColorStop(0.4, "#273b54");
        bodyGrad.addColorStop(0.82, "#132030");
        bodyGrad.addColorStop(1, "#0a1320");
      } else {
        bodyGrad.addColorStop(0, "#ffffff");
        bodyGrad.addColorStop(0.28, color);
        bodyGrad.addColorStop(0.78, "#162335");
        bodyGrad.addColorStop(1, "#09101a");
      }

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = this.targeted ? "#65f5ff" : (this.type === "normal" ? "#7be5ff" : color);
      ctx.lineWidth = this.targeted ? 3.5 : 2;
      ctx.shadowColor = this.targeted ? "#65f5ff" : (this.type === "normal" ? "rgba(101, 245, 255, 0.7)" : color);
      ctx.shadowBlur = this.targeted ? 24 + Math.sin(time * 0.01) * 5 : (this.type === "normal" ? 14 : 18);

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

      // Craters with lighted edges
      ctx.fillStyle = "rgba(7, 14, 25, 0.72)";
      ctx.strokeStyle = "rgba(120, 220, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-this.radius * 0.22, -this.radius * 0.25, this.radius * 0.2, 0, Math.PI * 2);
      ctx.arc(this.radius * 0.26, this.radius * 0.14, this.radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing radiant core pip
      ctx.fillStyle = this.targeted ? "#65f5ff" : (this.type === "normal" ? "rgba(125, 230, 255, 0.75)" : color);
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (this.targeted) this.drawTargetBrackets(ctx, color);
      this.drawWord(ctx, color);
    }

    drawCometTail(ctx, time, color) {
      ctx.save();
      const tailLen = Math.max(42, Math.min(95, this.speed * 0.9 + this.radius * 1.2));
      const wobble = Math.sin(time * 0.015 + this.x * 0.06) * 3.5;
      const tailWidth = this.radius * 0.95;
      const tailTop = this.y - tailLen;

      // Outer luminous comet plume gradient
      const plumeGrad = ctx.createLinearGradient(this.x, this.y, this.x, tailTop);
      const baseAlpha = this.targeted ? 0.9 : 0.65;
      if (this.type === "golden") {
        plumeGrad.addColorStop(0, `rgba(255, 215, 90, ${baseAlpha})`);
        plumeGrad.addColorStop(0.35, "rgba(255, 145, 50, 0.38)");
        plumeGrad.addColorStop(1, "rgba(255, 90, 0, 0)");
      } else if (this.type === "nova") {
        plumeGrad.addColorStop(0, `rgba(255, 139, 243, ${baseAlpha})`);
        plumeGrad.addColorStop(0.4, "rgba(170, 85, 255, 0.38)");
        plumeGrad.addColorStop(1, "rgba(120, 40, 220, 0)");
      } else if (this.type === "freeze") {
        plumeGrad.addColorStop(0, `rgba(101, 245, 255, ${baseAlpha})`);
        plumeGrad.addColorStop(0.4, "rgba(65, 165, 255, 0.38)");
        plumeGrad.addColorStop(1, "rgba(40, 100, 255, 0)");
      } else {
        // Normal comet trail: bright electric cyan-blue ion plume
        plumeGrad.addColorStop(0, `rgba(115, 230, 255, ${baseAlpha})`);
        plumeGrad.addColorStop(0.3, "rgba(75, 160, 255, 0.45)");
        plumeGrad.addColorStop(0.7, "rgba(45, 100, 210, 0.2)");
        plumeGrad.addColorStop(1, "rgba(20, 50, 160, 0)");
      }

      ctx.beginPath();
      ctx.moveTo(this.x - tailWidth / 2, this.y);
      ctx.quadraticCurveTo(this.x - tailWidth * 0.25 + wobble, this.y - tailLen * 0.5, this.x + wobble * 0.6, tailTop);
      ctx.quadraticCurveTo(this.x + tailWidth * 0.25 + wobble, this.y - tailLen * 0.5, this.x + tailWidth / 2, this.y);
      ctx.closePath();
      ctx.fillStyle = plumeGrad;
      ctx.fill();

      // Inner intense plasma core streamer
      const coreGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y - tailLen * 0.65);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(0.35, this.targeted ? "rgba(101, 245, 255, 0.85)" : "rgba(145, 235, 255, 0.7)");
      coreGrad.addColorStop(1, "rgba(100, 200, 255, 0)");

      ctx.beginPath();
      ctx.moveTo(this.x - 3.5, this.y);
      ctx.lineTo(this.x + wobble * 0.3, this.y - tailLen * 0.65);
      ctx.lineTo(this.x + 3.5, this.y);
      ctx.closePath();
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Trailing ion sparks
      for (let i = 0; i < 3; i += 1) {
        const offsetRatio = ((time * 0.045 + i * 0.33) % 1);
        const sparkY = this.y - offsetRatio * tailLen;
        const sparkSpread = (Math.sin(time * 0.02 + i * 2.2) * tailWidth * 0.35) * (1 - offsetRatio);
        const sparkX = this.x + sparkSpread;
        const sparkR = (1.4 - offsetRatio) * 1.5;
        if (sparkR > 0.4) {
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210, 250, 255, ${(1 - offsetRatio) * 0.85})`;
          ctx.fill();
        }
      }

      ctx.restore();
    }

    drawTargetBrackets(ctx) {
      const r = this.radius + 12;
      const s = 11;
      ctx.save();
      ctx.strokeStyle = "#65f5ff";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#65f5ff";
      ctx.shadowBlur = 10;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(this.x + sx * r, this.y + sy * (r - s));
        ctx.lineTo(this.x + sx * r, this.y + sy * r);
        ctx.lineTo(this.x + sx * (r - s), this.y + sy * r);
        ctx.stroke();
      });

      // Target reticle pip on left and right
      ctx.fillStyle = "#65f5ff";
      ctx.beginPath();
      ctx.arc(this.x - r - 4, this.y, 2, 0, Math.PI * 2);
      ctx.arc(this.x + r + 4, this.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawWord(ctx, color) {
      const fontSize = this.word.length > 12 ? 13 : this.word.length > 8 ? 14 : 16;
      ctx.save();
      ctx.font = `700 ${fontSize}px "Bahnschrift", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fullWidth = ctx.measureText(this.word).width;
      const startX = this.x - fullWidth / 2;

      // Draw high-visibility contrast backing pill
      const pillW = fullWidth + 16;
      const pillH = fontSize + 10;
      const pillX = startX - 8;
      const pillY = this.y - pillH / 2;

      ctx.fillStyle = this.targeted ? "rgba(5, 14, 34, 0.94)" : "rgba(3, 9, 24, 0.88)";
      ctx.strokeStyle = this.targeted ? "#65f5ff" : "rgba(101, 245, 255, 0.55)";
      ctx.lineWidth = this.targeted ? 2 : 1.2;
      ctx.shadowColor = this.targeted ? "#65f5ff" : "rgba(101, 245, 255, 0.35)";
      ctx.shadowBlur = this.targeted ? 12 : 6;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, pillH, 5);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#01040a";
      ctx.strokeText(this.word, startX, this.y);

      const typedText = this.word.slice(0, this.typed);
      const nextChar = this.targeted ? (this.word[this.typed] || "") : "";
      const remaining = this.word.slice(this.targeted ? this.typed + 1 : this.typed);

      let currentX = startX;

      // Typed part - glowing neon cyan
      if (typedText) {
        ctx.fillStyle = "#65f5ff";
        ctx.shadowColor = "#65f5ff";
        ctx.shadowBlur = 8;
        ctx.fillText(typedText, currentX, this.y);
        ctx.shadowBlur = 0;
        currentX += ctx.measureText(typedText).width;
      }

      // Next expected character (highlighted in gold when targeted)
      if (nextChar) {
        ctx.fillStyle = "#ffd15c";
        ctx.shadowColor = "#ffd15c";
        ctx.shadowBlur = 10;
        ctx.fillText(nextChar, currentX, this.y);
        ctx.shadowBlur = 0;
        currentX += ctx.measureText(nextChar).width;
      }

      // Remaining part - bright pure white for maximum legibility from afar!
      // If NOT targeted, highlight the first letter with golden tint so player immediately spots what to type!
      if (!this.targeted && remaining.length > 0) {
        const firstLetter = remaining[0];
        const restOfWord = remaining.slice(1);

        ctx.fillStyle = "#ffe48a"; // Distinct golden highlight for first letter
        ctx.shadowColor = "rgba(255, 228, 138, 0.6)";
        ctx.shadowBlur = 6;
        ctx.fillText(firstLetter, currentX, this.y);
        ctx.shadowBlur = 0;
        currentX += ctx.measureText(firstLetter).width;

        if (restOfWord) {
          ctx.fillStyle = this.type === "normal" ? "#f3f8ff" : color;
          ctx.fillText(restOfWord, currentX, this.y);
        }
      } else if (remaining) {
        ctx.fillStyle = this.type === "normal" ? "#f3f8ff" : color;
        ctx.fillText(remaining, currentX, this.y);
      }

      // Special asteroid type badge above
      if (this.type !== "normal") {
        ctx.font = "700 9px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillText(this.type.toUpperCase(), this.x, pillY - 4);
      }
      ctx.restore();
    }
  }

  window.Asteroid = Asteroid;
}());
