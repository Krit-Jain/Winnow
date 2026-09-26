import { DerivationEngine } from './derivation/engine.js';
import { AddressInfo, Chain, ScriptType } from './derivation/types.js';
import { ElectrumClient } from './electrum/client.js';
import { ElectrumHistoryItem, ElectrumBalance } from './electrum/protocol.js';

export interface SyncState {
  addressesScanned: number;
  totalBalance: number;
  activeAddresses: AddressInfo[];
  transactions: Set<string>;
}

export interface AddressSyncResult {
  info: AddressInfo;
  balance: ElectrumBalance;
  history: ElectrumHistoryItem[];
  isUsed: boolean;
}

/**
 * Orchestrates a standard (non-private) Electrum wallet sync.
 * Derives addresses according to the gap limit and fetches their status.
 */
export class WalletSync {
  constructor(
    private derivationEngine: DerivationEngine,
    private electrumClient: ElectrumClient
  ) {}

  /**
   * Syncs a single chain (External or Internal) until the gap limit is hit.
   */
  private async syncChain(
    scriptType: ScriptType,
    chain: Chain,
    gapLimit: number,
    state: SyncState
  ): Promise<void> {
    let currentGap = 0;
    let currentIndex = 0;
    const batchSize = Math.max(5, Math.floor(gapLimit / 2)); // Query in small batches

    while (currentGap < gapLimit) {
      // Derive a batch of addresses
      const batch = this.derivationEngine.deriveBatch(scriptType, chain, currentIndex, batchSize);
      
      // We will pipeline the history queries for the batch
      const historyRequests = batch.map((info) => ({
        method: 'blockchain.scripthash.get_history',
        params: [info.scripthash],
      }));

      // Await batch history responses
      const historyResults = await this.electrumClient.batchRequest<ElectrumHistoryItem[]>(historyRequests);

      // Now query balances for addresses that have history (to save queries, though plain sync 
      // often queries everything. For simplicity, we query balance for all in this batch).
      const balanceRequests = batch.map((info) => ({
        method: 'blockchain.scripthash.get_balance',
        params: [info.scripthash],
      }));
      
      const balanceResults = await this.electrumClient.batchRequest<ElectrumBalance>(balanceRequests);

      for (let i = 0; i < batch.length; i++) {
        const info = batch[i];
        const history = historyResults[i];
        const balance = balanceResults[i];
        const isUsed = history.length > 0;

        state.addressesScanned++;

        if (isUsed) {
          currentGap = 0; // Reset gap on finding a used address
          state.activeAddresses.push(info);
          state.totalBalance += balance.confirmed;
          
          for (const tx of history) {
            state.transactions.add(tx.tx_hash);
          }
        } else {
          currentGap++;
        }

        currentIndex++;

        // If we hit the gap limit exactly on this address, we can stop evaluating the rest of the batch
        if (currentGap >= gapLimit) {
          break;
        }
      }
    }
  }

  /**
   * Performs a full sync across all configured script types and chains.
   * @param gapLimit The maximum number of consecutive unused addresses to scan.
   * @param scriptTypes The script types to scan (e.g., P2PKH, P2WPKH).
   */
  public async syncWallet(gapLimit: number = 20, scriptTypes: ScriptType[] = [ScriptType.P2WPKH]): Promise<SyncState> {
    const state: SyncState = {
      addressesScanned: 0,
      totalBalance: 0,
      activeAddresses: [],
      transactions: new Set(),
    };

    if (!this.electrumClient.isConnected()) {
      await this.electrumClient.connect();
    }

    for (const scriptType of scriptTypes) {
      // Sync External Chain (Receiving)
      await this.syncChain(scriptType, Chain.EXTERNAL, gapLimit, state);
      
      // Sync Internal Chain (Change)
      await this.syncChain(scriptType, Chain.INTERNAL, gapLimit, state);
    }

    return state;
  }
}
