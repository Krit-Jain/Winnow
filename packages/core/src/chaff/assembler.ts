import { ChaffMatchResult, QueryBatch } from './types.js';

export class QueryAssembler {
  /**
   * Interleaves a set of match results into a randomized, indistinguishable query batch.
   */
  public assemble(matches: ChaffMatchResult[]): QueryBatch {
    const isReal = new Map<string, boolean>();
    const scripthashes: string[] = [];

    // Flatten all scripthashes and label them
    for (const match of matches) {
      scripthashes.push(match.realScripthash);
      isReal.set(match.realScripthash, true);

      for (const chaff of match.chaffScripthashes) {
        scripthashes.push(chaff);
        // It's possible (though unlikely) a real address was picked as chaff for another address.
        // We only set to false if it's not already tracked as true.
        if (!isReal.has(chaff)) {
          isReal.set(chaff, false);
        }
      }
    }

    // Fisher-Yates shuffle to destroy any positional ordering leaks
    // (e.g. real address always being the 1st in a chunk of K)
    for (let i = scripthashes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scripthashes[i], scripthashes[j]] = [scripthashes[j], scripthashes[i]];
    }

    return {
      scripthashes,
      isReal,
    };
  }
}
