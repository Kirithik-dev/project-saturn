/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Cinematic Space Sequence Login Background
 * 
 * Faithfully recreates the visual atmosphere of the ground-truth reference image:
 * 1. Deep Space Opening: Almost completely black void, scattered distant stars, subtle cosmic dust.
 * 2. Cosmic Journey: Smooth forward camera flight through the starfield with natural depth parallax.
 * 3. Saturn Approach: Saturn emerges from darkness, revealing its realistic beige, bronze, and muted-gold
 *    atmospheric bands, multi-layered rings, ring shadows on the globe, and globe shadow on the rings.
 * 4. Final Cinematic Framing: Eases into the exact composition of the reference image:
 *    - Directional sunlight from the right illuminating Saturn's right limb in warm champagne-gold and amber
 *    - Rings sweeping diagonally from top-left to bottom-right across the frame
 *    - Real-time ring shadow cast onto Saturn's northern hemisphere
 *    - Real-time planet shadow cast onto the rings behind the shadowed left hemisphere
 *    - Spherical moon nestled near the rings on the left side
 *    - Subtle diagonal Milky Way star-dust haze in deep black space
 * 5. Living Final Scene: Subtle axial rotation of Saturn, slow ring orbital motion, and continuous moon revolution.
 * 6. Returning-User 30-Minute Cooldown: Stored in localStorage. Repeat visits within 30 minutes skip the travel
 *    sequence and immediately show the final living Saturn scene.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CINEMATIC_STORAGE_KEY = 'saturn_login_cinematic_completed_at';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export function shouldSkipLoginCinematic(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(CINEMATIC_STORAGE_KEY);
    if (!stored) return false;
    const timestamp = parseInt(stored, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markLoginCinematicCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CINEMATIC_STORAGE_KEY, Date.now().toString());
  } catch {
    // Graceful fallback if storage is restricted
  }
}

// Directional sunlight from the right/front matching the reference image
const SUN_DIRECTION = new THREE.Vector3(0.92, 0.16, 0.36).normalize();

