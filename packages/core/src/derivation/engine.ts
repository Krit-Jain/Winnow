import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as crypto from 'crypto';
import {
  AddressInfo,
  Chain,
  DerivationConfig,
  NetworkType,
  ScriptType,
  SCRIPT_TYPE_PURPOSE,
  DEFAULT_DERIVATION_CONFIG,
} from './types.js';

// Initialize BIP32 factory with the ECC library
const bip32 = BIP32Factory(ecc);
bitcoin.initEccLib(ecc);

/**
 * Maps NetworkType enum to bitcoinjs-lib Network objects.
 */
function getBitcoinNetwork(network: NetworkType): bitcoin.Network {
  switch (network) {
    case NetworkType.MAINNET:
      return bitcoin.networks.bitcoin;
    case NetworkType.TESTNET:
    case NetworkType.SIGNET:
      // Both use testnet parameters in bitcoinjs-lib
      return bitcoin.networks.testnet;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Helper to compute Electrum-style scripthash.
 * Electrum servers expect the SHA256 of the scriptPubKey, reversed, in hex.
 */
export function computeScripthash(scriptPubKey: Uint8Array): string {
  const hash = crypto.createHash('sha256').update(scriptPubKey).digest();
  return Buffer.from(hash).reverse().toString('hex');
}

/**
 * Core Derivation Engine for WINNOW.
 * Generates addresses according to BIP44/49/84/86.
 */
export class DerivationEngine {
  private root: BIP32Interface;
  private network: bitcoin.Network;
  private config: DerivationConfig;

  constructor(
    seed: Buffer,
    config: Partial<DerivationConfig> = {}
  ) {
    this.config = { ...DEFAULT_DERIVATION_CONFIG, ...config };
    this.network = getBitcoinNetwork(this.config.network);
    this.root = bip32.fromSeed(seed, this.network);
  }

  /**
   * Derives a single address for a given script type, chain, and index.
   */
  public deriveAddress(scriptType: ScriptType, chain: Chain, index: number): AddressInfo {
    const purpose = SCRIPT_TYPE_PURPOSE[scriptType];
    const coinType = this.config.network === NetworkType.MAINNET ? 0 : 1;
    const account = this.config.account;
    
    // Path format: m / purpose' / coin_type' / account' / change / address_index
    const path = `m/${purpose}'/${coinType}'/${account}'/${chain}/${index}`;
    const child = this.root.derivePath(path);
    
    if (!child.publicKey) {
      throw new Error(`Failed to derive public key for path ${path}`);
    }

    let payment: bitcoin.Payment;

    switch (scriptType) {
      case ScriptType.P2PKH:
        payment = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: this.network });
        break;
      case ScriptType.P2SH_P2WPKH:
        payment = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: this.network }),
          network: this.network,
        });
        break;
      case ScriptType.P2WPKH:
        payment = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: this.network });
        break;
      case ScriptType.P2TR:
        // Taproot requires a tweaked x-only public key
        // bitcoinjs-lib taproot derivation needs the internal pubkey (32 bytes)
        const internalPubkey = child.publicKey.subarray(1, 33);
        payment = bitcoin.payments.p2tr({
          internalPubkey,
          network: this.network,
        });
        break;
      default:
        throw new Error(`Unsupported script type: ${scriptType}`);
    }

    if (!payment.address || !payment.output) {
      throw new Error(`Failed to generate address/output for ${path}`);
    }

    const scriptPubKey = payment.output;

    return {
      address: payment.address,
      scriptPubKey: new Uint8Array(scriptPubKey),
      scripthash: computeScripthash(scriptPubKey),
      scriptType,
      derivationPath: path,
      chain,
      index,
    };
  }

  /**
   * Generates a batch of addresses up to a specified gap.
   * Useful for initial wallet sync.
   */
  public deriveBatch(
    scriptType: ScriptType,
    chain: Chain,
    startIndex: number,
    count: number
  ): AddressInfo[] {
    const addresses: AddressInfo[] = [];
    for (let i = 0; i < count; i++) {
      addresses.push(this.deriveAddress(scriptType, chain, startIndex + i));
    }
    return addresses;
  }
}
