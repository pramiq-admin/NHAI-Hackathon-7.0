// Verhoeff algorithm — used to validate 12-digit Aadhar checksum
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function normalizeAadhar(aadhar: string): string {
  return (aadhar || '').replace(/\D/g, '');
}

export function isValidAadhar(aadhar: string): boolean {
  const digits = normalizeAadhar(aadhar);
  if (digits.length !== 12) return false;
  if (digits[0] === '0' || digits[0] === '1') return false;
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[digits.length - 1 - i], 10);
    c = D[c][P[i % 8][d]];
  }
  return c === 0;
}

export function maskAadhar(aadhar: string): string {
  const n = normalizeAadhar(aadhar);
  if (n.length !== 12) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${n.slice(-4)}`;
}

export function formatAadharGrouped(aadhar: string): string {
  const n = normalizeAadhar(aadhar);
  if (n.length === 0) return '';
  return n.replace(/(.{4})/g, '$1 ').trim();
}

export function isValidIndianMobile(mobile: string): boolean {
  const n = (mobile || '').replace(/\D/g, '');
  if (n.length === 10) return /^[6-9]\d{9}$/.test(n);
  if (n.length === 12 && n.startsWith('91')) return /^91[6-9]\d{9}$/.test(n);
  if (n.length === 13 && n.startsWith('091')) return /^091[6-9]\d{9}$/.test(n);
  return false;
}

export function normalizeMobile(mobile: string): string {
  const n = (mobile || '').replace(/\D/g, '');
  if (n.length === 10) return n;
  if (n.length === 12 && n.startsWith('91')) return n.slice(2);
  if (n.length === 13 && n.startsWith('091')) return n.slice(3);
  return n;
}
