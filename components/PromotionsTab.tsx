import React, { useCallback, useEffect, useState } from 'react';
import type { Plan, Promotion, PromotionStatus } from '../types';
import { useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { useAuditLog } from '../context/AuditLogContext';
import { translateAdminApiError } from '../utils/translateApiError';
import {
  createPromotionAPI,
  deletePromotionAPI,
  duplicatePromotionAPI,
  getPlansAPI,
  getPromotionsAPI,
  updatePromotionAPI,
  type PromotionPayload,
} from '../services/api';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from './DataTable';
import { Badge } from './telephony/shared';
import IconButton from './IconButton';
import LoadingButton from './LoadingButton';
import LoadingSpinner from './LoadingSpinner';
import RefreshButton from './RefreshButton';
import AlertDialog from './AlertDialog';
import Toggle from './Toggle';
import Icon from './Icon';
import PromotionModal, { type PromotionDraft } from './PromotionModal';
import { PROMO_THEMES } from './pricing/PromoBarView';
import { formatDateTimeShort } from '../utils/datetime';
import { planOfferFromApi } from '../utils/planOffer';

const STATUS_TONE: Record<PromotionStatus, 'green' | 'blue' | 'gray' | 'amber'> = {
  live: 'green',
  scheduled: 'blue',
  ended: 'gray',
  paused: 'amber',
};

const toDraft = (p: Promotion): PromotionDraft => {
  const { status: _s, created_at: _c, updated_at: _u, ...rest } = p;
  return rest;
};

/** Super Admin list + editor for the pricing promotion bar. */
const PromotionsTab: React.FC = () => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const { addLog } = useAuditLog();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<PromotionDraft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promos, planPage] = await Promise.all([getPromotionsAPI(), getPlansAPI()]);
      setRows(promos);
      setPlans(
        ((planPage as any)?.results || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          nameAr: p.name_ar || '',
          type: Number(p.price_monthly) > 0 || Number(p.price_yearly) > 0 ? 'Paid' : 'Free',
          ...planOfferFromApi(p),
        })) as Plan[],
      );
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('subscriptions.promotions.loadError'), { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };
  const openEdit = (p: Promotion) => {
    setEditing(toDraft(p));
    setIsModalOpen(true);
  };

  const handleSave = async (payload: PromotionPayload, id?: number) => {
    setIsSaving(true);
    try {
      if (id) {
        await updatePromotionAPI(id, payload);
        addLog('audit.log.promotionUpdated', { name: payload.name || '' });
      } else {
        await createPromotionAPI(payload);
        addLog('audit.log.promotionCreated', { name: payload.name || '' });
      }
      setIsModalOpen(false);
      showToast(t('subscriptions.promotions.saveSuccess'), { variant: 'success' });
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (p: Promotion, next: boolean) => {
    setBusyId(p.id);
    try {
      await updatePromotionAPI(p.id, { is_active: next });
      await load();
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('subscriptions.promotions.saveError'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (p: Promotion) => {
    setBusyId(p.id);
    try {
      await duplicatePromotionAPI(p.id);
      showToast(t('subscriptions.promotions.duplicated'), { variant: 'success' });
      await load();
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('subscriptions.promotions.saveError'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deletePromotionAPI(toDelete.id);
      addLog('audit.log.promotionDeleted', { name: toDelete.name });
      showToast(t('subscriptions.promotions.deleteSuccess'), { variant: 'success' });
      setToDelete(null);
      await load();
    } catch (error) {
      showToast(translateAdminApiError(error, t) || t('subscriptions.promotions.deleteError'), { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const windowLabel = (p: Promotion) => {
    const start = formatDateTimeShort(p.starts_at, language);
    const end = p.ends_at ? formatDateTimeShort(p.ends_at, language) : t('subscriptions.promotions.noEnd');
    return (
      <span dir="auto" className="whitespace-nowrap text-xs">
        {start} → {end}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('subscriptions.promotions.title')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={() => void load()} loading={isLoading} />
          <LoadingButton size="toolbar" icon="plus" onClick={openCreate}>
            {t('subscriptions.promotions.create')}
          </LoadingButton>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
        <div className="overflow-x-auto">
          <DataTable>
            <TableHead>
              <Th>{t('subscriptions.promotions.colName')}</Th>
              <Th>{t('subscriptions.promotions.colStatus')}</Th>
              <Th>{t('subscriptions.promotions.colWindow')}</Th>
              <Th>{t('subscriptions.promotions.colAudiences')}</Th>
              <Th>{t('subscriptions.promotions.colPriority')}</Th>
              <Th>{t('subscriptions.promotions.colActive')}</Th>
              <Th>{t('common.actions')}</Th>
            </TableHead>
            <TableBody>
              {isLoading && rows.length === 0 ? (
                <TableMessageRow colSpan={7}>
                  <div className="flex justify-center">
                    <LoadingSpinner label={t('common.loading')} />
                  </div>
                </TableMessageRow>
              ) : rows.length === 0 ? (
                <TableMessageRow colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                      <Icon name="megaphone" className="h-6 w-6" />
                    </span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{t('subscriptions.promotions.emptyTitle')}</p>
                    <p className="max-w-md text-sm">{t('subscriptions.promotions.emptyBody')}</p>
                    <LoadingButton size="sm" icon="plus" onClick={openCreate}>
                      {t('subscriptions.promotions.create')}
                    </LoadingButton>
                  </div>
                </TableMessageRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <Td>
                      <div className="flex items-center justify-center gap-2">
                        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${PROMO_THEMES[p.theme]?.bar || ''}`} />
                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                      </div>
                      <div className="mx-auto mt-0.5 max-w-[18rem] truncate text-xs" dir="auto">
                        {language === 'ar' ? p.messages[0]?.ar : p.messages[0]?.en}
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status]}>{t(`subscriptions.promotions.status.${p.status}`)}</Badge>
                    </Td>
                    <Td>{windowLabel(p)}</Td>
                    <Td>
                      <div className="flex flex-wrap justify-center gap-1">
                        {p.audiences.map((a) => (
                          <Badge key={a} tone="gray">{t(`subscriptions.promotions.audienceShort.${a}`)}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td><span dir="ltr">{p.priority}</span></Td>
                    <Td>
                      <div className="flex justify-center">
                        <Toggle
                          id={`promo_row_active_${p.id}`}
                          checked={p.is_active}
                          disabled={busyId === p.id}
                          onChange={(v) => void handleToggleActive(p, v)}
                          label={`${t('subscriptions.promotions.active')}: ${p.name}`}
                          hideLabel
                        />
                      </div>
                    </Td>
                    <Td>
                      <TableActions>
                        <IconButton icon="edit" label={t('common.edit')} onClick={() => openEdit(p)} />
                        <IconButton icon="copy" label={t('subscriptions.promotions.duplicate')} disabled={busyId === p.id} onClick={() => void handleDuplicate(p)} />
                        <IconButton icon="trash" tone="danger" label={t('common.delete')} onClick={() => setToDelete(p)} />
                      </TableActions>
                    </Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </div>
      </div>

      <PromotionModal
        isOpen={isModalOpen}
        initial={editing}
        onClose={() => !isSaving && setIsModalOpen(false)}
        onSave={handleSave}
        isSaving={isSaving}
        others={rows}
        plans={plans}
      />
      <AlertDialog
        isOpen={!!toDelete}
        onClose={() => !isDeleting && setToDelete(null)}
        title={t('subscriptions.promotions.deleteTitle')}
        message={t('subscriptions.promotions.deleteConfirm').replace('{name}', toDelete?.name || '')}
        type="warning"
        showCancel
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        loading={isDeleting}
        disabled={isDeleting}
      />
    </div>
  );
};

export default PromotionsTab;
