import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import RefreshButton from './RefreshButton';
import LoadingSpinner from './LoadingSpinner';
import { Plan, TrialCode, TrialCodeRedemption } from '../types';
import {
  TrialCodeBatchModal,
  TrialCodeCreateModal,
  TrialCodeDetailModal,
  type BatchFormState,
  type CreateFormState,
} from './TrialCodeModals';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { useAuditLog } from '../context/AuditLogContext';
import {
  createTrialCodeAPI,
  deactivateTrialCodeAPI,
  deleteTrialCodeAPI,
  exportUnusedTrialCodesAPI,
  generateTrialCodeBatchAPI,
  getPlansAPI,
  getTrialCodeRedemptionsAPI,
  getTrialCodesAPI,
} from '../services/api';
import AlertDialog from './AlertDialog';
import PaginationControls from './PaginationControls';
import { usePersistedPageSize } from '../hooks/usePersistedPageSize';
import { translateAdminApiError } from '../utils/translateApiError';

function mapTrialCodeFromApi(row: any): TrialCode {
  return {
    id: row.id,
    code: row.code,
    label: row.label || '',
    trialDays: row.trial_days,
    planId: row.plan,
    planName: row.plan_name || '',
    maxRedemptions: row.max_redemptions,
    redeemedCount: row.redeemed_count,
    isExhausted: Boolean(row.is_exhausted),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active !== false,
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

function mapRedemptionFromApi(row: any): TrialCodeRedemption {
  return {
    id: row.id,
    codeId: row.code,
    codeValue: row.code_value || '',
    companyId: row.company,
    companyName: row.company_name || '',
    subscriptionId: row.subscription,
    trialDays: row.trial_days,
    trialEndsAt: row.trial_ends_at,
    ownerEmail: row.owner_email || '',
    ownerName: row.owner_name || '',
    redeemedAt: row.redeemed_at,
  };
}

const TrialCodesTab: React.FC = () => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const { addLog } = useAuditLog();

  const [codes, setCodes] = useState<TrialCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('admin-trial-codes');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailCode, setDetailCode] = useState<TrialCode | null>(null);
  const [redemptions, setRedemptions] = useState<TrialCodeRedemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'delete'; code: TrialCode } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [exportLabel, setExportLabel] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  showToastRef.current = showToast;
  tRef.current = t;

  const paidPlans = useMemo(
    () => plans.filter((p) => p.priceMonthly > 0 || p.priceYearly > 0),
    [plans]
  );

  const exportableLabels = useMemo(
    () => [...new Set(codes.map((c) => c.label.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [codes]
  );

  const loadData = useCallback(async (page = currentPage, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    try {
      const [codesRes, plansRes] = await Promise.all([
        getTrialCodesAPI({
          page,
          page_size: pageSize,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        }),
        getPlansAPI(),
      ]);
      setTotalCount(codesRes.count || 0);
      setCodes((codesRes.results || []).map(mapTrialCodeFromApi));
      setPlans(
        (plansRes.results || []).map((plan: any) => ({
          id: plan.id,
          name: language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name,
          nameAr: plan.name_ar || '',
          type: 'Paid' as const,
          priceMonthly: parseFloat(plan.price_monthly || 0),
          priceYearly: parseFloat(plan.price_yearly || 0),
          trialDays: plan.trial_days || 0,
          users: plan.users ?? 'unlimited',
          clients: plan.clients ?? 'unlimited',
          features: plan.description || '',
          visible: plan.visible !== false,
        }))
      );
    } catch (error) {
      console.error('Error loading trial codes:', error);
      showToastRef.current(tRef.current('trialCodes.errors.load'), { variant: 'error' });
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [currentPage, language, pageSize, search, statusFilter]);

  useEffect(() => {
    void loadData(currentPage);
  }, [currentPage, search, statusFilter, pageSize, loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    if (exportLabel && !exportableLabels.includes(exportLabel)) {
      setExportLabel('');
    }
  }, [exportLabel, exportableLabels]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(t('trialCodes.copied'), { variant: 'success' });
    } catch {
      showToast(t('trialCodes.copyFailed'), { variant: 'error' });
    }
  };

  const handleCreate = async (form: CreateFormState) => {
    if (!form.planId) {
      showAlert(t('trialCodes.errors.planRequired'), { variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await createTrialCodeAPI({
        code: form.autoGenerate ? undefined : form.code.trim().toUpperCase(),
        label: form.label.trim(),
        trial_days: form.trialDays,
        plan: form.planId,
        max_redemptions: form.maxRedemptions,
        notes: form.notes.trim(),
      });
      addLog('audit.log.trialCodeCreated', { label: form.label || form.code });
      setIsCreateOpen(false);
      await loadData();
      showToast(t('trialCodes.created'), { variant: 'success' });
    } catch (error: any) {
      showAlert(translateAdminApiError(error, t) || t('trialCodes.errors.save'), { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatch = async (form: BatchFormState) => {
    if (!form.planId || !form.label.trim()) {
      showAlert(t('trialCodes.errors.batchFields'), { variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const result = await generateTrialCodeBatchAPI({
        label: form.label.trim(),
        trial_days: form.trialDays,
        plan: form.planId,
        quantity: form.quantity,
        notes: form.notes.trim(),
      });
      addLog('audit.log.trialCodeBatch', {
        label: form.label,
        count: String(result.created_count),
      });
      setIsBatchOpen(false);
      await loadData();
      showToast(
        t('trialCodes.batchCreated').replace('{count}', String(result.created_count)),
        { variant: 'success' }
      );
    } catch (error: any) {
      showAlert(translateAdminApiError(error, t) || t('trialCodes.errors.save'), { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsConfirming(true);
    try {
      if (confirmAction.type === 'deactivate') {
        await deactivateTrialCodeAPI(confirmAction.code.id);
        addLog('audit.log.trialCodeDeactivated', { code: confirmAction.code.code });
        showToast(t('trialCodes.deactivated'), { variant: 'success' });
      } else {
        await deleteTrialCodeAPI(confirmAction.code.id);
        addLog('audit.log.trialCodeDeleted', { code: confirmAction.code.code });
        showToast(t('trialCodes.deleted'), { variant: 'success' });
      }
      setConfirmAction(null);
      await loadData();
    } catch (error: any) {
      const fallback =
        confirmAction.type === 'delete' ? t('trialCodes.errors.delete') : t('trialCodes.errors.save');
      showAlert(translateAdminApiError(error, t) || fallback, { variant: 'error' });
    } finally {
      setIsConfirming(false);
    }
  };

  const openDetail = async (tc: TrialCode) => {
    setDetailCode(tc);
    setLoadingRedemptions(true);
    try {
      const rows = await getTrialCodeRedemptionsAPI(tc.id);
      setRedemptions((rows || []).map(mapRedemptionFromApi));
    } catch {
      setRedemptions([]);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleExportUnused = async () => {
    const label = exportLabel.trim();
    if (!label) {
      showAlert(t('trialCodes.errors.exportLabelRequired'), { variant: 'error' });
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportUnusedTrialCodesAPI(label);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial-codes-${label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert(translateAdminApiError(error, t) || t('trialCodes.errors.export'), { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar' : 'en');
  };

  const toolbarBtnBase =
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap';
  const toolbarFieldBase =
    'h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('trialCodes.search')}
            className={`${toolbarFieldBase} min-w-[12rem] flex-1 px-3`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${toolbarFieldBase} shrink-0 px-3`}
          >
            <option value="">{t('trialCodes.filterAll')}</option>
            <option value="active">{t('trialCodes.filterActive')}</option>
            <option value="inactive">{t('trialCodes.filterInactive')}</option>
            <option value="exhausted">{t('trialCodes.filterExhausted')}</option>
            <option value="expired">{t('trialCodes.filterExpired')}</option>
          </select>
          <RefreshButton onClick={() => void loadData(currentPage)} loading={isLoading} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            value={exportLabel}
            onChange={(e) => setExportLabel(e.target.value)}
            disabled={exportableLabels.length === 0}
            className={`${toolbarFieldBase} min-w-[10rem] max-w-[14rem] shrink-0 px-3 text-gray-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={t('trialCodes.exportSelectCampaign')}
          >
            <option value="">{t('trialCodes.exportSelectCampaign')}</option>
            {exportableLabels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleExportUnused()}
            disabled={!exportLabel.trim() || isExporting}
            className={`${toolbarBtnBase} border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50`}
            title={t('trialCodes.exportUnused')}
          >
            <Icon name="download" className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('trialCodes.exportUnused')}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className={`${toolbarBtnBase} border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm`}
          >
            <Icon name="layers" className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('trialCodes.generateBatch')}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={`${toolbarBtnBase} bg-primary-600 text-white hover:bg-primary-700 shadow-sm`}
          >
            <Icon name="plus" className="h-4 w-4 shrink-0" />
            {t('trialCodes.create')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colCode')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colLabel')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colPlan')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colDays')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colUsage')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colValid')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colStatus')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && codes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner label={t('common.loading')} />
                    </div>
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('trialCodes.empty')}
                  </td>
                </tr>
              ) : (
                codes.map((tc) => (
                  <tr
                    key={tc.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  >
                    <td className="px-6 py-4 text-center font-mono">
                      <button
                        type="button"
                        onClick={() => void handleCopy(tc.code)}
                        className="inline-flex items-center justify-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
                        title={t('trialCodes.copy')}
                      >
                        {tc.code}
                        <Icon name="copy" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">{tc.label || '—'}</td>
                    <td className="px-6 py-4 text-center">{tc.planName}</td>
                    <td className="px-6 py-4 text-center">{tc.trialDays}</td>
                    <td className="px-6 py-4 text-center">
                      {tc.redeemedCount} / {tc.maxRedemptions}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      {formatDate(tc.startsAt)} → {formatDate(tc.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          !tc.isActive
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            : tc.isExhausted
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {!tc.isActive
                          ? t('trialCodes.statusInactive')
                          : tc.isExhausted
                            ? t('trialCodes.statusExhausted')
                            : t('trialCodes.statusActive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void openDetail(tc)}
                          className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          title={t('trialCodes.viewRedemptions')}
                        >
                          <Icon name="eye" className="h-5 w-5 shrink-0" />
                        </button>
                        {tc.isActive && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: 'deactivate', code: tc })}
                            className="p-2 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            title={t('trialCodes.deactivate')}
                          >
                            <Icon name="ban" className="h-5 w-5 shrink-0" />
                          </button>
                        )}
                        {tc.redeemedCount === 0 && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: 'delete', code: tc })}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('trialCodes.delete')}
                          >
                            <Icon name="trash" className="h-5 w-5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          disabled={isLoading}
        />
      </div>

      <TrialCodeCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={(form) => void handleCreate(form)}
        isLoading={isSaving}
        paidPlans={paidPlans}
      />

      <TrialCodeBatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onSave={(form) => void handleBatch(form)}
        isLoading={isSaving}
        paidPlans={paidPlans}
      />

      <TrialCodeDetailModal
        code={detailCode}
        redemptions={redemptions}
        isOpen={Boolean(detailCode)}
        onClose={() => setDetailCode(null)}
        isLoading={loadingRedemptions}
      />

      <AlertDialog
        isOpen={confirmAction !== null}
        onClose={() => {
          if (!isConfirming) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === 'delete'
            ? t('trialCodes.deleteConfirmTitle')
            : t('trialCodes.deactivateConfirmTitle')
        }
        message={
          confirmAction?.type === 'delete'
            ? t('trialCodes.deleteConfirm')
            : t('trialCodes.deactivateConfirm')
        }
        type="warning"
        showCancel
        cancelText={t('common.cancel')}
        confirmText={
          isConfirming
            ? confirmAction?.type === 'delete'
              ? t('common.deleting')
              : t('common.updating')
            : confirmAction?.type === 'delete'
              ? t('common.delete')
              : t('trialCodes.deactivate')
        }
        onConfirm={() => void handleConfirmAction()}
        disabled={isConfirming}
      />
    </div>
  );
};

export default TrialCodesTab;
