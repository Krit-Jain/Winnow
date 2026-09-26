import { AddressInfo } from '../derivation/types.js';
import { ChaffCandidate, ChaffMatchResult } from './types.js';

export class FeatureMatcher {
  private candidates: ChaffCandidate[] = [];

  /**
   * Loads the harvested pool of live addresses into the matcher.
   */
  public seedPool(candidates: ChaffCandidate[]) {
    this.candidates = [...candidates];
  }

  /**
   * Estimates feature values for a newly derived real wallet address.
   */
  private estimateRealFeatures(real: AddressInfo): { valueMagnitude: number, recency: number } {
    // A new/active wallet address realistically has some dust/small value history 
    // and is relatively recent in block height (if we are syncing).
    // We mock typical features here to match against the real network pool.
    return {
      valueMagnitude: 3, // ~1000 sats typical initial/change magnitude
      recency: 0,        // Will match with anything recent
    };
  }

  /**
   * Selects k-1 best-matching decoys for a real address.
   * MVP uses greedy nearest-neighbor matching.
   */
  public match(real: AddressInfo, k: number): ChaffMatchResult {
    const requiredDecoys = k - 1;
    if (requiredDecoys <= 0) {
      return { realScripthash: real.scripthash, chaffScripthashes: [] };
    }

    // Filter by strict script type match (e.g. P2WPKH must hide among P2WPKH)
    let validPool = this.candidates.filter(c => c.scriptType === real.scriptType);

    // If we don't have enough exact script matches, we fall back to any script type.
    // In a real production environment, we would fetch more candidates.
    if (validPool.length < requiredDecoys) {
      console.warn(`[LCS] Not enough exact script matches for ${real.scriptType}. Falling back to general pool.`);
      validPool = this.candidates;
    }

    // If STILL not enough, duplicate to pad (should rarely happen if pool > 100)
    if (validPool.length < requiredDecoys) {
      const padding = Array(requiredDecoys - validPool.length).fill(validPool[0]);
      validPool.push(...padding);
    }

    const { valueMagnitude } = this.estimateRealFeatures(real);

    // Score candidates by feature distance (lower is better)
    const scored = validPool.map(c => {
      // Distance is absolute difference in value magnitude (0-8 scale)
      const distance = Math.abs(c.valueMagnitude - valueMagnitude);
      // We add a tiny bit of randomness so the same real address doesn't always pick 
      // the exact same decoys if the pool hasn't changed.
      const jitter = Math.random() * 0.5; 
      
      return { candidate: c, score: distance + jitter };
    });

    // Sort by lowest distance and take top K-1
    scored.sort((a, b) => a.score - b.score);
    const selected = scored.slice(0, requiredDecoys).map(s => s.candidate.scripthash);

    return {
      realScripthash: real.scripthash,
      chaffScripthashes: selected
    };
  }
}
