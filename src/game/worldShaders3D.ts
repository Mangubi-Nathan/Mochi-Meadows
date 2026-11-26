/**
 * Mochi Meadows 2 — Custom GLSL Shaders & Organic 3D Procedural Geometry
 * Provides atmospheric Sky Dome & volumetric cloud shaders, multi-wave Fresnel sea &
 * Glowdeep bioluminescent canal shaders, biome-aware micro-bumped terrain shaders
 * (cobblestones, sand ripples, snow glints, reef caustics, Glowdeep mycelium/cinder),
 * foliage wind-sway, trampled grass blades, wildlife wings, and gnarled multi-branch trees.
 */

import * as THREE from 'three';
import { WORLD_GRID_SIZE } from './worldAnchors';

export interface SharedWorldShaderUniforms {
  uTime: { value: number };
  uPlayerPos: { value: THREE.Vector3 };
  uFocusPos: { value: THREE.Vector3 };
  uLayer: { value: number }; // 0=surface, 1=sky, 2=dive, 3=glowdeep, 4=moonroad
  uVibrant: { value: number };
  uSeason: { value: number }; // 0=spring, 1=summer, 2=autumn, 3=winter
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSkyZenith: { value: THREE.Color };
  uSkyHorizon: { value: THREE.Color };
  uSkyBottom: { value: THREE.Color };
  uHorizonFogColor: { value: THREE.Color };
  uNightFactor: { value: number };
  uSunsetFactor: { value: number };
  uWeatherMode: { value: number }; // 0=clear, 1=drizzle, 2=snow, 3=stardust, 4=aurora
  uWorldMapTex: { value: THREE.DataTexture };
  uWorldMapSize: { value: number };
}

function createFallbackWorldMapTex(): THREE.DataTexture {
  const data = new Uint8Array([90, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createWorldShaderUniforms(): SharedWorldShaderUniforms {
  return {
    uTime: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3() },
    uFocusPos: { value: new THREE.Vector3() },
    uLayer: { value: 0 },
    uVibrant: { value: 1 },
    uSeason: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.45, 0.78, 0.42).normalize() },
    uSunColor: { value: new THREE.Color('#fff4d0') },
    uSkyZenith: { value: new THREE.Color('#3b8be0') },
    uSkyHorizon: { value: new THREE.Color('#bce9ff') },
    uSkyBottom: { value: new THREE.Color('#1d6ca3') },
    uHorizonFogColor: { value: new THREE.Color('#bce9ff') },
    uNightFactor: { value: 0 },
    uSunsetFactor: { value: 0 },
    uWeatherMode: { value: 0 },
    uWorldMapTex: { value: createFallbackWorldMapTex() },
    uWorldMapSize: { value: WORLD_GRID_SIZE },
  };
}

/**
 * Atmospheric Procedural Sky Dome Material:
 * - Surface: Rayleigh zenith-horizon gradient, glowing Sun/Moon + Mie halo, drifting cumulus cloud bands, night stars
 * - Sky Kingdom: Radiant cerulean dome above + sunlit rolling cloud-sea floor beneath floating islands
 * - Coral Reef Dive: Underwater Snell's window + shimmering surface caustics overhead -> deep sapphire abyss below
 * - Glowdeep: Vaulted cavern gloom with softly pulsing bioluminescent teal/amethyst mycelium mist
 * - Moon Road: Deep indigo starfield + sweeping luminous Milky Way nebula ribbon
 */
export function createSkyDomeMaterial(uniforms: SharedWorldShaderUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: uniforms.uTime,
      uLayer: uniforms.uLayer,
      uVibrant: uniforms.uVibrant,
      uSunDir: uniforms.uSunDir,
      uSunColor: uniforms.uSunColor,
      uSkyZenith: uniforms.uSkyZenith,
      uSkyHorizon: uniforms.uSkyHorizon,
      uSkyBottom: uniforms.uSkyBottom,
      uNightFactor: uniforms.uNightFactor,
      uSunsetFactor: uniforms.uSunsetFactor,
      uWeatherMode: uniforms.uWeatherMode,
    },
    vertexShader: /* glsl */ `
      varying vec3 vSkyDir;
      void main() {
        vSkyDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLayer;
      uniform float uVibrant;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyZenith;
      uniform vec3 uSkyHorizon;
      uniform vec3 uSkyBottom;
      uniform float uNightFactor;
      uniform float uSunsetFactor;
      uniform float uWeatherMode;
      varying vec3 vSkyDir;

      float skyHash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float skyNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), u.x),
          mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float skyFbm(vec2 p) {
        float v = 0.0;
        float a = 0.52;
        for (int i = 0; i < 4; i++) {
          v += a * skyNoise(p);
          p = p * 2.04 + vec2(17.3, -9.1);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vSkyDir + vec3(0.0, 1e-6, 0.0));
        vec3 sunD = normalize(uSunDir + vec3(0.0, 1e-6, 0.0));
        float y = dir.y;
        vec3 col = uSkyHorizon;

        if (uLayer > 1.5 && uLayer < 2.5) {
          // --- CORAL REEF DIVE: Sunlit ocean surface looking UP, deep turquoise-cobalt looking DOWN ---
          float upGrad = smoothstep(-0.25, 0.65, y);
          col = mix(uSkyBottom, uSkyHorizon, upGrad);
          col = mix(col, uSkyZenith, smoothstep(0.28, 0.96, y));

          if (y > 0.02) {
            vec2 surfUV = dir.xz / max(0.18, y + 0.08);
            float w1 = sin(surfUV.x * 2.2 + uTime * 1.45 + cos(surfUV.y * 1.6 - uTime * 0.9));
            float w2 = cos(surfUV.y * 2.4 - uTime * 1.2 + sin(surfUV.x * 1.8 + uTime * 1.1));
            float causticSurf = pow(clamp(1.0 - abs(w1 + w2) * 0.42, 0.0001, 1.0), 2.8);
            float snell = smoothstep(0.12, 0.85, y);
            col += vec3(0.32, 0.78, 0.88) * causticSurf * snell * 0.55;
            float sunSpot = pow(max(dot(dir, sunD), 0.0001), 12.0);
            col += vec3(0.55, 0.95, 1.0) * sunSpot * 0.65;
          }
        } else if (uLayer > 2.5 && uLayer < 3.5) {
          // --- GLOWDEEP CAVERNS: Bioluminescent subterranean dome & ceiling veins ---
          float elev = abs(y);
          col = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.75, elev));
          if (y < 0.0) col = mix(col, uSkyBottom, smoothstep(0.0, 0.65, -y));

          vec2 cavUV = dir.xz / max(0.22, abs(y) + 0.25);
          float vein = skyFbm(cavUV * 2.2 + vec2(uTime * 0.02, -uTime * 0.015));
          float ridge = pow(clamp(1.0 - abs(vein - 0.52) * 5.2, 0.0001, 1.0), 2.4);
          float pulse = 0.75 + 0.25 * sin(uTime * 1.6 + cavUV.x * 2.0);
          vec3 glowC = mix(vec3(0.22, 0.92, 0.76), vec3(0.72, 0.46, 1.0), skyNoise(cavUV * 1.2));
          col += glowC * ridge * 0.45 * pulse * smoothstep(0.02, 0.45, abs(y));
        } else if (uLayer > 3.5) {
          // --- MOON ROAD: Deep Indigo Velvet Cosmos & Sweeping Nebula ---
          col = mix(uSkyHorizon, uSkyZenith, smoothstep(-0.2, 0.8, abs(y)));
          float nebCoord = (dir.y * 0.85 - dir.x * 0.42) * 3.1;
          float nebBand = exp(-(nebCoord * nebCoord));
          float nebNoise = skyFbm(dir.xz * 2.8 + dir.xy * 1.4 + uTime * 0.01);
          col += mix(vec3(0.26, 0.14, 0.52), vec3(0.62, 0.46, 0.95), nebNoise) * nebBand * 0.55;
          // Crisp starfield
          vec2 stCell = floor(dir.xz / max(0.25, abs(y) + 0.35) * 42.0);
          float st = skyHash(stCell);
          if (st > 0.972) {
            float tw = 0.55 + 0.45 * sin(uTime * 3.2 + st * 90.0);
            col += vec3(1.0, 0.94, 0.78) * tw * 0.85;
          }
        } else {
          // --- SURFACE & SKY KINGDOM: Atmospheric Sky + Sun/Moon + Drifting Cumulus ---
          float up = clamp(y, 0.0, 1.0);
          float down = clamp(-y, 0.0, 1.0);
          col = mix(uSkyHorizon, uSkyZenith, pow(max(up, 0.0001), 0.56));
          col = mix(col, uSkyBottom, pow(max(down, 0.0001), 0.62));

          // Soft Rayleigh / Mie horizon scatter glow toward sun azimuth
          float sunDot = max(dot(dir, sunD), 0.0001);
          float horizonBand = exp(-abs(y) * 5.8);
          col += uSunColor * pow(sunDot, 4.5) * (0.34 + uSunsetFactor * 0.44) * (0.45 + 0.55 * horizonBand);

          // Glowing Sun / Night Moon Orb with delicate corona bloom
          if (y > -0.14) {
            float orbCore = smoothstep(0.9964, 0.9988, sunDot);
            float orbHalo = pow(sunDot, 32.0) * 0.54 + pow(sunDot, 9.0) * 0.22;
            vec3 orbTint = mix(uSunColor, vec3(0.92, 0.96, 1.0), uNightFactor);
            col += orbTint * (orbHalo * (1.0 - uWeatherMode * 0.35) + orbCore * 1.45);
          }

          // Twinkling night / stardust stars
          float starVis = clamp(max(uNightFactor, uWeatherMode > 2.5 ? 0.85 : 0.0), 0.0, 1.0);
          if (starVis > 0.05 && y > 0.02) {
            vec2 sUV = (dir.xz / (y + 0.38)) * 42.0;
            float sh = skyHash(floor(sUV));
            if (sh > 0.974) {
              float tw = 0.55 + 0.45 * sin(uTime * 3.5 + sh * 120.0);
              col += vec3(1.0, 0.96, 0.84) * tw * starVis * smoothstep(0.02, 0.25, y);
            }
          }

          // Multi-layer Volumetric Painted Cumulus Clouds in Upper Sky
          if (y > 0.012) {
            vec2 cUV = dir.xz / (y + 0.17);
            float c1 = skyFbm(cUV * 0.82 + vec2(uTime * 0.018, uTime * 0.008));
            float c2 = skyFbm(cUV * 1.85 - vec2(uTime * 0.012, 0.0));
            float cloudCover = uWeatherMode > 0.5 && uWeatherMode < 2.5 ? 0.36 : 0.50;
            float cloudMask = smoothstep(cloudCover, cloudCover + 0.25, c1 * 0.70 + c2 * 0.30);
            cloudMask *= smoothstep(0.012, 0.14, y) * (1.0 - uNightFactor * 0.65);

            vec3 cloudLit = mix(vec3(1.0, 0.99, 0.97), uSunColor * 1.08, 0.24 + uSunsetFactor * 0.55);
            vec3 cloudShade = mix(uSkyHorizon * 0.86, vec3(0.58, 0.69, 0.89), 0.44);
            vec3 cloudCol = mix(cloudShade, cloudLit, smoothstep(0.42, 0.86, c2 + sunDot * 0.28));
            col = mix(col, cloudCol, cloudMask * 0.82);
          }

          // Dancing emerald & violet aurora borealis curtains during Aurora weather or Polar Reach nights
          if ((uWeatherMode > 3.5 || uNightFactor > 0.35) && y > 0.06) {
            float aurStrength = uWeatherMode > 3.5 ? 0.85 : uNightFactor * 0.22;
            vec2 aUV = dir.xz / (y + 0.28);
            float ribbon = sin(aUV.x * 3.1 + sin(aUV.y * 2.2 + uTime * 0.35) * 1.8 - uTime * 0.42);
            float curtain = pow(clamp(1.0 - abs(ribbon) * 1.45, 0.0001, 1.0), 2.8);
            float shimmerN = skyNoise(aUV * 4.5 + vec2(0.0, uTime * 0.45));
            vec3 aurCol = mix(vec3(0.18, 0.96, 0.68), vec3(0.68, 0.36, 1.0), smoothstep(0.2, 0.8, shimmerN));
            col += aurCol * curtain * (0.45 + 0.55 * shimmerN) * aurStrength * smoothstep(0.06, 0.28, y);
          }

          // Sky Kingdom Lower Cloud Ocean beneath floating islands!
          if (uLayer > 0.5 && uLayer < 1.5 && y < 0.04) {
            vec2 seaUV = dir.xz / max(0.12, -y + 0.16);
            float f1 = skyFbm(seaUV * 1.35 + vec2(uTime * 0.024, uTime * 0.01));
            float f2 = skyFbm(seaUV * 2.9 - vec2(uTime * 0.015, -uTime * 0.012));
            float billow = clamp(f1 * 0.65 + f2 * 0.35, 0.0, 1.0);
            vec3 seaDark = mix(vec3(0.54, 0.78, 0.96), uSkyHorizon, 0.45);
            vec3 seaBright = vec3(1.0, 0.99, 0.97);
            vec3 cloudSeaCol = mix(seaDark, seaBright, smoothstep(0.32, 0.76, billow));
            float blendSea = smoothstep(0.04, -0.14, y);
            col = mix(col, cloudSeaCol, blendSea * 0.92);
          }
        }

        gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(3.5)), 1.0);
      }
    `,
  });
}

