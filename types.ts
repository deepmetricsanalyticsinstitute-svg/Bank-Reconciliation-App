
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit'; // credit = money in for bank, debit = money out for bank
  status?: 'default' | 'investigating' | 'cleared' | 'reviewed';
}

export interface MatchedPair {
  bankTransaction: Transaction;
  ledgerTransaction: Transaction;
}

export interface ReconciliationResult {
  summary: {
    matchedCount: number;
    unmatchedBankCount: number;
    unmatchedLedgerCount: number;
    matchedTotal: number;
    unmatchedBankTotal: number;
    unmatchedLedgerTotal: number;
    ledgerBalance: number;     // Extracted closing balance from Ledger
    bankBalance: number;       // Extracted closing balance from Bank Stmt
    asAtDate: string;          // Reconciliation date
  };
  matchedTransactions: MatchedPair[];
  unmatchedBankTransactions: Transaction[];
  unmatchedLedgerEntries: Transaction[];
}

export interface PdfExportConfig {
  includeSummary: boolean;
  includeMatches: boolean;
  includeUnmatchedBank: boolean;
  includeUnmatchedLedger: boolean;
  onlySelectedItems: boolean;
}