// ============================================================================
// 1. SATURN GLOBE SHADER (Atmospheric Bands + Ring Shadow on Globe + Limb Glow)
// ============================================================================
const saturnGlobeVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const saturnGlobeFragmentShader = `
  uniform vec3 uSunDir;
  uniform vec3 uPlanetCenter;
  uniform vec3 uRingNormal;
  uniform float uTime;
  uniform float uRevealBrightness;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise1D(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  // Multi-frequency zonal atmospheric bands matching reference image
  float fbmBands(float y, float lon) {
    float v = 0.0;
    v += 0.52 * sin(y * 16.0 + sin(lon * 2.0) * 0.08);
    v += 0.28 * sin(y * 38.0 + cos(lon * 3.0) * 0.06);
    v += 0.14 * noise1D(y * 70.0 + sin(lon * 3.5) * 0.25);
    v += 0.06 * noise1D(y * 150.0);
    return v;
  }

  // Ring density function for casting accurate ring shadow onto Saturn's clouds
  float sampleRingShadowDensity(float r) {
    if (r < 3.05 || r > 6.28) return 0.0;
    // C-Ring
    if (r < 3.72) {
      float t = (r - 3.05) / (3.72 - 3.05);
      return 0.22 * smoothstep(0.0, 0.25, t);
    }
    // B-Ring (broad main ring)
    if (r < 4.88) {
      float grooves = 0.82 + 0.18 * sin(r * 90.0) * cos(r * 40.0);
      return 0.85 * grooves;
    }
    // Cassini Division
    if (r < 5.10) {
      return 0.04;
    }
    // A-Ring
    if (r < 6.08) {
      float encke = smoothstep(0.0, 0.035, abs(r - 5.82));
      return 0.65 * encke;
    }
    return 0.0;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSunDir);

    float lat = clamp(vLocalPosition.y / 2.55, -1.0, 1.0);
    float lon = atan(vLocalPosition.z, vLocalPosition.x) + uTime * 0.008;

    // Palette strictly matching reference image:
    vec3 colBrightSunLimb = vec3(0.98, 0.90, 0.76); // Luminous champagne-gold sunlit rim
    vec3 colChampagneGold = vec3(0.92, 0.78, 0.56); // Warm golden equatorial bands
    vec3 colWarmAmber     = vec3(0.78, 0.54, 0.32); // Amber-caramel tropical belts
    vec3 colDustyBeige    = vec3(0.82, 0.72, 0.55); // Dusty cream sub-belts
    vec3 colDeepUmber     = vec3(0.42, 0.28, 0.16); // Deep bronze-brown furrows
    vec3 colDarkNight     = vec3(0.02, 0.015, 0.01); // Deep shadowed night side

    float bandPattern = fbmBands(lat, lon);
    float absLat = abs(lat);

    // Latitude base gradient
    vec3 baseAlbedo = mix(colChampagneGold, colDustyBeige, smoothstep(0.05, 0.45, absLat));
    baseAlbedo = mix(baseAlbedo, colWarmAmber, smoothstep(0.28, 0.68, absLat) * 0.70);
    baseAlbedo = mix(baseAlbedo, colDeepUmber, smoothstep(0.62, 0.96, absLat) * 0.80);

    // Fine zonal striations
    baseAlbedo = mix(baseAlbedo, colBrightSunLimb, clamp(bandPattern * 0.40 + 0.15, 0.0, 0.6) * (1.0 - absLat * 0.5));
    baseAlbedo = mix(baseAlbedo, colWarmAmber * 0.85, clamp(-bandPattern * 0.42, 0.0, 0.55));

    // Equatorial bright band
    float eqBoost = exp(-lat * lat * 32.0) * 0.22;
    baseAlbedo = mix(baseAlbedo, colBrightSunLimb, eqBoost);

    // Directional sunlight with soft terminator transition
    float NdotL = dot(N, L);
    float diffuse = smoothstep(-0.12, 0.85, NdotL);
    diffuse = pow(diffuse, 1.15);

    // Real-time ring shadow cast onto Saturn's globe
    float ringShadow = 1.0;
    float denom = dot(L, uRingNormal);
    if (abs(denom) > 0.0001 && NdotL > -0.15) {
      float tHit = dot(uPlanetCenter - vWorldPosition, uRingNormal) / denom;
      if (tHit > 0.0) {
        vec3 hitPoint = vWorldPosition + L * tHit;
        float rHit = length(hitPoint - uPlanetCenter);
        float density = sampleRingShadowDensity(rHit);
        ringShadow = 1.0 - density * 0.88;
      }
    }

    // Atmospheric limb brightening along the sunlit right crescent
    float NdotV = max(dot(N, V), 0.0);
    float limbDarkening = pow(NdotV, 0.32);
    float fresnel = pow(1.0 - NdotV, 3.8);
    vec3 atmoSunLimb = vec3(0.96, 0.84, 0.62) * fresnel * smoothstep(-0.02, 0.55, NdotL) * 0.45;

    // Night side shadow blending into deep space
    vec3 litColor = baseAlbedo * diffuse * ringShadow * limbDarkening + atmoSunLimb;
    litColor += mix(colDarkNight, baseAlbedo * 0.008, limbDarkening);

    gl_FragColor = vec4(litColor * uRevealBrightness, 1.0);
  }
`;

