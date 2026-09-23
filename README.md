# Whisper Split

<!-- TODO: Add real CI badge after pushing and verifying the workflow run status. -->

> A privacy-preserving expense settlement and payroll dApp on the Midnight Network. Built cumulatively across the Midnight Builder Challenge: Level 1 (private debt settlement circuit), Level 2 (Lace wallet on Preprod wired to the frontend), and Level 3 (private payroll split with Merkle-based claims) — all in one codebase.

## Live Demo

[PLACEHOLDER — Vercel deployment URL, to be added after deploying the frontend]

## Contract Address

| Network | Contract | Address |
| --- | --- | --- |
| Preprod | Level 1/2 debt (`debt.compact`) | `2e5b7029de6660d78610ba39b67dc0e467c811dc6bf84acf996679b491a85def` |
| Preprod | Level 3 split (`split.compact`) | `b734d28a8d9e0d456bdc6d0106b4eedf276e0e17b67c83d9bd001973f035bc45` |

Level 1/2 debt deployment evidence (from the original Level 1 submission):

- Deploy tx: [`0x4cf8dadd8f1f6b086a0992cabc675a0208a226abc357368b7bcaa2172f90b9c5`](https://preprod.midnightexplorer.com/transactions/0x4cf8dadd8f1f6b086a0992cabc675a0208a226abc357368b7bcaa2172f90b9c5)
- Settlement circuit call tx: [`0xb961ef5d96662fd28d459b456d8ea00aa0b99e0454266410bddc68c7905d6b3e`](https://preprod.midnightexplorer.com/transactions/0xb961ef5d96662fd28d459b456d8ea00aa0b99e0454266410bddc68c7905d6b3e)

Level 3 split deployment evidence — a full, independently verified deposit → claim round trip moving real unshielded NIGHT, not just a deploy:

- Deploy tx: [`0xaa1acab883de6758492201cc15a6235d9b2cb42a6ae26b240a9c1af12017ab19`](https://preprod.midnightexplorer.com/transactions/0xaa1acab883de6758492201cc15a6235d9b2cb42a6ae26b240a9c1af12017ab19)
- Deposit tx (200 base units of real NIGHT escrowed into contract custody): [`0xbb2f04a5b501aae82110ca2af670d4b4fd024690abc2825b762f5355da32a5a1`](https://preprod.midnightexplorer.com/transactions/0xbb2f04a5b501aae82110ca2af670d4b4fd024690abc2825b762f5355da32a5a1)
- Claim tx (50 base units / 0.00005 NIGHT paid out to the claiming participant's own address, confirmed via the explorer's Created Outputs): [`0xc67d06a35580c3bd78b29d5f4ec0b01ee98beb3cb8cb5d9572bb7901b5e3859e`](https://preprod.midnightexplorer.com/transactions/0xc67d06a35580c3bd78b29d5f4ec0b01ee98beb3cb8cb5d9572bb7901b5e3859e)

Note: this address may be superseded by a fresh deployment used for the demo video (see below) — if so, update this table to the final address before submitting.

## What This Does

One dApp, three levels built on the same project:

1. **Level 1 — Private debt settlement** (`contracts/debt.compact`): a debtor proves `paidAmount == owedAmount` in zero knowledge. Only `settled` and `settlementCount` are public; the amounts never touch the ledger. Mismatches and repeat settlements are rejected.
2. **Level 2 — Lace on Preprod**: the React/Vite frontend connects/disconnects the Lace wallet via the DApp Connector API (v4), deploys the debt contract, calls `settleDebt` from the browser, and reads back the indexed public state.
3. **Level 3 — Private payroll split** (`contracts/split.compact`): an organizer deposits real NIGHT and commits to participant shares via a Merkle root. Each recipient claims their own share independently (pull, not bulk push) by proving Merkle membership plus their exact entitlement — share, salt, and proof stay private witnesses; only the claiming participant's own payout amount becomes visible, at the moment they claim.

Level 1/2 debt flow lives in `src/components/CircuitCall.tsx` and `src/debtProviders.ts`; the Level 3 payroll console lives in `src/pages/SettlementFlow.tsx` and `src/midnightProviders.ts`. Both share one wallet connection (`src/hooks/useMidnight.ts`).

## Privacy Model

### Debt (Level 1/2)

- **PUBLIC:** `settled`, `settlementCount`, transaction metadata.
- **PRIVATE (witness, never on-chain):** the owed amount (`getOwedAmount()` witness) and the paid amount circuit argument.
- **PROVED without revealing:** `paidAmount == owedAmount`, gated through a deliberate `disclose(isPaid)`.

Limit: both amounts are prover-controlled — this proves arithmetic equality, not an authentic external debt or token transfer.

### Payroll split (Level 3)

This is real fund custody, not accounting: `deposit()` escrows real NIGHT into
the contract (`receiveUnshielded`) and `claim()` pays a participant's exact
share back out (`sendUnshielded`). NIGHT has no shielded form at all — per
Midnight's own docs, "there is no mechanism to move a token between shielded
and unshielded state" — so genuine NIGHT custody is unavoidably unshielded,
and that shapes what's actually private here:

- **PUBLIC:** `sharesRoot` (Merkle root over the allocation list),
  `depositAmount` (remaining pooled balance), `distributionCount`, the
  `claimed` map of participant IDs, and — the moment a specific participant
  calls `claim()` — *that participant's own* payout amount, since a real
  NIGHT transfer's amount is inherently visible on-chain.
- **PRIVATE (witness, never on-chain):** every other participant's share,
  secret salt, and Merkle path. Nothing about the full allocation breakdown
  is derivable from the deposit transaction alone.
- **PROVED without revealing:** membership in the committed allocation list,
  and that a claim pays out exactly the entitled amount — verified entirely
  against private witnesses, so the Merkle root by itself reveals nothing
  about who gets how much.
- **Identity binding:** `claim()` asserts the caller's own unshielded address
  matches the claimed participant ID, so a claim can only ever pay out to
  the wallet that's actually entitled to it — participant IDs are
  wallet-bound, not pseudonymous handles.

Limit: privacy here is *per-claim*, not *forever-hidden*. Once you claim,
your own amount is on the public record for anyone watching that
transaction; what stays hidden is everyone else's, for as long as they
haven't claimed yet.

## Privacy Claim

An on-chain observer sees: that a deposit and later claims occurred, the
pool's total and remaining balance, which participant IDs have claimed, and
— for each participant who has claimed — the exact amount they received.
An observer cannot see: the shares of participants who haven't claimed yet,
any participant's secret salt, or their Merkle path. The debt contract's
owed/paid amounts likewise never appear as stored ledger fields. Any
configured remote proof server could observe private proving inputs —
browser-local proving should be verified with your wallet's actual proving
path.

## Tech Stack

- **Midnight Network** — zero-knowledge smart contract platform (Preprod)
- **Compact** — smart contract language (compiler 0.31.1, language version 0.23.0, runtime 0.16.0)
- **Midnight.js SDK** — `@midnight-ntwrk/*` packages v4.1.1
- **React 19 + Vite 5 + TypeScript + Tailwind CSS** — frontend
- **Lace wallet** — browser wallet via DApp Connector API v4
- **Vitest** — circuit and state test suite (11 tests)
- **GitHub Actions** — CI/CD
- **Docker** — optional local proof server (`midnightnetwork/proof-server` on port 6300)

## Prerequisites

- Node.js v22+
- The Compact CLI installed and available; run `npm run compact:setup` to install the pinned compiler before compiling. Windows also requires WSL.
- Lace wallet browser extension, configured for Preprod, with Preprod funds/DUST
- Docker (only if running the local proof server)

## Setup & Run Locally

```sh
git clone https://github.com/MayankShastri/whisper-split.git
cd whisper-split
npm install
npm run compile   # compiles both debt.compact and split.compact into managed/
npm test
npm run typecheck
npm run dev       # → http://localhost:5173
```

Then in the app: select Lace/Preprod, connect, and use the **Debt settlement** screen (Level 1/2 flow) or the **Payroll console** (Level 3 flow).

## Run Tests

```sh
npm test
```

Covers both contracts — circuit logic, state transitions, rejection paths (double settlement, double claim, insufficient funds), and privacy assertions (private witnesses never appear in ledger state). Current verified snapshot:

| Command | Result |
| --- | --- |
| `npm run compile` | Both circuits compiled (0.31.1) |
| `npm test` | 11/11 passing (5 debt + 6 split) |
| `npm run typecheck` | Clean (`skipLibCheck` for upstream `compact-js` declaration issues) |
| `npm run build` | Zero-error production build |

## CI/CD

On every push to `master` and every pull request, GitHub Actions checks out the code, sets up Node 22, installs dependencies, compiles both contracts, and runs the test suite. See `.github/workflows/ci.yml`.

TODO: Verify the workflow on a real push and add the live badge.

## Product Proposal

See [PROPOSAL.md](PROPOSAL.md).

## Demo Video

- Level 2 (wallet connect + circuit call): [PLACEHOLDER — YouTube link]
- Level 3 (payroll deposit + claim + tests + CI): [PLACEHOLDER — YouTube link]

## Initial Idea

Shared expenses are personal: who owes what shouldn't be broadcast to the group, let alone written permanently to a public chain. Whisper Split started (Level 1) as a zero-knowledge debt settlement — prove the debt is settled, nothing more. Level 2 gave it a face: a Lace-connected frontend on Preprod. Level 3 extended the same app into private payroll: commit to a distribution list off-chain and let recipients claim privately via Merkle membership proofs.

## Screenshots

Historical Level 1 assets: `screenshots/Compile output.png`, `screenshots/Test output.png`, `screenshots/Console.png`.

TODO: Add current cumulative-build screenshots (compile, tests, Lace connection, indexed results) — without exposing private inputs or participant vouchers.

## Submission Checklist

### Level 2

- [x] Lace connect / disconnect implemented (DApp Connector API v4, Preprod)
- [x] Circuit called successfully from the frontend (`settleDebt`)
- [x] Observable privacy behavior (equality proved, amounts not rendered or published)
- [ ] Contract deployed to Preprod with verifiable address (historical Level 1 address above; fresh demo deployment TODO)
- [ ] Minimum 8 meaningful commits
- [ ] Live demo link
- [ ] Demo video link

### Level 3

- [x] 3+ tests passing (11/11)
- [x] CI/CD pipeline configured on push/PR
- [ ] CI badge in README (needs a verified run)
- [x] Contract address in README (deploy/deposit/claim all verified on explorer — see Contract Address section)
- [x] Privacy Model section
- [x] PROPOSAL.md
- [x] dApp builds with zero errors
- [ ] Live demo link + demo video link
