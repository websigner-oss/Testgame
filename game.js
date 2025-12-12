const SAVE_KEY = "rcd_save_v1";
const LEADER_KEY = "rcd_leader_v1";
const SETTINGS_KEY = "rcd_settings_v1";

const END_FLOOR = 25;

const TILES = {
  WALL: 0,
  FLOOR: 1,
  STAIRS: 2,
  EXIT: 3,
};

const UI = {
  hp: document.getElementById("uiHp"),
  floor: document.getElementById("uiFloor"),
  level: document.getElementById("uiLevel"),
  xp: document.getElementById("uiXp"),
  atk: document.getElementById("uiAtk"),
  def: document.getElementById("uiDef"),
  gold: document.getElementById("uiGold"),
  potions: document.getElementById("uiPotions"),
  skill: document.getElementById("uiSkill"),
  score: document.getElementById("uiScore"),
  log: document.getElementById("log"),
  overlay: document.getElementById("overlay"),
  modal: document.getElementById("modal"),
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function distManhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function nowMs() {
  return performance.now();
}

class RNG {
  constructor(seed) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x12345678;
  }

  nextU32() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = (t ^ (t >>> 14)) >>> 0;
    this.state = r;
    return r;
  }

  float() {
    return this.nextU32() / 4294967296;
  }

  int(min, maxInclusive) {
    const a = Math.ceil(min);
    const b = Math.floor(maxInclusive);
    return a + Math.floor(this.float() * (b - a + 1));
  }

  pick(arr) {
    return arr[this.int(0, arr.length - 1)];
  }

  chance(p) {
    return this.float() < p;
  }
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function bresenhamLine(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.soundOn = true;
    this.musicOn = true;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  loadSettings(settings) {
    this.soundOn = settings.soundOn;
    this.musicOn = settings.musicOn;
  }

  ensure() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.08;
    this.master.connect(this.ctx.destination);
  }

  setSound(on) {
    this.soundOn = on;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else this.startMusic();
  }

  _beep({ freq = 440, dur = 0.08, type = "square", gain = 0.9, detune = 0 } = {}) {
    if (!this.soundOn) return;
    this.ensure();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    g.gain.value = 0;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this.master);

    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(name) {
    switch (name) {
      case "move":
        this._beep({ freq: 220, dur: 0.03, type: "square", gain: 0.4 });
        break;
      case "hit":
        this._beep({ freq: 120, dur: 0.06, type: "sawtooth", gain: 0.9 });
        break;
      case "hurt":
        this._beep({ freq: 90, dur: 0.08, type: "sawtooth", gain: 1.0 });
        break;
      case "pickup":
        this._beep({ freq: 660, dur: 0.05, type: "square", gain: 0.7 });
        break;
      case "stairs":
        this._beep({ freq: 440, dur: 0.05, type: "triangle", gain: 0.6 });
        this._beep({ freq: 660, dur: 0.08, type: "triangle", gain: 0.6, detune: 12 });
        break;
      case "levelup":
        this._beep({ freq: 523.25, dur: 0.08, type: "triangle", gain: 0.8 });
        this._beep({ freq: 659.25, dur: 0.08, type: "triangle", gain: 0.8, detune: 10 });
        this._beep({ freq: 783.99, dur: 0.12, type: "triangle", gain: 0.8, detune: 20 });
        break;
      case "buy":
        this._beep({ freq: 880, dur: 0.06, type: "square", gain: 0.7 });
        break;
      case "error":
        this._beep({ freq: 130, dur: 0.08, type: "square", gain: 0.9 });
        break;
      case "skill":
        this._beep({ freq: 330, dur: 0.05, type: "triangle", gain: 0.8 });
        this._beep({ freq: 550, dur: 0.08, type: "triangle", gain: 0.8, detune: 9 });
        break;
      default:
        this._beep({ freq: 440, dur: 0.06 });
    }
  }

  startMusic() {
    if (!this.musicOn || !this.soundOn) return;
    if (!this.ctx || this._musicTimer) return;

    const seq = [
      220, 220, 246.94, 261.63, 293.66, 261.63, 246.94, 220,
      196, 196, 220, 246.94, 261.63, 246.94, 220, 196,
    ];

    this._musicStep = 0;
    this._musicTimer = window.setInterval(() => {
      if (!this.musicOn || !this.soundOn || !this.ctx) return;
      const f = seq[this._musicStep % seq.length];
      const accent = this._musicStep % 4 === 0;
      this._beep({
        freq: f,
        dur: 0.09,
        type: accent ? "triangle" : "square",
        gain: accent ? 0.35 : 0.22,
      });
      this._musicStep++;
    }, 160);
  }

  stopMusic() {
    if (this._musicTimer) {
      window.clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}

const ENEMY_TYPES = {
  slime: {
    key: "slime",
    name: "Slime",
    glyph: "s",
    color: "#55dd77",
    baseHp: 7,
    baseAtk: 2,
    baseDef: 0,
    aggro: 6,
    xp: 6,
    gold: [1, 4],
  },
  goblin: {
    key: "goblin",
    name: "Goblin",
    glyph: "g",
    color: "#d7d277",
    baseHp: 10,
    baseAtk: 3,
    baseDef: 0,
    aggro: 8,
    xp: 9,
    gold: [2, 6],
    trick: "skirmish",
  },
  skeleton: {
    key: "skeleton",
    name: "Skeleton",
    glyph: "k",
    color: "#e6e6e6",
    baseHp: 14,
    baseAtk: 4,
    baseDef: 1,
    aggro: 8,
    xp: 14,
    gold: [4, 9],
  },
  orc: {
    key: "orc",
    name: "Orc",
    glyph: "o",
    color: "#ff9a62",
    baseHp: 20,
    baseAtk: 6,
    baseDef: 1,
    aggro: 9,
    xp: 22,
    gold: [6, 14],
  },
  mage: {
    key: "mage",
    name: "Hex Mage",
    glyph: "m",
    color: "#a58bff",
    baseHp: 15,
    baseAtk: 3,
    baseDef: 0,
    aggro: 10,
    xp: 26,
    gold: [8, 18],
    trick: "ranged",
  },
  minotaur: {
    key: "minotaur",
    name: "Minotaur",
    glyph: "M",
    color: "#ff4b4b",
    baseHp: 55,
    baseAtk: 9,
    baseDef: 2,
    aggro: 999,
    xp: 120,
    gold: [40, 70],
    boss: true,
  },
  dragon: {
    key: "dragon",
    name: "Clockwork Dragon",
    glyph: "D",
    color: "#ff4bd0",
    baseHp: 90,
    baseAtk: 12,
    baseDef: 3,
    aggro: 999,
    xp: 260,
    gold: [120, 200],
    boss: true,
    trick: "breath",
  },
};

function enemyPoolForFloor(floor) {
  if (floor <= 3) return ["slime", "goblin"];
  if (floor <= 7) return ["slime", "goblin", "skeleton"];
  if (floor <= 12) return ["goblin", "skeleton", "orc"];
  if (floor <= 18) return ["skeleton", "orc", "mage"];
  return ["orc", "mage", "skeleton"];
}

function scaleStat(base, floor) {
  return Math.round(base * (1 + Math.max(0, floor - 1) * 0.08));
}

function dungeonIndex(d, x, y) {
  return y * d.w + x;
}

function inBounds(d, x, y) {
  return x >= 0 && y >= 0 && x < d.w && y < d.h;
}

function isWall(d, x, y) {
  const t = d.tiles[dungeonIndex(d, x, y)];
  return t === TILES.WALL;
}

function isWalkable(d, x, y) {
  const t = d.tiles[dungeonIndex(d, x, y)];
  return t === TILES.FLOOR || t === TILES.STAIRS || t === TILES.EXIT;
}

function generateDungeon(rng, w, h) {
  const tiles = new Uint8Array(w * h);
  tiles.fill(TILES.WALL);

  const rooms = [];

  const maxRooms = 14;
  const tryCount = 180;

  function carveRoom(r) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        tiles[y * w + x] = TILES.FLOOR;
      }
    }
  }

  function carveHCorridor(x1, x2, y) {
    const a = Math.min(x1, x2);
    const b = Math.max(x1, x2);
    for (let x = a; x <= b; x++) tiles[y * w + x] = TILES.FLOOR;
  }

  function carveVCorridor(y1, y2, x) {
    const a = Math.min(y1, y2);
    const b = Math.max(y1, y2);
    for (let y = a; y <= b; y++) tiles[y * w + x] = TILES.FLOOR;
  }

  function center(r) {
    return [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];
  }

  function intersects(a, b) {
    return !(
      a.x + a.w + 1 < b.x ||
      a.x > b.x + b.w + 1 ||
      a.y + a.h + 1 < b.y ||
      a.y > b.y + b.h + 1
    );
  }

  for (let i = 0; i < tryCount && rooms.length < maxRooms; i++) {
    const rw = rng.int(5, 11);
    const rh = rng.int(5, 9);
    const x = rng.int(1, w - rw - 2);
    const y = rng.int(1, h - rh - 2);
    const room = { x, y, w: rw, h: rh };

    if (rooms.some((r) => intersects(room, r))) continue;

    carveRoom(room);

    if (rooms.length > 0) {
      const [prevX, prevY] = center(rooms[rooms.length - 1]);
      const [newX, newY] = center(room);
      if (rng.chance(0.5)) {
        carveHCorridor(prevX, newX, prevY);
        carveVCorridor(prevY, newY, newX);
      } else {
        carveVCorridor(prevY, newY, prevX);
        carveHCorridor(prevX, newX, newY);
      }
    }

    rooms.push(room);
  }

  if (rooms.length === 0) {
    const r = { x: 2, y: 2, w: w - 4, h: h - 4 };
    rooms.push(r);
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) tiles[y * w + x] = TILES.FLOOR;
    }
  }

  const [sx, sy] = [
    Math.floor(rooms[0].x + rooms[0].w / 2),
    Math.floor(rooms[0].y + rooms[0].h / 2),
  ];

  const last = rooms[rooms.length - 1];
  const stairs = {
    x: Math.floor(last.x + last.w / 2),
    y: Math.floor(last.y + last.h / 2),
  };
  tiles[stairs.y * w + stairs.x] = TILES.STAIRS;

  return {
    w,
    h,
    tiles,
    seen: new Uint8Array(w * h),
    visible: new Uint8Array(w * h),
    rooms,
    spawn: { x: sx, y: sy },
    stairs,
    exitOpen: false,
  };
}

