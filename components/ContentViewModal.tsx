import React from 'react';
import { GuideArticle, NewsPost } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import { withLatinDigits } from '../utils/latinNumerals';

export type ContentViewKind = 'guide' | 'news';

interface ContentViewModalProps {
  isOpen: boolean;
  kind: ContentViewKind;
  guide?: GuideArticle | null;
  news?: NewsPost | null;
  isLoading?: boolean;
  onClose: () => void;
}

const ContentViewModal: React.FC<ContentViewModalProps> = ({
  isOpen,
  kind,
  guide,
  news,
  isLoading = false,
  onClose,
}) => {
  const { t, language } = useI18n();

  if (!isOpen) return null;

  const item = kind === 'guide' ? guide : news;
  const labelClasses = 'block text-sm font-medium mb-1 text-gray-500 dark:text-gray-400';
  const valueClasses = 'text-gray-900 dark:text-white whitespace-pre-wrap';

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(
        language === 'ar' ? 'ar-EG' : 'en-GB',
        withLatinDigits({ year: 'numeric', month: 'short', day: 'numeric' }),
      );
    } catch {
      return value;
    }
  };

  const isPublished = !!item?.is_published;
  const coverUrl = item?.cover_image_url;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {kind === 'guide' ? t('content.view.guideTitle') : t('content.view.newsTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading || !item ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt=""
                  className="w-full max-h-56 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                />
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                    isPublished
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isPublished ? t('content.status.published') : t('content.status.draft')}
                </span>
                {kind === 'guide' && guide && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('content.fields.sortOrder')}: {guide.sort_order}
                    {guide.slug ? ` · ${guide.slug}` : ''}
                  </span>
                )}
                {kind === 'news' && news?.published_at && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('content.table.publishedAt')}: {formatDate(news.published_at)}
                  </span>
                )}
                {kind === 'news' && (news?.is_notified || news?.notified_at) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                    <Icon name="check" className="w-3.5 h-3.5" />
                    {t('content.status.notified')}
                    {news?.notified_at ? ` · ${formatDate(news.notified_at)}` : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>{t('content.fields.titleEn')}</label>
                  <p className={valueClasses} dir="ltr">
                    {item.title_en}
                  </p>
                </div>
                <div>
                  <label className={labelClasses}>{t('content.fields.titleAr')}</label>
                  <p className={valueClasses} dir="rtl">
                    {item.title_ar}
                  </p>
                </div>
              </div>

              {kind === 'news' && news && (news.summary_en || news.summary_ar) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>{t('content.fields.summaryEn')}</label>
                    <p className={valueClasses} dir="ltr">
                      {news.summary_en || '—'}
                    </p>
                  </div>
                  <div>
                    <label className={labelClasses}>{t('content.fields.summaryAr')}</label>
                    <p className={valueClasses} dir="rtl">
                      {news.summary_ar || '—'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>{t('content.fields.bodyEn')}</label>
                  <p className={valueClasses} dir="ltr">
                    {item.body_en || '—'}
                  </p>
                </div>
                <div>
                  <label className={labelClasses}>{t('content.fields.bodyAr')}</label>
                  <p className={valueClasses} dir="rtl">
                    {item.body_ar || '—'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                {t('content.table.updated')}: {formatDate(item.updated_at)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentViewModal;
