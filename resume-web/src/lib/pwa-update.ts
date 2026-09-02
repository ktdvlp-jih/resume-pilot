import { registerSW } from 'virtual:pwa-register';

const UPDATE_POLL_MS = 5 * 60 * 1000;

/** 배포 직후 구버전 탭이 남아 있을 때 SW 갱신 → 자동 새로고침 */
export function initPwaUpdateReload() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        void registration.update();
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });

      window.setInterval(checkForUpdate, UPDATE_POLL_MS);
    },
  });
}
