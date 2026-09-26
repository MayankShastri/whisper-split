# How to Use Whisper Split

Whisper Split has two screens, picked from the buttons at the top of the app:

- **Payroll console**: private payroll. An admin funds a pool with real NIGHT and each person claims their own share with a zero-knowledge proof.
- **Debt settlement**: the original Level 1/2 demo. It proves a debt is settled without revealing the amounts.

Most of this guide covers the Payroll console.

---

## What You Need

- **A Midnight wallet extension**: 1AM or Midnight Lace, unlocked and set to the **Preprod** network.
- **Unshielded NIGHT** (admins only, to fund a pool). NIGHT is always unshielded and has no shielded form. The amount you deposit must be available as unshielded NIGHT.
- **DUST** in the same wallet to pay transaction fees. Admins and participants both need it.
- The app: [whisper-split.vercel.app](https://whisper-split.vercel.app/), or run it locally (see the README).

Connect first. Click **Connect Wallet** (top right), then choose **1AM Wallet** or **Midnight Lace**.

> Amounts are entered in **base units** (whole numbers), not decimal NIGHT.

---

## For Payroll Admins: Running a Payout

Open **Payroll console**. You start on the **Deposit & Allocate** tab.

### 1. Pick a contract (deploy once, reuse forever)

One contract can host many payroll runs ("pools"). You usually deploy only once.

- **Reusing a contract:** paste its 64-character address into **Public payroll contract address**.
- **First time:** click **Deploy fresh pool contract** and approve it in your wallet. The new address fills in automatically. **Save this address.** Participants will need it, and so will you for future payrolls.

After a fresh deploy the indexer can take a few seconds to catch up. The app shows *"Waiting for the indexer to confirm this contract address…"*. Wait, then click **Sync indexer**. Deposit stays disabled until the contract is confirmed.

If the selected pool still holds unclaimed funds when you click **Deploy fresh pool contract**, the app asks you to confirm first. Deploying a new contract does **not** move those funds. They remain claimable only through the old address. In most cases you should cancel and keep using the same contract.

### 2. Collect participant addresses

Every participant must send you their **payout identity**, a 64-character hex value:

1. The participant opens the Payroll console with the wallet account they will claim from.
2. They click **Reveal my identity** under *Your Payout Identity*.
3. They copy the value shown and send it to you.

This value must come from the exact wallet account that will claim. A claim from any other account is rejected.

### 3. Build the allocations

Under **Batch Payroll Allocations**:

1. For each person, paste their identity into the address field (*"64-character address hex"*) and enter their **Share (base units)**.
2. Use **Add participant** for more rows and **Remove** to delete one. The limit is 256 rows.
3. To pay yourself too, click **Reveal my identity** first, then **Add my address**.
4. Problems show inline under the row: *Invalid identity*, *Invalid share*, *Out of range*, or *Duplicate identity*. **Running total (valid rows)** shows the total the deposit will be.
5. Click **Use these allocations**.

The app shows *"N allocations loaded"* and a new **Pool ID (new, random)**. Each time you apply allocations, a fresh pool ID and fresh secret salts are generated.

*Alternative:* expand **Import allocations.json** and pick a file containing a JSON array of `{ "participantAddress": "<64 hex>", "shareAmount": "<number>" }` objects. The same validation applies.

### 4. Deposit

Click **Deposit & publish root** and approve in your wallet. This locks the total into the contract and publishes the pool's Merkle root. Individual shares are not published. When the transaction completes, click **Sync indexer**. **Pool custody** should show the deposited total.

### 5. Download and distribute vouchers

Click **Download private claim vouchers**. You get one file per row, named `claim-voucher-1.json`, `claim-voucher-2.json` and so on, in the same order as your rows. Your browser may ask for permission to download multiple files.

- Each voucher is a **private credential**. Send each file only to its own recipient, over a private channel.
- Send the **contract address** along with it.
- Download the vouchers **before leaving the screen**. Reloading, disconnecting or navigating away clears the allocations from memory. If you apply allocations again, you get a new pool ID and new salts, and the old vouchers will no longer match.

### 6. Run more payrolls on the same contract

Keep the same contract address and repeat steps 3–5. Each **Use these allocations** creates a new pool with its own ID on the same contract. Older pools stay claimable.

---

## For Participants: Claiming Your Share

1. **Connect the right wallet account.** It must be the same account whose identity you gave the admin. If unsure, click **Reveal my identity** and compare the value with the one you sent.
2. Open **Payroll console** and switch to the **Claim Share (ZK)** tab.
3. Paste the **contract address** from your admin into **Public payroll contract address**. The voucher picker is disabled until this is filled.
4. Under **Private claim voucher file**, pick your `claim-voucher-N.json`. You should see **Voucher ready** and your **Voucher pool ID**.
5. Click **Generate proof & claim payout** and approve in your wallet.
6. Click **Sync indexer** and check the transaction link. Your share is paid in unshielded NIGHT to your connected wallet address.

Each voucher can be claimed only once.

---

## What Gets Proved (and What Stays Private)

**Proved in zero knowledge when you claim:**
- your entry is part of the list the admin committed to (a Merkle membership proof);
- the amount paid out is exactly your entitled share;
- the wallet receiving the payout is the one named in your voucher.

**Stays private:**
- the shares of everyone who has **not** claimed yet;
- each person's secret salt and Merkle path;
- the full allocation list. It never goes on-chain, only its Merkle root.

**Public on-chain:**
- each pool's ID and Merkle root;
- each pool's total deposit, remaining balance and number of claims;
- which claim keys have been used, stored as a hash of pool ID plus participant identity;
- **your own amount, once you claim.** A real NIGHT transfer's amount is always visible.
- each claim shows which pool it drew from.

The honest limit: privacy here is **per claim, not forever**. Once you claim, your amount is public. Watching a pool's balance drop between claims can also reveal amounts. What stays hidden is the share of anyone who hasn't claimed yet.

Proofs are generated by your wallet or its configured proof server, which sees your private inputs. Use one you trust.

---

## Troubleshooting

When a deploy, deposit or claim fails, the app shows a general message: *"Operation did not complete. Check wallet activity, proof assets, contract address and indexer before retrying…"*. The specific reason appears in your wallet or in the browser developer console. Common causes:

| Symptom | What it means / what to do |
| --- | --- |
| **"Insufficient funds"** (in the wallet) | You need **unshielded** NIGHT for the deposit plus **DUST** for fees. Shielded tokens can't be used. |
| **"Recipient must match claimed identity"** | The connected wallet account isn't the one this voucher was made for. Switch to the correct account (compare it using **Reveal my identity**) and try again. |
| **"Share already claimed"** | This voucher has already been used. Each share can be claimed once. |
| **"Payroll state unavailable…"**, or *"Waiting for the indexer…"* right after deploy | Indexer lag. Wait a few seconds and click **Sync indexer**. Also check that the address is correct. |
| **"Voucher rejected. Import one valid participant package for the selected contract…"** | The voucher is for a different contract (check the address you pasted), is damaged, or is an old Level 3 voucher. Level 3 vouchers have no pool ID and don't work with the current contract. Ask your admin for a new one. |
| **Deposit & publish root is disabled** | You need applied allocations, a confirmed contract (click **Sync indexer**), and a pool not already funded. To pay again, apply new allocations to get a new pool. |
| **"… rejected: … Use unique 32-byte hex participantAddress values and positive Uint64 shareAmount strings."** | An allocation is invalid: a bad or duplicate address, or a share that isn't a positive whole number. |

---

## Debt Settlement Screen (Level 1/2)

This screen is a demonstration: it proves two private amounts are equal. It does not move tokens.

1. Open **Debt settlement** and connect your wallet.
2. Click **Deploy new debt contract**. Private amounts are generated in your browser and never displayed.
3. Wait for indexing, then click **Refresh indexer** until **Indexed status** shows *Unsettled*.
4. Click **Prove equality and settle**. When it completes, **Indexed status** shows *Settled* and **Settlement counter** goes up.

Settling needs the private state from a deploy made **in this same session**. Pasting an existing address lets you view its status, but not settle it.
