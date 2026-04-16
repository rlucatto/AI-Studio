import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOrderId(id: number): string {
  return id.toString().padStart(10, '0');
}

export function formatSequence(seq: number): string {
  return seq.toString().padStart(3, '0');
}
