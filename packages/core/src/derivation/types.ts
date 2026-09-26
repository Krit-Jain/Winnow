/**
 * @module derivation/types
 *
 * Type definitions for the WINNOW Wallet Derivation Engine.
 * Covers all standard BIP derivation paths (44/49/84/86),
 * script types, and the Electrum-format scripthash used
 * throughout the protocol.
 */

/**
 * Bitcoin output script types supported by WINNOW.
 * Each maps to a specific BIP derivation purpose.
 */
export enum ScriptType {
  /** BIP44 — Legacy Pay-to-Public-Key-Hash */
  P2PKH = 'p2pkh',
  /** BIP49 — Wrapped SegWit Pay-to-Script-Hash(Pay-to-Witness-Public-Key-Hash) */
  P2SH_P2WPKH = 'p2sh-p2wpkh',
  /** BIP84 — Native SegWit Pay-to-Witness-Public-Key-Hash */
  P2WPKH = 'p2wpkh',
  /** BIP86 — Taproot Pay-to-Taproot */
  P2TR = 'p2tr',
}

/**
 * HD wallet chain identifier.
 * BIP44 defines chain 0 for receiving addresses and chain 1 for change.
 */
export enum Chain {
  /** External chain — receiving addresses visible to the user */
  EXTERNAL = 0,
  /** Internal chain — change addresses managed by the wallet */
  INTERNAL = 1,
}

/**
 * Bitcoin network selection.
 */
export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  /** Signet shares testnet address formats but uses a separate chain */
  SIGNET = 'signet',
}

/**
 * Maps each ScriptType to its BIP purpose number.
 */
export const SCRIPT_TYPE_PURPOSE: Record<ScriptType, number> = {
  [ScriptType.P2PKH]: 44,
  [ScriptType.P2SH_P2WPKH]: 49,
  [ScriptType.P2WPKH]: 84,
  [ScriptType.P2TR]: 86,
};

/**
 * Full information about a single derived address.
 * This is the primary data unit passed between WINNOW components.
 */
export interface AddressInfo {
  /** The human-readable Bitcoin address (e.g., bc1q..., 1..., 3..., bc1p...) */
  address: string;
  /** Raw scriptPubKey bytes for this address */
  scriptPubKey: Uint8Array;
  /**
   * Electrum-format scripthash: SHA256(scriptPubKey) with bytes reversed.
   * This is the identifier used in all Electrum protocol queries.
   */
  scripthash: string;
  /** The output script type */
  scriptType: ScriptType;
  /** Full BIP32 derivation path string, e.g. "m/84'/0'/0'/0/5" */
  derivationPath: string;
  /** External (0) or internal/change (1) chain */
  chain: Chain;
  /** Address index within the chain */
  index: number;
}

/**
 * Configuration for the derivation engine.
 */
export interface DerivationConfig {
  /** Which Bitcoin network to derive for */
  network: NetworkType;
  /**
   * Number of consecutive unused addresses to scan before stopping.
   * Standard BIP44 gap limit is 20.
   */
  gapLimit: number;
  /** HD wallet account index (usually 0) */
  account: number;
  /** Which script types to derive addresses for */
  scriptTypes: ScriptType[];
}

/**
 * Default configuration — signet, standard gap limit, all script types.
 */
export const DEFAULT_DERIVATION_CONFIG: DerivationConfig = {
  network: NetworkType.SIGNET,
  gapLimit: 20,
  account: 0,
  scriptTypes: [
    ScriptType.P2PKH,
    ScriptType.P2SH_P2WPKH,
    ScriptType.P2WPKH,
    ScriptType.P2TR,
  ],
};
