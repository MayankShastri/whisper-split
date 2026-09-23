# Product Proposal

## What is the product, and who uses it?

Whisper Split is one cumulative Midnight application for group-expense and payroll-allocation experiments. Its intended users are small teams, contractor groups, DAOs, and people coordinating shared expenses. It is not currently a production payment service.

- **Level 1:** the debt circuit establishes a private-input equality demonstration.
- **Level 2:** Lace/Preprod wallet interaction is added to that same debt project, with deployment, settlement-call, and indexed-state UI. The historical debt address is preserved in README as a sourced record, not independently verified current deployment evidence.
- **Level 3:** the existing payroll console extends the same app with allocation-file import, a Merkle-root accounting pool, participant vouchers, claims, and public-state reads. Debt settlement remains accessible alongside payroll.

The present contracts do not transfer funds. The debt circuit checks supplied numbers; the split circuit records a root, subtracts accounting amounts, and marks claims. Product wording such as “custody,” “shielded pool,” and “payout” in existing UI must not be interpreted as implemented token custody or salary confidentiality.

TODO: Owner validates target users, product priorities, and this proposal. Hosting, demo videos, new split deployment, and end-to-end acceptance remain pending; see README.

## Why Midnight specifically?

Compact provides a way to constrain private inputs and verify resulting public state transitions using zero-knowledge proofs. The debt example demonstrates equality without writing either numerical input to public ledger fields. The split example demonstrates membership of a share/salt/participant leaf in a committed allocation tree without storing the salt or full path in public ledger fields.

This supports the longer-term goal of selective disclosure, but the current implementation does **not** achieve confidential payroll:

- The debt witness is prover-controlled. The active frontend passes the same owed-amount value as the paid-amount argument. Equality is not evidence of an authentic obligation or external payment.
- The split contract has no token receive/send or custody operations. `depositAmount` is bookkeeping, not funds held by the contract.
- The split contract does not constrain the sum of all committed allocations to equal the total. The frontend computes a total, but that is not a circuit-level solvency proof.
- Each claim reduces a public balance. Observers can compute its share as the difference between before/after balances; a Merkle commitment alone does not hide salaries.
- Claimed participant IDs are public, and the circuit does not authenticate them as the connected wallet or a real-world recipient.
- Private inputs are known to the browser/coordinator or voucher holder and may be processed by the configured proof service. Wallet-delegated or HTTP proving must not be described as verified browser-local proving.

Midnight supplies privacy primitives; application constraints, accounting design, and infrastructure trust determine the actual guarantee. Nullifiers alone would not hide a share while its balance delta remains public.

## Data Model

| Data Point | Type | Disclosed To |
| --- | --- | --- |
| Debt `settled` and `settlementCount` | Public ledger Boolean / Counter | Everyone |
| Debt owed amount (`getOwedAmount`) | Private witness from local state | User/browser and relevant proving infrastructure; not written as an amount to the public ledger |
| Debt `paidAmount` | Private circuit input | User/browser and relevant proving infrastructure; equality outcome reflected publicly |
| Split `sharesRoot` | Public ledger `Field` | Everyone |
| Split initial total and remaining `depositAmount` | Public ledger `Uint<64>` accounting value | Everyone; successive balance differences expose claims' share amounts |
| Split `distributionCount` | Public ledger Counter | Everyone |
| Split `claimed` map and disclosed participant IDs | Public ledger `Map<Bytes<32>, Boolean>` / circuit input | Everyone; pseudonymous IDs can be correlated, not authenticated wallet identities |
| Split share (`getMyShare`) | Witness input used in public balance transition | Coordinator, voucher holder, browser/prover; amount also inferable by chain observers |
| Split salt (`getMySecretSalt`) | Private witness | Coordinator, voucher holder, browser/prover; not deliberately stored on public ledger |
| Split Merkle path (`getMerkleProof`) | Private witness | Coordinator, voucher holder, browser/prover; not deliberately stored on public ledger |
| Allocation JSON / exported vouchers | Local files and in-memory input | File holders and processing application; vouchers contain sensitive claim material and must not be published |
| Contract/circuit activity and transaction timing | Public transaction metadata | Everyone |

No row marked private means “known to no one.” Local file export, logs, UI behavior, proof-server routing, and balance inference are distinct disclosure surfaces. Tests that check only absence of named witness fields from the ledger are not complete privacy verification.

## Mainnet Feasibility

Mainnet readiness is **not established**. This is an experimental cumulative challenge app with unresolved payment semantics and privacy limitations, not a mainnet-ready payroll system. The root challenge's Level 3 title does not establish production readiness.

Before considering a launch:

1. Decide whether the product is an allocation registry or a real payment system. A payment system needs reviewed token custody and payout logic, denomination handling, conservation rules, recipient authorization, and transaction-failure handling. Unshielded receive/send operations are not shielded-token custody and do not by themselves deliver confidential payments.
2. Redesign amount disclosure if salary confidentiality is required. Hiding witness fields or adding nullifiers alone cannot fix public balance deltas. Verify the chosen design's complete public transcript and accounting invariants.
3. Define trusted sources for real obligations where needed; equality and membership do not authenticate payroll records. Any attestation mechanism requires its own provenance and trust policy.
4. Define initialization, authorization, and pool lifecycle. The present `depositAmount == 0` condition permits initialization again after depletion while old claim records remain; it is not permanent one-time initialization.
5. Finish reproducible dual-contract compilation, passing tests/typecheck/build, trusted proving configuration, real CI, and browser/on-chain verification. The README records the failed checks observed during this documentation pass rather than asserting success.
6. Verify a new split deployment, hosting, and recorded demos. Review mobile behavior, console errors, voucher handling, and misleading custody/privacy labels before accepting the frontend.

TODO: Owner decides scope, feasibility, and timeline after these gates have evidence. No live hosting, split deployment, green CI badge, or mainnet date is claimed here. Commit work remains subject to explicit user authorization; this documentation task made no commits or Git mutations.
