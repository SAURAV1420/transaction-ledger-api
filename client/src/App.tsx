import React, { useState, useEffect } from 'react';
import {
  api,
  Account,
  Transaction,
  Pagination
} from './services/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X,
  CreditCard
} from 'lucide-react';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    page_size: 10,
    total_records: 0,
    total_pages: 0
  });

  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [showCreateAccount, setShowCreateAccount] = useState<boolean>(false);
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [txModalType, setTxModalType] = useState<'credit' | 'debit'>('credit');
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);

  // Form states
  const [accountNameInput, setAccountNameInput] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txRefId, setTxRefId] = useState<string>('');
  const [txDesc, setTxDesc] = useState<string>('');

  const [trfSourceId, setTrfSourceId] = useState<string>('');
  const [trfDestId, setTrfDestId] = useState<string>('');
  const [trfAmount, setTrfAmount] = useState<string>('');
  const [trfRefId, setTrfRefId] = useState<string>('');
  const [trfDesc, setTrfDesc] = useState<string>('');

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load all accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // When selected account or filter or page changes, load transactions
  useEffect(() => {
    if (selectedAccount) {
      loadTransactions(selectedAccount.id, filterType, currentPage);
    }
  }, [selectedAccount?.id, filterType, currentPage]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const loadAccounts = async (preferredId?: string) => {
    try {
      setLoading(true);
      const accList = await api.getAccounts();
      setAccounts(accList);

      if (accList.length > 0) {
        if (preferredId) {
          const match = accList.find((a) => a.id === preferredId);
          setSelectedAccount(match || accList[0]);
        } else if (!selectedAccount) {
          setSelectedAccount(accList[0]);
        } else {
          const refreshed = accList.find((a) => a.id === selectedAccount.id);
          if (refreshed) setSelectedAccount(refreshed);
        }
      } else {
        setSelectedAccount(null);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (
    accountId: string,
    type: 'all' | 'credit' | 'debit',
    page: number
  ) => {
    try {
      setLoading(true);
      const res = await api.getTransactions(accountId, {
        type: type === 'all' ? undefined : type,
        page,
        limit: 10
      });
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNameInput.trim()) return;

    try {
      setLoading(true);
      const newAcc = await api.createAccount(accountNameInput.trim());
      showToast('success', `Account created successfully for ${newAcc.name}! Initial balance is $0.00.`);
      setAccountNameInput('');
      setShowCreateAccount(false);
      await loadAccounts(newAcc.id);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTransactionModal = (type: 'credit' | 'debit') => {
    setTxModalType(type);
    setTxAmount('');
    setTxRefId(`ref_${Date.now().toString().slice(-6)}`);
    setTxDesc(type === 'credit' ? 'Deposit' : 'Withdrawal');
    setShowTransactionModal(true);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('error', 'Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      const result = await api.addTransaction(selectedAccount.id, {
        type: txModalType,
        amount: amountNum,
        reference_id: txRefId.trim(),
        description: txDesc.trim()
      });

      showToast(
        'success',
        `${txModalType.toUpperCase()} of $${amountNum.toFixed(2)} processed. New balance: $${result.balance_after.toFixed(2)}`
      );
      setShowTransactionModal(false);
      await loadAccounts(selectedAccount.id);
      await loadTransactions(selectedAccount.id, filterType, 1);
      setCurrentPage(1);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTransferModal = () => {
    if (accounts.length < 2) {
      showToast('error', 'You need at least 2 accounts to perform a money transfer.');
      return;
    }
    const defaultSource = selectedAccount?.id || accounts[0].id;
    const defaultDest = accounts.find((a) => a.id !== defaultSource)?.id || accounts[1].id;

    setTrfSourceId(defaultSource);
    setTrfDestId(defaultDest);
    setTrfAmount('');
    setTrfRefId(`trf_${Date.now().toString().slice(-6)}`);
    setTrfDesc('Internal Transfer');
    setShowTransferModal(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(trfAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('error', 'Transfer amount must be greater than 0');
      return;
    }
    if (trfSourceId === trfDestId) {
      showToast('error', 'Source and destination accounts must be different');
      return;
    }

    try {
      setLoading(true);
      const result = await api.transferMoney({
        source_account_id: trfSourceId,
        destination_account_id: trfDestId,
        amount: amountNum,
        reference_id: trfRefId.trim(),
        description: trfDesc.trim()
      });

      showToast(
        'success',
        `Transferred $${amountNum.toFixed(2)} successfully! Source balance: $${result.source_balance_after.toFixed(2)}, Dest balance: $${result.destination_balance_after.toFixed(2)}`
      );
      setShowTransferModal(false);
      await loadAccounts(selectedAccount?.id);
      if (selectedAccount) {
        await loadTransactions(selectedAccount.id, filterType, 1);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button className="btn-close" style={{ marginLeft: 'auto' }} onClick={() => setErrorMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success" role="alert">
          <Check size={18} />
          <span>{successMessage}</span>
          <button className="btn-close" style={{ marginLeft: 'auto' }} onClick={() => setSuccessMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <h1>LedgerX</h1>
            <p>Immutable Atomic Financial Ledger System</p>
          </div>
        </div>

        <div className="header-actions">
          <a
            href="http://localhost:5001/api-docs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            title="Open Interactive Swagger Documentation"
          >
            <ShieldCheck size={16} color="#6366f1" />
            <span>API Docs</span>
            <ExternalLink size={14} />
          </a>

          <button className="btn btn-outline" onClick={handleOpenTransferModal}>
            <ArrowLeftRight size={16} />
            <span>Transfer Funds</span>
          </button>

          <button className="btn btn-primary" onClick={() => setShowCreateAccount(true)}>
            <PlusCircle size={16} />
            <span>New Account</span>
          </button>
        </div>
      </header>

      {/* Dashboard Main Grid */}
      <div className="dashboard-grid">
        {/* Left Sidebar: Accounts */}
        <aside className="card">
          <div className="card-title">
            <span>Accounts ({accounts.length})</span>
            <button
              className="btn-close"
              title="Refresh Accounts"
              onClick={() => loadAccounts(selectedAccount?.id)}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="account-list">
            {accounts.length === 0 ? (
              <div className="empty-state">
                <CreditCard size={32} />
                <p>No accounts created yet.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowCreateAccount(true)}
                >
                  Create First Account
                </button>
              </div>
            ) : (
              accounts.map((acc) => {
                const isSelected = selectedAccount?.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    className={`account-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAccount(acc);
                      setCurrentPage(1);
                    }}
                  >
                    <div className="account-item-top">
                      <span className="account-name">{acc.name}</span>
                      <span className="account-id">{acc.id.slice(0, 12)}...</span>
                    </div>
                    <div className="account-balance">
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Panel: Active Account & Ledger */}
        <main>
          {selectedAccount ? (
            <>
              {/* Hero Banner for Selected Account */}
              <div className="account-hero">
                <div>
                  <div className="hero-balance-label">Current Account Balance</div>
                  <div className="hero-balance-val">
                    <span>
                      ${selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{selectedAccount.name}</span>
                    <span className="code-ref">{selectedAccount.id}</span>
                    <button
                      className="btn-close"
                      title="Copy Account ID"
                      onClick={() => copyToClipboard(selectedAccount.id)}
                    >
                      {copiedId === selectedAccount.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="hero-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleOpenTransactionModal('credit')}
                  >
                    <ArrowDownLeft size={16} />
                    <span>Credit / Deposit</span>
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleOpenTransactionModal('debit')}
                  >
                    <ArrowUpRight size={16} />
                    <span>Debit / Withdraw</span>
                  </button>
                </div>
              </div>

              {/* Transactions History Ledger */}
              <div className="card">
                <div className="tx-header-bar">
                  <div className="card-title" style={{ margin: 0 }}>
                    <span>Transaction Ledger</span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Filtering tabs */}
                    <div className="filter-group">
                      <button
                        className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => {
                          setFilterType('all');
                          setCurrentPage(1);
                        }}
                      >
                        All
                      </button>
                      <button
                        className={`filter-btn ${filterType === 'credit' ? 'active' : ''}`}
                        onClick={() => {
                          setFilterType('credit');
                          setCurrentPage(1);
                        }}
                      >
                        Credits
                      </button>
                      <button
                        className={`filter-btn ${filterType === 'debit' ? 'active' : ''}`}
                        onClick={() => {
                          setFilterType('debit');
                          setCurrentPage(1);
                        }}
                      >
                        Debits
                      </button>
                    </div>

                    <button
                      className="btn-close"
                      title="Refresh Ledger"
                      onClick={() => loadTransactions(selectedAccount.id, filterType, currentPage)}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Reference ID</th>
                        <th>Description</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state">
                              <p>No transactions found for this account.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              <span className={`badge ${tx.type === 'credit' ? 'badge-credit' : 'badge-debit'}`}>
                                {tx.type === 'credit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                {tx.type}
                              </span>
                            </td>
                            <td>
                              <span className={tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
                                {tx.type === 'credit' ? '+' : '-'}$
                                {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td>
                              <span className="code-ref">{tx.reference_id}</span>
                            </td>
                            <td style={{ color: '#cbd5e1' }}>{tx.description || '—'}</td>
                            <td style={{ color: '#94a3b8', fontSize: 13 }}>
                              {new Date(tx.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="pagination-bar">
                  <span>
                    Showing {transactions.length} of {pagination.total_records} record(s)
                  </span>

                  <div className="page-controls">
                    <button
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      Page {pagination.total_pages === 0 ? 0 : pagination.current_page} of {pagination.total_pages}
                    </span>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      disabled={currentPage >= pagination.total_pages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h3>Select or Create an Account</h3>
              <p style={{ color: '#9ca3af', marginTop: 8 }}>
                Choose an account from the left sidebar or create a new account to get started.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Create Account */}
      {showCreateAccount && (
        <div className="modal-overlay" onClick={() => setShowCreateAccount(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Account</h3>
              <button className="btn-close" onClick={() => setShowCreateAccount(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label>Account Holder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Satoshi Nakamoto"
                  className="form-input"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  autoFocus
                />
                <p className="form-hint">
                  Per ledger integrity rules, initial balance is strictly initialized to $0.00.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateAccount(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Credit / Debit Transaction */}
      {showTransactionModal && selectedAccount && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {txModalType === 'credit' ? 'Deposit Funds (Credit)' : 'Withdraw Funds (Debit)'}
              </h3>
              <button className="btn-close" onClick={() => setShowTransactionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction}>
              <div className="form-group">
                <label>Target Account</label>
                <div className="form-input" style={{ opacity: 0.8, cursor: 'not-allowed' }}>
                  {selectedAccount.name} (${selectedAccount.balance.toFixed(2)})
                </div>
              </div>

              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="100.00"
                  className="form-input"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Reference ID (Unique per account) *</label>
                  <button
                    type="button"
                    className="btn-close"
                    style={{ fontSize: 12, color: '#818cf8' }}
                    onClick={() => setTxRefId(`ref_${Date.now().toString().slice(-6)}`)}
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. ref_1001"
                  className="form-input"
                  value={txRefId}
                  onChange={(e) => setTxRefId(e.target.value)}
                />
                <p className="form-hint">
                  Re-submitting the same reference_id to this account will be safely rejected as a duplicate.
                </p>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Client payment"
                  className="form-input"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                />
              </div>

              {/* Balance projection preview */}
              {txAmount && !isNaN(parseFloat(txAmount)) && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Current Balance:</span>
                    <span>${selectedAccount.balance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ color: '#9ca3af' }}>New Balance After:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          txModalType === 'credit'
                            ? '#34d399'
                            : selectedAccount.balance >= parseFloat(txAmount)
                            ? '#fb7185'
                            : '#ef4444'
                      }}
                    >
                      $
                      {txModalType === 'credit'
                        ? (selectedAccount.balance + parseFloat(txAmount)).toFixed(2)
                        : (selectedAccount.balance - parseFloat(txAmount)).toFixed(2)}
                    </span>
                  </div>
                  {txModalType === 'debit' && selectedAccount.balance < parseFloat(txAmount) && (
                    <div style={{ color: '#ef4444', marginTop: 6, fontSize: 12, fontWeight: 600 }}>
                      ⚠️ Insufficient balance! This debit will be rejected.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowTransactionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${txModalType === 'credit' ? 'btn-success' : 'btn-danger'}`}
                  disabled={loading}
                >
                  {loading
                    ? 'Processing...'
                    : txModalType === 'credit'
                    ? 'Confirm Deposit'
                    : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Bonus Money Transfer */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transfer Money Between Accounts</h3>
              <button className="btn-close" onClick={() => setShowTransferModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer}>
              <div className="form-group">
                <label>Source Account (Sender) *</label>
                <select
                  className="form-select"
                  value={trfSourceId}
                  onChange={(e) => setTrfSourceId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: ${a.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Destination Account (Recipient) *</label>
                <select
                  className="form-select"
                  value={trfDestId}
                  onChange={(e) => setTrfDestId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === trfSourceId}>
                      {a.name} (Balance: ${a.balance.toFixed(2)}) {a.id === trfSourceId ? '(Source)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Transfer Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="50.00"
                  className="form-input"
                  value={trfAmount}
                  onChange={(e) => setTrfAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Transfer Reference ID *</label>
                  <button
                    type="button"
                    className="btn-close"
                    style={{ fontSize: 12, color: '#818cf8' }}
                    onClick={() => setTrfRefId(`trf_${Date.now().toString().slice(-6)}`)}
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. trf_1001"
                  className="form-input"
                  value={trfRefId}
                  onChange={(e) => setTrfRefId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Rent split"
                  className="form-input"
                  value={trfDesc}
                  onChange={(e) => setTrfDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Transferring...' : 'Execute Atomic Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
