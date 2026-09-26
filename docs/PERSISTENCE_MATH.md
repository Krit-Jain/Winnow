# Persistence Floor — Mathematical Foundation

> Full derivation will be documented here during Phase 8.
> This document will contain the survival-function math that underpins
> WINNOW's cross-session intersection-attack resistance.

## Key Result (Preview)

If each chaff address survives independently with probability `(1-p)` per round,
then after `τ` consecutive sync rounds, the expected surviving chaff count is:

```
E[surviving] = k · (1-p)^τ
```

where `k` is the initial chaff multiplier (set by the privacy slider).

Choose `p` and the top-up rate so that this floor never drops below the target
anonymity-set size `k'` within any realistic sync-session window.

## Why This Matters

This is the formal argument that WINNOW's privacy guarantee degrades
*gracefully and boundedly* over time, rather than collapsing catastrophically
under intersection attack (which is what happens to every naive decoy scheme
with random per-round regeneration).