// ============================================================================
// 2. SATURN RINGS SHADER (Detailed Ringlets + Cassini Gap + Planet Shadow)
// ============================================================================
const saturnRingsVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const saturnRingsFragmentShader = `
  uniform vec3 uSunDir;
  uniform vec3 uPlanetCenter;
  uniform vec3 uPlanetInvScale;
  uniform float uRevealBrightness;

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise1D(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  void main() {
    float r = length(vLocalPosition.xy);
    if (r < 3.05 || r > 6.32) discard;

    // High-frequency concentric ringlet detail
    float fineGrooves = 0.5 + 0.5 * sin(r * 155.0 + noise1D(r * 50.0) * 2.8);
    float microGrooves = 0.5 + 0.5 * cos(r * 410.0);
    float ringletNoise = noise1D(r * 105.0);

    // Warm champagne, bronze, and dusty gold palette from reference image
    vec3 colBrightRing = vec3(0.95, 0.85, 0.68);
    vec3 colChampagne  = vec3(0.84, 0.72, 0.54);
    vec3 colWarmAmber  = vec3(0.72, 0.55, 0.38);
    vec3 colDustyBronze = vec3(0.56, 0.45, 0.32);
    vec3 colDarkCrepe  = vec3(0.28, 0.22, 0.16);

    vec3 ringColor = colChampagne;
    float alpha = 0.0;

    // 1. C-Ring (Inner Crepe Ring: 3.05 -> 3.72)
    if (r >= 3.05 && r < 3.72) {
      float t = (r - 3.05) / (3.72 - 3.05);
      float cWave = 0.65 + 0.35 * sin(r * 95.0);
      ringColor = mix(colDarkCrepe, colDustyBronze, t * 0.75);
      alpha = smoothstep(0.0, 0.25, t) * (0.16 + 0.18 * t) * cWave;
    }
    // 2. B-Ring (Broad Main Luminous Ring: 3.72 -> 4.90)
    else if (r >= 3.72 && r < 4.90) {
      float t = (r - 3.72) / (4.90 - 3.72);
      float innerEdge = smoothstep(0.0, 0.04, t);
      float outerEdge = smoothstep(1.0, 0.96, t);
      float bBands = 0.70 + 0.20 * fineGrooves + 0.10 * microGrooves;

      ringColor = mix(colWarmAmber, colChampagne, smoothstep(0.0, 0.35, t));
      ringColor = mix(ringColor, colBrightRing, smoothstep(0.35, 0.88, t) * (0.55 + 0.45 * ringletNoise));
      alpha = (0.72 + 0.24 * ringletNoise) * bBands * innerEdge * outerEdge;
    }
    // 3. Cassini Division (4.90 -> 5.12)
    else if (r >= 4.90 && r < 5.12) {
      float t = (r - 4.90) / (5.12 - 4.90);
      ringColor = colDarkCrepe * 0.7;
      alpha = 0.02 + 0.02 * sin(t * 3.14159);
    }
    // 4. A-Ring (Outer Main Ring: 5.12 -> 6.10)
    else if (r >= 5.12 && r < 6.10) {
      float t = (r - 5.12) / (6.10 - 5.12);
      float innerEdge = smoothstep(0.0, 0.04, t);
      float outerEdge = smoothstep(1.0, 0.95, t);

      // Encke Gap at r = 5.82 & Keeler Gap at r = 6.03
      float enckeGap = smoothstep(0.008, 0.038, abs(r - 5.82));
      float keelerGap = smoothstep(0.004, 0.016, abs(r - 6.03));

      float aBands = 0.75 + 0.18 * fineGrooves + 0.07 * microGrooves;
      ringColor = mix(colChampagne, colDustyBronze, t * 0.45);
      ringColor = mix(ringColor, colBrightRing, (1.0 - t) * 0.35);
      alpha = (0.52 + 0.16 * ringletNoise) * aBands * innerEdge * outerEdge * enckeGap * keelerGap;
    }
    // 5. F-Ring (Delicate Outer Filament: 6.18 -> 6.27)
    else if (r >= 6.18 && r <= 6.27) {
      float fProfile = exp(-pow((r - 6.22) / 0.024, 2.0));
      ringColor = colChampagne;
      alpha = fProfile * 0.32;
    }

    if (alpha < 0.003) discard;

    // Real-time shadow of Saturn's oblate globe onto the rings
    vec3 L = normalize(uSunDir);
    vec3 relPos = vWorldPosition - uPlanetCenter;
    float proj = dot(relPos, L);
    float planetShadow = 1.0;

    if (proj < 0.0) {
      // Ring section is on the anti-solar side of the planet
      vec3 closestOnRay = relPos - L * proj;
      vec3 scaledClosest = closestOnRay * uPlanetInvScale;
      float distFromAxis = length(scaledClosest);
      planetShadow = smoothstep(2.48, 2.62, distFromAxis);
    }

    // Phase angle and forward/back scattering sheen along the sunlit curve
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 radialDir = normalize(relPos);
    float sunAzimuth = 0.84 + 0.16 * dot(radialDir, L);
    float viewPhase = 0.90 + 0.14 * pow(max(dot(-V, L), 0.0), 2.2);

    float finalLight = mix(0.02, sunAzimuth * viewPhase, planetShadow);
    vec3 finalColor = ringColor * finalLight * uRevealBrightness;

    gl_FragColor = vec4(finalColor, alpha * smoothstep(0.0, 0.20, uRevealBrightness));
  }
`;

