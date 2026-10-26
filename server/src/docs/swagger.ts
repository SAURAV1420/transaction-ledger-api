export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Transaction Ledger API',
    version: '1.0.0',
    description:
      'A production-grade backend API for an immutable, atomic transaction ledger system.\n\n' +
      'Features include:\n' +
      '- Account management with strictly enforced zero initial balance\n' +
      '- Atomic credit and debit transactions with strict debit balance validation\n' +
      '- Idempotent transaction handling using unique reference_id per account\n' +
      '- Transaction immutability guaranteed at both API and SQLite database trigger levels\n' +
      '- Transaction history with type filtering, pagination, and latest-first sorting\n' +
      '- Bonus: Atomic multi-account money transfer with deadlock-safe balance updates and rollback guarantees',
    contact: {
      name: 'Full Stack Engineering Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Local development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        description: 'Returns the operational status of the service and database.',
        responses: {
          '200': {
            description: 'API is healthy'
          }
        }
      }
    },
    '/accounts': {
      post: {
        summary: 'Create Account',
        description:
          'Creates a new account. Name is required. Initial balance is strictly initialized to 0.00 by the system.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateAccountRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AccountResponse'
                }
              }
            }
          },
          '400': {
            description: 'Validation error (e.g. missing or empty name)'
          }
        }
      },
      get: {
        summary: 'List All Accounts',
        description: 'Returns all existing accounts in the ledger system.',
        responses: {
          '200': {
            description: 'List of accounts'
          }
        }
      }
    },
    '/accounts/{id}/balance': {
      get: {
        summary: 'Get Account Balance',
        description: 'Fetches the current real-time balance of an account.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Account ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Account balance retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BalanceResponse'
                }
              }
            }
          },
          '404': {
            description: 'Account not found'
          }
        }
      }
    },
    '/accounts/{id}': {
      get: {
        summary: 'Get Account Details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Account details retrieved'
          },
          '404': {
            description: 'Account not found'
          }
        }
      }
    },
    '/accounts/{id}/transactions': {
      post: {
        summary: 'Add Transaction to Account',
        description:
          'Atomically applies a credit or debit transaction to the account.\n\n' +
          '- Credit increases balance.\n' +
          '- Debit decreases balance and rejects if balance is insufficient.\n' +
          '- Duplicate reference_id for this account returns 409 Conflict without altering balance.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Account ID',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AddTransactionRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Transaction recorded successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TransactionResponse'
                }
              }
            }
          },
          '400': { description: 'Validation error (invalid amount, negative, missing reference_id)' },
          '404': { description: 'Account not found' },
          '409': { description: 'Duplicate transaction (reference_id already used for this account)' },
          '422': { description: 'Insufficient balance for debit' }
        }
      },
      get: {
        summary: 'Get Account Transaction History',
        description:
          'Retrieves paginated transactions for an account sorted in latest-first order. Supports filtering by type.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            description: "Filter by transaction type ('credit' or 'debit')",
            schema: { type: 'string', enum: ['credit', 'debit'] }
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Page number (default: 1)',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Records per page (default: 10, max: 100)',
            schema: { type: 'integer', default: 10 }
          }
        ],
        responses: {
          '200': {
            description: 'Paginated transactions list',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedTransactionsResponse'
                }
              }
            }
          },
          '404': { description: 'Account not found' }
        }
      }
    },
    '/transactions': {
      post: {
        summary: 'Add Transaction (Alternative Endpoint)',
        description:
          'Alternative endpoint allowing account_id to be supplied directly in the JSON request body.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AddTransactionWithAccountRequest'
              }
            }
          }
        },
        responses: {
          '201': { description: 'Transaction processed successfully' },
          '400': { description: 'Validation error' },
          '404': { description: 'Account not found' },
          '409': { description: 'Duplicate reference_id for this account' },
          '422': { description: 'Insufficient balance' }
        }
      }
    },
    '/transfers': {
      post: {
        summary: 'Bonus: Transfer Money Between Accounts',
        description:
          'Atomically transfers funds from source account to destination account.\n\n' +
          '- Validates both accounts exist and are distinct\n' +
          '- Validates sufficient source balance\n' +
          '- Debits source and credits destination atomically inside a single ACID transaction\n' +
          '- Completely rolls back if any error occurs',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/TransferRequest'
              }
            }
          }
        },
        responses: {
          '201': { description: 'Transfer completed successfully' },
          '400': { description: 'Validation error or transferring to self' },
          '404': { description: 'Source or destination account not found' },
          '409': { description: 'Duplicate transfer reference' },
          '422': { description: 'Insufficient balance in source account' }
        }
      },
      get: {
        summary: 'List All Transfers',
        responses: {
          '200': { description: 'Transfers retrieved' }
        }
      }
    }
  },
  components: {
    schemas: {
      CreateAccountRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            example: 'Alice Smith'
          }
        }
      },
      AccountResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'acc_a3712b3e-...' },
              name: { type: 'string', example: 'Alice Smith' },
              balance: { type: 'number', example: 0 },
              created_at: { type: 'string', example: '2026-10-26T10:00:00.000Z' }
            }
          }
        }
      },
      BalanceResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              account_id: { type: 'string', example: 'acc_a3712b3e-...' },
              name: { type: 'string', example: 'Alice Smith' },
              balance: { type: 'number', example: 150.0 }
            }
          }
        }
      },
      AddTransactionRequest: {
        type: 'object',
        required: ['type', 'amount', 'reference_id'],
        properties: {
          type: { type: 'string', enum: ['credit', 'debit'], example: 'credit' },
          amount: { type: 'number', example: 100.0 },
          reference_id: { type: 'string', example: 'ref_1001' },
          description: { type: 'string', example: 'Initial deposit' }
        }
      },
      AddTransactionWithAccountRequest: {
        type: 'object',
        required: ['account_id', 'type', 'amount', 'reference_id'],
        properties: {
          account_id: { type: 'string', example: 'acc_a3712b3e-...' },
          type: { type: 'string', enum: ['credit', 'debit'], example: 'credit' },
          amount: { type: 'number', example: 100.0 },
          reference_id: { type: 'string', example: 'ref_1001' },
          description: { type: 'string', example: 'Initial deposit' }
        }
      },
      TransactionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'txn_92f1b4c...' },
              account_id: { type: 'string', example: 'acc_a3712b3e-...' },
              type: { type: 'string', example: 'credit' },
              amount: { type: 'number', example: 100.0 },
              description: { type: 'string', example: 'Initial deposit' },
              reference_id: { type: 'string', example: 'ref_1001' },
              created_at: { type: 'string', example: '2026-10-26T10:05:00.000Z' },
              balance_after: { type: 'number', example: 100.0 }
            }
          }
        }
      },
      PaginatedTransactionsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/TransactionResponse' }
          },
          pagination: {
            type: 'object',
            properties: {
              current_page: { type: 'integer', example: 1 },
              page_size: { type: 'integer', example: 10 },
              total_records: { type: 'integer', example: 1 },
              total_pages: { type: 'integer', example: 1 }
            }
          }
        }
      },
      TransferRequest: {
        type: 'object',
        required: ['source_account_id', 'destination_account_id', 'amount', 'reference_id'],
        properties: {
          source_account_id: { type: 'string', example: 'acc_01...' },
          destination_account_id: { type: 'string', example: 'acc_02...' },
          amount: { type: 'number', example: 30.0 },
          reference_id: { type: 'string', example: 'trf_9921' },
          description: { type: 'string', example: 'Transfer payment' }
        }
      }
    }
  }
};
