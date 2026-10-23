/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECHO Procedural Wave Evolution Engine
 * Smooth continuous parameter drift across 100 variations to ensure
 * the digital wave landscape evolves organically without looping or repeating.
 */

export interface WaveParameters {
  waveSpeed: number;           // 0.45 to 0.75
  waveAmplitude: number;       // 0.90 to 1.25
  secondaryIntensity: number;  // 0.80 to 1.20
  drift: number;               // 0.35 to 0.65
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate100WaveVariations(): WaveParameters[] {
  const variations: WaveParameters[] = [];
  const rng = mulberry32(849201);

  for (let i = 0; i < 100; i++) {
    variations.push({
      waveSpeed: 0.50 + rng() * 0.22,
      waveAmplitude: 0.94 + rng() * 0.28,
      secondaryIntensity: 0.85 + rng() * 0.30,
      drift: 0.38 + rng() * 0.26,
    });
  }

  return variations;
}

export const WAVE_VARIATIONS = generate100WaveVariations();

export class WaveVariationBlender {
  private currentIndex = 0;
  private targetIndex = 1;
  private progress = 0;
  private transitionDuration = 22.0; // 22 seconds per subtle evolutionary epoch
  public current: WaveParameters;

  constructor() {
    this.current = { ...WAVE_VARIATIONS[0] };
  }

  public update(delta: number): void {
    this.progress += delta / this.transitionDuration;

    if (this.progress >= 1.0) {
      this.progress = 0;
      this.currentIndex = this.targetIndex;
      this.targetIndex = (this.targetIndex + 1) % 100;
    }

    // Smooth cubic Hermite interpolation
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    const vA = WAVE_VARIATIONS[this.currentIndex];
    const vB = WAVE_VARIATIONS[this.targetIndex];

    const lerp = (a: number, b: number) => a + (b - a) * t;

    this.current.waveSpeed = lerp(vA.waveSpeed, vB.waveSpeed);
    this.current.waveAmplitude = lerp(vA.waveAmplitude, vB.waveAmplitude);
    this.current.secondaryIntensity = lerp(vA.secondaryIntensity, vB.secondaryIntensity);
    this.current.drift = lerp(vA.drift, vB.drift);
  }
}
