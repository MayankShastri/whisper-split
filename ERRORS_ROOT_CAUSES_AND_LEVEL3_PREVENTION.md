# Whisper Split: Engineering Post-Mortem & Level 3 Prevention Guide

> A comprehensive diagnostic reference of every error, root cause, and architectural trap encountered during Level 1/2 on the Midnight blockchain, along with strict preventative rules for Level 3.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Detailed Error Diagnostic & Root Cause Matrix](#2-detailed-error-diagnostic--root-cause-matrix)
   - [Error 1: Plain Transfer vs Real Contract Invocation](#error-1-plain-token-transfer-vs-real-circuit-call)
   - [Error 2: Dual Runtime Version Conflict (0.16.0 vs 0.19.0)](#error-2-dual-runtime-version-conflict-0160-vs-0190)
   - [Error 3: Asynchronous Generated Contract Artifacts](#error-3-asynchronous-generated-contract-methods)
   - [Error 4: Invalid Circuit Context & Return Shape](#error-4-invalid-circuit-context--return-shape)
   - [Error 5: Coin Public Key & Elliptic Curve Point Validation](#error-5-coin-public-key--elliptic-curve-point-validation)
   - [Error 6: Stale Vite Cache & Dependency Pre-Bundling](#error-6-stale-vite-cache--dependency-pre-bundling)
   - [Error 7: Static Proving Asset Module Resolution & 404s](#error-7-static-proving-asset-module-resolution--404s)
   - [Error 8: Indexer GraphQL `offset: null` Bug](#error-8-indexer-graphql-offset-null-bug)
   - [Error 9: Prover Server vs In-Browser Prover Provider](#error-9-prover-server-vs-in-browser-prover-provider)
   - [Error 10: Block Explorer Route & Hash Formatting](#error-10-block-explorer-route--hash-formatting)
3. [The Golden Dependency Compatibility Matrix](#3-the-golden-dependency-compatibility-matrix)
4. [Level 3 Architecture & Prevention Checklist](#4-level-3-architecture--prevention-checklist)
5. [Emergency Debugging Runbook](#5-emergency-debugging-runbook)

---

## 1. Executive Summary

Building on Midnight requires orchestrating four distinct layers simultaneously:
1. **Compact Zero-Knowledge Circuit Logic** (`.compact` compiled to WASM/ZKIR/Keys)
2. **Compact Runtime & Ledger State Machine** (`@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/ledger-v8`)
3. **TypeScript DApp SDK & Providers** (`@midnight-ntwrk/midnight-js-contracts`, `midnight-js-types`)
4. **Browser Wallet & Proof Engine** (`1AM` / `Lace` DApp Connector API)

A failure in any layer bubbles up as cryptic SDK errors (e.g., `ContractConfigurationError`, `Cannot read properties of undefined`). This document details why each failure occurred and how to prevent them in Level 3.

---

## 2. Detailed Error Diagnostic & Root Cause Matrix

### Error 1: Plain Token Transfer vs Real Circuit Call

* **Symptom**: The wallet showed a confirmed transaction, but the block explorer listed `0` Contract Actions, transaction type was `"unshielded transfer"`, and the indexer returned `contractAction: null`.
* **Root Cause**: The settlement button was invoking `connectedApi.makeTransfer()` (a basic native token self-transfer) rather than executing `deployed.callTx.settleDebt()` via the Midnight.js SDK contract pipeline.
* **Fix Implemented**: Rewired `SettlementFlow.tsx` to invoke `callSettleDebtCircuit()` via `findDeployedContract()` / `createUnprovenCallTx()`.
* **How to Avoid in Level 3**:
  * Never use `makeTransfer` for smart contract operations.
  * Always verify that submitted transactions show **`CONTRACT ACTIONS ≥ 1`** and reference the valid Contract Address on the Midnight Explorer.

---

### Error 2: Dual Runtime Version Conflict (0.16.0 vs 0.19.0)

* **Symptom**: Runtime crash during deployment:
  ```
  TypeError: Cannot read properties of undefined (reading 'coinPublicKey')
      at decodeZswapLocalState (chunk.js)
  ```
* **Root Cause**: 
  * `package.json` installed `@midnight-ntwrk/compact-runtime@^0.19.0`.
  * `@midnight-ntwrk/compact-js@2.5.1` bundled and expected `@midnight-ntwrk/compact-runtime@0.16.0`.
  * In `0.19.0`, `createCircuitContext` expects a nested `callContext.currentQueryContext` object, whereas `0.16.0` produces a flat `{ currentQueryContext, currentZswapLocalState, currentPrivateState }` object.
  * When `managed/debt/contract/index.js` was evaluated against `0.16.0`, `context.callContext` was `undefined`, causing `decodeZswapLocalState(undefined)` to crash on `state.coinPublicKey`.
* **Fix Implemented**:
  * Pinned `@midnight-ntwrk/compact-runtime` strictly to `"0.16.0"` in `package.json`.
  * Aligned `managed/debt/contract/index.js` to the canonical 0.16.0 flat context structure.
* **How to Avoid in Level 3**:
  * Never mix `^0.19.0` with `compact-js@2.5.1`.
  * Pin `@midnight-ntwrk/compact-runtime` to `"0.16.0"` across all `package.json` files.
  * Verify single resolution using `npm ls @midnight-ntwrk/compact-runtime`.

---

### Error 3: Asynchronous Generated Contract Methods

* **Symptom**: `TypeError: Cannot read properties of undefined (reading 'currentQueryContext')` or `reading 'coinPublicKey'` during constructor initialization and circuit execution.
* **Root Cause**:
  * The contract wrapper methods in `managed/debt/contract/index.js` were generated/declared as `async initialState(...)` and `async settleDebt(...)`.
  * `@midnight-ntwrk/compact-js` (`ContractExecutable.js`) calls `contract.initialState(...)` and `circuit(...)` **synchronously** and immediately destructures the return value:
    ```typescript
    const { currentContractState, currentPrivateState, currentZswapLocalState } = contract.initialState(...);
    ```
  * Because the method was `async`, it returned a `Promise`. Destructuring a `Promise` synchronously yielded `undefined` for all state variables.
* **Fix Implemented**:
  * Removed `async` from `initialState()`, `settleDebt()`, and `_settleDebt_0()`, making them purely synchronous.
* **How to Avoid in Level 3**:
  * Contract lifecycle methods (`initialState`, circuits, internal operations) in `managed/<contract>/contract/index.js` **must be synchronous** functions that return plain objects immediately.

---

### Error 4: Invalid Circuit Context & Return Shape

* **Symptom**: Circuit execution rejected with:
  ```
  TypeError: Cannot read properties of undefined (reading 'currentQueryContext')
  ```
* **Root Cause**:
  * In `@midnight-ntwrk/compact-js`, the circuit caller expects the circuit function to return:
    ```typescript
    return { result, context, proofData: partialProofData };
    ```
  * The contract artifact was returning `{ result, context, gasCost }` without `proofData`, causing transcript generation and query context extraction to fail.
* **Fix Implemented**:
  * Updated the circuit return signature in `managed/debt/contract/index.js` to return `{ result, context, proofData: partialProofData }`.
* **How to Avoid in Level 3**:
  * Ensure all circuit methods in compiled artifacts return `{ result, context, proofData }`.

---

### Error 5: Coin Public Key & Elliptic Curve Point Validation

* **Symptom**: Deployment failed with:
  ```
  ContractConfigurationError: Failed to configure constructor context with coin public key
  ```
* **Root Cause**:
  * A dummy fallback `'0'.repeat(64)` was used when shielded addresses were not detected. All-zero strings (`0000...`) are not valid decompression points on the Jubjub elliptic curve.
  * Custom manual regex/Bech32m conversions were attempting to slice/mangle valid wallet key strings.
* **Fix Implemented**:
  * Passed `shieldedAddresses.shieldedCoinPublicKey` and `shieldedEncryptionPublicKey` directly to `walletProvider` without custom string transformations, as specified in the official 1AM wallet skill.
* **How to Avoid in Level 3**:
  * Never pass dummy zeros (`'0'.repeat(64)`) as a coin public key.
  * Pass raw keys directly from `connectedAPI.getShieldedAddresses()` to `walletProvider`.

---

### Error 6: Stale Vite Cache & Dependency Pre-Bundling

* **Symptom**: Code edits in `src/` or `managed/` appeared to have no effect, and the browser continued throwing identical errors across multiple page refreshes.
* **Root Cause**: Vite pre-bundles dependencies into `node_modules/.vite/deps/` (e.g. `chunk-6SHTJD34.js`). When underlying WASM or SDK shims changed, Vite continued serving stale pre-bundled chunks.
* **Fix Implemented**:
  * Executed cache purge in PowerShell:
    ```powershell
    Remove-Item -Recurse -Force node_modules\.vite
    ```
  * Restarted the dev server and executed browser hard-refresh (`Ctrl+Shift+R`).
* **How to Avoid in Level 3**:
  * When updating SDK versions, contract artifacts, or Vite configuration, always purge `node_modules/.vite` and restart Vite.

---

### Error 7: Static Proving Asset Module Resolution & 404s

* **Symptom**: 
  * `Failed to resolve module specifier "@midnight-ntwrk/compact-runtime"`
  * `Failed to load resource: 404 Not Found` for `.zkir` or `.verifier` files.
* **Root Cause**:
  * Unbundled JavaScript files inside `public/` were attempting bare module imports that the browser could not resolve.
  * `FetchZkConfigProvider` and `withCompiledFileAssets` were pointing to paths that did not match the physical asset hierarchy in `public/`.
* **Fix Implemented**:
  * Removed unbundled `.js` files from `public/`.
  * Hosted only static proving assets (`.zkir`, `.bzkir`, `.verifier`, `.prover`, `contract-manifest.json`) under `public/managed/debt/`.
  * Aligned URLs: `new FetchZkConfigProvider(`${origin}/managed/debt`, fetch.bind(window))`.
* **How to Avoid in Level 3**:
  * Never put `.js` / `.ts` source files into `public/`.
  * Store all ZK keys and manifests in `public/managed/<contract-name>/`.

---

### Error 8: Indexer GraphQL `offset: null` Bug

* **Symptom**: Indexer queries failed when fetching latest contract state on Midnight Preprod.
* **Root Cause**: Preprod GraphQL indexer (v4) throws a validation error when receiving `offset: null` in default queries.
* **Fix Implemented**:
  * Added `createPatchedPublicDataProvider` to query `contractAction(address: $address)` with custom GraphQL strings that omit invalid offset parameters.
* **How to Avoid in Level 3**:
  * Always use the patched public data provider wrapper from `src/midnightProviders.ts` when querying Preprod indexers.

---

### Error 9: Prover Server vs In-Browser Prover Provider

* **Symptom**: Proving timeouts or connection failures when relying on remote HTTP proof servers.
* **Root Cause**: `httpClientProofProvider` attempts to connect to remote proof servers that may have rate limits, version mismatches, or network latency.
* **Fix Implemented**:
  * Used the 1AM wallet's native proving provider:
    ```typescript
    const provingProvider = await connectedAPI.getProvingProvider(zkConfigProvider);
    proofProvider = {
      async proveTx(unprovenTx: any, _config: any) {
        const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
        return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
      }
    };
    ```
* **How to Avoid in Level 3**:
  * Use `connectedAPI.getProvingProvider()` for fast, client-side WASM ZK proving.

---

### Error 10: Block Explorer Route & Hash Formatting

* **Symptom**: Explorer transaction links returned `404 Not Found`.
* **Root Cause**: Explorer URLs used `/transaction/<hash>` (singular, without `0x`) instead of `/transactions/0x<hash>` (plural, with `0x` prefix).
* **Fix Implemented**:
  * Standardized all explorer URLs to:
    `https://preprod.midnightexplorer.com/transactions/0x<hex-hash>`
* **How to Avoid in Level 3**:
  * Always format Explorer links with `/transactions/0x...`.

---

## 3. The Golden Dependency Compatibility Matrix

For stable Level 3 development, use this exact set of compatible package versions:

```json
{
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "0.16.0",
    "@midnight-ntwrk/compact-js": "^2.5.1",
    "@midnight-ntwrk/dapp-connector-api": "^4.0.1",
    "@midnight-ntwrk/midnight-js-contracts": "^4.1.1",
    "@midnight-ntwrk/midnight-js-fetch-zk-config-provider": "^4.1.1",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider": "^4.1.1",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider": "^4.1.1",
    "@midnight-ntwrk/midnight-js-level-private-state-provider": "^4.1.1",
    "@midnight-ntwrk/midnight-js-network-id": "^4.1.1",
    "@midnight-ntwrk/midnight-js-types": "^4.1.1",
    "@midnight-ntwrk/ledger-v8": "^8.0.3"
  },
  "devDependencies": {
    "vite-plugin-node-polyfills": "^0.28.0",
    "vite-plugin-wasm": "^3.6.0",
    "vitest": "^1.2.2"
  }
}
```

---

## 4. Level 3 Architecture & Prevention Checklist

Before testing or submitting Level 3, run through this checklist:

- [ ] **Contract Design**:
  - Compact circuit logic uses `disclose()` strictly on public outputs (e.g. `settled`, `tally`, `eligible`).
  - Private state is accessed exclusively via off-chain `witness` functions.
- [ ] **Compiled Artifacts**:
  - `managed/<contract>/contract/index.js` methods are synchronous (`initialState`, `circuits`).
  - Proving keys (`.prover`, `.verifier`, `.zkir`, `.bzkir`, `contract-manifest.json`) are synced to `public/managed/<contract>/`.
- [ ] **Provider Setup**:
  - `setNetworkId('preprod')` is called before any contract/wallet interaction.
  - `walletProvider` receives raw keys directly from `connectedAPI.getShieldedAddresses()`.
  - `proofProvider` wraps `unprovenTx.prove(provingProvider, CostModel.initialCostModel())`.
  - `publicDataProvider` wraps GraphQL calls with the `offset: null` patch.
- [ ] **Deployment & Interaction**:
  - Deploy uses `createUnprovenDeployTx` + `submitTxAsync` to avoid indexer-blocking timeouts.
  - Circuit calls invoke `findDeployedContract` -> `(deployed.callTx as any).circuitName(...)`.
- [ ] **CI/CD & Testing**:
  - Minimum 3–5 unit tests passing in Vitest covering circuit transitions, invalid inputs, and witness privacy.
  - GitHub Actions workflow (`.github/workflows/ci.yml`) runs compile, test, and build on every push.
- [ ] **Verification**:
  - Transaction hashes verified on Midnight Explorer showing `CONTRACT ACTIONS ≥ 1`.
  - README documents what is visible on-chain vs shielded.

---

## 5. Emergency Debugging Runbook

If an unexpected error occurs during Level 3 development, follow this sequence:

```
[Error Encountered]
        │
        ├── 1. Check Console Stack Trace:
        │      ├── "Cannot read properties of undefined (reading 'coinPublicKey')"
        │      │   └── Fix: Recheck compact-runtime version (must be 0.16.0) & ensure initialState is synchronous.
        │      ├── "Failed to configure constructor context with coin public key"
        │      │   └── Fix: Check getShieldedAddresses() output; ensure no '0'.repeat(64) dummy keys.
        │      └── "Cannot read properties of undefined (reading 'currentQueryContext')"
        │          └── Fix: Ensure circuit method in contract/index.js is synchronous and returns { result, context, proofData }.
        │
        ├── 2. Purge Caches:
        │      └── powershell: Remove-Item -Recurse -Force node_modules\.vite
        │      └── browser: Ctrl + Shift + R
        │
        ├── 3. Verify Tests:
        │      └── npm test (all unit tests must pass locally)
        │
        └── 4. Check Explorer Transcript:
               └── Open https://preprod.midnightexplorer.com/transactions/0x<txHash>
               └── Verify "Contract Call" and "CONTRACT ACTIONS >= 1"
```
