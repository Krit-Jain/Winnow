import { NetworkType, ScriptType } from '../derivation/types.js';
import { ChaffCandidate } from './types.js';
import * as bitcoin from 'bitcoinjs-lib';
import { computeScripthash } from '../derivation/engine.js';

/**
 * Esplora REST API client to fetch live addresses from recent blocks.
 */
export class LiveChaffSource {
  private baseUrl: string;
  private network: bitcoin.Network;

  constructor(network: NetworkType = NetworkType.SIGNET) {
    if (network === NetworkType.MAINNET) {
      this.baseUrl = 'https://mempool.space/api';
      this.network = bitcoin.networks.bitcoin;
    } else if (network === NetworkType.SIGNET) {
      this.baseUrl = 'https://mempool.space/signet/api';
      this.network = bitcoin.networks.testnet;
    } else {
      this.baseUrl = 'https://mempool.space/testnet/api';
      this.network = bitcoin.networks.testnet;
    }
  }

  /**
   * Identifies the script type of a raw scriptPubKey.
   */
  private identifyScriptType(scriptPubKey: Buffer): ScriptType | null {
    if (scriptPubKey.length === 25 && scriptPubKey[0] === 0x76 && scriptPubKey[1] === 0xa9) {
      return ScriptType.P2PKH;
    }
    if (scriptPubKey.length === 23 && scriptPubKey[0] === 0xa9 && scriptPubKey[1] === 0x14) {
      return ScriptType.P2SH_P2WPKH;
    }
    if (scriptPubKey.length === 22 && scriptPubKey[0] === 0x00 && scriptPubKey[1] === 0x14) {
      return ScriptType.P2WPKH;
    }
    if (scriptPubKey.length === 34 && scriptPubKey[0] === 0x51 && scriptPubKey[1] === 0x20) {
      return ScriptType.P2TR;
    }
    return null; // Unknown or unsupported script type
  }

  /**
   * Fetches the most recent block hash.
   */
  public async getTipHash(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/blocks/tip/hash`);
    if (!res.ok) throw new Error(`Failed to fetch tip hash: ${res.statusText}`);
    return res.text();
  }

  /**
   * Fetches the transactions for a given block hash and extracts output addresses.
   */
  public async fetchBlockCandidates(blockHash: string): Promise<ChaffCandidate[]> {
    // Fetch a subset of txs from the block (limit 25 is mempool.space's default for /txs endpoint)
    const res = await fetch(`${this.baseUrl}/block/${blockHash}/txs`);
    if (!res.ok) throw new Error(`Failed to fetch block txs: ${res.statusText}`);
    
    const txs = await res.json();
    const candidates: ChaffCandidate[] = [];

    // Extract VOUTs as candidates
    for (const tx of txs) {
      const recency = tx.status?.block_height || 0;
      
      for (const vout of tx.vout) {
        if (!vout.scriptpubkey_address) continue; // Skip OP_RETURN, etc.
        
        const scriptBytes = Buffer.from(vout.scriptpubkey, 'hex');
        const scriptType = this.identifyScriptType(scriptBytes);
        
        if (scriptType) {
          candidates.push({
            address: vout.scriptpubkey_address,
            scriptPubKey: new Uint8Array(scriptBytes),
            scripthash: computeScripthash(new Uint8Array(scriptBytes)),
            scriptType,
            valueMagnitude: Math.floor(Math.log10(Math.max(1, vout.value))), // 1000 sats -> 3
            recency
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Scrapes recent blocks to build a pool of realistic chaff candidates.
   */
  public async harvestChaff(minCount: number = 100): Promise<ChaffCandidate[]> {
    const candidates: ChaffCandidate[] = [];
    let currentHash = await this.getTipHash();

    // Walk backwards through blocks until we have enough candidates
    while (candidates.length < minCount) {
      const blockTxs = await this.fetchBlockCandidates(currentHash);
      candidates.push(...blockTxs);

      // Get previous block hash for next iteration
      const blockRes = await fetch(`${this.baseUrl}/block/${currentHash}`);
      if (!blockRes.ok) break;
      const blockInfo = await blockRes.json();
      currentHash = blockInfo.previousblockhash;
      
      if (!currentHash) break;
    }

    return candidates;
  }
}