/**
 * Biome Terrain Shader with aTerrainMeta attribute:
 * aTerrainMeta = vec4(biomeGroup, roadWeight, waterDepth, detailSeed)
 * - Surface: cobblestone streets, wind-rippled beach/dunes + animated wave swash,
 *   lush meadow micro-dapple, alpine slate strata, glistening tundra snow crystals
 * - Sky Kingdom: smooth fluffy island edge fade & clean open-air discard below cloud base
 * - Coral Reef: animated dual-layer sun caustics & rippled sandy seafloors
 * - Glowdeep: fractured basalt rock walls, pulsing teal/violet mycelium veins & warm cinder fissures
 */
export function applyTerrainShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_terrain_pbr_v5';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uLayer = uniforms.uLayer;
    shader.uniforms.uVibrant = uniforms.uVibrant;
    shader.uniforms.uSeason = uniforms.uSeason;
    shader.uniforms.uFocusPos = uniforms.uFocusPos;
    shader.uniforms.uHorizonFogColor = uniforms.uHorizonFogColor;
    shader.uniforms.uSunDir = uniforms.uSunDir;
    shader.uniforms.uSunColor = uniforms.uSunColor;
    shader.uniforms.uWorldMapTex = uniforms.uWorldMapTex;
    shader.uniforms.uWorldMapSize = uniforms.uWorldMapSize;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute vec4 aTerrainMeta;
        varying vec3 vMochiWorldPos;
        varying vec3 vMochiWorldNorm;
        varying vec4 vTerrainMeta;
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #include <project_vertex>
        vMochiWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vMochiWorldNorm = normalize(mat3(modelMatrix) * objectNormal + vec3(0.0, 1e-5, 0.0));
        vTerrainMeta = aTerrainMeta;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uLayer;
        uniform float uVibrant;
        uniform float uSeason;
        uniform vec3 uFocusPos;
        uniform vec3 uHorizonFogColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform sampler2D uWorldMapTex;
        uniform float uWorldMapSize;
        varying vec3 vMochiWorldPos;
        varying vec3 vMochiWorldNorm;
        varying vec4 vTerrainMeta;

        float mochiHash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        vec2 mochiHash22(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.xx + p3.yz) * p3.zy);
        }

        float mochiNoise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = mochiHash21(i);
          float b = mochiHash21(i + vec2(1.0, 0.0));
          float c = mochiHash21(i + vec2(0.0, 1.0));
          float d = mochiHash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float mochiFbm2(vec2 p) {
          float s = 0.0;
          s += 0.52 * mochiNoise2(p);
          s += 0.28 * mochiNoise2(p * 2.13 + vec2(5.2, 1.3));
          s += 0.14 * mochiNoise2(p * 4.47 - vec2(2.7, 4.1));
          s += 0.06 * mochiNoise2(p * 8.91 + vec2(1.9, -6.3));
          return s;
        }

        // Seamless 3D triplanar FBM for steep mountains, canyon walls & cavern cliffs (prevents vertical UV stretching)
        float mochiTriFbm(vec3 wp, vec3 wn, float scale) {
          vec3 w = pow(abs(wn) + vec3(0.001), vec3(4.0));
          w /= (w.x + w.y + w.z);
          float nx = mochiFbm2(wp.zy * scale);
          float ny = mochiFbm2(wp.xz * scale);
          float nz = mochiFbm2(wp.xy * scale);
          return nx * w.x + ny * w.y + nz * w.z;
        }

        // Voronoi with cell distance + edge distance for crisp beveled cobblestones
        vec3 mochiVoronoiBevel(vec2 x) {
          vec2 n = floor(x);
          vec2 f = fract(x);
          vec2 mg = vec2(0.0);
          vec2 mr = vec2(0.0);
          float md = 8.0;
          float id = 0.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = mochiHash22(n + g);
              vec2 r = g + (0.16 + 0.68 * o) - f;
              float d = dot(r, r);
              if (d < md) {
                md = d;
                mr = r;
                mg = g;
                id = o.x;
              }
            }
          }
          float edge = 8.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = mg + vec2(float(i), float(j));
              vec2 o = mochiHash22(n + g);
              vec2 r = g + (0.16 + 0.68 * o) - f;
              if (dot(mr - r, mr - r) > 0.0001) {
                edge = min(edge, dot(0.5 * (mr + r), normalize(r - mr)));
              }
            }
          }
          return vec3(sqrt(md), edge, id);
        }
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        // Sky Kingdom open air voids cleanly reveal the cloud ocean & sky dome below
        if (uLayer > 0.5 && uLayer < 1.5 && vMochiWorldPos.y < -0.34) {
          discard;
        }

        vec2 wp = vMochiWorldPos.xz;
        float elev = vMochiWorldPos.y;
        vec3 wNorm = normalize(vMochiWorldNorm + vec3(0.0, 1e-5, 0.0));
        float slope = 1.0 - clamp(wNorm.y, 0.0, 1.0);
        float camDist = length(cameraPosition - vMochiWorldPos);
        float detailFade = 1.0 - smoothstep(18.0, 38.0, camDist);

        // Domain-warped multi-octave noises (removes all triangle/grid look)
        vec2 warp = vec2(mochiNoise2(wp * 0.42), mochiNoise2(wp * 0.42 + vec2(9.4, -4.1))) - 0.5;
        vec2 wpWarp = wp + warp * 0.65;
        float nBroad = mochiNoise2(wp * 0.19);
        float nMed = mochiFbm2(wpWarp * 0.95);
        float nFine = mochiNoise2(wp * 6.4);
        float nMicro = mochiNoise2(wp * 16.5);
        float triRock = mochiTriFbm(vMochiWorldPos, wNorm, 1.35);

        vec4 worldMapSample = texture2D(uWorldMapTex, clamp(wp / uWorldMapSize, vec2(0.002), vec2(0.998)));
        float biomeCode = vTerrainMeta.x;
        float roadW = clamp(max(vTerrainMeta.y, worldMapSample.b), 0.0, 1.0);
        // Organic FBM edge breakup on roads & biome transitions
        float roadEdgeMask = smoothstep(0.16, 0.62, roadW + (nMed - 0.5) * 0.28);

        // Natural macro ground dapple, micro organic grain & drifting cloud shadows
        diffuseColor.rgb *= mix(0.88, 1.13, nBroad * 0.52 + nMed * 0.48) * mix(0.94, 1.06, mix(0.5, nFine, detailFade));
        if (uLayer < 0.5) {
          float cloudDrift = mochiFbm2(wp * 0.048 - vec2(uTime * 0.082, uTime * 0.044));
          float cloudShadow = mix(0.83, 1.06, smoothstep(0.28, 0.72, cloudDrift));
          diffuseColor.rgb *= cloudShadow;
        }

        if (uLayer < 0.5) {
          float desertMask = smoothstep(4.5, 5.0, biomeCode) * (1.0 - smoothstep(5.3, 5.9, biomeCode));
          float sandMask = clamp(
            smoothstep(1.55, 2.08, biomeCode) * (1.0 - smoothstep(2.42, 2.95, biomeCode)) + desertMask,
            0.0,
            1.0
          );
          float lushMask = smoothstep(2.55, 3.0, biomeCode) * (1.0 - smoothstep(4.2, 4.75, biomeCode));
          float snowMask = smoothstep(5.55, 6.0, biomeCode) * (1.0 - smoothstep(6.35, 6.85, biomeCode));
          float mtnMask = smoothstep(6.5, 7.0, biomeCode);

          // 1. Chamfered Ashlar Cobblestone Streets & Sandy Verge Borders
          if (roadEdgeMask > 0.04) {
            vec3 cob = mochiVoronoiBevel(wp * 2.55);
            float mortar = smoothstep(0.035, 0.145, cob.y);
            float stoneBody = mix(0.84, 1.15, cob.z) * mix(0.92, 1.06, nMicro);
            vec3 warmCobble = diffuseColor.rgb * stoneBody * vec3(1.03, 1.01, 0.96);
            vec3 recessedGrout = diffuseColor.rgb * vec3(0.54, 0.50, 0.46);
            vec3 stoneTint = mix(recessedGrout, warmCobble, mortar);
            // Subtle grassy moss peeking into road border edges
            float vergeMoss = (1.0 - roadEdgeMask) * smoothstep(0.42, 0.78, nMed);
            stoneTint = mix(stoneTint, diffuseColor.rgb * vec3(0.76, 0.96, 0.68), vergeMoss * 0.45);
            diffuseColor.rgb = mix(diffuseColor.rgb, stoneTint, roadEdgeMask * mix(0.5, 1.0, detailFade));
          } else {
            // 2. Wind-Sculpted Dunes & Quartz-Speckled Beach Sand
            if (sandMask > 0.04) {
              float rippleCoord = wp.x * 4.6 + wp.y * 2.1 + nMed * 3.6 + warp.x * 2.2;
              float ripple = pow(sin(rippleCoord) * 0.5 + 0.5, 1.4);
              float quartz = smoothstep(0.88, 0.99, nMicro) * detailFade;
              diffuseColor.rgb *= mix(1.0, 0.91 + 0.15 * ripple, sandMask);
              diffuseColor.rgb += vec3(0.24, 0.22, 0.18) * quartz * sandMask;
            }

            // 2b. Terraced Red-Gold Sandstone Canyon Walls & Mesa Caps
            if (desertMask > 0.1) {
              float canyonWall = smoothstep(0.06, 0.22, slope) * smoothstep(0.32, 0.95, elev);
              float mesaCap = smoothstep(0.95, 1.85, elev) * (1.0 - smoothstep(0.08, 0.24, slope));
              float strataWave = sin(elev * 14.5 + triRock * 5.2 + nBroad * 2.0) * 0.5 + 0.5;
              float strataHard = smoothstep(0.22, 0.78, strataWave);
              vec3 darkSediment = vec3(0.60, 0.27, 0.16);
              vec3 warmOchre = vec3(0.90, 0.58, 0.31);
              vec3 terracotta = mix(darkSediment, warmOchre, strataHard) * mix(0.84, 1.12, triRock);
              // Crevice darkening inside vertical canyon cracks
              float vertCracks = pow(clamp(1.0 - abs(triRock - 0.5) * 4.4, 0.0001, 1.0), 2.0);
              terracotta *= mix(1.0, 0.68, vertCracks * canyonWall);
              diffuseColor.rgb = mix(diffuseColor.rgb, terracotta, desertMask * canyonWall * 0.88);
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.09, 0.98, 0.88), desertMask * mesaCap * 0.38);
            }

            // 3. Meadow / Blossom / Woodland Lush Multi-Tone Turf, Valley AO & Warm Sunlit Ridge
            if (lushMask > 0.04) {
              float patchVar = smoothstep(0.28, 0.78, nMed);
              float clover = smoothstep(0.70, 0.93, nFine);
              float valleyAO = 1.0 - smoothstep(0.18, 0.54, elev);
              float hillCrest = smoothstep(0.70, 1.65, elev);
              float pathWear = smoothstep(0.58, 0.88, mochiNoise2(wp * 0.45 + vec2(3.1, 7.2))) * (1.0 - smoothstep(0.10, 0.26, slope));
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.87, 1.08, 0.90), lushMask * patchVar * 0.42);
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.84, 0.96, 0.87), lushMask * valleyAO * 0.34);
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.10, 1.06, 0.92), lushMask * hillCrest * 0.28);
              diffuseColor.rgb += vec3(0.06, 0.10, 0.02) * clover * lushMask * detailFade;
              // Crisp micro wildflower meadow flecks (buttercup, sakura pink, sky clover)
              float wfSeed = mochiHash21(floor(wp * 5.2));
              float wfPatch = smoothstep(0.42, 0.85, nMed) * (1.0 - smoothstep(0.12, 0.28, slope));
              if (wfSeed > 0.955 && wfPatch > 0.25 && detailFade > 0.1) {
                vec3 wfCol = wfSeed > 0.982 ? vec3(1.0, 0.84, 0.24) : wfSeed > 0.968 ? vec3(1.0, 0.60, 0.78) : vec3(0.68, 0.88, 1.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, wfCol, 0.68 * wfPatch * detailFade);
              }
              // Soft earthen loam & pebble scatter on mid-slopes
              float loamSlope = smoothstep(0.06, 0.22, slope) * (1.0 - smoothstep(0.26, 0.44, slope));
              float loamPatch = smoothstep(0.35, 0.78, nMed);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.44, 0.34, 0.22), lushMask * (loamSlope * 0.38 + pathWear * 0.12) * loamPatch);
            }

            // 4. Frostpeak Tundra Wind-Drifts & Ice Crystal Sparkle
            if (snowMask > 0.04) {
              float driftWave = sin(wp.x * 1.8 - wp.y * 1.4 + nMed * 3.0) * 0.5 + 0.5;
              float glint = pow(max(mochiHash21(floor(wp * 16.0)), 0.0001), 16.0) * detailFade;
              diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.88, 0.94, 1.0), diffuseColor.rgb * 1.06, driftWave * 0.55);
              diffuseColor.rgb += vec3(0.48, 0.72, 0.92) * glint * snowMask;
            }
          }

          // 5. Triplanar Alpine Granite Cliff Strata, Crevice AO & High-Peak Snow Caps
          float nonDesert = 1.0 - desertMask;
          float rockMix = clamp(
            smoothstep(0.08, 0.32, slope) * smoothstep(0.30, 0.85, elev) * nonDesert +
            mtnMask * (0.20 + smoothstep(0.06, 0.25, slope) * 0.45),
            0.0,
            1.0
          );
          if (rockMix > 0.01) {
            float strata = 0.76 + 0.24 * sin(elev * 13.0 + triRock * 5.2);
            float fissure = pow(clamp(1.0 - abs(triRock - 0.52) * 5.0, 0.0001, 1.0), 2.2);
            vec3 graniteDark = vec3(0.35, 0.36, 0.44);
            vec3 graniteLight = vec3(0.64, 0.63, 0.70);
            vec3 rockCol = mix(graniteDark, graniteLight, triRock) * strata * mix(1.0, 0.66, fissure);
            // Subtle alpine moss clinging to lower north-facing rock ledges
            float ledgeMoss = (1.0 - smoothstep(0.25, 0.45, slope)) * (1.0 - smoothstep(0.8, 1.5, elev)) * smoothstep(0.45, 0.8, nMed);
            rockCol = mix(rockCol, vec3(0.34, 0.54, 0.36), ledgeMoss * 0.42);
            diffuseColor.rgb = mix(diffuseColor.rgb, rockCol, rockMix * 0.84);
          }

          // Alpine snow accumulation on high mountain crowns (and seasonal winter frost)
          float snowAlt = uSeason > 2.5 ? 1.48 : 2.28;
          float summitSnow = smoothstep(snowAlt, snowAlt + 0.82, elev + (nMed - 0.5) * 0.38) *
            (1.0 - smoothstep(0.17, 0.38, slope)) * nonDesert;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), clamp(summitSnow, 0.0, 0.92));

          // 6. Wet Glazed Shoreline Sand, Animated Wave Swash & Seafloor Caustic Bathymetry
          float shoreWet = 1.0 - smoothstep(-0.08, 0.21, elev);
          diffuseColor.rgb *= mix(1.0, 0.68, shoreWet * 0.72);
          float swashWave = sin(wp.x * 1.4 + wp.y * 1.2 - uTime * 2.2) * 0.036;
          float foamBand = smoothstep(0.072, 0.006, abs(elev - (0.02 + swashWave))) *
            smoothstep(0.24, 0.72, mochiNoise2(wp * 2.9 - vec2(uTime * 0.38, 0.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.99, 1.0), foamBand * 0.60);

          if (elev < -0.01) {
            float c1 = sin(wp.x * 2.5 + uTime * 1.35 + sin(wp.y * 2.1 - uTime * 0.9));
            float c2 = cos(wp.y * 2.7 - uTime * 1.15 + cos(wp.x * 1.9 + uTime * 1.05));
            float seaCaustic = pow(clamp(1.0 - abs(c1 + c2) * 0.44, 0.0001, 1.0), 3.0);
            float causticFade = smoothstep(-0.01, -0.18, elev) * (1.0 - smoothstep(-0.68, -1.75, elev));
            diffuseColor.rgb += vec3(0.18, 0.52, 0.62) * seaCaustic * causticFade;

            float trenchDepth = smoothstep(-0.64, -1.90, elev);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.11, 0.29), trenchDepth * 0.76);
          }
        } else if (uLayer > 0.5 && uLayer < 1.5) {
          // Sky Kingdom fluffy sculpted cloud-rimmed island base + golden sunlit meadow terraces
          float edgeCloud = 1.0 - smoothstep(-0.12, 0.36, elev + (nMed - 0.5) * 0.14);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.99, 1.0), edgeCloud * 0.88);
          float skyPeak = smoothstep(0.85, 1.65, elev);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.05, 0.95), skyPeak * 0.40);
        } else if (uLayer > 1.5 && uLayer < 2.5) {
          // Coral Reef Dive: crisp dual-layer caustic mesh + wind-like current sand ripples + stratified trench cliffs
          float c1 = sin(wp.x * 2.75 + uTime * 1.48 + sin(wp.y * 2.25 - uTime * 0.96));
          float c2 = cos(wp.y * 2.95 - uTime * 1.28 + cos(wp.x * 2.05 + uTime * 1.12));
          float caustic = pow(clamp(1.0 - abs(c1 + c2) * 0.43, 0.0001, 1.0), 2.7);
          float depthFade = smoothstep(-1.55, -0.08, elev);
          diffuseColor.rgb += vec3(0.24, 0.64, 0.70) * caustic * 0.68 * (0.28 + 0.72 * depthFade);
          float sandRipple = sin(wp.x * 5.4 + wp.y * 1.9 + nMed * 3.4) * 0.065;
          diffuseColor.rgb *= 1.0 + sandRipple;

          float trenchDepth = smoothstep(-0.68, -1.92, elev);
          float canyonRim = smoothstep(0.08, 0.34, slope) * smoothstep(-0.32, -1.4, elev);
          float wallBands = 0.82 + 0.18 * sin(elev * 14.0 + triRock * 4.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.25, 0.48) * wallBands, canyonRim * 0.62);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.11, 0.30), trenchDepth * 0.78);
        } else if (uLayer > 2.5 && uLayer < 3.5) {
          // Glowdeep Caverns: faceted crystalline basalt striations + glowing mycelium veins + molten cinder cracks
          float wallStrata = 0.76 + 0.26 * sin(elev * 10.5 + triRock * 5.0);
          float wallMask = smoothstep(0.26, 1.45, elev);
          diffuseColor.rgb *= mix(1.0, wallStrata, wallMask);

          float myc = pow(clamp(1.0 - abs(triRock - 0.52) * 5.6, 0.0001, 1.0), 2.4);
          float mycPulse = 0.76 + 0.24 * sin(uTime * 1.9 + nBroad * 6.0);
          vec3 glowTint = mix(vec3(0.22, 0.95, 0.76), vec3(0.76, 0.46, 1.0), nBroad);
          diffuseColor.rgb += glowTint * myc * 0.42 * mycPulse;

          float cinderMask = smoothstep(2.6, 3.0, biomeCode) * (1.0 - smoothstep(3.4, 3.8, biomeCode));
          if (cinderMask > 0.04) {
            float crack = pow(clamp(1.0 - abs(nMed - 0.48) * 6.8, 0.0001, 1.0), 2.6);
            diffuseColor.rgb += vec3(1.0, 0.38, 0.56) * crack * cinderMask * (0.65 + 0.25 * sin(uTime * 2.5 + wp.x));
          }
        } else if (uLayer > 3.5) {
          // Moon Road: inlaid star-obsidian sheen & iridescent silver-violet veins
          float starTile = smoothstep(0.64, 0.93, nFine);
          float starVein = pow(clamp(1.0 - abs(nMed - 0.5) * 6.0, 0.0001, 1.0), 2.4);
          diffuseColor.rgb += vec3(0.16, 0.14, 0.30) * starTile + vec3(0.26, 0.22, 0.48) * starVein;
        }
        `
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        // Rich world-space tactile multi-scale relief across near & mid terrain (rock strata, cobbles, dunes, turf)
        vec2 bWp = vMochiWorldPos.xz;
        float bumpDist = length(bWp - uFocusPos.xz);
        float bumpFade = 1.0 - smoothstep(16.0, 32.0, bumpDist);
        if (bumpFade > 0.01) {
          vec3 wn = normalize(vMochiWorldNorm + vec3(0.0, 1e-5, 0.0));
          float sl = 1.0 - clamp(wn.y, 0.0, 1.0);
          float bumpDx = 0.0;
          float bumpDz = 0.0;
          float bumpScale = 0.24;

          if (uLayer < 0.5) {
            float rW = clamp(max(vTerrainMeta.y, texture2D(uWorldMapTex, clamp(bWp / uWorldMapSize, vec2(0.002), vec2(0.998))).b), 0.0, 1.0);
            if (rW > 0.22) {
              // Beveled stone normal from Voronoi edges + micro grit
              float c0 = mochiVoronoiBevel(bWp * 2.55).y;
              float cx = mochiVoronoiBevel((bWp + vec2(0.04, 0.0)) * 2.55).y;
              float cz = mochiVoronoiBevel((bWp + vec2(0.0, 0.04)) * 2.55).y;
              bumpDx = (cx - c0) * 3.8;
              bumpDz = (cz - c0) * 3.8;
              bumpScale = 0.42;
            } else if (sl > 0.14) {
              // Stratified cliff rock relief
              float e = 0.05;
              float r0 = mochiTriFbm(vMochiWorldPos, wn, 1.65) + 0.15 * sin(vMochiWorldPos.y * 13.5);
              float rx = mochiTriFbm(vMochiWorldPos + vec3(e, 0.0, 0.0), wn, 1.65);
              float rz = mochiTriFbm(vMochiWorldPos + vec3(0.0, 0.0, e), wn, 1.65);
              bumpDx = (rx - r0) * 4.2;
              bumpDz = (rz - r0) * 4.2;
              bumpScale = 0.38;
            } else {
              // Tactile meadow turf & sand ripple micro-relief
              float freq = 3.8;
              float f0 = mochiFbm2(bWp * freq);
              float fx = mochiFbm2((bWp + vec2(0.05, 0.0)) * freq);
              float fz = mochiFbm2((bWp + vec2(0.0, 0.05)) * freq);
              bumpDx = (fx - f0) * 2.6;
              bumpDz = (fz - f0) * 2.6;
              bumpScale = 0.26;
            }
          } else {
            float e = 0.05;
            float f0 = mochiTriFbm(vMochiWorldPos, wn, 2.2);
            float fx = mochiTriFbm(vMochiWorldPos + vec3(e, 0.0, 0.0), wn, 2.2);
            float fz = mochiTriFbm(vMochiWorldPos + vec3(0.0, 0.0, e), wn, 2.2);
            bumpDx = (fx - f0) * 2.8;
            bumpDz = (fz - f0) * 2.8;
            bumpScale = 0.28;
          }

          vec3 wPerturb = normalize(vec3(-bumpDx, 1.0, -bumpDz));
          vec3 vPerturb = normalize((viewMatrix * vec4(wPerturb, 0.0)).xyz + vec3(0.0, 0.0, 1e-5));
          normal = normalize(mix(normal, vPerturb, bumpScale * bumpFade));
        }
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        vec3 wnR = normalize(vMochiWorldNorm + vec3(0.0, 1e-5, 0.0));
        float slR = 1.0 - clamp(wnR.y, 0.0, 1.0);
        if (uLayer < 0.5) {
          float wetBand = 1.0 - smoothstep(-0.08, 0.20, vMochiWorldPos.y);
          roughnessFactor = mix(roughnessFactor, 0.06, wetBand * 0.92);
          float rW = clamp(max(vTerrainMeta.y, texture2D(uWorldMapTex, clamp(vMochiWorldPos.xz / uWorldMapSize, vec2(0.002), vec2(0.998))).b), 0.0, 1.0);
          if (rW > 0.2) {
            roughnessFactor = mix(roughnessFactor, 0.38, rW * 0.72);
          } else if (slR > 0.16) {
            roughnessFactor = mix(roughnessFactor, 0.64, smoothstep(0.16, 0.36, slR));
          }
          // Tundra / high mountain snow sheen
          float snowAltR = uSeason > 2.5 ? 1.48 : 2.28;
          if (vMochiWorldPos.y > snowAltR || (vTerrainMeta.x > 5.55 && vTerrainMeta.x < 6.45)) {
            roughnessFactor = mix(roughnessFactor, 0.26, 0.55);
          }
        } else if (uLayer > 2.5) {
          // Cavern wet basalt & starlight obsidian reflections
          roughnessFactor = mix(roughnessFactor, 0.34, 0.6);
        }
        roughnessFactor = clamp(roughnessFactor + (mochiNoise2(vMochiWorldPos.xz * 2.8) - 0.5) * 0.16, 0.06, 0.96);
        `
      )
      .replace(
        '#include <fog_fragment>',
        /* glsl */ `
        #include <fog_fragment>
        // Warm golden sunlit crest warmth + smooth expanded terrain chunk perimeter fade (CHUNK_HALF = 30)
        float sunCrest = max(dot(normalize(vMochiWorldNorm + vec3(0.0, 1e-5, 0.0)), normalize(uSunDir + vec3(0.0, 1e-5, 0.0))), 0.0);
        if (uLayer < 0.5) {
          gl_FragColor.rgb += uSunColor * pow(sunCrest, 3.0) * 0.045;
        }
        vec2 chunkDelta = abs(vMochiWorldPos.xz - uFocusPos.xz);
        float chunkBorderDist = max(chunkDelta.x, chunkDelta.y);
        float chunkEdgeFade = smoothstep(24.2, 29.4, chunkBorderDist);
        if (uLayer < 0.5 && vMochiWorldPos.y < -0.02) {
          float subFade = smoothstep(18.5, 27.5, chunkBorderDist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizonFogColor, max(chunkEdgeFade, subFade * 0.85));
        } else {
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizonFogColor, chunkEdgeFade);
        }
        `
      );
  };
}

