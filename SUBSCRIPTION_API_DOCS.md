# TradeLedger Subscription System - API Documentation

## 🎯 Overview
Complete subscription system with Razorpay payments, user management, and automated trial assignment.

**Base URL:** `https://your-backend-url.run.app/api`
**Admin Base URL:** `https://your-backend-url.run.app/api/admin`

---

## 📋 Subscription Plans

| Plan ID | Price | Duration | Notes |
|---------|-------|----------|-------|
| `monthly` | ₹499 | 30 days | Monthly Plan |
| `quarterly` | ₹1399 | 90 days | Quarterly Plan |
| `yearly` | ₹2999 | 365 days | Yearly Plan (50% OFF) |

**Trial:** All new users get 7-day free trial automatically on registration.

---

## 🔒 Authentication
All endpoints require `Authorization: Bearer <token>` header except public endpoints.

Admin endpoints require `is_admin: true` in JWT token.

---

## 📡 USER SUBSCRIPTION APIs

### 1. Get Subscription Plans
```http
GET /api/subscriptions/plans
```
**Auth:** Not required  
**Response:**
```json
{
  "plans": [
    {
      "plan_id": "monthly",
      "name": "Monthly Plan",
      "price": 499,
      "duration_days": 30,
      "discount": null
    }
  ]
}
```

---

### 2. Get My Subscription Status
```http
GET /api/subscriptions/my-subscription
```
**Auth:** Required (user token)  
**Response:**
```json
{
  "user_id": "uuid",
  "subscription_status": "trial",
  "subscription_plan": null,
  "subscription_start_date": "2025-01-01T00:00:00+00:00",
  "subscription_end_date": "2025-01-08T00:00:00+00:00",
  "is_active": true
}
```

**Subscription Status Values:**
- `trial` - On free trial
- `active` - Paid subscription active
- `expired` - Subscription expired

---

### 3. Create Razorpay Order
```http
POST /api/subscriptions/create-order
```
**Auth:** Required  
**Body:**
```json
{
  "plan": "monthly"
}
```
**Response:**
```json
{
  "order_id": "order_ABC123",
  "amount": 499,
  "currency": "INR",
  "key_id": "rzp_live_SbulWKffNRpOcH"
}
```
**Use this response to initialize Razorpay checkout on frontend.**

---

