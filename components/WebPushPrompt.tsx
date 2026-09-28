import React, { useEffect, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  isWebPushConfigured,
  isWebPushReady,
  requestWebPushPermission,
} from '../services/webPush';

const DISMISS_KEY = 'webPushPromptDismissed';

/**
 * Modal shown after login when browser push is configured but not enabled.
 * Browsers require a click for Notification.requestPermission — this is that
 * gesture surface. "Not now" dismisses for the session only.
 */
const WebPushPrompt: React.FC = () => {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<'error' | 'denied' | null>(null);

  useEffect(() => {
    if (!isWebPushConfigured()) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted' || isWebPushReady()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    // Small delay so the shell paints before the modal.
    const id = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;

  const permission =
    typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  const blocked = permission === 'denied';

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const onEnable = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const ok = await requestWebPushPermission();
      if (ok) {
        setOpen(false);
        return;
      }
      setFeedback(Notification.permission === 'denied' ? 'denied' : 'error');
    } catch {
      setFeedback('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-push-prompt-title"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <h3
          id="web-push-prompt-title"
          className="mb-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          {t('webPush.title')}
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {blocked ? t('webPush.blockedHint') : t('webPush.promptHint')}
        </p>
        {feedback === 'error' ? (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{t('webPush.enableFailed')}</p>
        ) : null}
        {feedback === 'denied' ? (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{t('webPush.blockedHint')}</p>
        ) : null}
        <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t('webPush.notNow')}
          </button>
          {blocked ? null : (
            <button
              type="button"
              onClick={() => void onEnable()}
              disabled={busy}
              className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {busy ? t('common.processing') : t('webPush.enable')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebPushPrompt;
