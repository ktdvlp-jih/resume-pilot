import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-load';

// React lazy()와 동일한 제네릭 — 페이지별 props(embedded 등) 허용
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForChunkError()) {
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