### 4. Verify Payment & Activate Subscription
```http
POST /api/subscriptions/verify-payment
```
**Auth:** Required  
**Body:**
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_signature": "signature_hash",
  "plan": "monthly"
}
```
**Response:**
```json
{
  "message": "Payment verified and subscription activated",
  "subscription_end_date": "2025-02-28T00:00:00+00:00"
}
```
**Notes:**
- Signature verification ensures payment authenticity
- User subscription status updated automatically
- Confirmation email sent via Resend
- Payment record stored in `payments` collection

---

## 👨‍💼 ADMIN USER MANAGEMENT APIs

### 5. Activate User
```http
POST /api/admin/users/{user_id}/activate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "User activated successfully"
}
```
**Creates audit log entry.**

---

### 6. Deactivate User
```http
POST /api/admin/users/{user_id}/deactivate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "User deactivated successfully"
}
```
**Inactive users cannot log in.**

---

### 7. Send Email to User
```http
POST /api/admin/users/{user_id}/send-email
```
**Auth:** Admin required  
**Body:**
```json
{
  "subject": "Important Notice",
  "message": "<h1>Hello!</h1><p>Your message here...</p>"
}
```
**Response:**
```json
{
  "message": "Email sent successfully"
}
```
**Uses Resend API to send HTML emails.**

---

### 8. Reset User Password (Admin)
```http
POST /api/admin/users/{user_id}/reset-password
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "Password reset created",
  "reset_link": "https://tradeledger.com/reset-password?token=abc123..."
}
```
**Admin can send this link to user manually or via internal email system.**

---

## 💳 ADMIN SUBSCRIPTION MANAGEMENT APIs

### 9. Extend Subscription
```http
PATCH /api/admin/subscriptions/{user_id}/extend
```
**Auth:** Admin required  
**Body:**
```json
{
  "days": 30
}
```
**Response:**
```json
{
  "message": "Subscription extended by 30 days",
  "new_end_date": "2025-03-30T00:00:00+00:00"
}
```
**Adds days to current end date. Useful for customer support cases.**

---

### 10. Change User Plan
```http
PATCH /api/admin/subscriptions/{user_id}/change-plan
```
**Auth:** Admin required  
**Body:**
```json
{
  "plan": "yearly"
}
```
**Response:**
```json
{
  "message": "Plan changed to yearly",
  "new_end_date": "2026-01-28T00:00:00+00:00"
}
```
**Immediately applies new plan duration from current date.**

---

### 11. Activate Subscription (Admin)
```http
POST /api/admin/subscriptions/{user_id}/activate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "Subscription activated"
}
```
**Force-activate subscription (useful for manual renewals, VIP users, etc.)**

---

### 12. Deactivate Subscription (Admin)
```http
POST /api/admin/subscriptions/{user_id}/deactivate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "Subscription deactivated"
}
```
**Immediately expires subscription (user loses access to protected features).**

---

## 🔧 ADMIN MT5 MANAGEMENT APIs

### 13. Extend MT5 Account
```http
PATCH /api/admin/mt5/{account_id}/extend
```
**Auth:** Admin required  
**Body:**
```json
{
  "days": 90
}
```
**Response:**
```json
{
  "message": "MT5 account extended by 90 days"
}
```
**Extends MT5 account expiry date.**

---

### 14. Activate MT5 Account
```http
PATCH /api/admin/mt5/{account_id}/activate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "MT5 account activated"
}
```

---

### 15. Deactivate MT5 Account
```http
PATCH /api/admin/mt5/{account_id}/deactivate
```
**Auth:** Admin required  
**Response:**
```json
{
  "message": "MT5 account deactivated"
}
```

---

## 💰 REFUND API

### 16. Issue Refund
```http
POST /api/admin/payments/{payment_id}/refund
```
**Auth:** Admin required  
**Body:**
```json
{
  "payment_id": "pay_ABC123",
  "reason": "Customer requested refund"
}
```
**Response:**
```json
{
  "message": "Refund issued successfully",
  "refund_id": "rfnd_XYZ789"
}
```
**Actions:**
1. Issues full refund via Razorpay
2. Updates payment status to "refunded"
3. Expires user subscription
4. Creates audit log

**Notes:** Razorpay processes refunds within 5-7 business days.

---

## 📊 SUBSCRIPTION STATUS FLOW

```
New User Registration
  ↓
7-Day Trial (auto-assigned)
  ↓
Trial Expires → User must purchase plan
  ↓
Payment → Razorpay Order Created
  ↓
Payment Success → Signature Verified
  ↓
Subscription Activated
  ↓
Auto-Expiry Check (Daily at 00:00 UTC)
  ↓
