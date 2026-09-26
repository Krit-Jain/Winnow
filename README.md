# WINNOW

### A Chaff-Hardened Private Sync Protocol for Electrum-Style Bitcoin Wallets

> *In 1998, Rivest showed you can hide a message without encrypting it — just mix the real packets with indistinguishable chaff. WINNOW applies that same principle to Bitcoin wallet synchronization: your real addresses are hidden among live, verifiably-real decoys sourced directly from the Bitcoin mempool, and only you — holding the derivation key — can winnow the wheat from the chaff.*

---

**🚧 Under active development** — BOSS Battle 2026, Cypherpunk Track (Private Electrum Sync)

## What Problem Does This Solve?

Every time a lightweight Bitcoin wallet syncs, it sends its addresses directly to an Electrum or Esplora server. The server operator trivially learns every address you control, every link between them, and your total balance. This is the #1 privacy leak in Bitcoin wallet usage today — and it happens silently, every time you open your wallet.

## What Makes WINNOW Different?

WINNOW closes three gaps that no existing approach — not Bloom filters, not naive decoys, not PIR — has addressed together:

1. **Live-sourced chaff**: Decoys aren't synthetic approximations. They're real, currently-active addresses pulled from the Bitcoin mempool — indistinguishable because they *are* real.
2. **Persistence lifecycle**: Chaff addresses survive across sync sessions with calibrated retirement curves, defeating the cross-session intersection attack that trivially breaks every naive decoy scheme.
3. **Self-attacking evaluation**: A built-in adversary (The Reaper) attacks the protocol and reports a formally-defined deanonymization score — so privacy isn't claimed, it's *measured*.

## Project Structure

```
winnow/
├── packages/
│   ├── core/        # Protocol engine (TypeScript)
│   ├── reaper/      # Adversarial evaluation (Python)
│   └── ui/          # Demo web wallet (React + Vite)
├── docs/            # Architecture & math documentation
└── scripts/         # Build & demo orchestration
```

## Quick Start

> Detailed setup instructions will be added as development progresses.

```bash
# Install dependencies
npm install

# Run core tests
npm run test:core

# Start the demo UI
npm run dev
```

## License

MIT — see [LICENSE](./LICENSE)
