import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { NewsPost } from '../types';
import { useI18n } from '../context/i18n';
import { withLatinDigits } from '../utils/latinNumerals';

export type NewsNotifyChannel = 'push' | 'email' | 'both';

interface NewsNotifyModalProps {
  isOpen: boolean;
  news: NewsPost | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (channels: NewsNotifyChannel) => void;
}

const CHANNELS: Array<{
  id: NewsNotifyChannel;
  icon: string;
  titleKey: string;
  descKey: string;
}> = [
  {
    id: 'both',
    icon: 'send',
    titleKey: 'content.notify.channels.both',
    descKey: 'content.notify.channels.bothDesc',
  },
  {
    id: 'push',
    icon: 'bell',
    titleKey: 'content.notify.channels.push',
    descKey: 'content.notify.channels.pushDesc',
  },
  {
    id: 'email',
    icon: 'mail',
    titleKey: 'content.notify.channels.email',
    descKey: 'content.notify.channels.emailDesc',
  },
];

const NewsNotifyModal: React.FC<NewsNotifyModalProps> = ({
  isOpen,
  news,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const { t, language } = useI18n();
  const [channels, setChannels] = useState<NewsNotifyChannel>('both');

  useEffect(() => {
    if (isOpen) {
      setChannels('both');
    }
  }, [isOpen, news?.id]);

  if (!isOpen || !news) return null;

  const title = language === 'ar' ? news.title_ar || news.title_en : news.title_en || news.title_ar;

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString(
        language === 'ar' ? 'ar-EG' : 'en-GB',
        withLatinDigits({
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    } catch {
      return value;
    }
  };

  const alreadyNotified = Boolean(news.notified_at);
  const lastChannelLabel = news.last_notify_channels
    ? t(`content.notify.channels.${news.last_notify_channels}`)
    : '';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-notify-title"
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start gap-3">
          <div>
            <h2
              id="news-notify-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('content.notify.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            aria-label={t('common.close') || 'Close'}
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('content.notify.subtitle')}</p>

          {alreadyNotified && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100">
              {t('content.notify.alreadyNotified')
                .replace('{date}', formatDate(news.notified_at))
                .replace('{channels}', lastChannelLabel || '—')}
            </div>
          )}

          <div className="space-y-2" role="radiogroup" aria-label={t('content.notify.chooseChannel')}>
            {CHANNELS.map((option) => {
              const selected = channels === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isLoading}
                  onClick={() => setChannels(option.id)}
                  className={`w-full text-start rounded-lg border px-3.5 py-3 transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-900/30 dark:border-primary-400'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon name={option.icon} className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                        {t(option.titleKey)}
                      </span>
                      <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {t(option.descKey)}
                      </span>
                    </span>
                    <span
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                        selected
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm(channels)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Icon name="send" className="w-4 h-4 rtl:-scale-x-100" />
            {isLoading
              ? t('content.notify.sending')
              : alreadyNotified
                ? t('content.notify.sendAgain')
                : t('content.notify.send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsNotifyModal;