If expired → Status = "expired"
```

---

## 🛡️ FEATURE LOCK SYSTEM

Protected endpoints require active subscription:
- `/api/trades` - Trade operations
- `/api/mt5` - MT5 account management
- `/api/analytics` - Analytics data
- `/api/ai/insights` - AI insights
- `/api/forex-calendar` - Forex calendar

**Blocked Response (403):**
```json
{
  "detail": "Active subscription required to access this feature"
}
```

---

## 🤖 AUTO-EXPIRY CRON JOB

**Schedule:** Daily at 00:00 UTC  
**Function:** `expire_subscriptions()`  
**Action:**
- Finds all users with `subscription_end_date < now()`
- Updates `subscription_status` to `"expired"`
- Logs count of expired subscriptions

**Logs:**
```
INFO: Expired 3 subscriptions
```

---

## 📧 EMAIL NOTIFICATIONS

**Subscription Activation Email:**
- Sent automatically after successful payment verification
- Contains plan details, amount, expiry date
- Template: HTML with TradeLedger branding

**Triggered on:**
- Payment verification success (`verify-payment` endpoint)

**Email Service:** Resend API

---

## 🗃️ DATABASE SCHEMA UPDATES

### `users` Collection
```javascript
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "subscription_status": "trial",  // NEW
  "subscription_plan": "monthly",  // NEW
  "subscription_start_date": "2025-01-01T00:00:00Z",  // NEW
  "subscription_end_date": "2025-01-31T00:00:00Z",  // NEW
  "role": "user",  // NEW
  "status": "active",  // NEW
  "last_status_change": "2025-01-01T00:00:00Z"  // NEW
}
```

### `payments` Collection (NEW)
```javascript
{
  "id": "uuid",
  "user_id": "user_uuid",
  "amount": 499.0,
  "plan": "monthly",
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_signature": "signature_hash",
  "status": "success",  // or "refunded"
  "refund_id": "rfnd_ABC123",  // if refunded
  "created_at": "2025-01-28T00:00:00Z"
}
```

### `audit_logs` Collection (NEW)
```javascript
{
  "id": "uuid",
  "admin_id": "admin_uuid",
  "action": "user_activated",
  "target_user_id": "user_uuid",
  "details": {"key": "value"},
  "timestamp": "2025-01-28T10:30:00Z"
}
```

---

## 🧪 TESTING GUIDE

### Test Payment Flow
1. Create order: `POST /subscriptions/create-order`
2. Use Razorpay test cards:
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
3. Verify payment: `POST /subscriptions/verify-payment`

### Test Admin Actions
1. Login as admin: `POST /admin/auth/login`
2. Get users: `GET /admin/users`
3. Activate user: `POST /admin/users/{id}/activate`
4. Extend subscription: `PATCH /admin/subscriptions/{id}/extend`

### Test Auto-Expiry
- Manually set `subscription_end_date` to past date
- Run cron job or wait for midnight UTC
- Verify status changed to "expired"

---

## 🚀 DEPLOYMENT CHECKLIST

✅ **Backend Deployed:** Cloud Run (asia-south1)  
✅ **Environment Variables:**
- `RAZORPAY_KEY_ID=rzp_live_SbulWKffNRpOcH`
- `RAZORPAY_KEY_SECRET=qH9cd3igG2Z7B8SV5oPItEII`
- `RESEND_API_KEY=re_xxx` (for emails)
- `FRONTEND_URL=https://tradeledger.com`

✅ **Dependencies Installed:**
- `razorpay==1.4.2`
- `APScheduler==3.10.4`

✅ **Cron Job Active:** ✅ (starts on server boot)

---

## 🔐 SECURITY NOTES

1. **Razorpay Signature Verification:** All payments verified with HMAC signature
2. **Admin-Only Endpoints:** Protected by JWT `is_admin` flag check
3. **Audit Logging:** All admin actions logged with timestamps
4. **Payment Records:** Immutable payment history in database
5. **Refund Protection:** Full refund logs + subscription deactivation

---

## 📞 SUPPORT

**Admin Panel:** https://tradeledgeradmin.netlify.app  
**Backend API:** https://your-backend-url.run.app  
**Razorpay Dashboard:** https://dashboard.razorpay.com

---

## 🎉 WHAT'S IMPLEMENTED

✅ 7-day trial auto-assignment  
✅ Razorpay payment gateway (live mode)  
✅ Payment verification with signature check  
✅ User management (activate, deactivate, email, reset password)  
✅ Subscription management (extend, change plan, activate, deactivate)  
✅ MT5 account management (extend, activate, deactivate)  
✅ Refund system with Razorpay integration  
✅ Auto-expiry cron job (daily at midnight)  
✅ Audit logging for all admin actions  
✅ Email notifications (subscription activation)  
✅ Feature lock middleware for protected routes  

**Total:** 16 new API endpoints + auto-expiry system
