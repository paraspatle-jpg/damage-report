# InvestOS

Personal investing decision system for a retail investor. Every module answers the same question: **what should I do?**

All three phases shipped:

- **Portfolio Manager** — add holdings, fetch live prices, compute value / P&L / allocation.
- **Allocation Analyzer** — target vs current with actionable "add / stop adding / trim" text.
- **Decision Engine** — rule-based Add / Hold / Partial Sell / Exit from RSI, MACD, breakout and volume.
- **Rebalancing Engine** — pairs overweight → underweight categories and emits concrete trades (≥ ₹500, drift > 5 pts).
- **Breakout Scanner** — scans symbols for 20/50-day breakouts with volume confirmation, ranks candidates.
- **Smart SIP Optimizer** — tilts SIP size up with drawdown from recent high (−2% → +10%, −5% → +25%, −10% → +50%, −20% → +100%).
- **Trade Journal** — log decisions with reason + emotion, auto-grades each entry and surfaces behavioural patterns (FOMO buys, selling winners early, averaging down).

---

## Stack

- **Frontend + backend:** Next.js 15 App Router (TS, Tailwind). API routes *are* the Node.js backend — one codebase.
- **DB:** PostgreSQL via Prisma.
- **Market data:** `yahoo-finance2` (free). Wrapped behind `MarketProvider` so Zerodha Kite (or any other) can be swapped in.

Project layout:

```
src/
├── app/
│   ├── page.tsx                # Dashboard
│   ├── portfolio/              # Portfolio Manager UI
│   ├── allocation/             # Allocation Analyzer UI
│   ├── decision/               # Decision Engine UI
│   ├── rebalance/              # Rebalancing plan UI
│   ├── scanner/                # Breakout Scanner UI
│   ├── sip/                    # Smart SIP Optimizer UI
│   ├── journal/                # Trade Journal UI
│   └── api/
│       ├── holdings/           # GET, POST, PATCH, DELETE
│       ├── portfolio/          # GET snapshot
│       ├── allocation/         # GET rows / PUT targets
│       ├── rebalance/          # GET plan
│       ├── decision/           # POST { symbol, buyPrice? }
│       ├── scanner/            # POST { symbols: [...] }
│       ├── sip/                # GET list / POST / PATCH / DELETE
│       └── journal/            # GET list+insights / POST / DELETE
├── lib/
│   ├── market/                 # Provider interface + Yahoo impl
│   ├── portfolio/              # Valuation + breakdown
│   ├── allocation/             # Deviation + recommendations
│   ├── rebalance/              # Overweight→underweight pairing
│   ├── scanner/                # Breakout scan
│   ├── sip/                    # SIP optimizer
│   ├── journal/                # Outcome review + insights
│   └── decision/               # Indicators + engine
└── components/
```

---

## Setup

Requires Node 20+ and PostgreSQL. An empty database is fine.

```bash
cp .env.example .env
# edit DATABASE_URL if your Postgres isn't local/default

npm install
npm run db:push       # create tables
npm run db:seed       # sample Indian ETFs + stocks + targets
npm run dev
```

Open http://localhost:3000.

---

## API (Phase 1)

All JSON, all relative to `/api`.

| Method | Path                | Body / query                                | Returns                                 |
| ------ | ------------------- | ------------------------------------------- | --------------------------------------- |
| GET    | `/holdings`         | —                                           | `{ holdings }`                          |
| POST   | `/holdings`         | `{ symbol, category, quantity, buyPrice }`  | `{ holding }`                           |
| PATCH  | `/holdings/:id`     | partial holding                             | `{ holding }`                           |
| DELETE | `/holdings/:id`     | —                                           | `{ ok: true }`                          |
| GET    | `/portfolio`        | —                                           | snapshot: totals, holdings, breakdown   |
| GET    | `/allocation`       | —                                           | `{ rows, targets, totals }`             |
| PUT    | `/allocation`       | `{ targets: [{ category, targetPercent }] }` (must sum to 100) | `{ targets }` |
| GET    | `/rebalance`        | —                                           | `{ plan, rows, totals }`                |
| POST   | `/decision`         | `{ symbol, buyPrice? }`                     | `{ decision, quote }`                   |
| POST   | `/scanner`          | `{ symbols: string[] }` (max 40)            | `{ candidates, failures, scannedAt }`   |
| GET    | `/sip`              | —                                           | `{ plans }` with per-plan recommendation |
| POST   | `/sip`              | `{ symbol, label, baseAmount, category? }`  | `{ plan }`                              |
| PATCH  | `/sip/:id`          | partial plan                                | `{ plan }`                              |
| DELETE | `/sip/:id`          | —                                           | `{ ok: true }`                          |
| GET    | `/journal`          | —                                           | `{ entries, insights }`                 |
| POST   | `/journal`          | `{ symbol, action, reason, price, quantity, emotion? }` | `{ entry }`                  |
| DELETE | `/journal/:id`      | —                                           | `{ ok: true }`                          |

### Symbol format

Yahoo Finance notation. NSE stocks and ETFs end in `.NS` (e.g. `NIFTYBEES.NS`, `HFCL.NS`, `TCS.NS`). BSE ends in `.BO`. US tickers are plain (`AAPL`).

### Decision output

```ts
{
  action: "ADD" | "HOLD" | "PARTIAL_SELL" | "EXIT",
  confidence: 0-100,
  summary: string,                  // one-line action line
  signals: [{ label, direction, detail, weight }],
  metrics: { rsi, macd, macdHistogram, support, resistance, recentHigh20, volumeRatio, pnlPercent }
}
```

The engine combines bull/bear signal weights with position-level guardrails (stop-loss ~-15%, large-gain flag ~+40%) to pick an action and a confidence score.

---

## Philosophy

- Decisions over data — no chart walls, no jargon.
- 5-point deviation is the rebalancing threshold.
- Market layer is abstracted; swap Yahoo for Kite without touching modules.
- Free APIs only.

Not investment advice. For personal use.
