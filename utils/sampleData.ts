import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateSampleData = () => {
  // 1. Generate Bank Statement PDF
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text("Global Bank", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("123 Financial District, New York, NY", 14, 26);
  doc.text("Statement Period: March 1, 2024 - March 31, 2024", 14, 32);
  doc.text("Account: 8888-1234-5678", 14, 37);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(14, 40, 196, 40);

  // Table Data
  // Scenario: 
  // - Match 1: Tech Solutions (Exact)
  // - Match 2: Acme Corp (Exact)
  // - Match 3: Office Supplies (Close match on description)
  // - Unmatched Bank: Service Fee
  const head = [['Date', 'Description', 'Withdrawals', 'Deposits', 'Balance']];
  const body = [
    ['2024-03-01', 'Opening Balance', '', '', '5,000.00'],
    ['2024-03-03', 'INV-2024-001 Tech Solutions', '1,250.00', '', '3,750.00'],
    ['2024-03-05', 'Client Payment - Acme Corp', '', '3,500.00', '7,250.00'],
    ['2024-03-10', 'Monthly Service Fee', '25.00', '', '7,225.00'], // Unmatched in Ledger
    ['2024-03-15', 'Office Supplies Depot', '145.50', '', '7,079.50'],
  ];

  autoTable(doc, {
    startY: 45,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80] },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  const pdfBlob = doc.output('blob');
  const bankFile = new File([pdfBlob], "Sample_Bank_Statement.pdf", { type: "application/pdf" });

  // 2. Generate Ledger CSV
  // Scenario:
  // - Match 1: Payment to Tech Sol (Matches 1250.00)
  // - Match 2: Deposit Acme Corp (Matches 3500.00)
  // - Match 3: Supplies - Office Depot (Matches 145.50)
  // - Unmatched Ledger: Check #5055 (Uncleared)
  const csvContent = 
`Date,Description,Amount,Reference
2024-03-03,Payment to Tech Sol,-1250.00,EXP-500
2024-03-05,Deposit Acme Corp,3500.00,INC-100
2024-03-15,Supplies - Office Depot,-145.50,EXP-200
2024-03-28,Check #5055 Consultant,-500.00,EXP-600`;

  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  const ledgerFile = new File([csvBlob], "Sample_General_Ledger.csv", { type: "text/csv" });

  return { bankFile, ledgerFile };
};