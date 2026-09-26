import * as bip39 from 'bip39';
import { DerivationEngine } from './derivation/engine.js';
import { NetworkType, ScriptType } from './derivation/types.js';
import { ElectrumClient } from './electrum/client.js';
import { WalletSync } from './sync.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== 'sync') {
    console.error('Usage: tsx src/cli.ts sync --mnemonic "your mnemonic words here..."');
    process.exit(1);
  }

  const mnemonicIndex = args.indexOf('--mnemonic');
  let mnemonic = '';
  
  if (mnemonicIndex !== -1 && args[mnemonicIndex + 1]) {
    mnemonic = args[mnemonicIndex + 1];
  } else {
    // Generate a random mnemonic for testing if none provided
    mnemonic = bip39.generateMnemonic();
    console.log(`No mnemonic provided. Generating a fresh one: \n"${mnemonic}"\n`);
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const engine = new DerivationEngine(seed, { network: NetworkType.SIGNET });
  
  // Use a reliable public signet electrum server
  const client = new ElectrumClient({
    host: 'signet-electrumx.mutinywallet.com',
    port: 50002,
    protocol: 'tls'
  });

  const sync = new WalletSync(engine, client);

  console.log('Connecting to Electrum server (signet)...');
  await client.connect();
  console.log('Connected! Starting wallet sync...');

  try {
    const startTime = Date.now();
    const state = await sync.syncWallet(20, [
      ScriptType.P2WPKH, // Native SegWit
      ScriptType.P2TR    // Taproot
    ]);
    const duration = Date.now() - startTime;

    console.log('\n--- Sync Complete ---');
    console.log(`Addresses scanned:  ${state.addressesScanned}`);
    console.log(`Active addresses:   ${state.activeAddresses.length}`);
    console.log(`Total transactions: ${state.transactions.size}`);
    console.log(`Total balance:      ${state.totalBalance} sats`);
    console.log(`Time taken:         ${duration}ms`);

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
