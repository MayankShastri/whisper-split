# Troubleshooting: 1AM Wallet Transaction Success but UI Shows Error

**Issue Date**: 2026-09-13  
**Affected Wallet**: 1AM Wallet  
**Status**: ✅ Fixed in latest build

---

## What Happened

### Symptom
- Transaction approved in 1AM wallet
- Transaction succeeded on-chain (confirmed in explorer)
- DApp UI showed: **"TRANSACTION REJECTED - Settlement Failed"**
- Error message: `"Failed to create transfer transaction with connected wallet"`

### Evidence
```
✅ Transaction Hash: e7ebdfcf511abccf92203930c991f71cb0279a78336f12261438afa84e8856e5
✅ Transaction ID: 602786
✅ Status: SUCCESS
✅ Type: unshielded
✅ Fees: 1 dust
✅ Asset Net: 0.0 NIGHT (successful transfer)
```

**Explorer Link**: https://preprod.midnightexplorer.com/transaction/e7ebdfcf511abccf92203930c991f71cb0279a78336f12261438afa84e8856e5

---

## Root Cause

### The Problem

The original code expected **all wallets** to return responses in the same format:

```typescript
// ❌ OLD CODE (Too strict)
const transferResult = await connectedApi.makeTransfer([transferOutput]);
if (!transferResult || !transferResult.tx) {
  throw new Error('Failed to create transfer transaction');
}
```

**What was wrong**:
- Lace Wallet returns: `{ tx: "hexstring" }`
- 1AM Wallet returns: `"hexstring"` (direct string)
- Code only checked for object format with `.tx` property
- 1AM's string response failed the check → threw error
- Transaction was actually submitted successfully before the error!

### Why Transaction Succeeded Despite Error

**The flow was**:
1. ✅ `makeTransfer()` called → 1AM returns string
2. ❌ Code checks for `.tx` property → not found → throws error
3. ✅ BUT 1AM already submitted transaction internally
4. ❌ DApp shows error screen
5. ✅ Transaction confirms on-chain

**Result**: Transaction succeeded, but user saw failure message.

---

## The Fix

### New Code (Flexible)

```typescript
// ✅ NEW CODE (Handles both formats)
const transferResult = await connectedApi.makeTransfer([transferOutput]);
console.log('makeTransfer result:', transferResult);

let txString: string;
if (typeof transferResult === 'string') {
  // 1AM Wallet format: direct string
  txString = transferResult;
} else if (transferResult && typeof transferResult === 'object' && 'tx' in transferResult) {
  // Lace Wallet format: { tx: string }
  txString = transferResult.tx;
} else {
  throw new Error('Wallet returned unexpected transfer result format');
}

// Now txString works with both wallets
```

### What Changed

**Before**:
- Assumed all wallets return `{ tx: string }`
- Failed on 1AM's direct string response

**After**:
- Checks response type dynamically
- Handles both string and object formats
- Added detailed logging for debugging
- Applied same fix to `balanceUnsealedTransaction()` response

---

## How to Test the Fix

### Prerequisites
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Rebuild app: `npm run build`
4. Restart dev server: `npm run dev`

### Test with 1AM Wallet

**Step 1: Connect**
```
1. Open http://localhost:5173/
2. Click "Connect Wallet"
3. Select "1AM Wallet"
4. Approve connection
✅ Verify: Address shows in top-right
```

**Step 2: Perform Settlement**
```
1. Click "Proceed to Settlement"
2. Click "Begin Settlement"
3. Enter amount: 100
4. Click "Generate ZK Proof"
5. Wait for 1AM approval popup
6. Approve transaction in 1AM
✅ EXPECTED: Success screen appears (not error)
✅ EXPECTED: Transaction hash displays
```

**Step 3: Verify in Console**
```
1. Press F12 to open console
2. Look for logs:
   - "Building transfer with output: ..."
   - "makeTransfer result: ..." ← Should show the response
   - "Balancing transaction..."
   - "Submitting transaction to network..."
   - "Transaction submitted successfully"
   - "Computed transaction hash: ..."
```

**Step 4: Verify on Explorer**
```
1. Copy transaction hash from UI
2. Search on: https://preprod.midnightexplorer.com/
3. Verify status shows SUCCESS
4. Verify amount is 100 tNIGHT
```

---

## Additional Improvements Made

### 1. Enhanced Error Handling

```typescript
catch (err: any) {
  console.error('Settlement error:', err);
  console.error('Error stack:', err?.stack);
  
  let errorMsg = err?.message || 'Settlement failed';
  
  // User-friendly error messages
  if (errorMsg.includes('User rejected') || errorMsg.includes('declined')) {
    errorMsg = 'Transaction was declined in wallet. Please try again and approve.';
  } else if (errorMsg.includes('Network')) {
    errorMsg = 'Network error. Please check your connection and try again.';
  }
  
  setErrorMessage(errorMsg);
}
```

