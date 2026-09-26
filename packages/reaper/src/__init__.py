"""
WINNOW Reaper — Adversarial Evaluation Engine

The Reaper is WINNOW's self-attacking adversary. It implements two attack modes
against the WINNOW protocol and reports a formally-defined deanonymization score:

  Mode 1: Cross-session intersection attack
  Mode 2: Feature-based classifier (logistic regression)

The deanonymization score D = max(0, 2·AUC − 1) measures attacker advantage
over a random guesser, correctly reading 0 for a plain Electrum query with
no decoys (the edge case the BOSS Battle brief specifically requires).
"""

__version__ = "0.1.0"
