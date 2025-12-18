
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ReconciliationResult, Transaction, MatchedPair, PdfExportConfig } from '../types';
import { Dashboard } from './Dashboard';
import { generateCsv, generatePdf } from '../utils/downloadUtils';
import { DownloadIcon, SearchIcon } from './icons';

interface ReconciliationResultsProps {
  result: ReconciliationResult;
  companyName: string;
  onReset: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount);
};

const StatusBadge: React.FC<{ status?: string; onClear?: () => void }> = ({ status, onClear }) => {
    if (!status || status === 'default') return null;
    
    const styles: Record<string, string> = {
        investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        cleared: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        reviewed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ml-2 ${styles[status] || ''}`}>
            {status}
            {onClear && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="hover:text-red-500 transition-colors ml-1"
                    title="Clear status"
                >
                    &times;
                </button>
            )}
        </span>
    );
};

interface DetailedReportProps {
    result: ReconciliationResult;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    selectedBankIndices: Set<number>;
    setSelectedBankIndices: (val: Set<number>) => void;
    selectedLedgerIndices: Set<number>;
    setSelectedLedgerIndices: (val: Set<number>) => void;
    bankStatuses: Record<number, Transaction['status']>;
    setBankStatuses: (val: Record<number, Transaction['status']>) => void;
    ledgerStatuses: Record<number, Transaction['status']>;
    setLedgerStatuses: (val: Record<number, Transaction['status']>) => void;
}

const DetailedReport: React.FC<DetailedReportProps> = ({ 
    result, 
    searchTerm, 
    setSearchTerm,
    selectedBankIndices,
    setSelectedBankIndices,
    selectedLedgerIndices,
    setSelectedLedgerIndices,
    bankStatuses,
    setBankStatuses,
    ledgerStatuses,
    setLedgerStatuses
}) => {
    const { 
        matchedTransactions = [], 
        unmatchedBankTransactions = [], 
        unmatchedLedgerEntries = [] 
    } = result;

    const [statusFilter, setStatusFilter] = useState<'all' | Transaction['status']>('all');

    const filteredMatched = useMemo(() => {
        if (!searchTerm) return matchedTransactions;
        return matchedTransactions.filter(pair => 
            (pair.bankTransaction.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (pair.ledgerTransaction.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (pair.bankTransaction.date?.includes(searchTerm)) ||
            (pair.ledgerTransaction.date?.includes(searchTerm)) ||
            (String(pair.bankTransaction.amount).includes(searchTerm))
        );
    }, [searchTerm, matchedTransactions]);

    const filteredUnmatchedBank = useMemo(() => {
        return unmatchedBankTransactions.map((tx, idx) => ({ tx, idx })).filter(({ tx, idx }) => {
            const matchesSearch = !searchTerm || 
                tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.date?.includes(searchTerm) ||
                String(tx.amount).includes(searchTerm);
            
            const currentStatus = bankStatuses[idx] || 'default';
            const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, unmatchedBankTransactions, bankStatuses, statusFilter]);

    const filteredUnmatchedLedger = useMemo(() => {
        return unmatchedLedgerEntries.map((tx, idx) => ({ tx, idx })).filter(({ tx, idx }) => {
            const matchesSearch = !searchTerm ||
                tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.date?.includes(searchTerm) ||
                String(tx.amount).includes(searchTerm);
            
            const currentStatus = ledgerStatuses[idx] || 'default';
            const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, unmatchedLedgerEntries, ledgerStatuses, statusFilter]);

    const toggleBankSelection = (idx: number) => {
        const next = new Set(selectedBankIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedBankIndices(next);
    };

    const toggleLedgerSelection = (idx: number) => {
        const next = new Set(selectedLedgerIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedLedgerIndices(next);
    };

    const selectAllUnmatchedBank = () => {
        if (selectedBankIndices.size === filteredUnmatchedBank.length && filteredUnmatchedBank.length > 0) {
            setSelectedBankIndices(new Set());
        } else {
            setSelectedBankIndices(new Set(filteredUnmatchedBank.map(i => i.idx)));
        }
    };

    const selectAllUnmatchedLedger = () => {
        if (selectedLedgerIndices.size === filteredUnmatchedLedger.length && filteredUnmatchedLedger.length > 0) {
            setSelectedLedgerIndices(new Set());
        } else {
            setSelectedLedgerIndices(new Set(filteredUnmatchedLedger.map(i => i.idx)));
        }
    };

    const clearSingleBankStatus = (idx: number) => {
        const next = { ...bankStatuses };
        delete next[idx];
        setBankStatuses(next);
    };

    const clearSingleLedgerStatus = (idx: number) => {
        const next = { ...ledgerStatuses };
        delete next[idx];
        setLedgerStatuses(next);
    };

    return (
        <div className="animate-fade-in pb-24">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Search description, date, or amount..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900/80 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-slate-400">Status:</label>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white dark:bg-slate-900/80 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-colors"
                    >
                        <option value="all">All Items</option>
                        <option value="default">Default (Pending)</option>
                        <option value="investigating">To Investigate</option>
                        <option value="cleared">Cleared</option>
                        <option value="reviewed">Reviewed</option>
                    </select>
                </div>
            </div>

            <div className="space-y-6">
                <details className="bg-white dark:bg-slate-900/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300" open>
                    <summary className="font-semibold text-xl cursor-pointer text-green-600 dark:text-green-400 select-none outline-none hover:opacity-80 transition-opacity">
                        Matched Transactions ({filteredMatched.length})
                    </summary>
                    <div className="overflow-x-auto mt-4 rounded-lg border border-gray-100 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/80">
                                <tr>
                                    <th className="p-4">Bank Date</th>
                                    <th className="p-4">Bank Description</th>
                                    <th className="p-4">Ledger Date</th>
                                    <th className="p-4">Ledger Description</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredMatched.length > 0 ? filteredMatched.map((pair: MatchedPair, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-gray-700 dark:text-slate-300 font-medium">{pair.bankTransaction.date}</td>
                                        <td className="p-4 text-gray-600 dark:text-slate-400">{pair.bankTransaction.description}</td>
                                        <td className="p-4 text-gray-700 dark:text-slate-300 font-medium">{pair.ledgerTransaction.date}</td>
                                        <td className="p-4 text-gray-600 dark:text-slate-400">{pair.ledgerTransaction.description}</td>
                                        <td className="p-4 text-right font-mono text-green-600 dark:text-green-400 font-bold">{formatCurrency(pair.bankTransaction.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No matching records found for current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </details>
                
                <details className="bg-white dark:bg-slate-900/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300" open>
                    <summary className="font-semibold text-xl cursor-pointer text-orange-600 dark:text-orange-400 flex items-center gap-3 select-none outline-none hover:opacity-80 transition-opacity">
                        Unmatched Bank Transactions ({filteredUnmatchedBank.length})
                        {selectedBankIndices.size > 0 && <span className="text-xs font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">{selectedBankIndices.size} Selected</span>}
                    </summary>
                    <div className="overflow-x-auto mt-4 rounded-lg border border-gray-100 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/80">
                                <tr>
                                    <th className="p-4 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            onChange={selectAllUnmatchedBank}
                                            checked={filteredUnmatchedBank.length > 0 && selectedBankIndices.size === filteredUnmatchedBank.length}
                                            className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 h-4 w-4 transition-all"
                                        />
                                    </th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredUnmatchedBank.length > 0 ? filteredUnmatchedBank.map(({ tx, idx }) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => toggleBankSelection(idx)}
                                        className={`cursor-pointer transition-all duration-200 ${selectedBankIndices.has(idx) ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedBankIndices.has(idx)}
                                                onChange={() => toggleBankSelection(idx)}
                                                className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                        </td>
                                        <td className="p-4 text-gray-700 dark:text-slate-300 font-medium">{tx.date}</td>
                                        <td className="p-4 text-gray-600 dark:text-slate-400 flex items-center flex-wrap gap-y-1">
                                            {tx.description}
                                            <StatusBadge 
                                                status={bankStatuses[idx]} 
                                                onClear={() => clearSingleBankStatus(idx)} 
                                            />
                                        </td>
                                        <td className="p-4 text-right font-mono text-orange-600 dark:text-orange-400 font-bold">{formatCurrency(tx.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No unmatched bank transactions found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </details>

                <details className="bg-white dark:bg-slate-900/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300" open>
                    <summary className="font-semibold text-xl cursor-pointer text-yellow-600 dark:text-yellow-400 flex items-center gap-3 select-none outline-none hover:opacity-80 transition-opacity">
                        Unmatched Ledger Entries ({filteredUnmatchedLedger.length})
                        {selectedLedgerIndices.size > 0 && <span className="text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">{selectedLedgerIndices.size} Selected</span>}
                    </summary>
                    <div className="overflow-x-auto mt-4 rounded-lg border border-gray-100 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/80">
                                <tr>
                                    <th className="p-4 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            onChange={selectAllUnmatchedLedger}
                                            checked={filteredUnmatchedLedger.length > 0 && selectedLedgerIndices.size === filteredUnmatchedLedger.length}
                                            className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 h-4 w-4 transition-all"
                                        />
                                    </th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredUnmatchedLedger.length > 0 ? filteredUnmatchedLedger.map(({ tx, idx }) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => toggleLedgerSelection(idx)}
                                        className={`cursor-pointer transition-all duration-200 ${selectedLedgerIndices.has(idx) ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLedgerIndices.has(idx)}
                                                onChange={() => toggleLedgerSelection(idx)}
                                                className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                        </td>
                                        <td className="p-4 text-gray-700 dark:text-slate-300 font-medium">{tx.date}</td>
                                        <td className="p-4 text-gray-600 dark:text-slate-400 flex items-center flex-wrap gap-y-1">
                                            {tx.description}
                                            <StatusBadge 
                                                status={ledgerStatuses[idx]} 
                                                onClear={() => clearSingleLedgerStatus(idx)} 
                                            />
                                        </td>
                                        <td className="p-4 text-right font-mono text-yellow-600 dark:text-yellow-400 font-bold">{formatCurrency(tx.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No unmatched ledger entries found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </details>
            </div>
        </div>
    );
};

export const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({ result, companyName, onReset }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankIndices, setSelectedBankIndices] = useState<Set<number>>(new Set());
  const [selectedLedgerIndices, setSelectedLedgerIndices] = useState<Set<number>>(new Set());
  const [bankStatuses, setBankStatuses] = useState<Record<number, Transaction['status']>>({});
  const [ledgerStatuses, setLedgerStatuses] = useState<Record<number, Transaction['status']>>({});

  const [exportConfig, setExportConfig] = useState<PdfExportConfig>({
    includeSummary: true,
    includeMatches: true,
    includeUnmatchedBank: true,
    includeUnmatchedLedger: true,
    onlySelectedItems: false
  });

  const hasSelection = selectedBankIndices.size > 0 || selectedLedgerIndices.size > 0;

  const getTabClass = (tabName: string) => {
    return activeTab === tabName
      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500';
  };

  const handleDownloadCsv = () => {
    generateCsv(result, companyName);
  };
  
  const handlePdfExport = () => {
    generatePdf(result, companyName, exportConfig, selectedBankIndices, selectedLedgerIndices);
    setShowExportModal(false);
  };

  const handleResetClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmReset = () => {
    setShowConfirmDialog(false);
    onReset();
  };

  const cancelReset = () => {
    setShowConfirmDialog(false);
  };

  const applyBulkStatus = (type: 'bank' | 'ledger', status: Transaction['status']) => {
    if (type === 'bank') {
        const next = { ...bankStatuses };
        selectedBankIndices.forEach(idx => {
            if (status === 'default') delete next[idx];
            else next[idx] = status;
        });
        setBankStatuses(next);
        setSelectedBankIndices(new Set());
    } else {
        const next = { ...ledgerStatuses };
        selectedLedgerIndices.forEach(idx => {
            if (status === 'default') delete next[idx];
            else next[idx] = status;
        });
        setLedgerStatuses(next);
        setSelectedLedgerIndices(new Set());
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-700 animate-fade-in transition-colors duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 transition-colors duration-300">Reconciliation Report</h2>
            {companyName && <p className="text-indigo-600 dark:text-indigo-400 font-semibold">{companyName}</p>}
        </div>
        <div className="mt-4 md:mt-0 border-b border-gray-200 dark:border-slate-700 w-full md:w-auto">
          <nav className="-mb-px flex space-x-8 justify-center md:justify-start" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-lg transition-colors duration-200 ${getTabClass('dashboard')}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-lg transition-colors duration-200 ${getTabClass('details')}`}
            >
              Detailed Report
            </button>
          </nav>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'dashboard' ? (
            <Dashboard result={result} />
        ) : (
            <DetailedReport 
                result={result} 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedBankIndices={selectedBankIndices}
                setSelectedBankIndices={setSelectedBankIndices}
                selectedLedgerIndices={selectedLedgerIndices}
                setSelectedLedgerIndices={setSelectedLedgerIndices}
                bankStatuses={bankStatuses}
                setBankStatuses={setBankStatuses}
                ledgerStatuses={ledgerStatuses}
                setLedgerStatuses={setLedgerStatuses}
            />
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-700 text-center flex flex-wrap justify-center gap-4">
        <button
            onClick={handleResetClick}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
            Start New Reconciliation
        </button>
         <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white font-bold rounded-lg shadow-lg hover:bg-sky-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
            <DownloadIcon />
            Export CSV
        </button>
         <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
            <DownloadIcon />
            Export PDF
        </button>
      </div>

      {hasSelection && activeTab === 'details' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full shadow-2xl p-2 px-8 flex items-center gap-6 backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95 ring-4 ring-indigo-500/10 transition-all">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Bulk Selection</span>
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {selectedBankIndices.size + selectedLedgerIndices.size} Items
                    </span>
                </div>
                <div className="h-10 w-px bg-gray-200 dark:bg-slate-700" />
                <div className="flex items-center gap-3">
                    {selectedBankIndices.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mr-1">Bank:</span>
                            <button 
                                onClick={() => applyBulkStatus('bank', 'investigating')}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95"
                            >
                                Investigate
                            </button>
                            <button 
                                onClick={() => applyBulkStatus('bank', 'cleared')}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95"
                            >
                                Mark Cleared
                            </button>
                        </div>
                    )}
                    {selectedBankIndices.size > 0 && selectedLedgerIndices.size > 0 && <div className="h-6 w-px bg-gray-100 dark:bg-slate-700" />}
                    {selectedLedgerIndices.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mr-1">Ledger:</span>
                            <button 
                                onClick={() => applyBulkStatus('ledger', 'reviewed')}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95"
                            >
                                Mark Reviewed
                            </button>
                        </div>
                    )}
                </div>
                <div className="h-10 w-px bg-gray-200 dark:bg-slate-700" />
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            if(selectedBankIndices.size > 0) applyBulkStatus('bank', 'default');
                            if(selectedLedgerIndices.size > 0) applyBulkStatus('ledger', 'default');
                        }}
                        className="text-xs text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 font-bold uppercase transition-colors"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => { setSelectedBankIndices(new Set()); setSelectedLedgerIndices(new Set()); }}
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-200 dark:border-slate-700 transform transition-all scale-100">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Export Options</h3>
                    <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4 mb-10">
                    {[
                        { id: 'includeSummary', label: 'Executive Summary', icon: '📊' },
                        { id: 'includeMatches', label: 'Verified Matches', icon: '✅' },
                        { id: 'includeUnmatchedBank', label: 'Unmatched Bank Items', icon: '🏦' },
                        { id: 'includeUnmatchedLedger', label: 'Unmatched Ledger Entries', icon: '📖' },
                    ].map((item) => (
                        <label key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-bold text-gray-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.label}
                                </span>
                            </div>
                            <input 
                                type="checkbox"
                                checked={(exportConfig as any)[item.id]}
                                onChange={(e) => setExportConfig({ ...exportConfig, [item.id]: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                            />
                        </label>
                    ))}

                    {(selectedBankIndices.size > 0 || selectedLedgerIndices.size > 0) && (
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                             <label className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 cursor-pointer hover:border-indigo-400 transition-all">
                                <div className="flex flex-col">
                                    <span className="font-black text-indigo-700 dark:text-indigo-400">Only export selected items</span>
                                    <span className="text-xs text-indigo-600/70 dark:text-indigo-300/60">Include only the bank and ledger items you have checked in the detailed table.</span>
                                </div>
                                <input 
                                    type="checkbox"
                                    checked={exportConfig.onlySelectedItems}
                                    onChange={(e) => setExportConfig({ ...exportConfig, onlySelectedItems: e.target.checked })}
                                    className="w-5 h-5 rounded border-indigo-300 dark:border-indigo-600 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowExportModal(false)}
                        className="flex-1 px-4 py-4 text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-2xl font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePdfExport}
                        className="flex-1 px-4 py-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        Generate PDF
                    </button>
                </div>
            </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-slate-700 transform transition-all scale-100">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">Clear current report?</h3>
            <p className="text-gray-600 dark:text-slate-300 mb-8 text-center leading-relaxed">
                You're about to start a new session. Please ensure you've exported your reconciliation report as PDF or CSV if needed.
            </p>
            <div className="flex gap-4">
              <button
                onClick={cancelReset}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl font-bold transition-all focus:outline-none"
              >
                Go Back
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 px-4 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all focus:outline-none"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