**Benefits**:
- More descriptive error messages
- Easier debugging with console logs
- User-friendly language

### 2. Added Logging

All critical steps now log to console:
```
✅ Building transfer with output: {...}
✅ makeTransfer result: [shows actual response]
✅ Balancing transaction...
✅ balanceUnsealedTransaction result: [shows actual response]
✅ Submitting transaction to network...
✅ Transaction submitted successfully
✅ Computed transaction hash: e7eb...
```

**How to use**:
- Open browser console (F12) during settlement
- Watch logs to see exactly where any error occurs
- Share logs if you need support

### 3. State Refresh Delay

```typescript
// Wait 2 seconds before querying indexer
await new Promise(resolve => setTimeout(resolve, 2000));
await refetch();
```

**Why**: Indexer needs time to register transaction. Immediate query might return old state.

---

## Known Wallet Differences

### Lace Wallet
```typescript
makeTransfer() returns: { tx: "hexstring" }
balanceUnsealedTransaction() returns: { tx: "hexstring" }
submitTransaction() returns: void (no return value)
```

### 1AM Wallet
```typescript
makeTransfer() returns: "hexstring" (direct string)
balanceUnsealedTransaction() returns: "hexstring" (direct string)
submitTransaction() returns: void (may auto-submit internally)
```

**The fix handles both formats automatically.**

---

## Verification Checklist

After updating, verify these work:

### With Lace Wallet
- [ ] Connection succeeds
- [ ] Settlement completes without error
- [ ] Success screen shows transaction hash
- [ ] Explorer confirms transaction
- [ ] Dashboard updates to SETTLED

### With 1AM Wallet
- [ ] Connection succeeds
- [ ] Settlement completes without error ← **FIXED**
- [ ] Success screen shows transaction hash ← **FIXED**
- [ ] Explorer confirms transaction
- [ ] Dashboard updates to SETTLED

---

## If You Still See Errors

### Step 1: Check Console Logs

Open F12 and look for the new logs. Share this info:
```
1. What does "makeTransfer result: ..." show?
2. What does "balanceUnsealedTransaction result: ..." show?
3. What is the exact error message in console?
```

### Step 2: Verify Build Version

```bash
# Make sure you're running the latest build
cd "Level 1"
npm run build
npm run dev
```

### Step 3: Clear State

```bash
# Clear browser data
1. Open browser settings
2. Clear site data for localhost:5173
3. Hard refresh (Ctrl+F5)
4. Reconnect wallet
5. Try again
```

### Step 4: Check Wallet Version

1AM Wallet must be up to date:
- Check extension version
- Update if available
- Restart browser after update

---

## Success Confirmation

**You'll know the fix works when**:

✅ 1AM transaction approval leads to **success screen** (not error)  
✅ Console shows "Transaction submitted successfully"  
✅ Transaction hash appears in UI  
✅ Explorer shows SUCCESS status  
✅ Dashboard updates to SETTLED within 30 seconds  

---

## Related Issues

### Issue: "Transaction shows success but state doesn't update"

**Cause**: Indexer lag (normal)  
**Fix**: Wait up to 60 seconds, or click "[Dev/Demo: Sync Indexer]"  
**Not a bug**: State eventually syncs

### Issue: "Second settlement attempt fails"

**Cause**: Contract only allows one settlement (`settled == true` prevents double-settle)  
**Fix**: This is correct behavior per contract logic  
**Not a bug**: Working as designed

---

## Technical Notes

### Why Different Wallets Return Different Formats

The DApp Connector API specification (v4.0.1) defines return types as:
```typescript
makeTransfer(...): Promise<{ tx: string }>
```

**However**:
- Specification says "should" not "must"
- Implementation varies by wallet vendor
- Both formats are technically valid
- Good DApps handle both gracefully

### Why We Don't Normalize in the Hook

Could we normalize in `useMidnight.ts`? Yes, but:
- Keeps wallet abstraction minimal
- Errors are easier to debug at call site
- Respects wallet API differences
- Allows wallet-specific optimization later

---

## Update History

**2026-09-13**: Initial fix deployed
- Added flexible response format handling
- Added comprehensive logging
- Added user-friendly error messages
- Tested with both Lace and 1AM wallets

---

## Questions?

If you encounter any issues after this fix:

1. Check browser console logs (F12)
2. Verify you're running latest build (`npm run build`)
3. Test with Lace wallet to compare behavior
4. Share console logs and error messages

**The transaction hash `e7ebdfcf...` proving your transaction succeeded is the key evidence that the network integration works correctly. The UI error was purely a response format parsing issue, now resolved.**
