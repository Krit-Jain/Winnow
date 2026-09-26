/**
 * @module @winnow/core
 *
 * WINNOW — A Chaff-Hardened Private Sync Protocol for Electrum-Style Bitcoin Wallets
 *
 * This is the core protocol library. It provides:
 * - BIP32/44/49/84/86 wallet derivation with gap-limit handling
 * - Electrum protocol client for querying unmodified public servers
 * - Live Chaff Synthesis (LCS) engine sourcing real decoys from the mempool
 * - Persistence Scheduler for multi-round chaff lifecycle management
 * - Deanonymization score computation
 *
 * @see {@link https://github.com/your-repo/winnow} for full documentation
 */

// Phase 1: Derivation Engine
export { DerivationEngine } from './derivation/engine.js';
export type { AddressInfo, DerivationConfig } from './derivation/types.js';

// Phase 2: Electrum Client
export { ElectrumClient } from './electrum/client.js';
export type * from './electrum/protocol.js';

// Phase 3: Wallet Sync
export { WalletSync } from './sync.js';
export type { SyncState, AddressSyncResult } from './sync.js';

// Phase 4: Live Chaff Synthesis
// export { LiveChaffEngine } from './chaff/lcs.js';

// Phase 5: Persistence Scheduler
// export { PersistenceScheduler } from './persistence/scheduler.js';

// Phase 6: Scoring
// export { DeanonScoreEngine } from './scoring/score.js';

export const VERSION = '0.1.0';
export const PROJECT_NAME = 'WINNOW';
