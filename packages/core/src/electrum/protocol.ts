/**
 * @module electrum/protocol
 *
 * Type definitions for the Electrum JSON-RPC protocol.
 * @see {@link https://electrumx.readthedocs.io/en/latest/protocol.html}
 */

/**
 * Standard JSON-RPC Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: any[];
}

/**
 * Standard JSON-RPC Response
 */
export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Electrum History Item
 */
export interface ElectrumHistoryItem {
  height: number;
  tx_hash: string;
  fee?: number; // Only present for unconfirmed txs in mempool
}

/**
 * Electrum Unspent Transaction Output (UTXO)
 */
export interface ElectrumUnspentItem {
  height: number;
  tx_pos: number;
  tx_hash: string;
  value: number;
}

/**
 * Electrum Balance
 */
export interface ElectrumBalance {
  confirmed: number;
  unconfirmed: number;
}
