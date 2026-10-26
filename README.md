# Transaction Ledger API & Full Stack Dashboard

[![Tests](https://img.shields.io/badge/Tests-34%20Passed-success?style=for-the-badge&logo=jest)](tests/ledger.test.ts)
[![Coverage](https://img.shields.io/badge/Coverage-~90%25-blue?style=for-the-badge)](server/tests)
[![Node](https://img.shields.io/badge/Node.js-v20+-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-orange?style=for-the-badge&logo=swagger)](http://localhost:5001/api-docs)

A production-grade, highly reliable backend API and interactive web dashboard for a **financial transaction ledger system**. Built with strict adherence to ACID transaction guarantees, data immutability, currency precision safety, idempotent duplicate prevention, and clean layered architecture.

---

## 🌟 Key Features

1. **Account Management**:
   - Create accounts with unique identifiers (`acc_<uuid>`).
   - Initial balance is **strictly 0.00**; client attempts to inject an initial balance are disallowed.
   - Fetch real-time account balances with consistent JSON schema.

2. **Atomic Credit & Debit Transactions**:
   - **Credit**: Accurately increases balance.
   - **Debit**: Decreases balance, strictly rejecting transactions when balance is insufficient (HTTP `422 Unprocessable Entity`), guaranteeing the balance remains untouched.
   - Executed within synchronous SQLite immediate transaction locks (`BEGIN IMMEDIATE`), guaranteeing atomicity and zero race conditions.

3. **Compound Deduplication (Idempotency)**:
   - For the same account, `reference_id` must be unique. Duplicate submissions return HTTP `409 Conflict` without modifying the ledger or balance.
   - The same `reference_id` can be safely used across different accounts.

4. **Defense-in-Depth Immutability**:
   - **API Level**: No `PUT`, `PATCH`, or `DELETE` endpoints are exposed.
   - **Database Level**: SQLite triggers (`prevent_transaction_update` and `prevent_transaction_delete`) raise database aborts if mutation is attempted directly in SQL.

5. **Advanced Ledger Queries**:
   - Filter by transaction type (`credit`, `debit`, or both).
   - Strict monotonic **latest-first** sorting (`created_at DESC, rowid DESC`).
   - Comprehensive pagination metadata (`current_page`, `page_size`, `total_records`, `total_pages`).

6. **Bonus: Multi-Account Money Transfers**:
   - Atomically debit source account and credit destination account inside a single ACID transaction.
   - Lexicographical account ID ordering to prevent database lock deadlocks.
   - Full rollback if any portion of the transfer fails.

7. **Interactive Full Stack Dashboard**:
   - Modern dark glassmorphic UI built with React + Vite + Vanilla CSS.
   - Live account balance cards, 1-click account creation, deposit/withdrawal modals with instant balance preview, and paginated transaction ledger.

8. **Developer Experience & Documentation**:
   - Interactive Swagger UI at `http://localhost:5001/api-docs`.
   - Complete Postman Collection (`postman_collection.json`) ready for 1-click importing.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js (v20) + Express.js | High performance, lightweight, ubiquitous across enterprise environments. |
| **Language** | TypeScript (Strict Mode) | Full type-safety, eliminating entire classes of runtime errors. |
| **Database** | SQLite (`better-sqlite3`) | Synchronous V8 execution, zero external dependency setup (no Docker needed), WAL mode, true ACID compliance. |
| **Validation** | Zod (v3.24) | Strict runtime schema parsing, type inference, and clear error formatting. |
| **API Documentation** | Swagger UI (`swagger-ui-express`) + OpenAPI 3.0 | Live interactive browser testing for all endpoints. |
| **Testing** | Jest + Supertest + `ts-jest` | Comprehensive integration and unit test suite with in-memory SQLite isolation. |
| **Frontend UI** | React 18 + Vite + Lucide Icons + Vanilla CSS | Modern, responsive glassmorphic dashboard without heavy UI framework bloat. |

---

## 📁 Project Structure

```
Full Stack Developer Assessment/
├── server/
│   ├── src/
│   │   ├── config/              # SQLite database initialization, WAL pragma & triggers
│   │   ├── controllers/         # Express controllers (Account, Transaction, Transfer)
│   │   ├── services/            # Business logic, ACID transactions, rounding helpers
│   │   ├── repositories/        # SQLite data access layer & prepared statements
│   │   ├── middlewares/         # Zod validator & global error handling
│   │   ├── schemas/             # Zod validation schemas
│   │   ├── docs/                # OpenAPI 3.0 specification & Swagger UI configuration
│   │   ├── types/               # TypeScript interfaces
│   │   ├── routes/              # Express route declarations
│   │   ├── app.ts               # Express app factory (used by server & tests)
│   │   └── index.ts             # Application entry point listening on port 5001
│   ├── tests/
│   │   └── ledger.test.ts       # 34 end-to-end integration & integrity tests
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.ts
├── client/
│   ├── src/
│   │   ├── services/api.ts      # Typed API client
│   │   ├── App.tsx              # Interactive dashboard UI component
│   │   ├── index.css            # Dark glassmorphic design system tokens
│   │   └── main.tsx             # React entry point
│   ├── package.json
│   ├── vite.config.ts           # Vite config with backend proxy
│   └── index.html
├── API_DOCUMENTATION.md         # Detailed markdown documentation for all endpoints
├── ASSUMPTIONS.md               # Engineering decisions, precision, & concurrency details
├── postman_collection.json      # Ready-to-import Postman collection
├── package.json                 # Root convenience scripts
└── Full Stack Developer Assessment.pdf
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on v20.20.2)
- **npm** v9+ (tested on v10.8.2)

### 2. Install Dependencies
Run from the root directory:
```bash
npm run install:all
```
*(Or run `npm install` inside `server/` and `client/` respectively)*

### 3. Run Automated Tests
Execute the 34-test suite covering all functional requirements and edge cases:
```bash
npm test
```

To run tests with code coverage analysis:
```bash
npm run test:coverage
```

### 4. Start the Backend API Server
```bash
npm run server:dev
```
The backend server will start on **`http://localhost:5001`**:
- **Health Check**: `http://localhost:5001/api/v1/health`
- **Interactive Swagger Docs**: `http://localhost:5001/api-docs`
- **OpenAPI JSON Spec**: `http://localhost:5001/api-docs.json`

### 5. Start the Frontend Dashboard
In a second terminal window, run:
```bash
npm run client:dev
```
Open **`http://localhost:3000`** in your browser to interact with the LedgerX dashboard!

---

## 📋 API Endpoints Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status |
| `POST` | `/api/v1/accounts` | Create a new account (`balance` strictly initialized to 0.00) |
| `GET` | `/api/v1/accounts` | List all accounts |
| `GET` | `/api/v1/accounts/:id` | Fetch account details |
| `GET` | `/api/v1/accounts/:id/balance` | Fetch real-time account balance |
| `POST` | `/api/v1/accounts/:id/transactions` | Add a credit or debit transaction to an account |
| `POST` | `/api/v1/transactions` | Alternative transaction route (with `account_id` in body) |
| `GET` | `/api/v1/accounts/:id/transactions` | Get paginated transactions sorted latest-first with filtering |
| `POST` | `/api/v1/transfers` | **Bonus**: Transfer money atomically between accounts |
| `GET` | `/api/v1/transfers` | List all transfers |

For complete payload details, request/response examples, and error schemas, see [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md).

---

## 🧪 Testing Coverage Overview

The automated test suite (`server/tests/ledger.test.ts`) verifies:
- ✅ **Account Creation**: Unique IDs, name validation, rejection of client-provided initial balance.
- ✅ **Balance Inquiries**: Existing accounts, 404 for non-existent accounts.
- ✅ **Credit Operations**: Balance increases proportionally.
- ✅ **Debit Operations**: Balance decreases when sufficient funds exist.
- ✅ **Overdraft Protection**: Rejection with HTTP 422 when debit exceeds balance; balance left untouched.
- ✅ **Compound Uniqueness**: Duplicate `reference_id` rejected for the same account; identical `reference_id` allowed across different accounts.
- ✅ **Ledger Pagination & Filtering**: Filter by `type=credit` or `type=debit`; full pagination metadata (`current_page`, `page_size`, `total_records`, `total_pages`).
- ✅ **Monotonic Latest-First Sorting**: Correct ordering even when timestamps share the same millisecond.
- ✅ **Immutability Triggers**: SQLite triggers actively preventing UPDATE and DELETE queries.
- ✅ **Balance Consistency Formula**: Exact match with spec example (`0 + 100 + 50 - 30 - 20 = 100`).
- ✅ **Bonus Money Transfer**: Atomic multi-account transfer, rollback on insufficient funds, self-transfer rejection.

---

## 📑 Assessment Checklist

| # | Requirement | Status | Implementation Details |
| :- | :--- | :---: | :--- |
| 1 | **Create Account** | ✅ Complete | `POST /accounts`. Unique `id`, `name` required, balance forced to 0, system timestamp. |
| 2 | **Add Transaction (Credit & Debit)** | ✅ Complete | `POST /accounts/:id/transactions`. Atomic balance updates; overdraft rejection. |
| 3 | **Duplicate Transactions** | ✅ Complete | Compound `UNIQUE(account_id, reference_id)`. Re-submission returns 409 Conflict. |
| 4 | **Get Account Balance** | ✅ Complete | `GET /accounts/:id/balance`. Returns `account_id` & `balance`, 404 if missing. |
| 5 | **Get Transaction History** | ✅ Complete | `GET /accounts/:id/transactions`. Type filtering, `page` & `limit`, latest-first order. |
| 6 | **Data Integrity & Atomicity** | ✅ Complete | SQLite `BEGIN IMMEDIATE` transaction blocks; DB-level immutability triggers. |
| 7 | **Validations & Error Handling** | ✅ Complete | Zod schemas, consistent `{ success: false, error: { ... } }` contract, proper HTTP codes. |
| 8 | **Bonus: Money Transfer** | ✅ Complete | `POST /transfers`. Atomic multi-account debit/credit with deadlock-safe ordering. |
| 9 | **Interactive Frontend Dashboard** | ✅ Complete | Modern responsive React + Vite single-page application. |
| 10 | **Documentation & Assumptions** | ✅ Complete | [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md), [`ASSUMPTIONS.md`](ASSUMPTIONS.md), and Swagger UI. |
