import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Vinyle 3D à moitié sorti de sa pochette, dans la DA olive/crème de « untitled unmastered. ».

const OLIVE = '#333300';
const OLIVE_DEEP = '#22220a';
const CREAM = '#d6d5c5';
const SERIF = '"Cormorant Garamond", Georgia, serif';
const RPM_33 = (33.333 / 60) * Math.PI * 2;

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

/** Pochette par défaut : olive, « album parfait. » en haut à gauche, étiquette en bas à droite. */
function drawSleeve(ctx: CanvasRenderingContext2D, s: number) {
  const g = ctx.createRadialGradient(s * 0.2, s * 0.15, 0, s * 0.5, s * 0.5, s * 0.8);
  g.addColorStop(0, '#454700');
  g.addColorStop(1, OLIVE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
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
  for (let r = c * 0.98; r > labelR + c * 0.03; r -= 1.6) {
    const gap = [0.9, 0.78, 0.66, 0.55].some((g) => Math.abs(r / c - g) < 0.006);
    const shade = gap ? 34 : 14 + Math.round(Math.random() * 9);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade - 4})`;
    ctx.lineWidth = 1;
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral garde les couleurs des pochettes fidèles (ACES les délave).
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, opts.mode === 'hero' ? 7.2 : 5.6);

  scene.add(new THREE.HemisphereLight(0xf2efd8, 0x1c1c00, 0.75));
  const key = new THREE.DirectionalLight(0xfff0d0, 1.7);
  key.position.set(-2, 6, 2);
  scene.add(key);
  const rim = new THREE.PointLight(0xd6d5c5, 10, 12);
  rim.position.set(3, -1, 3);
  scene.add(rim);

  const rig = new THREE.Group();
  scene.add(rig);

  // Pochette
  const sleeveTex = canvasTexture(1024, drawSleeve);
  const paper = (map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color: map ? 0xffffff : OLIVE_DEEP, map, roughness: 0.82, metalness: 0 });
  const sleeveFront = paper(sleeveTex);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.035), [
    paper(), paper(), paper(), paper(), sleeveFront, paper(),
  ]);
  rig.add(sleeve);

  // Disque
  const discGroup = new THREE.Group();
  const spinner = new THREE.Group();
  let discTex = canvasTexture(1024, (ctx, s) => drawDisc(ctx, s, null));
  const discFace = new THREE.MeshPhysicalMaterial({
    map: discTex,
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.38,
  });
  const discEdge = new THREE.MeshStandardMaterial({ color: 0x0b0b08, roughness: 0.4 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.012, 128), [discEdge, discFace, discFace]);
  disc.rotation.x = Math.PI / 2;
  spinner.add(disc);
  discGroup.add(spinner);
  discGroup.position.z = -0.002;
  rig.add(discGroup);

  rig.rotation.set(-0.18, opts.mode === 'hero' ? -0.42 : -0.32, 0.04);
  rig.position.x = opts.mode === 'hero' ? -0.5 : -0.55;

  // État animé
  let out = 0;
  let outTarget = opts.mode === 'hero' ? 0.72 : 0.3;
  let speed = 0;
  let speedTarget = opts.mode === 'hero' ? 0.35 : 0;
  const pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!opts.reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(canvas);

  const clock = new THREE.Clock();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    out += (outTarget - out) * Math.min(1, dt * 2.2);
    speed += (speedTarget - speed) * Math.min(1, dt * 1.6);
    discGroup.position.x = out * 1.15;
    spinner.rotation.z -= speed * dt;
    tilt.x += (pointer.y * 0.16 - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (pointer.x * 0.28 - tilt.y) * Math.min(1, dt * 3);
    const baseY = opts.mode === 'hero' ? -0.42 : -0.32;
    rig.rotation.x = -0.18 + tilt.x + Math.sin(t * 0.6) * 0.02;
    rig.rotation.y = baseY + tilt.y;
    rig.position.y = Math.sin(t * 0.8) * 0.04;
    rim.position.x = 3 * Math.cos(t * 0.3);
    renderer.render(scene, camera);
  };

  if (opts.reducedMotion) {
    out = outTarget;
    discGroup.position.x = out * 1.15;
    renderer.render(scene, camera);
  } else {
    frame();
  }

  const rerenderIfStatic = () => {
    if (opts.reducedMotion) renderer.render(scene, camera);
  };

  return {
    async setCover(url) {
      if (!url) return;
      try {
        const img = await loadImage(url);
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        sleeveFront.map?.dispose();
        sleeveFront.map = tex;
        sleeveFront.needsUpdate = true;
        const next = canvasTexture(1024, (ctx, s) => drawDisc(ctx, s, img));
        discTex.dispose();
        discTex = next;
        discFace.map = next;
        discFace.needsUpdate = true;
        rerenderIfStatic();
      } catch {
        /* cover indisponible : la pochette par défaut reste */
      }
    },
    setSpinning(on) {
      if (opts.mode === 'hero') return;
      outTarget = on ? 0.7 : 0.3;
      speedTarget = on ? RPM_33 : 0;
      if (opts.reducedMotion) {
        out = outTarget;
        discGroup.position.x = out * 1.15;
        rerenderIfStatic();
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        }
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
