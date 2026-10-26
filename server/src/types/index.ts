export type TransactionType = 'credit' | 'debit';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  description: string;
  reference_id: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_at: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}
