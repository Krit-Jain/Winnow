import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElectrumClient } from '../electrum/client.js';

describe('ElectrumClient Wrappers', () => {
  let client: ElectrumClient;

  beforeEach(() => {
    client = new ElectrumClient({ host: 'localhost', port: 50001, protocol: 'tcp' });
    
    // Mock the internal request function so we don't need real sockets
    client.request = vi.fn().mockImplementation(async (method: string, params: any[]) => {
      if (method === 'server.version') return ['winnow-test/0.1', '1.4'];
      if (method === 'blockchain.scripthash.get_balance') return { confirmed: 1000, unconfirmed: 0 };
      if (method === 'blockchain.scripthash.get_history') return [{ height: 12345, tx_hash: 'abc' }];
      if (method === 'blockchain.scripthash.listunspent') return [{ height: 12345, tx_pos: 1, tx_hash: 'abc', value: 1000 }];
      return null;
    });
  });

  it('should call request correctly for serverVersion', async () => {
    const res = await client.serverVersion('winnow-test/0.1', '1.4');
    expect(client.request).toHaveBeenCalledWith('server.version', ['winnow-test/0.1', '1.4']);
    expect(res).toEqual(['winnow-test/0.1', '1.4']);
  });

  it('should call request correctly for getBalance', async () => {
    const res = await client.getBalance('dummy');
    expect(client.request).toHaveBeenCalledWith('blockchain.scripthash.get_balance', ['dummy']);
    expect(res).toEqual({ confirmed: 1000, unconfirmed: 0 });
  });

  it('should call request correctly for getHistory', async () => {
    const res = await client.getHistory('dummy');
    expect(client.request).toHaveBeenCalledWith('blockchain.scripthash.get_history', ['dummy']);
    expect(res).toEqual([{ height: 12345, tx_hash: 'abc' }]);
  });

  it('should call request correctly for listUnspent', async () => {
    const res = await client.listUnspent('dummy');
    expect(client.request).toHaveBeenCalledWith('blockchain.scripthash.listunspent', ['dummy']);
    expect(res).toEqual([{ height: 12345, tx_pos: 1, tx_hash: 'abc', value: 1000 }]);
  });

  it('should pipeline batchRequest correctly', async () => {
    const requests = [
      { method: 'blockchain.scripthash.get_balance', params: ['dummy1'] },
      { method: 'blockchain.scripthash.get_history', params: ['dummy2'] },
    ];

    const results = await client.batchRequest<any>(requests);
    
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(client.request).toHaveBeenNthCalledWith(1, 'blockchain.scripthash.get_balance', ['dummy1']);
    expect(client.request).toHaveBeenNthCalledWith(2, 'blockchain.scripthash.get_history', ['dummy2']);
    
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ confirmed: 1000, unconfirmed: 0 });
    expect(results[1]).toEqual([{ height: 12345, tx_hash: 'abc' }]);
  });
});
