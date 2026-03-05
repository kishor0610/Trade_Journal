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
- ✅ Enhanced analytics endpoints:
  - Summary with win rate, streaks, daily stats
  - By instrument breakdown
  - Monthly P&L data
  - Daily analytics for calendar view
  - Balance history for equity curve
  - Trade count history for sparkline
- ✅ MT5 account management (CRUD, sync placeholder)
- ✅ AI insights using OpenAI GPT-5.2 via Emergent LLM Key

### Frontend (React)
- ✅ Auth pages (Login, Register) with beautiful dark theme
- ✅ Enhanced Dashboard (TraderWaves-style):
  - Semi-circular gauge charts (Winrate, Daily Winrate)
  - Horizontal ratio bars (Avg Win/Loss, Day Win/Loss)
  - Trade count with sparkline
  - Winstreak section (Days & Trades)
  - Balance equity curve chart
  - Full calendar view with daily P&L and weekly totals
  - Time period selectors (1D, 1W, 1M, 6M, 1Y, All)
- ✅ Trade Journal page with:
  - Advanced form (SL/TP, commission, swap)
  - Search and filter functionality
  - Summary bar (Total P&L, Wins, Losses, Open)
- ✅ Accounts page for MT5 connection
- ✅ Analytics page with charts
- ✅ AI Insights page with GPT-5.2 analysis
- ✅ Mobile-responsive with bottom navigation
- ✅ Sidebar with "Coming Soon" items (Algos, Trade Copier)

### Technologies
- React 18 with Recharts for visualizations
- FastAPI with Motor (async MongoDB)
- Tailwind CSS + Shadcn UI components
- Framer Motion for animations
- MetaApi SDK installed for MT5 integration

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ User authentication
- ✅ Trade CRUD
- ✅ Dashboard with charts
- ✅ Mobile responsiveness

### P1 (High Priority) - DONE
- ✅ TraderWaves-style dashboard
- ✅ Calendar view
- ✅ MT5 account management
- ✅ AI insights

### P2 (Future Enhancements)
- [ ] Live MT5 sync via MetaApi (requires METAAPI_TOKEN)
- [ ] Algos section for automated trading rules
- [ ] Trade Copier functionality
- [ ] Export trades to CSV/PDF
- [ ] Advanced charting (candlestick patterns)
- [ ] Risk management calculator
- [ ] Trade notifications/alerts
- [ ] Multi-currency account support

## Next Tasks
1. Configure METAAPI_TOKEN for live MT5 synchronization
2. Implement Algos section for trading rules
3. Add Trade Copier functionality
4. Add trade export feature (CSV/PDF)
