import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bip39 from 'bip39';
import { DerivationEngine } from '../derivation/engine.js';
import { Chain, ScriptType, NetworkType } from '../derivation/types.js';
import { ElectrumClient } from '../electrum/client.js';
import { WalletSync } from '../sync.js';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_SEED = bip39.mnemonicToSeedSync(TEST_MNEMONIC);

describe('WalletSync', () => {
  let engine: DerivationEngine;
  let client: any;
  let sync: WalletSync;

  beforeEach(() => {
    engine = new DerivationEngine(TEST_SEED, { network: NetworkType.TESTNET });
    
    // Create a mock ElectrumClient
    client = {
      isConnected: vi.fn().mockReturnValue(true),
      connect: vi.fn(),
      batchRequest: vi.fn(),
    } as unknown as ElectrumClient;

    sync = new WalletSync(engine, client);
  });

  it('should scan until the gap limit is reached and stop', async () => {
    const gapLimit = 3;
    
    // Mock the batchRequest to simulate an empty wallet (no history, no balance)
    client.batchRequest.mockImplementation(async (requests: any[]) => {
      if (requests.length === 0) return [];
      
      const isHistory = requests[0].method === 'blockchain.scripthash.get_history';
      if (isHistory) {
        // Return empty history for all requests in the batch
        return requests.map(() => []);
      } else {
        // Return 0 balance for all requests in the batch
        return requests.map(() => ({ confirmed: 0, unconfirmed: 0 }));
      }
    });

    const state = await sync.syncWallet(gapLimit, [ScriptType.P2WPKH]);

    // Expected behavior:
    // Syncs External chain: checks 3 addresses (gap limit hit)
    // Syncs Internal chain: checks 3 addresses (gap limit hit)
    // Total addresses scanned: 6
    expect(state.addressesScanned).toBe(6);
    expect(state.totalBalance).toBe(0);
    expect(state.activeAddresses).toHaveLength(0);
    expect(state.transactions.size).toBe(0);
  });

  it('should advance the gap window when used addresses are found', async () => {
    const gapLimit = 2;
    let callCount = 0;

    // Simulate an active wallet:
    // External index 0: used (history, balance 1000)
    // External index 1: unused
    // External index 2: used (history, balance 500)
    // External index 3, 4: unused (hits gap limit of 2)
    client.batchRequest.mockImplementation(async (requests: any[]) => {
      if (requests.length === 0) return [];
      
      const isHistory = requests[0].method === 'blockchain.scripthash.get_history';
      const results = requests.map((req) => {
        // We know the first batch of external addresses will have the scripthashes for indices 0,1,2,3...
        // Let's just mock based on a global call counter since it's deterministic.
        // Actually, matching by scripthash is safer.
        const hash = req.params[0];
        const addr0 = engine.deriveAddress(ScriptType.P2WPKH, Chain.EXTERNAL, 0).scripthash;
        const addr2 = engine.deriveAddress(ScriptType.P2WPKH, Chain.EXTERNAL, 2).scripthash;
        
        if (hash === addr0) {
          return isHistory ? [{ height: 100, tx_hash: 'tx0' }] : { confirmed: 1000, unconfirmed: 0 };
        }
        if (hash === addr2) {
          return isHistory ? [{ height: 101, tx_hash: 'tx2' }] : { confirmed: 500, unconfirmed: 0 };
        }
        
        // Everything else is empty
        return isHistory ? [] : { confirmed: 0, unconfirmed: 0 };
      });
      return results;
    });

    // Run sync just for P2WPKH
    const state = await sync.syncWallet(gapLimit, [ScriptType.P2WPKH]);

    // External chain scans indices 0, 1, 2, 3, 4 (5 addresses).
    // Internal chain scans indices 0, 1 (2 addresses, since gap is 2 and all empty).
    // Total addresses scanned = 5 + 2 = 7.
    expect(state.addressesScanned).toBe(7);
    expect(state.totalBalance).toBe(1500);
    expect(state.activeAddresses).toHaveLength(2); // addr0 and addr2
    expect(state.transactions.size).toBe(2); // tx0, tx2
    
    // Verify the correct active addresses were captured
    expect(state.activeAddresses[0].index).toBe(0);
    expect(state.activeAddresses[1].index).toBe(2);
  });
});
