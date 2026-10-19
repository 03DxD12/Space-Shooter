(function () {
  "use strict";

  const STATES = Object.freeze({
    MENU: "MENU",
    DIFFICULTY_SELECTION: "DIFFICULTY_SELECTION",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER",
    HIGH_SCORES: "HIGH_SCORES",
    HOW_TO_PLAY: "HOW_TO_PLAY"
  });

  const SETTINGS = Object.freeze({
    easy: { speed: 27, spawnDelay: 2.55, maxAsteroids: 3, baseScore: 10, label: "Easy" },
    normal: { speed: 39, spawnDelay: 1.75, maxAsteroids: 5, baseScore: 20, label: "Normal" },
    hard: { speed: 55, spawnDelay: 1.15, maxAsteroids: 8, baseScore: 30, label: "Hard" }
  });

  class SoundSystem {
    constructor() {
      this.enabled = localStorage.getItem("astrotype-sound") !== "off";
      this.context = null;
    }

    ensureContext() {
      if (!this.enabled) return null;
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume();
      return this.context;
    }

    tone(frequency, duration, type, volume, endFrequency) {
      const context = this.ensureContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration);
      gain.gain.setValueAtTime(volume || 0.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    }

    play(name) {
      const sounds = {
        click: () => this.tone(420, 0.06, "sine", 0.025, 620),
        laser: () => this.tone(720, 0.16, "sawtooth", 0.035, 180),
        error: () => this.tone(130, 0.12, "square", 0.025, 90),
        explosion: () => this.tone(150, 0.28, "sawtooth", 0.045, 45),
        power: () => { this.tone(390, 0.25, "sine", 0.035, 820); setTimeout(() => this.tone(650, 0.2, "sine", 0.025, 1100), 80); },
        impact: () => this.tone(90, 0.38, "square", 0.045, 38),
        gameover: () => { this.tone(240, 0.4, "sawtooth", 0.035, 110); setTimeout(() => this.tone(150, 0.5, "sawtooth", 0.035, 60), 280); }
      };
      if (sounds[name]) sounds[name]();
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem("astrotype-sound", this.enabled ? "on" : "off");
      if (this.enabled) this.play("click");
      return this.enabled;
    }
  }

  class Game {
    constructor() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.state = STATES.MENU;
      this.difficulty = localStorage.getItem("astrotype-difficulty") || "normal";
      this.sound = new SoundSystem();
      this.player = new Player();
      this.asteroids = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.activeTarget = null;
      this.ambientRocks = [];
      this.lastTime = performance.now();
      this.spawnTimer = 0;
      this.flashTimer = 0;
      this.shake = 0;
      this.currentScoreId = null;
      this.powerUps = { freeze: 0, double: 0, shield: 0, mega: 0 };
      this.cacheDom();
      this.bindEvents();
      this.resize();
      this.updateSoundButton();
      this.selectDifficulty(this.difficulty);
      this.createAmbientRocks();
      requestAnimationFrame((time) => this.loop(time));
    }

    cacheDom() {
      this.dom = {};
      ["hud", "powerStrip", "typingConsole", "defenseLine", "menuScreen", "difficultyScreen", "howScreen", "scoresScreen", "pauseScreen", "gameOverScreen", "scoreValue", "levelValue", "livesValue", "accuracyValue", "wpmValue", "comboValue", "difficultyBadge", "typedValue", "menuDifficulty", "scoreRows", "soundButton", "soundIcon", "soundLabel", "pilotName"].forEach((id) => {
        this.dom[id] = document.getElementById(id);
      });
      this.screens = [this.dom.menuScreen, this.dom.difficultyScreen, this.dom.howScreen, this.dom.scoresScreen, this.dom.pauseScreen, this.dom.gameOverScreen];
    }

    bindEvents() {
      window.addEventListener("resize", () => this.resize());
      document.addEventListener("keydown", (event) => this.handleKey(event));
      document.getElementById("playButton").addEventListener("click", () => this.startGame());
      document.getElementById("difficultyButton").addEventListener("click", () => this.showScreen(STATES.DIFFICULTY_SELECTION));
      document.getElementById("howButton").addEventListener("click", () => this.showScreen(STATES.HOW_TO_PLAY));
      document.getElementById("scoresButton").addEventListener("click", () => this.showScores(this.difficulty));
      document.getElementById("difficultyConfirm").addEventListener("click", () => this.startGame());
      document.getElementById("resumeButton").addEventListener("click", () => this.resume());
      document.getElementById("restartButton").addEventListener("click", () => this.startGame());
      document.getElementById("playAgainButton").addEventListener("click", () => this.startGame());
      document.getElementById("changeDifficultyButton").addEventListener("click", () => this.showScreen(STATES.DIFFICULTY_SELECTION));
      this.dom.soundButton.addEventListener("click", () => { this.sound.toggle(); this.updateSoundButton(); });
      document.querySelectorAll(".back-menu, .main-menu-button").forEach((button) => button.addEventListener("click", () => this.showScreen(STATES.MENU)));
      document.querySelectorAll(".difficulty-card").forEach((button) => button.addEventListener("click", () => this.selectDifficulty(button.dataset.difficulty)));
      document.querySelectorAll("[data-score-tab]").forEach((button) => button.addEventListener("click", () => this.showScores(button.dataset.scoreTab)));
      document.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => this.sound.play("click")));
      this.dom.pilotName.addEventListener("input", () => this.updateCurrentScoreName());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === STATES.PLAYING) this.pause();
      });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.player.resize(this.width, this.height);
    }

    selectDifficulty(value) {
      if (!SETTINGS[value]) return;
      this.difficulty = value;
      localStorage.setItem("astrotype-difficulty", value);
      this.dom.menuDifficulty.textContent = SETTINGS[value].label;
      document.querySelectorAll(".difficulty-card").forEach((card) => card.classList.toggle("selected", card.dataset.difficulty === value));
    }

    showScreen(state) {
      this.state = state;
      this.screens.forEach((screen) => { screen.hidden = true; screen.classList.remove("active"); });
      const map = {
        [STATES.MENU]: this.dom.menuScreen,
        [STATES.DIFFICULTY_SELECTION]: this.dom.difficultyScreen,
        [STATES.HOW_TO_PLAY]: this.dom.howScreen,
        [STATES.HIGH_SCORES]: this.dom.scoresScreen,
        [STATES.PAUSED]: this.dom.pauseScreen,
        [STATES.GAME_OVER]: this.dom.gameOverScreen
      };
      const screen = map[state];
      if (screen) { screen.hidden = false; requestAnimationFrame(() => screen.classList.add("active")); }
      const playingUi = state === STATES.PLAYING || state === STATES.PAUSED;
      this.dom.hud.hidden = !playingUi;
      this.dom.typingConsole.hidden = !playingUi;
      this.dom.defenseLine.hidden = !playingUi;
      if (state !== STATES.PLAYING && state !== STATES.PAUSED) this.dom.powerStrip.hidden = true;
    }

    startGame() {
      const now = performance.now();
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.correctKeys = 0;
      this.incorrectKeys = 0;
      this.wordsDestroyed = 0;
      this.combo = 0;
      this.highestCombo = 0;
      this.elapsed = 0;
      this.spawnTimer = 0.3;
      this.asteroids = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.activeTarget = null;
      this.powerUps = { freeze: 0, double: 0, shield: 0, mega: 0 };
      this.lastTime = now;
      this.state = STATES.PLAYING;
      this.screens.forEach((screen) => { screen.hidden = true; screen.classList.remove("active"); });
      this.dom.hud.hidden = false;
      this.dom.typingConsole.hidden = false;
      this.dom.defenseLine.hidden = false;
      this.dom.difficultyBadge.textContent = this.difficulty.toUpperCase();
      this.updateHud();
    }

    pause() {
      if (this.state !== STATES.PLAYING) return;
      this.showScreen(STATES.PAUSED);
    }

    resume() {
      if (this.state !== STATES.PAUSED) return;
      this.state = STATES.PLAYING;
      this.dom.pauseScreen.hidden = true;
      this.dom.pauseScreen.classList.remove("active");
      this.lastTime = performance.now();
    }

    handleKey(event) {
      if (event.key === "Escape") {
        if (this.state === STATES.PLAYING) this.pause(); else if (this.state === STATES.PAUSED) this.resume();
        return;
      }
      if (this.state !== STATES.PLAYING || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        this.clearTarget();
        return;
      }
      if (!/^[a-zA-Z]$/.test(event.key)) return;
      event.preventDefault();
      this.typeCharacter(event.key.toLowerCase());
    }

    typeCharacter(character) {
      if (!this.activeTarget) {
        const candidates = this.asteroids.filter((asteroid) => !asteroid.locked && asteroid.word.startsWith(character));
        candidates.sort((a, b) => b.y - a.y);
        if (candidates.length) {
          this.activeTarget = candidates[0];
          this.activeTarget.targeted = true;
        }
      }
      const target = this.activeTarget;
      if (target && target.word[target.typed] === character) {
        target.typed += 1;
        this.correctKeys += 1;
        const wordComplete = target.typed === target.word.length;
        this.fireCharacterBlast(target, wordComplete);
        if (wordComplete) this.completeWord(target);
      } else {
        this.incorrectKeys += 1;
        this.combo = 0;
        this.flashTimer = 0.18;
        this.dom.typingConsole.classList.remove("mistake");
        void this.dom.typingConsole.offsetWidth;
        this.dom.typingConsole.classList.add("mistake");
        this.sound.play("error");
      }
      this.updateHud();
    }

    completeWord(target) {
      target.locked = true;
      this.combo += 1;
      this.highestCombo = Math.max(this.highestCombo, this.combo);
      if (this.combo > 0 && this.combo % 10 === 0) {
        this.powerUps.mega = 7;
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 55, "MEGA LASER", "#ffd15c"));
        this.sound.play("power");
      }
      this.activeTarget = null;
      this.updateHud();
    }

    fireCharacterBlast(target, lethal) {
      this.projectiles.push(new Projectile(this.player.x, this.player.y - 30, target, this.powerUps.mega > 0, lethal));
      this.sound.play("laser");
    }

    clearTarget() {
      if (!this.activeTarget) return;
      this.activeTarget.typed = 0;
      this.activeTarget.targeted = false;
      this.activeTarget = null;
      this.updateHud();
    }

    spawnAsteroid() {
      const setting = SETTINGS[this.difficulty];
      const activeWords = new Set(this.asteroids.map((asteroid) => asteroid.word));
      const available = WORD_LISTS[this.difficulty].filter((word) => !activeWords.has(word));
      const word = available[Math.floor(Math.random() * available.length)];
      if (!word) return;
      const margin = Math.max(58, Math.min(100, word.length * 4.5));
      let x = margin + Math.random() * Math.max(1, this.width - margin * 2);
      for (let tries = 0; tries < 8; tries += 1) {
        if (this.asteroids.every((asteroid) => Math.abs(asteroid.x - x) > asteroid.radius + 55 || asteroid.y > 180)) break;
        x = margin + Math.random() * Math.max(1, this.width - margin * 2);
      }
      const roll = Math.random();
      let type = "normal";
      if (roll < 0.025) type = "golden";
      else if (roll < 0.045) type = "shield";
      else if (roll < 0.062) type = "health";
      else if (roll < 0.085) type = "freeze";
      const speedVariance = 0.84 + Math.random() * 0.3;
      const speed = (setting.speed + (this.level - 1) * (this.difficulty === "hard" ? 5 : 3.5)) * speedVariance;
      this.asteroids.push(new Asteroid(word, x, -55, speed, type));
    }

    destroyAsteroid(asteroid) {
      asteroid.removed = true;
      const setting = SETTINGS[this.difficulty];
      let points = setting.baseScore + asteroid.word.length;
      if (asteroid.type === "golden") points += 100;
      if (this.powerUps.double > 0) points *= 2;
      points += Math.min(100, this.combo * 2);
      this.score += points;
      this.wordsDestroyed += 1;
      this.level = Math.floor(this.score / 500) + 1;
      this.applySpecial(asteroid.type);
      const color = asteroid.type === "golden" ? "#ffd15c" : "#65f5ff";
      for (let index = 0; index < 25; index += 1) this.particles.push(new Particle(asteroid.x, asteroid.y, index % 3 ? color : "#ff805e", { speed: 60 + Math.random() * 200 }));
      this.floatingTexts.push(new FloatingText(asteroid.x, asteroid.y - 25, `+${points}`, color));
      this.sound.play("explosion");
      this.updateHud();
    }

    applySpecial(type) {
      if (type === "golden") this.powerUps.double = 8;
      if (type === "shield") this.powerUps.shield = 1;
      if (type === "health") this.lives = Math.min(3, this.lives + 1);
      if (type === "freeze") this.powerUps.freeze = 6;
      if (type !== "normal") this.sound.play("power");
    }

    asteroidImpact(asteroid) {
      asteroid.removed = true;
      if (asteroid === this.activeTarget) this.activeTarget = null;
      this.combo = 0;
      if (this.powerUps.shield) {
        this.powerUps.shield = 0;
        this.floatingTexts.push(new FloatingText(asteroid.x, this.height - 100, "SHIELD ABSORBED", "#7a8cff"));
      } else {
        this.lives -= 1;
        this.shake = 0.35;
        this.sound.play("impact");
      }
      for (let i = 0; i < 18; i += 1) this.particles.push(new Particle(asteroid.x, this.height - 78, "#ff5c7c", { gravity: -15 }));
      this.updateHud();
      if (this.lives <= 0) this.endGame();
    }

    update(dt) {
      if (this.state !== STATES.PLAYING) return;
      this.elapsed += dt;
      this.spawnTimer -= dt;
      const setting = SETTINGS[this.difficulty];
      const maxAsteroids = Math.min(setting.maxAsteroids + Math.floor((this.level - 1) / 2), setting.maxAsteroids + 3);
      const delay = Math.max(0.48, setting.spawnDelay - (this.level - 1) * 0.1);
      if (this.spawnTimer <= 0 && this.asteroids.length < maxAsteroids) {
        this.spawnAsteroid();
        this.spawnTimer = delay;
      }
      Object.keys(this.powerUps).forEach((key) => {
        if (key !== "shield" && this.powerUps[key] > 0) this.powerUps[key] = Math.max(0, this.powerUps[key] - dt);
      });
      const speedFactor = this.powerUps.freeze > 0 ? 0.42 : 1;
      for (const asteroid of this.asteroids) {
        asteroid.update(dt, speedFactor);
        if (asteroid.y - asteroid.radius > this.height - 78) this.asteroidImpact(asteroid);
        if (this.state !== STATES.PLAYING) break;
      }
      if (this.state !== STATES.PLAYING) return;
      this.projectiles.forEach((projectile) => {
        if (projectile.update(dt)) {
          if (projectile.lethal) {
            this.destroyAsteroid(projectile.target);
          } else {
            for (let index = 0; index < 5; index += 1) {
              this.particles.push(new Particle(projectile.x, projectile.y, "#65f5ff", { speed: 35 + Math.random() * 70, life: 0.22, size: 2 }));
            }
          }
        }
      });
      this.particles.forEach((particle) => particle.update(dt));
      this.floatingTexts.forEach((floating) => floating.update(dt));
      this.asteroids = this.asteroids.filter((asteroid) => !asteroid.removed);
      this.projectiles = this.projectiles.filter((projectile) => !projectile.done);
      this.particles = this.particles.filter((particle) => particle.life > 0);
      this.floatingTexts = this.floatingTexts.filter((floating) => floating.life > 0);
      this.player.update(dt);
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      this.shake = Math.max(0, this.shake - dt);
      this.updateHud();
    }

    updateHud() {
      if (typeof this.score === "undefined") return;
      const total = this.correctKeys + this.incorrectKeys;
      const accuracy = total ? Math.round((this.correctKeys / total) * 100) : 100;
      const minutes = this.elapsed / 60;
      const wpm = minutes > 0.02 ? Math.round((this.correctKeys / 5) / minutes) : 0;
      this.dom.scoreValue.textContent = this.score.toLocaleString();
      this.dom.levelValue.textContent = this.level;
      this.dom.livesValue.textContent = this.lives > 0 ? Array(this.lives).fill("♥").join(" ") : "—";
      this.dom.accuracyValue.textContent = `${accuracy}%`;
      this.dom.wpmValue.textContent = wpm;
      this.dom.comboValue.textContent = `×${this.combo}`;
      this.dom.typedValue.textContent = this.activeTarget ? this.activeTarget.word.slice(0, this.activeTarget.typed) : "Start typing…";
      this.renderPowerUps();
    }

    renderPowerUps() {
      const labels = [];
      if (this.powerUps.freeze > 0) labels.push(`❄ Freeze ${Math.ceil(this.powerUps.freeze)}s`);
      if (this.powerUps.double > 0) labels.push(`◆ Double score ${Math.ceil(this.powerUps.double)}s`);
      if (this.powerUps.shield) labels.push("⬡ Shield ready");
      if (this.powerUps.mega > 0) labels.push(`⚡ Mega laser ${Math.ceil(this.powerUps.mega)}s`);
      this.dom.powerStrip.innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
      this.dom.powerStrip.hidden = !labels.length || (this.state !== STATES.PLAYING && this.state !== STATES.PAUSED);
    }

    getStats() {
      const total = this.correctKeys + this.incorrectKeys;
      const accuracy = total ? Math.round((this.correctKeys / total) * 100) : 100;
      const wpm = this.elapsed > 1 ? Math.round((this.correctKeys / 5) / (this.elapsed / 60)) : 0;
      return { accuracy, wpm };
    }

    endGame() {
      const stats = this.getStats();
      document.getElementById("finalScore").textContent = this.score.toLocaleString();
      document.getElementById("finalDifficulty").textContent = SETTINGS[this.difficulty].label;
      document.getElementById("finalWords").textContent = this.wordsDestroyed;
      document.getElementById("finalAccuracy").textContent = `${stats.accuracy}%`;
      document.getElementById("finalWpm").textContent = stats.wpm;
      document.getElementById("finalCombo").textContent = this.highestCombo;
      document.getElementById("finalLevel").textContent = this.level;
      this.currentScoreId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.saveScore(this.dom.pilotName.value, stats);
      this.sound.play("gameover");
      this.showScreen(STATES.GAME_OVER);
    }

    saveScore(name, stats) {
      const key = "astrotype-high-scores";
      let scores;
      try { scores = JSON.parse(localStorage.getItem(key)) || {}; } catch (error) { scores = {}; }
      if (!scores[this.difficulty]) scores[this.difficulty] = [];
      const entry = { id: this.currentScoreId, name: (name || "ACE").trim().slice(0, 12) || "ACE", score: this.score, wpm: stats.wpm, accuracy: stats.accuracy };
      const existing = scores[this.difficulty].findIndex((item) => item.id === this.currentScoreId);
      if (existing >= 0) scores[this.difficulty][existing] = entry; else scores[this.difficulty].push(entry);
      scores[this.difficulty].sort((a, b) => b.score - a.score);
      scores[this.difficulty] = scores[this.difficulty].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(scores));
    }

    updateCurrentScoreName() {
      if (this.state === STATES.GAME_OVER && this.currentScoreId) this.saveScore(this.dom.pilotName.value, this.getStats());
    }

    showScores(difficulty) {
      this.selectDifficulty(difficulty);
      let scores = {};
      try { scores = JSON.parse(localStorage.getItem("astrotype-high-scores")) || {}; } catch (error) { scores = {}; }
      const rows = scores[difficulty] || [];
      this.dom.scoreRows.innerHTML = rows.length ? rows.map((entry, index) => `<div class="score-row"><span>${String(index + 1).padStart(2, "0")}</span><span>${this.escapeHtml(entry.name)}</span><strong>${Number(entry.score).toLocaleString()}</strong><span>${Number(entry.wpm)}</span><span>${Number(entry.accuracy)}%</span></div>`).join("") : `<div class="empty-score">No missions logged yet. Be the first pilot on the board.</div>`;
      document.querySelectorAll("[data-score-tab]").forEach((button) => {
        const active = button.dataset.scoreTab === difficulty;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      this.showScreen(STATES.HIGH_SCORES);
    }

    escapeHtml(value) {
      const element = document.createElement("span");
      element.textContent = String(value);
      return element.innerHTML;
    }

    updateSoundButton() {
      this.dom.soundIcon.textContent = this.sound.enabled ? "♪" : "×";
      this.dom.soundLabel.textContent = this.sound.enabled ? "Sound on" : "Sound off";
      this.dom.soundButton.setAttribute("aria-pressed", String(this.sound.enabled));
      this.dom.soundButton.setAttribute("aria-label", this.sound.enabled ? "Turn sound off" : "Turn sound on");
    }

    createAmbientRocks() {
      this.ambientRocks = Array.from({ length: 7 }, (_, index) => ({
        x: Math.random(), y: Math.random(), size: 2 + Math.random() * 8, speed: 0.004 + index * 0.0008
      }));
    }

    drawBackground(time) {
      const gradient = this.ctx.createRadialGradient(this.width * 0.7, this.height * 0.35, 0, this.width * 0.7, this.height * 0.35, this.width * 0.8);
      gradient.addColorStop(0, "rgba(24, 54, 96, .2)");
      gradient.addColorStop(0.45, "rgba(15, 23, 55, .08)");
      gradient.addColorStop(1, "rgba(1, 3, 13, .2)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ambientRocks.forEach((rock, index) => {
        rock.y += rock.speed;
        if (rock.y > 1.05) { rock.y = -0.05; rock.x = Math.random(); }
        this.ctx.save();
        this.ctx.globalAlpha = 0.16 + (index % 3) * 0.06;
        this.ctx.fillStyle = "#9db5cf";
        this.ctx.beginPath();
        this.ctx.arc(rock.x * this.width, rock.y * this.height, rock.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    }

    draw(time) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground(time);
      if (![STATES.PLAYING, STATES.PAUSED, STATES.GAME_OVER].includes(this.state)) return;
      this.ctx.save();
      if (this.shake > 0) this.ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
      this.asteroids.forEach((asteroid) => asteroid.draw(this.ctx, time));
      this.projectiles.forEach((projectile) => projectile.draw(this.ctx));
      this.particles.forEach((particle) => particle.draw(this.ctx));
      this.floatingTexts.forEach((floating) => floating.draw(this.ctx));
      this.player.draw(this.ctx);
      this.ctx.restore();
      if (this.flashTimer > 0) {
        this.ctx.fillStyle = `rgba(255, 61, 104, ${this.flashTimer * 0.35})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    loop(time) {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.update(dt);
      this.draw(time);
      requestAnimationFrame((nextTime) => this.loop(nextTime));
    }
  }

  window.addEventListener("DOMContentLoaded", () => new Game());
}());
