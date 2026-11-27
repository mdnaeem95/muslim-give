/** Field limits from spec 7.5 and 10.1. One place, so forms, schemas and the database agree. */
export const LIMITS = {
  profileName: 30,
  recipientName: 80,
  individualName: 40,
  occasionOther: 60,
  onBehalfName: 60,
  note: 120,
  reminderLabel: 40,
  eidPersonName: 40,
  receiptFileName: 100,
  receiptMaxBytes: 10 * 1024 * 1024,
  packetCountMax: 999,
  idMax: 100,
} as const;