/**
 * High-End Bathymetry-Aware Ocean & Glowdeep Bioluminescent River Shader:
 * - Samples uWorldMapTex for exact per-pixel water depth -> crystal-clear turquoise shallows
 *   transitioning cleanly via Beer-Lambert absorption into deep sapphire cobalt
 * - Animated multi-band lacy shoreline surf & foam lapping onto beaches, coves & cliffs
 * - Multi-wave Gerstner swell + crisp 5-octave normal capillary ripples + Fresnel sky & sun sparkle
 */
export function applyWaterShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_water_pbr_v4';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uVibrant = uniforms.uVibrant;
    shader.uniforms.uLayer = uniforms.uLayer;
    shader.uniforms.uSunDir = uniforms.uSunDir;
    shader.uniforms.uSunColor = uniforms.uSunColor;
    shader.uniforms.uSkyHorizon = uniforms.uSkyHorizon;
    shader.uniforms.uSkyZenith = uniforms.uSkyZenith;
    shader.uniforms.uWorldMapTex = uniforms.uWorldMapTex;
    shader.uniforms.uWorldMapSize = uniforms.uWorldMapSize;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uLayer;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterViewNormal;
        varying vec3 vWaterWorldNormal;
        varying float vWaveCrest;
        `
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        #include <beginnormal_vertex>
        vec2 wXZ0 = (modelMatrix * vec4(position, 1.0)).xz;
        float ampScale = uLayer > 2.5 && uLayer < 3.5 ? 0.45 : 1.0;
        float w1 = sin(wXZ0.x * 0.62 + uTime * 1.95);
        float w2 = cos(wXZ0.y * 0.74 - uTime * 1.52);
        float w3 = sin((wXZ0.x + wXZ0.y) * 1.24 + uTime * 2.55);
        float w4 = cos((wXZ0.x - wXZ0.y) * 2.05 - uTime * 3.15);

        float dHx = (
          0.040 * 0.62 * cos(wXZ0.x * 0.62 + uTime * 1.95) +
          0.019 * 1.24 * cos((wXZ0.x + wXZ0.y) * 1.24 + uTime * 2.55) -
          0.010 * 2.05 * sin((wXZ0.x - wXZ0.y) * 2.05 - uTime * 3.15)
        ) * ampScale;
        float dHz = (
          -0.034 * 0.74 * sin(wXZ0.y * 0.74 - uTime * 1.52) +
          0.019 * 1.24 * cos((wXZ0.x + wXZ0.y) * 1.24 + uTime * 2.55) +
          0.010 * 2.05 * sin((wXZ0.x - wXZ0.y) * 2.05 - uTime * 3.15)
        ) * ampScale;
        vec3 waveNorm = normalize(vec3(-dHx * 2.8, 1.0, -dHz * 2.8));
        objectNormal = waveNorm;
        vWaterWorldNormal = waveNorm;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        float waveH = (w1 * 0.040 + w2 * 0.034 + w3 * 0.019 + w4 * 0.010) * ampScale;
        transformed.y += waveH;
        vWaveCrest = waveH;
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #include <project_vertex>
        vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWaterViewNormal = transformedNormal;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uVibrant;
        uniform float uLayer;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyHorizon;
        uniform vec3 uSkyZenith;
        uniform sampler2D uWorldMapTex;
        uniform float uWorldMapSize;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterViewNormal;
        varying vec3 vWaterWorldNormal;
        varying float vWaveCrest;

        float wHash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 37.2);
          return fract(p.x * p.y);
        }

        float wNoise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(wHash21(i), wHash21(i + vec2(1.0, 0.0)), u.x),
            mix(wHash21(i + vec2(0.0, 1.0)), wHash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        vec2 wp = vWaterWorldPos.xz;
        float r1 = sin(wp.x * 2.1 + uTime * 1.9 + cos(wp.y * 1.5 - uTime * 1.3));
        float r2 = cos(wp.y * 2.4 - uTime * 1.7 + sin(wp.x * 1.7 + uTime * 1.4));
        float shimmer = pow(clamp(1.0 - abs(r1 + r2) * 0.40, 0.0001, 1.0), 2.8);

        // Capillary micro-ripples for crisp high-frequency reflections
        float capA = wNoise2(wp * 3.4 + vec2(uTime * 0.45, -uTime * 0.32)) - 0.5;
        float capB = wNoise2(wp * 6.8 - vec2(uTime * 0.35, uTime * 0.48)) - 0.5;
        vec3 N_world = normalize(vWaterWorldNormal + vec3((r1 * 0.11 + capA * 0.16 + capB * 0.08), 1e-5, (r2 * 0.11 + capB * 0.16 - capA * 0.08)));

        vec3 V_world = normalize(cameraPosition - vWaterWorldPos + vec3(0.0, 1e-5, 0.0));
        float fresnel = pow(max(1.0 - clamp(abs(dot(V_world, N_world)), 0.0, 1.0), 0.0001), 3.0);

        if (uLayer > 2.5 && uLayer < 3.5) {
          // Glowdeep bioluminescent crystal canal river
          float flow = sin(wp.x * 1.6 - uTime * 2.3 + sin(wp.y * 1.9 + uTime * 1.5)) * 0.5 + 0.5;
          vec3 bioCyan = vec3(0.24, 0.96, 0.88);
          vec3 bioViolet = vec3(0.62, 0.44, 1.0);
          diffuseColor.rgb = mix(vec3(0.06, 0.34, 0.46), bioCyan, shimmer * 0.56 + flow * 0.28);
          diffuseColor.rgb = mix(diffuseColor.rgb, bioViolet, fresnel * 0.48);
          diffuseColor.a = 0.88;
        } else {
          // Exact seabed height from uWorldMapTex for depth-aware Beer-Lambert clarity & coastal seafoam!
          vec4 mapData = texture2D(uWorldMapTex, clamp(wp / uWorldMapSize, vec2(0.002), vec2(0.998)));
          float bedH = mapData.r * 8.0 - 2.4;
          float waterDepth = max(0.0, vWaterWorldPos.y - bedH);
          float inMap = step(0.5, wp.x) * step(wp.x, uWorldMapSize - 0.5) * step(0.5, wp.y) * step(wp.y, uWorldMapSize - 0.5);
          waterDepth = mix(1.5, waterDepth, inMap);

          float shallowFrac = 1.0 - smoothstep(0.04, 0.72, waterDepth);
          float deepFrac = smoothstep(0.32, 1.65, waterDepth);

          float crestSparkle = smoothstep(0.032, 0.082, vWaveCrest);
          float cloudDapple = 0.88 + 0.16 * sin(wp.x * 0.09 - uTime * 0.11 + cos(wp.y * 0.08 - uTime * 0.07));
          vec3 skyReflect = mix(uSkyHorizon, uSkyZenith, 0.42);
          vec3 shallowTint = vec3(0.26, 0.90, 0.92);
          vec3 deepTint = diffuseColor.rgb * vec3(0.72, 0.86, 1.05);
          vec3 waterBody = mix(diffuseColor.rgb, shallowTint, shallowFrac * 0.76);
          waterBody = mix(waterBody, deepTint, deepFrac * 0.65);
          waterBody = mix(waterBody, vec3(0.38, 0.94, 1.0), shimmer * 0.30) * cloudDapple;

          diffuseColor.rgb = mix(waterBody, skyReflect, clamp(fresnel * 0.72 + 0.08, 0.0, 0.82));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 1.0, 1.0), crestSparkle * 0.55);

          // Multi-band lacy shoreline surf hugging every beach, cove & island cliff
          float foamNoise = wNoise2(wp * 3.8 - vec2(uTime * 0.42, uTime * 0.25));
          float shorePulse = sin(waterDepth * 24.0 - uTime * 3.1 + foamNoise * 3.2) * 0.5 + 0.5;
          float shoreCrest = smoothstep(0.28, 0.02, waterDepth) * smoothstep(0.005, 0.045, waterDepth + 0.025);
          float lacyFoam = shoreCrest * smoothstep(0.32, 0.72, shorePulse * 0.65 + foamNoise * 0.55);
          float edgeFoamLine = smoothstep(0.07, 0.01, abs(waterDepth - 0.035)) * smoothstep(0.22, 0.68, foamNoise);
          float totalFoam = clamp(lacyFoam * 0.75 + edgeFoamLine * 0.92, 0.0, 1.0) * inMap;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.99, 1.0), totalFoam);

          // Crisp sunlit specular glitter on capillary wave facets
          vec3 H_world = normalize(normalize(uSunDir + vec3(0.0, 1e-5, 0.0)) + V_world + vec3(0.0, 1e-5, 0.0));
          float sunSpec = pow(max(dot(N_world, H_world), 0.0001), 54.0);
          diffuseColor.rgb += uSunColor * sunSpec * 1.25;

          // Crystal clear shallows letting seabed caustics & sand show through cleanly -> rich deep opacity
          float baseAlpha = mix(0.22, 0.88, smoothstep(0.03, 0.95, waterDepth));
          diffuseColor.a = clamp(max(mix(baseAlpha, 0.95, fresnel * 0.68), totalFoam * 0.92), 0.14, 0.96);
        }
        // Softly feather wide ocean edge smoothly into distant horizon sky dome / fog
        float waterEdgeFade = 1.0 - smoothstep(68.0, 96.0, length(cameraPosition.xz - vWaterWorldPos.xz));
        diffuseColor.a *= waterEdgeFade;
        `
      );
  };
}

