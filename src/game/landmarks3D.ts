import * as THREE from 'three';
import { createArchMaterialPack } from './architecturePack3D';
import { SharedWorldShaderUniforms, applyArchitectureShader } from './worldShaders3D';
import { WORLD_ANCHORS } from './worldAnchors';

export interface WorldLandmark3D {
  id: string;
  layer: 'surface' | 'sky' | 'dive' | 'glowdeep' | 'moonroad';
  townName?: string;
  offsetTx?: number;
  offsetTz?: number;
  tx: number;
  tz: number;
  group: THREE.Group;
  update?: (t: number) => void;
}

export function buildAllLandmarks3D(
  parentGroup: THREE.Group,
  ownedGeos: THREE.BufferGeometry[],
  ownedMats: THREE.Material[],
  uniforms: SharedWorldShaderUniforms
): WorldLandmark3D[] {
  const list: WorldLandmark3D[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };
  const add = (lm: Omit<WorldLandmark3D, 'group'> & { group: THREE.Group }) => {
    lm.group.visible = false;
    parentGroup.add(lm.group);
    list.push(lm);
  };

  const pack = createArchMaterialPack(uniforms, trackMat);
  const stoneMat = pack.masonry;
  const marbleMat = pack.marble;
  const darkSlateMat = pack.darkSlate;
  const woodMat = pack.timber;
  const goldMat = pack.gold;

  // Helper for shader-backed landmark accent materials
  const mkArchMat = (
    color: number,
    style: 'plaster' | 'shingles' | 'masonry' | 'timber' | 'marble' | 'crystal',
    extra: Partial<THREE.MeshStandardMaterialParameters> = {}
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
    applyArchitectureShader(m, uniforms, style);
    return trackMat(m);
  };

  // ==================== SURFACE ARCHIPELAGO LANDMARKS ====================

  // 1. Wildflower Mill (Honeycomb Hills) — Stone & timber mill with timber catwalk, spinning lattice sails, grain annex & honey barrels
  {
    const g = new THREE.Group();
    const creamMat = mkArchMat(0xfff1cf, 'plaster', { roughness: 0.78 });
    const roofMat = pack.shingleCoral;
    const sailMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.55, side: THREE.DoubleSide }));
    const flowerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffc64d, roughness: 0.5 }));

    const apron = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.58, 1.72, 0.16, 12)), stoneMat);
    apron.position.y = 0.08;
    apron.receiveShadow = true;

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.06, 1.24, 0.72, 10)), stoneMat);
    base.position.y = 0.44;
    base.castShadow = true;

    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.7, 1.02, 2.08, 10)), creamMat);
    body.position.y = 1.74;
    body.castShadow = true;

    // Timber belt & mid catwalk balcony
    const catwalk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.18, 1.12, 0.14, 10)), woodMat);
    catwalk.position.y = 1.26;
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.34, 6));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const p = new THREE.Mesh(postGeo, woodMat);
      p.position.set(Math.cos(a) * 1.1, 1.48, Math.sin(a) * 1.1);
      g.add(p);
    }

    const cap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.96, 0.98, 10)), roofMat);
    cap.position.y = 3.24;
    cap.castShadow = true;

    const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.72, 0.16)), woodMat);
    door.position.set(0, 0.52, 1.12);
    const millWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.32, 0.12)), pack.warmWindow);
    millWin.position.set(0, 1.72, 0.94);

    // Side grain annex & honey barrels
    const annex = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.78, 0.88)), creamMat);
    annex.position.set(-1.12, 0.52, -0.2);
    annex.castShadow = true;
    const annexRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 0.45, 4)), roofMat);
    annexRoof.position.set(-1.12, 1.12, -0.2);
    annexRoof.rotation.y = Math.PI / 4;

    const barrelGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.16, 0.38, 10));
    for (const [bx, bz] of [[1.18, 0.55], [1.38, 0.2], [-0.95, 0.88]]) {
      const bar = new THREE.Mesh(barrelGeo, woodMat);
      bar.position.set(bx, 0.34, bz);
      g.add(bar);
    }
    const hivePot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 8, 6)), flowerMat);
    hivePot.position.set(1.18, 0.62, 0.55);

    const rotor = new THREE.Group();
    rotor.position.set(0, 2.38, 0.92);
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 10)), woodMat);
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);

    const sparGeo = trackGeo(new THREE.BoxGeometry(0.11, 2.6, 0.09));
    const sparA = new THREE.Mesh(sparGeo, woodMat);
    const sparB = new THREE.Mesh(sparGeo, woodMat);
    sparB.rotation.z = Math.PI / 2;
    rotor.add(sparA, sparB);

    const clothGeo = trackGeo(new THREE.PlaneGeometry(0.46, 1.06));
    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2;
      const sail = new THREE.Mesh(clothGeo, sailMat);
      sail.position.set(Math.cos(ang) * 0.74 - Math.sin(ang) * 0.24, Math.sin(ang) * 0.74 + Math.cos(ang) * 0.24, 0.04);
      sail.rotation.z = ang + Math.PI / 2;
      rotor.add(sail);
    }

    g.add(apron, base, body, catwalk, cap, door, millWin, annex, annexRoof, hivePot, rotor);
    add({
      id: 'wildflower_mill',
      layer: 'surface',
      townName: 'Wildflower Mill',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.wildflowerMill.tx,
      tz: WORLD_ANCHORS.towns.wildflowerMill.ty,
      group: g,
      update: (t) => {
        rotor.rotation.z = -t * 1.15;
      },
    });
  }

  // 2. Tidepool Lighthouse (Tidepool Haven) — Coastal seawall pier, keeper's cottage annex, striped stone tower & rotating dual beam
  {
    const g = new THREE.Group();
    const coralRedMat = mkArchMat(0xf25f7c, 'masonry', { roughness: 0.58 });
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xdff8ff, roughness: 0.08, transparent: true, opacity: 0.45, depthWrite: false })
    );
    const beamMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffe88c, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
    );

    const seawall = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.48, 1.68, 0.28, 12)), stoneMat);
    seawall.position.y = 0.14;
    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.06, 1.24, 0.42, 10)), stoneMat);
    plinth.position.y = 0.42;
    const t1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.76, 0.92, 0.88, 14)), marbleMat);
    t1.position.y = 1.04;
    const t2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.64, 0.76, 0.88, 14)), coralRedMat);
    t2.position.y = 1.88;
    const t3 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.52, 0.64, 0.78, 14)), marbleMat);
    t3.position.y = 2.68;
    const deck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.78, 0.68, 0.16, 14)), darkSlateMat);
    deck.position.y = 3.12;
    const rail = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.04, 6, 20)), darkSlateMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 3.36;

    const lanternGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.44, 0.44, 0.58, 14)), glassMat);
    lanternGlass.position.y = 3.48;
    const core = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 12, 8)), goldMat);
    core.position.y = 3.48;
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.64, 0.62, 14)), coralRedMat);
    roof.position.y = 4.04;

    // Keeper's boat-shed annex & wooden pier
    const shed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 0.68, 0.86)), pack.plaster);
    shed.position.set(-1.08, 0.52, 0.15);
    const shedRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.74, 0.42, 4)), pack.shingleCoral);
    shedRoof.position.set(-1.08, 1.06, 0.15);
    shedRoof.rotation.y = Math.PI / 4;
    const pier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.12, 1.25)), woodMat);
    pier.position.set(0.15, 0.24, 1.62);

    const beamPivot = new THREE.Group();
    beamPivot.position.y = 3.48;
    const beamGeo = trackGeo(new THREE.ConeGeometry(1.05, 4.8, 14, 1, true));
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 2.45);
    const beamA = new THREE.Mesh(beamGeo, beamMat);
    const beamB = new THREE.Mesh(beamGeo, beamMat);
    beamB.rotation.y = Math.PI;
    beamPivot.add(beamA, beamB);

    plinth.castShadow = true;
    t1.castShadow = true;
    t2.castShadow = true;
    g.add(seawall, plinth, t1, t2, t3, deck, rail, lanternGlass, core, roof, shed, shedRoof, pier, beamPivot);
    add({
      id: 'tidepool_lighthouse',
      layer: 'surface',
      townName: 'Tidepool Haven',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.tidepoolHaven.tx,
      tz: WORLD_ANCHORS.towns.tidepoolHaven.ty,
      group: g,
      update: (t) => {
        beamPivot.rotation.y = t * 0.9;
      },
    });
  }

  // 3. Cinder Hot Springs (Cinder Spas) — Tiered volcanic basalt bath, wooden bath deck, carved spout & glowing lava lanterns
  {
    const g = new THREE.Group();
    const basaltMat = pack.basalt;
    const poolMat = pack.waterPool;
    const lavaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff8b4d,
        emissive: 0xff5a26,
        emissiveIntensity: 0.98,
        roughness: 0.22,
      })
    );
    const steamMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 }));

    const apron = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.78, 1.94, 0.16, 16)), basaltMat);
    apron.position.y = 0.08;
    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.38, 0.28, 10, 22)), basaltMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.26;
    const pool = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.28, 1.28, 0.14, 22)), poolMat);
    pool.position.y = 0.22;

    // Bathhouse timber deck + bamboo privacy screen at rear
    const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 0.14, 0.72)), woodMat);
    deck.position.set(0, 0.2, 1.48);
    const screenMat = mkArchMat(0x88b36b, 'timber', { roughness: 0.7 });
    const screen = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 1.05, 0.14)), screenMat);
    screen.position.set(0, 0.68, -1.52);
    const screenCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.38, 0.14, 0.34)), pack.shingleCoral);
    screenCap.position.set(0, 1.24, -1.52);

    // Carved dragon-stone water spout
    const spoutBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.88, 0.48)), basaltMat);
    spoutBase.position.set(0, 0.56, -1.24);
    const spoutPipe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.14, 0.45)), goldMat);
    spoutPipe.position.set(0, 0.72, -0.95);

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.96, 8));
    const lampGeo = trackGeo(new THREE.SphereGeometry(0.24, 10, 8));
    for (const [lx, lz] of [
      [-1.44, -0.25],
      [1.44, -0.25],
    ]) {
      const p = new THREE.Mesh(postGeo, basaltMat);
      p.position.set(lx, 0.5, lz);
      const bulb = new THREE.Mesh(lampGeo, lavaMat);
      bulb.position.set(lx, 1.08, lz);
      bulb.scale.set(1, 1.35, 1);
      g.add(p, bulb);
    }

    const steamPuffs: THREE.Mesh[] = [];
    const puffGeo = trackGeo(new THREE.SphereGeometry(0.22, 8, 6));
    for (let s = 0; s < 4; s++) {
      const sp = new THREE.Mesh(puffGeo, steamMat);
      g.add(sp);
      steamPuffs.push(sp);
    }

    g.add(apron, rim, pool, deck, screen, screenCap, spoutBase, spoutPipe);
    add({
      id: 'cinder_springs',
      layer: 'surface',
      townName: 'Cinder Spas',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.cinderSpas.tx,
      tz: WORLD_ANCHORS.towns.cinderSpas.ty,
      group: g,
      update: (t) => {
        for (let s = 0; s < steamPuffs.length; s++) {
          const ph = (t * 0.48 + s * 0.25) % 1;
          steamPuffs[s].position.set(Math.sin(t + s * 1.9) * 0.48, 0.42 + ph * 1.15, Math.cos(t * 0.9 + s) * 0.4);
          steamPuffs[s].scale.setScalar(0.55 + Math.sin(ph * Math.PI) * 0.85);
        }
      },
    });
  }

  // 4. Lily Opera Pavilion (Lily Pavilion, Mirror Fens) — Sculpted lotus amphitheater + silk dome & golden filigree trim
  {
    const g = new THREE.Group();
    const padMat = mkArchMat(0x3ec47c, 'plaster', { roughness: 0.66 });
    const petalMat = mkArchMat(0xff9ec4, 'marble', { roughness: 0.4 });
    const canopyMat = pack.shinglePlum;

    const pad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.72, 1.82, 0.2, 24)), padMat);
    pad.position.y = 0.1;
    const stageRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.22, 1.28, 0.16, 18)), marbleMat);
    stageRing.position.y = 0.24;

    const petalGeo = trackGeo(new THREE.ConeGeometry(0.3, 0.62, 6));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const pet = new THREE.Mesh(petalGeo, petalMat);
      pet.position.set(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5);
      pet.rotation.z = -Math.cos(a) * 0.62;
      pet.rotation.x = Math.sin(a) * 0.62;
      g.add(pet);
    }
    const colGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.12, 1.55, 8));
    const lantGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const col = new THREE.Mesh(colGeo, marbleMat);
      col.position.set(Math.cos(a) * 0.98, 1.0, Math.sin(a) * 0.98);
      const l = new THREE.Mesh(lantGeo, goldMat);
      l.position.set(Math.cos(a) * 1.08, 1.56, Math.sin(a) * 1.08);
      g.add(col, l);
    }
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.36, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      canopyMat
    );
    dome.position.y = 1.66;
    dome.scale.set(1, 0.72, 1);
    const domeTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.34, 0.06, 8, 24)), goldMat);
    domeTrim.rotation.x = Math.PI / 2;
    domeTrim.position.y = 1.68;
    const finial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.26, 0)), goldMat);
    finial.position.y = 2.86;

    g.add(pad, stageRing, dome, domeTrim, finial);
    add({
      id: 'lily_pavilion',
      layer: 'surface',
      townName: 'Lily Pavilion',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.lilyPavilion.tx,
      tz: WORLD_ANCHORS.towns.lilyPavilion.ty,
      group: g,
      update: (t) => {
        finial.rotation.y = t * 1.1;
      },
    });
  }

  // 5. Aurora Ice Archway (Aurora Station, Aurora Reach) — Carved frost-stone shrine terrace + glowing aurora prism arch
  {
    const g = new THREE.Group();
    const iceMat = pack.crystalCyan;
    const auroraMat = mkArchMat(0x5ff5b8, 'crystal', {
      emissive: 0x38e89e,
      emissiveIntensity: 0.85,
      roughness: 0.18,
    });

    const terrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.65, 1.85, 0.22, 8)), marbleMat);
    terrace.position.y = 0.11;
    const plinthGeo = trackGeo(new THREE.BoxGeometry(0.72, 0.36, 0.72));
    const pierGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.34, 2.02, 6));
    const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.22, 0));
    for (const sx of [-1.1, 1.1]) {
      const pl = new THREE.Mesh(plinthGeo, stoneMat);
      pl.position.set(sx, 0.34, 0);
      const pr = new THREE.Mesh(pierGeo, iceMat);
      pr.position.set(sx, 1.44, 0);
      const sh = new THREE.Mesh(shardGeo, auroraMat);
      sh.position.set(sx * 1.38, 0.42, 0.45);
      sh.scale.set(0.8, 1.8, 0.8);
      g.add(pl, pr, sh);
    }
    const arch = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.1, 0.22, 8, 22, Math.PI)), auroraMat);
    arch.position.y = 2.24;
    const crest = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.32, 0)), auroraMat);
    crest.position.y = 3.55;
    g.add(terrace, arch, crest);

    add({
      id: 'aurora_arch',
      layer: 'surface',
      townName: 'Aurora Station',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.auroraStation.tx,
      tz: WORLD_ANCHORS.towns.auroraStation.ty,
      group: g,
      update: (t) => {
        crest.rotation.y = t * 1.5;
        auroraMat.emissiveIntensity = 0.72 + Math.sin(t * 2.8) * 0.24;
      },
    });
  }

  // 6. Bellwood Great Bell Belfry (Bellwood Treetops, Chime Canopy) — Elevated stone shrine steps + double-eaved timber belfry
  {
    const g = new THREE.Group();
    const roofMat = pack.shingleTeal;

    const stoneDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.3, 1.65)), stoneMat);
    stoneDeck.position.y = 0.15;
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 2.38, 8));
    for (const sx of [-0.98, 0.98]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(sx, 1.34, 0);
      post.castShadow = true;
      g.add(post);
    }
    const beam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.44, 0.24, 0.34)), woodMat);
    beam.position.y = 2.48;
    const roofLower = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.88, 0.62, 4)), roofMat);
    roofLower.position.y = 2.78;
    roofLower.rotation.y = Math.PI / 4;
    const roofUpper = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.38, 0.68, 4)), roofMat);
    roofUpper.position.y = 3.22;
    roofUpper.rotation.y = Math.PI / 4;
    const finial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 0)), goldMat);
    finial.position.y = 3.68;

    const lantGeo = trackGeo(new THREE.SphereGeometry(0.12, 8, 6));
    for (const sx of [-1.18, 1.18]) {
      const l = new THREE.Mesh(lantGeo, pack.warmWindow);
      l.position.set(sx, 2.26, 0.36);
      g.add(l);
    }

    const bellPivot = new THREE.Group();
    bellPivot.position.y = 2.38;
    const bell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.6, 0.82, 14)), goldMat);
    bell.position.y = -0.46;
    const bellRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.58, 0.06, 6, 16)), goldMat);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.y = -0.84;
    const clapper = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 8, 6)), goldMat);
    clapper.position.y = -0.92;
    bellPivot.add(bell, bellRim, clapper);

    g.add(stoneDeck, beam, roofLower, roofUpper, finial, bellPivot);
    add({
      id: 'bellwood_belfry',
      layer: 'surface',
      townName: 'Bellwood Treetops',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.bellwoodTreetops.tx,
      tz: WORLD_ANCHORS.towns.bellwoodTreetops.ty,
      group: g,
      update: (t) => {
        bellPivot.rotation.z = Math.sin(t * 1.9) * 0.16;
      },
    });
  }

  // 7. Dawn Spire Summit Monument (Dawn Spire, East) — Grand marble amphitheater + obelisk colonnade + dual armillary sun halo
  {
    const g = new THREE.Group();
    const step1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.95, 2.15, 0.34, 16)), stoneMat);
    step1.position.y = 0.17;
    const step2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.42, 1.56, 0.32, 16)), marbleMat);
    step2.position.y = 0.5;
    const spire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.68, 3.05, 8)), marbleMat);
    spire.position.y = 2.12;
    spire.castShadow = true;

    const colGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.14, 1.48, 8));
    const capGeo = trackGeo(new THREE.OctahedronGeometry(0.16, 0));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const c = new THREE.Mesh(colGeo, marbleMat);
      c.position.set(Math.cos(a) * 1.28, 1.32, Math.sin(a) * 1.28);
      const cap = new THREE.Mesh(capGeo, goldMat);
      cap.position.set(Math.cos(a) * 1.28, 2.16, Math.sin(a) * 1.28);
      g.add(c, cap);
    }

    const haloGroup = new THREE.Group();
    haloGroup.position.y = 3.96;
    const sunOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.34, 14, 10)), goldMat);
    const haloRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.62, 0.07, 8, 24)), goldMat);
    const haloRing2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.48, 0.05, 8, 20)), marbleMat);
    haloRing2.rotation.y = Math.PI / 2;
    haloGroup.add(sunOrb, haloRing, haloRing2);

    g.add(step1, step2, spire, haloGroup);
    add({
      id: 'dawn_spire_monument',
      layer: 'surface',
      townName: 'Dawn Spire Summit',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.dawnSpireSummit.tx,
      tz: WORLD_ANCHORS.towns.dawnSpireSummit.ty,
      group: g,
      update: (t) => {
        haloGroup.rotation.y = t * 1.25;
        haloRing.rotation.x = Math.sin(t * 0.9) * 0.25;
        haloRing2.rotation.z = t * 1.1;
      },
    });
  }

  // ==================== UNDERSEA REEF LANDMARKS (LAYER 1) ====================

  // 8. Coral Concert Hall (90, 175) — Pearl-marble shell amphitheater with proscenium arch & 9 pulsing organ pipes
  {
    const g = new THREE.Group();
    const shellMat = mkArchMat(0xffe4f0, 'marble', { roughness: 0.38 });
    const coralCols = [0xff6b9e, 0xff9f43, 0xb48cff, 0x52d6c6, 0xff7aa8];
    const pipeMats = coralCols.map((hex) =>
      mkArchMat(hex, 'crystal', { emissive: hex, emissiveIntensity: 0.28, roughness: 0.3 })
    );

    const apron = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.05, 2.22, 0.16, 20)), stoneMat);
    apron.position.y = 0.08;
    const stage = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.78, 1.94, 0.28, 20)), shellMat);
    stage.position.y = 0.24;
    const archShell = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.54, 0.14, 8, 24, Math.PI)), shellMat);
    archShell.position.set(0, 0.4, -0.35);

    const podium = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.44, 0.56, 10)), goldMat);
    podium.position.set(0, 0.62, 0.48);
    const pearl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 12, 10)), marbleMat);
    pearl.position.set(0, 1.1, 0.48);

    const pipes: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const frac = i / 8;
      const ang = -Math.PI * 0.85 + frac * Math.PI * 0.7;
      const h = 0.95 + Math.sin(frac * Math.PI) * 1.48;
      const pipe = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14, 0.2, h, 10)),
        pipeMats[i % pipeMats.length]
      );
      pipe.position.set(Math.cos(ang) * 1.32, 0.36 + h * 0.5, Math.sin(ang) * 1.32);
      g.add(pipe);
      pipes.push(pipe);
    }

    g.add(apron, stage, archShell, podium, pearl);
    add({
      id: 'coral_concert_hall',
      layer: 'dive',
      townName: 'Coral Concert Hall',
      offsetTx: 0,
      offsetTz: 0,
      tx: WORLD_ANCHORS.reef.coralConcertHall.tx,
      tz: WORLD_ANCHORS.reef.coralConcertHall.ty,
      group: g,
      update: (t) => {
        pearl.position.y = 1.1 + Math.sin(t * 2.5) * 0.09;
        for (let i = 0; i < pipes.length; i++) {
          pipes[i].scale.y = 1 + Math.sin(t * 3.4 + i * 0.7) * 0.08;
        }
      },
    });
  }

  // 9. Atoll Sunken Ruins (46, 196) — Mosaic temple courtyard, fluted Corinthian columns, sunken amphorae & glowing tablet
  {
    const g = new THREE.Group();
    const mossStoneMat = mkArchMat(0x7db3b0, 'masonry', { roughness: 0.78 });
    const floor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.26, 2.7)), mossStoneMat);
    floor.position.y = 0.13;
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.3, 0.16, 1.9)), marbleMat);
    step.position.y = 0.32;

    const colGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 1.85, 10));
    const capGeo = trackGeo(new THREE.BoxGeometry(0.48, 0.14, 0.48));
    for (const [cx, cz, tilt] of [
      [-1.02, -0.78, 0],
      [1.02, -0.78, 0],
      [-1.02, 0.78, 0.08],
      [1.02, 0.78, -0.35],
    ]) {
      const col = new THREE.Mesh(colGeo, marbleMat);
      col.position.set(cx, 1.14, cz);
      col.rotation.z = tilt;
      const cap = new THREE.Mesh(capGeo, marbleMat);
      cap.position.set(cx - Math.sin(tilt) * 0.9, 2.04 - Math.abs(tilt) * 0.2, cz);
      cap.rotation.z = tilt;
      g.add(col, cap);
    }
    const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.28, 0.54)), marbleMat);
    lintel.position.set(0, 2.18, -0.78);
    const amphora = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.3, 10, 8)), goldMat);
    amphora.position.set(-0.28, 0.56, 0.12);
    amphora.scale.set(0.9, 1.35, 0.9);
    const tablet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.78, 0.14)), pack.crystalCyan);
    tablet.position.set(0.32, 0.74, -0.15);
    g.add(floor, step, lintel, amphora, tablet);

    add({
      id: 'atoll_sunken_ruins',
      layer: 'dive',
      tx: WORLD_ANCHORS.reef.atollSunkenRuins.tx,
      tz: WORLD_ANCHORS.reef.atollSunkenRuins.ty,
      group: g,
    });
  }

  // 10. Starlit Kelp Trench (178, 176) — Basalt trench rim, swaying tall kelp spires & glowing crystal vein cluster
  {
    const g = new THREE.Group();
    const kelpMat = mkArchMat(0x1fc488, 'plaster', { roughness: 0.52 });
    const crystalMat = pack.crystalCyan;

    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.56, 0.36, 8, 20)), darkSlateMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.18;
    g.add(rim);

    const fronds: THREE.Mesh[] = [];
    const frondGeo = trackGeo(new THREE.ConeGeometry(0.34, 3.0, 8));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const fr = new THREE.Mesh(frondGeo, kelpMat);
      fr.position.set(Math.cos(a) * 1.2, 1.45, Math.sin(a) * 1.2);
      g.add(fr);
      fronds.push(fr);
    }
    const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.36, 0));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const sh = new THREE.Mesh(shardGeo, crystalMat);
      sh.position.set(Math.cos(a) * 0.45, 0.7 + k * 0.16, Math.sin(a) * 0.45);
      sh.scale.set(0.75, 1.95, 0.75);
      g.add(sh);
    }

    add({
      id: 'starlit_kelp_trench',
      layer: 'dive',
      tx: WORLD_ANCHORS.reef.starlitKelpTrench.tx,
      tz: WORLD_ANCHORS.reef.starlitKelpTrench.ty,
      group: g,
      update: (t) => {
        for (let k = 0; k < fronds.length; k++) {
          fronds[k].rotation.z = Math.sin(t * 1.6 + k * 1.1) * 0.16;
          fronds[k].rotation.x = Math.cos(t * 1.3 + k) * 0.12;
        }
      },
    });
  }

  // 11. Driftwood Dive Lagoon (100, 162) — Sunken galleon rib-cage pier + spinning luminous tide portal & pearl orb
  {
    const g = new THREE.Group();
    const ringMat = pack.crystalCyan;

    const dockDeck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.42, 1.54, 0.16, 12)), woodMat);
    dockDeck.position.y = 0.08;
    const torus = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.24, 0.14, 10, 24)), ringMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.28;

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 1.18, 8));
    const buoyGeo = trackGeo(new THREE.SphereGeometry(0.14, 8, 6));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.4;
      const p = new THREE.Mesh(postGeo, woodMat);
      p.position.set(Math.cos(a) * 1.44, 0.58, Math.sin(a) * 1.44);
      const b = new THREE.Mesh(buoyGeo, goldMat);
      b.position.set(Math.cos(a) * 1.44, 1.22, Math.sin(a) * 1.44);
      g.add(p, b);
    }
    const orb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.32, 12, 10)), ringMat);
    orb.position.y = 0.65;
    g.add(dockDeck, torus, orb);

    add({
      id: 'driftwood_dive_lagoon',
      layer: 'dive',
      tx: WORLD_ANCHORS.reef.driftwoodDiveLagoon.tx,
      tz: WORLD_ANCHORS.reef.driftwoodDiveLagoon.ty,
      group: g,
      update: (t) => {
        torus.rotation.z = t * 1.4;
        orb.position.y = 0.65 + Math.sin(t * 2.8) * 0.14;
      },
    });
  }

  // ==================== CIRRUS SKY KINGDOM LANDMARKS (LAYER 2) ====================

  // 12. Cirrus Castle Central Citadel (136, 70) — Grand tiered pearl-marble sky citadel, 4 turret spires & golden sun-dome
  {
    const g = new THREE.Group();
    const skyBlueMat = pack.shingleTeal;
    const roseRoofMat = pack.shingleCoral;

    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.05, 2.3, 0.38, 12)), stoneMat);
    plinth.position.y = 0.19;
    const terrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.68, 1.82, 0.24, 12)), marbleMat);
    terrace.position.y = 0.48;
    const keep = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.18, 1.32, 1.54, 12)), marbleMat);
    keep.position.y = 1.26;
    keep.castShadow = true;
    const gateArch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.85, 0.35)), darkSlateMat);
    gateArch.position.set(0, 0.88, 1.22);
    const mainDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.26, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      skyBlueMat
    );
    mainDome.position.y = 2.02;
    const crown = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 0.88, 8)), goldMat);
    crown.position.y = 3.48;

    const turretGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.32, 1.72, 8));
    const capGeo = trackGeo(new THREE.ConeGeometry(0.4, 0.68, 8));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const tx = Math.cos(a) * 1.54;
      const tz = Math.sin(a) * 1.54;
      const tur = new THREE.Mesh(turretGeo, marbleMat);
      tur.position.set(tx, 1.18, tz);
      const cap = new THREE.Mesh(capGeo, k % 2 === 0 ? roseRoofMat : skyBlueMat);
      cap.position.set(tx, 2.34, tz);
      g.add(tur, cap);
    }

    g.add(plinth, terrace, keep, gateArch, mainDome, crown);
    add({
      id: 'cirrus_citadel',
      layer: 'sky',
      tx: WORLD_ANCHORS.sky.cirrusCastle.tx,
      tz: WORLD_ANCHORS.sky.cirrusCastle.ty,
      group: g,
      update: (t) => {
        crown.rotation.y = t * 0.9;
      },
    });
  }

  // 13. Nimbus Market Bazaar (88, 88) — Multi-tiered Cloudstone Bazaar, 5 striped canvas stalls, woven rug, overhead lantern garlands & floating finial
  {
    const g = new THREE.Group();
    const stepOuter = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.25, 3.48, 0.16, 16)), stoneMat);
    stepOuter.position.y = 0.08;
    stepOuter.receiveShadow = true;
    const plaza = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.75, 2.9, 0.16, 16)), marbleMat);
    plaza.position.y = 0.2;
    plaza.receiveShadow = true;
    const rugMat = mkArchMat(0xc4568e, 'shingles', { roughness: 0.72 });
    const rugTrimMat = mkArchMat(0xf7c95c, 'shingles', { roughness: 0.55 });
    const centralRug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.38, 0.04, 16)), rugMat);
    centralRug.position.y = 0.29;
    const rugRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.36, 0.045, 6, 24)), rugTrimMat);
    rugRing.rotation.x = Math.PI / 2;
    rugRing.position.y = 0.31;
    g.add(stepOuter, plaza, centralRug, rugRing);

    const awningCols = [0xff7aa8, 0x6ac7ff, 0xffc64d, 0x7bd88f, 0xb588ff];
    const awningMats = awningCols.map((hex) => mkArchMat(hex, 'shingles', { roughness: 0.52 }));
    const creamMat = mkArchMat(0xfff9ef, 'plaster', { roughness: 0.6 });

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.065, 1.12, 6));
    const counterGeo = trackGeo(new THREE.BoxGeometry(1.28, 0.44, 0.56));
    const slatGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.07, 0.84));
    const crateGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.22, 0.24));

    const stalls: [number, number, number][] = [
      [-1.78, -0.52, 0.72],
      [-1.12, -1.64, 0.36],
      [0, -2.02, 0],
      [1.12, -1.64, -0.36],
      [1.78, -0.52, -0.72],
    ];
    stalls.forEach(([sx, sz, rotY], idx) => {
      const sg = new THREE.Group();
      sg.position.set(sx, 0.26, sz);
      sg.rotation.y = rotY;
      const counter = new THREE.Mesh(counterGeo, woodMat);
      counter.position.y = 0.22;
      counter.castShadow = true;
      for (let s = 0; s < 5; s++) {
        const slat = new THREE.Mesh(slatGeo, s % 2 === 0 ? awningMats[idx % awningMats.length] : creamMat);
        slat.position.set(-0.52 + s * 0.26, 1.16, 0.06);
        slat.rotation.x = 0.2;
        slat.castShadow = true;
        sg.add(slat);
      }
      const pL = new THREE.Mesh(postGeo, woodMat);
      pL.position.set(-0.56, 0.62, -0.2);
      const pR = new THREE.Mesh(postGeo, woodMat);
      pR.position.set(0.56, 0.62, -0.2);
      const crate = new THREE.Mesh(crateGeo, goldMat);
      crate.position.set(0.26, 0.55, 0.04);
      const jar = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.12, 8, 6)),
        idx % 2 === 0 ? pack.crystalCyan : pack.crystalViolet
      );
      jar.scale.set(0.92, 1.28, 0.92);
      jar.position.set(-0.26, 0.56, 0.04);
      const stallLamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 7, 5)), pack.warmWindow);
      stallLamp.position.set(0, 1.0, 0.42);
      sg.add(counter, pL, pR, crate, jar, stallLamp);
      g.add(sg);
    });

    // Overhead entrance lantern posts & garland arch
    const archPostGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.09, 1.95, 7));
    for (const ax of [-1.45, 1.45]) {
      const ap = new THREE.Mesh(archPostGeo, woodMat);
      ap.position.set(ax, 1.16, 1.38);
      ap.castShadow = true;
      const finial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), goldMat);
      finial.position.set(ax, 2.22, 1.38);
      g.add(ap, finial);
    }
    const crossBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.05, 0.08, 0.09)), woodMat);
    crossBeam.position.set(0, 2.08, 1.38);
    g.add(crossBeam);

    const garlandOrbGeo = trackGeo(new THREE.SphereGeometry(0.09, 7, 5));
    for (let i = -2; i <= 2; i++) {
      const orb = new THREE.Mesh(garlandOrbGeo, i % 2 === 0 ? pack.warmWindow : pack.crystalCyan);
      orb.position.set(i * 0.52, 1.92 - (2 - Math.abs(i)) * 0.06, 1.38);
      g.add(orb);
    }

    // Central Hovering Cloud-Lantern Shrine & Spinning Finial
    const centerPed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.54, 0.36, 10)), marbleMat);
    centerPed.position.y = 0.46;
    const centerLantern = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.32, 1)), goldMat);
    centerLantern.position.y = 1.24;
    const lanternHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.46, 0.045, 7, 20)), pack.crystalCyan);
    lanternHalo.rotation.x = Math.PI / 2;
    lanternHalo.position.y = 1.24;
    g.add(centerPed, centerLantern, lanternHalo);

    add({
      id: 'nimbus_market',
      layer: 'sky',
      tx: WORLD_ANCHORS.sky.nimbusMarket.tx,
      tz: WORLD_ANCHORS.sky.nimbusMarket.ty,
      group: g,
      update: (t) => {
        centerLantern.position.y = 1.24 + Math.sin(t * 2.2) * 0.1;
        centerLantern.rotation.y = t * 0.8;
        lanternHalo.position.y = centerLantern.position.y;
        lanternHalo.rotation.z = t * 0.6;
      },
    });
  }

  // 14. Sunrise Updraft Spire (215, 120) — Marble wind altar, golden obelisk & counter-rotating brass wind rings
  {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.28, 1.48, 0.36, 12)), marbleMat);
    ped.position.y = 0.18;
    const obelisk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.68, 2.85, 8)), goldMat);
    obelisk.position.y = 1.72;
    const ringA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.02, 0.08, 8, 24)), goldMat);
    ringA.position.y = 1.42;
    ringA.rotation.x = Math.PI / 2;
    const ringB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.76, 0.07, 8, 22)), marbleMat);
    ringB.position.y = 2.24;
    ringB.rotation.x = Math.PI / 2;
    const orb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.34, 0)), goldMat);
    orb.position.y = 3.5;
    g.add(ped, obelisk, ringA, ringB, orb);

    add({
      id: 'sunrise_updraft_spire',
      layer: 'sky',
      tx: WORLD_ANCHORS.sky.sunriseUpdraftSpire.tx,
      tz: WORLD_ANCHORS.sky.sunriseUpdraftSpire.ty,
      group: g,
      update: (t) => {
        ringA.rotation.z = t * 1.7;
        ringB.rotation.z = -t * 2.2;
        ringA.position.y = 1.42 + Math.sin(t * 2.5) * 0.18;
        ringB.position.y = 2.24 + Math.cos(t * 2.5) * 0.18;
        orb.rotation.y = t * 1.5;
      },
    });
  }

  // ==================== GLOWDEEP CAVERNS LANDMARKS (LAYER 3) ====================

  // 15. Spore Grotto Gondola Pier (62, 145) — Timber canal wharf, glowing spore-lamps & velvet-prow gondola
  {
    const g = new THREE.Group();
    const mintGlowMat = mkArchMat(0x64f5c1, 'crystal', { emissive: 0x38e8b8, emissiveIntensity: 0.92 });
    const gondolaMat = mkArchMat(0xc298ff, 'timber', { roughness: 0.35, metalness: 0.2 });

    const dock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.3, 0.2, 1.35)), woodMat);
    dock.position.set(0, 0.28, -0.45);
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.11, 0.8, 6));
    for (const [px, pz] of [
      [-0.98, -1.0],
      [0.98, -1.0],
      [-0.98, 0.08],
      [0.98, 0.08],
    ]) {
      const p = new THREE.Mesh(postGeo, woodMat);
      p.position.set(px, 0.38, pz);
      g.add(p);
    }
    const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 10, 8)), mintGlowMat);
    lamp.position.set(-0.98, 1.02, 0.08);
    const lampR = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 10, 8)), mintGlowMat);
    lampR.position.set(0.98, 1.02, 0.08);

    const boat = new THREE.Group();
    boat.position.set(0.2, 0.16, 1.02);
    const hull = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.65, 0.28, 0.64)), gondolaMat);
    const prow = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.3, 0.62, 6)), goldMat);
    prow.rotation.z = -Math.PI / 2;
    prow.position.set(1.0, 0.24, 0);
    const lanternBoat = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 8, 6)), mintGlowMat);
    lanternBoat.position.set(0.92, 0.6, 0);
    boat.add(hull, prow, lanternBoat);

    g.add(dock, lamp, lampR, boat);
    add({
      id: 'spore_grotto_pier',
      layer: 'glowdeep',
      tx: WORLD_ANCHORS.glowdeep.sporeGrotto.tx,
      tz: WORLD_ANCHORS.glowdeep.sporeGrotto.ty,
      group: g,
      update: (t) => {
        boat.position.y = 0.16 + Math.sin(t * 2.1) * 0.07;
        boat.rotation.z = Math.sin(t * 1.6) * 0.06;
      },
    });
  }

  // 16. Magma Geode Vault (128, 215) — Cracked basalt geode shrine + magma basin + ring of amethyst & amber crystals
  {
    const g = new THREE.Group();
    const basaltMat = pack.basalt;
    const amberMat = mkArchMat(0xffae4d, 'crystal', { emissive: 0xff6b24, emissiveIntensity: 0.92 });
    const amethystMat = pack.crystalViolet;

    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.52, 0.34, 8, 20)), basaltMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;
    const pool = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.38, 0.12, 20)), amberMat);
    pool.position.y = 0.16;

    const shardGeo = trackGeo(new THREE.ConeGeometry(0.34, 1.58, 6));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const crystal = new THREE.Mesh(shardGeo, k % 2 === 0 ? amberMat : amethystMat);
      crystal.position.set(Math.cos(a) * 1.38, 0.78, Math.sin(a) * 1.38);
      crystal.rotation.z = -Math.cos(a) * 0.38;
      crystal.rotation.x = Math.sin(a) * 0.38;
      g.add(crystal);
    }

    g.add(rim, pool);
    add({
      id: 'magma_geode_vault',
      layer: 'glowdeep',
      tx: WORLD_ANCHORS.glowdeep.magmaGeode.tx,
      tz: WORLD_ANCHORS.glowdeep.magmaGeode.ty,
      group: g,
    });
  }

  // 17. Prism Ice Grotto (198, 68) — Octagonal frost-stone sanctum + hexagonal prism columns & levitating crystal heart
  {
    const g = new THREE.Group();
    const prismCyanMat = pack.crystalCyan;
    const prismVioletMat = pack.crystalViolet;

    const dais = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.56, 1.72, 0.28, 8)), stoneMat);
    dais.position.y = 0.14;
    const colGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.3, 1.98, 6));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const p = new THREE.Mesh(colGeo, k % 2 === 0 ? prismCyanMat : prismVioletMat);
      p.position.set(Math.cos(a) * 1.12, 1.1, Math.sin(a) * 1.12);
      p.rotation.z = Math.cos(a) * 0.14;
      g.add(p);
    }
    const core = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.46, 0)), prismCyanMat);
    core.position.y = 1.78;
    g.add(dais, core);

    add({
      id: 'prism_ice_grotto',
      layer: 'glowdeep',
      tx: WORLD_ANCHORS.glowdeep.prismIce.tx,
      tz: WORLD_ANCHORS.glowdeep.prismIce.ty,
      group: g,
      update: (t) => {
        core.rotation.y = t * 1.3;
        core.position.y = 1.78 + Math.sin(t * 2.2) * 0.14;
      },
    });
  }

  // ==================== THE MOON ROAD LANDMARKS (LAYER 4) ====================

  // 18. Twin Stars Gazebo (90, 72) — Circular veined marble pavilion with 6 fluted pillars & orbiting twin star crystals
  {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.58, 1.72, 0.22, 16)), marbleMat);
    floor.position.y = 0.11;
    const colGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.12, 1.7, 8));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const c = new THREE.Mesh(colGeo, marbleMat);
      c.position.set(Math.cos(a) * 1.14, 0.96, Math.sin(a) * 1.14);
      g.add(c);
    }
    const crownRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.16, 0.1, 8, 24)), goldMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.84;

    const starPivot = new THREE.Group();
    starPivot.position.y = 2.38;
    const starGeo = trackGeo(new THREE.OctahedronGeometry(0.28, 0));
    const starA = new THREE.Mesh(starGeo, goldMat);
    starA.position.x = -0.5;
    const starB = new THREE.Mesh(starGeo, goldMat);
    starB.position.x = 0.5;
    starPivot.add(starA, starB);

    g.add(floor, crownRing, starPivot);
    add({
      id: 'twin_stars_gazebo',
      layer: 'moonroad',
      tx: WORLD_ANCHORS.moonroad.twinStars.tx,
      tz: WORLD_ANCHORS.moonroad.twinStars.ty,
      group: g,
      update: (t) => {
        starPivot.rotation.y = t * 1.35;
        starA.rotation.y = t * 2;
        starB.rotation.y = -t * 2;
      },
    });
  }

  // 19. Shrine of the Unsung Verse (185, 112) — Crescent-stepped altar, twin rune steles & rose-gold harmonic gimbal
  {
    const g = new THREE.Group();
    const roseMat = mkArchMat(0xff80b0, 'crystal', { emissive: 0xd94886, emissiveIntensity: 0.45 });
    const altar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.54, 0.3, 12)), marbleMat);
    altar.position.y = 0.15;
    const steleGeo = trackGeo(new THREE.BoxGeometry(0.36, 1.78, 0.26));
    const sL = new THREE.Mesh(steleGeo, marbleMat);
    sL.position.set(-0.84, 1.1, 0);
    const sR = new THREE.Mesh(steleGeo, marbleMat);
    sR.position.set(0.84, 1.1, 0);

    const ringOuter = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.6, 0.065, 8, 22)), roseMat);
    ringOuter.position.y = 1.56;
    const noteCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), goldMat);
    noteCore.position.y = 1.56;
    g.add(altar, sL, sR, ringOuter, noteCore);

    add({
      id: 'unsung_verse_shrine',
      layer: 'moonroad',
      tx: WORLD_ANCHORS.moonroad.unsungShrine.tx,
      tz: WORLD_ANCHORS.moonroad.unsungShrine.ty,
      group: g,
      update: (t) => {
        ringOuter.rotation.y = t * 1.4;
        ringOuter.rotation.x = Math.sin(t * 0.9) * 0.45;
        noteCore.rotation.y = -t * 1.9;
      },
    });
  }

  // 20. The Edge of Silence / Dusk's Watchtower (235, 135) — Midnight-slate observatory spire + balcony + pale beacon lantern
  {
    const g = new THREE.Group();
    const paleGlowMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffe8a6, emissive: 0xffd268, emissiveIntensity: 0.84, roughness: 0.2 })
    );
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.06, 1.28, 0.52, 12)), darkSlateMat);
    base.position.y = 0.26;
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.72, 0.92, 2.08, 12)), darkSlateMat);
    shaft.position.y = 1.56;
    const balcony = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.94, 0.78, 0.2, 12)), stoneMat);
    balcony.position.y = 2.64;
    const lantern = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.3, 12, 10)), paleGlowMat);
    lantern.position.y = 3.06;
    const spireRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.88, 1.04, 12)), pack.shinglePlum);
    spireRoof.position.y = 3.8;

    g.add(base, shaft, balcony, lantern, spireRoof);
    add({
      id: 'edge_of_silence_tower',
      layer: 'moonroad',
      tx: WORLD_ANCHORS.moonroad.edgeOfSilence.tx,
      tz: WORLD_ANCHORS.moonroad.edgeOfSilence.ty,
      group: g,
      update: (t) => {
        paleGlowMat.emissiveIntensity = 0.68 + Math.sin(t * 2.1) * 0.24;
      },
    });
  }

  // ==================== NEW EXPANDED ARCHIPELAGO & REALM LANDMARKS ====================

  // 21. Sapphire Beacon Tower (Sapphire Haven, Western Bluff)
  {
    const g = new THREE.Group();
    const cobaltMat = mkArchMat(0x2f6ec4, 'masonry', { roughness: 0.45 });
    const crystalBlueMat = pack.crystalCyan;

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.42, 1.65, 0.42, 12)), stoneMat);
    base.position.y = 0.21;
    const shaftA = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.84, 1.05, 1.32, 12)), marbleMat);
    shaftA.position.y = 1.06;
    const shaftB = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.84, 1.24, 12)), cobaltMat);
    shaftB.position.y = 2.28;
    const deck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.92, 0.78, 0.18, 12)), stoneMat);
    deck.position.y = 2.98;
    const crystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.38, 0)), crystalBlueMat);
    crystal.position.y = 3.56;
    const cap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.76, 0.74, 12)), cobaltMat);
    cap.position.y = 4.24;

    const waveArch = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.58, 0.14, 8, 22, Math.PI)), cobaltMat);
    waveArch.position.set(0, 0.35, 1.15);
    g.add(base, shaftA, shaftB, deck, crystal, cap, waveArch);
    add({
      id: 'sapphire_beacon',
      layer: 'surface',
      townName: 'Sapphire Haven',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.sapphireHaven.tx,
      tz: WORLD_ANCHORS.towns.sapphireHaven.ty,
      group: g,
      update: (t) => {
        crystal.rotation.y = t * 1.4;
      },
    });
  }

  // 22. Maple Crossing Vermilion Pagoda (Maple Crossing)
  {
    const g = new THREE.Group();
    const vermilionMat = mkArchMat(0xd94f43, 'timber', { roughness: 0.55 });
    const leafMat = mkArchMat(0xf2853d, 'shingles', { roughness: 0.62 });

    const dais = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.3, 2.4)), stoneMat);
    dais.position.y = 0.15;
    const colGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 1.48, 8));
    for (const [cx, cz] of [
      [-0.85, -0.75],
      [0.85, -0.75],
      [-0.85, 0.75],
      [0.85, 0.75],
    ]) {
      const c = new THREE.Mesh(colGeo, vermilionMat);
      c.position.set(cx, 1.0, cz);
      g.add(c);
    }
    const eave1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.95, 0.56, 4)), leafMat);
    eave1.position.y = 1.98;
    eave1.rotation.y = Math.PI / 4;
    const tier2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.18, 0.85, 1.18)), marbleMat);
    tier2.position.y = 2.38;
    const eave2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.45, 0.62, 4)), leafMat);
    eave2.position.y = 3.04;
    eave2.rotation.y = Math.PI / 4;
    const spire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.1, 0.55, 8)), goldMat);
    spire.position.y = 3.55;

    const chimePivot = new THREE.Group();
    chimePivot.position.set(0, 1.72, 1.12);
    const chime = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.14, 0.32, 8)), goldMat);
    chime.position.y = -0.22;
    chimePivot.add(chime);

    g.add(dais, eave1, tier2, eave2, spire, chimePivot);
    add({
      id: 'maple_pagoda',
      layer: 'surface',
      townName: 'Maple Crossing',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.mapleCrossing.tx,
      tz: WORLD_ANCHORS.towns.mapleCrossing.ty,
      group: g,
      update: (t) => {
        chimePivot.rotation.z = Math.sin(t * 2.4) * 0.22;
      },
    });
  }

  // 23. Starfall Brass Astrolabe Terrace (Starfall Observatory)
  {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.85, 2.05, 0.28, 16)), stoneMat);
    deck.position.y = 0.14;
    const inner = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.22, 1.32, 0.22, 16)), marbleMat);
    inner.position.y = 0.36;
    const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.48, 0.85, 10)), marbleMat);
    ped.position.y = 0.88;

    const gimbal = new THREE.Group();
    gimbal.position.y = 2.02;
    const outerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.95, 0.07, 8, 28)), goldMat);
    const midRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.055, 8, 24)), goldMat);
    midRing.rotation.y = Math.PI / 2;
    const starCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.3, 0)), pack.crystalViolet);
    gimbal.add(outerRing, midRing, starCore);

    g.add(deck, inner, ped, gimbal);
    add({
      id: 'starfall_astrolabe',
      layer: 'surface',
      townName: 'Starfall Observatory',
      offsetTx: 0,
      offsetTz: -4.4,
      tx: WORLD_ANCHORS.towns.starfallObservatory.tx,
      tz: WORLD_ANCHORS.towns.starfallObservatory.ty,
      group: g,
      update: (t) => {
        outerRing.rotation.y = t * 0.85;
        outerRing.rotation.x = Math.sin(t * 0.6) * 0.4;
        midRing.rotation.z = -t * 1.15;
        starCore.rotation.y = t * 1.9;
      },
    });
  }

  // 24. Aether Wind Harp Sanctuary (Sky Kingdom West)
  {
    const g = new THREE.Group();
    const platform = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.75, 1.92, 0.24, 14)), marbleMat);
    platform.position.y = 0.12;
    const crescent = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.28, 0.16, 10, 24, Math.PI * 1.3)), goldMat);
    crescent.position.y = 1.65;
    crescent.rotation.z = -Math.PI * 0.15;
    const stringGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6));
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(stringGeo, pack.crystalCyan);
      s.position.set(i * 0.24, 1.48, 0);
      g.add(s);
    }
    const jewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.34, 0)), pack.crystalCyan);
    jewel.position.y = 2.95;
    g.add(platform, crescent, jewel);
    add({
      id: 'aether_wind_harp',
      layer: 'sky',
      tx: WORLD_ANCHORS.sky.aetherGarden.tx,
      tz: WORLD_ANCHORS.sky.aetherGarden.ty,
      group: g,
      update: (t) => {
        jewel.rotation.y = t * 1.5;
        jewel.position.y = 2.95 + Math.sin(t * 2.6) * 0.12;
      },
    });
  }

  return list;
}
