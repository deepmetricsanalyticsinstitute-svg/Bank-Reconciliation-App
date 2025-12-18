
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReconciliationResult, Transaction, MatchedPair, PdfExportConfig } from '../types';

const formatCurrencyForPdf = (amount: number) => {
    return `GHS ${new Intl.NumberFormat('en-GH', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)}`;
};

export const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const generateCsv = (result: ReconciliationResult, companyName: string) => {
    const { summary } = result;
    const toCsvRow = (arr: (string | number)[]) => arr.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    
    let csvContent = "";
    if (companyName) csvContent += `Company Name,${companyName}\n`;
    csvContent += "Reconciliation Report\n";
    csvContent += `Generated on,${new Date().toLocaleString()}\n\n`;

    csvContent += "Summary\n";
    csvContent += toCsvRow(["Metric", "Transaction Count", "Net Value (GHS)"]) + "\n";
    csvContent += toCsvRow(["Successfully Matched", summary.matchedCount, summary.matchedTotal]) + "\n";
    csvContent += toCsvRow(["Outstanding Bank Items", summary.unmatchedBankCount, summary.unmatchedBankTotal]) + "\n";
    csvContent += toCsvRow(["Outstanding Ledger Items", summary.unmatchedLedgerCount, summary.unmatchedLedgerTotal]) + "\n\n";

    const safeCompanyName = companyName ? companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : '';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${safeCompanyName}reconciliation_report_${new Date().toISOString().split('T')[0]}.csv`);
};

export const generatePdf = (
  result: ReconciliationResult, 
  companyName: string, 
  config: PdfExportConfig,
  selectedBankIndices?: Set<number>,
  selectedLedgerIndices?: Set<number>
) => {
    const { summary, matchedTransactions, unmatchedBankTransactions, unmatchedLedgerEntries } = result;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // --- Colors ---
    const colors = {
        headerBlue: [30, 64, 175],
        sectionText: [5, 150, 105],
        summaryHeader: [30, 41, 59],
        matchesHeader: [16, 185, 129],
        unmatchedBankHeader: [245, 158, 11],
        unmatchedLedgerHeader: [99, 102, 241],
        textMain: [31, 41, 55],
        textLight: [107, 114, 128],
        lineGray: [229, 231, 235]
    };

    // 1. TOP HEADER BAR
    doc.setFillColor(colors.headerBlue[0], colors.headerBlue[1], colors.headerBlue[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // 2. HEADER TEXT
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text("Reconciliation Report", margin, 22);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName || "Financial Report", margin, 32);

    doc.setFontSize(8);
    doc.text("Classification: Protected", pageWidth - margin, 18, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 24, { align: 'right' });

    let currentY = 55;

    // 3. EXECUTIVE SUMMARY
    if (config.includeSummary) {
      doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("1. Executive Summary", margin, currentY);
      currentY += 8;

      autoTable(doc, {
          startY: currentY,
          head: [['Metric', 'Transaction Count', 'Net Value (GHS)']],
          body: [
              ['Successfully Matched', summary.matchedCount, formatCurrencyForPdf(summary.matchedTotal)],
              ['Outstanding Bank Items', summary.unmatchedBankCount, formatCurrencyForPdf(summary.unmatchedBankTotal)],
              ['Outstanding Ledger Items', summary.unmatchedLedgerCount, formatCurrencyForPdf(summary.unmatchedLedgerTotal)],
          ],
          theme: 'grid',
          headStyles: { fillColor: colors.summaryHeader, textColor: 255, fontSize: 10, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 5, textColor: colors.textMain },
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 4. VERIFIED MATCHES
    if (config.includeMatches && matchedTransactions.length > 0) {
      if (currentY > pageHeight - 40) { doc.addPage(); currentY = 20; }
      doc.setTextColor(colors.sectionText[0], colors.sectionText[1], colors.sectionText[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`2. Verified Matches (${matchedTransactions.length})`, margin, currentY);
      currentY += 8;

      autoTable(doc, {
          startY: currentY,
          head: [['Bank Date', 'Statement Narrative', 'Ledger Date', 'Internal Reference', 'Amount']],
          body: matchedTransactions.map((p: MatchedPair) => [
              p.bankTransaction.date,
              p.bankTransaction.description,
              p.ledgerTransaction.date,
              p.ledgerTransaction.description,
              formatCurrencyForPdf(p.bankTransaction.amount)
          ]),
          theme: 'grid',
          headStyles: { fillColor: colors.matchesHeader, textColor: 255, fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 4, textColor: colors.textMain },
          columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 5. UNMATCHED BANK ITEMS
    if (config.includeUnmatchedBank) {
      const bankList = config.onlySelectedItems && selectedBankIndices
        ? unmatchedBankTransactions.filter((_, i) => selectedBankIndices.has(i))
        : unmatchedBankTransactions;

      if (bankList.length > 0) {
        if (currentY > pageHeight - 40) { doc.addPage(); currentY = 20; }
        doc.setTextColor(217, 119, 6);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`3. Unmatched Bank Items (${bankList.length})${config.onlySelectedItems ? ' [Filtered]' : ''}`, margin, currentY);
        currentY += 8;

        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Transaction Description', 'Value']],
            body: bankList.map((tx: Transaction) => [
                tx.date,
                tx.description,
                formatCurrencyForPdf(tx.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: colors.unmatchedBankHeader, textColor: 255, fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 4, textColor: colors.textMain },
            columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: margin, right: margin }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    // 6. UNMATCHED LEDGER ENTRIES
    if (config.includeUnmatchedLedger) {
      const ledgerList = config.onlySelectedItems && selectedLedgerIndices
        ? unmatchedLedgerEntries.filter((_, i) => selectedLedgerIndices.has(i))
        : unmatchedLedgerEntries;

      if (ledgerList.length > 0) {
        if (currentY > pageHeight - 40) { doc.addPage(); currentY = 20; }
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`4. Unmatched Ledger Entries (${ledgerList.length})${config.onlySelectedItems ? ' [Filtered]' : ''}`, margin, currentY);
        currentY += 8;

        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'General Ledger Description', 'Value']],
            body: ledgerList.map((tx: Transaction) => [
                tx.date,
                tx.description,
                formatCurrencyForPdf(tx.amount)
            ]),
            theme: 'grid',
            headStyles: { fillColor: colors.unmatchedLedgerHeader, textColor: 255, fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 4, textColor: colors.textMain },
            columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: margin, right: margin }
        });
      }
    }

    // FOOTER
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(colors.lineGray[0], colors.lineGray[1], colors.lineGray[2]);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.text(`${companyName || "Financial"} Report`, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Export Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const safeCompanyName = companyName ? companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : '';
    doc.save(`${safeCompanyName}reconciliation_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