export type ArchShaderStyle = 'plaster' | 'shingles' | 'masonry' | 'timber' | 'marble' | 'crystal';

/**
 * Architectural & Landmark Material Shader Pack:
 * Enhances buildings, roofs, stone plazas, timber structures, marble monuments & crystals
 * with procedural micro-relief, staggered roof shingles, ashlar stone blocks,
 * warm hand-troweled stucco, wood grain planks, veined marble, and Fresnel crystal glow.
 */
export function applyArchitectureShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms,
  style: ArchShaderStyle
): void {
  const styleCode =
    style === 'plaster'
      ? 0
      : style === 'shingles'
      ? 1
      : style === 'masonry'
      ? 2
      : style === 'timber'
      ? 3
      : style === 'marble'
      ? 4
      : 5;

  mat.customProgramCacheKey = () => `mochi_arch_${style}_v1`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uVibrant = uniforms.uVibrant;
    shader.uniforms.uArchStyle = { value: styleCode };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vArchWorldPos;
        varying vec3 vArchLocalPos;
        varying vec3 vArchWorldNorm;
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #include <project_vertex>
        vArchLocalPos = transformed;
        #ifdef USE_INSTANCING
          vArchWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
          vArchWorldNorm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal + vec3(0.0, 1e-5, 0.0));
        #else
          vArchWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vArchWorldNorm = normalize(mat3(modelMatrix) * objectNormal + vec3(0.0, 1e-5, 0.0));
        #endif
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uVibrant;
        uniform float uArchStyle;
        varying vec3 vArchWorldPos;
        varying vec3 vArchLocalPos;
        varying vec3 vArchWorldNorm;

        float archHash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 41.23);
          return fract(p.x * p.y);
        }

        float archNoise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(archHash21(i), archHash21(i + vec2(1.0, 0.0)), u.x),
            mix(archHash21(i + vec2(0.0, 1.0)), archHash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // Triplanar-friendly UV from world position + normal
        vec2 archPlanarUV(vec3 wp, vec3 wn) {
          vec3 an = abs(wn);
          if (an.y > 0.65) return wp.xz;
          if (an.x > an.z) return wp.zy;
          return wp.xy;
        }
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        vec2 aUV = archPlanarUV(vArchWorldPos, vArchWorldNorm);
        float aNoise = archNoise2(aUV * 3.8);
        float aFine = archNoise2(aUV * 12.5);
        float archDistFade = 1.0 - smoothstep(14.0, 32.0, length(cameraPosition - vArchWorldPos));

        if (uArchStyle < 0.5) {
          // PLASTER / STUCCO: warm hand-troweled texture + soft overhang/ground AO
          diffuseColor.rgb *= mix(0.94, 1.06, aNoise * 0.65 + aFine * 0.35);
          float baseAO = smoothstep(0.0, 0.35, max(0.0, vArchLocalPos.y + 0.45));
          diffuseColor.rgb *= mix(0.84, 1.0, baseAO);
        } else if (uArchStyle < 1.5) {
          // SHINGLES: staggered clay/slate courses with distance-filtered tile transitions (no subpixel moire)
          vec2 sUV = vec2(aUV.x * 4.2 + vArchWorldPos.y * 2.2, vArchWorldPos.y * 5.6);
          float row = floor(sUV.y);
          float rowOff = mod(row, 2.0) * 0.5;
          vec2 cell = vec2(fract(sUV.x + rowOff), fract(sUV.y));
          float id = archHash21(vec2(floor(sUV.x + rowOff), row));
          float edgeShadow = smoothstep(0.0, 0.24, cell.y) * (1.0 - smoothstep(0.82, 1.0, cell.y) * 0.22);
          float gap = smoothstep(0.03, 0.16, cell.x) * smoothstep(0.97, 0.84, cell.x);
          float shingleShade = mix(1.0, mix(0.82, 1.08, edgeShadow * gap) * mix(0.92, 1.08, id), archDistFade);
          diffuseColor.rgb *= shingleShade;
          float lichen = smoothstep(0.76, 0.96, archNoise2(aUV * 2.4)) * 0.14;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.64, 0.40), lichen);
        } else if (uArchStyle < 2.5) {
          // MASONRY: ashlar stone blocks + recessed mortar + mossy ground weathering
          vec2 mUV = aUV * vec2(2.1, 3.2);
          float mRow = floor(mUV.y);
          float mOff = mod(mRow, 2.0) * 0.5;
          vec2 mCell = vec2(fract(mUV.x + mOff), fract(mUV.y));
          float mId = archHash21(vec2(floor(mUV.x + mOff), mRow));
          float bx = min(mCell.x, 1.0 - mCell.x);
          float by = min(mCell.y, 1.0 - mCell.y);
          float mortar = smoothstep(0.04, 0.15, min(bx, by));
          float masonryShade = mix(1.0, mix(0.76, 1.05, mortar) * mix(0.90, 1.09, mId) * mix(0.95, 1.05, aFine), archDistFade);
          diffuseColor.rgb *= masonryShade;
          float moss = (1.0 - smoothstep(0.0, 0.45, vArchWorldPos.y)) * smoothstep(0.45, 0.85, aNoise);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.54, 0.34), moss * 0.36);
        } else if (uArchStyle < 3.5) {
          // TIMBER: warm hand-hewn wood planks & grain lines
          float grain = sin(aUV.y * 28.0 + archNoise2(aUV * 5.0) * 4.5) * 0.5 + 0.5;
          float plank = smoothstep(0.03, 0.11, abs(fract(aUV.x * 2.6) - 0.5));
          diffuseColor.rgb *= mix(1.0, mix(0.86, 1.08, grain * 0.65 + aNoise * 0.35) * mix(0.82, 1.0, plank), 0.35 + 0.65 * archDistFade);
        } else if (uArchStyle < 4.5) {
          // MARBLE: swirling pearlescent veins + delicate gold mineral flecks
          float vein = abs(sin((aUV.x + aUV.y * 0.7) * 3.2 + archNoise2(aUV * 2.6) * 5.0));
          float streak = pow(clamp(1.0 - vein, 0.0001, 1.0), 4.0);
          diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.96, 1.04, aNoise), diffuseColor.rgb * 0.78 + vec3(0.14, 0.12, 0.20), streak * 0.48);
        } else {
          // CRYSTAL: faceted internal prism shimmer + Fresnel rim luminescence
          float facet = archHash21(floor(aUV * 4.5));
          vec3 V_view = normalize(vViewPosition + vec3(0.0, 0.0, 1e-5));
          float fres = pow(max(1.0 - clamp(abs(dot(V_view, normalize(vNormal + vec3(0.0, 1e-5, 0.0)))), 0.0, 1.0), 0.0001), 2.2);
          float pulse = 0.86 + 0.14 * sin(uTime * 2.4 + vArchWorldPos.x * 1.5 + vArchWorldPos.z);
          diffuseColor.rgb = diffuseColor.rgb * mix(0.88, 1.18, facet) * pulse + vec3(0.28, 0.42, 0.52) * fres * 0.55;
        }
        `
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        if (uArchStyle > 0.5 && uArchStyle < 3.5) {
          float bumpFade = 1.0 - smoothstep(10.0, 22.0, length(cameraPosition - vArchWorldPos));
          if (bumpFade > 0.01) {
            vec2 bUV = archPlanarUV(vArchWorldPos, vArchWorldNorm);
            float n0 = archNoise2(bUV * 4.2);
            float nx = archNoise2((bUV + vec2(0.06, 0.0)) * 4.2);
            float ny = archNoise2((bUV + vec2(0.0, 0.06)) * 4.2);
            vec3 pert = normalize(vec3((n0 - nx) * 0.9, 1.0, (n0 - ny) * 0.9));
            vec3 vPert = normalize((viewMatrix * vec4(pert, 0.0)).xyz + vec3(0.0, 0.0, 1e-5));
            normal = normalize(mix(normal, vPert, (uArchStyle > 1.5 && uArchStyle < 2.5 ? 0.16 : 0.11) * bumpFade));
          }
        }
        `
      );
  };
}

