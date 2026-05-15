/** Dane przelewu na fakturze inFakt + w mailu / na stronie podziękowania. */

const DEFAULT_BANK_NAME = "MBANK - JAKUB";
const DEFAULT_BANK_ACCOUNT_COMPACT =
  "PL03114020040000310284588269";

export function compactBankAccount(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function formatIbanSpaced(compact: string): string {
  const c = compactBankAccount(compact);
  return c.replace(/(.{4})/g, "$1 ").trim();
}

export function getInvoiceTransferConfig(): {
  bankName: string;
  bankAccountCompact: string;
} {
  const bankName =
    process.env.INFAKT_INVOICE_BANK_NAME?.trim() || DEFAULT_BANK_NAME;
  const rawAccount =
    process.env.INFAKT_INVOICE_BANK_ACCOUNT?.trim() ||
    DEFAULT_BANK_ACCOUNT_COMPACT;
  return {
    bankName,
    bankAccountCompact: compactBankAccount(rawAccount),
  };
}

/** Pola żądania POST /invoices.json (inFakt v3). */
export function infaktInvoiceTransferFields(): {
  payment_method: "transfer";
  bank_name: string;
  bank_account: string;
} {
  const { bankName, bankAccountCompact } = getInvoiceTransferConfig();
  return {
    payment_method: "transfer",
    bank_name: bankName,
    bank_account: bankAccountCompact,
  };
}
