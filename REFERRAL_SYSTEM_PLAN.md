# Referral + XP Wallet System Implementation Plan

## 🎯 Overview
Complete monetization system with referrals, XP wallet, and payment integration.

## 📦 Files Created

### Backend Services
1. **referral_service.py** - Core referral and XP wallet logic
   - Referral code generation
   - Signup tracking
   - XP credit/debit operations
   - Referral reward processing
   - Statistics and reporting

2. **referral_endpoints.py** - API endpoints
   - User endpoints: code generation, stats, wallet balance, transactions
   - Admin endpoints: overview, list referrals, user details, manual XP credit

3. **payment_xp_integration.py** - Updated payment flow
   - XP discount calculation
   - Payment order creation with XP tracking
   - Payment verification with referral rewards

4. **INTEGRATION_GUIDE.py** - Complete implementation guide
   - Step-by-step integration instructions
   - Code snippets for all updates
   - Database indexes
   - Testing checklist

## 🎁 Features

### For Users
- ✅ Unique referral code & link
- ✅ +15 days bonus when referred user pays
- ✅ Track referral stats (signups, paid users)
- ✅ XP wallet (1 XP = ₹1)
- ✅ Use XP as discount during checkout
- ✅ View XP transaction history

### For Referrers
- ✅ Earn 100 XP per successful referral payment
- ✅ Dashboard with earnings and referred users
- ✅ Shareable referral link

### For Admins
- ✅ View all referrals and statistics
- ✅ Track XP distribution
- ✅ View individual user referral performance
- ✅ Manually credit XP
- ✅ Audit trail for all XP transactions

## 🔒 Security Features

1. **XP Deduction Before Rewards** - Prevents exploitation
2. **Balance Validation** - Cannot use more XP than available
3. **Payment Verification** - Only successful payments trigger rewards
4. **Duplicate Prevention** - Referral rewards processed once
5. **Transaction Logging** - Complete audit trail

## 📊 Database Schema

### users collection (new fields)
```javascript
{
  xp_balance: Number (default: 0),
  xp_updated_at: ISODate,
  referral_code: String (unique),
  referred_by: String (user_id)
}
```

### referrals collection (new)
```javascript
{
  id: String,
  referrer_id: String,
  referred_user_id: String,
  status: "signed_up" | "paid",
  reward_applied: Boolean,
  xp_given: Boolean,
  payment_id: String,
  created_at: ISODate,
  processed_at: ISODate
}
```

### xp_transactions collection (new)
```javascript
{
  id: String,
  user_id: String,
  amount: Number,
  type: "credit" | "debit",
  reason: String,
  reference_id: String,
  created_at: ISODate
}
```

### payments collection (updated fields)
```javascript
{
  base_amount: Number,
  xp_used: Number,
  final_amount: Number,
  referral_bonus_days: Number
}
```

## 🚀 Implementation Steps

### Phase 1: Backend Setup (Required)
1. Add `referral_service.py` to backend
2. Add `referral_endpoints.py` to backend
3. Update `server.py`:
   - Import ReferralService
   - Initialize referral_service
   - Update UserRegister model
   - Update register endpoint
   - Add referral endpoints
4. Update `subscription_app.py`:
   - Update models (CreateOrderRequest, VerifyPaymentRequest)
   - Update create_razorpay_order function
   - Update create-order endpoint
   - Update verify-payment endpoint

### Phase 2: Frontend - User Dashboard (Next)
1. Create `Referral.js` page
2. Add to navigation/router
3. Implement components:
   - Referral code display with copy button
   - Stats cards (signups, paid, XP earned)
   - Referred users table
   - XP balance widget

### Phase 3: Frontend - Subscription Page (Next)
1. Update `Subscription.js`:
   - Fetch user XP balance
   - Add XP redemption input/slider
   - Calculate and display final price
   - Pass xp_amount to payment creation

### Phase 4: Frontend - Admin Panel (Next)
1. Create admin referral pages:
   - Referrals overview dashboard
   - Referrals list with filters
   - User referral details
   - XP transactions log
   - Manual XP credit form

## 📝 Next Steps

1. **Test the backend services** locally
2. **Create frontend UI components**
3. **Integrate payment flow** with XP
4. **Add admin dashboard sections**
5. **Deploy and test** end-to-end flow

## ⚠️ Critical Points

1. **Always deduct XP before applying rewards** to prevent exploits
2. **Validate XP balance** on both frontend and backend
3. **Log all XP transactions** for audit trail
4. **Prevent duplicate referral processing** using payment_id
5. **Handle edge cases**: ₹0 orders, insufficient XP, invalid codes

## 🧪 Testing Scenarios

- [ ] User A signs up with referral code from User B
- [ ] User A completes payment
- [ ] User A gets +15 days bonus
- [ ] User B gets +100 XP credit
- [ ] User B can use XP on next purchase
- [ ] XP cannot exceed balance
- [ ] Cannot create ₹0 orders
- [ ] Duplicate payment doesn't give double rewards
- [ ] Admin can view all referrals
- [ ] Admin can manually credit XP

## 🎨 UI Components Needed

### User Side
- Referral dashboard page
- XP balance widget (header/sidebar)
- XP redemption section in subscription page
- Referral code input in signup form

### Admin Side
- Referral analytics dashboard
- Referrals data table
- XP transactions log
- Manual XP credit form
- User referral details page

---

**Status**: Backend services complete, ready for frontend implementation
**Next**: Create user referral dashboard UI component
