# Folyo - Project Context Documentation

**Last Updated:** 2025-01-22
**Status:** Active Development
**Version:** 1.0
**Total Lines of Code:** ~5,000

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [Code Architecture](#code-architecture)
6. [API Integration](#api-integration)
7. [Theme System](#theme-system)
8. [Authentication System](#authentication-system)
9. [Chart & Visualization](#chart--visualization)
10. [Configuration](#configuration)
11. [Important Technical Details](#important-technical-details)
12. [Known Limitations](#known-limitations)
13. [Future Enhancements](#future-enhancements)
14. [Development Guidelines](#development-guidelines)

---

## 🎯 Project Overview

**Folyo** is an independent cryptocurrency market tracker built with vanilla JavaScript, HTML, CSS, and PHP. It provides real-time cryptocurrency prices, charts, market data, and statistics.

### Key Points
- **NOT a clone** - CoinMarketCap was used only as design inspiration
- **Independent project** - Uses Startup API plan with commercial rights
- **No CMC mentions** - All branding is Folyo
- **Production-ready** - Fully functional with 93+ currency support

### Live URLs
- Home page: `index.html`
- Currency detail: `currency/?slug=bitcoin`

---

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - CSS Variables for theming, Flexbox/Grid
- **JavaScript ES6+** - Vanilla JS (no frameworks)
- **Google Fonts** - Inter font family

### Backend
- **PHP 7+** - API proxy to handle CORS
- **Cryptocurrency API** - v1/v2/v3 endpoints
- **Environment Variables** - `.env` for API key storage

### Storage
- **LocalStorage** - Theme preference, currency selection

### External APIs
- Cryptocurrency Data API (Startup plan)
- Alternative.me (Fear & Greed Index)

---

## 📁 Project Structure

```
folyo/
├── index.html                      # Main listing page
├── currency/
│   └── index.html                  # Cryptocurrency detail page
├── README.md                       # Project README
├── PROJECT_CONTEXT.md             # This file (context documentation)
├── .env                           # API key (gitignored)
├── .gitignore                     # Git ignore rules
│
├── api/
│   └── proxy.php                  # PHP proxy for API requests (handles CORS)
│
├── css/
│   ├── themes.css                 # Theme variables (light/dark)
│   ├── style.css                  # Main styles
│   ├── responsive.css             # Media queries
│   ├── modal.css                  # Login/signup modal styles
│   └── currency-detail.css        # Currency detail page styles
│
├── js/
│   ├── config.js                  # Configuration constants
│   ├── api.js                     # API communication layer
│   ├── utils.js                   # Utility functions
│   ├── theme.js                   # Theme manager
│   ├── currency.js                # Currency manager
│   ├── ui.js                      # Main listing UI
│   ├── app.js                     # Main app initialization
│   ├── auth.js                    # Authentication modals
│   ├── chart.js                   # Price chart rendering
│   └── currency-detail.js         # Currency detail page logic
│
└── apicontent/                    # API documentation (local reference)
```

---

## ✨ Core Features

### Home Page (index.html)
1. **Cryptocurrency Listing**
   - Top 100 cryptocurrencies by market cap
   - 10 columns: Rank, Name, Price, 1h%, 24h%, 7d%, Market Cap, Volume 24h, Circulating Supply, Last 7 Days
   - Sortable columns (click headers)
   - Real-time data updates (60s auto-refresh)

2. **Global Statistics**
   - Total Market Cap
   - 24h Volume
   - BTC Dominance
   - ETH Dominance
   - Fear & Greed Index (from Alternative.me)

3. **Search & Filter**
   - Real-time search by name or symbol
   - Debounced (300ms) to prevent excessive searches
   - Case-insensitive

4. **Pagination**
   - 100 items per page
   - Previous/Next navigation
   - Auto-scroll to top on page change

5. **Sparkline Charts**
   - Last 7 days price history (84 data points)
   - Mini canvas-based charts in each row
   - Using 2-hour intervals for precision
   - Real OHLCV data from API

6. **Currency Selector**
   - 93+ supported currencies
   - Persistent selection (LocalStorage)
   - Auto-refresh on currency change

7. **Theme Toggle**
   - Light/Dark theme
   - Persistent preference (LocalStorage)
   - Smooth transitions

8. **Authentication UI**
   - Login/Signup buttons in header
   - Modal-based forms (frontend only for now)
   - Email + password fields
   - Form validation

9. **Responsive Design**
   - Desktop: Full 10-column table
   - Tablet: 7-column table
   - Mobile: Card-based layout

### Currency Detail Page (currency/index.html)
1. **Cryptocurrency Header**
   - Logo, name, symbol, rank
   - Current price (full precision)
   - Price changes (1h, 24h, 7d) with color indicators

2. **Statistics Grid**
   - Market Cap + Rank
   - 24h Volume
   - Circulating Supply
   - Total Supply
   - Max Supply
   - Fully Diluted Valuation (FDV)

3. **Interactive Price Chart**
   - HTML5 Canvas-based rendering
   - Multiple time periods:
     - 24H: 24 data points (hourly)
     - 7D: 84 data points (2-hour intervals)
     - 30D: 120 data points (6-hour intervals)
     - 90D, 1Y, ALL: Disabled (requires plan upgrade)
   - Features:
     - Interactive tooltips on hover
     - Green/red color based on price movement
     - Smooth curves (quadratic bezier)
     - Responsive canvas sizing
     - Auto-retry on dimension issues

4. **Information Tabs**
   - **Overview**: Website, explorers, community, tags, platform, date added
   - **About**: Full cryptocurrency description
   - **Links**: Organized by category (website, explorers, social, source code, community, chat)

5. **Navigation**
   - Breadcrumb navigation
   - Clickable rows/cards from home page
   - Back to home functionality

6. **Auto-refresh**
   - Quotes refresh every 60 seconds
   - Pauses when tab is inactive (battery saving)
   - Resumes on tab activation

---

## 🏗️ Code Architecture

### Module Relationships

```
index.html
    ├── config.js           (Constants, API URLs, currency symbols)
    ├── utils.js            (Formatting, time calculations)
    ├── api.js              (API communication)
    ├── currency.js         (Currency manager)
    ├── theme.js            (Theme manager)
    ├── auth.js             (Auth modal manager)
    ├── ui.js               (Main UI rendering)
    └── app.js              (App initialization & orchestration)

currency/index.html
    ├── config.js
    ├── utils.js
    ├── api.js
    ├── currency.js
    ├── theme.js
    ├── chart.js            (Canvas chart rendering)
    └── currency-detail.js  (Detail page logic)
```

### Key Modules Explained

#### 1. **config.js**
- Global configuration object
- API base URL
- Currency symbols mapping (93+ currencies)
- Fear & Greed Index levels
- Logo URL template
- LocalStorage keys

#### 2. **api.js**
- Encapsulates all API communication
- Methods:
  - `getCryptoListings(start, limit, convert)` - Get top cryptocurrencies
  - `getGlobalMetrics(convert)` - Get market overview
  - `getFearGreedIndex()` - Get fear & greed from Alternative.me
  - `getCryptoInfo(identifier, type)` - Get crypto metadata
  - `getCryptoQuotes(identifier, type, convert)` - Get current prices
  - `getOHLCVHistorical(ids, count, convert, interval, timePeriod)` - Get historical OHLCV data
  - `fetchAllData(start, limit, currency)` - Parallel fetch all home page data
- Error handling and logging
- Returns promises

#### 3. **utils.js**
- Utility functions for formatting
- Methods:
  - `formatNumber(num, decimals)` - General number formatting
  - `formatPrice(price, currency)` - Smart price formatting (handles small/large values)
  - `formatFullNumber(num)` - Full number with commas (no abbreviation)
  - `formatSupply(supply, symbol)` - Format supply with 2 decimals
  - `formatPercentChange(value)` - Format percentage with + or -
  - `getTimeAgo(date)` - Human-readable time difference

#### 4. **theme.js (ThemeManager)**
- Manages light/dark theme
- Persists preference to LocalStorage
- Methods:
  - `init()` - Initialize theme from storage or default
  - `setTheme(theme)` - Set theme and update UI
  - `toggleTheme()` - Switch between themes
  - `getTheme()` - Get current theme

#### 5. **currency.js (CurrencyManager)**
- Manages selected currency
- Persists preference to LocalStorage
- Methods:
  - `init()` - Initialize currency from storage or default (USD)
  - `setCurrency(currency)` - Set currency and trigger app refresh
  - `getCurrency()` - Get current currency
  - `populateCurrencySelector()` - Populate dropdown with currencies

#### 6. **auth.js (AuthModal)**
- Manages login/signup modals
- Methods:
  - `init()` - Initialize modals and event listeners
  - `openLogin()` / `openSignup()` - Open respective modals
  - `closeModal(modal)` - Close modal and reset form
  - `handleLogin(e)` - Handle login form submission (placeholder)
  - `handleSignup(e)` - Handle signup with password validation (placeholder)
- Features:
  - Click outside to close
  - ESC key to close
  - Switch between login/signup
  - Auto-focus on email field
  - Password confirmation validation

#### 7. **ui.js (UI)**
- Handles main listing page rendering
- Methods:
  - `init()` - Initialize UI components
  - `loadData()` - Fetch and display data
  - `renderCryptoTable(data)` - Render desktop table
  - `renderCryptoCards(data)` - Render mobile cards
  - `renderGlobalStats(data)` - Render header stats
  - `renderFearGreedIndex(data)` - Render fear & greed
  - `renderPagination()` - Render page controls
  - `fetchSparklineData(pageData)` - Fetch OHLCV for sparklines
  - `renderSparkline(canvas, data)` - Draw sparkline on canvas
  - `setupSearch()` - Setup search functionality
  - `handleSort(column)` - Handle column sorting
  - `changePage(direction)` - Handle pagination
- State management: currentPage, sortColumn, sortDirection, allData, filteredData

#### 8. **chart.js (PriceChart)**
- Canvas-based chart rendering
- Methods:
  - `init(canvasId)` - Initialize chart with canvas ID
  - `setupCanvas(retryCount)` - Setup canvas dimensions (with retry logic)
  - `setData(data, currency)` - Set chart data and render
  - `render()` - Main render method
  - `drawGrid()` - Draw grid lines
  - `drawAxes()` - Draw X/Y axes with labels
  - `drawChart()` - Draw main price line
  - `drawTooltip(x, y, dataPoint)` - Draw interactive tooltip
  - `setupMouseEvents()` - Setup hover interactions
  - `showLoading()` / `showError(msg)` - Show loading/error states
- Features:
  - Auto-sizing to container
  - Retry logic for dimension issues
  - Smooth curves using quadraticCurveTo
  - Rounded rectangle polyfill (browser compatibility)
  - Dynamic colors (green for up, red for down)

#### 9. **currency-detail.js (CurrencyDetail)**
- Manages currency detail page
- Methods:
  - `init()` - Initialize page with URL slug parameter
  - `loadData()` - Parallel fetch info, quotes, and chart data
  - `loadChartData(period)` - Load OHLCV data for specific period
  - `changePeriod(period)` - Switch chart period
  - `renderPage()` - Render all page sections
  - `renderPriceChange(elementId, value, label)` - Render price change indicators
  - `renderOverview()` / `renderAbout()` / `renderLinks()` - Render tabs
  - `refreshQuotes()` - Refresh price data
  - `setupAutoRefresh()` - Setup 60s auto-refresh
  - `switchTab(tabName)` - Switch between info tabs
- Chart periods:
  - 24h: count=26, interval=hourly, timePeriod=hourly
  - 7d: count=85, interval=2h, timePeriod=hourly
  - 30d: count=121, interval=6h, timePeriod=hourly

#### 10. **app.js (App)**
- Main application initialization
- Orchestrates all managers
- Methods:
  - `init()` - Initialize all managers and load data
  - `loadData()` - Load initial data
  - `refresh()` - Refresh data
  - `setupAutoRefresh()` - Setup 60s auto-refresh
- Handles visibility change for battery saving

---

## 🔌 API Integration

### API Provider
- Cryptocurrency Data API (Startup Plan)
- Base URL: `https://pro-api.coinmarketcap.com`
- Key stored in `.env` as `CMC_API_KEY`

### Proxy Setup
- **File**: `api/proxy.php`
- **Purpose**: Handle CORS, hide API key from client
- **Endpoints supported**:
  - `listings` → `/v1/cryptocurrency/listings/latest`
  - `global-metrics` → `/v1/global-metrics/quotes/latest`
  - `fear-greed` → Alternative.me API (no key needed)
  - `crypto-info` → `/v2/cryptocurrency/info`
  - `crypto-quotes` → `/v2/cryptocurrency/quotes/latest`
  - `ohlcv-historical` → `/v2/cryptocurrency/ohlcv/historical`

### API Plan Limitations (Startup)
- **Historical data**: 1 month maximum
- **Hourly data**: Supported
- **Daily data**: Supported
- **Rate limits**: Check plan documentation
- **Call credits**: 1 credit per 100 items

### Important API Parameters
- `time_period`: Defines OHLCV aggregate ("hourly" or "daily")
- `interval`: Sampling frequency ("hourly", "2h", "6h", "daily", etc.)
- `count`: Number of periods to return (should be +1 for current incomplete period)

### Example API Call
```javascript
// Get 7 days of 2-hour interval data
const response = await API.getOHLCVHistorical(
    cryptoId,       // "1" for Bitcoin
    85,             // count (7 days * 12 intervals + 1)
    'USD',          // convert currency
    '2h',           // interval
    'hourly'        // time_period
);
```

---

## 🎨 Theme System

### Theme Variables
Defined in `css/themes.css`

#### Light Theme
```css
--bg-primary: #FFFFFF
--bg-secondary: #F7F7F7
--bg-tertiary: #EFF2F5
--bg-hover: #F5F5F5
--text-primary: #000000
--text-secondary: #58667E
--text-tertiary: #808A9D
--border-color: #EFF2F5
--primary-color: #16C784
--primary-hover: #17B978
```

#### Dark Theme
```css
--bg-primary: #0B0E11
--bg-secondary: #17181B
--bg-tertiary: #2B2F36
--bg-hover: #1E2026
--text-primary: #FFFFFF
--text-secondary: #A0A0A0
--text-tertiary: #808A9D
--border-color: #2B2F36
--primary-color: #16C784
--primary-hover: #17B978
```

#### Common Colors
```css
--green: #16C784
--red: #EA3943
--blue: #3861FB
--yellow: #FFB800
--orange: #FF9500
```

### Theme Application
- Body has class `theme-light` or `theme-dark`
- All CSS uses CSS variables
- Modal overlay adjusted per theme
- Chart colors adapt to theme

---

## 🔐 Authentication System

### Current Status
- **Frontend only** - No backend integration yet
- Modal-based UI implemented
- Form validation in place

### Login Modal
- Email input (type=email, required)
- Password input (type=password, required)
- Link to switch to signup
- Submit logs to console (placeholder)

### Signup Modal
- Email input (type=email, required)
- Password input (type=password, required)
- Confirm password input (type=password, required)
- Password match validation
- Link to switch to login
- Submit logs to console (placeholder)

### Modal Features
- Click outside to close
- ESC key to close
- Click X button to close
- Auto-focus on email field
- Prevents body scroll when open
- Smooth animations (fadeIn, slideUp)
- Theme-aware styling

### Backend Integration Points
Ready for backend integration in:
- `auth.js` → `handleLogin(e)` method
- `auth.js` → `handleSignup(e)` method

---

## 📊 Chart & Visualization

### Sparklines (Home Page)
- **Technology**: HTML5 Canvas
- **Data**: Last 7 days OHLCV (84 points, 2h intervals)
- **Size**: 100x30 pixels
- **Features**:
  - Min/max scaling
  - Smooth curves
  - Green/red based on trend
  - Handles missing data gracefully

### Price Chart (Detail Page)
- **Technology**: HTML5 Canvas with custom renderer
- **Library**: None (vanilla implementation)
- **Features**:
  - Responsive sizing
  - Interactive tooltips on hover
  - Grid lines with labels
  - Smooth curves (quadraticCurveTo)
  - Dynamic color (green up, red down)
  - Loading states
  - Error handling
- **Data Points**:
  - 24H: 24 points
  - 7D: 84 points
  - 30D: 120 points
- **Performance**:
  - RequestAnimationFrame for smooth rendering
  - Retry logic for dimension issues
  - Debounced mouse events

### Chart Implementation Details
- Canvas dimensions set with devicePixelRatio for crisp display
- Rounded rectangle polyfill for browser compatibility
- Mouse tracking for tooltip positioning
- Price formatting with currency symbol
- Date/time formatting for X-axis labels

---

## ⚙️ Configuration

### Environment Variables (.env)
```
CMC_API_KEY=your_api_key_here
```

### LocalStorage Keys
- `folyo_theme` - Current theme ("light" or "dark")
- `folyo_currency` - Selected currency code ("USD", "EUR", etc.)
- `folyo_last_update` - Timestamp of last data update

### Constants (config.js)
```javascript
API_BASE_URL: 'api/proxy.php'
ITEMS_PER_PAGE: 100
REFRESH_INTERVAL: 60000  // 60 seconds
LOGO_URL_TEMPLATE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/{id}.png'
```

### Currency Symbols
93+ currencies supported with proper symbols:
- USD → $
- EUR → €
- BRL → R$
- GBP → £
- JPY/CNY → ¥
- And many more...

---

## 🔧 Important Technical Details

### 1. CORS Handling
- All API requests go through `api/proxy.php`
- Proxy adds CORS headers
- API key never exposed to client

### 2. Responsive Breakpoints
```css
Desktop: > 768px (full table)
Tablet: 481px - 768px (reduced columns)
Mobile: ≤ 480px (card layout)
```

### 3. Search Implementation
- Real-time filtering
- Debounced 300ms to prevent excessive operations
- Searches in: name, symbol
- Case-insensitive
- Updates pagination

### 4. Sorting Logic
- Click column header to sort
- First click: ascending
- Second click: descending
- Third click: reset to default (rank)
- Visual indicator with arrows

### 5. Auto-refresh Strategy
- 60-second interval
- Pauses when tab hidden
- Resumes when tab visible
- Prevents battery drain
- Cancels pending requests on page unload

### 6. Canvas Rendering Issues & Solutions
- **Problem**: Canvas dimensions zero on init
- **Solution**: RequestAnimationFrame + retry logic (3 attempts with delays)
- **Problem**: RoundRect not available in all browsers
- **Solution**: Custom polyfill using quadraticCurveTo

### 7. API Data Handling
- V2 endpoints return different structures for single vs multiple items
- Single crypto: `{data: {id, name, quotes: [...]}}`
- Multiple cryptos: `{data: {1: {...}, 2: {...}}}`
- Code handles both formats

### 8. Price Formatting Logic
```javascript
if (price >= 1) {
    // Show 2 decimals: $1,234.56
} else if (price >= 0.01) {
    // Show 4 decimals: $0.1234
} else if (price >= 0.0001) {
    // Show 6 decimals: $0.001234
} else {
    // Show 8 decimals: $0.00001234
}
```

### 9. Sparkline Data Strategy
- Batch request for all visible cryptos (100 at once)
- Single API call returns data for all IDs
- Indexed by crypto ID for fast lookup
- Only renders sparklines with valid data

### 10. Modal Z-Index Strategy
```css
Header/Nav: z-index 100
Modals: z-index 10000
```

---

## ⚠️ Known Limitations

### API Plan Limitations
1. **Historical Data**: Only 1 month (Startup plan)
   - 90D, 1Y, ALL periods disabled
   - Requires upgrade to Standard/Professional/Enterprise
2. **Rate Limits**: Subject to plan limits
3. **Call Credits**: 1 credit per 100 items

### Browser Compatibility
1. **Canvas roundRect**: Polyfill provided
2. **CSS Variables**: IE11 not supported (by design)
3. **LocalStorage**: Required for theme/currency persistence

### Performance Considerations
1. **Sparklines**: Rendering 100 canvases can be intensive on low-end devices
2. **Large datasets**: Sorting/filtering 100+ items requires decent CPU
3. **Auto-refresh**: Uses battery on mobile (mitigated by pause on hidden)

### Current Missing Features
1. **Authentication**: Frontend only, no backend
2. **User accounts**: Not implemented
3. **Favorites/Watchlist**: Not implemented
4. **Price alerts**: Not implemented
5. **Portfolio tracking**: Not implemented
6. **Historical comparisons**: Not implemented

---

## 🚀 Future Enhancements

### High Priority
- [ ] Backend authentication system
- [ ] User account management
- [ ] Favorites/Watchlist feature
- [ ] Portfolio tracking
- [ ] Price alerts

### Medium Priority
- [ ] More chart types (candlestick, volume)
- [ ] Export data functionality
- [ ] Social sharing features
- [ ] News feed integration
- [ ] Exchange listings

### Low Priority
- [ ] Mobile app (PWA)
- [ ] Browser extension
- [ ] Desktop app (Electron)
- [ ] API plan upgrade for longer historical data
- [ ] WebSocket for real-time updates

---

## 📚 Development Guidelines

### Code Style
- **JavaScript**: ES6+, camelCase for variables, PascalCase for objects/modules
- **CSS**: BEM-inspired naming, kebab-case
- **HTML**: Semantic tags, accessibility attributes
- **PHP**: PSR standards

### Comments
- **Keep comments**: They help AI understand context
- **No CMC references**: Use "cryptocurrency API" or "crypto data API"
- **Document intent**: Why, not just what

### Git Workflow
- Feature branches from main
- Descriptive commit messages
- No API keys in commits (use .env)

### Testing Checklist
- [ ] Test in both themes
- [ ] Test all responsive breakpoints
- [ ] Test with different currencies
- [ ] Test search and sort functionality
- [ ] Test page navigation
- [ ] Verify API calls don't leak keys
- [ ] Check console for errors
- [ ] Test modal interactions

### Performance Tips
- Debounce search input
- Throttle scroll events if added
- Use RequestAnimationFrame for animations
- Batch API requests when possible
- Cache static assets

---

## 🎓 How to Use This Context

### For New Conversations
When starting a new AI chat session, include this information:

```
I'm working on Folyo, a cryptocurrency tracker. Here's the project context:
[Paste relevant sections from this document]

Current task: [Describe what you need help with]
```

### What to Include
- **For bug fixes**: Include "Code Architecture" + "Important Technical Details"
- **For new features**: Include "Core Features" + "Code Architecture" + "Future Enhancements"
- **For styling**: Include "Theme System" + "Responsive Breakpoints"
- **For API work**: Include "API Integration" + "Known Limitations"

### Quick Reference
- **Main entry point**: `app.js` (home) or `currency-detail.js` (detail)
- **API calls**: Always use methods in `api.js`
- **Formatting**: Always use methods in `utils.js`
- **Theme/Currency**: Use manager objects (ThemeManager, CurrencyManager)
- **New features**: Follow existing patterns in similar modules

---

## 📞 Key Contacts & Resources

### Documentation
- Local API docs: `/var/www/html/folyo/apicontent`
- Project README: `/var/www/html/folyo/README.md`
- This context: `/var/www/html/folyo/PROJECT_CONTEXT.md`

### API Resources
- API Plan: Startup (1 month historical data)
- Base URL: `https://pro-api.coinmarketcap.com`
- Alternative Fear & Greed: `https://api.alternative.me/fng/`

---

## 🏁 Current State Summary

### ✅ Completed Features
- Home page with full crypto listing
- Currency detail pages with charts
- Theme system (light/dark)
- Multi-currency support (93+)
- Search and sorting
- Pagination
- Sparkline charts
- Interactive price charts (24H, 7D, 30D)
- Login/Signup modals (frontend)
- Responsive design (desktop/tablet/mobile)
- Auto-refresh system
- Fear & Greed Index

### 🚧 In Progress
- Backend authentication (frontend ready)

### 📋 Not Started
- User accounts and profiles
- Favorites/Watchlist
- Portfolio tracking
- Price alerts
- Advanced charting

### 🐛 Known Issues
- None currently

---

**End of Context Document**

*This document should be updated whenever significant changes are made to the project architecture, features, or technical implementation.*
