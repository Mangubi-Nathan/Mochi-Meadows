/**
 * Mochi Meadows 2 — 3D Cinematic Cutscene Stage Renderer
 * Renders all story cutscenes in full Three.js 3D using the exact same character rigs,
 * companion models, architectural landmarks, custom GLSL sky/water/foliage shaders,
 * and spring hair / idle / dance / jump animations as the live 3D game world.
 */

import * as THREE from 'three';
import { PlayerLook } from './engine';
import { SeasonId } from './constants';
import {
  MochiRig,
  CompanionRig,
  createMochiRig,
  updateMochiRig,
  createCompanionRig,
  updateCompanionRig,
  disposeCompanionRig,
} from './mochiModel3D';
import {
  Cutscene3DSceneSpec,
  Cutscene3DActorSpec,
  Cutscene3DMoteStyle,
} from './cutscenes';
import {
  createArchMaterialPack,
  buildDetailedGreatLanternTree,
  buildDetailedPortalArch,
  buildDetailedCauldronShrine,
  buildDetailedTeaHouseGazebo,
  buildDetailedCottage,
} from './architecturePack3D';
import {
  SharedWorldShaderUniforms,
  createWorldShaderUniforms,
  createSkyDomeMaterial,
  createOutdoorEnvScene,
  applyWaterShader,
  applyFoliageShader,
  createOrganicTreeTrunkGeometry,
  createOrganicLeafClusterGeometry,
  createFlutedPineBoughGeometry,
  createCumulusCloudGeometry,
  createWildflowerBlossomGeometry,
  createToadstoolCapGeometry,
} from './worldShaders3D';

const FALLBACK_NPC_LOOKS: Record<string, Partial<PlayerLook>> = {
  Pip: { sp: 'bunny', col: '#ffffff', hat: 'leaf', ac: '#ff7aa8', eyes: 1 },
  Dusk: { sp: 'slime', col: '#7a7a85', hat: 'none', ac: '#ffd23f', eyes: 2 },
  Aurelle: { sp: 'cat', col: '#ffd23f', hat: 'crown', ac: '#ff9ec0', eyes: 1 },
  'The Moon': { sp: 'bunny', col: '#e2f6ff', hat: 'nightcap', ac: '#b48cff', eyes: 2 },
  Lumi: { sp: 'slime', col: '#b8f0b0', hat: 'mushroom', ac: '#64f5c1', eyes: 0 },
  'Professor Hoot': { sp: 'owl', col: '#8c765f', hat: 'beret', ac: '#ffb347', eyes: 1 },
};

const _vCamPos = new THREE.Vector3();
const _vCamLook = new THREE.Vector3();
const _cTempA = new THREE.Color();
const _cTempB = new THREE.Color();

interface MoteInstanceData {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  speed: number;
  phase: number;
  radius: number;
  baseScale: number;
}

