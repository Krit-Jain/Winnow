import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveChaffSource } from '../chaff/mempool.js';
import { FeatureMatcher } from '../chaff/matcher.js';
import { QueryAssembler } from '../chaff/assembler.js';
import { NetworkType, ScriptType, AddressInfo, Chain } from '../derivation/types.js';

// Mock global fetch for LiveChaffSource tests
global.fetch = vi.fn();

describe('Live Chaff Synthesis (LCS) Engine', () => {
  describe('LiveChaffSource', () => {
    let mempool: LiveChaffSource;

    beforeEach(() => {
      mempool = new LiveChaffSource(NetworkType.SIGNET);
      vi.clearAllMocks();
    });

    it('should parse block txs and extract valid candidates', async () => {
      // Mock the Esplora /txs response
      const mockTxs = [
        {
          status: { block_height: 100000 },
          vout: [
            {
              // P2WPKH scriptpubkey
              scriptpubkey: '00147909197210ba4e1c4b73ed485eb1a7428fbbaf70',
              scriptpubkey_address: 'tb1q0y93jusshf8pcjmnw4y9avd8g28mhmtshnkhqy',
              value: 10000
            },
            {
              // OP_RETURN (should be skipped)
              scriptpubkey: '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9',
              value: 0
            }
          ]
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTxs
      });

      const candidates = await mempool.fetchBlockCandidates('dummy_hash');
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].address).toBe('tb1q0y93jusshf8pcjmnw4y9avd8g28mhmtshnkhqy');
      expect(candidates[0].scriptType).toBe(ScriptType.P2WPKH);
      expect(candidates[0].valueMagnitude).toBe(4); // log10(10000) = 4
      expect(candidates[0].recency).toBe(100000);
    });
  });

  describe('FeatureMatcher', () => {
    let matcher: FeatureMatcher;
    
    // Mock a real address to match against
    const realAddress: AddressInfo = {
      address: 'tb1qreal',
      scriptPubKey: new Uint8Array([0, 20, 1, 2, 3]),
      scripthash: 'real_scripthash',
      scriptType: ScriptType.P2WPKH,
      derivationPath: "m/84'/1'/0'/0/0",
      chain: Chain.EXTERNAL,
      index: 0
    };

    beforeEach(() => {
      matcher = new FeatureMatcher();
    });

    it('should match exact script type and pick closest value magnitude', () => {
      // Seed pool with decoys
      matcher.seedPool([
        { scripthash: 'chaff_p2pkh', scriptType: ScriptType.P2PKH, valueMagnitude: 3, recency: 0, address: '', scriptPubKey: new Uint8Array() },
        { scripthash: 'chaff_p2wpkh_far', scriptType: ScriptType.P2WPKH, valueMagnitude: 8, recency: 0, address: '', scriptPubKey: new Uint8Array() },
        { scripthash: 'chaff_p2wpkh_close', scriptType: ScriptType.P2WPKH, valueMagnitude: 3, recency: 0, address: '', scriptPubKey: new Uint8Array() }
      ]);

      const result = matcher.match(realAddress, 2); // K=2, so we need 1 decoy
      
      expect(result.realScripthash).toBe('real_scripthash');
      expect(result.chaffScripthashes).toHaveLength(1);
      // It should strictly avoid P2PKH, and prefer the P2WPKH that is closest in value (3)
      expect(result.chaffScripthashes[0]).toBe('chaff_p2wpkh_close');
    });

    it('should fallback to padding if pool is completely empty', () => {
      matcher.seedPool([
        { scripthash: 'only_decoy', scriptType: ScriptType.P2PKH, valueMagnitude: 3, recency: 0, address: '', scriptPubKey: new Uint8Array() },
      ]);

      const result = matcher.match(realAddress, 3); // Needs 2 decoys
      expect(result.chaffScripthashes).toHaveLength(2);
      expect(result.chaffScripthashes).toEqual(['only_decoy', 'only_decoy']);
    });
  });

  describe('QueryAssembler', () => {
    let assembler: QueryAssembler;

    beforeEach(() => {
      assembler = new QueryAssembler();
    });

    it('should flatten matches and shuffle', () => {
      const matches = [
        { realScripthash: 'real1', chaffScripthashes: ['chaff1a', 'chaff1b'] },
        { realScripthash: 'real2', chaffScripthashes: ['chaff2a', 'chaff2b'] }
      ];

      const batch = assembler.assemble(matches);

      expect(batch.scripthashes).toHaveLength(6);
      expect(batch.scripthashes).toContain('real1');
      expect(batch.scripthashes).toContain('chaff1b');

      expect(batch.isReal.get('real1')).toBe(true);
      expect(batch.isReal.get('chaff1a')).toBe(false);
      
      // We can't strictly test the shuffle order because it's random,
      // but we can ensure all elements are present exactly once.
      const unique = new Set(batch.scripthashes);
      expect(unique.size).toBe(6);
    });
  });
});