/**
 * Foliage Wind-Sway & Subsurface Scatter Shader:
 * - Organic gentle breeze motion weighted by height above stem/base
 * - Painterly leaf micro-stipple & warm backlit crown translucency
 */
export function applyFoliageShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_foliage_pbr_v2';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uVibrant = uniforms.uVibrant;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        varying vec3 vFoliageWorldPos;
        varying float vFoliageLocalY;
        varying float vFoliageGust;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 foliageAnchor = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        #else
          vec3 foliageAnchor = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float fPhase = foliageAnchor.x * 0.65 + foliageAnchor.z * 0.85;
        float travelGust = sin(foliageAnchor.x * 0.22 + foliageAnchor.z * 0.16 - uTime * 1.45) * 0.5 + 0.5;
        float gustStrength = 0.65 + travelGust * 0.9;
        float swayW = clamp(transformed.y + 0.45, 0.0, 1.65);
        transformed.x += (sin(uTime * 2.1 + fPhase + transformed.y * 1.5) * 0.082 + cos(uTime * 4.3 + transformed.z * 3.0 + fPhase) * 0.028) * swayW * gustStrength;
        transformed.z += (cos(uTime * 1.75 + fPhase * 1.18 + transformed.y * 1.2) * 0.064 + sin(uTime * 3.7 + transformed.x * 3.0) * 0.022) * swayW * gustStrength;
        float breath = 1.0 + sin(uTime * 2.3 + fPhase) * 0.03;
        transformed *= vec3(breath, 1.0 + sin(uTime * 2.8 + fPhase) * 0.02, breath);
        vFoliageLocalY = transformed.y;
        vFoliageGust = travelGust;
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #include <project_vertex>
        #ifdef USE_INSTANCING
          vFoliageWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vFoliageWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform float uVibrant;
        varying vec3 vFoliageWorldPos;
        varying float vFoliageLocalY;
        varying float vFoliageGust;
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        // Leaf cluster dappled texture, sunlit breeze shimmer & crown translucency
        float leafPattern = sin(vFoliageWorldPos.x * 11.0 + vFoliageWorldPos.y * 7.0 + uTime * 1.2) *
          cos(vFoliageWorldPos.z * 11.0 - vFoliageWorldPos.y * 5.0 - uTime * 0.9);
        float crownAO = smoothstep(-0.55, 0.58, vFoliageLocalY);
        diffuseColor.rgb *= mix(0.76, 1.16, crownAO) * (0.95 + leafPattern * 0.07);
        // Subtle warm backlit leaf edge luminescence pulsing softly in breeze gusts
        diffuseColor.rgb += diffuseColor.rgb * (0.14 + uVibrant * 0.08 + vFoliageGust * 0.09) * crownAO;
        `
      );
  };
}

/**
 * Underwater Ocean Current Sway Shader:
 * - Fluid continuous wave sway for Coral Reef kelp forests, sea anemones & sea fans
 */
export function applyUnderwaterSwayShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_underwater_sway_v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 seaOrigin = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        #else
          vec3 seaOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float sPhase = seaOrigin.x * 0.85 + seaOrigin.z * 0.65;
        float hFrac = clamp(transformed.y, 0.0, 1.6);
        float swayBend = hFrac * hFrac;
        transformed.x += sin(uTime * 1.85 + sPhase + hFrac * 2.4) * 0.16 * swayBend;
        transformed.z += cos(uTime * 1.45 + sPhase * 1.3 + hFrac * 2.1) * 0.13 * swayBend;
        `
      );
  };
}

