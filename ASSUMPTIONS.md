# Architectural Decisions & Assumptions

This document outlines the core engineering decisions, assumptions, and architectural tradeoffs made while designing and implementing the **Transaction Ledger API**.

---

## 1. Financial Arithmetic & Currency Precision
* **Context**: Standard floating-point arithmetic (IEEE 754) in programming languages can introduce precision artifacts (such as `0.1 + 0.2 = 0.30000000000000004`).
* **Assumption / Decision**:
  - All financial amounts represent monetary currency values with a maximum of **two decimal places** (cents).
  - Incoming request payloads are validated via Zod schema refinement to ensure no more than 2 decimal places are accepted (e.g. `10.99` is valid, `10.999` is rejected with `400 Bad Request`).
  - All internal arithmetic uses epsilon-adjusted rounding:
    ```typescript
    export function round2(num: number): number {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }
    ```
  - Account balances in SQLite are stored with a database constraint `CHECK (balance >= 0)`.

---

## 2. Reference ID Scope & Compound Uniqueness
* **Requirement**: *"For the same account, reference_id must be unique... The same reference_id may be used for different accounts."*
* **Assumption / Decision**:
  - We enforce a compound unique constraint at the database table level:
    ```sql
    UNIQUE(account_id, reference_id)
    ```
  - If a client submits a transaction with an existing `reference_id` for that account, the API returns `409 Conflict` with error code `DUPLICATE_TRANSACTION`, and the account balance remains strictly unchanged.
  - As required, the exact same `reference_id` string *can* be used without collision by any other account.

---

## 3. Database Selection & Portability
* **Requirement**: *"Use any relational or non-relational database of your choice... The application should be runnable locally using the instructions provided in the README."*
* **Assumption / Decision**:
  - **SQLite via `better-sqlite3`** was selected for primary persistence.
  - **Rationale**:
    1. **Zero External Overhead**: Reviewers and evaluators can clone the repository and run `npm install && npm start` or `npm test` without needing Docker daemon running, installing PostgreSQL locally, or configuring connection strings.
    2. **Strict ACID Compliance**: `better-sqlite3` executes synchronously on the V8 event loop, eliminating async database connection latency and guaranteeing true serializable ACID transaction blocks (`db.transaction(...)`).
    3. **Production Optimization**: Configured with `PRAGMA journal_mode = WAL` (Write-Ahead Logging) and `PRAGMA foreign_keys = ON`.
    4. **Test Isolation**: Automated Jest test suites run in-memory (`:memory:`) with instant resets, guaranteeing 100% test independence and rapid execution (~1 second for the full suite).

---

## 4. Transaction Immutability (Defense-in-Depth)
* **Requirement**: *"Once a transaction is created, it must not be editable or deletable through the API."*
* **Assumption / Decision**:
  - We implemented a **defense-in-depth** strategy at two layers:
    1. **API Layer**: There are deliberately no `PUT`, `PATCH`, or `DELETE` endpoints exposed on transactions.
    2. **Database Layer**: SQLite triggers are created to guarantee that even direct SQL executions cannot modify or delete transaction records:
       ```sql
       CREATE TRIGGER prevent_transaction_update
       BEFORE UPDATE ON transactions
       BEGIN
         SELECT RAISE(ABORT, 'Transactions are immutable and cannot be updated.');
       END;

       CREATE TRIGGER prevent_transaction_delete
       BEFORE DELETE ON transactions
       BEGIN
         SELECT RAISE(ABORT, 'Transactions are immutable and cannot be deleted.');
       END;
       ```

---

## 5. Sorting & Monotonic Ordering
* **Requirement**: *"Transactions must be returned in latest-first order, based on created_at."*
* **Assumption / Decision**:
  - When transactions occur within the exact same millisecond, sorting solely by `created_at DESC` can lead to tie-breaking ambiguity.
  - To ensure strict monotonic ordering, queries sort by:
    ```sql
    ORDER BY created_at DESC, rowid DESC
    ```
  - In SQLite, `rowid` is an auto-incrementing 64-bit integer assigned sequentially to each inserted row. This guarantees that transactions created chronologically later will always appear first.

---

## 6. Deadlock Prevention for Multi-Account Transfers (Bonus)
* **Requirement**: *"The debit from the source account and credit to the destination account must happen atomically. If any part of the transfer fails, the entire transfer must be rolled back."*
* **Assumption / Decision**:
  - If Account A transfers to Account B at the same time Account B transfers to Account A, acquiring locks in arbitrary order can result in a database deadlock.
  - To prevent this, the `TransferService` sorts the account IDs lexicographically (`[source_id, dest_id].sort()`) before acquiring locks and executing updates.
  - Each transfer generates two traceable transaction ledger entries:
    - A `debit` transaction for the sender with reference `trf_<ref>_out`.
    - A `credit` transaction for the recipient with reference `trf_<ref>_in`.
  - Both updates, along with the audit record in the `transfers` table, execute within a single atomic SQLite transaction. If any check fails (e.g. insufficient funds in source account), the entire operation rolls back.

---

## 7. Timestamps & Timezones
* **Assumption / Decision**:
  - All timestamps (`created_at`) are generated server-side using standard ISO 8601 UTC strings (`new Date().toISOString()`, e.g. `2026-10-26T11:00:00.000Z`).
  - Clients are responsible for formatting to their local time zone for presentation.
