import * as net from 'net';
import * as tls from 'tls';
import { EventEmitter } from 'events';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  ElectrumHistoryItem,
  ElectrumUnspentItem,
  ElectrumBalance,
} from './protocol.js';

export interface ElectrumServerConfig {
  host: string;
  port: number;
  protocol: 'tcp' | 'tls';
}

/**
 * A lightweight client for the Electrum JSON-RPC protocol.
 * Connects to unmodified public ElectrumX/Fulcrum servers.
 */
export class ElectrumClient extends EventEmitter {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private config: ElectrumServerConfig;
  private requestId = 0;
  private pendingRequests: Map<
    number | string,
    { resolve: (value: any) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }
  > = new Map();
  private buffer = '';
  private connected = false;

  constructor(config: ElectrumServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Connects to the Electrum server.
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { host, port, protocol } = this.config;
      
      const onConnect = () => {
        this.connected = true;
        resolve();
      };

      if (protocol === 'tls') {
        this.socket = tls.connect(port, host, { rejectUnauthorized: false }, onConnect);
      } else {
        this.socket = net.connect(port, host, onConnect);
      }

      this.socket.setEncoding('utf8');

      this.socket.on('data', (chunk: string) => {
        this.buffer += chunk;
        this.processBuffer();
      });

      this.socket.on('error', (err) => {
        if (!this.connected) reject(err);
        this.emit('error', err);
        this.disconnect();
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('close');
        // Reject all pending requests
        for (const [id, handlers] of this.pendingRequests.entries()) {
          clearTimeout(handlers.timeout);
          handlers.reject(new Error('Connection closed'));
          this.pendingRequests.delete(id);
        }
      });
    });
  }

  /**
   * Disconnects from the Electrum server.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Processes the incoming string buffer, parsing newline-delimited JSON messages.
   */
  private processBuffer() {
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex);
      this.buffer = this.buffer.substring(newlineIndex + 1);

      if (line.trim().length === 0) continue;

      try {
        const response: JsonRpcResponse = JSON.parse(line);
        this.handleResponse(response);
      } catch (err) {
        console.error('Failed to parse JSON response:', line, err);
      }
    }
  }

  private handleResponse(response: JsonRpcResponse) {
    const id = response.id;
    if (id !== undefined && this.pendingRequests.has(id)) {
      const handlers = this.pendingRequests.get(id)!;
      clearTimeout(handlers.timeout);
      
      if (response.error) {
        handlers.reject(new Error(`Electrum Error [${response.error.code}]: ${response.error.message}`));
      } else {
        handlers.resolve(response.result);
      }
      this.pendingRequests.delete(id);
    } else {
      // Subscriptions or unhandled responses
      this.emit('message', response);
    }
  }

  /**
   * Sends a JSON-RPC request to the server and waits for the response.
   */
  public async request<T = any>(method: string, params: any[] = [], timeoutMs = 15000): Promise<T> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }

    const id = ++this.requestId;
    const req: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const payload = JSON.stringify(req) + '\n';
      this.socket!.write(payload, 'utf8');
    });
  }

  // === Standard Electrum Protocol Methods ===

  public async serverVersion(clientName: string, protocolVersion: string): Promise<[string, string]> {
    return this.request('server.version', [clientName, protocolVersion]);
  }

  public async getHistory(scripthash: string): Promise<ElectrumHistoryItem[]> {
    return this.request('blockchain.scripthash.get_history', [scripthash]);
  }

  public async getBalance(scripthash: string): Promise<ElectrumBalance> {
    return this.request('blockchain.scripthash.get_balance', [scripthash]);
  }

  public async listUnspent(scripthash: string): Promise<ElectrumUnspentItem[]> {
    return this.request('blockchain.scripthash.listunspent', [scripthash]);
  }

  /**
   * Executes a batch of requests in parallel over the single socket.
   */
  public async batchRequest<T>(requests: { method: string; params: any[] }[]): Promise<T[]> {
    // Note: The Electrum protocol doesn't technically support standard JSON-RPC batching (array of requests)
    // universally on all server implementations, so we implement client-side concurrent pipelining.
    const promises = requests.map(req => this.request(req.method, req.params));
    return Promise.all(promises);
  }
}
