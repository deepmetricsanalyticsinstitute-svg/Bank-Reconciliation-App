
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ReconciliationResults } from './components/ReconciliationResults';
import { ProgressBar } from './components/ProgressBar';
import { reconcileFiles } from './services/geminiService';
import { fileToGenerativePart } from './utils/fileUtils';
import type { ReconciliationResult } from './types';
import { AppIcon, DownloadIcon } from './components/icons';
import { ModelToggle } from './components/ModelToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { generateSampleData } from './utils/sampleData';
import { triggerDownload } from './utils/downloadUtils';

type ModelType = 'flash' | 'pro';

const COMPANY_NAME_STORAGE_KEY = 'reconciliation_company_name';

const App: React.FC = () => {
  const [companyName, setCompanyName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(COMPANY_NAME_STORAGE_KEY) || '';
    }
    return '';
  });
  const [asAtDate, setAsAtDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [ledger, setLedger] = useState<File | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelType>('flash');
  const [progress, setProgress] = useState<number>(0);

  // Persist company name to localStorage
  useEffect(() => {
    localStorage.setItem(COMPANY_NAME_STORAGE_KEY, companyName);
  }, [companyName]);

  useEffect(() => {
    let intervalId: number;
    if (isLoading) {
      setProgress(0);
      intervalId = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev;
          let increment = 1.0;
          if (prev < 40) increment = 4.0;
          else if (prev < 70) increment = 1.5;
          else if (prev < 90) increment = 0.5;
          else increment = 0.1;
          increment += (Math.random() - 0.5) * 0.2;
          return Math.min(prev + increment, 98);
        });
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isLoading]);

  const getProgressMessage = (val: number) => {
      if (val < 20) return 'Initializing secure environment...';
      if (val < 40) return 'Analyzing document structure...';
      if (val < 60) return 'Extracting financial data...';
      if (val < 80) return 'AI Pattern matching...';
      return 'Finalizing reconciliation report...';
  };

  const handleReconcile = useCallback(async () => {
    if (!bankStatement || !ledger) {
      setError('Please upload both a bank statement and a general ledger.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const [bankStatementPart, ledgerPart] = await Promise.all([
        fileToGenerativePart(bankStatement),
        fileToGenerativePart(ledger),
      ]);
      
      const reconciliationResult = await reconcileFiles(bankStatementPart, ledgerPart, model, asAtDate);
      setProgress(100);
      setResult(reconciliationResult);
      setIsLoading(false);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during reconciliation.');
      setIsLoading(false);
    }
  }, [bankStatement, ledger, model, asAtDate]);

  const handleReset = useCallback(() => {
    setBankStatement(null);
    setLedger(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    setProgress(0);
  }, []);

  const handleLoadSampleData = useCallback(() => {
    const { bankFile, ledgerFile } = generateSampleData();
    setBankStatement(bankFile);
    setLedger(ledgerFile);
    if (!companyName) setCompanyName('Sample Logistics Ltd.');
    setAsAtDate('2024-03-31');
    setError(null);
  }, [companyName]);

  const handleDownloadSamplePdf = useCallback(() => {
    const { bankFile } = generateSampleData();
    triggerDownload(bankFile, bankFile.name);
  }, []);

  const handleDownloadSampleCsv = useCallback(() => {
    const { ledgerFile } = generateSampleData();
    triggerDownload(ledgerFile, ledgerFile.name);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full flex justify-center items-center min-h-[400px]">
           <ProgressBar progress={progress} message={getProgressMessage(progress)} />
        </div>
      );
    }

    if (result) {
      return <ReconciliationResults result={result} companyName={companyName} onReset={handleReset} />;
    }

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-gray-200 dark:border-slate-700 transition-colors duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col">
              <label htmlFor="company-name" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Company Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp Industries"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="as-at-date" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Reconciliation 'As At' Date
              </label>
              <input
                id="as-at-date"
                type="date"
                value={asAtDate}
                onChange={(e) => setAsAtDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FileUpload
              file={bankStatement}
              onFileSelect={setBankStatement}
              acceptedFileType=".pdf,.csv"
              label="Bank Statement"
              description="Upload PDF or CSV statement."
            />
            <FileUpload
              file={ledger}
              onFileSelect={setLedger}
              acceptedFileType=".xlsx,.xls,.csv,.pdf"
              label="General Ledger"
              description="Upload Excel, CSV or PDF ledger."
            />
          </div>

          <div className="flex flex-col items-center justify-center mt-6 gap-3">
             <button
                type="button"
                onClick={handleLoadSampleData}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors focus:outline-none"
             >
                No files? Load sample data to test
             </button>

             <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
                <button 
                  onClick={handleDownloadSamplePdf} 
                  className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                >
                  <DownloadIcon /> Sample Statement
                </button>
                <span className="text-gray-300 dark:text-slate-700">|</span>
                <button 
                  onClick={handleDownloadSampleCsv} 
                  className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                >
                  <DownloadIcon /> Sample Ledger
                </button>
             </div>
          </div>

          {error && <p className="text-red-500 dark:text-red-400 text-center mt-6">{error}</p>}
          <div className="mt-8 flex flex-col items-center justify-center gap-6">
            <div className="w-full max-w-xs">
              <ModelToggle selectedModel={model} onModelChange={setModel} />
            </div>
            <button
              onClick={handleReconcile}
              disabled={!bankStatement || !ledger || isLoading}
              className="px-12 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-slate-900"
            >
              Reconcile Files
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center font-sans transition-colors duration-300 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-4">
          <AppIcon />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-slate-100 transition-colors duration-300">
            Bank Reconciliation
          </h1>
        </div>
        <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto transition-colors duration-300">
          Upload your bank statement and general ledger to allow our app to automatically perform the reconciliation for you.
        </p>
      </div>
      {renderContent()}
    </div>
  );
};

export default App;
