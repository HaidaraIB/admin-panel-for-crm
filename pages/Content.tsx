import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import RefreshButton from '../components/RefreshButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ContentItemModal, { ContentFormData, ContentKind } from '../components/ContentItemModal';
import ContentViewModal from '../components/ContentViewModal';
import NewsNotifyModal, { NewsNotifyChannel } from '../components/NewsNotifyModal';
import AlertDialog from '../components/AlertDialog';
import { GuideArticle, NewsPost } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { ADMIN_PAGE_TAB_ACTIVE, ADMIN_PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { withLatinDigits } from '../utils/latinNumerals';
import {
  getGuideArticlesAPI,
  getGuideArticleAPI,
  createGuideArticleAPI,
  updateGuideArticleAPI,
  deleteGuideArticleAPI,
  getNewsPostsAPI,
  getNewsPostAPI,
  createNewsPostAPI,
  updateNewsPostAPI,
  deleteNewsPostAPI,
  notifyNewsPostAPI,
} from '../services/api';

type TabId = 'guide' | 'news';

const Content: React.FC = () => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = localStorage.getItem('content_activeTab');
    return saved === 'news' || saved === 'guide' ? saved : 'guide';
  });
  const [guides, setGuides] = useState<GuideArticle[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewingGuide, setViewingGuide] = useState<GuideArticle | null>(null);
  const [viewingNews, setViewingNews] = useState<NewsPost | null>(null);
  const [editingGuide, setEditingGuide] = useState<GuideArticle | null>(null);
  const [editingNews, setEditingNews] = useState<NewsPost | null>(null);
  const [detailBodies, setDetailBodies] = useState<{
    body_en: string;
    body_ar: string;
    summary_en?: string;
    summary_ar?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: ContentKind; id: number; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<NewsPost | null>(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    localStorage.setItem('content_activeTab', activeTab);
  }, [activeTab]);

  const loadGuide = useCallback(async () => {
    const res = await getGuideArticlesAPI({ ordering: 'sort_order' });
    setGuides(res.results || []);
  }, []);

  const loadNews = useCallback(async () => {
    const res = await getNewsPostsAPI({ ordering: '-published_at' });
    setNews(res.results || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadGuide(), loadNews()]);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [loadGuide, loadNews, showAlert, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openCreate = () => {
    setEditingGuide(null);
    setEditingNews(null);
    setDetailBodies(null);
    setModalOpen(true);
  };

  const openViewGuide = async (item: GuideArticle) => {
    setViewingNews(null);
    setViewingGuide(item);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const detail = await getGuideArticleAPI(item.id);
      setViewingGuide(detail);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const openViewNews = async (item: NewsPost) => {
    setViewingGuide(null);
    setViewingNews(item);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const detail = await getNewsPostAPI(item.id);
      setViewingNews(detail);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const openEditGuide = async (item: GuideArticle) => {
    setEditingNews(null);
    setEditingGuide(item);
    setDetailBodies(null);
    setModalOpen(true);
    try {
      const detail = await getGuideArticleAPI(item.id);
      setDetailBodies({
        body_en: detail.body_en || '',
        body_ar: detail.body_ar || '',
      });
      setEditingGuide(detail);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
    }
  };

  const openEditNews = async (item: NewsPost) => {
    setEditingGuide(null);
    setEditingNews(item);
    setDetailBodies(null);
    setModalOpen(true);
    try {
      const detail = await getNewsPostAPI(item.id);
      setDetailBodies({
        body_en: detail.body_en || '',
        body_ar: detail.body_ar || '',
        summary_en: detail.summary_en || '',
        summary_ar: detail.summary_ar || '',
      });
      setEditingNews(detail);
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.load'), { variant: 'error' });
    }
  };

  const handleSave = async (form: ContentFormData) => {
    setSaving(true);
    try {
      if (activeTab === 'guide') {
        const payload = {
          title_en: form.title_en.trim(),
          title_ar: form.title_ar.trim(),
          body_en: form.body_en,
          body_ar: form.body_ar,
          slug: form.slug.trim() || undefined,
          sort_order: form.sort_order,
          is_published: form.is_published,
          cover_image: form.cover_image || undefined,
        };
        if (editingGuide) {
          await updateGuideArticleAPI(editingGuide.id, payload);
        } else {
          await createGuideArticleAPI(payload);
        }
        await loadGuide();
      } else {
        const payload = {
          title_en: form.title_en.trim(),
          title_ar: form.title_ar.trim(),
          summary_en: form.summary_en,
          summary_ar: form.summary_ar,
          body_en: form.body_en,
          body_ar: form.body_ar,
          is_published: form.is_published,
          cover_image: form.cover_image || undefined,
        };
        if (editingNews) {
          await updateNewsPostAPI(editingNews.id, payload);
        } else {
          await createNewsPostAPI(payload);
        }
        await loadNews();
      }
      setModalOpen(false);
      showAlert(t('content.alerts.saved'), { variant: 'success' });
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.save'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (kind: ContentKind, id: number, next: boolean) => {
    try {
      if (kind === 'guide') {
        await updateGuideArticleAPI(id, { is_published: next });
        await loadGuide();
      } else {
        await updateNewsPostAPI(id, { is_published: next });
        await loadNews();
      }
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.save'), { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'guide') {
        await deleteGuideArticleAPI(deleteTarget.id);
        await loadGuide();
      } else {
        await deleteNewsPostAPI(deleteTarget.id);
        await loadNews();
      }
      setDeleteTarget(null);
      showAlert(t('content.alerts.deleted'), { variant: 'success' });
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.errors.delete'), { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleNotifyOwners = async (channels: NewsNotifyChannel) => {
    if (!notifyTarget) return;
    setNotifying(true);
    try {
      await notifyNewsPostAPI(notifyTarget.id, channels);
      setNotifyTarget(null);
      await loadNews();
      showAlert(t('content.notify.success'), { variant: 'success' });
    } catch (error) {
      showAlert(translateAdminApiError(error, t) || t('content.notify.error'), { variant: 'error' });
    } finally {
      setNotifying(false);
    }
  };

  const displayTitle = (en: string, ar: string) => (language === 'ar' ? ar || en : en || ar);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(
        language === 'ar' ? 'ar-EG' : 'en-GB',
        withLatinDigits({
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('content.title')}
        </h1>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => void loadAll()} loading={loading} />
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            <Icon name="plus" className="w-4 h-4" />
            {activeTab === 'guide' ? t('content.guide.add') : t('content.news.add')}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 text-sm ${activeTab === 'guide' ? ADMIN_PAGE_TAB_ACTIVE : ADMIN_PAGE_TAB_INACTIVE}`}
          >
            {t('content.tabs.guide')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`pb-3 text-sm ${activeTab === 'news' ? ADMIN_PAGE_TAB_ACTIVE : ADMIN_PAGE_TAB_INACTIVE}`}
          >
            {t('content.tabs.news')}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : activeTab === 'guide' ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 text-center">{t('content.table.title')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.order')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.status')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.updated')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {guides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('content.empty.guide')}
                    </td>
                  </tr>
                ) : (
                  guides.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-6 py-4 text-center text-gray-900 dark:text-gray-100">
                        {displayTitle(item.title_en, item.title_ar)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                        {String(item.sort_order)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => void handleTogglePublish('guide', item.id, !item.is_published)}
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            item.is_published
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.is_published ? t('content.status.published') : t('content.status.draft')}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openViewGuide(item)}
                            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            title={t('common.view') || 'View'}
                          >
                            <Icon name="view" className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void openEditGuide(item)}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title={t('common.edit') || 'Edit'}
                          >
                            <Icon name="edit" className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'guide',
                                id: item.id,
                                title: displayTitle(item.title_en, item.title_ar),
                              })
                            }
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400"
                            title={t('common.delete') || 'Delete'}
                          >
                            <Icon name="trash" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 text-center">{t('content.table.title')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.status')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.notified')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.publishedAt')}</th>
                  <th className="px-6 py-3 text-center">{t('content.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {news.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('content.empty.news')}
                    </td>
                  </tr>
                ) : (
                  news.map((item) => {
                    const isNotified = Boolean(item.is_notified || item.notified_at);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-6 py-4 text-center text-gray-900 dark:text-gray-100">
                          {displayTitle(item.title_en, item.title_ar)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => void handleTogglePublish('news', item.id, !item.is_published)}
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              item.is_published
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {item.is_published ? t('content.status.published') : t('content.status.draft')}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isNotified ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                              title={formatDate(item.notified_at)}
                            >
                              <Icon name="check" className="w-3.5 h-3.5" />
                              {t('content.status.notified')}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">
                          {formatDate(item.published_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openViewNews(item)}
                              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                              title={t('common.view') || 'View'}
                            >
                              <Icon name="view" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              disabled={!item.is_published}
                              onClick={() => setNotifyTarget(item)}
                              className={`p-2 rounded-md ${
                                item.is_published
                                  ? 'text-violet-600 hover:text-violet-800 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30'
                                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }`}
                              title={
                                item.is_published
                                  ? t('content.notify.action')
                                  : t('content.notify.publishFirst')
                              }
                            >
                              <Icon name="bell" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void openEditNews(item)}
                              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title={t('common.edit') || 'Edit'}
                            >
                              <Icon name="edit" className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'news',
                                  id: item.id,
                                  title: displayTitle(item.title_en, item.title_ar),
                                })
                              }
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400"
                              title={t('common.delete') || 'Delete'}
                            >
                              <Icon name="trash" className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ContentItemModal
        isOpen={modalOpen}
        kind={activeTab}
        editingGuide={editingGuide}
        editingNews={editingNews}
        initialBody={detailBodies || undefined}
        isLoading={saving}
        onClose={() => setModalOpen(false)}
        onSave={(data) => void handleSave(data)}
      />

      <ContentViewModal
        isOpen={viewOpen}
        kind={viewingGuide ? 'guide' : 'news'}
        guide={viewingGuide}
        news={viewingNews}
        isLoading={viewLoading}
        onClose={() => {
          setViewOpen(false);
          setViewingGuide(null);
          setViewingNews(null);
        }}
      />

      <NewsNotifyModal
        isOpen={!!notifyTarget}
        news={notifyTarget}
        isLoading={notifying}
        onClose={() => {
          if (!notifying) setNotifyTarget(null);
        }}
        onConfirm={(channels) => void handleNotifyOwners(channels)}
      />

      <AlertDialog
        isOpen={!!deleteTarget}
        title={t('content.delete.title')}
        message={t('content.delete.message').replace('{title}', deleteTarget?.title || '')}
        type="warning"
        showCancel
        confirmText={deleting ? t('common.deleting') || 'Deleting...' : t('common.delete') || 'Delete'}
        cancelText={t('common.cancel')}
        disabled={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Content;
