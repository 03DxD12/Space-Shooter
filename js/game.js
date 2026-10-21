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

  const WORLDS = Object.freeze([
    { id: "frontier", name: "Orbital Frontier", description: "Training orbit secured", threshold: 0, glow: "rgba(31, 106, 190, .28)", dust: "#9db5cf", accent: "#65f5ff" },
    { id: "nebula", name: "Crimson Nebula", description: "Hostile dust clouds detected", threshold: 500, glow: "rgba(191, 42, 96, .3)", dust: "#ff8a9f", accent: "#ff668c" },
    { id: "frost", name: "Frozen Expanse", description: "Cryonic storm front entered", threshold: 1000, glow: "rgba(63, 176, 224, .3)", dust: "#d7fbff", accent: "#9cecff" },
    { id: "rift", name: "Void Rift", description: "Gravity readings unstable", threshold: 1500, glow: "rgba(112, 59, 208, .32)", dust: "#bd91ff", accent: "#ad77ff" },
    { id: "solar", name: "Solar Crown", description: "Stellar core defense engaged", threshold: 2000, glow: "rgba(235, 125, 28, .32)", dust: "#ffd481", accent: "#ffb84d" }
  ]);

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
      this.worldIndex = 0;
      this.worldBannerTimer = 0;
      this.powerUps = { freeze: 0, double: 0, dual: 0, shield: 0, mega: 0 };
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
      ["app", "hud", "powerStrip", "typingConsole", "defenseLine", "menuScreen", "difficultyScreen", "howScreen", "scoresScreen", "pauseScreen", "gameOverScreen", "scoreValue", "levelValue", "livesValue", "accuracyValue", "wpmValue", "comboValue", "difficultyBadge", "typedValue", "menuDifficulty", "scoreRows", "soundButton", "soundIcon", "soundLabel", "pilotName", "mobileInput", "worldKicker", "worldName", "worldProgressBar", "worldNextLabel", "worldBanner", "worldBannerKicker", "worldBannerName", "worldBannerDescription", "mobilePauseButton", "targetBadge", "targetTyped", "targetNext", "targetRemaining", "targetIncomingHints", "consoleTargetInfo", "mobileTypeHint"].forEach((id) => {
        this.dom[id] = document.getElementById(id);
      });
      this.screens = [this.dom.menuScreen, this.dom.difficultyScreen, this.dom.howScreen, this.dom.scoresScreen, this.dom.pauseScreen, this.dom.gameOverScreen];
    }

    bindEvents() {
      this.setupViewport();
      window.addEventListener("resize", () => this.resize());
      document.addEventListener("keydown", (event) => this.handleKey(event));
      document.getElementById("playButton").addEventListener("click", () => this.startGame());
      document.getElementById("difficultyButton").addEventListener("click", () => this.showScreen(STATES.DIFFICULTY_SELECTION));
      document.getElementById("howButton").addEventListener("click", () => this.showScreen(STATES.HOW_TO_PLAY));
      document.getElementById("scoresButton").addEventListener("click", () => this.showScores(this.difficulty));
      document.getElementById("navHome").addEventListener("click", () => this.showScreen(STATES.MENU));
      document.getElementById("navGuide").addEventListener("click", () => this.showScreen(STATES.HOW_TO_PLAY));
      document.getElementById("navScores").addEventListener("click", () => this.showScores(this.difficulty));
      document.getElementById("difficultyConfirm").addEventListener("click", () => this.startGame());
      document.getElementById("resumeButton").addEventListener("click", () => this.resume());
      document.getElementById("restartButton").addEventListener("click", () => this.startGame());
      document.getElementById("playAgainButton").addEventListener("click", () => this.startGame());
      document.getElementById("changeDifficultyButton").addEventListener("click", () => this.showScreen(STATES.DIFFICULTY_SELECTION));
      this.dom.soundButton.addEventListener("click", () => { this.sound.toggle(); this.updateSoundButton(); });

      if (this.dom.mobilePauseButton) {
        this.dom.mobilePauseButton.addEventListener("click", () => {
          this.manualBlur = true;
          if (this.dom.mobileInput) this.dom.mobileInput.blur();
          this.pause();
          setTimeout(() => { this.manualBlur = false; }, 300);
        });
      }

      document.querySelectorAll(".back-menu, .main-menu-button").forEach((button) => button.addEventListener("click", () => this.showScreen(STATES.MENU)));
      document.querySelectorAll(".difficulty-card").forEach((button) => button.addEventListener("click", () => this.selectDifficulty(button.dataset.difficulty)));
      document.querySelectorAll("[data-score-tab]").forEach((button) => button.addEventListener("click", () => this.showScores(button.dataset.scoreTab)));
      document.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => this.sound.play("click")));
      this.dom.pilotName.addEventListener("input", () => this.updateCurrentScoreName());

      // Focus typing input when tapping screen on mobile during gameplay
      this.canvas.addEventListener("pointerdown", () => {
        if (this.state === STATES.PLAYING) this.focusMobileInput();
      });
      this.dom.typingConsole.addEventListener("pointerdown", () => {
        if (this.state === STATES.PLAYING) this.focusMobileInput();
      });

      this.dom.mobileInput.addEventListener("input", (event) => {
        if (this.state === STATES.PLAYING) {
          const val = event.target.value.toLowerCase();
          for (let i = 0; i < val.length; i += 1) {
            const ch = val[i];
            if (/^[a-z]$/.test(ch)) {
              this.typeCharacter(ch);
            }
          }
        }
        event.target.value = "";
      });

      this.dom.mobileInput.addEventListener("compositionend", (event) => {
        if (this.state === STATES.PLAYING && event.data) {
          const val = event.data.toLowerCase();
          for (let i = 0; i < val.length; i += 1) {
            const ch = val[i];
            if (/^[a-z]$/.test(ch)) {
              this.typeCharacter(ch);
            }
          }
          this.dom.mobileInput.value = "";
        }
      });

      this.dom.mobileInput.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && this.state === STATES.PLAYING) {
          event.preventDefault();
          this.clearTarget();
        }
      });

      this.dom.mobileInput.addEventListener("blur", () => {
        if (this.state === STATES.PLAYING && this.isMobileLayout && !this.manualBlur) {
          setTimeout(() => {
            if (this.state === STATES.PLAYING && this.isMobileLayout && !this.manualBlur) {
              this.focusMobileInput();
            }
          }, 150);
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === STATES.PLAYING) this.pause();
      });
    }

    setupViewport() {
      const handleResize = () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
        this.resize();
      };
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleResize);
        window.visualViewport.addEventListener("scroll", handleResize);
      }
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", () => {
        setTimeout(handleResize, 100);
      });
    }

    focusMobileInput() {
      if (this.dom.mobileInput && document.activeElement !== this.dom.mobileInput) {
        this.dom.mobileInput.focus({ preventScroll: true });
      }
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vv = window.visualViewport;
      const newWidth = Math.round(vv ? vv.width : window.innerWidth);
      const newHeight = Math.round(vv ? vv.height : window.innerHeight);
      const prevHeight = this.height || newHeight;

      this.width = newWidth;
      this.height = newHeight;
      this.isMobileLayout = this.width <= 768 || this.height <= 560;
      document.body.classList.toggle("mobile-view", this.isMobileLayout);

      const keyboardOffset = Math.max(0, window.innerHeight - this.height);
      document.documentElement.style.setProperty("--visible-height", `${this.height}px`);
      document.documentElement.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);

      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.defenseY = this.isMobileLayout ? Math.round(this.height - 86) : Math.round(this.height - 78);
      document.documentElement.style.setProperty("--defense-y", `${this.defenseY}px`);

      this.player.resize(this.width, this.height, this.isMobileLayout);

      // Proportionally shift existing asteroids if height changed (e.g. keyboard opened/closed)
      if (prevHeight && Math.abs(prevHeight - this.height) > 60 && this.asteroids && this.asteroids.length) {
        const prevDefense = prevHeight - (this.isMobileLayout ? 86 : 78);
        const ratio = (this.defenseY - 40) / Math.max(100, prevDefense - 40);
        if (ratio > 0 && isFinite(ratio)) {
          this.asteroids.forEach((asteroid) => {
            if (!asteroid.removed) {
              asteroid.y = Math.min(this.defenseY - 35, asteroid.y * ratio);
            }
          });
        }
      }
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
      this.dom.app.classList.toggle("game-active", playingUi);
      this.dom.hud.hidden = !playingUi;
      this.dom.typingConsole.hidden = !playingUi;
      this.dom.defenseLine.hidden = !playingUi;
      if (this.dom.mobilePauseButton) {
        this.dom.mobilePauseButton.hidden = !(this.isMobileLayout && (state === STATES.PLAYING));
      }
      if (state !== STATES.PLAYING && state !== STATES.PAUSED) this.dom.powerStrip.hidden = true;
      if (!playingUi) {
        this.manualBlur = true;
        this.dom.mobileInput.blur();
        setTimeout(() => { this.manualBlur = false; }, 200);
        this.dom.worldBanner.classList.remove("active");
        this.worldBannerTimer = 0;
      }
    }

    startGame() {
      const now = performance.now();
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.worldIndex = 0;
      this.worldBannerTimer = 0;
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
      this.powerUps = { freeze: 0, double: 0, dual: 0, shield: 0, mega: 0 };
      this.lastTime = now;
      this.state = STATES.PLAYING;
      this.screens.forEach((screen) => { screen.hidden = true; screen.classList.remove("active"); });
      this.dom.hud.hidden = false;
      this.dom.typingConsole.hidden = false;
      this.dom.defenseLine.hidden = false;
      if (this.dom.mobilePauseButton) {
        this.dom.mobilePauseButton.hidden = !this.isMobileLayout;
      }
      this.dom.difficultyBadge.textContent = this.difficulty.toUpperCase();
      this.dom.app.classList.add("game-active");
      this.setWorld(0, false);
      this.updateHud();
      if (this.isMobileLayout) {
        setTimeout(() => this.focusMobileInput(), 80);
      }
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
      if (event.target === this.dom.mobileInput) return;
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
      const dualBlaster = this.powerUps.dual > 0;
      const muzzleOffsets = dualBlaster ? [-16, 16] : [0];
      muzzleOffsets.forEach((offset, index) => {
        this.projectiles.push(new Projectile(
          this.player.x + offset,
          this.player.y - 25,
          target,
          this.powerUps.mega > 0,
          lethal && index === 0
        ));
        for (let spark = 0; spark < 3; spark += 1) {
          this.particles.push(new Particle(this.player.x + offset, this.player.y - 28, dualBlaster ? "#82ff9d" : "#65f5ff", { speed: 30, life: 0.18, size: 1.5 }));
        }
      });
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
      if (roll < 0.012) type = "nova";
      else if (roll < 0.03) type = "dual";
      else if (roll < 0.055) type = "golden";
      else if (roll < 0.077) type = "shield";
      else if (roll < 0.094) type = "health";
      else if (roll < 0.117) type = "freeze";
      const speedVariance = 0.84 + Math.random() * 0.3;
      const speed = (setting.speed + (this.level - 1) * (this.difficulty === "hard" ? 5 : 3.5)) * speedVariance;
      const spawnY = this.isMobileLayout ? 16 : -50;
      this.asteroids.push(new Asteroid(word, x, spawnY, speed, type));
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
      this.updateWorld();
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
      if (type === "dual") this.powerUps.dual = 10;
      if (type === "nova") this.clearField();
      if (type !== "normal") this.sound.play("power");
    }

    clearField() {
      const setting = SETTINGS[this.difficulty];
      const targets = this.asteroids.filter((asteroid) => !asteroid.removed);
      if (!targets.length) {
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.46, "NOVA BLAST", "#ff8bf3"));
        return;
      }

      targets.forEach((asteroid) => {
        asteroid.removed = true;
        let points = setting.baseScore + asteroid.word.length;
        if (this.powerUps.double > 0) points *= 2;
        this.score += points;
        this.wordsDestroyed += 1;
        for (let index = 0; index < 16; index += 1) {
          this.particles.push(new Particle(asteroid.x, asteroid.y, index % 2 ? "#ff8bf3" : "#65f5ff", { speed: 80 + Math.random() * 210 }));
        }
        this.floatingTexts.push(new FloatingText(asteroid.x, asteroid.y, `+${points}`, "#ff8bf3"));
      });

      this.activeTarget = null;
      this.projectiles.forEach((projectile) => { projectile.done = true; });
      this.level = Math.floor(this.score / 500) + 1;
      this.updateWorld();
      this.shake = 0.25;
      this.floatingTexts.push(new FloatingText(this.width / 2, this.height * 0.52, `NOVA BLAST · ${targets.length} CLEARED`, "#ff8bf3"));
    }

    asteroidImpact(asteroid) {
      asteroid.removed = true;
      if (asteroid === this.activeTarget) this.activeTarget = null;
      this.combo = 0;
      if (this.powerUps.shield) {
        this.powerUps.shield = 0;
        this.floatingTexts.push(new FloatingText(asteroid.x, this.defenseY - 20, "SHIELD ABSORBED", "#7a8cff"));
      } else {
        this.lives -= 1;
        this.shake = 0.35;
        this.sound.play("impact");
      }
      for (let i = 0; i < 18; i += 1) this.particles.push(new Particle(asteroid.x, this.defenseY, "#ff5c7c", { gravity: -15 }));
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
        if (asteroid.y - asteroid.radius > this.defenseY) this.asteroidImpact(asteroid);
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
      if (this.worldBannerTimer > 0) {
        this.worldBannerTimer = Math.max(0, this.worldBannerTimer - dt);
        if (this.worldBannerTimer === 0) this.dom.worldBanner.classList.remove("active");
      }
      this.updateHud();
    }

    updateWorld() {
      let nextIndex = 0;
      WORLDS.forEach((world, index) => {
        if (this.score >= world.threshold) nextIndex = index;
      });
      if (nextIndex !== this.worldIndex) this.setWorld(nextIndex, true);
    }

    setWorld(index, announce) {
      this.worldIndex = Math.max(0, Math.min(index, WORLDS.length - 1));
      const world = WORLDS[this.worldIndex];
      this.dom.app.dataset.world = world.id;
      this.dom.worldKicker.textContent = `WORLD ${String(this.worldIndex + 1).padStart(2, "0")}`;
      this.dom.worldName.textContent = world.name;

      if (announce) {
        this.dom.worldBannerKicker.textContent = `WORLD ${String(this.worldIndex + 1).padStart(2, "0")} UNLOCKED`;
        this.dom.worldBannerName.textContent = world.name;
        this.dom.worldBannerDescription.textContent = world.description;
        this.dom.worldBanner.style.setProperty("--world-accent", world.accent);
        this.dom.worldBanner.classList.remove("active");
        void this.dom.worldBanner.offsetWidth;
        this.dom.worldBanner.classList.add("active");
        this.worldBannerTimer = 3.4;
        for (let index = 0; index < 55; index += 1) {
          this.particles.push(new Particle(this.width / 2, this.height * 0.43, world.accent, { speed: 80 + Math.random() * 240, life: 0.8 + Math.random() * 0.8, size: 2.5 }));
        }
        this.shake = 0.22;
        this.sound.play("power");
      } else {
        this.dom.worldBanner.classList.remove("active");
      }
    }

    updateWorldProgress() {
      const world = WORLDS[this.worldIndex];
      const nextWorld = WORLDS[this.worldIndex + 1];
      const progressElement = this.dom.worldProgressBar.parentElement;
      if (!nextWorld) {
        this.dom.worldProgressBar.style.width = "100%";
        this.dom.worldNextLabel.textContent = "FINAL WORLD";
        progressElement.setAttribute("aria-valuemax", String(world.threshold));
        progressElement.setAttribute("aria-valuenow", String(world.threshold));
        progressElement.setAttribute("aria-valuetext", "Final world reached");
        return;
      }
      const range = nextWorld.threshold - world.threshold;
      const progress = Math.max(0, Math.min(range, this.score - world.threshold));
      this.dom.worldProgressBar.style.width = `${(progress / range) * 100}%`;
      this.dom.worldNextLabel.textContent = `${nextWorld.threshold - this.score} TO ${nextWorld.name.toUpperCase()}`;
      progressElement.setAttribute("aria-valuemax", String(range));
      progressElement.setAttribute("aria-valuenow", String(progress));
      progressElement.setAttribute("aria-valuetext", `${nextWorld.threshold - this.score} points to ${nextWorld.name}`);
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
      this.updateWorldProgress();
      this.renderPowerUps();
      this.updateTypingConsole();
    }

    updateTypingConsole() {
      if (!this.dom.targetBadge) return;
      const target = this.activeTarget;
      if (target) {
        const type = target.type || "normal";
        this.dom.targetBadge.textContent = type !== "normal" ? type.toUpperCase() : "LOCKED";
        this.dom.targetBadge.className = `target-badge ${type}`;

        const typed = target.word.slice(0, target.typed);
        const next = target.word[target.typed] || "";
        const remaining = target.word.slice(target.typed + 1);

        if (this.dom.targetTyped) this.dom.targetTyped.textContent = typed;
        if (this.dom.targetNext) this.dom.targetNext.textContent = next;
        if (this.dom.targetRemaining) this.dom.targetRemaining.textContent = remaining;
        if (this.dom.targetIncomingHints) this.dom.targetIncomingHints.innerHTML = "";
      } else {
        this.dom.targetBadge.textContent = "SCAN";
        this.dom.targetBadge.className = "target-badge scan";
        if (this.dom.targetTyped) this.dom.targetTyped.textContent = "";
        if (this.dom.targetNext) this.dom.targetNext.textContent = "";
        if (this.dom.targetRemaining) this.dom.targetRemaining.textContent = "Start typing…";

        if (this.dom.targetIncomingHints) {
          const threats = this.asteroids
            .filter((a) => !a.removed && a.y > -20)
            .sort((a, b) => b.y - a.y)
            .slice(0, 3);
          if (threats.length) {
            this.dom.targetIncomingHints.innerHTML = threats
              .map((a) => `<span class="incoming-chip"><b>${a.word[0].toUpperCase()}</b>${a.word.slice(1)}</span>`)
              .join("");
          } else {
            this.dom.targetIncomingHints.innerHTML = "";
          }
        }
      }
    }

    renderPowerUps() {
      const labels = [];
      if (this.powerUps.freeze > 0) labels.push(`❄ Freeze ${Math.ceil(this.powerUps.freeze)}s`);
      if (this.powerUps.double > 0) labels.push(`◆ Double score ${Math.ceil(this.powerUps.double)}s`);
      if (this.powerUps.dual > 0) labels.push(`✦ Dual blaster ${Math.ceil(this.powerUps.dual)}s`);
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
      document.getElementById("finalWorld").textContent = WORLDS[this.worldIndex].name;
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
      const world = WORLDS[this.worldIndex] || WORLDS[0];
      const gradient = this.ctx.createRadialGradient(this.width * 0.7, this.height * 0.35, 0, this.width * 0.7, this.height * 0.35, this.width * 0.8);
      gradient.addColorStop(0, world.glow);
      gradient.addColorStop(0.45, "rgba(15, 23, 55, .08)");
      gradient.addColorStop(1, "rgba(1, 3, 13, .2)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.drawWorldScenery(time, world);
      this.ambientRocks.forEach((rock, index) => {
        rock.y += rock.speed;
        if (rock.y > 1.05) { rock.y = -0.05; rock.x = Math.random(); }
        this.ctx.save();
        this.ctx.globalAlpha = 0.16 + (index % 3) * 0.06;
        this.ctx.fillStyle = world.dust;
        this.ctx.beginPath();
        this.ctx.arc(rock.x * this.width, rock.y * this.height, rock.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    }

    drawWorldScenery(time, world) {
      const t = time * 0.00008;
      this.ctx.save();
      if (world.id === "nebula") {
        for (let index = 0; index < 3; index += 1) {
          const x = this.width * (0.2 + index * 0.34) + Math.sin(t * 4 + index) * 35;
          const y = this.height * (0.28 + (index % 2) * 0.25);
          const cloud = this.ctx.createRadialGradient(x, y, 0, x, y, this.width * 0.24);
          cloud.addColorStop(0, "rgba(210, 45, 103, .1)");
          cloud.addColorStop(1, "rgba(210, 45, 103, 0)");
          this.ctx.fillStyle = cloud;
          this.ctx.fillRect(0, 0, this.width, this.height);
        }
      } else if (world.id === "frost") {
        this.ctx.strokeStyle = "rgba(174, 239, 255, .12)";
        this.ctx.lineWidth = 1;
        for (let index = 0; index < 18; index += 1) {
          const x = ((index * 97 + time * 0.035) % (this.width + 160)) - 80;
          const y = (index * 61) % this.height;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x - 32, y + 48);
          this.ctx.stroke();
        }
      } else if (world.id === "rift") {
        const x = this.width * 0.78;
        const y = this.height * 0.36;
        this.ctx.strokeStyle = "rgba(173, 119, 255, .13)";
        this.ctx.lineWidth = 8;
        this.ctx.shadowColor = "#7d47d6";
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 105 + Math.sin(t * 8) * 7, 34, -0.38, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (world.id === "solar") {
        const x = this.width * 0.8;
        const y = this.height * 0.22;
        const sun = this.ctx.createRadialGradient(x, y, 5, x, y, Math.min(240, this.width * 0.23));
        sun.addColorStop(0, "rgba(255, 244, 184, .33)");
        sun.addColorStop(0.18, "rgba(255, 168, 55, .16)");
        sun.addColorStop(1, "rgba(255, 111, 30, 0)");
        this.ctx.fillStyle = sun;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
      this.ctx.restore();
    }

    drawTargetingBeam(time) {
      if (!this.activeTarget || this.activeTarget.removed) return;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.x, this.player.y - 25);
      this.ctx.lineTo(this.activeTarget.x, this.activeTarget.y);
      this.ctx.strokeStyle = "rgba(101, 245, 255, 0.45)";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -time * 0.05;
      this.ctx.shadowColor = "#65f5ff";
      this.ctx.shadowBlur = 8;
      this.ctx.stroke();
      this.ctx.restore();
    }

    drawOffscreenThreatMarkers() {
      const topBoundary = this.isMobileLayout ? 88 : 72;
      this.asteroids.forEach((asteroid) => {
        if (asteroid.removed || asteroid.y >= topBoundary) return;
        this.ctx.save();
        this.ctx.translate(asteroid.x, topBoundary + 4);
        const markerColor = asteroid.type === "golden" ? "#ffd15c" : (asteroid.type === "nova" ? "#ff8bf3" : "#65f5ff");
        this.ctx.fillStyle = markerColor;
        this.ctx.shadowColor = markerColor;
        this.ctx.shadowBlur = 10;

        // Downward glowing beacon triangle
        this.ctx.beginPath();
        this.ctx.moveTo(-7, 0);
        this.ctx.lineTo(7, 0);
        this.ctx.lineTo(0, 8);
        this.ctx.closePath();
        this.ctx.fill();

        // Pulsing initial letter pill above chevron
        this.ctx.fillStyle = "rgba(4, 12, 28, 0.92)";
        this.ctx.strokeStyle = markerColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
          this.ctx.roundRect(-10, -18, 20, 15, 3);
        } else {
          this.ctx.rect(-10, -18, 20, 15);
        }
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = "#ffd15c";
        this.ctx.font = "700 10px var(--display)";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(asteroid.word[0].toUpperCase(), 0, -10);
        this.ctx.restore();
      });
    }

    drawPlayerShield(time) {
      if (!this.powerUps.shield) return;
      const pulse = 42 + Math.sin(time * 0.006) * 3;
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(122, 140, 255, .9)";
      this.ctx.fillStyle = "rgba(85, 127, 255, .08)";
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = "#7a8cff";
      this.ctx.shadowBlur = 18;
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y - 3, pulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    draw(time) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawBackground(time);
      if (![STATES.PLAYING, STATES.PAUSED, STATES.GAME_OVER].includes(this.state)) return;
      this.ctx.save();
      if (this.shake > 0) this.ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
      this.drawTargetingBeam(time);
      this.asteroids.forEach((asteroid) => asteroid.draw(this.ctx, time));
      this.drawOffscreenThreatMarkers();
      this.projectiles.forEach((projectile) => projectile.draw(this.ctx));
      this.particles.forEach((particle) => particle.draw(this.ctx));
      this.floatingTexts.forEach((floating) => floating.draw(this.ctx));
      this.player.draw(this.ctx);
      this.drawPlayerShield(time);
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
