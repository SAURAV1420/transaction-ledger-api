import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { resetDatabase } from '../src/config/db';

describe('Transaction Ledger API Integration Tests', () => {
  let db: Database.Database;
  let app: any;

  beforeEach(() => {
    // In-memory isolated database for each test suite run
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    resetDatabase(db);
    app = createApp(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Health Check', () => {
    it('should return UP status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('1. Create Account', () => {
    it('should create a new account with 0 initial balance and system generated id and timestamp', async () => {
      const res = await request(app)
        .post('/api/v1/accounts')
        .send({ name: 'Alice Smith' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.id).toMatch(/^acc_/);
      expect(res.body.data.name).toBe('Alice Smith');
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data).toHaveProperty('created_at');
    });

    it('should NOT allow the client to set initial balance', async () => {
      const res = await request(app)
        .post('/api/v1/accounts')
        .send({
          name: 'Sneaky Client',
          balance: 1000000,
          id: 'custom_id',
          created_at: '2020-01-01T00:00:00Z'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.id).not.toBe('custom_id');
      expect(res.body.data.id).toMatch(/^acc_/);
    });

    it('should reject account creation when name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/accounts')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject account creation when name is empty string', async () => {
      const res = await request(app)
        .post('/api/v1/accounts')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Get Account Balance', () => {
    it('should fetch balance for an existing account', async () => {
      const createRes = await request(app)
        .post('/api/v1/accounts')
        .send({ name: 'Bob Jones' });
      const accountId = createRes.body.data.id;

      const balanceRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(balanceRes.status).toBe(200);
      expect(balanceRes.body.success).toBe(true);
      expect(balanceRes.body.data.account_id).toBe(accountId);
      expect(balanceRes.body.data.balance).toBe(0);
    });

    it('should return 404 when account does not exist', async () => {
      const res = await request(app).get('/api/v1/accounts/non_existent_id/balance');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('3. Add Transaction (Credit & Debit)', () => {
    let accountId: string;

    beforeEach(async () => {
      const acc = await request(app)
        .post('/api/v1/accounts')
        .send({ name: 'Charlie' });
      accountId = acc.body.data.id;
    });

    it('should credit an account and increase balance', async () => {
      const creditRes = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100.5,
          reference_id: 'ref_credit_1',
          description: 'Payroll deposit'
        });

      expect(creditRes.status).toBe(201);
      expect(creditRes.body.success).toBe(true);
      expect(creditRes.body.data.type).toBe('credit');
      expect(creditRes.body.data.amount).toBe(100.5);
      expect(creditRes.body.data.balance_after).toBe(100.5);
      expect(creditRes.body.data.reference_id).toBe('ref_credit_1');

      // Verify balance endpoint
      const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(bal.body.data.balance).toBe(100.5);
    });

    it('should debit an account with sufficient balance and decrease balance', async () => {
      // First credit 100
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'c1' });

      // Then debit 30
      const debitRes = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'debit',
          amount: 30,
          reference_id: 'd1',
          description: 'Dinner'
        });

      expect(debitRes.status).toBe(201);
      expect(debitRes.body.data.balance_after).toBe(70);

      const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(bal.body.data.balance).toBe(70);
    });

    it('should reject debit when account does not have sufficient balance and leave balance unchanged', async () => {
      // Credit 100
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'c1' });

      // Attempt to debit 150
      const debitRes = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'debit',
          amount: 150,
          reference_id: 'd_overdraft',
          description: 'Expensive item'
        });

      expect(debitRes.status).toBe(422);
      expect(debitRes.body.success).toBe(false);
      expect(debitRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Verify balance remains 100
      const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(bal.body.data.balance).toBe(100);
    });

    it('should reject transaction for non-existent account', async () => {
      const res = await request(app)
        .post('/api/v1/accounts/non_existent_acc/transactions')
        .send({
          type: 'credit',
          amount: 50,
          reference_id: 'r_none'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should support alternative endpoint POST /api/v1/transactions with account_id in body', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .send({
          account_id: accountId,
          type: 'credit',
          amount: 250,
          reference_id: 'alt_ref_01',
          description: 'Via root transaction route'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.balance_after).toBe(250);
    });

    it('should reject invalid transaction amount (<= 0 or invalid decimal places)', async () => {
      const resZero = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 0, reference_id: 'r0' });
      expect(resZero.status).toBe(400);

      const resNeg = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: -50, reference_id: 'r_neg' });
      expect(resNeg.status).toBe(400);

      const resPrecision = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 10.999, reference_id: 'r_prec' });
      expect(resPrecision.status).toBe(400);
    });

    it('should reject invalid transaction type', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'withdraw', amount: 50, reference_id: 'r_bad_type' });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Duplicate Transactions Handling', () => {
    let accountA: string;
    let accountB: string;

    beforeEach(async () => {
      const a = await request(app).post('/api/v1/accounts').send({ name: 'Account A' });
      const b = await request(app).post('/api/v1/accounts').send({ name: 'Account B' });
      accountA = a.body.data.id;
      accountB = b.body.data.id;
    });

    it('should reject duplicate transaction with same reference_id on same account without altering balance', async () => {
      // First transaction
      const first = await request(app)
        .post(`/api/v1/accounts/${accountA}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'unique_ref_1' });
      expect(first.status).toBe(201);
      expect(first.body.data.balance_after).toBe(100);

      // Duplicate submission
      const duplicate = await request(app)
        .post(`/api/v1/accounts/${accountA}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'unique_ref_1' });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.success).toBe(false);
      expect(duplicate.body.error.code).toBe('DUPLICATE_TRANSACTION');

      // Balance must NOT change
      const bal = await request(app).get(`/api/v1/accounts/${accountA}/balance`);
      expect(bal.body.data.balance).toBe(100);

      // Verify only 1 transaction exists in history
      const hist = await request(app).get(`/api/v1/accounts/${accountA}/transactions`);
      expect(hist.body.data.length).toBe(1);
    });

    it('should ALLOW the same reference_id to be used for different accounts', async () => {
      // Account A uses ref_shared_123
      const resA = await request(app)
        .post(`/api/v1/accounts/${accountA}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'ref_shared_123' });
      expect(resA.status).toBe(201);

      // Account B uses the EXACT SAME reference_id
      const resB = await request(app)
        .post(`/api/v1/accounts/${accountB}/transactions`)
        .send({ type: 'credit', amount: 75, reference_id: 'ref_shared_123' });
      expect(resB.status).toBe(201);

      // Both balances correctly updated
      const balA = await request(app).get(`/api/v1/accounts/${accountA}/balance`);
      const balB = await request(app).get(`/api/v1/accounts/${accountB}/balance`);
      expect(balA.body.data.balance).toBe(50);
      expect(balB.body.data.balance).toBe(75);
    });
  });

  describe('5. Transaction History (Filtering, Pagination, Sorting)', () => {
    let accountId: string;

    beforeEach(async () => {
      const acc = await request(app)
        .post('/api/v1/accounts')
        .send({ name: 'History User' });
      accountId = acc.body.data.id;

      // Seed transactions
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'tx1', description: 'Credit 1' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'tx2', description: 'Credit 2' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'debit', amount: 30, reference_id: 'tx3', description: 'Debit 1' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'debit', amount: 20, reference_id: 'tx4', description: 'Debit 2' });
    });

    it('should return all transactions when no filter is provided in latest-first order', async () => {
      const res = await request(app).get(`/api/v1/accounts/${accountId}/transactions`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);
      expect(res.body.pagination.total_records).toBe(4);

      // Sorting check: latest-first order (tx4 was created last)
      expect(res.body.data[0].reference_id).toBe('tx4');
      expect(res.body.data[3].reference_id).toBe('tx1');
    });

    it('should filter transactions by credit type', async () => {
      const res = await request(app)
        .get(`/api/v1/accounts/${accountId}/transactions?type=credit`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((t: any) => t.type === 'credit')).toBe(true);
      expect(res.body.pagination.total_records).toBe(2);
    });

    it('should filter transactions by debit type', async () => {
      const res = await request(app)
        .get(`/api/v1/accounts/${accountId}/transactions?type=debit`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((t: any) => t.type === 'debit')).toBe(true);
      expect(res.body.pagination.total_records).toBe(2);
    });

    it('should support pagination (page and limit) with complete metadata', async () => {
      const page1 = await request(app)
        .get(`/api/v1/accounts/${accountId}/transactions?page=1&limit=2`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(2);
      expect(page1.body.pagination).toEqual({
        current_page: 1,
        page_size: 2,
        total_records: 4,
        total_pages: 2
      });

      const page2 = await request(app)
        .get(`/api/v1/accounts/${accountId}/transactions?page=2&limit=2`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(2);
      expect(page2.body.pagination.current_page).toBe(2);

      // Check non-overlapping items
      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    });
  });

  describe('6. Data Integrity & Immutability', () => {
    let accountId: string;

    beforeEach(async () => {
      const acc = await request(app)
        .post('/api/v1/accounts')
        .send({ name: 'Integrity User' });
      accountId = acc.body.data.id;
    });

    it('should maintain exact balance consistency (example from spec: 0 + 100 + 50 - 30 - 20 = 100)', async () => {
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'i1' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'i2' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'debit', amount: 30, reference_id: 'i3' });
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'debit', amount: 20, reference_id: 'i4' });

      // Failed debit attempt: debit 200 (insufficient)
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({ type: 'debit', amount: 200, reference_id: 'i_fail' });

      // Verify balance is exactly 100
      const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(bal.body.data.balance).toBe(100);
    });

    it('should prohibit transaction updates or deletes via DB trigger', () => {
      const insertStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
        VALUES ('t_immut', '${accountId}', 'credit', 50, 'test', 'ref_immut', '2026-10-26T00:00:00Z')
      `);
      insertStmt.run();

      // Attempt UPDATE directly on DB
      expect(() => {
        db.prepare(`UPDATE transactions SET amount = 999 WHERE id = 't_immut'`).run();
      }).toThrow(/immutable and cannot be updated/i);

      // Attempt DELETE directly on DB
      expect(() => {
        db.prepare(`DELETE FROM transactions WHERE id = 't_immut'`).run();
      }).toThrow(/immutable and cannot be deleted/i);
    });
  });

  describe('7. Bonus: Money Transfer', () => {
    let accountA: string;
    let accountB: string;

    beforeEach(async () => {
      // Account A with initial 100
      const a = await request(app).post('/api/v1/accounts').send({ name: 'Alice' });
      accountA = a.body.data.id;
      await request(app)
        .post(`/api/v1/accounts/${accountA}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'init_a' });

      // Account B with initial 50
      const b = await request(app).post('/api/v1/accounts').send({ name: 'Bob' });
      accountB = b.body.data.id;
      await request(app)
        .post(`/api/v1/accounts/${accountB}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'init_b' });
    });

    it('should transfer 30 from Account A to Account B atomically (Spec Example: A: 70, B: 80)', async () => {
      const res = await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountB,
          amount: 30,
          reference_id: 'transfer_001',
          description: 'Payment for groceries'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.source_balance_after).toBe(70);
      expect(res.body.data.destination_balance_after).toBe(80);

      // Verify balances via account balance API
      const balA = await request(app).get(`/api/v1/accounts/${accountA}/balance`);
      const balB = await request(app).get(`/api/v1/accounts/${accountB}/balance`);
      expect(balA.body.data.balance).toBe(70);
      expect(balB.body.data.balance).toBe(80);

      // Verify transaction ledger records created for both accounts
      const histA = await request(app).get(`/api/v1/accounts/${accountA}/transactions`);
      const histB = await request(app).get(`/api/v1/accounts/${accountB}/transactions`);

      expect(histA.body.data.some((t: any) => t.type === 'debit' && t.amount === 30)).toBe(true);
      expect(histB.body.data.some((t: any) => t.type === 'credit' && t.amount === 30)).toBe(true);
    });

    it('should reject transfer when source account has insufficient balance and rollback completely', async () => {
      const res = await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountB,
          amount: 500, // Account A only has 100
          reference_id: 'transfer_too_much'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Neither balance should have changed
      const balA = await request(app).get(`/api/v1/accounts/${accountA}/balance`);
      const balB = await request(app).get(`/api/v1/accounts/${accountB}/balance`);
      expect(balA.body.data.balance).toBe(100);
      expect(balB.body.data.balance).toBe(50);
    });

    it('should reject transferring to the same account', async () => {
      const res = await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountA,
          amount: 20,
          reference_id: 'self_trf'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate transfer reference for the same source account', async () => {
      // First transfer
      await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountB,
          amount: 10,
          reference_id: 'same_trf_ref'
        });

      // Second transfer with same reference
      const duplicateRes = await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountB,
          amount: 10,
          reference_id: 'same_trf_ref'
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('DUPLICATE_TRANSACTION');
    });

    it('should reject transfer when destination account does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: 'acc_does_not_exist',
          amount: 10,
          reference_id: 'dest_missing'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should list all transfers via GET /api/v1/transfers', async () => {
      await request(app)
        .post('/api/v1/transfers')
        .send({
          source_account_id: accountA,
          destination_account_id: accountB,
          amount: 15,
          reference_id: 'trf_list_1'
        });

      const res = await request(app).get('/api/v1/transfers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('8. Additional Endpoints & Edge Cases', () => {
    it('should list all accounts via GET /api/v1/accounts', async () => {
      await request(app).post('/api/v1/accounts').send({ name: 'User 1' });
      await request(app).post('/api/v1/accounts').send({ name: 'User 2' });

      const res = await request(app).get('/api/v1/accounts');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should get account details via GET /api/v1/accounts/:id', async () => {
      const acc = await request(app).post('/api/v1/accounts').send({ name: 'Specific User' });
      const accountId = acc.body.data.id;

      const res = await request(app).get(`/api/v1/accounts/${accountId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Specific User');
    });

    it('should serve root welcome endpoint', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('documentation');
    });

    it('should serve OpenAPI JSON specification', async () => {
      const res = await request(app).get('/api-docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
    });

    it('should return 404 for unknown route', async () => {
      const res = await request(app).get('/api/v1/non_existent_route');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should reject invalid pagination parameters (e.g. limit > 100 or limit < 1)', async () => {
      const acc = await request(app).post('/api/v1/accounts').send({ name: 'Pagination Test' });
      const accountId = acc.body.data.id;

      const resOver = await request(app).get(`/api/v1/accounts/${accountId}/transactions?limit=500`);
      expect(resOver.status).toBe(400);

      const resUnder = await request(app).get(`/api/v1/accounts/${accountId}/transactions?limit=0`);
      expect(resUnder.status).toBe(400);
    });
  });
});
