# Rate Limiting & Transaction Frequency Protection

## Implementation Summary

### Backend Changes

#### 1. User Model Updates (`models/User.js`)
**New Fields Added:**
```javascript
recentTransactions: [{
  timestamp: Date,
  amount: Number,
  weight: Number  // Transactions > RM1000 = weight 2
}]
transactionBlockedUntil: Date
transactionBlockReason: String
```

#### 2. Rate Limiting Middleware (`middleware/rateLimit.js`)
**Features:**
- ✅ Rapid fire protection: Max 3 transactions per 5 minutes
- ✅ Hourly limit: Max 10 transactions per hour
- ✅ High-value weighting: Transactions > RM1000 count as 2
- ✅ Fraud score integration: High fraud users get lower limits
- ✅ 30-minute block when limits exceeded
- ✅ Auto-cleanup of old transaction records

**Functions:**
- `checkTransactionBlock()` - Middleware to check if user is blocked
- `checkRateLimit(userId, amount, fraudScore)` - Check and enforce limits
- `getRateLimitStatus()` - Get user's current rate limit status

#### 3. Transaction Controller Updates (`controllers/transactionController.js`)
**Changes:**
- Rate limit check added to `deposit()`, `withdraw()`, and `transfer()`
- Blocks transaction if limits exceeded
- Returns 429 status with block information

#### 4. Admin Controller Updates (`controllers/adminController.js`)
**New Endpoints:**
- `getBlockedUsers()` - Get all users with transaction blocks
- `unblockUserTransactions()` - Admin can manually unblock users

#### 5. Route Updates
**Transaction Routes (`routes/transactionRoutes.js`):**
- Added `GET /api/transactions/rate-limit-status` - Check limits
- Added `checkTransactionBlock` middleware to all transaction routes

**Admin Routes (`routes/adminRoutes.js`):**
- Added `GET /api/admin/users/blocked/list` - List blocked users
- Added `PUT /api/admin/users/:id/unblock-transactions` - Unblock user

---

### Frontend Changes

#### 1. Transfer Page Updates (`pages/Transfer.js`)
**Features:**
- ✅ Rate limit error handling with block duration display
- ✅ Shows minutes remaining when blocked
- ✅ User-friendly error messages

**Error Display:**
```jsx
🚫 Too many transactions in short time (4/3 in 5 minutes)
⏱️ You can try again in 28 minutes
```

#### 2. New Admin Page (`pages/AdminBlockedUsers.js`)
**Features:**
- ✅ Summary cards: Currently Blocked, Expired Blocks, Total Records
- ✅ Real-time status showing minutes remaining
- ✅ Block reason display
- ✅ Recent transaction count
- ✅ Separate sections for active and expired blocks
- ✅ Admin unblock button with confirmation
- ✅ Clear block history option

**UI Sections:**
1. **Currently Blocked** - Users who can't transact right now
2. **Recently Expired Blocks** - Historical records of blocks

#### 3. AdminNavbar Updates (`components/AdminNavbar.js`)
- Added "Blocked Users" navigation link with lock icon

#### 4. App.js Route Updates
- Added route: `/admin/blocked-users` → AdminBlockedUsers component

---

## Rate Limiting Rules

### Standard Limits
| Rule | Limit | Window | Block Duration |
|------|-------|--------|----------------|
| Rapid Fire | 3 transactions | 5 minutes | 30 minutes |
| Hourly | 10 transactions | 60 minutes | 30 minutes |
| High Value (>RM1000) | Counts as 2 | - | - |

### High Fraud User Limits (fraud score > 0.7)
| Rule | Limit | Window | Block Duration |
|------|-------|--------|----------------|
| Rapid Fire | 2 transactions | 5 minutes | 30 minutes |
| Hourly | 7 transactions | 60 minutes | 30 minutes |

---

## API Endpoints

