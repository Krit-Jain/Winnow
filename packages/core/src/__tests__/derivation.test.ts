import { describe, it, expect, beforeEach } from 'vitest';
import * as bip39 from 'bip39';
import { DerivationEngine, computeScripthash } from '../derivation/engine.js';
import { Chain, ScriptType, NetworkType } from '../derivation/types.js';

// A fixed mnemonic for deterministic testing
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_SEED = bip39.mnemonicToSeedSync(TEST_MNEMONIC);

describe('DerivationEngine', () => {
  let engine: DerivationEngine;

  beforeEach(() => {
    engine = new DerivationEngine(TEST_SEED, { network: NetworkType.TESTNET });
  });

  describe('Address Derivation (Testnet)', () => {
    it('should correctly derive a BIP44 (P2PKH) address', () => {
      const info = engine.deriveAddress(ScriptType.P2PKH, Chain.EXTERNAL, 0);
      expect(info.scriptType).toBe(ScriptType.P2PKH);
      expect(info.chain).toBe(Chain.EXTERNAL);
      expect(info.index).toBe(0);
      expect(info.derivationPath).toBe("m/44'/1'/0'/0/0");
      // Address format check for testnet P2PKH (starts with m or n)
      expect(info.address).toMatch(/^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/);
    });

    it('should correctly derive a BIP49 (P2SH-P2WPKH) address', () => {
      const info = engine.deriveAddress(ScriptType.P2SH_P2WPKH, Chain.EXTERNAL, 0);
      expect(info.scriptType).toBe(ScriptType.P2SH_P2WPKH);
      expect(info.derivationPath).toBe("m/49'/1'/0'/0/0");
      // Address format check for testnet P2SH (starts with 2)
      expect(info.address).toMatch(/^2[a-km-zA-HJ-NP-Z1-9]{25,34}$/);
    });

    it('should correctly derive a BIP84 (P2WPKH) address', () => {
      const info = engine.deriveAddress(ScriptType.P2WPKH, Chain.INTERNAL, 5); // Testing change chain and index > 0
      expect(info.scriptType).toBe(ScriptType.P2WPKH);
      expect(info.chain).toBe(Chain.INTERNAL);
      expect(info.index).toBe(5);
      expect(info.derivationPath).toBe("m/84'/1'/0'/1/5");
      // Address format check for testnet Bech32 (starts with tb1q)
      expect(info.address).toMatch(/^tb1q[a-z0-9]{38,58}$/);
    });

    it('should correctly derive a BIP86 (P2TR) address', () => {
      const info = engine.deriveAddress(ScriptType.P2TR, Chain.EXTERNAL, 0);
      expect(info.scriptType).toBe(ScriptType.P2TR);
      expect(info.derivationPath).toBe("m/86'/1'/0'/0/0");
      // Address format check for testnet Bech32m Taproot (starts with tb1p)
      expect(info.address).toMatch(/^tb1p[a-z0-9]{38,58}$/);
    });
  });

  describe('Batch Derivation', () => {
    it('should derive a consecutive batch of addresses', () => {
      const count = 5;
      const batch = engine.deriveBatch(ScriptType.P2WPKH, Chain.EXTERNAL, 0, count);
      
      expect(batch).toHaveLength(count);
      expect(batch[0].index).toBe(0);
      expect(batch[0].derivationPath).toBe("m/84'/1'/0'/0/0");
      expect(batch[4].index).toBe(4);
      expect(batch[4].derivationPath).toBe("m/84'/1'/0'/0/4");
      
      // All scripthashes should be unique
      const scripthashes = new Set(batch.map(b => b.scripthash));
      expect(scripthashes.size).toBe(count);
    });
  });

  describe('Mainnet Derivation Check', () => {
    it('should use coin type 0 for mainnet', () => {
      const mainnetEngine = new DerivationEngine(TEST_SEED, { network: NetworkType.MAINNET });
      const info = mainnetEngine.deriveAddress(ScriptType.P2WPKH, Chain.EXTERNAL, 0);
      
      expect(info.derivationPath).toBe("m/84'/0'/0'/0/0");
      // Address format check for mainnet Bech32 (starts with bc1q)
      expect(info.address).toMatch(/^bc1q[a-z0-9]{38,58}$/);
    });
  });

  describe('Scripthash Computation', () => {
    it('should correctly compute Electrum scripthash (SHA256 reversed)', () => {
      // Known vector
      // Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa (Satoshi's genesis block address)
      // scriptPubKey: 76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac
      const scriptPubKeyHex = '76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac';
      const scriptPubKeyBytes = Buffer.from(scriptPubKeyHex, 'hex');
      
      // Expected scripthash (from Electrum protocol definition, SHA256 reversed)
      const expectedScripthash = '8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161';
      
      const computed = computeScripthash(new Uint8Array(scriptPubKeyBytes));
      expect(computed).toBe(expectedScripthash);
    });
  });
});
