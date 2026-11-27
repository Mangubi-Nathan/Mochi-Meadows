import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlayerLook } from '../game/engine';
import {
  createMochiRig,
  updateMochiRig,
  createCompanionRig,
  updateCompanionRig,
  disposeCompanionRig,
} from '../game/mochiModel3D';
import { createOutdoorEnvScene } from '../game/worldShaders3D';

export type StudioEmote = 'idle' | 'walk' | 'wave' | 'twirl' | 'dance';
export type StudioLightingMood = 'day' | 'dawn' | 'starlight';
export type StudioCameraPreset = 'front' | 'three_quarter' | 'side' | 'back' | 'face' | 'companion';

interface MochiStudioPreview3DProps {
  look: PlayerLook;
  emote: StudioEmote;
  lightingMood: StudioLightingMood;
  cameraPreset: StudioCameraPreset;
  presetTrigger: number;
  className?: string;
}

function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    let rendererStr = String(gl.getParameter(gl.RENDERER) || '');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const unmasked = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      if (unmasked) rendererStr += ' ' + String(unmasked);
    }
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Mesa Offscreen/i.test(rendererStr);
  } catch {
    return false;
  }
}

const PRESET_ANGLES: Record<
  StudioCameraPreset,
  { yaw: number; pitch: number; dist: number; lookX: number; lookY: number; lookZ: number }
> = {
  front: { yaw: 0, pitch: 0.14, dist: 2.55, lookX: 0, lookY: 0.72, lookZ: 0 },
  three_quarter: { yaw: 0.56, pitch: 0.2, dist: 2.5, lookX: 0, lookY: 0.72, lookZ: 0 },
  side: { yaw: Math.PI * 0.5, pitch: 0.15, dist: 2.55, lookX: 0, lookY: 0.72, lookZ: 0 },
  back: { yaw: Math.PI, pitch: 0.18, dist: 2.55, lookX: 0, lookY: 0.72, lookZ: 0 },
  face: { yaw: 0.12, pitch: 0.1, dist: 1.68, lookX: 0, lookY: 0.96, lookZ: 0 },
  companion: { yaw: -0.32, pitch: 0.22, dist: 1.52, lookX: -0.62, lookY: 0.44, lookZ: 0.14 },
};

const MOOD_THEMES: Record<
  StudioLightingMood,
  {
    bgTop: string;
    bgBottom: string;
    hemiSky: number;
    hemiGround: number;
    hemiInt: number;
    keyCol: number;
    keyInt: number;
    rimCol: number;
    rimInt: number;
    moteCol: number;
  }
> = {
  day: {
    bgTop: '#8cd3ff',
    bgBottom: '#eef9ff',
    hemiSky: 0xdcf4ff,
    hemiGround: 0x9cd88c,
    hemiInt: 1.18,
    keyCol: 0xfff8e6,
    keyInt: 1.9,
    rimCol: 0xffe4f0,
    rimInt: 0.75,
    moteCol: 0xfff3b0,
  },
  dawn: {
    bgTop: '#f39c9a',
    bgBottom: '#ffe7cb',
    hemiSky: 0xffd5bd,
    hemiGround: 0xb78b72,
    hemiInt: 1.1,
    keyCol: 0xffcb8c,
    keyInt: 2.1,
    rimCol: 0xff8ab8,
    rimInt: 0.95,
    moteCol: 0xffd166,
  },
  starlight: {
    bgTop: '#1a153a',
    bgBottom: '#432e6e',
    hemiSky: 0x9b86e8,
    hemiGround: 0x3b2d56,
    hemiInt: 0.98,
    keyCol: 0xd9e8ff,
    keyInt: 1.55,
    rimCol: 0xff85c8,
    rimInt: 1.15,
    moteCol: 0xa2f5ff,
  },
};

