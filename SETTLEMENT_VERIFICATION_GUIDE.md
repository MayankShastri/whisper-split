# Settlement Verification Guide

**Last Updated**: 2026-09-13  
**Network**: Midnight Preprod  
**Contract Address**: `02008f31b6e22c92131920807c42733d7b8895015e1cbff534ad17698246377317`

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **Lace Wallet Extension** installed in your browser
  - Download from: https://www.lace.io/
  - Or **1AM Wallet** as alternative
- [ ] **Lace configured to Preprod network**
  - Open Lace → Settings → Network → Select "Preprod"
- [ ] **Test NIGHT tokens** in your Lace wallet
  - If you don't have test tokens, request from Midnight faucet
- [ ] **Browser**: Chrome, Edge, or Brave (Lace-compatible browsers)

---

## Part 1: Running the DApp Locally

### Step 1: Start the Development Server

```bash
cd "Level 1"
npm run dev
```

**Expected Output**:
```
  VITE v5.4.21  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Step 2: Open in Browser

1. Open your browser
2. Navigate to: `http://localhost:5173/`
3. You should see the "Whisper Split" landing page

---

## Part 2: Connecting Your Wallet

### Step 1: Click "Connect Wallet"

1. On the landing page, click the **"Connect Wallet"** button
2. A modal will appear with wallet options

### Step 2: Select Your Wallet

