# WINNOW Architecture

> Detailed architecture documentation will be added during Phase 8.
> See the codebase for inline documentation in the meantime.

## High-Level Overview

```
┌─────────────────────────────────────────────┐
│           WINNOW Client                      │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Derivation   │  │  Live Chaff Synthesis │ │
│  │  Engine       │──│  Engine (LCS)         │ │
│  │  BIP32/44/... │  │  Mempool-sourced      │ │
│  └──────────────┘  └──────────────────────┘ │
│         │                    │               │
│         │          ┌─────────────────────┐   │
│         │          │  Persistence         │   │
│         │          │  Scheduler           │   │
│         │          │  Chaff Ledger        │   │
│         │          └─────────────────────┘   │
│         │                    │               │
│         └────────┬───────────┘               │
│                  ▼                           │
│         ┌──────────────────┐                │
│         │  Query Client     │                │
│         │  Electrum Protocol │                │
│         └──────────────────┘                │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────▼────────┐
          │  Any Unmodified  │
          │  Electrum Server  │
          └─────────────────┘
```
