import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { translateAdminApiError } from '../utils/translateApiError';
import {
  getPageHelpVideoKeysAPI,
  getPageHelpVideosAPI,
  upsertPageHelpVideoAPI,
  type PageHelpVideo,
} from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';

type RowState = {
  page_key: string;
  label: string;
  youtube_url: string;
  title_en: string;
  title_ar: string;
  is_active: boolean;
  dirty: boolean;
  saving: boolean;
};

const PageHelpVideosPanel: React.FC = () => {
  const { t } = useI18n();
  const { showAlert } = useAlert();
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, existing] = await Promise.all([
        getPageHelpVideoKeysAPI(),
        getPageHelpVideosAPI(),
      ]);
      const byKey = new Map<string, PageHelpVideo>(
        (existing.results || []).map((v) => [v.page_key, v]),
      );
      setRows(
        (keys || []).map((k) => {
          const cur = byKey.get(k.value);
          return {
            page_key: k.value,
            label: k.label,
            youtube_url: cur?.youtube_url || '',
            title_en: cur?.title_en || '',
            title_ar: cur?.title_ar || '',
            is_active: cur?.is_active ?? true,
            dirty: false,
            saving: false,
          };
        }),
      );
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showAlert, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (pageKey: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.page_key === pageKey ? { ...r, ...patch, dirty: true } : r,
      ),
    );
  };

  const saveRow = async (pageKey: string) => {
    const row = rows.find((r) => r.page_key === pageKey);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) => (r.page_key === pageKey ? { ...r, saving: true } : r)),
    );
    try {
      await upsertPageHelpVideoAPI({
        page_key: row.page_key,
        youtube_url: row.youtube_url.trim(),
        title_en: row.title_en.trim(),
        title_ar: row.title_ar.trim(),
        is_active: row.is_active && Boolean(row.youtube_url.trim()),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.page_key === pageKey ? { ...r, dirty: false, saving: false } : r,
        ),
      );
      showAlert(t('content.alerts.saved'), { variant: 'success' });
    } catch (error) {
      setRows((prev) =>
        prev.map((r) => (r.page_key === pageKey ? { ...r, saving: false } : r)),
      );
      showAlert(translateAdminApiError(error, t) || t('content.errors.save'), { variant: 'error' });
    }
  };

  const inputClasses =
    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  const hint = useMemo(() => t('content.tutorials.hint'), [t]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">{hint}</p>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">{t('content.tutorials.page')}</th>
                <th className="px-4 py-3">{t('content.fields.youtubeUrl')}</th>
                <th className="px-4 py-3">{t('content.fields.titleEn')}</th>
                <th className="px-4 py-3">{t('content.fields.titleAr')}</th>
                <th className="px-4 py-3 text-center">{t('content.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row) => (
                <tr key={row.page_key} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {(() => {
                      const key = `content.tutorials.pages.${row.page_key}`;
                      const translated = t(key);
                      return translated === key ? row.label : translated;
                    })()}
                  </td>
                  <td className="px-4 py-3 min-w-[220px]">
                    <input
                      className={inputClasses}
                      dir="ltr"
                      value={row.youtube_url}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => updateRow(row.page_key, { youtube_url: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <input
                      className={inputClasses}
                      dir="ltr"
                      value={row.title_en}
                      onChange={(e) => updateRow(row.page_key, { title_en: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <input
                      className={inputClasses}
                      dir="rtl"
                      value={row.title_ar}
                      onChange={(e) => updateRow(row.page_key, { title_ar: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={!row.dirty || row.saving}
                      onClick={() => void saveRow(row.page_key)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                    >
                      <Icon name="check" className="w-4 h-4" />
                      {row.saving ? t('common.saving') || 'Saving...' : t('common.save')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageHelpVideosPanel;
