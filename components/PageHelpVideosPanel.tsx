import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingButton from './LoadingButton';
import { useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import {
  getPageHelpVideoKeysAPI,
  getPageHelpVideosAPI,
  upsertPageHelpVideoAPI,
  deletePageHelpVideoAPI,
  type PageHelpVideo,
} from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';
import AlertDialog from './AlertDialog';
import IconButton from './IconButton';

type RowState = {
  page_key: string;
  label: string;
  youtube_url: string;
  title_en: string;
  title_ar: string;
  is_active: boolean;
  dirty: boolean;
  saving: boolean;
  persisted: boolean;
};

const PageHelpVideosPanel: React.FC = () => {
  const { t } = useI18n();
  const translate = (key: string) => {
    const value = t(key);
    return value && value !== key ? value : undefined;
  };
  const { showToast } = useToast();
  const [rows, setRows] = useState<RowState[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RowState | null>(null);
  const [deleting, setDeleting] = useState(false);

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
            persisted: Boolean(cur),
          };
        }),
      );
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

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

  const valuesFor = (row: RowState) => ({
    page_key: row.page_key,
    youtube_url: row.youtube_url,
    title_en: row.title_en,
  });

  const blurRowField = (row: RowState, field: string) => {
    const next = catalogFieldErrors('page_help_video.upsert', valuesFor(row), translate);
    setRowErrors((prev) => {
      const current = { ...(prev[row.page_key] || {}) };
      if (next[field]) current[field] = next[field];
      else delete current[field];
      return { ...prev, [row.page_key]: current };
    });
  };

  const saveRow = async (pageKey: string) => {
    const row = rows.find((r) => r.page_key === pageKey);
    if (!row) return;
    const next = catalogFieldErrors('page_help_video.upsert', valuesFor(row), translate);
    setRowErrors((prev) => ({ ...prev, [pageKey]: next }));
    if (Object.keys(next).length > 0) return;
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
      showToast(t('content.alerts.saved'), { variant: 'success' });
      setRows((prev) =>
        prev.map((r) =>
          r.page_key === pageKey ? { ...r, persisted: true } : r,
        ),
      );
    } catch (error) {
      setRows((prev) =>
        prev.map((r) => (r.page_key === pageKey ? { ...r, saving: false } : r)),
      );
      const serverErrors = serverFieldErrors(error, 'page_help_video.upsert', translate);
      if (Object.keys(serverErrors).length > 0) {
        setRowErrors((prev) => ({ ...prev, [pageKey]: { ...(prev[pageKey] || {}), ...serverErrors } }));
      } else {
        showToast(translateAdminApiError(error, t) || t('content.errors.save'), { variant: 'error' });
      }
    }
  };

  const inputClasses =
    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  const hint = useMemo(() => t('content.tutorials.hint'), [t]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePageHelpVideoAPI(deleteTarget.page_key);
      setRows((prev) =>
        prev.map((r) =>
          r.page_key === deleteTarget.page_key
            ? {
                ...r,
                youtube_url: '',
                title_en: '',
                title_ar: '',
                is_active: false,
                dirty: false,
                persisted: false,
              }
            : r,
        ),
      );
      setDeleteTarget(null);
      showToast(t('content.tutorials.deleted'), { variant: 'success' });
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('content.errors.delete'), { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

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
                      onBlur={(e) => blurRowField({ ...row, youtube_url: e.target.value }, 'youtubeUrl')}
                    />
                    {rowErrors[row.page_key]?.youtubeUrl && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[row.page_key].youtubeUrl}</p>
                    )}
                    {rowErrors[row.page_key]?._general && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[row.page_key]._general}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <input
                      className={inputClasses}
                      dir="ltr"
                      value={row.title_en}
                      onChange={(e) => updateRow(row.page_key, { title_en: e.target.value })}
                      onBlur={(e) => blurRowField({ ...row, title_en: e.target.value }, 'title')}
                    />
                    {rowErrors[row.page_key]?.title && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rowErrors[row.page_key].title}</p>
                    )}
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
                    <div className="inline-flex items-center justify-center gap-1">
                      <LoadingButton
                        type="button"
                        size="sm"
                        icon="check"
                        disabled={!row.dirty}
                        isLoading={row.saving}
                        loadingText={t('common.saving')}
                        onClick={() => void saveRow(row.page_key)}
                      >
                        {t('common.save')}
                      </LoadingButton>
                      {row.persisted ? (
                        <IconButton icon="trash" label={t('common.delete')} tone="danger" onClick={() => setDeleteTarget(row)} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AlertDialog
        isOpen={!!deleteTarget}
        title={t('content.tutorials.deleteTitle')}
        message={t('content.tutorials.deleteMessage')}
        type="warning"
        showCancel
        confirmText={deleting ? t('common.deleting') : t('common.delete')}
        cancelText={t('common.cancel')}
        disabled={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PageHelpVideosPanel;
