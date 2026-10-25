/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN Void Sequence — Interstellar & Cosmic Title Collection
 * 
 * Configurable collection of phrases and subtitles for the post-login
 * "Welcome into the Void" cinematic transition.
 */

export interface VoidPhrase {
  title: string;
  subtitle?: string;
}

export const VOID_PHRASES: readonly VoidPhrase[] = [
  {
    title: 'INTO THE VOID',
    subtitle: 'YOUR SECOND BRAIN.',
  },
  {
    title: 'BEYOND THE KNOWN',
    subtitle: 'INITIALIZING YOUR UNIVERSE.',
  },
  {
    title: 'WELCOME TO SATURN',
    subtitle: 'ENCRYPTED NEURAL ARCHITECTURE.',
  },
  {
    title: 'THE UNIVERSE AWAITS',
    subtitle: 'STEPPING INTO THE CELESTIAL VAULT.',
  },
  {
    title: 'ARCHIVE OF THE STARS',
    subtitle: 'SYNCHRONIZING PERSISTENT MEMORY.',
  },
  {
    title: 'ECHOES IN DEEP SPACE',
    subtitle: 'TRANSCENDING DIGITAL BOUNDARIES.',
  },
  {
    title: 'ENTER THE SILENCE',
    subtitle: 'DEEP FOCUS IN INFINITY.',
  },
  {
    title: 'SYSTEM INITIALIZED',
    subtitle: 'ACCESS GRANTED // OBSIDIAN PROTOCOL.',
  },
  {
    title: 'THE OBSIDIAN VAULT',
    subtitle: 'KNOWLEDGE CARVED IN STARLIGHT.',
  },
  {
    title: 'HORIZON ZERO',
    subtitle: 'WHERE THOUGHT BECOMES TIMELESS.',
  },
  {
    title: 'CELESTIAL PROTOCOL ENGAGED',
    subtitle: 'SECURE QUANTUM ENCRYPTION ACTIVE.',
  },
  {
    title: 'REALM OF INFINITY',
    subtitle: 'ALL SYSTEMS HARMONIZED.',
  },
];

const LAST_PHRASE_STORAGE_KEY = 'saturn_last_void_phrase_index';

/**
 * Returns a randomized interstellar phrase from the collection.
 * Ensures no immediate consecutive repetitions across logins.
 */
export function getRandomVoidPhrase(): VoidPhrase {
  if (VOID_PHRASES.length === 0) {
    return { title: 'INTO THE VOID', subtitle: 'YOUR SECOND BRAIN.' };
  }
  if (VOID_PHRASES.length === 1) {
    return VOID_PHRASES[0];
  }

  let lastIndex = -1;
  try {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(LAST_PHRASE_STORAGE_KEY) : null;
    if (stored !== null) {
      lastIndex = parseInt(stored, 10);
    }
  } catch {
    // SessionStorage access may be restricted in sandboxed environments
  }

  let newIndex = Math.floor(Math.random() * VOID_PHRASES.length);
  // Guarantee non-repeating consecutive phrase
  if (newIndex === lastIndex) {
    newIndex = (newIndex + 1 + Math.floor(Math.random() * (VOID_PHRASES.length - 1))) % VOID_PHRASES.length;
  }

  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(LAST_PHRASE_STORAGE_KEY, String(newIndex));
    }
  } catch {
    // Ignore storage write issues
  }

  return VOID_PHRASES[newIndex];
}
