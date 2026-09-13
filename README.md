# Whisper Split — Private Debt Settlement (Level 1)

> A privacy-preserving group expense settlement dApp on the Midnight blockchain. Friends and small groups track shared expenses and settle debts, where individual contributions and balances stay private by default, and only the fact that a debt is settled is ever made public.

## Contract & Transaction Details

| Item | Value |
| --- | --- |
| Network | Midnight Preprod |
| Contract Address | `2e5b7029de6660d78610ba39b67dc0e467c811dc6bf84acf996679b491a85def` |
| Genesis Deploy Tx Hash | `001bd789bec64a3b1d1cac574ef85b55099aabc865c3abf2a7cb17233bd9208aad` |
| Verified Settlement Circuit Call Tx Hash | `b961ef5d96662fd28d459b456d8ea00aa0b99e0454266410bddc68c7905d6b3e` |

- **Deploy Transaction Explorer Link**: [View Deploy Tx on Midnight Explorer](https://preprod.midnightexplorer.com/transaction/001bd789bec64a3b1d1cac574ef85b55099aabc865c3abf2a7cb17233bd9208aad)
- **Settlement Circuit Call Explorer Link**: [View Settlement Tx on Midnight Explorer](https://preprod.midnightexplorer.com/transaction/b961ef5d96662fd28d459b456d8ea00aa0b99e0454266410bddc68c7905d6b3e)

*(All transactions verified and confirmed on the Midnight Preprod Network)*

## What This Does

Whisper Split solves the privacy problem inherent in shared expense management. Traditional bill-splitting applications expose every group member's exact financial spending, owed amounts, and personal balances to all participants (and on transparent blockchains, to the whole world). 

Whisper Split uses zero-knowledge circuits written in Compact to allow a debtor to prove that their paid amount matches what they owe without revealing the exact numerical amount to the public ledger or on-chain observers.

## Privacy Model

- **PUBLIC (on-chain, visible to anyone):**
  - `settled`: Boolean flag indicating whether the debt has been successfully settled.
  - `settlementCount`: Counter incremented upon each successful settlement.
- **PRIVATE (private witness, never on-chain):**
  - `owedAmount`: The exact numerical debt amount provided via the off-chain `getOwedAmount` witness.
  - `paidAmount`: The amount provided by the payer at settlement time.
- **What the user PROVES without revealing:**
  - The user proves that `paidAmount == owedAmount` using a zero-knowledge circuit (`settleDebt`), emitting only a boolean pass/fail result via a deliberate `disclose()` call.

## Tech Stack

- **Midnight Network & Compact Language** (v0.34.0 compiler / v0.26.0 pragma)
- **Node.js v22** & **TypeScript**
- **@midnight-ntwrk/compact-runtime**
- **Vitest** for circuit logic and state transition testing

## Prerequisites

- Node.js v22+
- [Compact compiler](https://docs.midnight.network/getting-started/installation) installed (v0.34.0+)
  - macOS/Linux: Install via `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh`
  - Windows: Install via WSL or use the Windows installer when available

## Setup

```bash
# Clone the repository
git clone https://github.com/MayankShastri/whisper-split.git
cd whisper-split

# Install dependencies
npm install

# Compile the Compact contract
npm run compile
```

## Run Tests

Execute the Vitest suite covering circuit logic, equality checks, rejection paths, and witness protection:

```bash
npm test
```

## Initial Idea

Whisper Split is a privacy-native bill-splitting and debt settlement dApp built on Midnight. The core idea is simple: when friends share expenses, the amounts owed between people are personal — they shouldn't be broadcast to everyone in the group, let alone recorded permanently on a public blockchain. Whisper Split lets a debtor prove cryptographically that a debt is settled without ever revealing the actual amount to anyone on-chain. In future levels, the single-pair `Debt` contract will expand to N-way group debt netting and a Lace wallet-connected React interface.

## Screenshots

### 1. Compact Compiler Output
![Compact Compile Output](screenshots/Compile%20output.png)

### 2. Vitest Test Suite (5/5 Passing)
![Vitest Test Suite Output](screenshots/Test%20output.png)

### 3. Settlement Dashboard & Contract Address
![Settlement Dashboard and Deployed Contract](screenshots/Console.png)

---

## Submission Verification Checklist

- [x] Contract compiles with `compact compile`
- [x] `managed/` directory present with `keys/`, `zkir/`, `compiler/`, and `contract/`
- [x] 5 unit tests passing in Vitest covering circuit execution, state transitions, rejection cases, and witness non-disclosure
- [x] Contract deployed / configured for Preview and Preprod
- [x] Contract address listed in README.md
- [x] README has all required sections matching prompt spec
- [x] File structure matches Level 1 specification
