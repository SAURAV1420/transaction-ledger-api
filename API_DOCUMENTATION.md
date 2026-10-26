# Transaction Ledger API Documentation

Welcome to the **Transaction Ledger API** documentation. This service provides a financial transaction ledger system supporting account creation, atomic credit and debit transactions, real-time balance calculations, latest-first transaction histories with pagination and filtering, and multi-account money transfers.

Interactive Swagger UI documentation is also available locally at:
👉 **`http://localhost:5001/api-docs`**

The raw OpenAPI 3.0 specification can be retrieved at:
👉 **`http://localhost:5001/api-docs.json`**

---

## Base URL

```
http://localhost:5001/api/v1
```

All requests must send and accept `Content-Type: application/json`.

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "pagination": { ... } // Present on paginated endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Debit transaction rejected: Account has insufficient balance.",
    "details": null
  }
}
```

### HTTP Status Codes
| Status Code | Meaning | When Used |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Fetching balance, account details, or transaction history |
| **`201 Created`** | Created | Successfully creating an account, transaction, or transfer |
| **`400 Bad Request`** | Validation Error | Missing fields, negative amounts, invalid data types, self-transfer |
| **`404 Not Found`** | Resource Missing | Account ID or route not found |
| **`409 Conflict`** | Duplicate Resource | Duplicate `reference_id` within the same account |
| **`422 Unprocessable`** | Business Rule Violation | Debit transaction rejected due to insufficient balance |
| **`500 Internal Error`** | Server Error | Unhandled runtime exception |

---

## 1. Accounts API

### 1.1 Create Account
Creates a new account. Initial balance is strictly initialized to `0.00` by the system; client attempts to set initial balance are disallowed.

- **Method**: `POST`
- **Path**: `/accounts`
- **Request Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | **Yes** | Name of the account holder (1-100 characters). |

```json
{
  "name": "Alice Smith"
}
```

#### Example cURL
```bash
curl -X POST http://localhost:5001/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "name": "Alice Smith",
    "balance": 0,
    "created_at": "2026-10-26T11:00:00.000Z"
  },
  "message": "Account created successfully"
}
```

---

### 1.2 Get Account Balance
Fetches the current real-time balance of an account.

- **Method**: `GET`
- **Path**: `/accounts/:id/balance`

#### Example cURL
```bash
curl http://localhost:5001/api/v1/accounts/acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5/balance
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "balance": 150.00,
    "name": "Alice Smith"
  }
}
```

#### Error Response: `404 Not Found` (Account does not exist)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account with ID 'acc_non_existent' not found",
    "details": null
  }
}
```

---

### 1.3 List All Accounts
Returns a list of all existing accounts in the ledger.

- **Method**: `GET`
- **Path**: `/accounts`

#### Response: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
      "name": "Alice Smith",
      "balance": 150.00,
      "created_at": "2026-10-26T11:00:00.000Z"
    }
  ]
}
```

---

## 2. Transactions API

### 2.1 Add Transaction
Atomically applies a credit or debit transaction to the account.

- **Primary Route**: `POST /accounts/:id/transactions`
- **Alternative Route**: `POST /transactions` (with `account_id` in request body)
- **Request Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | Either `"credit"` or `"debit"`. |
| `amount` | number | **Yes** | Strictly positive numeric value (`> 0`) with at most 2 decimal places. |
| `reference_id` | string | **Yes** | Unique reference string within this account. |
| `description` | string | No | Optional human-readable transaction description (max 255 chars). |

#### Example: Credit (Deposit)
```bash
curl -X POST http://localhost:5001/api/v1/accounts/acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 100.00,
    "reference_id": "dep_1001",
    "description": "Initial account funding"
  }'
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "txn_89f7f074-b5a8-4441-a185-359f1366cfa9",
    "account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "type": "credit",
    "amount": 100,
    "description": "Initial account funding",
    "reference_id": "dep_1001",
    "created_at": "2026-10-26T11:05:00.000Z",
    "balance_after": 100
  },
  "message": "Transaction processed successfully"
}
```

---

#### Example: Debit (Withdrawal)
```bash
curl -X POST http://localhost:5001/api/v1/accounts/acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "debit",
    "amount": 30.00,
    "reference_id": "wd_2001",
    "description": "ATM cash withdrawal"
  }'
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "txn_38e4a991-8d07-427c-9b7e-9080709a34bc",
    "account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "type": "debit",
    "amount": 30,
    "description": "ATM cash withdrawal",
    "reference_id": "wd_2001",
    "created_at": "2026-10-26T11:10:00.000Z",
    "balance_after": 70
  },
  "message": "Transaction processed successfully"
}
```

---

#### Transaction Error Scenarios:

1. **Insufficient Balance (`422 Unprocessable Entity`)**:
   When a debit exceeds current account balance:
   ```json
   {
     "success": false,
     "error": {
       "code": "INSUFFICIENT_FUNDS",
       "message": "Debit transaction rejected: Account has insufficient balance. Current: 70, Requested: 150.",
       "details": {
         "current_balance": 70,
         "requested_amount": 150
       }
     }
   }
   ```
   *Note: Account balance remains untouched at 70.*

2. **Duplicate Reference ID (`409 Conflict`)**:
   When the same `reference_id` is submitted again to the same account:
   ```json
   {
     "success": false,
     "error": {
       "code": "DUPLICATE_TRANSACTION",
       "message": "Transaction with reference_id 'dep_1001' already exists for account 'acc_...'.",
       "details": {
         "reference_id": "dep_1001"
       }
     }
   }
   ```
   *Note: No new transaction is persisted, and balance does not change.*

3. **Validation Error (`400 Bad Request`)**:
   When `amount <= 0` or missing required fields:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid request body",
       "details": [
         {
           "field": "amount",
           "message": "Amount must be greater than 0"
         }
       ]
     }
   }
   ```

