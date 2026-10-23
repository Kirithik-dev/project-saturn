/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECHO — Organic Motion & Intelligent Lighting Shader Engine
 * Precision Implementation:
 * 1. 3-Layer Organic Surface:
 *    - Layer 1: Deep macro swells (broad, slow diagonal undulations)
 *    - Layer 2: Intersecting hero wave trains with trochoidal gathering
 *    - Layer 3: Delicate capillary currents following the terrain slopes
 *    - Coherent multi-scale domain drift (non-repeating, seamless)
 * 2. Intelligent Spatially Localized Lighting:
 *    - Orbiting virtual key light
 *    - Analytical surface normals and curvature
 *    - Directional diffuse, specular, and Fresnel rim glint
 *    - Localized champagne gold (#F7D794) crest highlights
 *    - Molten orange (#FF6500) and warm amber (#FF8810) mid-tones
 *    - Deep obsidian-amber valleys (#140804) for dramatic 3D contrast
 * 3. Respiration & Atmosphere:
 *    - ~28-second subtle crest respiration cycle
 *    - Restrained atmospheric depth fog blending into #0A0605
 * 4. Graceful pointer disturbance dissipation
 */

export const terrainVertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerIntensity;
uniform float uBasePointSize;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform float uSecondaryIntensity;
uniform vec3 uLightPosition;
uniform vec3 uCameraPos;

attribute float aDensity;
attribute float aRandom;

varying float vElevation;
varying float vCrest;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vAlpha;

// Simplex 2D noise implementation for natural macro-curvature
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Complete 3-Layer Organic Surface Function
void evaluateOrganicSurface(in vec2 p, out vec3 displaced, out vec3 normal, out float crestFactor) {
  float t = uTime * uWaveSpeed;

  // Coherent Domain Drift: slow, evolving multi-scale warping without abrupt jumps
  vec2 warpOffset = vec2(
    snoise(p * 0.013 + vec2(t * 0.040, -t * 0.030)),
    snoise(p * 0.015 + vec2(-t * 0.035, t * 0.045) + vec2(4.8, 1.9))
  ) * 4.8;

  vec2 pw = p + warpOffset;

  float totalH = 0.0;
  vec2 dH = vec2(0.0);
  vec2 horizDisp = vec2(0.0);
  float curvatureAccum = 0.0;

  // ==========================================
  // LAYER 1: Deep Macro Swells (Gravitational Momentum)
  // ==========================================
  // Swell 1A: Primary diagonal long swell
  vec2 dirM1 = normalize(vec2(0.40, -0.91));
  float kM1 = 0.030;
  float wM1 = 0.25;
  float aM1 = 2.4 * uWaveAmplitude;
  float phaseM1 = dot(pw, dirM1) * kM1 - t * wM1;
  totalH += sin(phaseM1) * aM1;
  dH += dirM1 * (kM1 * aM1 * cos(phaseM1));

  // Swell 1B: Secondary counter swell
  vec2 dirM2 = normalize(vec2(-0.68, -0.73));
  float kM2 = 0.024;
  float wM2 = 0.18;
  float aM2 = 1.8 * uWaveAmplitude;
  float phaseM2 = dot(pw, dirM2) * kM2 - t * wM2 + 1.85;
  totalH += sin(phaseM2) * aM2;
  dH += dirM2 * (kM2 * aM2 * cos(phaseM2));

  // ==========================================
  // LAYER 2: Intersecting Hero Wave Trains (Trochoidal Shaping)
  // ==========================================
  // Hero Wave 2A: Sweeping primary diagonal ridge
  vec2 dirA = normalize(vec2(0.52, -0.85));
  float kA = 0.064;
  float wA = 0.56;
  float aA = 3.3 * uWaveAmplitude;
  float qA = 0.46;
  float phaseA = dot(pw, dirA) * kA - t * wA + 0.75;
  float sinA = sin(phaseA);
  float cosA = cos(phaseA);
  float shapeA = pow(0.5 + 0.5 * sinA, 1.85) * 2.0 - 0.7;
  totalH += shapeA * aA;
  horizDisp -= dirA * (qA * aA * cosA);
  dH += dirA * (kA * aA * cosA);
  curvatureAccum += pow(max(sinA, 0.0), 2.8) * 0.95;

  // Hero Wave 2B: Counter-diagonal crossing ridge (creates natural saddles and cols)
  vec2 dirB = normalize(vec2(-0.56, -0.83));
  float kB = 0.052;
  float wB = 0.42;
  float aB = 2.8 * uWaveAmplitude;
  float qB = 0.44;
  float phaseB = dot(pw, dirB) * kB - t * wB + 2.5;
  float sinB = sin(phaseB);
  float cosB = cos(phaseB);
  float shapeB = pow(0.5 + 0.5 * sinB, 1.75) * 2.0 - 0.7;
  totalH += shapeB * aB;
  horizDisp -= dirB * (qB * aB * cosB);
  dH += dirB * (kB * aB * cosB);
  curvatureAccum += pow(max(sinB, 0.0), 2.8) * 0.80;

  // Hero Wave 2C: Transverse dune ridge
  vec2 dirC = normalize(vec2(0.10, -0.99));
  float kC = 0.090;
  float wC = 0.70;
  float aC = 1.8 * uWaveAmplitude * uSecondaryIntensity;
  float phaseC = dot(pw, dirC) * kC - t * wC + 1.35;
  float sinC = sin(phaseC);
  float cosC = cos(phaseC);
  totalH += (pow(0.5 + 0.5 * sinC, 1.9) * 2.0 - 0.6) * aC;
  horizDisp -= dirC * (0.36 * aC * cosC);
  dH += dirC * (kC * aC * cosC);
  curvatureAccum += pow(max(sinC, 0.0), 3.0) * 0.60;

  // ==========================================
  // LAYER 3: Capillary Currents (Flow Streamlines)
  // ==========================================
  // Fine ripple 3A: diagonal flow
  vec2 dirD = normalize(vec2(0.76, -0.65));
  float kD = 0.145;
  float wD = 0.90;
  float aD = 0.85 * uWaveAmplitude * uSecondaryIntensity;
  float phaseD = dot(pw, dirD) * kD - t * wD + 3.6;
  totalH += sin(phaseD) * aD;
  dH += dirD * (kD * aD * cos(phaseD));

  // Fine ripple 3B: transverse micro-ripple
  vec2 dirE = normalize(vec2(-0.30, -0.95));
  float kE = 0.22;
  float wE = 1.20;
  float aE = 0.40 * uSecondaryIntensity;
  float phaseE = dot(pw, dirE) * kE - t * wE + 2.0;
  totalH += sin(phaseE) * aE;
  dH += dirE * (kE * aE * cos(phaseE));

  // Coherent rolling topography envelope
  float hillA = snoise((pw + vec2(10.0, -8.0)) * 0.018) * 2.8;
  float hillB = snoise((pw - vec2(20.0, 16.0)) * 0.014) * 2.2;
  totalH += (hillA + hillB);

  // Smooth Boundary Attenuations
  // Distant horizon taper
  float horizonFade = smoothstep(-60.0, -22.0, p.y);
  totalH *= (0.42 + 0.58 * horizonFade);

  // Foreground gentle roll-off
  float fgRamp = smoothstep(28.0, 8.0, p.y);
  totalH = totalH * (0.62 + 0.38 * fgRamp) - (1.0 - fgRamp) * 1.6;

  // Final displaced world coordinates
  displaced = vec3(p.x + horizDisp.x, totalH, p.y + horizDisp.y);

  // Exact analytical surface normal
  normal = normalize(vec3(-dH.x, 1.0, -dH.y));

  // Crest curvature factor: high at sharp, convex ridges
  crestFactor = clamp(curvatureAccum * 0.52 + (totalH * 0.075), 0.0, 1.0);
}

void main() {
  vec2 p = position.xy;

  vec3 worldPos;
  vec3 surfNormal;
  float crest;
  evaluateOrganicSurface(p, worldPos, surfNormal, crest);

  // Smooth, Velocity-Aware Pointer Disturbance:
  // Propagates as a damped circular wave packet and smoothly decays when pointer stops
  if (uPointerIntensity > 0.001) {
    vec2 pointerPos = vec2(uPointer.x * 32.0, uPointer.y * 20.0 - 8.0);
    float mouseDist = length(p - pointerPos);
    float pointerEnvelope = exp(-mouseDist * 0.14) * smoothstep(24.0, 0.0, mouseDist);
    float pointerWave = sin(mouseDist * 0.40 - uTime * 2.5) * pointerEnvelope * 0.45 * uPointerIntensity;
    worldPos.y += pointerWave;
  }

  vElevation = worldPos.y;
  vCrest = crest;
  vNormal = surfNormal;
  vWorldPos = worldPos;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;

  // Perspective-Aware Point Sizing:
  // Points remain distinct, individual glowing particles without merging into solid rods
  float viewDist = length(mvPosition.xyz);
  float pSize = uBasePointSize * (40.0 / viewDist);
  pSize *= (0.82 + 0.32 * crest);

  // Strict clamp: fine pinpoints (0.9px to 2.8px max)
  gl_PointSize = clamp(pSize, 0.9, 2.8);

  // Depth-layer alpha factor
  float fgFade = smoothstep(26.0, 6.0, worldPos.z);
  vAlpha = aDensity * (0.55 + 0.45 * fgFade);
}
`;

export const terrainFragmentShader = /* glsl */ `
uniform vec3 uColorBase;            // Near-black background (#0A0605)
uniform vec3 uColorDarkTrough;      // Deep obsidian-amber valley (#140804)
uniform vec3 uColorBurntOrange;      // Rich molten orange (#FF6500)
uniform vec3 uColorAmber;            // Warm amber (#FF8810)
uniform vec3 uColorChampagneGold;    // Refined champagne gold highlight (#F7D794)
uniform vec3 uLightPosition;        // Orbiting virtual key light
uniform vec3 uCameraPos;            // World camera position
uniform float uTime;

varying float vElevation;
varying float vCrest;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;

  // Individual point disc falloff
  float pointFalloff = exp(-r * r * 14.0) * (1.0 - smoothstep(0.38, 0.50, r));

  // Normalized height from dark trough to peak
  float normH = clamp((vElevation + 2.2) / 10.0, 0.0, 1.0);

  // 1. Base Palette Gradient:
  // Deep valley (#140804) -> Molten orange (#FF6500) -> Warm amber (#FF8810)
  vec3 col = mix(uColorDarkTrough, uColorBurntOrange, smoothstep(0.08, 0.40, normH));
  col = mix(col, uColorAmber, smoothstep(0.38, 0.78, normH));

  // 2. Intelligent Spatially Localized Lighting:
  // Evaluated from analytical surface normal, orbiting virtual key light, and view vector
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPosition - vWorldPos);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);

  // Directional diffuse response
  float NdotL = max(dot(N, L), 0.0);

  // Specular glint along curved crests
  float NdotH = max(dot(N, H), 0.0);
  float specular = pow(NdotH, 22.0);

  // Restrained Fresnel rim response where surface orientation grazes view vector
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);

  // 3. Gliding Champagne-Gold Crest Highlights:
  // Localized strictly to selected elevated crests and favorable light angles
  float crestConcentration = smoothstep(0.38, 0.90, vCrest) * smoothstep(0.32, 0.88, normH);
  float highlightIntensity = crestConcentration * (0.30 + 0.70 * NdotL + 0.80 * specular + 0.40 * fresnel);

  // 4. Gentle Luminosity Respiration:
  // ~28-second smooth continuous cycle strictly on crest highlights (independent of wave motion)
  float respiration = 0.92 + 0.08 * sin(uTime * 0.2244);
  highlightIntensity *= respiration;

  // Blend into refined champagne gold (#F7D794)
  col = mix(col, uColorChampagneGold, clamp(highlightIntensity * 0.78, 0.0, 1.0));

  // Emissive highlight boost (keeps highlights fiery golden, never pale white)
  col *= (1.0 + highlightIntensity * 0.65);

  // 5. Contrast & Valley Grounding:
  // Valleys remain deep obsidian-amber (#140804) to preserve rich 3D contrast & negative space
  float valleyShadow = smoothstep(0.35, 0.04, normH);
  col = mix(col, uColorDarkTrough, valleyShadow * 0.72);

  // 6. Atmospheric Depth:
  // Distance fog subdues luminance and detail, softly blending horizon into #0A0605
  float dist = length(vViewPosition);
  float fog = smoothstep(30.0, 125.0, dist);
  vec3 finalColor = mix(col, uColorBase, fog * 0.96);

  // Outer boundary alpha fade
  float boundaryAlpha = 1.0 - smoothstep(92.0, 125.0, dist);
  float finalAlpha = pointFalloff * vAlpha * boundaryAlpha;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;
