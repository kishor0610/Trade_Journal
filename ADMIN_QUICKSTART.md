# Admin Panel - Quick Start Guide

## 🚀 Getting Started

### 1. Access the Admin Panel

Navigate to: **`http://localhost:3000/admin/login`**

**Default Credentials:**
- Email: `admin@tradeledger.com`
- Password: `TradeLedger@Admin2024`

### 2. Dashboard Overview

After login, you'll see:
- ✅ **Total Users**: Current user count with growth trend
- ✅ **Total Trades**: All trades across the platform
- ✅ **MT5 Accounts**: Active and expired account counts
- ✅ **Total P&L**: Combined profit/loss across all users
- 📊 **Charts**: User growth, trade volume, MT5 status
- 📡 **Activity Feed**: Recent user actions
- 🚨 **Alerts**: Critical issues requiring attention

### 3. Key Features at a Glance

#### 👥 User Management (`/admin/users`)
```
✓ Search users by email, name, or ID
✓ View complete user profiles with trade statistics
✓ Delete users (removes all associated data)
✓ Export user data to CSV
✓ Pagination (50 users per page)
```

#### 💻 MT5 Accounts (`/admin/mt5-accounts`)
```
✓ Monitor account status (Active/Expiring/Expired)
✓ Filter accounts by status
✓ View expiry countdown
✓ Identify accounts needing renewal
```

#### 🗄️ Database Explorer (`/admin/database`)
```
✓ Browse all collections (Users, Trades, MT5, Password Resets)
✓ Search within collection data
✓ View detailed records in JSON format
✓ Export any collection to CSV
```

#### 📋 Logs & Monitoring (`/admin/logs`)
```
✓ Filter by severity (Error, Warning, Info)
✓ Search logs by keyword
✓ View detailed error information
✓ Export logs for analysis
```

## 🎯 Common Admin Tasks

### Task 1: Find User with AI Insights Issue

```bash
1. Go to User Management
2. Search: "kishorshivaji.ks@gmail.com"
3. Click Actions → View Details
4. Check trade count and status
```

Or use API debugging:
```bash
GET /api/admin/debug/ai-insights/kishorshivaji.ks@gmail.com
```

### Task 2: Check Database Contents

```bash
1. Go to Database Explorer
2. Click on "Users" collection
3. View total count and sample data
4. Click "Export Users" for full data
```

Or use Python script:
```bash
python view_database.py
```

### Task 3: Monitor System Health

```bash
1. Go to Dashboard
2. Check alert cards for critical issues
3. Review activity feed for anomalies
4. Check Logs for errors
```

### Task 4: Export All Data

```bash
1. User List: Admin → Users → Export CSV
2. Full Database: python export_database.py
3. Specific User Trades:
   Database → Trades → Search by email → Export
```

### Task 5: Manage Expiring MT5 Accounts

```bash
1. Go to MT5 Accounts
2. Click "Expiring Soon" filter
3. View countdown badges (⚠️ 7 days or less)
4. Take action (extend/notify users)
```

## 📊 Statistics You Can Track

### User Metrics
- Total registered users
- Active users (with trades)
- Users with MT5 accounts
- User growth trends

### Trading Metrics
- Total trades (all users)
- Closed vs open trades
- Total P&L across platform
- Win rate distribution
- Trade volume trends

### MT5 Metrics
- Total connected accounts
- Active accounts
- Expiring soon (≤7 days)
- Expired accounts
- Account deployment status

### System Health
- Error rate (from logs)
- Recent activity volume
- Failed syncs
- API failures

## 🔧 Troubleshooting

### Issue: Can't Login to Admin Panel

**Solution:**
```bash
1. Check backend is running
2. Verify admin credentials in backend/.env
3. Try default: admin@tradeledger.com / TradeLedger@Admin2024
```

### Issue: Users Not Showing

**Solution:**
```bash
1. Go to Database Explorer
2. Check Users collection count
3. If 0, database is empty
4. Run: python create_all_accounts.py
```

### Issue: AI Insights Not Working

**Solution:**
```bash
1. Go to Settings (check GROQ_API_KEY set)
2. Or check user: /admin/debug/ai-insights/user@email.com
3. Review:
   - groq_configured: true/false
   - closed_trades: >0 required
```

### Issue: Charts Not Loading

 **Solution:**
```bash
1. Check browser console for errors
2. Verify recharts is installed: npm list recharts
3. Restart dev server: npm start
```

## 📱 Mobile Access

The admin panel is fully responsive:
- Sidebar collapses to hamburger menu
- Tables scroll horizontally
- Touch-friendly buttons
- Adaptive card layouts

## 🔒 Security Notes

1. **Authentication**: Admin token stored in `localStorage`
2. **Separate Auth**: Different from user authentication
3. **Protected Routes**: Auto-redirect if not authenticated
4. **Token Expiry**: 24 hours (configurable)

## 🚀 Performance Tips

1. **Use Pagination**: Don't load all users at once
2. **Filter Before Export**: Reduces file size
3. **Search Efficiently**: Use specific keywords
4. **Close Modals**: Frees up memory
5. **Refresh Selectively**: Don't spam refresh button

## 🎨 UI Components Reference

### Stat Card
```jsx
<StatCard
  icon={Users}
  label="Total Users"
  value="180"
  change="+12%"
  changeType="up"
  color="violet"
/>
```

### Status Badge
```jsx
<StatusBadge 
  status="DEPLOYED" 
  expiryDays={3} 
/>
// Shows: ⚠️ Expiring (3d)
```

### Activity Feed
Shows recent user actions:
- 🟢 Success (login, trade added)
- 🟡 Warning (account expiring)
- 🔴 Error (sync failed)
- 🔵 Info (data exported)

## 💡 Pro Tips

1. **Keyboard Shortcuts**: Press `/` to focus search
2. **Quick Filters**: Click stat cards to filter data
3. **Export Strategy**: Filter first, then export
4. **Monitor Alerts**: Check dashboard daily
5. **User Profiles**: Use modal for quick view
6. **Bulk Actions**: Select multiple users (coming soon)

## 📞 Need Help?

1. Check [ADMIN_PANEL.md](./ADMIN_PANEL.md) for full documentation
2. View backend logs: `/admin/logs`
3. Debug specific issues: Use debug endpoints
4. Check browser console for frontend errors

---

**Happy Administering! 🎉**
