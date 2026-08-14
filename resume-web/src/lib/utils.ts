import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** LLM/JSON이 배열 대신 문자열을 줘도 join이 깨지지 않게 한다. */
export function joinList(value: unknown, separator = ', '): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(separator);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}
