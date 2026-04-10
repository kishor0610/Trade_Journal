# TradeJournal Subscription System - Implementation Plan

## Overview
Transform admin panel from UI-only to fully functional with subscription-based access control.

## Phase 1: Database Schema Updates (30 min)
### Users Collection - Add Fields:
```javascript
{
  // Existing fields...
  role: "user" | "admin",  // NEW
  status: "active" | "inactive",  // NEW
  subscription_status: "active" | "expired" | "trial",  // NEW
  subscription_plan: "monthly" | "quarterly" | "yearly" | null,  // NEW
  subscription_start_date: ISODate,  // NEW
  subscription_end_date: ISODate,  // NEW
  subscription_auto_renew: boolean,  // NEW
  created_by: "self" | "admin",  // NEW
  last_status_change: ISODate  // NEW
}
```

### Payments Collection - NEW:
```javascript
{
  id: "pay_xxx",
  user_id: "user_xxx",
  amount: 499,
  plan: "monthly",
  razorpay_order_id: "order_xxx",
  razorpay_payment_id: "pay_xxx",
  razorpay_signature: "sig_xxx",
  status: "success" | "failed" | "pending",
  created_at: ISODate
}
```

### Audit Logs Collection - NEW:
```javascript
{
  id: "log_xxx",
  admin_id: "admin_xxx",
  action: "user_activated" | "user_deactivated" | "subscription_extended",
  target_user_id: "user_xxx",
  details: {...},
  timestamp: ISODate
}
```

---

## Phase 2: Backend APIs (2-3 hours)

### 2.1 User Management APIs
```python
# Admin only
POST   /api/admin/users/:id/activate
POST   /api/admin/users/:id/deactivate
POST   /api/admin/users/:id/send-email
POST   /api/admin/users/:id/reset-password
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

### 2.2 MT5 Management APIs
```python
GET    /api/admin/mt5
GET    /api/admin/mt5/:id
PATCH  /api/admin/mt5/:id/extend
PATCH  /api/admin/mt5/:id/activate  
PATCH  /api/admin/mt5/:id/deactivate
```

### 2.3 Subscription Management APIs
```python
# Admin
GET    /api/admin/subscriptions
PATCH  /api/admin/subscriptions/:userId/extend
PATCH  /api/admin/subscriptions/:userId/change-plan
POST   /api/admin/subscriptions/:userId/activate
POST   /api/admin/subscriptions/:userId/deactivate

# User
GET    /api/subscriptions/plans
GET    /api/subscriptions/my-subscription
POST   /api/subscriptions/create-order
POST   /api/subscriptions/verify-payment
```

### 2.4 Feature Lock Middleware
```python
async def require_active_subscription(user: dict):
    if user.get('subscription_status') != 'active':
        raise HTTPException(403, "Active subscription required")
    if user.get('subscription_end_date') < datetime.now():
        raise HTTPException(403, "Subscription expired")
```

---

## Phase 3: Razorpay Integration (1 hour)

### Environment Variables:
```
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

### Flow:
1. User clicks "Upgrade Plan"
2. POST /api/subscriptions/create-order
   - Create Razorpay order
   - Store order_id in DB
3. Frontend opens Razorpay checkout
4. On success callback:
   - POST /api/subscriptions/verify-payment
   - Verify signature
   - If valid:
     - Create payment record
     - Update user subscription
     - Set subscription_end_date

---

## Phase 4: Frontend Admin Actions (2 hours)

### AdminUsers.js Updates:
- Wire up all dropdown actions to API calls
- Add confirmation dialogs
- Show success/error toasts
- Refresh data after actions

### AdminMT5Accounts.js Updates:
- Add "Extend" button with date picker
- Add "Activate/Deactivate" toggles
- Show expiry countdown
- Color-code status badges

###AdminDashboard.js Updates:
- Add "Expiring Soon" widget
- Show active vs expired counts
- Add revenue summary card

---

## Phase 5: Frontend User Restrictions (2 hours)

### Create SubscriptionGuard.jsx:
```jsx
const SubscriptionGuard = ({ children, feature }) => {
  const { user } = useAuth();
  
  if (user.subscription_status !== 'active') {
    return <LockedFeature feature={feature} />;
  }
  
  return children;
};
```

### Apply to all pages:
- Journal
- Accounts
- Analytics
- AI Insights
- Risk Calculator
- Forex Calendar

### LockedFeature.jsx:
- Blur background
- Show lock icon
- "Upgrade to access" button
- Link to pricing

---

## Phase 6: Subscription UI (1-2 hours)

### Create pages/Pricing.js:
- Show 3 plans (Monthly, Quarterly, Yearly)
- Highlight Yearly with "50% OFF" badge
- "Choose Plan" buttons
- Open Razorpay on click

### Create components/SubscriptionStatus.jsx:
- Show current plan
- Days remaining
- "Upgrade" or "Renew" button
- Auto-renewal toggle

---

## Phase 7: Auto-Expiry System (30 min)

### Backend cron job:
```python
@app.on_event("startup")
async def schedule_expiry_check():
    # Run daily at midnight
    async def check_expired_subscriptions():
        expired_users = await db.users.find({
            "subscription_end_date": {"$lt": datetime.now()},
            "subscription_status": "active"
        }).to_list(None)
        
        for user in expired_users:
            await db.users.update_one(
                {"id": user['id']},
                {"$set": {
                    "subscription_status": "expired",
                    "last_status_change": datetime.now()
                }}
            )
```

---

## Phase 8: Security & Role Control (30 min)

### Add role check to admin endpoints:
```python
async def require_admin(credentials: HTTPAuthorizationCredentials):
    user = await get_current_user(credentials)
    if user.get('role') != 'admin':
        raise HTTPException(403, "Admin access required")
```

### Protect sensitive operations:
- Delete user
- Change subscription
- Access payments
- View all user data

---

## Phase 9: Testing & Deployment (1 hour)

### Test scenarios:
1. New user signup → trial status
2. User purchases plan → active
3. Subscription expires → locked features
4. Admin extends subscription → access restored
5. Admin deactivates user → all access blocked
6. MT5 account expires → status updated

---

## Implementation Order:

1. ✅ Database schema (migrate existing users)
2. ✅ Backend user management APIs
3. ✅ Backend subscription APIs
4. ✅ Razorpay integration
5. ✅ Feature lock middleware
6. ✅ Frontend admin actions
7. ✅ Frontend user restrictions
8. ✅ Subscription UI & pricing
9. ✅ Auto-expiry cron
10. ✅ Testing & fixes

---

## Estimated Time: 10-12 hours total

## Questions Before I Start:

1. **Razorpay Account**: Do you have Razorpay test/live credentials?
2. **Trial Period**: Should new users get a free trial? (e.g., 7 days)
3. **Email Service**: Use Resend for subscription emails?
4. **Grandfathering**: Should existing users get free lifetime access?
5. **Refund Policy**: Should admins be able to issue refunds?

**Should I proceed with full implementation? Reply "yes" to start, or let me know if you want to adjust anything first.**
