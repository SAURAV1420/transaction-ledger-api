import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z
    .string({
      required_error: 'Account name is required',
      invalid_type_error: 'Account name must be a string'
    })
    .trim()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters')
});

export const addTransactionSchema = z.object({
  account_id: z.string().trim().min(1, 'account_id cannot be empty').optional(),
  type: z.enum(['credit', 'debit'], {
    errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'" })
  }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a numeric value'
    })
    .positive('Amount must be greater than 0')
    .finite('Amount must be a finite number')
    .refine((val) => Number((val).toFixed(2)) === val, {
      message: 'Amount cannot have more than 2 decimal places'
    }),
  description: z
    .string({ invalid_type_error: 'Description must be a string' })
    .trim()
    .max(255, 'Description cannot exceed 255 characters')
    .default(''),
  reference_id: z
    .string({
      required_error: 'reference_id is required',
      invalid_type_error: 'reference_id must be a string'
    })
    .trim()
    .min(1, 'reference_id cannot be empty')
    .max(100, 'reference_id cannot exceed 100 characters')
});

export const transactionHistoryQuerySchema = z.object({
  type: z
    .enum(['credit', 'debit'], {
      errorMap: () => ({ message: "Type filter must be either 'credit' or 'debit'" })
    })
    .optional(),
  page: z.coerce
    .number({ invalid_type_error: 'Page must be an integer' })
    .int('Page must be an integer')
    .positive('Page must be greater than or equal to 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be an integer' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10)
});

export const transferSchema = z
  .object({
    source_account_id: z
      .string({
        required_error: 'source_account_id is required',
        invalid_type_error: 'source_account_id must be a string'
      })
      .trim()
      .min(1, 'source_account_id cannot be empty'),
    destination_account_id: z
      .string({
        required_error: 'destination_account_id is required',
        invalid_type_error: 'destination_account_id must be a string'
      })
      .trim()
      .min(1, 'destination_account_id cannot be empty'),
    amount: z
      .number({
        required_error: 'Amount is required',
        invalid_type_error: 'Amount must be a numeric value'
      })
      .positive('Amount must be greater than 0')
      .finite('Amount must be a finite number')
      .refine((val) => Number((val).toFixed(2)) === val, {
        message: 'Amount cannot have more than 2 decimal places'
      }),
    reference_id: z
      .string({
        required_error: 'reference_id is required',
        invalid_type_error: 'reference_id must be a string'
      })
      .trim()
      .min(1, 'reference_id cannot be empty')
      .max(100, 'reference_id cannot exceed 100 characters'),
    description: z
      .string({ invalid_type_error: 'Description must be a string' })
      .trim()
      .max(255, 'Description cannot exceed 255 characters')
      .default('')
  })
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: 'Cannot transfer money to the same account',
    path: ['destination_account_id']
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AddTransactionInput = z.infer<typeof addTransactionSchema>;
export type TransactionHistoryQueryInput = z.infer<typeof transactionHistoryQuerySchema>;
export type TransferInput = z.infer<typeof transferSchema>;