/**
 * Interactive Wind-Swept Grass Blade Shader:
 * - Traveling wind waves across the meadow + local blade flutter
 * - Player footstep radial trampling / parting (uPlayerPos)
 * - Root-to-tip lush gradient (earthy shaded base -> radiant sunlit blade tips)
 */
export function applyGrassShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_grass_pbr_v2';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uPlayerPos = uniforms.uPlayerPos;
    shader.uniforms.uVibrant = uniforms.uVibrant;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute float aBladeTip;
        uniform float uTime;
        uniform vec3 uPlayerPos;
        varying float vGrassTip;
        varying vec2 vGrassWorldXZ;
        varying float vGrassGust;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vGrassTip = clamp(aBladeTip, 0.0, 1.0);
        float tipBend = vGrassTip * vGrassTip;

        #ifdef USE_INSTANCING
          vec3 gOrigin = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        #else
          vec3 gOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        vGrassWorldXZ = gOrigin.xz;

        // Traveling wind gusts + cross-breeze ripples + high-frequency tip flutter
        float gust = sin(gOrigin.x * 0.42 + gOrigin.z * 0.31 - uTime * 2.75);
        float crossBreeze = cos(gOrigin.z * 0.55 - gOrigin.x * 0.24 - uTime * 2.1);
        float flutter = cos(gOrigin.x * 2.3 - gOrigin.z * 1.9 + uTime * 4.8) * 0.38;
        vGrassGust = gust * 0.5 + 0.5;
        transformed.x += (gust * 0.19 + flutter * 0.06) * tipBend;
        transformed.z += (crossBreeze * 0.13) * tipBend;

        // Player & companion stepping parted grass bend
        vec2 away = gOrigin.xz - uPlayerPos.xz;
        float distSq = dot(away, away);
        if (distSq < 1.85) {
          float dist = sqrt(max(0.0001, distSq));
          float push = smoothstep(1.36, 0.12, dist) * 0.65 * vGrassTip;
          vec2 dir = away / dist;
          transformed.x += dir.x * push;
          transformed.z += dir.y * push;
          transformed.y *= (1.0 - push * 0.38);
        }
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uVibrant;
        varying float vGrassTip;
        varying vec2 vGrassWorldXZ;
        varying float vGrassGust;
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        // Rich soil-contact AO at base, luminous warm tips & rolling wind sheen
        float patchSun = 0.92 + 0.16 * sin(vGrassWorldXZ.x * 0.32) * cos(vGrassWorldXZ.y * 0.28);
        float tipSafe = max(vGrassTip, 0.0001);
        float vertGrad = mix(0.46, 1.2 + uVibrant * 0.08, pow(tipSafe, 0.72));
        diffuseColor.rgb *= vertGrad * patchSun;
        diffuseColor.rgb += vec3(0.09, 0.11, 0.02) * (vGrassTip * vGrassTip) * (0.85 + vGrassGust * 0.45);
        `
      );
  };
}

/**
 * Ambient Wildlife Wing-Flap Shader:
 * - Animates symmetric butterfly, songbird, dragonfly & swallow wings on GPU
 */
export function applyCritterWingShader(
  mat: THREE.MeshStandardMaterial,
  uniforms: SharedWorldShaderUniforms
): void {
  mat.customProgramCacheKey = () => 'mochi_critter_wing_v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uTime;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 cOrigin = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        #else
          vec3 cOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float cPhase = cOrigin.x * 2.7 + cOrigin.z * 3.9;
        float wingSpan = abs(transformed.x);
        float flapGate = smoothstep(-0.35, 0.35, sin(uTime * 1.35 + cPhase * 1.7));
        float flap = sin(uTime * 18.0 + cPhase) * mix(0.28, 1.0, flapGate);
        transformed.y += flap * wingSpan * 0.92 + 0.05 * wingSpan * (1.0 - flapGate);
        transformed.x *= (1.0 - abs(flap) * 0.18 * smoothstep(0.04, 0.35, wingSpan));
        `
      );
  };
}