function createStudioBgTexture(top: string, bottom: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const MochiStudioPreview3D: React.FC<MochiStudioPreview3DProps> = ({
  look,
  emote,
  lightingMood,
  cameraPreset,
  presetTrigger,
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lookRef = useRef(look);
  const emoteRef = useRef(emote);
  const moodRef = useRef(lightingMood);
  const camTargetRef = useRef({ ...PRESET_ANGLES[cameraPreset] });
  const isDraggingRef = useRef(false);

  lookRef.current = look;
  emoteRef.current = emote;
  moodRef.current = lightingMood;

  useEffect(() => {
    camTargetRef.current = { ...PRESET_ANGLES[cameraPreset] };
  }, [cameraPreset, presetTrigger]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let rafId = 0;

    // Detect software WebGL once via temp context before constructing renderer
    const probeCanvas = document.createElement('canvas');
    const probeGl =
      probeCanvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
      probeCanvas.getContext('webgl');
    const isSoftware = probeGl ? detectSoftwareGl(probeGl) : false;

    const isCompactViewport = typeof window !== 'undefined' && (window.innerWidth < 640 || window.innerHeight <= 520);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftware && !isCompactViewport,
      alpha: false,
      powerPreference: isCompactViewport ? 'default' : 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    if (!isSoftware) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = isCompactViewport ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    }
    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.15 : 1.75));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgTextures: Record<StudioLightingMood, THREE.CanvasTexture> = {
      day: createStudioBgTexture(MOOD_THEMES.day.bgTop, MOOD_THEMES.day.bgBottom),
      dawn: createStudioBgTexture(MOOD_THEMES.dawn.bgTop, MOOD_THEMES.dawn.bgBottom),
      starlight: createStudioBgTexture(MOOD_THEMES.starlight.bgTop, MOOD_THEMES.starlight.bgBottom),
    };
    scene.background = bgTextures[moodRef.current];

    let pmrem: THREE.PMREMGenerator | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = createOutdoorEnvScene();
      envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
      envScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
    } catch {
      // Safe fallback if PMREM isn't available
    }

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);

    // 3-Point Studio Lighting
    const hemi = new THREE.HemisphereLight(0xdcf4ff, 0x9cd88c, 1.18);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff8e6, 1.9);
    keyLight.position.set(2.4, 4.2, 3.2);
    if (!isSoftware) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -2;
      keyLight.shadow.camera.right = 2;
      keyLight.shadow.camera.top = 2.4;
      keyLight.shadow.camera.bottom = -1.2;
      keyLight.shadow.bias = -0.0008;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffe4f0, 0.75);
    rimLight.position.set(-2.8, 2.2, -2.6);
    scene.add(rimLight);

    // Stylized Studio Pedestal (owned geometries/materials disposed on unmount)
    const studioGroup = new THREE.Group();
    scene.add(studioGroup);

    const stoneGeo = new THREE.CylinderGeometry(1.18, 1.28, 0.16, 40);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf7efe4, roughness: 0.78 });
    const stoneBase = new THREE.Mesh(stoneGeo, stoneMat);
    stoneBase.position.y = -0.08;
    stoneBase.receiveShadow = true;
    studioGroup.add(stoneBase);

    const turfGeo = new THREE.CylinderGeometry(1.12, 1.15, 0.08, 40);
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x86d97e, roughness: 0.82 });
    const turfTop = new THREE.Mesh(turfGeo, turfMat);
    turfTop.position.y = 0.02;
    turfTop.receiveShadow = true;
    studioGroup.add(turfTop);

    const rimGeo = new THREE.TorusGeometry(1.14, 0.022, 10, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.35, metalness: 0.25 });
    const rimRing = new THREE.Mesh(rimGeo, rimMat);
    rimRing.position.y = 0.055;
    studioGroup.add(rimRing);

    // Decorative tufts & flowers around edge
    const flowerGeo = new THREE.SphereGeometry(0.055, 8, 6);
    const flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xff9ebb, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xfff5c0, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xa8e6ff, roughness: 0.5 }),
    ];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.45;
      const fl = new THREE.Mesh(flowerGeo, flowerMats[i % flowerMats.length]);
      fl.position.set(Math.cos(a) * 0.94, 0.07, Math.sin(a) * 0.94);
      fl.scale.set(1.1, 0.65, 1.1);
      studioGroup.add(fl);
    }

    // Floating Ambient Sparkle Motes
    const MOTE_COUNT = 14;
    const moteGeo = new THREE.SphereGeometry(0.028, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.72 });
    const motes: THREE.Mesh[] = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      studioGroup.add(m);
      motes.push(m);
    }

    // Character & Companion Rigs
    const rig = createMochiRig();
    rig.root.position.set(0, 0.06, 0);
    scene.add(rig.root);

    const companionRig = createCompanionRig();
    companionRig.root.position.set(-0.64, 0.08, 0.14);
    scene.add(companionRig.root);

    // Camera Orbit State (zero allocation in loop)
    const camCur = { ...camTargetRef.current };
    const lookVec = new THREE.Vector3(camCur.lookX, camCur.lookY, camCur.lookZ);

    // Resize observer
    const updateSize = () => {
      if (!host) return;
      const w = Math.max(120, host.clientWidth);
      const h = Math.max(120, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(host);

    // Pointer Drag Orbit + Wheel Zoom
    let activePtrId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      activePtrId = e.pointerId;
      isDraggingRef.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePtrId !== e.pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camTargetRef.current.yaw -= dx * 0.012;
      camTargetRef.current.pitch = THREE.MathUtils.clamp(
        camTargetRef.current.pitch + dy * 0.008,
        -0.15,
        0.65
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePtrId === e.pointerId) {
        activePtrId = null;
        isDraggingRef.current = false;
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camTargetRef.current.dist = THREE.MathUtils.clamp(
        camTargetRef.current.dist + e.deltaY * 0.0022,
        1.45,
        3.8
      );
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    domEl.addEventListener('webglcontextlost', onContextLost);

    let lastMs = performance.now();
    let lastMood: StudioLightingMood | null = null;

    const animate = (nowMs: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastMs) / 1000));
      lastMs = nowMs;
      const t = nowMs / 1000;

      // Sync backdrop mood
      const mood = moodRef.current;
      if (lastMood !== mood) {
        lastMood = mood;
        const theme = MOOD_THEMES[mood];
        scene.background = bgTextures[mood];
        hemi.color.setHex(theme.hemiSky);
        hemi.groundColor.setHex(theme.hemiGround);
        hemi.intensity = theme.hemiInt;
        keyLight.color.setHex(theme.keyCol);
        keyLight.intensity = theme.keyInt;
        rimLight.color.setHex(theme.rimCol);
        rimLight.intensity = theme.rimInt;
        moteMat.color.setHex(theme.moteCol);
        turfMat.color.setHex(mood === 'starlight' ? 0x568b6b : mood === 'dawn' ? 0x8fc973 : 0x86d97e);
      }

      // Subtle camera interpolation
      const tgt = camTargetRef.current;
      const lerpFactor = Math.min(1, dt * 10);
      camCur.yaw += (tgt.yaw - camCur.yaw) * lerpFactor;
      camCur.pitch += (tgt.pitch - camCur.pitch) * lerpFactor;
      camCur.dist += (tgt.dist - camCur.dist) * lerpFactor;
      camCur.lookX += (tgt.lookX - camCur.lookX) * lerpFactor;
      camCur.lookY += (tgt.lookY - camCur.lookY) * lerpFactor;
      camCur.lookZ += (tgt.lookZ - camCur.lookZ) * lerpFactor;

      const cosP = Math.cos(camCur.pitch);
      camera.position.set(
        camCur.lookX + Math.sin(camCur.yaw) * cosP * camCur.dist,
        camCur.lookY + Math.sin(camCur.pitch) * camCur.dist,
        camCur.lookZ + Math.cos(camCur.yaw) * cosP * camCur.dist
      );
      lookVec.set(camCur.lookX, camCur.lookY, camCur.lookZ);
      camera.lookAt(lookVec);

      // Update floating motes
      for (let i = 0; i < MOTE_COUNT; i++) {
        const a = t * 0.45 + (i / MOTE_COUNT) * Math.PI * 2;
        const rad = 1.05 + (i % 3) * 0.22;
        motes[i].position.set(
          Math.cos(a) * rad,
          0.35 + ((i * 0.17 + t * 0.18) % 1.35),
          Math.sin(a) * rad
        );
      }

      // Update 3D Mochi + Companion
      const curEmote = emoteRef.current;
      const curLook = lookRef.current;
      const isBlinking = t % 4.1 < 0.13;
      const isWalk = curEmote === 'walk';

      updateMochiRig(rig, {
        look: curLook,
        time: t,
        dt,
        isMoving: isWalk,
        moveSpeed: isWalk ? 1.0 : curEmote === 'twirl' ? 0.65 : 0,
        isBlinking,
        facingYaw: 0,
        scale: 1,
        emoteAnim: curEmote,
      });

      const compId = curLook.companion ?? 'gloom';
      updateCompanionRig(companionRig, compId, t, 0.25, isWalk);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('webglcontextlost', onContextLost);

      // Clean disposal of studio-owned GPU assets (do not dispose shared GEO or face cache)
      stoneGeo.dispose();
      stoneMat.dispose();
      turfGeo.dispose();
      turfMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      flowerGeo.dispose();
      flowerMats.forEach((m) => m.dispose());
      moteGeo.dispose();
      moteMat.dispose();
      Object.values(bgTextures).forEach((t) => t.dispose());

      // Dispose per-rig cloned materials created inside createMochiRig / createCompanionRig
      const rigMats = new Set<THREE.Material>();
      rig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => rigMats.add(m));
          else if (mat) rigMats.add(mat);
        }
      });
      // Exclude module-level shared STATIC_MAT materials from disposal by only disposing rig-owned materials:
      [
        rig.mainMat,
        rig.bellyMat,
        rig.accentMat,
        rig.hatMat,
        rig.hatShadeMat,
        rig.patMat,
        rig.noseMat,
        rig.outfitSoftMat,
        rig.outfitMat1,
        rig.outfitMat2,
        rig.outfitMat3,
        rig.hairMat,
        rig.hairShadeMat,
        rig.darkMat,
        rig.faceMat,
        rig.shadowMat,
        rig.highlightRing.material as THREE.Material,
        ...rig.auraOrbs.map((o) => o.material as THREE.Material),
      ].forEach((m) => m.dispose());
      disposeCompanionRig(companionRig);
      rigMats.clear();

      envRT?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      if (domEl.parentNode === host) host.removeChild(domEl);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`relative select-none cursor-grab active:cursor-grabbing overflow-hidden ${className}`}
      aria-label="Interactive 3D Mochi Character Preview — drag to rotate, scroll to zoom"
    />
  );
};
