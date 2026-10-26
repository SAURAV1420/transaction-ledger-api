export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface Pagination {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

const BASE_URL = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    const errorMsg =
      json.error?.message ||
      json.message ||
      `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).code = json.error?.code;
    (err as any).details = json.error?.details;
    (err as any).status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  async getAccounts(): Promise<Account[]> {
    const res = await fetch(`${BASE_URL}/accounts`);
    const json = await handleResponse<{ data: Account[] }>(res);
    return json.data;
  },

  async createAccount(name: string): Promise<Account> {
    const res = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const json = await handleResponse<{ data: Account }>(res);
    return json.data;
  },

  async getAccountBalance(id: string): Promise<{ account_id: string; balance: number; name: string }> {
    const res = await fetch(`${BASE_URL}/accounts/${id}/balance`);
    const json = await handleResponse<{ data: { account_id: string; balance: number; name: string } }>(res);
    return json.data;
  },

  async getTransactions(
    accountId: string,
    params: { type?: 'credit' | 'debit'; page?: number; limit?: number } = {}
  ): Promise<{ data: Transaction[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/transactions${queryString}`);
    const json = await handleResponse<{ data: Transaction[]; pagination: Pagination }>(res);
    return json;
  },

  async addTransaction(
    accountId: string,
    data: { type: 'credit' | 'debit'; amount: number; description?: string; reference_id: string }
  ): Promise<Transaction & { balance_after: number }> {
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await handleResponse<{ data: Transaction & { balance_after: number } }>(res);
    return json.data;
  },

  async transferMoney(data: {
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    description?: string;
    reference_id: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await handleResponse<{ data: any }>(res);
    return json.data;
  },

  async getHealth(): Promise<{ status: string }> {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<{ status: string }>(res);
  }
};