1. Click **"Midnight Lace"** (or "1AM Wallet" if you're using that)
2. **IMPORTANT**: Lace will show an authorization popup
   - This popup must appear **immediately** after clicking
   - If it doesn't appear, your browser may be blocking popups

### Step 3: Authorize the Connection

In the Lace popup:

1. Review the connection request
2. **Verify the network shows "Preprod"**
3. Click **"Connect"** or **"Authorize"**

### Step 4: Verify Connection Success

After authorization:

- [ ] Top-right corner shows your wallet address (truncated)
  - Format: `mn_addr_preprod...xxxxx`
- [ ] Green pulsing dot appears next to address
- [ ] Wallet name displays: "Midnight Lace"

**If connection fails**:
- Check Lace is set to "Preprod" network
- Refresh page and try again
- Check browser console for errors (F12)

---

## Part 3: Performing Settlement (The Main Flow)

### Step 1: Navigate to Settlement Flow

1. On the landing page, click **"Proceed to Settlement"**
2. You'll see the Settlement Dashboard with contract details

### Step 2: Verify Contract State (Before Settlement)

On the dashboard, check these fields:

```
Contract Address: 02008f31b6e22c92131920807c42733d7b8895015e1cbff534ad17698246377317
Network: Midnight Preprod
Ledger State (On-Chain): ○ UNSETTLED  ← Should show this initially
Settlement Counter: 0                  ← Should be 0 initially
```

**Note**: If "Ledger State" shows "QUERYING INDEXER..." for more than 5 seconds:
- The indexer might be slow
- Wait up to 30 seconds
- If it stays stuck, refresh the page

### Step 3: Click "Begin Settlement"

1. Click the **"Begin Settlement →"** button
2. You'll move to the "Specify Payment Amount" screen

### Step 4: Enter Payment Amount

1. In the input field, enter: **`100`**
   - This is the amount the contract expects (owedAmount = 100)
2. Read the blue "Witness Protection Guarantee" box
   - This confirms your input stays private
3. Click **"Generate ZK Proof →"**

**Why 100?**: The contract was deployed with `owedAmount: 100n`. The circuit will verify your input matches this hidden value.

### Step 5: Wait for Proof Generation (30-60 seconds)

You'll see a loading screen with rotating status messages:

```
1. Initialising Compact circuit & loading verifier key...
2. Invoking getOwedAmount() private witness from local state...
3. Generating zero-knowledge proof in browser...
4. Prompting wallet extension to approve & broadcast...
5. Transaction submitted! Awaiting ledger finalization...
```

**What's happening behind the scenes**:
1. Browser loads WASM circuit verifier
2. Constructs transaction with your input (100)
3. Calls `connectedApi.makeTransfer([transferOutput])`
4. Calls `connectedApi.balanceUnsealedTransaction(tx)`
   - **This triggers the wallet approval popup** ⚠️

### Step 6: Approve Transaction in Lace Wallet 🔑

**CRITICAL STEP**: Lace will show a transaction approval popup.

**What you'll see in the popup**:
```
Transaction Approval
━━━━━━━━━━━━━━━━━━━
Recipient: mn_addr_preprod... (your own address)
Amount: 100 tNIGHT
Fee: ~0.5 tNIGHT (approximate)

[ Reject ]  [ Approve ]
```

**Action Required**:
1. **Verify the amount is 100 tNIGHT**
2. **Verify the recipient is YOUR address**
3. Click **"Approve"**

**If popup doesn't appear**:
- Browser is blocking popups → Allow popups for localhost
- Lace is disconnected → Reconnect wallet
- Transaction timed out → Refresh and try again

### Step 7: Wait for Transaction Submission

After approving:
- The DApp submits the transaction to Midnight network
- Status message changes to: "Transaction submitted! Awaiting ledger finalization..."
- Wait ~5-10 seconds

### Step 8: View Settlement Result

You'll see one of two outcomes:

#### ✅ Success Screen

```
✓ SETTLEMENT ON-CHAIN SUBMITTED

Debt Transaction Sent

Contract: 02008f31...
Tx Hash: a1b2c3d4...  ← CLICK THIS
Network Status: SUBMITTED TO PREPROD
```

**What the success screen means**:
- Transaction was signed by your wallet ✅
- Transaction was broadcast to Midnight network ✅
- Transaction hash is now available ✅

**IMPORTANT**: "SUBMITTED" ≠ "CONFIRMED"
- The transaction is in the mempool
- It needs to be included in a block
- Confirmation takes 1-3 minutes

#### ❌ Failure Screen

```
✗ TRANSACTION REJECTED

Settlement Failed

Error: [specific error message]
```

**Common failure reasons**:
- Wrong amount entered (must be exactly 100)
- Transaction declined in wallet
- Network connection issues
- Insufficient DUST fees

---

## Part 4: Verifying the Transaction (Independent Verification)

### Step 1: Copy Transaction Hash

On the success screen, click the **transaction hash** (long hex string starting with lowercase letters/numbers).

Example: `a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890`

### Step 2: Open Midnight Block Explorer

1. Open a new browser tab
2. Navigate to: **https://preprod.midnightexplorer.com/**
3. Or click the transaction hash link directly from the UI

### Step 3: Search for Your Transaction

1. In the explorer search bar, paste your transaction hash
2. Press Enter
3. Wait for the page to load

### Step 4: Verify Transaction Details

On the explorer, you should see:

```
Transaction Details
━━━━━━━━━━━━━━━━━━━
Hash: [your tx hash]
Status: Pending / Confirmed / Finalized
Block Height: [number]
Timestamp: [recent timestamp]

Inputs:
  • [Your wallet address]: 100 tNIGHT

Outputs:
  • [Your wallet address]: 100 tNIGHT
  • Fee: ~0.5 tNIGHT
```

**Status Progression**:
```
Pending → Confirmed → Finalized
  1min      2min        3min
```

### Step 5: Confirm Final Status

**Wait until status shows "Finalized"** (2-5 minutes)

Once finalized, the transaction is immutably recorded on the Midnight blockchain.

---

## Part 5: Verifying Ledger State Update

### Step 1: Return to DApp Dashboard

1. Go back to your DApp tab
2. Click **"Return to Dashboard"** button
3. You'll see the Settlement Dashboard again

### Step 2: Check Updated Ledger State

Verify these fields have changed:

```
BEFORE Settlement:
Ledger State: ○ UNSETTLED
Settlement Counter: 0

AFTER Settlement:
Ledger State: ● SETTLED      ← Changed to SETTLED
Settlement Counter: 1         ← Incremented to 1
```

**If state hasn't updated yet**:
- Click **"[Dev/Demo: Sync Indexer]"** button
- Or wait 10 seconds (auto-refresh)
- The indexer polls every 10 seconds

### Step 3: Test Hard Refresh (Persistence Test)

1. Press **Ctrl+F5** (or Cmd+Shift+R on Mac) to hard refresh
2. Reconnect your wallet if needed
3. Navigate back to Settlement Dashboard

**Verify**:
- [ ] `Ledger State` still shows `● SETTLED`
- [ ] `Settlement Counter` still shows `1`
- [ ] State persisted because it's fetched from indexer, not localStorage

---

## Part 6: Additional Verification Methods

### Method 1: Query Indexer Directly (Advanced)

Open browser console (F12) and run:

```javascript
fetch('https://indexer.preprod.midnight.network/api/v4/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        contractAction(address: "02008f31b6e22c92131920807c42733d7b8895015e1cbff534ad17698246377317") {
          state
          transaction {
            hash
            block { height }
          }
        }
      }
    `
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Expected Response**:
```json
{
  "data": {
    "contractAction": {
      "state": "[hex bytes of contract state]",
      "transaction": {
        "hash": "[your tx hash]",
        "block": {
          "height": [block number]
        }
      }
    }
  }
}
```

### Method 2: Check Wallet Transaction History

1. Open Lace wallet extension
2. Go to **"Activity"** or **"Transactions"** tab
3. Find your recent 100 tNIGHT transaction
4. Click to view details

**You should see**:
- Amount: 100 tNIGHT
- Status: Confirmed
- Fee: ~0.5 tNIGHT
- Timestamp: Recent

---

## Common Issues & Troubleshooting

### Issue 1: "Wallet not connected" Error

**Symptoms**: Settlement fails immediately with wallet error

**Fix**:
1. Disconnect wallet (click address → Disconnect)
2. Refresh page
3. Reconnect wallet
4. Try settlement again

### Issue 2: Wallet Approval Popup Blocked

**Symptoms**: No popup appears after clicking "Generate ZK Proof"

**Fix**:
1. Check browser address bar for blocked popup icon
2. Click the icon and allow popups for `localhost:5173`
3. Refresh page and try again

### Issue 3: "Contract not found on network"

**Symptoms**: Dashboard shows error instead of contract state

**Possible Causes**:
- Indexer is down
- Wrong contract address
- Network connectivity issues

**Fix**:
1. Verify internet connection
2. Check indexer status: https://indexer.preprod.midnight.network/health
3. Wait 1 minute and refresh

### Issue 4: Transaction Stuck in "Pending"

**Symptoms**: Explorer shows "Pending" for >10 minutes

**Possible Causes**:
- Network congestion
- Insufficient fees
- Invalid transaction

**Fix**:
1. Wait up to 15 minutes (rare network congestion)
2. If still pending after 15 min, transaction may have failed
3. Check Lace wallet for error notifications

### Issue 5: State Shows UNSETTLED After Transaction

**Symptoms**: Explorer shows transaction confirmed, but DApp shows UNSETTLED

**Possible Causes**:
- Indexer lag (most common)
- Wrong contract address queried
- State deserialization error

**Fix**:
1. Wait 2 minutes (indexer may be catching up)
2. Click "[Dev/Demo: Sync Indexer]" button
3. Hard refresh page (Ctrl+F5)
4. If still UNSETTLED after 5 minutes, check browser console for errors

---

## Testing Edge Cases

### Test 1: Wrong Amount Settlement

1. Enter **`50`** instead of 100
2. Proceed through settlement
3. **Expected**: Transaction should fail
4. **Why**: Circuit assertion `paidAmount == owedAmount` will fail

### Test 2: Double Settlement Prevention

1. Complete settlement successfully (state = SETTLED)
2. Try to settle again
3. **Expected**: "Begin Settlement" button is disabled
4. **Why**: `settled == true` prevents re-settlement

### Test 3: Wallet Rejection

1. Start settlement flow
2. When Lace approval popup appears, click **"Reject"**
3. **Expected**: Error screen shows "Transaction declined"
4. **Why**: Wallet refused to sign transaction

---

## Success Criteria Checklist

Use this checklist to confirm everything works:

### Wallet Connection
- [ ] Lace extension installed and configured to Preprod
- [ ] Connection popup appears immediately after clicking wallet
- [ ] Wallet address displays correctly in top-right corner
- [ ] Address matches what Lace extension shows

### Settlement Transaction
- [ ] "Begin Settlement" button enabled when UNSETTLED
- [ ] Payment amount input accepts 100
- [ ] Proof generation loading screen appears
- [ ] Lace approval popup appears automatically
- [ ] Approval popup shows correct amount (100 tNIGHT)
- [ ] Transaction hash appears on success screen

### Explorer Verification
- [ ] Transaction hash searchable on preprod.midnightexplorer.com
- [ ] Transaction shows correct amount (100 tNIGHT)
- [ ] Transaction status progresses: Pending → Confirmed → Finalized
- [ ] Block height and timestamp populated

### Ledger State Update
- [ ] Dashboard shows `● SETTLED` after confirmation
- [ ] Settlement counter increments to 1
- [ ] State persists after hard refresh (Ctrl+F5)
- [ ] State fetched from indexer, not localStorage

### No Mocks Present
- [ ] No setTimeout delays in settlement flow
- [ ] No hardcoded fallback transaction hashes
- [ ] Wallet approval popup is real (not simulated)
- [ ] Ledger state comes from indexer API

---

## Timeline Summary

**Total time from start to verified settlement**: ~5-8 minutes

```
0:00 - Connect wallet (30 seconds)
0:30 - Navigate to settlement (10 seconds)
0:40 - Enter amount and click settle (10 seconds)
0:50 - Proof generation (30-60 seconds)
1:50 - Approve in Lace wallet (10 seconds)
2:00 - Transaction submission (5 seconds)
2:05 - Transaction in mempool (pending)
3:00 - Transaction confirmed in block
5:00 - Transaction finalized
5:30 - Indexer updates contract state
6:00 - DApp dashboard shows SETTLED
```

---

## Support & Resources

### Official Documentation
- Midnight Docs: https://docs.midnight.network/
- DApp Connector API: https://docs.midnight.network/api-reference/dapp-connector
- Lace Wallet: https://www.lace.io/

### Network Resources
- Preprod Explorer: https://preprod.midnightexplorer.com/
- Indexer Endpoint: https://indexer.preprod.midnight.network/api/v4/graphql
- Faucet (test tokens): [Check Midnight Discord for current faucet]

### Debugging
- Browser Console: Press F12
- Lace Wallet Logs: Settings → Developer → View Logs
- Network Tab: F12 → Network (filter by "graphql" to see indexer queries)

---

## Questions to Verify Understanding

Before you start, make sure you can answer:

1. **What network should Lace be set to?**
   - Answer: Preprod

2. **What amount should you enter to successfully settle?**
   - Answer: 100 (matches the contract's owedAmount)

3. **Where do you verify the transaction independently?**
   - Answer: preprod.midnightexplorer.com

4. **How do you know the state persists after refresh?**
   - Answer: Hard refresh (Ctrl+F5) and check if SETTLED status remains

5. **What proves the wallet approval is real, not mocked?**
   - Answer: Lace extension popup appears, shows real fee, requires manual approval

---

**You're ready to test!** Start with Part 1 and work through each section sequentially.

Good luck! 🚀
