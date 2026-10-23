/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sparse, Delicate Atmospheric Embers Shader
 * Tiny warm amber and orange motes drifting gently in the dark charcoal atmosphere
 */

export const embersVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBaseSize;

attribute float aScale;
attribute float aSpeed;
attribute float aSeed;

varying float vAlpha;
varying float vSeed;

void main() {
  vSeed = aSeed;

  vec3 pos = position;
  
  // Slow upward drift
  float yProgress = mod(pos.y + uTime * aSpeed * 0.55, 38.0);
  pos.y = yProgress - 4.0;

  // Gentle horizontal organic drift
  float t = uTime * 0.18 + aSeed * 25.0;
  pos.x += sin(t * 0.50 + pos.y * 0.12) * 2.2 + cos(t * 0.28) * 1.0;
  pos.z += cos(t * 0.40 + pos.y * 0.10) * 1.4;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Fade at bounds
  float heightFade = smoothstep(-4.0, 3.0, pos.y) * (1.0 - smoothstep(18.0, 32.0, pos.y));
  
  // Shimmer & natural gentle flicker
  float flicker = 0.65 + 0.35 * sin(uTime * 2.0 + aSeed * 80.0);
  vAlpha = heightFade * flicker;

  // Tiny, delicate point size (0.8px to 2.2px)
  gl_PointSize = clamp(uBaseSize * aScale * (22.0 / -mvPosition.z), 0.75, 2.2);
}
`;

export const embersFragmentShader = /* glsl */ `
uniform vec3 uColorAmber;
uniform vec3 uColorOrange;
uniform vec3 uColorGold;

varying float vAlpha;
varying float vSeed;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float core = smoothstep(0.5, 0.08, dist);
  float aura = exp(-dist * dist * 18.0);
  float intensity = mix(core, aura, 0.65);

  vec3 emberCol = mix(uColorOrange, uColorAmber, fract(vSeed * 5.73));
  if (vSeed > 0.84) {
    emberCol = mix(emberCol, uColorGold, 0.45);
  }

  gl_FragColor = vec4(emberCol * 1.15, intensity * vAlpha * 0.65);
}
`;
