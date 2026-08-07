import React, { useCallback, useEffect, useState } from 'react';
import { GuideCategory } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { translateAdminApiError } from '../utils/translateApiError';
import {
  createGuideCategoryAPI,
  deleteGuideCategoryAPI,
  getGuideCategoriesAPI,
  updateGuideCategoryAPI,
} from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import Icon from './Icon';
import AlertDialog from './AlertDialog';

type CategoryForm = {
  name_en: string;
  name_ar: string;
  sort_order: number;
};

const emptyForm = (): CategoryForm => ({
  name_en: '',
  name_ar: '',
  sort_order: 0,
});

interface GuideCategoriesPanelProps {
  onCategoriesChange?: (categories: GuideCategory[]) => void;
}

const GuideCategoriesPanel: React.FC<GuideCategoriesPanelProps> = ({
  onCategoriesChange,
}) => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [editing, setEditing] = useState<GuideCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GuideCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGuideCategoriesAPI({ ordering: 'sort_order' });
      const list = res.results || [];
      setCategories(list);
      onCategoriesChange?.(list);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [onCategoriesChange, showAlert, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = (item: GuideCategory) =>
    language === 'ar' ? item.name_ar || item.name_en : item.name_en || item.name_ar;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      sort_order: categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0,
    });
    setModalOpen(true);
  };

  const openEdit = (item: GuideCategory) => {
    setEditing(item);
    setForm({
      name_en: item.name_en || '',
      name_ar: item.name_ar || '',
      sort_order: item.sort_order ?? 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_en.trim() || !form.name_ar.trim()) {
      showAlert(t('content.categories.namesRequired'), { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name_en: form.name_en.trim(),
        name_ar: form.name_ar.trim(),
        sort_order: form.sort_order,
      };
      if (editing) {
        await updateGuideCategoryAPI(editing.id, payload);
      } else {
        await createGuideCategoryAPI(payload);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
      showAlert(t('content.alerts.saved'), { variant: 'success' });
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.save'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGuideCategoryAPI(deleteTarget.id);
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) closeModal();
      await load();
      showAlert(t('content.alerts.deleted'), { variant: 'success' });
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.delete'), {
        variant: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const inputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
            {t('content.categories.title')}
          </span>
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : categories.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {t('content.categories.empty')}
            </span>
          ) : (
            categories.map((item) => (
              <span
                key={item.id}
                className="group inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 ps-3 pe-1 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-100"
              >
                <span className="max-w-[10rem] truncate">{displayName(item)}</span>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-blue-600 dark:hover:bg-gray-600 dark:hover:text-blue-300"
                  title={t('common.edit') || 'Edit'}
                >
                  <Icon name="edit" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-red-600 dark:hover:bg-gray-600 dark:hover:text-red-300"
                  title={t('common.delete') || 'Delete'}
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Icon name="plus" className="w-4 h-4" />
          {t('content.categories.add')}
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? t('content.categories.editTitle') : t('content.categories.addTitle')}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={saving}
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSave(e)} className="space-y-4 p-5">
              <div>
                <label className={labelClasses}>{t('content.fields.nameEn')}</label>
                <input
                  value={form.name_en}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                  className={inputClasses}
                  dir="ltr"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClasses}>{t('content.fields.nameAr')}</label>
                <input
                  value={form.name_ar}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                  className={inputClasses}
                  dir="rtl"
                />
              </div>
              <div>
                <label className={labelClasses}>{t('content.fields.sortOrder')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={inputClasses}
                />
              </div>
              <div className="flex gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  disabled={saving}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t('common.saving') || 'Saving...' : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={!!deleteTarget}
        title={t('content.categories.deleteTitle')}
        message={t('content.categories.deleteMessage').replace(
          '{title}',
          deleteTarget ? displayName(deleteTarget) : '',
        )}
        type="warning"
        showCancel
        confirmText={deleting ? t('common.deleting') || 'Deleting...' : t('common.delete') || 'Delete'}
        cancelText={t('common.cancel')}
        disabled={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default GuideCategoriesPanel;
