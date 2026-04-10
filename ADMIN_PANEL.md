# Admin Panel Documentation

## Overview

A comprehensive, production-grade Admin Panel for managing the Trade Journal application. Built with React, Tailwind CSS, and modern UI components.

## Features

### 1. **Dashboard (Overview)**
- **Path**: `/admin`
- **Features**:
  - Live system statistics (users, trades, MT5 accounts, P&L)
  - User growth charts
  - Trade volume analytics
  - MT5 account status breakdown (Active/Expiring/Expired)
  - Recent activity feed
  - Critical alerts

### 2. **User Management**
- **Path**: `/admin/users`
- **Features**:
  - Comprehensive user table with statistics
  - Search and filter users
  - View detailed user profiles
  - User actions:
    - View details
    - Send email
    - Reset password
    - Activate/Deactivate
    - Delete user (with all associated data)
  - Export users to CSV
  - Pagination support (50 users per page)
  - Real-time statistics:
    - Total users
    - Active users (with trades)
    - Users with MT5 accounts
    - Total trades across all users

### 3. **MT5 Account Management**
- **Path**: `/admin/mt5-accounts`
- **Features**:
  - Monitor all MetaTrader 5 accounts
  - Status tracking (Active, Expiring, Expired, Inactive)
  - Expiry countdown badges
  - Filter by status
  - Search by account name, ID, or user email
  - Account details:
    - Server information
    - Account ID
    - Deployment state
    - Last sync time
    - Expiry date with countdown
  - Actions: View, Refresh sync, Delete

### 4. **Database Explorer**
- **Path**: `/admin/database`
- **Features**:
  - Browse all database collections
  - Collections:
    - Users
    - Trades
    - MT5 Accounts
    - Password Resets
  - Database summary statistics
  - Search within collections
  - Expandable record viewer
  - Export any collection to CSV
  - JSON data viewer with collapsible details

### 5. **Support Tickets**
- **Path**: `/admin/tickets`
- **Status**: Placeholder (Ready for implementation)
- **Planned Features**:
  - Ticket management system
  - Priority levels
  - Status tracking (Open, In Progress, Resolved)
  - User ticket history
  - Internal notes

### 6. **Logs & Monitoring**
- **Path**: `/admin/logs`
- **Features**:
  - System log viewer
  - Filter by severity (Error, Warning, Info, Success)
  - Search logs
  - Color-coded log levels
  - Expandable log details
  - Real-time log statistics
  - Export logs

### 7. **Payments & Subscriptions**
- **Path**: `/admin/payments`
- **Status**: Placeholder (Ready for implementation)
- **Planned Features**:
  - Payment history
  - Subscription management
  - Revenue tracking
  - Failed transaction monitoring
  - Refund handling

### 8. **Settings**
- **Path**: `/admin/settings`
- **Features**:
  - General application settings
  - Feature flags
  - System configuration
  - Email settings
  - Maintenance mode toggle

## Navigation

### Sidebar
- **Dashboard**: Overview and statistics
- **User Management**: Manage all users
- **MT5 Accounts**: Monitor MT5 accounts
- **Database Explorer**: Browse database
- **Support Tickets**: Ticket management
- **Logs & Monitoring**: System logs
- **Payments**: Billing management
- **Settings**: System configuration

### Top Header
- Global search (users, trades, logs)
- Notifications bell (with badge)
- Admin profile dropdown
- Quick actions

## API Endpoints Used

### Admin Authentication
- `POST /api/admin/login` - Admin login

