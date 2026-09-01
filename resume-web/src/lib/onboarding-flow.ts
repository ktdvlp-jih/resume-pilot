import { useSyncExternalStore } from 'react';

export const ONBOARDING_FLOW_DONE_KEY = 'rp-onboarding-done';
const CHANGE_EVENT = 'rp-onboarding-flow-changed';

export function isOnboardingFlowDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_FLOW_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingFlowDone(): void {
  try {
    localStorage.setItem(ONBOARDING_FLOW_DONE_KEY, '1');
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

/** 1분 시작 플로우를 아직 마치지 않았을 때만 true (사이드바·배너 노출용) */
export function useOnboardingFlowPending(): boolean {
  return !useSyncExternalStore(subscribe, isOnboardingFlowDone, () => false);
}