// -----------------------------------------------------------------------------
// Procedural Organic 3D Geometry Builders (Non-indexed normalized merging)
// -----------------------------------------------------------------------------

function toNonIndexedClean(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const clean = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!clean.getAttribute('normal')) {
    clean.computeVertexNormals();
  }
  const posCount = clean.getAttribute('position').count;
  if (!clean.getAttribute('uv')) {
    clean.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
  }
  return clean;
}

function mergeNormalizedGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map(toNonIndexedClean);
  let totalVerts = 0;
  for (const p of parts) {
    totalVerts += p.getAttribute('position').count;
  }

  const posOut = new Float32Array(totalVerts * 3);
  const normOut = new Float32Array(totalVerts * 3);
  const uvOut = new Float32Array(totalVerts * 2);

  let offset = 0;
  for (const p of parts) {
    const pos = p.getAttribute('position');
    const norm = p.getAttribute('normal');
    const uv = p.getAttribute('uv');
    const count = pos.count;
    for (let i = 0; i < count; i++) {
      const i3 = (offset + i) * 3;
      const i2 = (offset + i) * 2;
      posOut[i3] = pos.getX(i);
      posOut[i3 + 1] = pos.getY(i);
      posOut[i3 + 2] = pos.getZ(i);
      normOut[i3] = norm.getX(i);
      normOut[i3 + 1] = norm.getY(i);
      normOut[i3 + 2] = norm.getZ(i);
      uvOut[i2] = uv.getX(i);
      uvOut[i2 + 1] = uv.getY(i);
    }
    offset += count;
    p.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Multi-puff 3D cumulus cloud geometry (replaces flat single-sphere clouds).
 */
export function createCumulusCloudGeometry(): THREE.BufferGeometry {
  const puffs: THREE.BufferGeometry[] = [];
  const specs: [number, number, number, number, number, number][] = [
    [0, 0.08, 0, 1.0, 0.72, 0.88],
    [-0.78, -0.04, 0.12, 0.72, 0.55, 0.68],
    [0.76, -0.02, -0.08, 0.76, 0.58, 0.72],
    [0.18, 0.34, 0.04, 0.65, 0.56, 0.62],
    [-0.36, 0.24, -0.14, 0.58, 0.48, 0.56],
  ];
  for (const [px, py, pz, sx, sy, sz] of specs) {
    const s = new THREE.SphereGeometry(0.85, 10, 8);
    s.scale(sx, sy, sz);
    s.translate(px, py, pz);
    puffs.push(s);
  }
  const merged = mergeNormalizedGeometries(puffs);
  for (const p of puffs) p.dispose();
  return merged;
}

/**
 * Flared-root gnarled storybook trunk with 2 forked upper branches (pivoted at y = 0).
 */
export function createOrganicTreeTrunkGeometry(): THREE.BufferGeometry {
  const rootCollar = new THREE.CylinderGeometry(0.18, 0.3, 0.28, 9);
  rootCollar.translate(0, 0.14, 0);

  const mainStem = new THREE.CylinderGeometry(0.115, 0.185, 0.92, 9);
  mainStem.translate(0, 0.62, 0);
  mainStem.rotateZ(0.05);

  const limbA = new THREE.CylinderGeometry(0.065, 0.105, 0.56, 7);
  limbA.translate(0, 0.28, 0);
  limbA.rotateZ(0.54);
  limbA.rotateY(0.35);
  limbA.translate(-0.02, 0.92, 0.02);

  const limbB = new THREE.CylinderGeometry(0.06, 0.095, 0.5, 7);
  limbB.translate(0, 0.25, 0);
  limbB.rotateZ(-0.58);
  limbB.rotateY(-0.45);
  limbB.translate(0.03, 0.88, -0.02);

  const limbC = new THREE.CylinderGeometry(0.045, 0.075, 0.38, 6);
  limbC.translate(0, 0.19, 0);
  limbC.rotateX(0.48);
  limbC.translate(0, 0.96, 0.03);

  const merged = mergeNormalizedGeometries([rootCollar, mainStem, limbA, limbB, limbC]);
  rootCollar.dispose();
  mainStem.dispose();
  limbA.dispose();
  limbB.dispose();
  limbC.dispose();
  return merged;
}

/**
 * Scalloped multi-lobe organic leaf cluster puff (replaces flat dodecahedron balls).
 */
export function createOrganicLeafClusterGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.56, 1);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const lobe =
      1.0 +
      0.16 * Math.sin(vx * 5.2 + vy * 3.8) +
      0.13 * Math.cos(vz * 5.6 - vx * 3.1) +
      0.08 * Math.sin((vx + vz) * 7.5);
    const flatBottom = vy < 0 ? 0.78 : 1.04;
    pos.setXYZ(i, vx * lobe, vy * lobe * flatBottom, vz * lobe);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Fluted scalloped evergreen pine bough skirt (pivoted at y = 0).
 */