// ============================================================================
// 3. SPHERICAL MOON SHADER
// ============================================================================
const moonVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const moonFragmentShader = `
  uniform vec3 uSunDir;
  uniform vec3 uSaturnCenter;
  uniform float uRevealBrightness;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    // Dusty cratered terrain variation
    float craterNoise = 0.5 + 0.5 * hash3(floor(vLocalPosition * 18.0));
    vec3 moonBase = mix(vec3(0.55, 0.50, 0.44), vec3(0.72, 0.66, 0.58), craterNoise * 0.4);

    float NdotL = dot(N, L);
    float diffuse = smoothstep(-0.06, 0.82, NdotL);

    // Eclipse test in Saturn's shadow cone
    vec3 rel = vWorldPosition - uSaturnCenter;
    float proj = dot(rel, L);
    float eclipse = 1.0;
    if (proj < 0.0) {
      vec3 perp = rel - L * proj;
      eclipse = smoothstep(2.40, 2.65, length(perp));
    }

    float NdotV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NdotV, 3.2);
    vec3 rim = vec3(0.92, 0.82, 0.68) * fresnel * smoothstep(-0.1, 0.6, NdotL) * 0.35;

    vec3 finalCol = (moonBase * diffuse * eclipse + rim + moonBase * 0.015) * uRevealBrightness;
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

// ============================================================================
// 4. STARFIELD & MILKY WAY STARDUST SHADER
// ============================================================================
const starVertexShader = `
  uniform float uDpr;
  uniform float uTime;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = max(-mvPosition.z, 1.0);
    float pointSize = aSize * uDpr * (195.0 / dist);
    gl_PointSize = clamp(pointSize, 0.8, 6.0);

    float nearFade = smoothstep(1.0, 5.0, dist);
    float farFade = 1.0 - smoothstep(340.0, 480.0, dist);
    float twinkle = 0.88 + 0.12 * sin(uTime * 1.5 + aPhase * 6.28318);
    vAlpha = nearFade * farFade * twinkle;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float intensity = smoothstep(0.5, 0.04, d);
    gl_FragColor = vec4(vColor, intensity * vAlpha);
  }
