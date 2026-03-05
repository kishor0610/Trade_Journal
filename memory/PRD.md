# TradeLedger - Trading Journal Application PRD

## Original Problem Statement
Build a trading journal application which should be mobile friendly and a web app, with trading journal entries (long/short positions), instruments (XAU/USD, BTC, ETH, Silver, Forex, Stocks), P&L visualization (bar charts, pie charts), login/auth, database integration, and TraderWaves-style enhanced dashboard with gauge charts, calendar view, winstreaks, balance curve, and MT5 integration.

## User Personas
1. **Active Day Trader** - Needs quick trade entry, real-time P&L tracking, daily analytics
2. **Swing Trader** - Focuses on longer-term trades, wants calendar view, monthly analytics
3. **Algorithmic Trader** - Needs MT5 integration for auto-importing trades

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
- ✅ Trade CRUD with full fields (SL/TP, commission, swap)
- ✅ Enhanced analytics endpoints
- ✅ MT5 account management
- ✅ AI insights using OpenAI GPT-5.2
- ✅ Export to CSV/XLSX functionality

### Frontend (React)
- ✅ Custom app icon
- ✅ Clean TradeLedger branding (no v2.0)
- ✅ TraderWaves-style Dashboard with gauge charts, ratio bars, winstreaks
- ✅ Calendar view with weekly summary sidebar
- ✅ Export buttons for CSV/XLSX downloads
- ✅ Trade Journal with advanced form
- ✅ Accounts page for MT5 connection
- ✅ Mobile-responsive with bottom navigation

### Data Storage
- **Database**: MongoDB running locally on the server
- **Location**: `/data/db/` on the server
- **Collections**: `users`, `trades`, `mt5_accounts`
- All user data is isolated by `user_id`

### MT5 Integration Ready
- MetaApi SDK installed
- Server: Exness-MT5Real24
- Login: 170709804
- Configure METAAPI_TOKEN to enable live sync

## Admin Access Notes
Currently, the app uses individual user authentication. Each user only sees their own data.
For admin monitoring, you can:
1. Access MongoDB directly via command line: `mongosh test_database`
2. View all users: `db.users.find()`
3. View all trades: `db.trades.find()`

## Prioritized Backlog

### P0 - DONE
- ✅ User authentication
- ✅ Trade CRUD
- ✅ Dashboard with charts
- ✅ Export functionality

### P1 - DONE
- ✅ TraderWaves-style dashboard
- ✅ Calendar with weekly summary
- ✅ Custom branding

### P2 (Future)
- [ ] Admin dashboard panel
- [ ] Live MT5 sync via MetaApi
- [ ] Algos section
- [ ] Trade Copier

## Next Tasks
1. Deploy the application
2. Configure METAAPI_TOKEN for MT5 sync
3. Consider adding admin dashboard for monitoring
