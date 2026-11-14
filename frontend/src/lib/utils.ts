import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatGen(amountWei: string | number | bigint, decimals = 3): string {
  try {
    const wei = BigInt(amountWei || '0');
    const factor = BigInt(10 ** 18);
    const intPart = wei / factor;
    const remainder = wei % factor;
    const decPart = remainder.toString().padStart(18, '0').slice(0, decimals).replace(/0+$/, '');
    return decPart ? `${intPart}.${decPart}` : `${intPart}`;
  } catch {
    return '0';
  }
}

export function parseGenToWei(amountGen: string): bigint {
  try {
    const trimmed = amountGen.trim();
    if (!trimmed || isNaN(Number(trimmed))) return BigInt(0);
    const [intPart, decPart = ''] = trimmed.split('.');
    const padded = decPart.padEnd(18, '0').slice(0, 18);
    return BigInt(`${intPart}${padded}`);
  } catch {
    return BigInt(0);
  }
}