---

### 2.2 Get Transaction History
Retrieves paginated transactions for an account sorted in **latest-first** order (`created_at DESC`).

- **Method**: `GET`
- **Path**: `/accounts/:id/transactions`
- **Query Parameters**:
  - `type` (optional): Filter by `"credit"` or `"debit"`. If omitted, both are returned.
  - `page` (optional): Page number (integer `>= 1`, default: `1`).
  - `limit` (optional): Number of records per page (integer `1` to `100`, default: `10`).

#### Example cURL
```bash
curl "http://localhost:5001/api/v1/accounts/acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5/transactions?type=credit&page=1&limit=10"
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_89f7f074-b5a8-4441-a185-359f1366cfa9",
      "account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
      "type": "credit",
      "amount": 100,
      "description": "Initial account funding",
      "reference_id": "dep_1001",
      "created_at": "2026-10-26T11:05:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 1,
    "total_pages": 1
  }
}
```

---

## 3. Bonus: Money Transfer API

### 3.1 Transfer Money Between Accounts
Transfers funds from `source_account_id` to `destination_account_id` inside a single, atomic SQLite transaction.

- **Method**: `POST`
- **Path**: `/transfers`
- **Request Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `source_account_id` | string | **Yes** | ID of the debiting account. |
| `destination_account_id` | string | **Yes** | ID of the crediting account (cannot be source). |
| `amount` | number | **Yes** | Strictly positive transfer amount (`> 0`). |
| `reference_id` | string | **Yes** | Unique transfer reference string. |
| `description` | string | No | Optional transfer description. |

#### Example cURL
```bash
curl -X POST http://localhost:5001/api/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "destination_account_id": "acc_2ef4981a-67a2-46be-91c2-98448fa56e01",
    "amount": 30.00,
    "reference_id": "trf_oct_26_01",
    "description": "Shared expense transfer"
  }'
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "transfer_id": "trf_b7139f41-039c-4ec7-993c-2ee1780490ac",
    "source_account_id": "acc_0bb57d6b-5bb9-4cfc-bf33-04d30623fcb5",
    "destination_account_id": "acc_2ef4981a-67a2-46be-91c2-98448fa56e01",
    "amount": 30,
    "description": "Shared expense transfer",
    "reference_id": "trf_oct_26_01",
    "source_balance_after": 70,
    "destination_balance_after": 80,
    "created_at": "2026-10-26T11:15:00.000Z"
  },
  "message": "Transfer completed successfully"
}
```

---

## 4. Health Check

### 4.1 Health Check
Returns the real-time operational status of the service and SQLite database engine.

- **Method**: `GET`
- **Path**: `/health`

#### Response: `200 OK`
```json
{
  "status": "UP",
  "timestamp": "2026-10-26T11:20:00.000Z",
  "database": "connected"
}
```
