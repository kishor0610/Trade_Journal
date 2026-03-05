# TradeLedger - Trading Journal Application PRD

## Original Problem Statement
Build a trading journal application which should be mobile friendly and a web app, with trading journal entries (long/short positions), instruments (XAU/USD, BTC, ETH, Silver, Forex, Stocks), P&L visualization (bar charts, pie charts), login/auth, database integration, and TraderWaves-style enhanced dashboard with gauge charts, calendar view, winstreaks, balance curve, and MT5 integration.

## User Personas
1. **Active Day Trader** - Needs quick trade entry, real-time P&L tracking, daily analytics
2. **Swing Trader** - Focuses on longer-term trades, wants calendar view, monthly analytics
3. **Algorithmic Trader** - Needs MT5 integration for auto-importing trades
4. **Admin** - Monitors all users, platform stats, and user activity

## Core Requirements (Static)
- JWT-based authentication (email/password)
- Trade journal CRUD operations
- Multi-instrument support (Forex, Crypto, Commodities, Indices)
- P&L calculation and visualization
- Mobile-responsive design
- MongoDB database integration
- AI-powered trade analysis (OpenAI GPT-5.2)

## What's Been Implemented (March 5, 2026)

### Backend (FastAPI)
- ✅ User authentication (register, login, JWT tokens)
- ✅ **Forgot Password** - Send reset link to email
- ✅ **Reset Password** - Token-based password reset
- ✅ **Admin Dashboard API** - Stats, users list, user details, activity
- ✅ Trade CRUD with full fields (SL/TP, commission, swap)
- ✅ Enhanced analytics endpoints
- ✅ MT5 account management (MetaApi ready)
- ✅ AI insights using OpenAI GPT-5.2
- ✅ Export to CSV/XLSX functionality
- ✅ **CSV Import** - Bulk import trades from broker CSV files (Exness/MT5)

### Frontend (React)
- ✅ Custom app icon
- ✅ Clean TradeLedger branding
- ✅ **Forgot Password page** with email input
- ✅ **Reset Password page** with token validation
- ✅ **Admin Login** at `/admin`
- ✅ **Admin Dashboard** at `/admin/dashboard` with:
  - Total users, trades, P&L, MT5 accounts stats
  - All users list with search
  - User details with trading stats
  - Recent activity panel
- ✅ TraderWaves-style Dashboard with gauge charts, ratio bars, winstreaks
- ✅ Calendar view with weekly summary sidebar
- ✅ Export buttons for CSV/XLSX downloads
- ✅ **Import dialog** for CSV file upload
- ✅ Trade Journal with advanced form
- ✅ Accounts page for MT5 connection
- ✅ Mobile-responsive with bottom navigation

### CSV Import Feature (New - March 5, 2026)
- **Endpoint**: `POST /api/trades/import-csv`
- **Supported Format**: Exness/MT5 CSV export
- **Columns Parsed**:
  - `ticket` → Used for duplicate prevention
  - `symbol` → Normalized (XAUUSDm → XAU/USD)
  - `type` → buy/sell positions
  - `lots` → Position size
  - `opening_price`, `closing_price` → Entry/Exit prices
  - `opening_time_utc`, `closing_time_utc` → Dates
  - `profit_usd` → P&L (used directly from CSV)
  - `stop_loss`, `take_profit`, `commission_usd`, `swap_usd`
- **Features**:
  - Duplicate prevention via ticket number
  - Bulk import (585+ trades in seconds)
  - Error handling with detailed feedback

### Data Storage
- **Database**: MongoDB running locally on the server
- **Location**: `/data/db/` on the server
- **Collections**: `users`, `trades`, `mt5_accounts`, `password_resets`
- All user data is isolated by `user_id`

### Admin Access
- **Email**: admin@tradeledger.com
- **Password**: TradeLedger@Admin2024
- **URL**: /admin

### MT5 Integration
- MetaApi SDK installed and configured
- To enable live sync: Add METAAPI_TOKEN to backend .env
- Get free token at: https://metaapi.cloud

### Email Service (for password reset)
- Resend SDK installed and configured
- RESEND_API_KEY already in backend/.env

## Prioritized Backlog

### P0 - DONE
- ✅ User authentication
- ✅ Trade CRUD
- ✅ Dashboard with charts
- ✅ Export functionality
- ✅ CSV Import

### P1 - DONE
- ✅ TraderWaves-style dashboard
- ✅ Calendar with weekly summary
- ✅ Admin Dashboard
- ✅ Forgot Password

### P2 (Future)
- [ ] Live MT5 sync via MetaApi
- [ ] Email notifications
- [ ] Algos section
- [ ] Trade Copier
- [ ] Database query optimization (pagination, field projections)

## Deployment Status
- ✅ Application ready for deployment
- ⚠️ Performance warnings: Some database queries need optimization for scale
- App URL: https://trade-ledger-18.preview.emergentagent.com