export class Cutscene3DStageRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private uniforms: SharedWorldShaderUniforms;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;

  private ownedGeos: THREE.BufferGeometry[] = [];
  private ownedMats: THREE.Material[] = [];

  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private accentLight: THREE.PointLight;
  private campfireLight: THREE.PointLight;

  private skyDome: THREE.Mesh;
  private stageGround: THREE.Mesh;
  private stageGroundMat: THREE.MeshStandardMaterial;
  private stageShore: THREE.Mesh;
  private stageShoreMat: THREE.MeshStandardMaterial;
  private seaPlane: THREE.Mesh;
  private seaMat: THREE.MeshStandardMaterial;

  // Celestial Props (Moon & Sun orbs for sky storytelling)
  private moonGroup: THREE.Group;
  private moonHaloMat: THREE.MeshBasicMaterial;
  private sunOrbGroup: THREE.Group;

  // Shared Architectural & Landmark Groups (exact gameplay 3D assets)
  private lanternTree: ReturnType<typeof buildDetailedGreatLanternTree>;
  private portalArch: THREE.Group;
  private cauldron: ReturnType<typeof buildDetailedCauldronShrine>;
  private teaHouse: ReturnType<typeof buildDetailedTeaHouseGazebo>;
  private cottage: ReturnType<typeof buildDetailedCottage>;
  private campfireGroup: THREE.Group;
  private flameMeshes: THREE.Mesh[] = [];
  private pineGroveGroup: THREE.Group;
  private meadowTreesGroup: THREE.Group;
  private crystalClusterGroup: THREE.Group;
  private skyAtollGroup: THREE.Group;
  private cloudRingMeshes: THREE.Mesh[] = [];
  private dawnSpireGroup: THREE.Group;

  // 3D Floating Motes Pool
  private moteGroup: THREE.Group;
  private motes: MoteInstanceData[] = [];
  private moteMat: THREE.MeshBasicMaterial;
  private activeMoteStyle: Cutscene3DMoteStyle = 'notes';

  // Exact Character & Companion Rigs
  private playerRig: MochiRig;
  private companionRig: CompanionRig;
  private npcRigs: MochiRig[] = [];
  private npcLooks: PlayerLook[] = [];

  private currentSpec: Cutscene3DSceneSpec | null = null;
  private slideElapsed = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const isCompactViewport = typeof window !== 'undefined' && (window.innerWidth < 640 || window.innerHeight <= 520);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isCompactViewport,
      alpha: false,
      powerPreference: isCompactViewport ? 'default' : 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.1 : 1.75));
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isCompactViewport ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xbce9ff, 0.012);

    this.camera = new THREE.PerspectiveCamera(44, Math.max(1, width) / Math.max(1, height), 0.15, 240);
    this.camera.position.set(0, 3.2, 8.5);
    this.camera.lookAt(0, 1.0, 0);

    this.uniforms = createWorldShaderUniforms();

    // Outdoor atmospheric PMREM reflections
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = createOutdoorEnvScene();
    this.envRT = this.pmremGenerator.fromScene(envScene, 0.04);
    this.scene.environment = this.envRT.texture;
    envScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
        else m.material?.dispose();
      }
    });

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.ownedGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.ownedMats.push(m);
      return m;
    };

    // Sky Dome
    const skyGeo = trackGeo(new THREE.SphereGeometry(110, 32, 20));
    const skyMat = trackMat(createSkyDomeMaterial(this.uniforms));
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x528f5e, 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1cf, 1.85);
    this.sunLight.position.set(10, 15, 9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 45;
    this.sunLight.shadow.camera.left = -12;
    this.sunLight.shadow.camera.right = 12;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -12;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.accentLight = new THREE.PointLight(0xffd26b, 0, 16, 1.5);
    this.accentLight.position.set(0, 2.8, 0);
    this.scene.add(this.accentLight);

    this.campfireLight = new THREE.PointLight(0xff8e3c, 0, 12, 1.6);
    this.campfireLight.position.set(0, 0.85, 0);
    this.scene.add(this.campfireLight);

    // Sculpted Island Stage Ground (gently rolling meadow plinth at y = 0)
    const groundGeo = trackGeo(new THREE.CylinderGeometry(9.6, 11.4, 1.6, 48, 4));
    const gPos = groundGeo.getAttribute('position');
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const y = gPos.getY(i);
      const z = gPos.getZ(i);
      if (y > 0.2) {
        const r = Math.hypot(x, z);
        const rimDrop = THREE.MathUtils.smoothstep(r, 6.2, 9.6) * 0.42;
        const outerFade = THREE.MathUtils.smoothstep(r, 4.2, 7.6);
        const undulation = Math.sin(x * 0.45) * Math.cos(z * 0.4) * 0.14 * outerFade;
        gPos.setY(i, y - rimDrop + undulation);
      }
    }
    groundGeo.computeVertexNormals();
    this.stageGroundMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x7fd66b, roughness: 0.86, metalness: 0.02 })
    );
    this.stageGround = new THREE.Mesh(groundGeo, this.stageGroundMat);
    this.stageGround.position.y = -0.8;
    this.stageGround.receiveShadow = true;
    this.scene.add(this.stageGround);

    // Sandy Shoreline Ring
    this.stageShoreMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4dca0, roughness: 0.9 }));
    this.stageShore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(11.6, 12.6, 0.55, 48)),
      this.stageShoreMat
    );
    this.stageShore.position.y = -0.45;
    this.stageShore.receiveShadow = true;
    this.scene.add(this.stageShore);

    // Surrounding Animated Ocean / Bioluminescent Canal / Cloud Horizon
    this.seaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1a82d9,
        roughness: 0.14,
        metalness: 0.12,
        transparent: true,
        opacity: 0.9,
      })
    );
    applyWaterShader(this.seaMat, this.uniforms);
    const seaGeo = trackGeo(new THREE.CircleGeometry(78, 64));
    seaGeo.rotateX(-Math.PI / 2);
    this.seaPlane = new THREE.Mesh(seaGeo, this.seaMat);
    this.seaPlane.position.y = -0.34;
    this.seaPlane.receiveShadow = true;
    this.scene.add(this.seaPlane);

    // Celestial Orbs (3D Luminous Moon + Sun for Story Sky Shots)
    this.moonGroup = new THREE.Group();
    const moonMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xfff6d6 })
    );
    const moonDisc = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.1, 24, 16)), moonMat);
    this.moonHaloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffeeb0,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    const moonHalo = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(3.2, 20, 14)), this.moonHaloMat);
    this.moonGroup.add(moonHalo, moonDisc);
    this.moonGroup.position.set(-6.5, 11.5, -28);
    this.scene.add(this.moonGroup);

    this.sunOrbGroup = new THREE.Group();
    const sunDisc = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(2.2, 24, 16)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xffe27a }))
    );
    const sunHalo = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(3.5, 20, 14)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xffb347,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        })
      )
    );
    this.sunOrbGroup.add(sunHalo, sunDisc);
    this.sunOrbGroup.position.set(6.5, 11.5, -28);
    this.scene.add(this.sunOrbGroup);

    // Exact Architectural & Landmark Models from architecturePack3D
    const archPack = createArchMaterialPack(this.uniforms, trackMat);

    this.lanternTree = buildDetailedGreatLanternTree(this.uniforms, archPack, trackGeo, trackMat);
    this.scene.add(this.lanternTree.group);

    this.portalArch = buildDetailedPortalArch(0x9a78ff, 0xc7f2ff, this.uniforms, archPack, trackGeo, trackMat);
    this.portalArch.scale.setScalar(1.35);
    this.scene.add(this.portalArch);

    this.cauldron = buildDetailedCauldronShrine(archPack, trackGeo, trackMat);
    this.cauldron.group.scale.setScalar(1.2);
    this.scene.add(this.cauldron.group);

    this.teaHouse = buildDetailedTeaHouseGazebo(archPack, trackGeo, trackMat);
    this.teaHouse.group.scale.setScalar(1.1);
    this.scene.add(this.teaHouse.group);

    this.cottage = buildDetailedCottage(0xe86c58, this.uniforms, archPack, trackGeo, trackMat);
    this.scene.add(this.cottage.group);

    // Cozy Campfire Prop Group (crossed logs + 3 layered flame cones)
    this.campfireGroup = new THREE.Group();
    const logGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.12, 1.1, 8));
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(logGeo, archPack.timber);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i * Math.PI) / 3;
      log.position.y = 0.1;
      log.castShadow = true;
      this.campfireGroup.add(log);
    }
    const stoneRingGeo = trackGeo(new THREE.DodecahedronGeometry(0.14, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(stoneRingGeo, archPack.masonry);
      st.position.set(Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62);
      this.campfireGroup.add(st);
    }
    const flameColors = [0xff6b2b, 0xffb338, 0xfff099];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.28 - i * 0.07, 0.72 - i * 0.12, 8)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: flameColors[i],
            transparent: true,
            opacity: 0.9,
          })
        )
      );
      f.position.y = 0.36 + i * 0.06;
      this.campfireGroup.add(f);
      this.flameMeshes.push(f);
    }
    this.scene.add(this.campfireGroup);

    // Whisperwood Pine Grove Backdrop
    this.pineGroveGroup = new THREE.Group();
    const pineBoughGeo = trackGeo(createFlutedPineBoughGeometry());
    const trunkGeo = trackGeo(createOrganicTreeTrunkGeometry());
    const pineMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2b6e56, roughness: 0.74 }));
    applyFoliageShader(pineMat, this.uniforms);
    const barkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3e32, roughness: 0.9 }));
    for (const [tx, tz, ts] of [
      [-4.2, -3.4, 1.35],
      [4.0, -3.2, 1.28],
      [-5.6, -0.6, 1.18],
      [5.4, -0.8, 1.24],
      [-2.2, -5.0, 1.48],
      [2.6, -4.8, 1.42],
    ]) {
      const pTree = new THREE.Group();
      pTree.position.set(tx, 0, tz);
      pTree.scale.setScalar(ts);
      const tr = new THREE.Mesh(trunkGeo, barkMat);
      tr.castShadow = true;
      pTree.add(tr);
      for (let tier = 0; tier < 3; tier++) {
        const bough = new THREE.Mesh(pineBoughGeo, pineMat);
        bough.position.y = 0.8 + tier * 0.65;
        bough.scale.setScalar(1.25 - tier * 0.24);
        bough.castShadow = true;
        pTree.add(bough);
      }
      this.pineGroveGroup.add(pTree);
    }
    this.scene.add(this.pineGroveGroup);

    // Lush Meadow Deciduous Trees, Wildflowers & Toadstools
    this.meadowTreesGroup = new THREE.Group();
    const leafGeo = trackGeo(createOrganicLeafClusterGeometry());
    const leafMat1 = trackMat(new THREE.MeshStandardMaterial({ color: 0x4cc973, roughness: 0.65 }));
    const leafMat2 = trackMat(new THREE.MeshStandardMaterial({ color: 0x7be888, roughness: 0.62 }));
    applyFoliageShader(leafMat1, this.uniforms);
    applyFoliageShader(leafMat2, this.uniforms);
    for (const [tx, tz, ts] of [
      [-5.4, -2.5, 1.25],
      [5.2, -2.4, 1.2],
      [-6.2, 1.2, 1.1],
      [6.1, 1.5, 1.15],
    ]) {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);
      tree.scale.setScalar(ts);
      const tr = new THREE.Mesh(trunkGeo, barkMat);
      tr.castShadow = true;
      const c1 = new THREE.Mesh(leafGeo, leafMat1);
      c1.position.set(0, 1.42, 0);
      c1.scale.setScalar(1.3);
      c1.castShadow = true;
      const c2 = new THREE.Mesh(leafGeo, leafMat2);
      c2.position.set(0.32, 1.65, 0.18);
      c2.scale.setScalar(0.92);
      c2.castShadow = true;
      tree.add(tr, c1, c2);
      this.meadowTreesGroup.add(tree);
    }
    const blossomGeo = trackGeo(createWildflowerBlossomGeometry());
    const blossomMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffa8d4, roughness: 0.5 }));
    const flowerGoldMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.5 }));
    for (let f = 0; f < 16; f++) {
      const ang = (f / 16) * Math.PI * 2 + 0.2;
      const rad = 3.2 + (f % 3) * 1.4;
      const fl = new THREE.Mesh(blossomGeo, f % 2 === 0 ? blossomMat : flowerGoldMat);
      fl.position.set(Math.cos(ang) * rad, 0.02, Math.sin(ang) * rad);
      fl.scale.setScalar(0.85 + (f % 3) * 0.18);
      this.meadowTreesGroup.add(fl);
    }
    this.scene.add(this.meadowTreesGroup);

    // Glowdeep Crystal & Mushroom Sanctuary Props
    this.crystalClusterGroup = new THREE.Group();
    const crystalGeo = trackGeo(new THREE.OctahedronGeometry(0.45, 0));
    const toadCapGeo = trackGeo(createToadstoolCapGeometry());
    const glowCapMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x58ffd2,
        emissive: 0x22d9aa,
        emissiveIntensity: 0.85,
        roughness: 0.35,
      })
    );
    for (const [cx, cz, s, isViolet] of [
      [-3.8, -2.2, 1.5, false],
      [3.6, -2.4, 1.65, true],
      [-4.9, 0.9, 1.15, true],
      [4.8, 0.8, 1.3, false],
      [-2.1, -4.2, 1.85, false],
      [2.4, -4.1, 1.7, true],
    ] as const) {
      const cr = new THREE.Mesh(crystalGeo, isViolet ? archPack.crystalViolet : archPack.crystalCyan);
      cr.position.set(cx, 0.65 * s, cz);
      cr.scale.set(0.75 * s, 1.9 * s, 0.75 * s);
      cr.rotation.set((cx % 2) * 0.14, cx, (cz % 2) * 0.14);
      this.crystalClusterGroup.add(cr);

      const mushStem = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 0.42, 8)),
        archPack.plaster
      );
      mushStem.position.set(cx * 0.72, 0.21, cz * 0.72 + 0.8);
      const mushCap = new THREE.Mesh(toadCapGeo, glowCapMat);
      mushCap.position.set(cx * 0.72, 0.42, cz * 0.72 + 0.8);
      mushCap.scale.setScalar(0.85);
      this.crystalClusterGroup.add(mushStem, mushCap);
    }
    this.scene.add(this.crystalClusterGroup);

    // Cirrus Sky Kingdom Floating Cloud Atoll & Cumulus Ring
    this.skyAtollGroup = new THREE.Group();
    const cloudGeo = trackGeo(createCumulusCloudGeometry());
    const cloudMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.02 })
    );
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rad = 11.5 + (i % 2) * 4.5;
      const cl = new THREE.Mesh(cloudGeo, cloudMat);
      cl.position.set(Math.cos(ang) * rad, -0.6 + (i % 3) * 1.4, Math.sin(ang) * rad);
      cl.scale.setScalar(2.4 + (i % 3) * 0.65);
      this.skyAtollGroup.add(cl);
      this.cloudRingMeshes.push(cl);
    }
    // Floating marble ruins pillars
    const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.3, 2.2, 10));
    for (const [px, pz] of [
      [-3.4, -2.5],
      [3.4, -2.5],
      [-4.2, 0.6],
      [4.2, 0.6],
    ]) {
      const pil = new THREE.Mesh(pillarGeo, archPack.marble);
      pil.position.set(px, 1.1, pz);
      pil.castShadow = true;
      const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.24, 0)), archPack.gold);
      gem.position.set(px, 2.45, pz);
      this.skyAtollGroup.add(pil, gem);
    }
    this.scene.add(this.skyAtollGroup);

    // Dawn Spire Sanctuary Steps & Golden Chord Pillars
    this.dawnSpireGroup = new THREE.Group();
    const dais = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.4, 5.0, 0.24, 24)), archPack.marble);
    dais.position.y = 0.12;
    dais.receiveShadow = true;
    this.dawnSpireGroup.add(dais);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const col = new THREE.Mesh(pillarGeo, archPack.marble);
      col.position.set(Math.cos(a) * 4.2, 1.1, Math.sin(a) * 4.2);
      col.castShadow = true;
      const crest = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.26, 0)), archPack.gold);
      crest.position.set(Math.cos(a) * 4.2, 2.5, Math.sin(a) * 4.2);
      this.dawnSpireGroup.add(col, crest);
    }
    this.scene.add(this.dawnSpireGroup);

    // Pooled 3D Floating Motes (notes, stars, embers, spores, petals)
    this.moteGroup = new THREE.Group();
    const moteGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
    this.moteMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 })
    );
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(moteGeo, this.moteMat);
      this.moteGroup.add(mesh);
      this.motes.push({
        mesh,
        baseX: ((i * 1.73) % 14) - 7,
        baseZ: ((i * 2.41) % 12) - 6,
        speed: 0.45 + (i % 5) * 0.18,
        phase: i * 0.71,
        radius: 0.35 + (i % 4) * 0.22,
        baseScale: 0.7 + (i % 3) * 0.35,
      });
    }
    this.scene.add(this.moteGroup);

    // Exact Gameplay Character & Companion Rigs
    this.playerRig = createMochiRig();
    this.scene.add(this.playerRig.root);

    this.companionRig = createCompanionRig();
    this.scene.add(this.companionRig.root);

    const blankLook: PlayerLook = {
      sp: 'cat',
      col: '#ffb3c7',
      c2: '',
      ac: '#ff7aa8',
      hat: 'none',
      eyes: 0,
      mouth: 0,
      pat: 0,
      out: 0,
      face: 0,
      aura: 0,
      name: '',
    };
    for (let i = 0; i < 4; i++) {
      const rig = createMochiRig();
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.npcRigs.push(rig);
      this.npcLooks.push({ ...blankLook });
    }
  }

  public resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
  }

  public setSlide(
    spec: Cutscene3DSceneSpec | undefined,
    playerLook: PlayerLook,
    getNpcLook: (name: string) => PlayerLook | null,
    season: SeasonId = 'spring'
  ): void {
    this.currentSpec = spec ?? null;
    this.slideElapsed = 0;

    const sCode = season === 'summer' ? 1 : season === 'autumn' ? 2 : season === 'winter' ? 3 : 0;
    this.uniforms.uSeason.value = sCode;

    if (!spec) return;

    // 1. Configure Environment Atmosphere, Sky Dome Shader, Lighting & Fog
    const env = spec.env;
    this.uniforms.uLayer.value = env === 'glowdeep' ? 3 : env === 'sky' ? 1 : env === 'starlight' ? 4 : 0;
    this.uniforms.uNightFactor.value = env === 'night' || env === 'starlight' ? 1 : env === 'dawn' ? 0.15 : 0;
    this.uniforms.uSunsetFactor.value = env === 'sunset' || env === 'dawn' || env === 'finale' ? 0.85 : 0;
    this.uniforms.uWeatherMode.value = env === 'starlight' ? 3 : env === 'finale' ? 4 : 0;

    if (env === 'dawn' || env === 'finale') {
      this.uniforms.uSkyZenith.value.set(env === 'finale' ? '#5844a8' : '#4d6fd6');
      this.uniforms.uSkyHorizon.value.set(env === 'finale' ? '#ffc288' : '#ffd2b4');
      this.uniforms.uSkyBottom.value.set('#385796');
      this.uniforms.uHorizonFogColor.value.set(env === 'finale' ? '#ffd29e' : '#ffd8be');
      this.uniforms.uSunColor.value.set('#ffe29c');
      this.sunLight.color.set(env === 'finale' ? 0xffd27a : 0xffdeb0);
      this.sunLight.intensity = 2.05;
      this.hemiLight.color.set(0xffe6cc);
      this.hemiLight.groundColor.set(0x528258);
      this.hemiLight.intensity = 0.95;
      this.stageGroundMat.color.set(season === 'winter' ? 0xd9ebfa : season === 'autumn' ? 0xd49658 : 0x7bd86b);
      this.seaMat.color.set(0x2884d8);
    } else if (env === 'sunset') {
      this.uniforms.uSkyZenith.value.set('#3e2d78');
      this.uniforms.uSkyHorizon.value.set('#ff9982');
      this.uniforms.uSkyBottom.value.set('#28255a');
      this.uniforms.uHorizonFogColor.value.set('#ffad94');
      this.uniforms.uSunColor.value.set('#ffb86c');
      this.sunLight.color.set(0xffb478);
      this.sunLight.intensity = 1.75;
      this.hemiLight.color.set(0xffcdb8);
      this.hemiLight.groundColor.set(0x465b4a);
      this.hemiLight.intensity = 0.85;
      this.stageGroundMat.color.set(0x6db86a);
      this.seaMat.color.set(0x246bb5);
    } else if (env === 'night') {
      this.uniforms.uSkyZenith.value.set('#0b0c24');
      this.uniforms.uSkyHorizon.value.set('#2b2358');
      this.uniforms.uSkyBottom.value.set('#09081b');
      this.uniforms.uHorizonFogColor.value.set('#241c4a');
      this.uniforms.uSunColor.value.set('#c4d4ff');
      this.sunLight.color.set(0xaec6ff);
      this.sunLight.intensity = 0.95;
      this.hemiLight.color.set(0x7c92d8);
      this.hemiLight.groundColor.set(0x25353a);
      this.hemiLight.intensity = 0.68;
      this.stageGroundMat.color.set(0x3a6e59);
      this.seaMat.color.set(0x163d7a);
    } else if (env === 'starlight') {
      this.uniforms.uSkyZenith.value.set('#0a0620');
      this.uniforms.uSkyHorizon.value.set('#2c1c66');
      this.uniforms.uSkyBottom.value.set('#0a061c');
      this.uniforms.uHorizonFogColor.value.set('#251754');
      this.uniforms.uSunColor.value.set('#d4c8ff');
      this.sunLight.color.set(0xd2c4ff);
      this.sunLight.intensity = 1.15;
      this.hemiLight.color.set(0xa694ff);
      this.hemiLight.groundColor.set(0x2b2854);
      this.hemiLight.intensity = 0.78;
      this.stageGroundMat.color.set(0x454e7c);
      this.seaMat.color.set(0x223880);
    } else if (env === 'glowdeep') {
      this.uniforms.uSkyZenith.value.set('#14082b');
      this.uniforms.uSkyHorizon.value.set('#2f1354');
      this.uniforms.uSkyBottom.value.set('#0c051c');
      this.uniforms.uHorizonFogColor.value.set('#220d3d');
      this.uniforms.uSunColor.value.set('#7bf7e6');
      this.sunLight.color.set(0x78f0e2);
      this.sunLight.intensity = 1.25;
      this.hemiLight.color.set(0x7fe8e8);
      this.hemiLight.groundColor.set(0x2b1846);
      this.hemiLight.intensity = 0.84;
      this.stageGroundMat.color.set(0x2d2444);
      this.seaMat.color.set(0x188c96);
    } else if (env === 'sky') {
      this.uniforms.uSkyZenith.value.set('#3290f5');
      this.uniforms.uSkyHorizon.value.set('#d4f3ff');
      this.uniforms.uSkyBottom.value.set('#b8e4ff');
      this.uniforms.uHorizonFogColor.value.set('#d8f4ff');
      this.uniforms.uSunColor.value.set('#fff5cc');
      this.sunLight.color.set(0xfff5d4);
      this.sunLight.intensity = 2.0;
      this.hemiLight.color.set(0xffffff);
      this.hemiLight.groundColor.set(0xa2d6f5);
      this.hemiLight.intensity = 1.05;
      this.stageGroundMat.color.set(0x9be68d);
      this.seaMat.color.set(0x99dcff);
    } else {
      // Day
      this.uniforms.uSkyZenith.value.set('#3b8be0');
      this.uniforms.uSkyHorizon.value.set('#bce9ff');
      this.uniforms.uSkyBottom.value.set('#1d6ca3');
      this.uniforms.uHorizonFogColor.value.set('#bce9ff');
      this.uniforms.uSunColor.value.set('#fff4d0');
      this.sunLight.color.set(0xfff4d6);
      this.sunLight.intensity = 1.95;
      this.hemiLight.color.set(0xdff4ff);
      this.hemiLight.groundColor.set(0x4c8a56);
      this.hemiLight.intensity = 0.92;
      this.stageGroundMat.color.set(0x7cd468);
      this.seaMat.color.set(0x1e88e5);
    }

    (this.scene.fog as THREE.FogExp2).color.copy(this.uniforms.uHorizonFogColor.value);
    (this.scene.fog as THREE.FogExp2).density = env === 'glowdeep' ? 0.022 : env === 'sky' ? 0.008 : 0.011;

    // 2. Toggle Landmarks cleanly (zero runtime allocations)
    const lm = spec.landmark;
    const isLanternScene =
      lm === 'lantern_tree' || lm === 'harmony_shore' || lm === 'dawn_spire' || lm === 'credits_vista';
    this.lanternTree.group.visible = isLanternScene;
    if (lm === 'harmony_shore') {
      this.lanternTree.group.position.set(0, 0, -4.6);
      this.lanternTree.group.scale.setScalar(0.95);
    } else if (lm === 'credits_vista') {
      this.lanternTree.group.position.set(2.4, 0, -2.8);
      this.lanternTree.group.scale.setScalar(0.98);
    } else if (lm === 'dawn_spire') {
      this.lanternTree.group.position.set(0, 0.24, -3.4);
      this.lanternTree.group.scale.setScalar(1.08);
    } else {
      this.lanternTree.group.position.set(0, 0, -2.4);
      this.lanternTree.group.scale.setScalar(1.05);
    }

    const lit = spec.lanternLit ?? 0.5;
    const lanternOrbHex = lit > 0.2 ? 0xffdf78 : 0x5d677c;
    for (let i = 0; i < this.lanternTree.lanternOrbs.length; i++) {
      const m = this.lanternTree.lanternOrbs[i].material as THREE.MeshStandardMaterial;
      m.color.setHex(lanternOrbHex);
      m.emissive.setHex(lit > 0.2 ? 0xffb830 : 0x222938);
      m.emissiveIntensity = lit > 0.2 ? 0.35 + lit * 0.95 : 0.08;
    }
    this.lanternTree.crownMat1.color.setHex(lit > 0.25 ? 0x268f56 : 0x3b485e);
    this.lanternTree.crownMat2.color.setHex(lit > 0.25 ? 0x52d97b : 0x4b5a75);

    this.portalArch.visible = lm === 'moon_gate';
    this.portalArch.position.set(0, 0, -2.2);

    this.cauldron.group.visible = lm === 'cauldron';
    this.cauldron.group.position.set(0, 0, -1.6);

    this.teaHouse.group.visible = lm === 'harmony_shore' || lm === 'campfire_grove';
    if (lm === 'harmony_shore') {
      this.teaHouse.group.position.set(-4.2, 0, -3.2);
      this.teaHouse.group.scale.setScalar(0.92);
    } else if (lm === 'campfire_grove') {
      this.teaHouse.group.position.set(4.1, 0, -4.6);
      this.teaHouse.group.scale.setScalar(0.85);
    }

    this.cottage.group.visible = lm === 'lantern_tree' || lm === 'credits_vista';
    if (lm === 'credits_vista') {
      this.cottage.group.position.set(-3.4, 0, -2.8);
      this.cottage.group.rotation.y = 0.42;
      this.cottage.group.scale.setScalar(0.92);
    } else {
      this.cottage.group.position.set(4.1, 0, -3.2);
      this.cottage.group.rotation.y = -0.45;
      this.cottage.group.scale.setScalar(0.88);
    }

    this.campfireGroup.visible = lm === 'campfire_grove';
    this.campfireGroup.position.set(0, 0, -0.5);
    this.campfireLight.intensity = lm === 'campfire_grove' ? 3.2 : 0;

    this.pineGroveGroup.visible = lm === 'campfire_grove' || lm === 'moon_gate';
    this.meadowTreesGroup.visible =
      lm === 'harmony_shore' || lm === 'lantern_tree' || lm === 'credits_vista' || lm === 'dawn_spire';
    this.crystalClusterGroup.visible = lm === 'cauldron';
    this.skyAtollGroup.visible = lm === 'sky_islands';
    this.dawnSpireGroup.visible = lm === 'dawn_spire';

    this.seaPlane.visible = spec.showWater !== false && lm !== 'sky_islands';
    this.stageShore.visible = lm !== 'sky_islands' && lm !== 'cauldron';

    this.accentLight.intensity =
      lm === 'cauldron' ? 2.4 : lm === 'moon_gate' ? 2.2 : lm === 'dawn_spire' ? 1.8 : lit > 0.5 ? 1.4 : 0;
    this.accentLight.color.setHex(
      lm === 'cauldron' ? 0x58ffd2 : lm === 'moon_gate' ? 0xb48cff : 0xffd26b
    );

    // 3. Celestial Orbs
    this.moonGroup.visible = Boolean(spec.showMoon);
    this.moonHaloMat.opacity = spec.moonSad ? 0.18 : 0.34;
    this.moonGroup.position.set(spec.showSun ? -4.8 : 0, spec.showSun ? 9.6 : 10.5, -26);
    this.sunOrbGroup.visible = Boolean(spec.showSun);
    this.sunOrbGroup.position.set(spec.showMoon ? 4.8 : 0, 9.6, -26);

    // 4. Configure Motes Color
    this.activeMoteStyle = spec.motes ?? 'notes';
    if (this.activeMoteStyle === 'stars') this.moteMat.color.setHex(0xc8a8ff);
    else if (this.activeMoteStyle === 'spores') this.moteMat.color.setHex(0x64f5e0);
    else if (this.activeMoteStyle === 'embers') this.moteMat.color.setHex(0xffa44d);
    else if (this.activeMoteStyle === 'petals') this.moteMat.color.setHex(0xffb8d8);
    else this.moteMat.color.setHex(0xffe27a);

    // 5. Resolve NPC Cast Looks cleanly
    let npcSlot = 0;
    for (let i = 0; i < this.npcRigs.length; i++) {
      this.npcRigs[i].root.visible = false;
    }
    this.playerRig.root.visible = false;
    this.companionRig.root.visible = false;

    for (let i = 0; i < spec.actors.length; i++) {
      const a = spec.actors[i];
      if (a.role === 'player') {
        this.playerRig.root.visible = true;
      } else if (a.role === 'companion') {
        this.companionRig.root.visible = (playerLook.companion || 'gloom') !== 'none';
      } else if (a.role === 'npc' && npcSlot < this.npcRigs.length) {
        const name = a.npcName || 'Pip';
        const resolved = getNpcLook(name);
        const fb = FALLBACK_NPC_LOOKS[name];
        const target = this.npcLooks[npcSlot];
        target.sp = resolved?.sp || fb?.sp || 'cat';
        target.col = resolved?.col || fb?.col || '#ffb3c7';
        target.c2 = resolved?.c2 || '';
        target.ac = resolved?.ac || fb?.ac || '#ff7aa8';
        target.hat = resolved?.hat || fb?.hat || 'none';
        target.hair = resolved?.hair || 'none';
        target.hairCol = resolved?.hairCol || '';
        target.eyes = resolved?.eyes ?? fb?.eyes ?? 0;
        target.mouth = resolved?.mouth ?? 0;
        target.pat = resolved?.pat ?? 0;
        target.out = resolved?.out ?? 0;
        target.face = resolved?.face ?? 0;
        target.aura = a.isHollow ? 0 : resolved?.aura ?? 0;
        target.name = name;
        target.isHollow = a.isHollow;
        target.hollowBloom = a.hollowBloom;
        this.npcRigs[npcSlot].root.visible = true;
        npcSlot++;
      }
    }

    // Snap initial camera immediately so slide frame 0 starts crisply framed
    this.camera.fov = spec.camera.fov ?? 44;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(spec.camera.startPos[0], spec.camera.startPos[1], spec.camera.startPos[2]);
    this.camera.lookAt(spec.camera.startLookAt[0], spec.camera.startLookAt[1], spec.camera.startLookAt[2]);
  }

  public render(dt: number, duration: number, playerLook: PlayerLook): void {
    const stepDt = Math.min(Math.max(dt, 0.001), 0.05);
    this.slideElapsed += stepDt;
    const t = this.slideElapsed;
    this.uniforms.uTime.value += stepDt;
    const uT = this.uniforms.uTime.value;

    const spec = this.currentSpec;
    if (!spec) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Smoothstep cinematic camera sweep
    const rawP = THREE.MathUtils.clamp(t / Math.max(0.5, duration), 0, 1);
    const easeP = rawP * rawP * (3 - 2 * rawP);
    const cam = spec.camera;
    _vCamPos.set(
      THREE.MathUtils.lerp(cam.startPos[0], cam.endPos[0], easeP) + Math.sin(uT * 0.7) * 0.06,
      THREE.MathUtils.lerp(cam.startPos[1], cam.endPos[1], easeP) + Math.cos(uT * 0.55) * 0.04,
      THREE.MathUtils.lerp(cam.startPos[2], cam.endPos[2], easeP)
    );
    _vCamLook.set(
      THREE.MathUtils.lerp(cam.startLookAt[0], cam.endLookAt[0], easeP),
      THREE.MathUtils.lerp(cam.startLookAt[1], cam.endLookAt[1], easeP),
      THREE.MathUtils.lerp(cam.startLookAt[2], cam.endLookAt[2], easeP)
    );
    this.camera.position.copy(_vCamPos);
    this.camera.lookAt(_vCamLook);

    // Animate Landmark Details
    if (this.cauldron.group.visible) {
      for (let i = 0; i < this.cauldron.bubbles.length; i++) {
        const b = this.cauldron.bubbles[i];
        const cycle = (uT * 0.65 + i * 0.25) % 1;
        b.position.y = 1.05 + cycle * 0.55;
        b.scale.setScalar(Math.sin(cycle * Math.PI) * 1.1);
      }
    }
    if (this.teaHouse.group.visible) {
      this.teaHouse.crescent.rotation.y = uT * 1.1;
      this.teaHouse.crescent.position.y = 3.06 + Math.sin(uT * 2.2) * 0.08;
    }
    if (this.portalArch.visible) {
      const core = this.portalArch.getObjectByName('portalCore');
      if (core) core.rotation.z = uT * 0.85;
    }
    if (this.campfireGroup.visible) {
      for (let i = 0; i < this.flameMeshes.length; i++) {
        const f = this.flameMeshes[i];
        f.scale.set(
          1 + Math.sin(uT * 11 + i * 2) * 0.14,
          1 + Math.cos(uT * 14 + i) * 0.22,
          1 + Math.sin(uT * 10 + i * 1.5) * 0.14
        );
        f.rotation.z = Math.sin(uT * 8 + i) * 0.08;
      }
      this.campfireLight.intensity = 2.9 + Math.sin(uT * 13) * 0.45 + Math.cos(uT * 21) * 0.25;
    }
    if (this.skyAtollGroup.visible) {
      for (let i = 0; i < this.cloudRingMeshes.length; i++) {
        this.cloudRingMeshes[i].position.y += Math.sin(uT * 0.9 + i) * 0.002;
      }
    }

    // Animate Floating Motes
    const isRise = this.activeMoteStyle !== 'stars';
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      const p = (uT * m.speed * 0.28 + m.phase) % 1;
      const y = isRise ? 0.35 + p * 5.2 : 6.0 - p * 5.4;
      m.mesh.position.set(
        m.baseX + Math.sin(uT * 1.4 + m.phase) * m.radius,
        y,
        m.baseZ + Math.cos(uT * 1.1 + m.phase) * m.radius
      );
      m.mesh.rotation.y = uT * 2.1 + m.phase;
      m.mesh.rotation.z = uT * 1.3;
      const fade = Math.sin(p * Math.PI);
      m.mesh.scale.setScalar(Math.max(0.01, m.baseScale * fade));
    }

    // Animate Cast Actors with Exact Same Rigs & Spring Hair Physics
    let npcSlot = 0;
    for (let i = 0; i < spec.actors.length; i++) {
      const a: Cutscene3DActorSpec = spec.actors[i];
      const hasMovePath = Boolean(a.endPos);
      const ax = hasMovePath ? THREE.MathUtils.lerp(a.startPos[0], a.endPos![0], easeP) : a.startPos[0];
      const ay = hasMovePath ? THREE.MathUtils.lerp(a.startPos[1], a.endPos![1], easeP) : a.startPos[1];
      const az = hasMovePath ? THREE.MathUtils.lerp(a.startPos[2], a.endPos![2], easeP) : a.startPos[2];

      let jumpZ = 0;
      let jumpVy = 0;
      if (a.jumpArcHeight && a.jumpArcHeight > 0) {
        const hopPhase = (t * 0.85 + i * 0.35) % 1;
        jumpZ = Math.sin(hopPhase * Math.PI) * a.jumpArcHeight;
        jumpVy = Math.cos(hopPhase * Math.PI) * a.jumpArcHeight * Math.PI * 0.85;
      }

      const actorMoving = Boolean(a.isMoving) || (hasMovePath && easeP > 0.02 && easeP < 0.96);
      const yaw =
        hasMovePath && actorMoving
          ? Math.atan2(a.endPos![0] - a.startPos[0], a.endPos![2] - a.startPos[2])
          : a.yaw ?? 0;

      if (a.role === 'player') {
        this.playerRig.root.position.set(ax, ay, az);
        updateMochiRig(this.playerRig, {
          look: playerLook,
          time: uT,
          isMoving: actorMoving,
          isSprinting: Boolean(a.isSprinting),
          isBlinking: uT % 3.8 < 0.13,
          facingYaw: yaw,
          headYaw: a.headYaw ?? Math.sin(uT * 0.8) * 0.1,
          headPitch: a.headPitch ?? 0,
          scale: a.scale ?? 1.0,
          isGreeting: Boolean(a.isGreeting),
          jumpZ,
          jumpVy,
          dt: stepDt,
          moveSpeed: actorMoving ? (a.isSprinting ? 1.5 : 1.0) : 0,
          weatherBehavior: a.weatherBehavior ?? 'idle',
        });
      } else if (a.role === 'companion' && this.companionRig.root.visible) {
        this.companionRig.root.position.set(ax, ay + jumpZ * 0.5, az);
        updateCompanionRig(this.companionRig, playerLook.companion || 'gloom', uT, yaw, actorMoving);
      } else if (a.role === 'npc' && npcSlot < this.npcRigs.length) {
        const rig = this.npcRigs[npcSlot];
        const look = this.npcLooks[npcSlot];
        rig.root.position.set(ax, ay, az);
        updateMochiRig(rig, {
          look,
          time: uT,
          isMoving: actorMoving,
          isSprinting: Boolean(a.isSprinting),
          isBlinking: (uT + npcSlot * 1.1) % 4.1 < 0.13,
          facingYaw: yaw,
          headYaw: a.headYaw ?? Math.sin(uT * 0.65 + npcSlot) * 0.12,
          headPitch: a.headPitch ?? 0,
          scale: a.scale ?? 0.95,
          isGreeting: Boolean(a.isGreeting),
          bobOffset: npcSlot * 1.35,
          jumpZ,
          jumpVy,
          dt: stepDt,
          moveSpeed: actorMoving ? (a.isSprinting ? 1.45 : 0.95) : 0,
          weatherBehavior: a.weatherBehavior ?? 'idle',
        });
        npcSlot++;
      }
    }

    // Subtle color blend on Moon halo when happy/reunited
    if (spec.env === 'finale') {
      _cTempA.setHex(0xffe27a);
      _cTempB.setHex(0xff9ec0);
      this.moonHaloMat.color.copy(_cTempA).lerp(_cTempB, Math.sin(uT * 1.5) * 0.5 + 0.5);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    for (const g of this.ownedGeos) g.dispose();
    this.ownedGeos.length = 0;

    for (const m of this.ownedMats) m.dispose();
    this.ownedMats.length = 0;

    const disposeRigMaterials = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (Array.isArray(m.material)) {
            m.material.forEach((mt) => mt.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    };
    disposeRigMaterials(this.playerRig.root);
    disposeCompanionRig(this.companionRig);
    for (const rig of this.npcRigs) disposeRigMaterials(rig.root);

    this.uniforms.uWorldMapTex.value.dispose();
    this.envRT.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
  }
}
