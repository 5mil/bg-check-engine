# bg-check-engine

A modular background check engine using **free public records** and **third-party identity verification APIs**.

## Features

- 🔎 Name-based search across multiple free public sources
- 🏛️ Federal court records via CourtListener & PACER
- 🚨 Sex offender registry check (NSOPW)
- 💸 Bankruptcy filings lookup
- 🪪 Identity verification via Stripe Identity & Onfido
- 🧩 Modular provider system — add/remove sources easily
- 📦 REST API server (Express.js)

## Data Sources

| Source | Type | Cost | API |
|---|---|---|---|
| [CourtListener](https://www.courtlistener.com/api/) | Federal court records | Free | REST |
| [PACER](https://pacer.uscourts.gov) | Federal dockets | Pay-per-page (~$0.10) | REST |
| [NSOPW](https://www.nsopw.gov) | Sex offender registry | Free | REST |
| [JudyRecords](https://www.judyrecords.com) | State court records | Free | Scrape |
| [OpenSanctions](https://www.opensanctions.org/api/) | Sanctions/PEP lists | Free tier | REST |
| [Stripe Identity](https://stripe.com/identity) | KYC / doc verification | Pay-per-use | REST/SDK |
| [Onfido](https://onfido.com) | Biometric KYC | Pay-per-use | REST/SDK |

## Quick Start

```bash
git clone https://github.com/5mil/bg-check-engine
cd bg-check-engine
npm install
cp .env.example .env
# Fill in your API keys in .env
npm start
```

## API Usage

### Background Check
```http
POST /api/check
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "state": "NY",
  "dob": "1985-06-15"
}
```

### Identity Verification Session
```http
POST /api/verify/session
Content-Type: application/json

{
  "provider": "stripe",
  "userId": "user_abc123"
}
```

## Project Structure

```
bg-check-engine/
├── src/
│   ├── providers/          # Individual data source modules
│   │   ├── courtListener.js
│   │   ├── nsopw.js
│   │   ├── openSanctions.js
│   │   ├── pacer.js
│   │   └── judyRecords.js
│   ├── identity/           # Identity verification integrations
│   │   ├── stripe.js
│   │   └── onfido.js
│   ├── engine.js           # Orchestration engine
│   ├── router.js           # Express routes
│   └── index.js            # Entry point
├── .env.example
├── package.json
└── README.md
```

## Legal & Compliance

> ⚠️ **Important:** If used for employment, housing, credit, or tenant screening decisions, this system is subject to the **Fair Credit Reporting Act (FCRA)**. You must:
> - Obtain written consent from the subject
> - Provide adverse action notices when required
> - Not use outputs as sole decision-making criteria for FCRA-covered purposes

This tool is intended for **personal research, security, or non-FCRA use cases only** by default.

## License

MIT
