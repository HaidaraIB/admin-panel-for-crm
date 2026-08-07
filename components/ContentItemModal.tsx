import React, { useEffect, useState } from 'react';
import { GuideArticle, GuideCategory, NewsPost } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import Icon from './Icon';

export type ContentKind = 'guide' | 'news';

export type ContentFormData = {
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  summary_en: string;
  summary_ar: string;
  slug: string;
  category_id: number | null;
  sort_order: number;
  is_published: boolean;
  youtube_url: string;
  cover_image: File | null;
};

interface ContentItemModalProps {
  isOpen: boolean;
  kind: ContentKind;
  editingGuide?: GuideArticle | null;
  editingNews?: NewsPost | null;
  categories?: GuideCategory[];
  initialBody?: { body_en: string; body_ar: string; summary_en?: string; summary_ar?: string };
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: ContentFormData) => void;
}

const YOUTUBE_HOST_RE =
  /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\b/i;

const emptyForm = (): ContentFormData => ({
  title_en: '',
  title_ar: '',
  body_en: '',
  body_ar: '',
  summary_en: '',
  summary_ar: '',
  slug: '',
  category_id: null,
  sort_order: 0,
  is_published: false,
  youtube_url: '',
  cover_image: null,
});

const ContentItemModal: React.FC<ContentItemModalProps> = ({
  isOpen,
  kind,
  editingGuide,
  editingNews,
  categories = [],
  initialBody,
  isLoading = false,
  onClose,
  onSave,
}) => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState<ContentFormData>(emptyForm());
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (kind === 'guide' && editingGuide) {
      setFormData({
        title_en: editingGuide.title_en || '',
        title_ar: editingGuide.title_ar || '',
        body_en: initialBody?.body_en ?? editingGuide.body_en ?? '',
        body_ar: initialBody?.body_ar ?? editingGuide.body_ar ?? '',
        summary_en: '',
        summary_ar: '',
        slug: editingGuide.slug || '',
        category_id: editingGuide.category?.id ?? editingGuide.category_id ?? null,
        sort_order: editingGuide.sort_order ?? 0,
        is_published: !!editingGuide.is_published,
        youtube_url: editingGuide.youtube_url || '',
        cover_image: null,
      });
      setCoverPreview(editingGuide.cover_image_url || null);
    } else if (kind === 'news' && editingNews) {
      setFormData({
        title_en: editingNews.title_en || '',
        title_ar: editingNews.title_ar || '',
        body_en: initialBody?.body_en ?? editingNews.body_en ?? '',
        body_ar: initialBody?.body_ar ?? editingNews.body_ar ?? '',
        summary_en: initialBody?.summary_en ?? editingNews.summary_en ?? '',
        summary_ar: initialBody?.summary_ar ?? editingNews.summary_ar ?? '',
        slug: '',
        category_id: null,
        sort_order: 0,
        is_published: !!editingNews.is_published,
        youtube_url: editingNews.youtube_url || '',
        cover_image: null,
      });
      setCoverPreview(editingNews.cover_image_url || null);
    } else {
      setFormData(emptyForm());
      setCoverPreview(null);
    }
  }, [isOpen, kind, editingGuide, editingNews, initialBody]);

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'sort_order') {
      setFormData((prev) => ({ ...prev, sort_order: parseInt(value, 10) || 0 }));
      return;
    }
    if (name === 'category_id') {
      setFormData((prev) => ({
        ...prev,
        category_id: value ? parseInt(value, 10) : null,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const categoryLabel = (cat: GuideCategory) =>
    language === 'ar' ? cat.name_ar || cat.name_en : cat.name_en || cat.name_ar;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, cover_image: file }));
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_en.trim() || !formData.title_ar.trim()) {
      showAlert(t('content.validation.titlesRequired'), { variant: 'warning' });
      return;
    }
    if (!formData.body_en.trim() || !formData.body_ar.trim()) {
      showAlert(t('content.validation.bodiesRequired'), { variant: 'warning' });
      return;
    }
    const yt = formData.youtube_url.trim();
    if (yt && !YOUTUBE_HOST_RE.test(yt)) {
      showAlert(t('content.validation.youtubeInvalid'), { variant: 'warning' });
      return;
    }
    onSave(formData);
  };

  const isEdit = kind === 'guide' ? !!editingGuide : !!editingNews;
  const title =
    kind === 'guide'
      ? isEdit
        ? t('content.guide.editTitle')
        : t('content.guide.addTitle')
      : isEdit
        ? t('content.news.editTitle')
        : t('content.news.addTitle');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t('content.fields.titleEn')}</label>
              <input
                name="title_en"
                value={formData.title_en}
                onChange={handleChange}
                className={inputClasses}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClasses}>{t('content.fields.titleAr')}</label>
              <input
                name="title_ar"
                value={formData.title_ar}
                onChange={handleChange}
                className={inputClasses}
                dir="rtl"
              />
            </div>
          </div>

          {kind === 'news' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('content.fields.summaryEn')}</label>
                <textarea
                  name="summary_en"
                  value={formData.summary_en}
                  onChange={handleChange}
                  rows={2}
                  className={inputClasses}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClasses}>{t('content.fields.summaryAr')}</label>
                <textarea
                  name="summary_ar"
                  value={formData.summary_ar}
                  onChange={handleChange}
                  rows={2}
                  className={inputClasses}
                  dir="rtl"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t('content.fields.bodyEn')}</label>
              <textarea
                name="body_en"
                value={formData.body_en}
                onChange={handleChange}
                rows={8}
                className={inputClasses}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClasses}>{t('content.fields.bodyAr')}</label>
              <textarea
                name="body_ar"
                value={formData.body_ar}
                onChange={handleChange}
                rows={8}
                className={inputClasses}
                dir="rtl"
              />
            </div>
          </div>

          {kind === 'guide' && (
            <>
              <div>
                <label className={labelClasses}>{t('content.fields.category')}</label>
                <select
                  name="category_id"
                  value={formData.category_id ?? ''}
                  onChange={handleChange}
                  className={inputClasses}
                >
                  <option value="">{t('content.fields.categoryNone')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>{t('content.fields.slug')}</label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className={inputClasses}
                    dir="ltr"
                    placeholder={t('content.fields.slugHint')}
                  />
                </div>
                <div>
                  <label className={labelClasses}>{t('content.fields.sortOrder')}</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleChange}
                    className={inputClasses}
                    min={0}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className={labelClasses}>{t('content.fields.youtubeUrl')}</label>
            <input
              name="youtube_url"
              value={formData.youtube_url}
              onChange={handleChange}
              className={inputClasses}
              dir="ltr"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className={labelClasses}>{t('content.fields.coverImage')}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {coverPreview && (
              <img
                src={coverPreview}
                alt=""
                className="mt-2 h-24 w-auto rounded-md object-cover border border-gray-200 dark:border-gray-600"
              />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('content.fields.published')}
            </span>
          </label>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? t('common.saving') || 'Saving...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentItemModal;
