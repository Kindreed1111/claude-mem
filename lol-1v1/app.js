(() => {
  'use strict';

  /* =========================================================
     CONFIG
     ========================================================= */
  const DD = 'https://ddragon.leagueoflegends.com';
  const HUMOR_DIR = './humor-bank/';
  const HUMOR_EXTS = ['png', 'jpg', 'webp'];
  const AFTER_WIN = 15;          // cartes visibles après la carte gagnante
  const START_AT = 10;           // index logique de départ (carte centrée au repos)
  const DURATION = { blue: 4300, red: 5100 };
  const SETTLE_MS = 380;
  const TICK_MIN_GAP = 28;
  const PRELOAD_TIMEOUT = 3000;  // ms max par source d'image au préchargement       // ms mini entre deux ticks d'une même roue

  // Roster de secours (écrit hors ligne, non vérifié) si Data Dragon est inaccessible
  const OFFLINE_IDS = ["Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios", "Ashe", "AurelionSol", "Aurora", "Azir", "Bard", "Belveth", "Blitzcrank", "Brand", "Braum", "Briar", "Caitlyn", "Camille", "Cassiopeia", "Chogath", "Corki", "Darius", "Diana", "DrMundo", "Draven", "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern", "Janna", "JarvanIV", "Jax", "Jayce", "Jhin", "Jinx", "KSante", "Kaisa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Khazix", "Kindred", "Kled", "KogMaw", "Leblanc", "LeeSin", "Leona", "Lillia", "Lissandra", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "MasterYi", "Mel", "Milio", "MissFortune", "MonkeyKing", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu", "Olaf", "Orianna", "Ornn", "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "RekSai", "Rell", "Renata", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain", "Sylas", "Syndra", "TahmKench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle", "Tryndamere", "TwistedFate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne", "Veigar", "Velkoz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", "Volibear", "Warwick", "Xayah", "Xerath", "XinZhao", "Yasuo", "Yone", "Yorick", "Yuumi", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"];

  const EMOJIS = ['😂', '💀', '🔥', '🤡', '😤', '🧂', '🗿', '😎', '🤯', '🥶', '🐐', '💅', '🫠', '😭', '🍿', '🤓', '👀', '🙃'];
  const PUNCHLINES = [
    'Flash dans le mur, comme d\'hab',
    '0/10 mais c\'est la faute du jungler',
    'Tape /ff à 15 min pile',
    'Roi incontesté du /all chat',
    'Spécialiste du tower dive à 1 PV',
    'Prend le buff de l\'ADC sans demander',
    'Une ward ? C\'est quoi une ward ?',
    '0 % de mana, 100 % de confiance',
    'Reporté pour mauvaise attitude (encore)',
    'Pentakill… en ARAM',
    '47 pings par minute, minimum',
    'Champion OP selon un TikTok',
    'Se fait gank. Toujours. Partout.',
    'A acheté 6 Doran, assume',
    'Le 1v5, mais seulement dans sa tête',
    'Ultime dans le vide, garanti',
    'Back à 2 PV, mort dans le bush',
    'Smurf autoproclamé (Silver II)',
    'Diff jungle, évidemment',
    'Joue en mute all depuis 2019',
    '{n}, Fléau du Bronze IV',
    '{n} l\'Incompris',
    '{n}, Seigneur des lanes perdues',
    '{n}, Champion du /dance',
    '« Nerf {n} svp » — tout le monde',
    '{n} : le pick préféré des hardstuck',
    '{n}, Gardien du bush de la rivière',
    '{n}, Maître du recall interrompu',
  ];

  /* =========================================================
     STATE
     ========================================================= */
  const S = {
    version: null,
    champions: [],          // {id, name, title}
    resolved: new Map(),    // id -> {src, humor}
    decor: new Map(),       // id -> {emoji, punch, tilt, hue}
    spinning: false,
    ready: false,
    muted: readPref('lol1v1.muted') === '1',
    humor: readPref('lol1v1.humor') === '1',
    lastDuel: null,
  };

  const $ = (s) => document.querySelector(s);
  const els = {
    app: $('#app'), stage: $('.stage'), go: $('#go'), goWrap: $('#go-wrap'), goLabel: $('#go-label'),
    status: $('#status'), progress: $('.progress'), progressBar: $('#progress-bar'),
    patch: $('#patch'), mute: $('#btn-mute'), humor: $('#btn-humor'), exportBtn: $('#btn-export'),
    faceoff: $('#faceoff'), fBlue: $('#fighter-blue'), fRed: $('#fighter-red'),
    reroll: $('#btn-reroll'), copy: $('#btn-copy'), close: $('#btn-close'), toast: $('#toast'),
  };

  function makeReel(side, selector, reversed) {
    const win = $(selector);
    return {
      side, win, reversed,
      rail: win.closest('.rail'),
      track: win.querySelector('.rail-track'),
      logical: [],       // champions dans l'ordre logique (index 0 = premier à passer)
      cards: [],         // éléments DOM dans l'ordre DOM
      restLogical: 0,    // index logique de la carte centrée
      current: null,     // champion centré
      x: 0,
    };
  }
  // Haut = Blue Side, défile de gauche à droite (ordre DOM inversé)
  // Bas  = Red Side,  défile de droite à gauche
  const reels = {
    blue: makeReel('blue', '#reel-blue', true),
    red: makeReel('red', '#reel-red', false),
  };

  /* =========================================================
     UTILS
     ========================================================= */
  function readPref(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function writePref(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } }
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = rand(i + 1); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const iconUrl = (id) => `${DD}/cdn/${S.version}/img/champion/${id}.png`;
  const loadingArtUrl = (id) => `${DD}/cdn/img/champion/loading/${id}_0.jpg`;
  const humorUrls = (id) => HUMOR_EXTS.map((e) => `${HUMOR_DIR}${id}.${e}`);

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  // cubic-bezier solver (même modèle que CSS)
  function bezier(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-6) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-6; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  // accélération courte et forte puis longue décélération (suspense)
  const spinEase = bezier(0.2, 0.0, 0.02, 1);
  const settleEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  /* =========================================================
     AUDIO (Web Audio API, procédural)
     ========================================================= */
  const Audio = (() => {
    let ctx = null, master = null, noiseBuf = null;

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
        master = ctx.createGain();
        master.gain.value = S.muted ? 0 : 0.85;
        master.connect(comp).connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function out(pan) {
      if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); return p;
      }
      return master;
    }
    function env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    function noise(t, dur, filterType, freq, q, peak, decay, dest) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); env(g, t, peak, 0.002, decay);
      src.connect(f).connect(g).connect(dest);
      src.start(t, Math.random() * 0.5, dur);
      return f;
    }
    function setMuted(m) {
      if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.02);
    }

    function tick(side, intensity) {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const dest = out(side === 'blue' ? -0.35 : 0.35);
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(side === 'blue' ? 2600 : 2000, t);
      o.frequency.exponentialRampToValueAtTime(side === 'blue' ? 1300 : 1000, t + 0.025);
      const g = ctx.createGain(); env(g, t, 0.05 + 0.04 * intensity, 0.001, 0.03);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.05);
      noise(t, 0.04, 'highpass', 3500, 0.7, 0.09 + 0.05 * intensity, 0.022, dest);
    }

    function whoosh() {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const f = noise(t, 0.9, 'bandpass', 300, 1.2, 0.35, 0.8, master);
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(4200, t + 0.7);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.6);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain(); env(g, t, 0.12, 0.05, 0.6);
      o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + 0.75);
    }

    function impact(side) {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      const dest = out(side === 'blue' ? -0.2 : 0.2);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.4);
      const g = ctx.createGain(); env(g, t, 0.9, 0.004, 0.55);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.65);
      noise(t, 0.3, 'lowpass', 1100, 0.8, 0.6, 0.2, dest);
      // clac métallique
      const m = ctx.createOscillator(); m.type = 'triangle'; m.frequency.value = side === 'blue' ? 1240 : 980;
      const mg = ctx.createGain(); env(mg, t, 0.12, 0.001, 0.12);
      m.connect(mg).connect(dest); m.start(t); m.stop(t + 0.15);
    }

    function gong() {
      if (S.muted || !ensure()) return;
      const t = ctx.currentTime;
      // explosion
      const f = noise(t, 1, 'lowpass', 5000, 0.6, 0.9, 1.1, master);
      f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      // sub
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(70, t); sub.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      const sg = ctx.createGain(); env(sg, t, 1.0, 0.01, 1.3);
      sub.connect(sg).connect(master); sub.start(t); sub.stop(t + 1.5);
      // gong : partiels inharmoniques
      const f0 = 96;
      [[1, 0.42, 4.2], [1.48, 0.28, 3.4], [1.97, 0.22, 3.0], [2.53, 0.16, 2.4], [3.1, 0.1, 1.8], [4.27, 0.07, 1.2], [5.6, 0.04, 0.8]]
        .forEach(([ratio, peak, decay], i) => {
          const o = ctx.createOscillator(); o.type = 'sine';
          const fr = f0 * ratio;
          o.frequency.setValueAtTime(fr * 1.012, t);
          o.frequency.exponentialRampToValueAtTime(fr, t + 0.4);
          const g = ctx.createGain(); env(g, t + 0.01 * i, peak, 0.008, decay);
          o.connect(g).connect(master); o.start(t); o.stop(t + decay + 0.2);
        });
    }

    return { ensure, tick, whoosh, impact, gong, setMuted };
  })();

  /* =========================================================
     IMAGES (humor-bank prioritaire, fallback Riot via onerror)
     ========================================================= */
  // Chaîne de sources pour une carte : humor-bank (.png/.jpg/.webp) puis icône Riot
  const sourcesFor = (id) => [...humorUrls(id), iconUrl(id)];

  // Préchargement : uniquement via onerror/onload d'un élément <img> (aucun fetch)
  function preloadChampion(champ) {
    return new Promise((resolve) => {
      const srcs = sourcesFor(champ.id);
      const nHumor = HUMOR_EXTS.length;
      let i = 0, settled = false, timer = 0;
      const img = new Image();
      img.decoding = 'async';
      const finish = (r) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        img.onload = img.onerror = null;
        S.resolved.set(champ.id, r);
        resolve(r);
      };
      const tryAt = (k) => {
        i = k;
        clearTimeout(timer);
        // une requête qui ne répond jamais ne doit pas bloquer le chargement
        timer = setTimeout(() => img.onerror && img.onerror(), PRELOAD_TIMEOUT);
        img.src = srcs[i];
      };
      img.onload = () => {
        clearTimeout(timer);
        const r = { src: srcs[i], humor: i < nHumor };
        if (!img.decode) { finish(r); return; }
        Promise.race([img.decode(), new Promise((ok) => setTimeout(ok, 800))]).then(() => finish(r), () => finish(r));
      };
      img.onerror = () => {
        if (settled) return;
        if (i + 1 < srcs.length) tryAt(i + 1);
        else finish({ src: null, humor: false });
      };
      tryAt(0);
    });
  }

  function preloadUrl(url, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      const t = setTimeout(() => resolve(false), timeoutMs);
      img.onload = () => { clearTimeout(t); resolve(true); };
      img.onerror = () => { clearTimeout(t); resolve(false); };
      img.src = url;
    });
  }

  // Crée un <img> qui bascule sur la source suivante via onerror.
  // `host` reçoit la classe .meme quand c'est l'icône Riot qui est affichée.
  function champImg(champ, host, srcs, nHumor) {
    const img = document.createElement('img');
    img.alt = champ.name;
    img.draggable = false;
    img.decoding = 'async';
    let i = 0;
    const known = S.resolved.get(champ.id);
    if (known && srcs === null) {
      // déjà résolu au préchargement : on démarre directement sur la bonne source
      srcs = sourcesFor(champ.id);
      nHumor = HUMOR_EXTS.length;
      i = known.src ? Math.max(0, srcs.indexOf(known.src)) : srcs.length - 1;
    } else if (srcs === null) {
      srcs = sourcesFor(champ.id);
      nHumor = HUMOR_EXTS.length;
    }
    const apply = () => {
      host.classList.toggle('meme', i >= nHumor);
      img.src = srcs[i];
    };
    img.onerror = () => {
      if (i < srcs.length - 1) { i += 1; apply(); }
      else {
        img.onerror = null; img.style.visibility = 'hidden'; host.classList.add('meme');
        const box = img.parentElement;
        if (box) { box.classList.add('noimg'); box.dataset.initials = champ.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase(); }
      }
    };
    apply();
    host.style.setProperty('--ph', `${[...champ.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)}`);
    return img;
  }

  /* =========================================================
     DÉCOR HUMOUR
     ========================================================= */
  function decorFor(champ) {
    let d = S.decor.get(champ.id);
    if (!d) {
      d = {
        emoji: pick(EMOJIS),
        punch: pick(PUNCHLINES).replace('{n}', champ.name),
        tilt: (Math.random() * 6 - 3).toFixed(2) + 'deg',
        hue: Math.round(Math.random() * 50 - 25) + 'deg',
      };
      S.decor.set(champ.id, d);
    }
    return d;
  }

  /* =========================================================
     REELS
     ========================================================= */
  function cardEl(champ) {
    const d = decorFor(champ);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--tilt', d.tilt);
    card.style.setProperty('--hue', d.hue);
    const art = document.createElement('div');
    art.className = 'card-art';
    art.appendChild(champImg(champ, card, null));
    card.appendChild(art);
    card.insertAdjacentHTML('beforeend',
      `<span class="card-badge" aria-hidden="true">${d.emoji}</span>` +
      `<div class="card-body"><div class="card-name">${escapeHTML(champ.name)}</div>` +
      `<div class="card-punch"><span class="p-title">${escapeHTML(champ.title)}</span>` +
      `<span class="p-joke">${escapeHTML(d.punch)}</span></div></div>`);
    return card;
  }

  const domIndex = (reel, logicalIdx) => (reel.reversed ? reel.logical.length - 1 - logicalIdx : logicalIdx);

  function build(reel, logical) {
    reel.logical = logical;
    const order = reel.reversed ? logical.slice().reverse() : logical;
    const frag = document.createDocumentFragment();
    reel.cards = order.map((c) => { const el = cardEl(c); frag.appendChild(el); return el; });
    reel.track.replaceChildren(frag);
  }

  function setX(reel, x) {
    reel.x = x;
    reel.track.style.transform = `translate3d(${x}px,0,0)`;
  }

  // translateX = largeurConteneur / 2 - positionCentreCarte (calculé au moment T)
  function xFor(reel, logicalIdx) {
    const card = reel.cards[domIndex(reel, logicalIdx)];
    return reel.win.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
  }

  function place(reel, logicalIdx) {
    reel.restLogical = logicalIdx;
    reel.current = reel.logical[logicalIdx];
    setX(reel, xFor(reel, logicalIdx));
  }

  // Ruban = 100 % du roster mélangé. Gagnant à l'index totalChampions - 15.
  // Les 25 cartes visibles au repos sont recopiées en tête pour un départ sans saut.
  function buildSpinStrip(reel, winner) {
    const all = S.champions;
    const N = all.length;
    const head = reel.logical.length
      ? reel.logical.slice(Math.max(0, reel.restLogical - START_AT), reel.restLogical + AFTER_WIN)
      : [];
    const headSet = new Set(head);
    const rest = shuffle(all.filter((c) => !headSet.has(c) && c !== winner));
    const strip = head.concat(rest);
    const landIdx = Math.max(head.length, N - AFTER_WIN);
    strip.splice(landIdx, 0, winner);
    const startIdx = head.length ? Math.min(START_AT, reel.restLogical) : START_AT;
    return { strip, landIdx, startIdx };
  }

  function animateReel(reel, toX, duration) {
    return new Promise((resolve) => {
      const fromX = reel.x;
      const dist = toX - fromX;
      const dir = Math.sign(dist) || 1;
      const step = Math.abs(reel.cards[1].offsetLeft - reel.cards[0].offsetLeft);
      const overshoot = dir * step * 0.16;
      const center = reel.win.clientWidth / 2;
      const total = Math.abs(dist);
      let t0 = null, lastCell = null, lastTick = 0, prevX = fromX, prevT = 0;

      function frame(now) {
        if (t0 === null) { t0 = now; prevT = now; }
        const el = now - t0;
        let x;
        if (el < duration) {
          x = fromX + (dist + overshoot) * spinEase(el / duration);
        } else if (el < duration + SETTLE_MS) {
          x = toX + overshoot * (1 - settleEase((el - duration) / SETTLE_MS));
        } else {
          setX(reel, toX);
          resolve();
          return;
        }
        setX(reel, x);

        if (el < duration) {
          const cell = Math.floor((center - x) / step);
          if (lastCell !== null && cell !== lastCell && now - lastTick >= TICK_MIN_GAP) {
            const v = Math.abs(x - prevX) / Math.max(1, now - prevT); // px/ms
            Audio.tick(reel.side, Math.min(1, v / 4));
            lastTick = now;
          }
          lastCell = cell;
        }
        prevX = x; prevT = now;
        requestAnimationFrame(frame);
      }
      if (total < 1) { resolve(); return; }
      requestAnimationFrame(frame);
    });
  }

  async function spinReel(reel, winner, duration) {
    const { strip, landIdx, startIdx } = buildSpinStrip(reel, winner);
    build(reel, strip);
    place(reel, startIdx);
    // force le layout avant l'animation
    void reel.track.offsetWidth;
    reel.rail.classList.add('spinning');
    const target = xFor(reel, landIdx); // calculé au moment du clic, selon la largeur réelle
    await animateReel(reel, target, duration);
    setX(reel, xFor(reel, landIdx)); // recalage si la fenêtre a changé de taille pendant la rotation
    reel.restLogical = landIdx;
    reel.current = winner;
    reel.rail.classList.remove('spinning');
    reel.cards[domIndex(reel, landIdx)].classList.add('is-winner');
    Audio.impact(reel.side);
  }

  function idleReels() {
    Object.values(reels).forEach((reel) => {
      build(reel, shuffle(S.champions));
      place(reel, START_AT);
    });
  }

  /* =========================================================
     GO / DUEL
     ========================================================= */
  function setGo(state) {
    els.go.classList.toggle('running', state === 'running');
    els.goWrap.classList.toggle('locked', state !== 'ready');
    els.go.disabled = state !== 'ready';
    els.goLabel.textContent = state === 'running' ? 'EN COURS…' : state === 'ready' ? 'GO' : 'CHARGEMENT…';
  }

  async function launch() {
    if (S.spinning || !S.ready) return;
    S.spinning = true;
    hideFaceoff();
    setGo('running');
    Audio.ensure();
    Audio.whoosh();

    const blue = pick(S.champions);
    let red = pick(S.champions);
    while (red === blue) red = pick(S.champions);

    // préchargement des visuels du face-à-face pendant la rotation
    const artReady = Promise.all([blue, red].map((c) => {
      const r = S.resolved.get(c.id);
      return r && r.humor ? Promise.resolve(true) : preloadUrl(loadingArtUrl(c.id), 4000);
    }));

    els.status.textContent = 'Tirage en cours…';
    await Promise.all([
      spinReel(reels.blue, blue, DURATION.blue),
      spinReel(reels.red, red, DURATION.red),
    ]);
    await Promise.race([artReady, new Promise((r) => setTimeout(r, 600))]);

    S.lastDuel = { blue, red };
    els.status.textContent = `${blue.name} vs ${red.name}`;
    showFaceoff(blue, red);
    S.spinning = false;
    setGo('ready');
  }

  function fighterInto(host, champ, side) {
    const d = decorFor(champ);
    const r = S.resolved.get(champ.id);
    host.className = `fighter fighter--${side}`;
    host.replaceChildren();
    const frame = document.createElement('div');
    frame.className = 'fighter-frame';
    frame.insertAdjacentHTML('beforeend', `<span class="fighter-side">${side === 'blue' ? 'BLUE SIDE' : 'RED SIDE'}</span>`);
    const srcs = r && r.humor
      ? [r.src, loadingArtUrl(champ.id), iconUrl(champ.id)]
      : [loadingArtUrl(champ.id), iconUrl(champ.id)];
    frame.appendChild(champImg(champ, host, srcs, r && r.humor ? 1 : 0));
    host.appendChild(frame);
    host.insertAdjacentHTML('beforeend',
      `<span class="fighter-badge" aria-hidden="true">${d.emoji}</span>` +
      `<div class="fighter-name">${escapeHTML(champ.name)}</div>` +
      `<div class="fighter-title">${escapeHTML(champ.title)}</div>` +
      `<div class="fighter-punch">${escapeHTML(d.punch)}</div>`);
  }

  function showFaceoff(blue, red) {
    fighterInto(els.fBlue, blue, 'blue');
    fighterInto(els.fRed, red, 'red');
    els.stage.classList.remove('shake');
    void els.stage.offsetWidth;
    els.stage.classList.add('shake');
    Audio.gong();
    // relance les animations CSS
    els.faceoff.hidden = false;
    els.faceoff.querySelectorAll('.faceoff-backdrop, .faceoff-flash, .fighter, .vs, .faceoff-actions').forEach((n) => {
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
    });
    setTimeout(() => els.reroll.focus({ preventScroll: true }), 50);
  }

  function hideFaceoff() {
    els.faceoff.hidden = true;
  }

  function duelText() {
    const { blue, red } = S.lastDuel;
    const db = decorFor(blue), dr = decorFor(red);
    return [
      '⚔️ **DUEL 1V1 — LEAGUE OF LEGENDS** ⚔️',
      '',
      `🔵 **BLUE SIDE** : **${blue.name}**${blue.title ? ` — *${blue.title}*` : ''}`,
      '                 🆚',
      `🔴 **RED SIDE** : **${red.name}**${red.title ? ` — *${red.title}*` : ''}`,
      '',
      `> ${db.emoji} ${blue.name} : « ${db.punch} »`,
      `> ${dr.emoji} ${red.name} : « ${dr.punch} »`,
      '',
      `🎲 Tiré au sort · Data Dragon ${S.version}`,
      'Qui gagne ? Réagissez 🔵 ou 🔴',
    ].join('\n');
  }

  async function copyDuel() {
    if (!S.lastDuel) return;
    const text = duelText();
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (_) { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
    }
    showToast(ok ? 'Duel copié — prêt à coller sur Discord ✅' : 'Copie impossible dans ce navigateur ❌');
  }

  function exportNames() {
    const lines = [
      `# Noms de fichiers exacts pour ./humor-bank/ — Data Dragon ${S.version}`,
      `# ${S.champions.length} champions. Extensions acceptées : .png, .jpg, .webp`,
      '# Format : ID.png    (nom affiché)',
      '',
      ...S.champions.map((c) => `${c.id}.png    (${c.name})`),
      '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'noms-fichiers.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* =========================================================
     TOGGLES
     ========================================================= */
  function renderToggles() {
    document.body.classList.toggle('humor', S.humor);
    els.humor.setAttribute('aria-pressed', String(S.humor));
    els.humor.textContent = `Mode Humour / BD : ${S.humor ? 'ON' : 'OFF'}`;
    els.mute.setAttribute('aria-pressed', String(S.muted));
    els.mute.textContent = S.muted ? '🔇 Son : OFF' : '🔊 Son : ON';
  }

  /* =========================================================
     BOOT
     ========================================================= */
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
    return res.json();
  }

  async function boot() {
    setGo('loading');
    els.status.classList.remove('error');
    els.status.textContent = 'Connexion à Data Dragon…';
    els.progress.classList.remove('done');
    els.progressBar.style.width = '4%';
    try {
      const versions = await fetchJSON(`${DD}/api/versions.json`);
      S.version = versions[0];
      els.patch.textContent = `Data Dragon ${S.version}`;
      const data = await fetchJSON(`${DD}/cdn/${S.version}/data/fr_FR/champion.json`);
      S.champions = Object.values(data.data)
        .map((c) => ({ id: c.id, name: c.name, title: c.title }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      if (S.champions.length < 2) throw new Error('Roster vide');
    } catch (err) {
      console.error(err);
      S.offline = true;
      S.version = S.version || 'hors ligne';
      els.patch.textContent = 'Roster intégré (hors ligne)';
      S.champions = OFFLINE_IDS.map((id) => ({ id, name: id, title: '' }));
    }

    // Préchargement de toutes les images du roster avant la première animation
    let done = 0;
    const total = S.champions.length;
    els.status.textContent = `Préchargement des visuels 0/${total}…`;
    await Promise.all(S.champions.map((c) => preloadChampion(c).then(() => {
      done += 1;
      els.progressBar.style.width = `${4 + (96 * done) / total}%`;
      if (done % 8 === 0 || done === total) els.status.textContent = `Préchargement des visuels ${done}/${total}…`;
    })));

    const nHumor = [...S.resolved.values()].filter((r) => r.humor).length;
    idleReels();
    S.ready = true;
    setGo('ready');
    els.exportBtn.disabled = false;
    els.progress.classList.add('done');
    els.status.textContent = S.offline
      ? `Data Dragon inaccessible : roster intégré de ${total} champions (non vérifié)`
      : `${total} champions chargés · ${nHumor} image${nHumor > 1 ? 's' : ''} humor-bank`;
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  els.go.addEventListener('click', launch);
  els.reroll.addEventListener('click', launch);
  els.copy.addEventListener('click', copyDuel);
  els.close.addEventListener('click', hideFaceoff);
  els.exportBtn.addEventListener('click', exportNames);
  els.mute.addEventListener('click', () => {
    S.muted = !S.muted;
    writePref('lol1v1.muted', S.muted ? '1' : '0');
    Audio.setMuted(S.muted);
    renderToggles();
  });
  els.humor.addEventListener('click', () => {
    S.humor = !S.humor;
    writePref('lol1v1.humor', S.humor ? '1' : '0');
    renderToggles();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.faceoff.hidden) hideFaceoff();
  });
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      if (S.spinning || !S.ready) return;
      Object.values(reels).forEach((r) => setX(r, xFor(r, r.restLogical)));
    });
  });

  renderToggles();
  boot();
})();
