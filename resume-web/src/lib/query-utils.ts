/** API·React Query에서 null/undefined list·string 방어 */

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: string | null | undefined): string {
  return value ?? '';
}

export function asRecord<T extends Record<string, unknown>>(value: T | null | undefined): T {
  return value && typeof value === 'object' ? value : ({} as T);
}