export function createFlutedPineBoughGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.64, 0.88, 12, 3);
  geo.translate(0, 0.44, 0);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const r = Math.hypot(vx, vz);
    if (r > 0.05) {
      const ang = Math.atan2(vz, vx);
      const rib = 0.84 + 0.24 * Math.abs(Math.cos(ang * 3.0));
      const skirtDrop = vy < 0.16 ? -0.07 * Math.cos(ang * 3.0) : 0;
      pos.setXYZ(i, vx * rib, vy + skirtDrop, vz * rib);
    }
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * 3-blade arched tapered grass tuft pivoted at y = 0, with aBladeTip in [0..1] for root-tip shading.
 */
export function createGrassTuftGeometry(): THREE.BufferGeometry {
  const blades = 3;
  const segsY = 3;
  const trisPerBlade = segsY * 2 - 1;
  const vertsPerBlade = trisPerBlade * 3;
  const totalVerts = blades * vertsPerBlade;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const bladeTips = new Float32Array(totalVerts);

  let ptr = 0;
  const pushVert = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) => {
    const i3 = ptr * 3;
    const i2 = ptr * 2;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    normals[i3] = nx;
    normals[i3 + 1] = ny;
    normals[i3 + 2] = nz;
    uvs[i2] = u;
    uvs[i2 + 1] = v;
    bladeTips[ptr] = v;
    ptr++;
  };

  for (let b = 0; b < blades; b++) {
    const yaw = (b / blades) * Math.PI * 2 + 0.35;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const bladeH = 0.42 + (b === 1 ? 0.08 : b === 2 ? -0.04 : 0);
    const baseW = 0.072;
    const archOut = 0.11;

    const pt = (hFrac: number, side: number): [number, number, number] => {
      const width = baseW * (1.0 - hFrac * 0.92) * side;
      const y = hFrac * bladeH;
      const forward = hFrac * hFrac * archOut + 0.03;
      const x = cosY * width - sinY * forward;
      const z = sinY * width + cosY * forward;
      return [x, y, z];
    };

    const nx = -sinY * 0.2;
    const ny = 0.96;
    const nz = cosY * 0.2;

    for (let s = 0; s < segsY; s++) {
      const v0 = s / segsY;
      const v1 = (s + 1) / segsY;
      const [lx0, ly0, lz0] = pt(v0, -1);
      const [rx0, ry0, rz0] = pt(v0, 1);

      if (s === segsY - 1) {
        const [tx, ty, tz] = pt(1.0, 0);
        pushVert(lx0, ly0, lz0, nx, ny, nz, 0, v0);
        pushVert(rx0, ry0, rz0, nx, ny, nz, 1, v0);
        pushVert(tx, ty, tz, nx, ny, nz, 0.5, 1.0);
      } else {
        const [lx1, ly1, lz1] = pt(v1, -1);
        const [rx1, ry1, rz1] = pt(v1, 1);
        pushVert(lx0, ly0, lz0, nx, ny, nz, 0, v0);
        pushVert(rx0, ry0, rz0, nx, ny, nz, 1, v0);
        pushVert(rx1, ry1, rz1, nx, ny, nz, 1, v1);

        pushVert(lx0, ly0, lz0, nx, ny, nz, 0, v0);
        pushVert(rx1, ry1, rz1, nx, ny, nz, 1, v1);
        pushVert(lx1, ly1, lz1, nx, ny, nz, 0, v1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aBladeTip', new THREE.BufferAttribute(bladeTips, 1));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Dual-wing + slender body geometry pivoted at origin for fluttering butterflies, birds & dragonflies.
 */
export function createCritterWingGeometry(): THREE.BufferGeometry {
  const tris: number[] = [
    0, 0.02, 0.14,  -0.035, 0, 0,   0.035, 0, 0,
    0, 0, -0.16,    0.035, 0, 0,   -0.035, 0, 0,
    -0.02, 0, 0.08,  -0.38, 0.04, 0.18,  -0.34, 0.02, -0.05,
    -0.02, 0, 0.08,  -0.34, 0.02, -0.05, -0.02, 0, -0.06,
    -0.02, 0, -0.02, -0.26, 0.01, -0.04, -0.18, 0.01, -0.2,
    -0.02, 0, -0.02, -0.18, 0.01, -0.2,  -0.02, 0, -0.12,
    0.02, 0, 0.08,   0.34, 0.02, -0.05,  0.38, 0.04, 0.18,
    0.02, 0, 0.08,   0.02, 0, -0.06,     0.34, 0.02, -0.05,
    0.02, 0, -0.02,  0.18, 0.01, -0.2,   0.26, 0.01, -0.04,
    0.02, 0, -0.02,  0.02, 0, -0.12,     0.18, 0.01, -0.2,
  ];
  const positions = new Float32Array(tris);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Outdoor atmospheric PMREM environment scene (zenith sky, horizon glow, golden sun orb, emerald meadow bounce)
 * so water, crystals, bronze metals, roofs, and plush fur reflect real natural daylight instead of gray studio walls.
 */
export function createOutdoorEnvScene(): THREE.Scene {
  const envScene = new THREE.Scene();

  const zenithMesh = new THREE.Mesh(
    new THREE.SphereGeometry(20, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshBasicMaterial({ color: 0x6ac4ff, side: THREE.BackSide })
  );
  envScene.add(zenithMesh);

  const horizonBand = new THREE.Mesh(
    new THREE.CylinderGeometry(19, 19, 8, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xdff5ff, side: THREE.BackSide })
  );
  horizonBand.position.y = 1.5;
  envScene.add(horizonBand);

  const groundDisc = new THREE.Mesh(
    new THREE.SphereGeometry(20, 20, 10, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52),
    new THREE.MeshBasicMaterial({ color: 0x3b7a5e, side: THREE.BackSide })
  );
  envScene.add(groundDisc);

  // Warm solar reflection highlight card
  const sunCard = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff0b8 })
  );
  sunCard.position.set(10, 14, 8);
  envScene.add(sunCard);

  // Soft opposite pastel sky bounce card
  const skyFillCard = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshBasicMaterial({ color: 0x99dcff, side: THREE.DoubleSide })
  );
  skyFillCard.position.set(-12, 7, -10);
  skyFillCard.lookAt(0, 0, 0);
  envScene.add(skyFillCard);

  return envScene;
}

/**
 * Domed bell toadstool cap geometry pivoted cleanly at the cap base (y = 0).
 */
export function createToadstoolCapGeometry(): THREE.BufferGeometry {
  const cap = new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  cap.scale(1.0, 0.72, 1.0);
  cap.translate(0, 0.04, 0);
  const gill = new THREE.CylinderGeometry(0.32, 0.16, 0.09, 12);
  gill.translate(0, -0.01, 0);
  const merged = mergeNormalizedGeometries([cap, gill]);
  cap.dispose();
  gill.dispose();
  return merged;
}

/**
 * Sculpted 5-petal cupped wildflower blossom pivoted at base (y = 0).
 */
export function createWildflowerBlossomGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(0.16, 7, 6);
    petal.scale(0.85, 0.34, 1.28);
    petal.rotateX(-0.28);
    petal.rotateY(ang);
    petal.translate(Math.sin(ang) * 0.15, 0.05, Math.cos(ang) * 0.15);
    parts.push(petal);
  }
  const heart = new THREE.SphereGeometry(0.11, 8, 6);
  heart.scale(1, 0.68, 1);
  heart.translate(0, 0.075, 0);
  parts.push(heart);
  const merged = mergeNormalizedGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Tapered storybook harbor skiff hull (curved flared gunwales + pointed bow & stern).
 */
export function createCoastalSkiffHullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(0.56, 0.22, 1.18, 2, 2, 6);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const zn = z / 0.59; // -1 stern .. +1 bow
    const widthTaper = Math.max(0.12, 1.0 - Math.pow(Math.abs(zn), 1.75) * 0.88);
    const keelTaper = y < 0 ? 0.58 : 1.05;
    const sheerRise = Math.pow(Math.abs(zn), 2.0) * 0.085;
    pos.setXYZ(i, x * widthTaper * keelTaper, y + 0.11 + sheerRise, z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Elongated hexagonal crystal / rain-drop diamond for weather & motes (replaces boxy cubes).
 */
export function createWeatherCrystalGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(0.085, 0);
  geo.scale(0.65, 1.4, 0.65);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Notched heart-shaped floating water lily pad pivoted cleanly at water level.
 */
export function createLilyPadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(0.32, 12, 0.28, Math.PI * 1.78);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
