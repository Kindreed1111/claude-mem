import * as THREE from 'three';

// Vinyle 3D à moitié sorti de sa pochette, dans la DA olive/crème de « untitled unmastered. ».

const OLIVE = '#333300';
const OLIVE_DEEP = '#22220a';
const CREAM = '#d6d5c5';
const SERIF = '"Cormorant Garamond", Georgia, serif';
const RPM_33 = (33.333 / 60) * Math.PI * 2;
// Téléphone : textures 2× plus petites et 30 images/s (l'œil ne voit pas la différence à cette taille).
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const TEX = COARSE ? 512 : 1024;
const FRAME_MS = COARSE ? 1000 / 30 : 0;

export interface VinylSceneOptions {
  mode: 'hero' | 'player';
  reducedMotion: boolean;
}

export interface VinylScene {
  setCover(url: string | null): void;
  setSpinning(on: boolean): void;
  dispose(): void;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function noiseTile(): HTMLCanvasElement {
  const t = document.createElement('canvas');
  t.width = t.height = 128;
  const c = t.getContext('2d')!;
  const img = c.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const light = Math.random() < 0.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0;
    img.data[i + 3] = Math.round(Math.random() * 10);
  }
  c.putImageData(img, 0, 0);
  return t;
}

/** Pochette par défaut : olive, « album parfait. » en haut à gauche, étiquette en bas à droite. */
function drawSleeve(ctx: CanvasRenderingContext2D, s: number) {
  const g = ctx.createRadialGradient(s * 0.2, s * 0.15, 0, s * 0.5, s * 0.5, s * 0.8);
  g.addColorStop(0, '#454700');
  g.addColorStop(1, OLIVE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Grain : une tuile de 128 px répétée (16 k pixels calculés au lieu d'un million).
  ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat')!;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = CREAM;
  ctx.font = `400 ${s * 0.045}px ${SERIF}`;
  ctx.fillText('album parfait.', s * 0.06, s * 0.1);
  const w = s * 0.13;
  const h = w * 0.62;
  const x = s * 0.82;
  const y = s * 0.84;
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(x + w * 0.04, y + h * 0.32, w * 0.92, h * 0.36);
  ctx.textAlign = 'center';
  ctx.font = `900 ${w * 0.1}px Arial, sans-serif`;
  ctx.fillText('PARENTAL', x + w / 2, y + h * 0.24);
  ctx.fillText('EXPLICIT', x + w / 2, y + h * 0.9);
  ctx.fillStyle = '#0b0b0b';
  ctx.font = `900 ${w * 0.17}px Arial, sans-serif`;
  ctx.fillText('ADVISORY', x + w / 2, y + h * 0.6);
}

/** Face du disque : sillons, plages, étiquette centrale (texte ou cover). */
function drawDisc(ctx: CanvasRenderingContext2D, s: number, label: HTMLImageElement | null) {
  const c = s / 2;
  ctx.fillStyle = '#0d0d08';
  ctx.fillRect(0, 0, s, s);
  const labelR = c * 0.34;
  const step = (1.6 * s) / 1024;
  ctx.lineWidth = Math.max(0.5, s / 1024);
  for (let r = c * 0.98; r > labelR + c * 0.03; r -= step) {
    const gap = [0.9, 0.78, 0.66, 0.55].some((g) => Math.abs(r / c - g) < 0.006);
    const shade = gap ? 34 : 14 + Math.round(Math.random() * 9);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade - 4})`;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, labelR, 0, Math.PI * 2);
  ctx.clip();
  if (label) {
    ctx.drawImage(label, c - labelR, c - labelR, labelR * 2, labelR * 2);
  } else {
    ctx.fillStyle = CREAM;
    ctx.fillRect(c - labelR, c - labelR, labelR * 2, labelR * 2);
    ctx.fillStyle = OLIVE;
    ctx.textAlign = 'center';
    ctx.font = `italic 400 ${labelR * 0.22}px ${SERIF}`;
    ctx.fillText('album parfait.', c, c - labelR * 0.38);
    ctx.font = `400 ${labelR * 0.11}px "IBM Plex Mono", monospace`;
    ctx.fillText('FACE A · 33⅓', c, c + labelR * 0.52);
  }
  ctx.restore();
  ctx.fillStyle = '#0d0d08';
  ctx.beginPath();
  ctx.arc(c, c, c * 0.025, 0, Math.PI * 2);
  ctx.fill();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = `/api/image?url=${encodeURIComponent(url)}`;
  });
}

export function createVinylScene(canvas: HTMLCanvasElement, opts: VinylSceneOptions): VinylScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  // Moins de pixels sur téléphone : rendu plus léger pour la batterie.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, COARSE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral garde les couleurs des pochettes fidèles (ACES les délave).
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  // Pas de carte d'environnement (calcul PMREM coûteux au démarrage) : trois lumières suffisent.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, opts.mode === 'hero' ? 7.2 : 5.6);

  scene.add(new THREE.HemisphereLight(0xf2efd8, 0x1c1c00, 2.8));
  const key = new THREE.DirectionalLight(0xfff0d0, 2.4);
  key.position.set(-2, 6, 2);
  scene.add(key);
  const rim = new THREE.PointLight(0xd6d5c5, 10, 12);
  rim.position.set(3, -1, 3);
  scene.add(rim);

  const rig = new THREE.Group();
  scene.add(rig);

  // Pochette : papier mat (Lambert, le matériau éclairé le plus léger).
  const sleeveTex = canvasTexture(TEX, drawSleeve);
  const paper = (map?: THREE.Texture) => new THREE.MeshLambertMaterial({ color: map ? 0xffffff : OLIVE_DEEP, map });
  const sleeveFront = paper(sleeveTex);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.035), [
    paper(), paper(), paper(), paper(), sleeveFront, paper(),
  ]);
  rig.add(sleeve);

  // Disque : vinyle satiné (Phong : reflet des lumières sans le coût du vernis physique).
  const discGroup = new THREE.Group();
  const spinner = new THREE.Group();
  let discTex = canvasTexture(TEX, (ctx, s) => drawDisc(ctx, s, null));
  const discFace = new THREE.MeshPhongMaterial({ map: discTex, specular: 0x6e6e6e, shininess: 12, emissive: 0x1e1e1e });
  const discEdge = new THREE.MeshPhongMaterial({ color: 0x0b0b08, specular: 0x222218, shininess: 60 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.012, 96), [discEdge, discFace, discFace]);
  disc.rotation.x = Math.PI / 2;
  spinner.add(disc);
  discGroup.add(spinner);
  discGroup.position.z = -0.002;
  rig.add(discGroup);

  const baseY = opts.mode === 'hero' ? -0.42 : -0.32;
  rig.rotation.set(-0.18, baseY, 0.04);
  rig.position.x = opts.mode === 'hero' ? -0.5 : -0.55;

  // État animé
  let out = 0;
  let outTarget = opts.mode === 'hero' ? 0.72 : 0.3;
  let speed = 0;
  let speedTarget = opts.mode === 'hero' ? 0.35 : 0;
  // Flottement : permanent sur l'accueil ; sur le lecteur, seulement pendant l'écoute.
  let bob = opts.mode === 'hero' ? 1 : 0;
  let bobTarget = bob;
  let dirty = true;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  // Au doigt, pas d'inclinaison qui suit le pointeur : chaque glissement relancerait le rendu.
  if (!opts.reducedMotion && !COARSE) window.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(canvas);

  const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;
  /** Rien ne bouge : inutile de redessiner (le lecteur en pause ne coûte plus rien). */
  const settled = () =>
    near(out, outTarget) && speed < 1e-4 && speedTarget === 0 && bob < 1e-4 && bobTarget === 0 &&
    near(tilt.x, pointer.y * 0.16) && near(tilt.y, pointer.x * 0.28);

  const clock = new THREE.Clock();
  // Horloge propre au flottement : avance seulement quand il est actif, pour repartir sans saut.
  let phase = 0;
  let raf = 0;
  let last = 0;
  let disposed = false;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) {
      clock.getDelta();
      return;
    }
    if (FRAME_MS && now - last < FRAME_MS - 1) return;
    last = now;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!dirty && settled()) return;
    dirty = false;
    out += (outTarget - out) * Math.min(1, dt * 2.2);
    speed += (speedTarget - speed) * Math.min(1, dt * 1.6);
    bob += (bobTarget - bob) * Math.min(1, dt * 1.2);
    phase += dt * bob;
    discGroup.position.x = out * 1.15;
    spinner.rotation.z -= speed * dt;
    tilt.x += (pointer.y * 0.16 - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (pointer.x * 0.28 - tilt.y) * Math.min(1, dt * 3);
    rig.rotation.x = -0.18 + tilt.x + Math.sin(phase * 0.6) * 0.02 * bob;
    rig.rotation.y = baseY + tilt.y;
    rig.position.y = Math.sin(phase * 0.8) * 0.04 * bob;
    rim.position.x = 3 * Math.cos(phase * 0.3);
    renderer.render(scene, camera);
  };

  const renderStatic = () => {
    out = outTarget;
    discGroup.position.x = out * 1.15;
    renderer.render(scene, camera);
  };

  // Compilation des shaders hors du fil principal quand le navigateur le permet, puis premier rendu.
  renderer
    .compileAsync(scene, camera)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      if (opts.reducedMotion) renderStatic();
      else raf = requestAnimationFrame(frame);
    });

  const changed = () => {
    dirty = true;
    if (opts.reducedMotion) renderStatic();
  };

  return {
    async setCover(url) {
      if (!url) return;
      try {
        const img = await loadImage(url);
        if (disposed) return;
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        sleeveFront.map?.dispose();
        sleeveFront.map = tex;
        sleeveFront.needsUpdate = true;
        const next = canvasTexture(TEX, (ctx, s) => drawDisc(ctx, s, img));
        discTex.dispose();
        discTex = next;
        discFace.map = next;
        discFace.needsUpdate = true;
        changed();
      } catch {
        /* cover indisponible : la pochette par défaut reste */
      }
    },
    setSpinning(on) {
      if (opts.mode === 'hero') return;
      outTarget = on ? 0.7 : 0.3;
      speedTarget = on ? RPM_33 : 0;
      bobTarget = on ? 1 : 0;
      changed();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          (mat as THREE.MeshLambertMaterial).map?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