function computeFov(d, px, py, radius = 9) {
  d.visible.fill(0);
  const r2 = radius * radius;

  for (let y = py - radius; y <= py + radius; y++) {
    for (let x = px - radius; x <= px + radius; x++) {
      if (!inBounds(d, x, y)) continue;
      const dx = x - px;
      const dy = y - py;
      if (dx * dx + dy * dy > r2) continue;

      const line = bresenhamLine(px, py, x, y);
      let blocked = false;
      for (let i = 1; i < line.length; i++) {
        const [lx, ly] = line[i];
        if (lx === x && ly === y) break;
        if (isWall(d, lx, ly)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        const idx = dungeonIndex(d, x, y);
        d.visible[idx] = 1;
        d.seen[idx] = 1;
      }
    }
  }

  d.visible[dungeonIndex(d, px, py)] = 1;
  d.seen[dungeonIndex(d, px, py)] = 1;
}

function rollDamage(rng, atk, def) {
  const spread = rng.int(-1, 1);
  const raw = atk + spread - def;
  return Math.max(1, raw);
}

function formatScore(n) {
  return n.toLocaleString();
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const data = safeJsonParse(raw, null);
  if (!data) {
    return { soundOn: true, musicOn: true };
  }
  return {
    soundOn: data.soundOn !== false,
    musicOn: data.musicOn !== false,
  };
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadLeaderboard() {
  const raw = localStorage.getItem(LEADER_KEY);
  const data = safeJsonParse(raw, []);
  if (!Array.isArray(data)) return [];
  return data;
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADER_KEY, JSON.stringify(entries.slice(0, 10)));
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

class RogueGame {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.tileSize = 16;
    this.gridW = 40;
    this.gridH = 25;

    this.mode = "MENU";
    this.settings = loadSettings();

    this.params = new URLSearchParams(window.location.search);
    this.demoMode = this.params.get("demo") === "1";
    this.ephemeralSettings = false;
    if (this.params.get("mute") === "1") {
      this.settings.soundOn = false;
      this.settings.musicOn = false;
      this.ephemeralSettings = true;
    }

    this.sound = new SoundManager();
    this.sound.loadSettings(this.settings);

    this.rng = new RNG(Date.now());

    this.dungeon = null;
    this.player = null;
    this.enemies = [];
    this.items = [];

    this.turn = 0;
    this.floor = 1;
    this.score = { kills: 0, goldCollected: 0, turns: 0, bestFloor: 1 };

    this.logLines = [];

    this.effects = [];
    this.shake = { t: 0, mag: 0 };

    this.pendingLevelUp = null;
    this.pendingShop = null;

    this.overlayClosable = true;

    this.inputLockedUntil = 0;

    this._lastFrame = nowMs();
    this._boundFrame = this.frame.bind(this);

    this._setupUi();
    this._setupInputs();

    this.demo = { actionAcc: 0, overlayAcc: 0, gameOverAcc: 0 };

    const autoStart = this.demoMode || this.params.get("autostart") === "1";
    if (autoStart) this.newGame();
    else this.showMainMenu();
  }

  start() {
    requestAnimationFrame(this._boundFrame);
  }

  frame() {
    const t = nowMs();
    const dt = Math.min(40, t - this._lastFrame);
    this._lastFrame = t;

    this.update(dt);
    this.draw(dt);

    requestAnimationFrame(this._boundFrame);
  }

  update(dt) {
    for (const e of this.effects) {
      e.ttl -= dt;
      e.yOff -= dt * 0.015;
    }
    this.effects = this.effects.filter((e) => e.ttl > 0);

    if (this.shake.t > 0) {
      this.shake.t -= dt;
      if (this.shake.t < 0) this.shake.t = 0;
    }

    if (this.mode === "PLAY" && this.player) {
      this._renderStats();
    }

    if (this.demoMode) this._demoUpdate(dt);
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shake.t > 0) {
      const m = this.shake.mag;
      const ox = (Math.random() * 2 - 1) * m;
      const oy = (Math.random() * 2 - 1) * m;
      ctx.translate(ox, oy);
    }

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.dungeon || !this.player) {
      ctx.restore();
      return;
    }

    const d = this.dungeon;
    const ts = this.tileSize;

    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const idx = y * d.w + x;
        const seen = d.seen[idx] === 1;
        const vis = d.visible[idx] === 1;
        const t = d.tiles[idx];

        let color = "#000";
        if (!seen) {
          color = "#000";
        } else if (t === TILES.WALL) {
          color = vis ? "#21243a" : "#12152a";
        } else if (t === TILES.FLOOR) {
          color = vis ? "#0d1020" : "#070914";
        } else if (t === TILES.STAIRS) {
          color = vis ? "#11302e" : "#071410";
        } else if (t === TILES.EXIT) {
          color = vis ? "#3b2252" : "#1a1024";
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * ts, y * ts, ts, ts);

        if (vis) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(x * ts, y * ts, ts, 1);
        }
      }
    }

    ctx.font = "16px ui-monospace, Menlo, Consolas, monospace";
    ctx.textBaseline = "top";

    const stairsIdx = dungeonIndex(d, d.stairs.x, d.stairs.y);
    if (d.seen[stairsIdx]) {
      const tile = d.tiles[stairsIdx];
      const isVis = d.visible[stairsIdx] === 1;
      if (tile === TILES.STAIRS) {
        ctx.fillStyle = isVis ? "#6bdcff" : "#2a6a7a";
        ctx.fillText(">", d.stairs.x * ts + 3, d.stairs.y * ts + 1);
      } else if (tile === TILES.EXIT) {
        ctx.fillStyle = isVis ? "#ff6bdc" : "#7a2a73";
        ctx.fillText("E", d.stairs.x * ts + 3, d.stairs.y * ts + 1);
      }
    }

    for (const it of this.items) {
      if (!d.visible[dungeonIndex(d, it.x, it.y)]) continue;
      const px = it.x * ts + 3;
      const py = it.y * ts + 1;
      if (it.kind === "gold") {
        ctx.fillStyle = "#ffdf6b";
        ctx.fillText("$", px, py);
      } else if (it.kind === "potion") {
        ctx.fillStyle = "#6bdcff";
        ctx.fillText("!", px, py);
      }
    }

    for (const en of this.enemies) {
      if (en.hp <= 0) continue;
      if (!d.visible[dungeonIndex(d, en.x, en.y)]) continue;
      const et = ENEMY_TYPES[en.type];
      ctx.fillStyle = et.color;
      ctx.fillText(et.glyph, en.x * ts + 3, en.y * ts + 1);
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillText("@", this.player.x * ts + 3, this.player.y * ts + 1);

    for (const fx of this.effects) {
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = clamp(fx.ttl / 650, 0, 1);
      ctx.fillText(fx.text, fx.x * ts + 1, fx.y * ts + fx.yOff);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, this.canvas.width, 22);
    ctx.fillStyle = "#e7e7ea";
    ctx.fillText(
      `Floor ${this.floor}${this.floor === END_FLOOR ? " (Final)" : ""}  ·  Turn ${this.turn}`,
      8,
      3,
    );

    ctx.restore();
  }

  _setupUi() {
    const btnHelp = document.getElementById("btnHelp");
    const btnPause = document.getElementById("btnPause");
    const btnSound = document.getElementById("btnSound");
    const btnMusic = document.getElementById("btnMusic");

    const updateToggles = () => {
      btnSound.textContent = `Sound: ${this.settings.soundOn ? "On" : "Off"}`;
      btnMusic.textContent = `Music: ${this.settings.musicOn ? "On" : "Off"}`;
    };

    updateToggles();

    btnHelp.addEventListener("click", () => {
      this.sound.ensure();
      this.showHelp();
    });

    btnPause.addEventListener("click", () => {
      this.sound.ensure();
      if (this.mode === "MENU") return;
      this.showPauseMenu();
    });

    btnSound.addEventListener("click", () => {
      this.sound.ensure();
      this.settings.soundOn = !this.settings.soundOn;
      this.sound.setSound(this.settings.soundOn);
      if (!this.settings.soundOn) this.sound.stopMusic();
      if (this.settings.soundOn && this.settings.musicOn) this.sound.startMusic();
      if (!this.ephemeralSettings) saveSettings(this.settings);
      updateToggles();
    });

    btnMusic.addEventListener("click", () => {
      this.sound.ensure();
      this.settings.musicOn = !this.settings.musicOn;
      this.sound.setMusic(this.settings.musicOn);
      if (!this.ephemeralSettings) saveSettings(this.settings);
      updateToggles();
    });

    const touch = document.getElementById("touchControls");
    const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) touch.classList.add("show");

    const bindTouch = (id, action) => {
      const el = document.getElementById(id);
      el.addEventListener("click", () => {
        this.sound.ensure();
        this.handleAction(action);
      });
    };

    bindTouch("tUp", { kind: "move", dx: 0, dy: -1 });
    bindTouch("tDown", { kind: "move", dx: 0, dy: 1 });
    bindTouch("tLeft", { kind: "move", dx: -1, dy: 0 });
    bindTouch("tRight", { kind: "move", dx: 1, dy: 0 });
    bindTouch("tWait", { kind: "wait" });
    bindTouch("tPotion", { kind: "potion" });
    bindTouch("tSkill", { kind: "skill" });
    bindTouch("tStairs", { kind: "stairs" });
    bindTouch("tSave", { kind: "saveQuit" });
  }

  _setupInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;

      const key = e.key.toLowerCase();
      const inOverlay = UI.overlay.classList.contains("show");
      if (inOverlay) {
        if (key === "escape" && this.overlayClosable) this.hideOverlay();
        return;
      }

      if (this.mode !== "PLAY") return;

      const map = {
        arrowup: { kind: "move", dx: 0, dy: -1 },
        w: { kind: "move", dx: 0, dy: -1 },
        arrowdown: { kind: "move", dx: 0, dy: 1 },
        s: { kind: "move", dx: 0, dy: 1 },
        arrowleft: { kind: "move", dx: -1, dy: 0 },
        a: { kind: "move", dx: -1, dy: 0 },
        arrowright: { kind: "move", dx: 1, dy: 0 },
        d: { kind: "move", dx: 1, dy: 0 },
        " ": { kind: "wait" },
        p: { kind: "potion" },
        f: { kind: "skill" },
        enter: { kind: "stairs" },
        escape: { kind: "pause" },
      };

      const act = map[key];
      if (!act) return;

      e.preventDefault();
      this.sound.ensure();
      if (act.kind === "pause") this.showPauseMenu();
      else this.handleAction(act);
    });

    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.mode !== "PLAY") return;
      if (UI.overlay.classList.contains("show")) return;

      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width;
      const sy = (e.clientY - rect.top) / rect.height;
      const x = Math.floor(sx * this.canvas.width / this.tileSize);
      const y = Math.floor(sy * this.canvas.height / this.tileSize);

      const dx = x - this.player.x;
      const dy = y - this.player.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return;

      this.sound.ensure();
      this.handleAction({ kind: "move", dx: clamp(dx, -1, 1), dy: clamp(dy, -1, 1) });
    });
  }

  showOverlay(html, { allowClose = true } = {}) {
    this.overlayClosable = allowClose;
    UI.modal.innerHTML = html;
    UI.overlay.classList.add("show");

    if (!allowClose) return;

    UI.overlay.addEventListener(
      "click",
      (e) => {
        if (e.target === UI.overlay) this.hideOverlay();
      },
      { once: true }
    );
  }

  hideOverlay() {
    this.overlayClosable = true;
    UI.overlay.classList.remove("show");
  }

  addLog(text, kind = "muted") {
    this.logLines.unshift({ text, kind });
    this.logLines = this.logLines.slice(0, 60);
    this._renderLog();
  }

  _renderLog() {
    UI.log.innerHTML = this.logLines
      .slice(0, 24)
      .map((l) => `<div class="logLine ${l.kind}">${escapeHtml(l.text)}</div>`)
      .join("");
  }

  _renderStats() {
    const p = this.player;
    UI.hp.textContent = `${p.hp}/${p.maxHp}`;
    UI.floor.textContent = `${this.floor}/${END_FLOOR}`;
    UI.level.textContent = `${p.level}`;
    UI.xp.textContent = `${p.xp}/${p.nextXp}`;
    UI.atk.textContent = `${p.atk}`;
    UI.def.textContent = `${p.def}`;
    UI.gold.textContent = `${p.gold}`;
    UI.potions.textContent = `${p.potions}`;
    UI.skill.textContent = p.skillUnlocked
      ? p.skillCooldown > 0
        ? `CD ${p.skillCooldown}`
        : "Ready"
      : "Locked";
    UI.score.textContent = formatScore(this.computeScore());
  }

  computeScore() {
    const p = this.player;
    if (!p) return 0;
    return (
      this.floor * 1000 +
      this.score.kills * 65 +
      this.score.goldCollected +
      p.level * 220 +
      Math.floor(p.xp * 1.2)
    );
  }

  showMainMenu() {
    this.mode = "MENU";
    this.sound.startMusic();

    const continueDisabled = !hasSave();

    this.showOverlay(
      `
      <h2>Rogue Canvas Dungeon</h2>
      <p>Turn-based roguelike dungeon crawler. Descend to Floor ${END_FLOOR} and defeat the final boss.</p>
      <div class="row">
        <button class="primary" id="btnNew">New Game</button>
        <button id="btnContinue" ${continueDisabled ? "disabled" : ""}>Continue</button>
        <button id="btnTutorial">How to play</button>
        <button id="btnLeaders">Leaderboard</button>
      </div>
      <p style="margin-top:12px">Tip: enemies act after you do. Use the log for feedback and the shop between floors for upgrades.</p>
      `,
      { allowClose: false },
    );

    document.getElementById("btnNew").addEventListener("click", () => {
      this.sound.ensure();
      this.newGame();
    });

    const btnContinue = document.getElementById("btnContinue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        this.sound.ensure();
        this.loadGame();
      });
    }

    document.getElementById("btnTutorial").addEventListener("click", () => {
      this.sound.ensure();
      this.showHelp();
    });

    document.getElementById("btnLeaders").addEventListener("click", () => {
      this.sound.ensure();
      this.showLeaderboard();
    });

    this._renderLog();
  }

  showHelp() {
    this.showOverlay(
      `
      <h2>How to play</h2>
      <p><b>Goal:</b> Explore, fight, and descend. On Floor ${END_FLOOR}, defeat the final boss and escape.</p>
      <p><b>Controls:</b><br/>
        Move: <b>WASD / Arrow keys</b><br/>
        Wait: <b>Space</b><br/>
        Potion: <b>P</b> (heals, limited)<br/>
        Skill: <b>F</b> (unlocks when you level, has cooldown)<br/>
        Descend: <b>Enter</b> when standing on <b>></b><br/>
      </p>
      <p><b>Tips:</b>
        Enemies have different behaviors (some are ranged!). Save often (auto-save is enabled). Use the shop to scale into the late game.
      </p>
      <div class="row">
        <button class="primary" id="btnHelpOk">Close</button>
      </div>
      `,
    );

    document.getElementById("btnHelpOk").addEventListener("click", () => this.hideOverlay());
  }

  showPauseMenu() {
    const canSave = this.mode === "PLAY";

    this.showOverlay(
      `
      <h2>Menu</h2>
      <p>Auto-save is enabled. You can also save and return to the main menu.</p>
      <div class="row">
        <button class="primary" id="btnResume">Resume</button>
        <button id="btnSaveQuit" ${canSave ? "" : "disabled"}>Save & Quit</button>
        <button id="btnRestart" class="danger">Restart</button>
        <button id="btnLeaders2">Leaderboard</button>
        <button id="btnHelp2">Help</button>
      </div>
      `,
    );

    document.getElementById("btnResume").addEventListener("click", () => this.hideOverlay());
    document.getElementById("btnHelp2").addEventListener("click", () => this.showHelp());
    document.getElementById("btnLeaders2").addEventListener("click", () => this.showLeaderboard());

    document.getElementById("btnRestart").addEventListener("click", () => {
      localStorage.removeItem(SAVE_KEY);
      this.newGame();
    });

    const btnSaveQuit = document.getElementById("btnSaveQuit");
    btnSaveQuit.addEventListener("click", () => {
      if (!canSave) return;
      this.saveGame();
      this.hideOverlay();
      this.showMainMenu();
    });
  }

  showLeaderboard() {
    const entries = loadLeaderboard();

    const list = entries.length
      ? entries
          .map(
            (e, i) =>
              `<div class="item"><div class="meta"><div class="name">#${i + 1} ${escapeHtml(
                e.name,
              )}</div><div class="desc">Floor ${e.floor} · ${new Date(e.when).toLocaleDateString()}</div></div><div class="buy"><div class="price">${formatScore(
                e.score,
              )}</div></div></div>`,
          )
          .join("")
      : `<div class="item"><div class="meta"><div class="name">No scores yet</div><div class="desc">Finish a run to add one.</div></div></div>`;

    this.showOverlay(
      `
      <h2>Leaderboard (local)</h2>
      <div class="list">${list}</div>
      <div class="row">
        <button class="primary" id="btnCloseLeaders">Close</button>
        <button id="btnClearLeaders" class="danger">Clear</button>
      </div>
      `,
    );

    document.getElementById("btnCloseLeaders").addEventListener("click", () => this.hideOverlay());
    document.getElementById("btnClearLeaders").addEventListener("click", () => {
      saveLeaderboard([]);
      this.showLeaderboard();
    });
  }

  newGame() {
    this.hideOverlay();

    this.rng = new RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);

    this.turn = 0;
    this.floor = 1;
    this.score = { kills: 0, goldCollected: 0, turns: 0, bestFloor: 1 };

    this.logLines = [];
    this.addLog("You step into the dungeon...", "muted");

    this.player = {
      x: 0,
      y: 0,
      hp: 24,
      maxHp: 24,
      atk: 5,
      def: 1,
      crit: 0.07,
      level: 1,
      xp: 0,
      nextXp: 20,
      gold: 0,
      potions: 2,
      skillUnlocked: false,
      skillCooldown: 0,
      skillBaseCooldown: 6,
      skillCdBonus: 0,
      weaponTier: 0,
      armorTier: 0,
    };

    this.generateFloor(1, { fromSave: false });
    this.mode = "PLAY";

    if (this.settings.soundOn && this.settings.musicOn) this.sound.startMusic();

    this.saveGame();
  }

  generateFloor(floor, { fromSave }) {
    const w = this.gridW;
    const h = this.gridH;

    if (!fromSave) {
      this.dungeon = generateDungeon(this.rng, w, h);
      this.player.x = this.dungeon.spawn.x;
      this.player.y = this.dungeon.spawn.y;
    }

    this.enemies = [];
    this.items = [];

    if (!fromSave) {
      this._spawnFloorContent(floor);
      computeFov(this.dungeon, this.player.x, this.player.y);
      this.addLog(`Floor ${floor}: the air feels colder.`, "muted");
    }

    this._renderStats();
  }

  _findRandomFreeTile() {
    const d = this.dungeon;
    for (let i = 0; i < 2000; i++) {
      const x = this.rng.int(1, d.w - 2);
      const y = this.rng.int(1, d.h - 2);
      if (!isWalkable(d, x, y)) continue;
      if (x === this.player.x && y === this.player.y) continue;
      if (this.enemies.some((e) => e.x === x && e.y === y && e.hp > 0)) continue;
      if (this.items.some((it) => it.x === x && it.y === y)) continue;
      return { x, y };
    }

    for (let y = 1; y < d.h - 1; y++) {
      for (let x = 1; x < d.w - 1; x++) {
        if (!isWalkable(d, x, y)) continue;
        if (x === this.player.x && y === this.player.y) continue;
        if (this.enemies.some((e) => e.x === x && e.y === y && e.hp > 0)) continue;
        if (this.items.some((it) => it.x === x && it.y === y)) continue;
        return { x, y };
      }
    }

    return { x: this.player.x, y: this.player.y };
  }

  _spawnFloorContent(floor) {
    const pool = enemyPoolForFloor(floor);
    const count = clamp(6 + floor * 2, 6, 18);

    const spawnEnemy = (typeKey) => {
      const t = ENEMY_TYPES[typeKey];
      const pos = this._findRandomFreeTile();
      const hp = scaleStat(t.baseHp, floor);
      const atk = scaleStat(t.baseAtk, floor);
      const def = scaleStat(t.baseDef, floor);

      this.enemies.push({
        id: `${typeKey}_${Math.random().toString(16).slice(2)}`,
        type: typeKey,
        x: pos.x,
        y: pos.y,
        hp,
        maxHp: hp,
        atk,
        def,
        cooldown: 0,
      });
    };

    for (let i = 0; i < count; i++) {
      const typeKey = this.rng.pick(pool);
      spawnEnemy(typeKey);
    }

    if (floor === 10) spawnEnemy("minotaur");
    if (floor === END_FLOOR) spawnEnemy("dragon");

    const goldPiles = clamp(4 + Math.floor(floor / 2), 4, 12);
    for (let i = 0; i < goldPiles; i++) {
      const pos = this._findRandomFreeTile();
      this.items.push({ kind: "gold", x: pos.x, y: pos.y, amount: this.rng.int(2, 6 + floor) });
    }

    const potCount = clamp(1 + Math.floor(floor / 4), 1, 4);
    for (let i = 0; i < potCount; i++) {
      const pos = this._findRandomFreeTile();
      this.items.push({ kind: "potion", x: pos.x, y: pos.y, amount: 1 });
    }
  }

  handleAction(action) {
    if (this.mode !== "PLAY") return;
    if (nowMs() < this.inputLockedUntil) return;

    if (!this.player || this.player.hp <= 0) return;

    let acted = false;

    if (action.kind === "move") {
      acted = this._tryMovePlayer(action.dx, action.dy);
    } else if (action.kind === "wait") {
      acted = this._playerWait();
    } else if (action.kind === "potion") {
      acted = this._usePotion();
    } else if (action.kind === "skill") {
      acted = this._useSkill();
    } else if (action.kind === "stairs") {
      acted = this._tryStairs();
    } else if (action.kind === "saveQuit") {
      this.saveGame();
      this.showMainMenu();
      return;
    }

    if (!acted) return;

    if (this.mode !== "PLAY") {
      this.saveGame();
      return;
    }

    this.turn++;
    this.score.turns++;

    if (this.player.skillCooldown > 0) this.player.skillCooldown--;

    this._enemyTurn();

    if (this.mode !== "PLAY") return;

    computeFov(this.dungeon, this.player.x, this.player.y);

    this._checkLevelUp();

    this._renderStats();

    this.saveGame();
  }

  _playerWait() {
    this.sound.sfx("move");
    this.addLog("You wait.", "muted");
    return true;
  }

  _usePotion() {
    const p = this.player;
    if (p.potions <= 0) {
      this.sound.sfx("error");
      this.addLog("No potions left.", "bad");
      return false;
    }
    if (p.hp >= p.maxHp) {
      this.sound.sfx("error");
      this.addLog("HP already full.", "muted");
      return false;
    }

    p.potions--;
    const heal = Math.min(p.maxHp - p.hp, 12 + Math.floor(p.level * 0.6));
    p.hp += heal;
    this.sound.sfx("pickup");
    this.effects.push({ x: p.x, y: p.y, text: `+${heal}`, color: "#69ff9a", ttl: 700, yOff: 0 });
    this.addLog(`You drink a potion (+${heal} HP).`, "good");
    return true;
  }

  _useSkill() {
    const p = this.player;
    if (!p.skillUnlocked) {
      this.sound.sfx("error");
      this.addLog("Skill locked. Reach Level 3.", "muted");
      return false;
    }
    if (p.skillCooldown > 0) {
      this.sound.sfx("error");
      this.addLog(`Skill on cooldown (${p.skillCooldown}).`, "muted");
      return false;
    }

    const targets = this.enemies.filter(
      (e) => e.hp > 0 && distManhattan(e.x, e.y, p.x, p.y) === 1,
    );

    if (targets.length === 0) {
      this.sound.sfx("error");
      this.addLog("No adjacent enemies for your skill.", "muted");
      return false;
    }

    this.sound.sfx("skill");
    this.addLog("You unleash a cleave!", "good");

    const dmgBase = Math.max(1, Math.floor(p.atk * 0.85));
    for (const t of targets) {
      const dmg = rollDamage(this.rng, dmgBase + 1, t.def);
      this._dealDamageToEnemy(t, dmg, { source: "skill" });
    }

    const baseCd = typeof p.skillBaseCooldown === "number" ? p.skillBaseCooldown : 6;
    const bonus = typeof p.skillCdBonus === "number" ? p.skillCdBonus : 0;
    p.skillCooldown = Math.max(2, baseCd - bonus);
    return true;
  }

  _tryMovePlayer(dx, dy) {
    const p = this.player;
    const nx = p.x + dx;
    const ny = p.y + dy;

    if (!inBounds(this.dungeon, nx, ny)) return false;

    const enemy = this.enemies.find((e) => e.hp > 0 && e.x === nx && e.y === ny);
    if (enemy) {
      this._playerAttack(enemy);
      return true;
    }

    if (!isWalkable(this.dungeon, nx, ny)) {
      this.sound.sfx("error");
      this.addLog("You bump into a wall.", "muted");
      return false;
    }

    p.x = nx;
    p.y = ny;
    this.sound.sfx("move");

    const itemIndex = this.items.findIndex((it) => it.x === nx && it.y === ny);
    if (itemIndex !== -1) {
      const it = this.items[itemIndex];
      this.items.splice(itemIndex, 1);

      if (it.kind === "gold") {
        p.gold += it.amount;
        this.score.goldCollected += it.amount;
        this.sound.sfx("pickup");
        this.addLog(`Picked up ${it.amount} gold.`, "good");
      } else if (it.kind === "potion") {
        p.potions += 1;
        this.sound.sfx("pickup");
        this.addLog("Picked up a potion.", "good");
      }
    }

    const tile = this.dungeon.tiles[dungeonIndex(this.dungeon, nx, ny)];
    if (tile === TILES.STAIRS) this.addLog("Stairs here (press Enter to descend).", "muted");
    if (tile === TILES.EXIT) this.addLog("The exit hums with power (press Enter).", "good");

    return true;
  }

  _playerAttack(enemy) {
    const p = this.player;
    const crit = this.rng.chance(p.crit);
    const dmg = rollDamage(this.rng, p.atk + (crit ? Math.floor(p.atk * 0.6) : 0), enemy.def);

    this.sound.sfx("hit");
    this.addLog(
      `You hit the ${ENEMY_TYPES[enemy.type].name} for ${dmg}${crit ? " (CRIT)" : ""}.`,
      "muted",
    );

    this._dealDamageToEnemy(enemy, dmg, { source: "melee", crit });
  }

  _dealDamageToEnemy(enemy, dmg) {
    enemy.hp -= dmg;
    this.effects.push({ x: enemy.x, y: enemy.y, text: `-${dmg}`, color: "#ff6b6b", ttl: 650, yOff: 0 });

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      this._killEnemy(enemy);
    }
  }

  _killEnemy(enemy) {
    const t = ENEMY_TYPES[enemy.type];

    this.score.kills++;

    const xp = scaleStat(t.xp, this.floor);
    const gold = this.rng.int(t.gold[0], t.gold[1]);

    this.player.xp += xp;
    this.player.gold += gold;
    this.score.goldCollected += gold;

    this.addLog(`Defeated ${t.name}! +${xp} XP, +${gold} gold.`, "good");

    if (enemy.type === "slime" && this.rng.chance(0.2) && this.floor >= 2) {
      this.addLog("The slime splits!", "bad");
      for (let i = 0; i < 2; i++) {
        const pos = this._findNearbyFree(enemy.x, enemy.y);
        if (!pos) continue;
        const hp = Math.max(4, Math.floor(enemy.maxHp * 0.45));
        this.enemies.push({
          id: `slimelet_${Math.random().toString(16).slice(2)}`,
          type: "slime",
          x: pos.x,
          y: pos.y,
          hp,
          maxHp: hp,
          atk: Math.max(1, Math.floor(enemy.atk * 0.7)),
          def: 0,
          cooldown: 0,
        });
      }
    }

    if (t.boss) {
      if (enemy.type === "minotaur") {
        this.addLog("The Minotaur falls. The dungeon seems to shift...", "good");
        this.items.push({ kind: "potion", x: enemy.x, y: enemy.y, amount: 1 });
      }
      if (enemy.type === "dragon") {
        this.addLog("The dragon shatters into gears. An exit opens!", "good");
        this.dungeon.exitOpen = true;
        this.dungeon.tiles[dungeonIndex(this.dungeon, this.dungeon.stairs.x, this.dungeon.stairs.y)] =
          TILES.EXIT;
      }
    }
  }

  _findNearbyFree(x, y) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(this.dungeon, nx, ny)) continue;
      if (!isWalkable(this.dungeon, nx, ny)) continue;
      if (this.enemies.some((e) => e.hp > 0 && e.x === nx && e.y === ny)) continue;
      if (this.player.x === nx && this.player.y === ny) continue;
      return { x: nx, y: ny };
    }
    return null;
  }

  _enemyTurn() {
    const d = this.dungeon;
    const p = this.player;

    const dist = this._computeDistanceMap(p.x, p.y);

    for (const en of this.enemies) {
      if (en.hp <= 0) continue;

      if (en.cooldown > 0) en.cooldown--;

      const t = ENEMY_TYPES[en.type];
      const md = distManhattan(en.x, en.y, p.x, p.y);

      if (md === 1) {
        this._enemyAttack(en);
        if (p.hp <= 0) return;
        continue;
      }

      if (t.trick === "ranged" && md <= 6 && this._lineOfSight(en.x, en.y, p.x, p.y)) {
        if (en.cooldown === 0) {
          en.cooldown = 3;
          const dmg = rollDamage(this.rng, en.atk + 2, p.def);
          this.sound.sfx("hurt");
          this.addLog(`${t.name} casts a bolt for ${dmg}!`, "bad");
          p.hp -= dmg;
          this.effects.push({ x: p.x, y: p.y, text: `-${dmg}`, color: "#ff6b6b", ttl: 650, yOff: 0 });
          this.shake = { t: 120, mag: 2 };
          if (p.hp <= 0) {
            p.hp = 0;
            this._gameOver(false);
            return;
          }
          continue;
        }
      }

      if (t.trick === "breath" && md <= 5 && this._lineOfSight(en.x, en.y, p.x, p.y)) {
        if (en.cooldown === 0) {
          en.cooldown = 4;
          const dmg = rollDamage(this.rng, en.atk + 4, p.def);
          this.sound.sfx("hurt");
          this.addLog(`${t.name} breathes fire for ${dmg}!`, "bad");
          p.hp -= dmg;
          this.effects.push({ x: p.x, y: p.y, text: `-${dmg}`, color: "#ff6b6b", ttl: 650, yOff: 0 });
          this.shake = { t: 180, mag: 3 };
          if (p.hp <= 0) {
            p.hp = 0;
            this._gameOver(false);
            return;
          }
          continue;
        }
      }

      const aggroRange = t.aggro;
      const willChase = md <= aggroRange;

      if (!willChase) {
        if (this.rng.chance(0.35)) this._enemyWander(en);
        continue;
      }

      const step = this._nextStepTowards(en.x, en.y, dist);
      if (step) {
        const [nx, ny] = step;
        if (nx === p.x && ny === p.y) {
          this._enemyAttack(en);
        } else {
          en.x = nx;
          en.y = ny;
        }
      }

      if (t.trick === "skirmish" && this.rng.chance(0.12) && md <= 4) {
        const step2 = this._nextStepTowards(en.x, en.y, dist);
        if (step2 && !(step2[0] === p.x && step2[1] === p.y)) {
          en.x = step2[0];
          en.y = step2[1];
        }
      }
    }
  }

  _enemyWander(en) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const [dx, dy] = this.rng.pick(dirs);
    const nx = en.x + dx;
    const ny = en.y + dy;
    if (!inBounds(this.dungeon, nx, ny)) return;
    if (!isWalkable(this.dungeon, nx, ny)) return;
    if (this.enemies.some((e) => e.hp > 0 && e !== en && e.x === nx && e.y === ny)) return;
    if (this.player.x === nx && this.player.y === ny) return;
    en.x = nx;
    en.y = ny;
  }

  _enemyAttack(en) {
    const p = this.player;
    const t = ENEMY_TYPES[en.type];

    const dmg = rollDamage(this.rng, en.atk, p.def);
    this.sound.sfx("hurt");
    this.addLog(`${t.name} hits you for ${dmg}.`, "bad");

    p.hp -= dmg;
    this.effects.push({ x: p.x, y: p.y, text: `-${dmg}`, color: "#ff6b6b", ttl: 650, yOff: 0 });
    this.shake = { t: 120, mag: 2 };

    if (p.hp <= 0) {
      p.hp = 0;
      this._gameOver(false);
    }
  }

  _computeDistanceMap(tx, ty) {
    const d = this.dungeon;
    const dist = new Int16Array(d.w * d.h);
    dist.fill(-1);

    const qx = [];
    const qy = [];
    let qi = 0;

    dist[dungeonIndex(d, tx, ty)] = 0;
    qx.push(tx);
    qy.push(ty);

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (qi < qx.length) {
      const x = qx[qi];
      const y = qy[qi];
      qi++;
      const base = dist[dungeonIndex(d, x, y)];

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(d, nx, ny)) continue;
        if (!isWalkable(d, nx, ny)) continue;
        if (dist[dungeonIndex(d, nx, ny)] !== -1) continue;
        dist[dungeonIndex(d, nx, ny)] = base + 1;
        qx.push(nx);
        qy.push(ny);
      }
    }

    return dist;
  }

  _nextStepTowards(sx, sy, dist) {
    const d = this.dungeon;
    const idx = dungeonIndex(d, sx, sy);
    const base = dist[idx];
    if (base < 0) return null;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    let best = null;
    let bestVal = base;
    for (const [dx, dy] of dirs) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (!inBounds(d, nx, ny)) continue;
      if (!isWalkable(d, nx, ny)) continue;
      if (this.enemies.some((e) => e.hp > 0 && e.x === nx && e.y === ny)) continue;

      const v = dist[dungeonIndex(d, nx, ny)];
      if (v === -1) continue;
      if (v < bestVal) {
        bestVal = v;
        best = [nx, ny];
      }
    }

    return best;
  }

  _lineOfSight(x0, y0, x1, y1) {
    const d = this.dungeon;
    const pts = bresenhamLine(x0, y0, x1, y1);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      if (isWall(d, x, y)) return false;
    }
    return true;
  }

  _checkLevelUp() {
    const p = this.player;

    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = 20 + Math.floor(p.level * 16);
      p.maxHp += 3;
      p.hp = Math.min(p.maxHp, p.hp + 6);

      if (p.level >= 3) p.skillUnlocked = true;

      this.sound.sfx("levelup");
      this.addLog(`Level up! You are now level ${p.level}.`, "good");

      this._openLevelUpChoices();
      return;
    }
  }

  _levelUpPerkPool() {
    const p = this.player;

    return [
      {
        key: "hp",
        name: "+5 Max HP",
        desc: "Become tougher.",
        apply: () => {
          p.maxHp += 5;
          p.hp += 5;
          this.addLog("Max HP increased.", "good");
        },
      },
      {
        key: "atk",
        name: "+1 ATK",
        desc: "Deal more damage.",
        apply: () => {
          p.atk += 1;
          this.addLog("Attack increased.", "good");
        },
      },
      {
        key: "def",
        name: "+1 DEF",
        desc: "Take less damage.",
        apply: () => {
          p.def += 1;
          this.addLog("Defense increased.", "good");
        },
      },
      {
        key: "potion",
        name: "+1 Potion",
        desc: "Emergency healing.",
        apply: () => {
          p.potions += 1;
          this.addLog("You gained a potion.", "good");
        },
      },
      {
        key: "crit",
        name: "+3% Crit",
        desc: "Occasional big hits.",
        apply: () => {
          p.crit = clamp(p.crit + 0.03, 0, 0.35);
          this.addLog("Crit chance increased.", "good");
        },
      },
      {
        key: "skillcd",
        name: "Skill cooldown -1",
        desc: "Your cleave recovers faster.",
        apply: () => {
          p.skillCdBonus = clamp((p.skillCdBonus || 0) + 1, 0, 3);
          this.addLog("Skill cooldown reduced.", "good");
        },
      },
    ];
  }

  _openLevelUpChoices() {
    const pool = this._levelUpPerkPool();
    const keys = [];
    const used = new Set();

    while (keys.length < 3 && used.size < pool.length) {
      const idx = this.rng.int(0, pool.length - 1);
      if (used.has(idx)) continue;
      used.add(idx);
      keys.push(pool[idx].key);
    }

    this._showLevelUpFromKeys(keys);
  }

  _showLevelUpFromKeys(keys) {
    const pool = this._levelUpPerkPool();
    const byKey = new Map(pool.map((p) => [p.key, p]));

    const choices = keys.map((k) => byKey.get(k)).filter(Boolean);
    if (choices.length === 0) {
      this.mode = "PLAY";
      this.pendingLevelUp = null;
      return;
    }

    this.pendingLevelUp = { keys: choices.map((c) => c.key) };
    this.mode = "LEVELUP";

    const list = choices
      .map((c, i) => {
        return `<div class="item"><div class="meta"><div class="name">${escapeHtml(
          c.name,
        )}</div><div class="desc">${escapeHtml(c.desc)}</div></div><div class="buy"><button class="primary" data-choice="${i}">Choose</button></div></div>`;
      })
      .join("");

    this.showOverlay(
      `
      <h2>Level Up</h2>
      <p>Choose one perk:</p>
      <div class="list">${list}</div>
      `,
      { allowClose: false },
    );

    UI.modal.querySelectorAll("button[data-choice]").forEach((b) => {
      b.addEventListener("click", () => {
        const i = Number(b.getAttribute("data-choice"));
        const chosenKey =
          this.pendingLevelUp && Array.isArray(this.pendingLevelUp.keys)
            ? this.pendingLevelUp.keys[i]
            : null;
        const perk = chosenKey ? byKey.get(chosenKey) : null;
        if (!perk) return;

        perk.apply();
        this.pendingLevelUp = null;
        this.hideOverlay();
        this.mode = "PLAY";
        this.saveGame();
      });
    });
  }

  _tryStairs() {
    const d = this.dungeon;
    const tile = d.tiles[dungeonIndex(d, this.player.x, this.player.y)];

    if (tile === TILES.EXIT) {
      if (!d.exitOpen) {
        this.sound.sfx("error");
        this.addLog("The exit is sealed. Defeat the boss.", "bad");
        return false;
      }
      this._gameOver(true);
      return true;
    }

    if (tile !== TILES.STAIRS) {
      this.sound.sfx("error");
      this.addLog("No stairs here.", "muted");
      return false;
    }

    if (this.floor >= END_FLOOR) {
      this.sound.sfx("error");
      this.addLog("Something blocks the path...", "bad");
      return false;
    }

    this.sound.sfx("stairs");
    this.openShop();
    return true;
  }

  openShop({ offers = null, floorNext = null } = {}) {
    this.mode = "SHOP";
    this._renderStats();

    const next = floorNext !== null && floorNext !== undefined ? floorNext : this.floor + 1;
    const listOffers = offers !== null && offers !== undefined ? offers : this._generateShopOffers();

    this.pendingShop = { offers: listOffers, floorNext: next };

    const list = listOffers
      .map((o, i) => {
        return `<div class="item"><div class="meta"><div class="name">${escapeHtml(
          o.name,
        )}</div><div class="desc">${escapeHtml(o.desc)}</div></div><div class="buy"><div class="price">${
          o.cost
        }g</div><button data-buy="${i}" ${o.disabled ? "disabled" : ""}>Buy</button></div></div>`;
      })
      .join("");

    this.showOverlay(
      `
      <h2>Shop (between floors)</h2>
      <p>You have <b>${this.player.gold}g</b>. Prepare for Floor ${next}.</p>
      <div class="list">${list}</div>
      <div class="row">
        <button class="primary" id="btnLeaveShop">Continue</button>
        <button id="btnShopSave">Save & Quit</button>
      </div>
      `,
      { allowClose: false },
    );

    UI.modal.querySelectorAll("button[data-buy]").forEach((b) => {
      b.addEventListener("click", () => {
        const i = Number(b.getAttribute("data-buy"));
        this.buyShopOffer(i);
      });
    });

    document.getElementById("btnLeaveShop").addEventListener("click", () => {
      this.leaveShop();
    });

    document.getElementById("btnShopSave").addEventListener("click", () => {
      this.saveGame();
      this.hideOverlay();
      this.showMainMenu();
    });
  }

  _generateShopOffers() {
    const p = this.player;
    const f = this.floor;

    const healCost = 10 + f * 2;
    const potCost = 14 + f;
    const wCost = 28 + p.weaponTier * 24;
    const aCost = 28 + p.armorTier * 24;
    const hpCost = 45 + p.level * 14;
    const rerollCost = 18 + Math.floor(f * 0.6);

    const offers = [
      {
        kind: "heal",
        name: "Heal to full",
        desc: "Restore HP to max.",
        cost: healCost,
        buy: () => {
          const delta = p.maxHp - p.hp;
          p.hp = p.maxHp;
          this.addLog(`Healed to full (+${delta} HP).`, "good");
        },
        disabled: p.hp >= p.maxHp,
      },
      {
        kind: "potion",
        name: "Buy potion",
        desc: "Adds 1 potion.",
        cost: potCost,
        buy: () => {
          p.potions += 1;
          this.addLog("Bought a potion.", "good");
        },
      },
      {
        kind: "weapon",
        name: "Sharpen weapon (+1 ATK)",
        desc: "Permanent attack upgrade.",
        cost: wCost,
        buy: () => {
          p.atk += 1;
          p.weaponTier += 1;
          this.addLog("Weapon upgraded.", "good");
        },
      },
      {
        kind: "armor",
        name: "Reinforce armor (+1 DEF)",
        desc: "Permanent defense upgrade.",
        cost: aCost,
        buy: () => {
          p.def += 1;
          p.armorTier += 1;
          this.addLog("Armor upgraded.", "good");
        },
      },
      {
        kind: "maxhp",
        name: "+8 Max HP",
        desc: "Permanent max HP increase.",
        cost: hpCost,
        buy: () => {
          p.maxHp += 8;
          p.hp += 8;
          this.addLog("Max HP increased.", "good");
        },
      },
      {
        kind: "reroll",
        name: "Reroll shop",
        desc: "Refresh the shop items.",
        cost: rerollCost,
        buy: () => {
          this.addLog("The shopkeeper shuffles the goods...", "muted");
        },
      },
    ];

    const shuffled = offers
      .map((o) => ({ o, r: this.rng.float() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.o);

    return shuffled.slice(0, 5);
  }

  buyShopOffer(index) {
    if (!this.pendingShop) return;
    const offer = this.pendingShop.offers[index];
    if (!offer) return;

    if (offer.disabled) {
      this.sound.sfx("error");
      return;
    }

    if (this.player.gold < offer.cost) {
      this.sound.sfx("error");
      this.addLog("Not enough gold.", "bad");
      return;
    }

    this.player.gold -= offer.cost;
    this.sound.sfx("buy");
    offer.buy();

    if (offer.kind === "reroll") {
      this.pendingShop.offers = this._generateShopOffers();
      this.openShop({ offers: this.pendingShop.offers, floorNext: this.pendingShop.floorNext });
      this.saveGame();
      return;
    }

    this.pendingShop.offers[index] = {
      ...offer,
      disabled: true,
      desc: "Purchased.",
    };

    this.openShop({ offers: this.pendingShop.offers, floorNext: this.pendingShop.floorNext });
    this.saveGame();
  }

  leaveShop() {
    if (!this.pendingShop) return;

    this.floor = this.pendingShop.floorNext;
    this.score.bestFloor = Math.max(this.score.bestFloor, this.floor);

    this.pendingShop = null;
    this.hideOverlay();

    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4);

    this.dungeon = generateDungeon(this.rng, this.gridW, this.gridH);
    this.player.x = this.dungeon.spawn.x;
    this.player.y = this.dungeon.spawn.y;

    this.enemies = [];
    this.items = [];
    this._spawnFloorContent(this.floor);

    computeFov(this.dungeon, this.player.x, this.player.y);

    this.mode = "PLAY";

    this.addLog(`You descend to Floor ${this.floor}.`, "muted");

    this.saveGame();
  }

  _gameOver(victory) {
    this.mode = "GAMEOVER";
    localStorage.removeItem(SAVE_KEY);

    const score = this.computeScore();

    const title = victory ? "Victory!" : "Game Over";
    const subtitle = victory
      ? "You escaped the dungeon." 
      : "Your run ends here.";

    const summary = `Floor ${this.floor}/${END_FLOOR} · Level ${this.player.level} · Kills ${this.score.kills} · Score ${formatScore(
      score,
    )}`;

    this.showOverlay(
      `
      <h2>${title}</h2>
      <p>${escapeHtml(subtitle)}</p>
      <p><b>${escapeHtml(summary)}</b></p>

      <div class="panelBlock" style="padding:10px">
        <div style="color:var(--muted); font-size:13px; margin-bottom:8px">Add to local leaderboard:</div>
        <div class="row" style="align-items:center">
          <input id="scoreName" maxlength="16" placeholder="Name" style="flex:1; min-width:140px; padding:10px 12px; border-radius:12px; border:1px solid #2b2f48; background:#0b0d16; color:var(--text)" />
          <button id="btnSubmitScore" class="primary">Submit</button>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <button class="primary" id="btnNewRun">New Run</button>
        <button id="btnToMenu">Main Menu</button>
        <button id="btnViewLeaders">Leaderboard</button>
      </div>
      `,
      { allowClose: false },
    );

    document.getElementById("btnNewRun").addEventListener("click", () => this.newGame());
    document.getElementById("btnToMenu").addEventListener("click", () => this.showMainMenu());
    document.getElementById("btnViewLeaders").addEventListener("click", () => this.showLeaderboard());

    document.getElementById("btnSubmitScore").addEventListener("click", () => {
      const input = document.getElementById("scoreName");
      const name = (input.value || "Adventurer").trim().slice(0, 16);

      const entries = loadLeaderboard();
      entries.push({ name, score, floor: this.floor, when: Date.now() });
      entries.sort((a, b) => b.score - a.score);
      saveLeaderboard(entries);
      input.value = "";
      this.showLeaderboard();
    });
  }

  _demoUpdate(dt) {
    if (!this.demoMode) return;

    if (this.mode === "GAMEOVER") {
      this.demo.gameOverAcc += dt;
      if (this.demo.gameOverAcc > 1200) {
        this.demo.gameOverAcc = 0;
        this.showMainMenu();
      }
      return;
    }

    if (this.mode === "MENU") {
      this.newGame();
      return;
    }

    const overlayShown = UI.overlay.classList.contains("show");
    if (overlayShown) {
      this.demo.overlayAcc += dt;
      if (this.demo.overlayAcc < 350) return;
      this.demo.overlayAcc = 0;
      this._demoHandleOverlay();
      return;
    }

    this.demo.overlayAcc = 0;

    if (this.mode !== "PLAY" || !this.player || !this.dungeon) return;

    this.demo.actionAcc += dt;
    if (this.demo.actionAcc < 170) return;
    this.demo.actionAcc = 0;

    const p = this.player;

    if (p.hp <= Math.floor(p.maxHp * 0.45) && p.potions > 0) {
      this.handleAction({ kind: "potion" });
      return;
    }

    if (p.skillUnlocked && p.skillCooldown === 0) {
      const hasAdjacent = this.enemies.some(
        (e) => e.hp > 0 && distManhattan(e.x, e.y, p.x, p.y) === 1,
      );
      if (hasAdjacent) {
        this.handleAction({ kind: "skill" });
        return;
      }
    }

    const target = this._demoPickTarget();
    if (!target) {
      this.handleAction({ kind: "wait" });
      return;
    }

    if (target.kind === "stairs") {
      const tile = this.dungeon.tiles[dungeonIndex(this.dungeon, p.x, p.y)];
      if (tile === TILES.STAIRS || tile === TILES.EXIT) {
        this.handleAction({ kind: "stairs" });
        return;
      }
    }

    if (target.kind === "enemy" && target.entity) {
      const e = target.entity;
      const md = distManhattan(e.x, e.y, p.x, p.y);
      if (md === 1) {
        this.handleAction({ kind: "move", dx: e.x - p.x, dy: e.y - p.y });
        return;
      }
    }

    this._demoMoveToward(target.x, target.y);
  }

  _demoHandleOverlay() {
    if (this.mode === "LEVELUP" && this.pendingLevelUp && Array.isArray(this.pendingLevelUp.keys)) {
      const pool = this._levelUpPerkPool();
      const byKey = new Map(pool.map((p) => [p.key, p]));
      const keys = this.pendingLevelUp.keys;
      const chosenKey = keys.length ? keys[this.rng.int(0, keys.length - 1)] : null;
      const perk = chosenKey ? byKey.get(chosenKey) : null;
      if (!perk) return;

      perk.apply();
      this.pendingLevelUp = null;
      this.hideOverlay();
      this.mode = "PLAY";
      this.saveGame();
      return;
    }

    if (this.mode === "SHOP" && this.pendingShop && Array.isArray(this.pendingShop.offers)) {
      const p = this.player;
      const offers = this.pendingShop.offers;

      let idx = -1;
      for (let i = 0; i < offers.length; i++) {
        const o = offers[i];
        if (!o || o.disabled) continue;
        if (o.kind === "reroll") continue;
        if (o.kind === "heal" && p.hp >= p.maxHp) continue;
        if (p.gold >= o.cost) {
          idx = i;
          break;
        }
      }

      if (idx >= 0) this.buyShopOffer(idx);
      else this.leaveShop();
    }
  }

  _demoPickTarget() {
    const d = this.dungeon;
    const p = this.player;

    const visibleEnemies = this.enemies
      .filter((e) => e.hp > 0 && d.visible[dungeonIndex(d, e.x, e.y)] === 1)
      .sort((a, b) => distManhattan(a.x, a.y, p.x, p.y) - distManhattan(b.x, b.y, p.x, p.y));

    if (visibleEnemies.length) {
      const e = visibleEnemies[0];
      return { kind: "enemy", x: e.x, y: e.y, entity: e };
    }

    const visibleItems = this.items
      .filter((it) => d.visible[dungeonIndex(d, it.x, it.y)] === 1)
      .sort((a, b) => distManhattan(a.x, a.y, p.x, p.y) - distManhattan(b.x, b.y, p.x, p.y));

    const potion = visibleItems.find((it) => it.kind === "potion");
    if (potion) return { kind: "item", x: potion.x, y: potion.y, entity: potion };

    const gold = visibleItems.find((it) => it.kind === "gold");
    if (gold) return { kind: "item", x: gold.x, y: gold.y, entity: gold };

    return { kind: "stairs", x: d.stairs.x, y: d.stairs.y };
  }

  _demoMoveToward(tx, ty) {
    const p = this.player;
    if (p.x === tx && p.y === ty) {
      this.handleAction({ kind: "wait" });
      return;
    }

    const dist = this._computeDistanceMap(tx, ty);
    const step = this._nextStepTowards(p.x, p.y, dist);
    if (!step) {
      this.handleAction({ kind: "wait" });
      return;
    }

    this.handleAction({ kind: "move", dx: step[0] - p.x, dy: step[1] - p.y });
  }

  saveGame() {
    if (!this.player || !this.dungeon) return;

    const data = {
      v: 1,
      mode: this.mode,
      floor: this.floor,
      turn: this.turn,
      rngState: this.rng.state,
      player: this.player,
      score: this.score,
      dungeon: {
        w: this.dungeon.w,
        h: this.dungeon.h,
        tiles: Array.from(this.dungeon.tiles),
        seen: Array.from(this.dungeon.seen),
        visible: Array.from(this.dungeon.visible),
        spawn: this.dungeon.spawn,
        stairs: this.dungeon.stairs,
        exitOpen: this.dungeon.exitOpen,
      },
      enemies: this.enemies,
      items: this.items,
      pendingShop: this.pendingShop ? { floorNext: this.pendingShop.floorNext } : null,
      pendingLevelUp: this.pendingLevelUp,
      logLines: this.logLines,
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      this.sound.sfx("error");
      return;
    }

    const data = safeJsonParse(raw, null);
    if (!data || data.v !== 1) {
      localStorage.removeItem(SAVE_KEY);
      this.sound.sfx("error");
      return;
    }

    this.hideOverlay();

    this.mode = data.mode || "PLAY";
    this.floor = data.floor || 1;
    this.turn = data.turn || 0;
    this.rng = new RNG(data.rngState || Date.now());

    this.player = data.player;
    this.score = data.score || { kills: 0, goldCollected: 0, turns: 0, bestFloor: this.floor };

    const d = data.dungeon;
    this.dungeon = {
      w: d.w,
      h: d.h,
      tiles: Uint8Array.from(d.tiles),
      seen: Uint8Array.from(d.seen),
      visible: Uint8Array.from(d.visible),
      rooms: [],
      spawn: d.spawn,
      stairs: d.stairs,
      exitOpen: !!d.exitOpen,
    };

    this.enemies = Array.isArray(data.enemies) ? data.enemies : [];
    this.items = Array.isArray(data.items) ? data.items : [];

    const floorNext =
      data.pendingShop && typeof data.pendingShop.floorNext === "number" ? data.pendingShop.floorNext : null;
    this.pendingShop = floorNext !== null ? { floorNext, offers: this._generateShopOffers() } : null;

    const keys =
      data.pendingLevelUp && Array.isArray(data.pendingLevelUp.keys) ? data.pendingLevelUp.keys : null;
    this.pendingLevelUp = keys ? { keys } : null;

    this.logLines = Array.isArray(data.logLines) ? data.logLines : [];
    if (this.logLines.length === 0) this.addLog("Welcome back.", "muted");

    computeFov(this.dungeon, this.player.x, this.player.y);
    this._renderStats();

    if (this.mode === "SHOP" && this.pendingShop) {
      this.openShop({ offers: this.pendingShop.offers, floorNext: this.pendingShop.floorNext });
      return;
    }

    if (this.mode === "LEVELUP" && this.pendingLevelUp) {
      this._showLevelUpFromKeys(this.pendingLevelUp.keys);
      return;
    }

    this.mode = "PLAY";
    this._renderLog();

    this.saveGame();
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const game = new RogueGame();
window.__rcdGame = game;
game.start();