`;

function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Quintic ease with gentle acceleration and long silky deceleration
function easeCinematicFlight(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.24
    ? 2.1 * x * x / 0.24
    : 1.0 - Math.pow(1.0 - (x - 0.24) / 0.76, 3.4) * (1.0 - 0.24 * 2.1);
}

export interface SaturnLoginCinematicProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SaturnLoginCinematic: React.FC<SaturnLoginCinematicProps> = ({
  className = '',
  style,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Hardware, Motion, & Returning User Detection
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isReturningUser = shouldSkipLoginCinematic();

    // If returning user or reduced motion, skip the long travel sequence
    const shouldSkipJourney = isReturningUser || prefersReducedMotion;
    const JOURNEY_DURATION = shouldSkipJourney ? 0.0 : 10.5; // ~10.5s cinematic sequence

    const rng = createPRNG(48151623);
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 2. Three.js Scene & Perspective Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 520);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // 3. Composition matching reference image:
    // - Saturn's globe positioned slightly upper-center in portrait / center in widescreen
    // - Rings sweep diagonally from upper-left down across the frame
    // - Sun shines from the right side
    const finalCamPos = new THREE.Vector3();
    const finalLookAt = new THREE.Vector3();

    const computeFinalFraming = (aspect: number) => {
      if (aspect < 0.8) {
        // Vertical mobile framing (matching portrait reference 9:16)
        finalCamPos.set(0.08, 0.42, 11.8 / Math.max(0.56, aspect));
        finalLookAt.set(0.05, 0.18, 0.0);
      } else if (aspect < 1.35) {
        finalCamPos.set(0.12, 0.35, 10.4);
        finalLookAt.set(0.08, 0.12, 0.0);
      } else {
        // Widescreen desktop
        finalCamPos.set(0.15, 0.32, 9.2);
        finalLookAt.set(0.10, 0.08, 0.0);
      }
    };
    computeFinalFraming(width / height);

    // Smooth forward camera flight path from deep space (Z = 240) to resting composition
    const buildCameraCurve = () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(7.5, -4.2, 240.0),
          new THREE.Vector3(3.8, -1.8, 175.0),
          new THREE.Vector3(-1.8, 1.2, 110.0),
          new THREE.Vector3(1.4, 0.8, 45.0),
          new THREE.Vector3(0.4, 0.45, 18.0),
          finalCamPos.clone(),
        ],
        false,
        'catmullrom',
        0.5
      );

    const buildLookAtCurve = () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(2.5, -1.5, 160.0),
          new THREE.Vector3(-0.8, 0.6, 95.0),
          new THREE.Vector3(0.6, 0.3, 30.0),
          finalLookAt.clone(),
          finalLookAt.clone(),
        ],
        false,
        'catmullrom',
        0.5
      );

    let camCurve = buildCameraCurve();
    let lookCurve = buildLookAtCurve();

    // 4. Multi-Layered Starfield & Milky Way Stardust
    const bgStarCount = isSoftwareGl || isMobile ? 1800 : 3200;
    const milkyWayStarCount = isSoftwareGl || isMobile ? 1200 : 2400;
    const totalStars = bgStarCount + milkyWayStarCount;

    const starPositions = new Float32Array(totalStars * 3);
    const starColors = new Float32Array(totalStars * 3);
    const starSizes = new Float32Array(totalStars);
    const starPhases = new Float32Array(totalStars);

    const starPalette = [
      new THREE.Color(0xF5F7FA), // Crisp silver-white
      new THREE.Color(0xFFF6E8), // Soft warm ivory
      new THREE.Color(0xEADBB8), // Champagne gold
      new THREE.Color(0xD4A362), // Warm amber star
      new THREE.Color(0xA5B8D0), // Faint blue-white
    ];

    for (let i = 0; i < totalStars; i++) {
      let x = 0;
      let y = 0;
      let z = 0;

      if (i < bgStarCount) {
        // Deep background celestial sphere
        const u = rng();
        const v = rng();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2.0 * v - 1.0);
        const rad = 320.0 + rng() * 140.0;
        x = rad * Math.sin(phi) * Math.cos(theta);
        y = rad * Math.sin(phi) * Math.sin(theta);
        z = rad * Math.cos(phi);
      } else {
        // Diagonal Milky Way stardust stream matching the reference image
        // (runs diagonally across bottom-right and top-left)
        const t = (rng() - 0.5) * 450.0;
        const angle = -0.55; // Diagonal tilt matching reference
        const coreDist = (rng() - 0.5) * (18.0 + Math.abs(t) * 0.12);
        x = Math.cos(angle) * t - Math.sin(angle) * coreDist + (rng() - 0.5) * 15.0;
        y = Math.sin(angle) * t + Math.cos(angle) * coreDist + (rng() - 0.5) * 15.0;
        z = -280.0 + rng() * 540.0;
      }

      starPositions[i * 3 + 0] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const baseCol = starPalette[Math.floor(rng() * starPalette.length)];
      const brightness = i < bgStarCount ? 0.35 + rng() * 0.55 : 0.45 + rng() * 0.55;
      starColors[i * 3 + 0] = baseCol.r * brightness;
      starColors[i * 3 + 1] = baseCol.g * brightness;
      starColors[i * 3 + 2] = baseCol.b * brightness;

      starSizes[i] = i < bgStarCount ? 0.55 + rng() * 0.85 : 0.65 + rng() * 1.15;
      starPhases[i] = rng();
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uDpr: { value: dpr },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 5. SATURN SYSTEM (Tilted Group matching exact reference image angle & lighting)
    const saturnSystemGroup = new THREE.Group();
    saturnSystemGroup.position.set(0, 0, 0);

    // Diagonal tilt matching the reference:
    // Rings sweep from top-left down across the planet to bottom-right
    saturnSystemGroup.rotation.order = 'ZXY';
    saturnSystemGroup.rotation.z = -0.42; // ~ -24° diagonal sweep
    saturnSystemGroup.rotation.x = 0.38;  // ~ +22° forward tilt toward camera
    scene.add(saturnSystemGroup);

    saturnSystemGroup.updateMatrixWorld(true);
    const ringNormalWorld = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(saturnSystemGroup.quaternion)
      .normalize();

    // 5A. Saturn's Globe
    const saturnSegments = isSoftwareGl || isMobile ? 80 : 128;
    const saturnGlobeGeometry = new THREE.SphereGeometry(2.55, saturnSegments, Math.floor(saturnSegments * 0.75));
    const saturnGlobeMaterial = new THREE.ShaderMaterial({
      vertexShader: saturnGlobeVertexShader,
      fragmentShader: saturnGlobeFragmentShader,
      uniforms: {
        uSunDir: { value: SUN_DIRECTION },
        uPlanetCenter: { value: saturnSystemGroup.position },
        uRingNormal: { value: ringNormalWorld },
        uTime: { value: 0 },
        uRevealBrightness: { value: shouldSkipJourney ? 1.0 : 0.0 },
      },
    });

    const saturnGlobeMesh = new THREE.Mesh(saturnGlobeGeometry, saturnGlobeMaterial);
    saturnGlobeMesh.scale.set(1.0, 0.91, 1.0); // Real Saturn polar oblateness (~9%)
    saturnSystemGroup.add(saturnGlobeMesh);

    // 5B. Saturn's Rings (Double-Sided, Multi-Layered with Cassini Gap)
    const ringRadialSegments = isSoftwareGl || isMobile ? 160 : 256;
    const saturnRingsGeometry = new THREE.RingGeometry(3.05, 6.32, ringRadialSegments, 28);
    saturnRingsGeometry.rotateX(-Math.PI / 2);

    const saturnRingsMaterial = new THREE.ShaderMaterial({
      vertexShader: saturnRingsVertexShader,
      fragmentShader: saturnRingsFragmentShader,
      uniforms: {
        uSunDir: { value: SUN_DIRECTION },
        uPlanetCenter: { value: saturnSystemGroup.position },
        uPlanetInvScale: { value: new THREE.Vector3(1.0, 1.0 / 0.91, 1.0) },
        uRevealBrightness: { value: shouldSkipJourney ? 1.0 : 0.0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    const saturnRingsMesh = new THREE.Mesh(saturnRingsGeometry, saturnRingsMaterial);
    saturnSystemGroup.add(saturnRingsMesh);

    // 5C. The Moon (Nestled near the left limb matching reference composition)
    const moonGeometry = new THREE.SphereGeometry(0.22, isSoftwareGl ? 32 : 48, isSoftwareGl ? 24 : 36);
    const moonMaterial = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      uniforms: {
        uSunDir: { value: SUN_DIRECTION },
        uSaturnCenter: { value: saturnSystemGroup.position },
        uRevealBrightness: { value: shouldSkipJourney ? 1.0 : 0.0 },
      },
    });

    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    saturnSystemGroup.add(moonMesh);

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const aspect = width / height;

      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      computeFinalFraming(aspect);
      camCurve = buildCameraCurve();
      lookCurve = buildLookAtCurve();

      renderer.setSize(width, height);
      const nextDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(nextDpr);
      starMaterial.uniforms.uDpr.value = nextDpr;
    };

    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    const startTime = performance.now();
    let frameId = 0;
    let hasMarkedCompleted = shouldSkipJourney;

    const _camPos = new THREE.Vector3();
    const _lookTarget = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const elapsed = (performance.now() - startTime) * 0.001;

      if (!shouldSkipJourney) {
        const rawJourneyT = Math.min(elapsed / JOURNEY_DURATION, 1.0);
        const journeyProgress = easeCinematicFlight(rawJourneyT);

        if (rawJourneyT < 1.0) {
          camCurve.getPoint(journeyProgress, _camPos);
          lookCurve.getPoint(journeyProgress, _lookTarget);
          camera.position.copy(_camPos);
          camera.lookAt(_lookTarget);

          // Gentle banking roll that smoothly settles to zero
          const bankEnvelope = Math.sin(rawJourneyT * Math.PI) * (1.0 - smoothstep(0.65, 1.0, rawJourneyT));
          const bankAngle = Math.sin(rawJourneyT * Math.PI * 2.0) * 0.065 * bankEnvelope;
          camera.rotateZ(bankAngle);

          // Gradual emergence of Saturn from darkness
          const revealBrightness = smoothstep(0.20, 0.85, journeyProgress);
          saturnGlobeMaterial.uniforms.uRevealBrightness.value = revealBrightness;
          saturnRingsMaterial.uniforms.uRevealBrightness.value = revealBrightness;
          moonMaterial.uniforms.uRevealBrightness.value = revealBrightness;
        } else {
          // Flight finished: lock camera at reference composition
          camera.position.copy(finalCamPos);
          camera.lookAt(finalLookAt);

          saturnGlobeMaterial.uniforms.uRevealBrightness.value = 1.0;
          saturnRingsMaterial.uniforms.uRevealBrightness.value = 1.0;
          moonMaterial.uniforms.uRevealBrightness.value = 1.0;

          if (!hasMarkedCompleted) {
            hasMarkedCompleted = true;
            markLoginCinematicCompleted();
          }
        }
      } else {
        // Returning user / reduced motion: camera is already at final composition
        camera.position.copy(finalCamPos);
        camera.lookAt(finalLookAt);
        saturnGlobeMaterial.uniforms.uRevealBrightness.value = 1.0;
        saturnRingsMaterial.uniforms.uRevealBrightness.value = 1.0;
        moonMaterial.uniforms.uRevealBrightness.value = 1.0;
      }

      // Time updates
      saturnGlobeMaterial.uniforms.uTime.value = elapsed;
      starMaterial.uniforms.uTime.value = elapsed;

      // Subtle living planetary motion:
      // Saturn slow axial rotation
      saturnGlobeMesh.rotation.y = elapsed * 0.012;

      // Ring subtle micro-rotation / dynamic phase
      saturnRingsMesh.rotation.z = elapsed * 0.005;

      // Moon Orbital Motion:
      // In the reference image, the moon is situated on the left, near (x: -2.9, y: 0.1, z: 0.2) in Saturn's frame.
      // We set the orbital radius ~4.85 and offset phase so it traverses near this exact spot gracefully!
      const moonOrbitSpeed = 0.12; // graceful, elegant revolution
      const moonAngle = elapsed * moonOrbitSpeed + Math.PI * 0.88;
      const moonRadius = 4.85;
      moonMesh.position.set(
        Math.cos(moonAngle) * moonRadius,
        Math.sin(moonAngle * 1.8) * 0.10, // slight orbital inclination
        Math.sin(moonAngle) * moonRadius
      );
      moonMesh.rotation.y = -moonAngle; // tidally locked

      // Deep space starfield imperceptible drift
      starPoints.rotation.y = elapsed * 0.0008;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    // 8. Proper Cleanup on Unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);

      starGeometry.dispose();
      starMaterial.dispose();

      saturnGlobeGeometry.dispose();
      saturnGlobeMaterial.dispose();
      saturnRingsGeometry.dispose();
      saturnRingsMaterial.dispose();
      moonGeometry.dispose();
      moonMaterial.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="saturn-login-cinematic-canvas"
      aria-label="Cinematic Saturn Space Background"
      role="img"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-[#000000] ${className}`}
      style={style}
    />
  );
};

// Re-export as ParticleLandscape for drop-in backward compatibility with existing imports
export { SaturnLoginCinematic as ParticleLandscape };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