### Dashboard
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/activity?limit=20` - Get recent activity

### User Management
- `GET /api/admin/database/users/all?limit=50&skip=0` - List all users with stats
- `GET /api/admin/users/{user_id}` - Get user details
- `DELETE /api/admin/users/{user_id}` - Delete user

### Database
- `GET /api/admin/database/overview` - Database overview
- `GET /api/admin/database/users/all` - All users
- `GET /api/admin/database/trades/all?user_email=email` - All trades (with filter)

### Exports
- `GET /api/admin/export/trades` - Export all trades as CSV

### Debugging
- `GET /api/admin/debug/ai-insights/{user_email}` - Debug AI insights for user

## Authentication

Admin access requires a separate admin token stored in `localStorage`:
```javascript
localStorage.setItem('adminToken', token);
```

The admin panel checks for this token on mount and redirects to `/admin/login` if not present.

## Design System

### Colors
- **Violet** (`from-violet-500`): Primary accent, Dashboard
- **Emerald** (`from-emerald-500`): Success states, Active accounts
- **Amber** (`from-amber-500`): Warning states, Expiring accounts
- **Red** (`from-red-500`): Error states, Expired accounts
- **Cyan** (`from-cyan-500`): Info states, MT5 accounts

### Components
- **StatCard**: Metric display with icon, value, change indicator
- **Glass Card**: Frosted glass effect card with border
- **Status Badge**: Color-coded status indicators
- **Activity Feed**: Real-time activity stream
- **Alert Card**: Critical alerts display

### Responsiveness
- Mobile-first design
- Collapsible sidebar on mobile
- Responsive tables and grids
- Touch-friendly interactions
- Adaptive layouts for all screen sizes

## Usage

### Starting the Admin Panel

1. Navigate to `/admin/login`
2. Enter admin credentials:
   - Email: `admin@tradeledger.com`
   - Password: `TradeLedger@Admin2024`
3. Access granted to `/admin`

### Common Tasks

#### View User Details
1. Go to **User Management**
2. Search or browse users
3. Click **Actions** (⋮) → **View Details**
4. Modal shows complete user information

#### Export Database
1. Go to **Database Explorer**
2. Select a collection (Users, Trades, etc.)
3. Click **Export** button
4. CSV file downloads automatically

#### Monitor MT5 Accounts
1. Go to **MT5 Account Management**
2. Use filter buttons (All, Active, Expiring, Expired)
3. View expiry countdown badges
4. Take action on expiring accounts

#### Check System Logs
1. Go to **Logs & Monitoring**
2. Filter by level (Error, Warning, Info)
3. Search for specific logs
4. Expand details for full information

## Technical Stack

### Frontend
- **React 19** - UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Accessible UI components
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Axios** - HTTP client
- **Sonner** - Toast notifications

### Backend Integration
- FastAPI REST API
- JWT authentication
- MongoDB database
- Admin-only endpoints

## File Structure

```
frontend/src/pages/admin/
├── AdminPanel.js          # Main layout with sidebar
├── AdminDashboard.js      # Dashboard with stats and charts
├── AdminUsers.js          # User management table
├── AdminMT5Accounts.js    # MT5 account monitoring
├── AdminDatabase.js       # Database explorer
├── AdminTickets.js        # Support tickets (placeholder)
├── AdminLogs.js           # Logs and monitoring
├── AdminPayments.js       # Payments (placeholder)
└── AdminSettings.js       # System settings
```

## Security

- Separate admin authentication
- Protected routes
- Role-based access (ready for implementation)
- Secure token storage
- Admin action logging (planned)

## Future Enhancements

1. **Ticket System**: Full support ticket management
2. **Payment Integration**: Stripe/PayPal integration
3. **Advanced Analytics**: More charts and insights
4. **Real-time Updates**: WebSocket integration
5. **Audit Logs**: Track all admin actions
6. **Bulk Actions**: Bulk user/account operations
7. **Email Templates**: Customizable email notifications
8. **Role Management**: Multi-level admin roles
9. **API Key Management**: Generate API keys for users
10. **Backup/Restore**: Database backup functionality

## Performance

- Lazy loading of components
- Pagination for large datasets
- Optimized bundle size
- Efficient re-renders
- Debounced search
- Cached API responses (where appropriate)

## Support

For issues or questions:
- Check backend logs: `/api/admin/logs`
- Debug specific users: `/api/admin/debug/ai-insights/{email}`
- Monitor system health: Dashboard statistics

---

**Version**: 1.0.0  
**Last Updated**: April 10, 2026  
**Author**: TradeLedger Admin Team
