export interface Rng {
  /** Uniform integer in [0, 2^32). */
  nextUint32(): number;
}

export type Face = 1 | 2 | 3 | 4 | 5 | 6;
export type Dice = Face[];

// Largest multiple of 6 that fits in 2^32. Values at or above it are rejected
// so every face keeps probability exactly 1/6.
const LIMIT = 0x1_0000_0000 - (0x1_0000_0000 % 6);

export function rollDie(rng: Rng): Face {
  let x: number;
  do x = rng.nextUint32();
  while (x >= LIMIT);
  return ((x % 6) + 1) as Face;
}

export function rollDice(rng: Rng, n = 6): Dice {
  const out: Dice = [];
  for (let i = 0; i < n; i++) out.push(rollDie(rng));
  return out;
}

export class CryptoRng implements Rng {
  private buf = new Uint32Array(256);
  private i = 256;

  nextUint32(): number {
    if (this.i >= this.buf.length) {
      crypto.getRandomValues(this.buf);
      this.i = 0;
    }
    return this.buf[this.i++];
  }
}

/** MT19937, the 32-bit Mersenne Twister (Matsumoto & Nishimura, 1998). */
export class Mt19937 implements Rng {
  private mt = new Uint32Array(624);
  private idx = 624;

  constructor(seed: number) {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      // Math.imul keeps the 32-bit wraparound that a plain * would lose to float rounding.
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
  }

  private twist(): void {
    const mt = this.mt;
    for (let i = 0; i < 624; i++) {
      const y = (mt[i] & 0x80000000) | (mt[(i + 1) % 624] & 0x7fffffff);
      let v = mt[(i + 397) % 624] ^ (y >>> 1);
      if (y & 1) v ^= 0x9908b0df;
      mt[i] = v;
    }
    this.idx = 0;
  }

  nextUint32(): number {
    if (this.idx >= 624) this.twist();
    let y = this.mt[this.idx++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
