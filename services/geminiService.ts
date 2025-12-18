
import { GoogleGenAI, Type } from "@google/genai";
import type { ReconciliationResult } from '../types';

if (!process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT') {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.OBJECT,
      description: "Summary metrics and closing balances.",
      properties: {
        ledgerBalance: { type: Type.NUMBER, description: "Final closing balance per General Ledger" },
        bankBalance: { type: Type.NUMBER, description: "Final closing balance per Bank Statement" },
        asAtDate: { type: Type.STRING, description: "The date of the reconciliation (YYYY-MM-DD)" },
      },
      required: ["ledgerBalance", "bankBalance", "asAtDate"]
    },
    matchedTransactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          bankTransaction: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["credit", "debit"] }
            }
          },
          ledgerTransaction: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["credit", "debit"] }
            }
          }
        }
      }
    },
    unmatchedBankTransactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ["credit", "debit"], description: "credit=deposit, debit=withdrawal" }
        }
      }
    },
    unmatchedLedgerEntries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ["credit", "debit"] }
        }
      }
    }
  }
};

interface FilePart {
  mimeType: string;
  data: string;
}

export const reconcileFiles = async (
  bankStatementPart: FilePart,
  ledgerPart: FilePart,
  modelType: 'flash' | 'pro',
  targetAsAtDate: string
): Promise<ReconciliationResult> => {
  const model = modelType === 'pro' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

  const systemInstruction = `You are a precision Forensic Accountant AI. Reconcile a Bank Statement with a General Ledger (Spreadsheet/Excel/PDF).

  **TARGET DATE**: Perform reconciliation AS AT: ${targetAsAtDate}. 
  Ignore any transactions after this date.

  **CRITICAL RULES**:
  1. **TRANSACTION TYPES**: 
     - Bank: "Credit" = Deposit, "Debit" = Withdrawal.
     - Ledger: "Debit" = Receipt (Cash In), "Credit" = Payment (Cash Out).
  
  2. **CLOSING BALANCES**: 
     - Extract balances specifically as at ${targetAsAtDate}.

  3. **SPEED & PRECISION**: Work quickly. Output ONLY JSON. Use absolute positive values for 'amount'.
  `;

  const prompt = `Reconcile these documents for the period ending ${targetAsAtDate}. Compare values exactly.`;

  const config: any = {
    responseMimeType: 'application/json',
    responseSchema: responseSchema,
    // Maximize speed for Flash by disabling unnecessary thinking
    ...(modelType === 'flash' ? { thinkingConfig: { thinkingBudget: 0 } } : {})
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: bankStatementPart.mimeType, data: bankStatementPart.data } },
            { inlineData: { mimeType: ledgerPart.mimeType, data: ledgerPart.data } },
          ],
        },
      ],
      config: config,
      systemInstruction: systemInstruction,
    });
    
    const rawResult = JSON.parse(response.text.trim());

    // Sanitization & Recalculation
    const parseAmount = (val: any) => Math.abs(parseFloat(val) || 0);

    const matchedTransactions = (rawResult.matchedTransactions || []).map((p: any) => ({
      bankTransaction: { ...p.bankTransaction, amount: parseAmount(p.bankTransaction.amount) },
      ledgerTransaction: { ...p.ledgerTransaction, amount: parseAmount(p.ledgerTransaction.amount) }
    }));

    const unmatchedBankTransactions = (rawResult.unmatchedBankTransactions || []).map((t: any) => ({
      ...t, amount: parseAmount(t.amount)
    }));

    const unmatchedLedgerEntries = (rawResult.unmatchedLedgerEntries || []).map((t: any) => ({
      ...t, amount: parseAmount(t.amount)
    }));

    const summary = {
      ...rawResult.summary,
      matchedCount: matchedTransactions.length,
      unmatchedBankCount: unmatchedBankTransactions.length,
      unmatchedLedgerCount: unmatchedLedgerEntries.length,
      matchedTotal: matchedTransactions.reduce((s: number, i: any) => s + i.bankTransaction.amount, 0),
      unmatchedBankTotal: unmatchedBankTransactions.reduce((s: number, i: any) => s + i.amount, 0),
      unmatchedLedgerTotal: unmatchedLedgerEntries.reduce((s: number, i: any) => s + i.amount, 0),
    };

    return { summary, matchedTransactions, unmatchedBankTransactions, unmatchedLedgerEntries };
  } catch (error) {
    throw new Error(`Reconciliation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
