/**
 * @module chaff/types
 *
 * Types for the Live Chaff Synthesis Engine.
 */

import { ScriptType } from '../derivation/types.js';

export interface ChaffCandidate {
  /** Real Bitcoin address sourced from the network */
  address: string;
  /** Raw scriptPubKey bytes */
  scriptPubKey: Uint8Array;
  /** Electrum-format scripthash */
  scripthash: string;
  /** The identified script type (P2PKH, P2WPKH, etc.) */
  scriptType: ScriptType;
  /** Estimated value bucket (e.g., total satoshis associated with the output) */
  valueMagnitude: number;
  /** How recent the address is (e.g., block height when found) */
  recency: number;
}

export interface ChaffMatchResult {
  /** The real scripthash being protected */
  realScripthash: string;
  /** The selected decoy scripthashes */
  chaffScripthashes: string[];
}

export interface QueryBatch {
  /** The mixed array of real and chaff scripthashes, ready to send */
  scripthashes: string[];
  /** Map of scripthash -> boolean indicating if it's real or chaff */
  isReal: Map<string, boolean>;
}