### User Endpoints
```
GET  /api/transactions/rate-limit-status
Response: {
  isBlocked: boolean,
  blockedUntil: Date,
  blockReason: string,
  minutesRemaining: number,
  limits: {
    rapidFire: { current, max, remaining, windowMinutes },
    hourly: { current, max, remaining, windowMinutes }
  }
}
```

### Admin Endpoints
```
GET  /api/admin/users/blocked/list
Response: [{
  _id, firstName, lastName, email, accountNumber,
  blockedUntil, blockReason, isCurrentlyBlocked,
  minutesRemaining, recentTransactionCount
}]

PUT  /api/admin/users/:id/unblock-transactions
Response: { message, user }
```

---

## Testing Instructions

### 1. Test Rate Limiting
1. Login as regular user
2. Make 3 transfers quickly (within 5 minutes)
3. Try 4th transfer → Should be blocked
4. Error message shows block reason and time remaining

### 2. Test High-Value Detection
1. Make transfer > RM1000 (counts as 2)
2. Make another normal transfer
3. Try 2nd normal transfer → Should be blocked (2+1+1 = 4 > 3)

### 3. Test Admin Unblock
1. Get blocked as user
2. Login as admin
3. Go to "Blocked Users" page
4. Click "Unblock Now" on your user
5. Return to user account → Can transact again

### 4. Test Auto-Expiry
1. Get blocked as user
2. Wait 30 minutes (or modify blockMinutes for testing)
3. Try transaction → Should work
4. Block automatically cleared

---

## Error Messages

### User Sees:
```
🚫 Too many transactions in short time (4/3 in 5 minutes)
⏱️ You can try again in 28 minutes
Too many transactions detected. Please wait before making another transaction.
```

```
🚫 Transaction limit exceeded (11/10 per hour)
⏱️ You can try again in 30 minutes
```

### Admin Sees:
```
Currently Blocked (3)
User: John Doe
Reason: Too many transactions in short time (4/3 in 5 minutes)
Time Left: 28 min
Recent Txns: 4
[Unblock Now] button
```

---

## Security Benefits

1. **Prevents Rapid Fraud Attempts**
   - Blocks automated scripts trying multiple transactions
   - Slows down stolen account exploitation

2. **Protects Against Account Takeover**
   - Limits damage if credentials compromised
   - Gives user time to notice suspicious activity

3. **Reduces Money Laundering Risk**
   - High-value transactions weighted more heavily
   - Multiple small transactions also caught

4. **Integration with Fraud Detection**
   - High-risk users automatically get stricter limits
   - Combined protection with ML fraud detection

5. **Admin Oversight**
   - Clear visibility of blocked users
   - Manual override capability for false positives
   - Audit trail of blocks and reasons

---

## Configuration

Edit `backend/middleware/rateLimit.js` to adjust limits:

```javascript
const RATE_LIMITS = {
  RAPID_FIRE: {
    count: 3,              // Change max transactions
    windowMinutes: 5,      // Change time window
    blockMinutes: 30,      // Change block duration
  },
  HOURLY: {
    count: 10,
    windowMinutes: 60,
    blockMinutes: 30,
  },
  HIGH_VALUE_THRESHOLD: 1000, // Change RM threshold
};
```

---

## Database Impact

**New Fields in User Collection:**
- `recentTransactions` array (auto-cleaned after 1 hour)
- `transactionBlockedUntil` timestamp
- `transactionBlockReason` string

**Storage:** Minimal - old transactions auto-deleted, only keeps last hour

---

## Future Enhancements (Optional)

1. **Progressive Blocking**
   - First offense: 15 min block
   - Second offense: 1 hour block
   - Third offense: 24 hour block

2. **Notifications**
   - Email user when blocked
   - Alert admin of frequent blockers

3. **Analytics Dashboard**
   - Chart of blocks over time
   - Identify patterns and adjust limits

4. **Whitelist Feature**
   - VIP users with higher limits
   - Business accounts with custom rules

5. **Rate Limit by Type**
   - Different limits for deposits vs transfers
   - Stricter limits for withdrawals
