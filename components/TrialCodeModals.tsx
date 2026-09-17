import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import LoadingButton from './LoadingButton';
import LoadingSpinner from './LoadingSpinner';
import { Checkbox } from './Checkbox';
import { NumberInput } from './NumberInput';
import { Plan, TrialCode, TrialCodeRedemption } from '../types';
import { useI18n } from '../context/i18n';
import { withLatinDigits } from '../utils/latinNumerals';

const inputClasses =
  'w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';

type CreateFormState = {
  code: string;
  label: string;
  trialDays: number;
  planId: number;
  maxRedemptions: number;
  notes: string;
  autoGenerate: boolean;
};

type BatchFormState = {
  label: string;
  trialDays: number;
  planId: number;
  quantity: number;
  notes: string;
};

const emptyCreateForm = (defaultPlanId: number): CreateFormState => ({
  code: '',
  label: '',
  trialDays: 14,
  planId: defaultPlanId,
  maxRedemptions: 1,
  notes: '',
  autoGenerate: true,
});

const emptyBatchForm = (defaultPlanId: number): BatchFormState => ({
  label: '',
  trialDays: 14,
  planId: defaultPlanId,
  quantity: 10,
  notes: '',
});

interface TrialCodeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: CreateFormState) => void;
  isLoading?: boolean;
  paidPlans: Plan[];
}

export const TrialCodeCreateModal: React.FC<TrialCodeCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  paidPlans,
}) => {
  const { t } = useI18n();
  const defaultPlanId = paidPlans[0]?.id ?? 0;
  const [formData, setFormData] = useState<CreateFormState>(() => emptyCreateForm(defaultPlanId));

  useEffect(() => {
    if (isOpen) {
      setFormData(emptyCreateForm(paidPlans[0]?.id ?? 0));
    }
  }, [isOpen, paidPlans]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'planId' ? Number(value) : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsed = parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('trialCodes.createTitle')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <Checkbox
              id="trialCodeAutoGenerate"
              checked={formData.autoGenerate}
              onChange={(e) => setFormData((prev) => ({ ...prev, autoGenerate: e.target.checked }))}
              label={t('trialCodes.autoGenerate')}
            />

            {!formData.autoGenerate && (
              <div>
                <label htmlFor="trialCodeValue" className={labelClasses}>{t('trialCodes.fieldCode')}</label>
                <input
                  id="trialCodeValue"
                  name="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  className={`${inputClasses} font-mono`}
                  maxLength={32}
                />
              </div>
            )}

            <div>
              <label htmlFor="trialCodeLabel" className={labelClasses}>{t('trialCodes.fieldLabel')}</label>
              <input
                id="trialCodeLabel"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="trialCodePlan" className={labelClasses}>{t('trialCodes.fieldPlan')}</label>
              <select
                id="trialCodePlan"
                name="planId"
                value={formData.planId}
                onChange={handleInputChange}
                className={inputClasses}
                required
              >
                {paidPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="trialCodeDays" className={labelClasses}>{t('trialCodes.fieldDays')}</label>
                <NumberInput
                  id="trialCodeDays"
                  name="trialDays"
                  value={formData.trialDays}
                  onChange={handleNumberChange}
                  min={1}
                  max={365}
                />
              </div>
              <div>
                <label htmlFor="trialCodeMaxUses" className={labelClasses}>{t('trialCodes.fieldMaxUses')}</label>
                <NumberInput
                  id="trialCodeMaxUses"
                  name="maxRedemptions"
                  value={formData.maxRedemptions}
                  onChange={handleNumberChange}
                  min={1}
                />
              </div>
            </div>

            <div>
              <label htmlFor="trialCodeNotes" className={labelClasses}>{t('trialCodes.fieldNotes')}</label>
              <textarea
                id="trialCodeNotes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <LoadingButton type="button" onClick={onClose} variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </LoadingButton>
            <LoadingButton type="submit" variant="primary" isLoading={isLoading} loadingText={t('common.saving')}>
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TrialCodeBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: BatchFormState) => void;
  isLoading?: boolean;
  paidPlans: Plan[];
}

export const TrialCodeBatchModal: React.FC<TrialCodeBatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  paidPlans,
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<BatchFormState>(() =>
    emptyBatchForm(paidPlans[0]?.id ?? 0)
  );

  useEffect(() => {
    if (isOpen) {
      setFormData(emptyBatchForm(paidPlans[0]?.id ?? 0));
    }
  }, [isOpen, paidPlans]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'planId' ? Number(value) : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsed = parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('trialCodes.batchTitle')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="batchLabel" className={labelClasses}>{t('trialCodes.fieldLabel')}</label>
              <input
                id="batchLabel"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="batchPlan" className={labelClasses}>{t('trialCodes.fieldPlan')}</label>
              <select
                id="batchPlan"
                name="planId"
                value={formData.planId}
                onChange={handleInputChange}
                className={inputClasses}
                required
              >
                {paidPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="batchDays" className={labelClasses}>{t('trialCodes.fieldDays')}</label>
                <NumberInput
                  id="batchDays"
                  name="trialDays"
                  value={formData.trialDays}
                  onChange={handleNumberChange}
                  min={1}
                  max={365}
                />
              </div>
              <div>
                <label htmlFor="batchQuantity" className={labelClasses}>{t('trialCodes.fieldQuantity')}</label>
                <NumberInput
                  id="batchQuantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleNumberChange}
                  min={1}
                  max={500}
                />
              </div>
            </div>

            <div>
              <label htmlFor="batchNotes" className={labelClasses}>{t('trialCodes.fieldNotes')}</label>
              <textarea
                id="batchNotes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <LoadingButton type="button" onClick={onClose} variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </LoadingButton>
            <LoadingButton type="submit" variant="primary" isLoading={isLoading} loadingText={t('common.saving')}>
              {t('trialCodes.generateBatch')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TrialCodeDetailModalProps {
  code: TrialCode | null;
  redemptions: TrialCodeRedemption[];
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

const detailLabelClasses = 'block text-sm font-medium mb-1 text-gray-500 dark:text-gray-400';
const detailValueClasses = 'text-gray-900 dark:text-white';

export const TrialCodeDetailModal: React.FC<TrialCodeDetailModalProps> = ({
  code,
  redemptions,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  const { t, language } = useI18n();
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    }
  }, [isOpen]);

  if (!isOpen || !code) return null;

  const handleCopyCode = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(
        language === 'ar' ? 'ar-EG' : 'en-GB',
        withLatinDigits({ year: 'numeric', month: 'short', day: 'numeric' }),
      );
    } catch {
      return '—';
    }
  };

  const statusLabel = !code.isActive
    ? t('trialCodes.statusInactive')
    : code.isExhausted
      ? t('trialCodes.statusExhausted')
      : t('trialCodes.statusActive');

  const statusClass = !code.isActive
    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    : code.isExhausted
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';

  const validityFrom = code.startsAt ? formatDate(code.startsAt) : t('trialCodes.unlimited');
  const validityTo = code.expiresAt ? formatDate(code.expiresAt) : t('trialCodes.unlimited');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('trialCodes.detailTitle')}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-4">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <span className="text-2xl font-bold font-mono tracking-wide text-gray-900 dark:text-white break-all">
                {code.code}
              </span>
              <button
                type="button"
                onClick={(event) => void handleCopyCode(event)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-500 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                title={t('trialCodes.copy')}
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 shrink-0" />
                {copied ? t('trialCodes.copied') : t('trialCodes.copy')}
              </button>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 ${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.colLabel')}</label>
              <p className={detailValueClasses}>{code.label || '—'}</p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.colPlan')}</label>
              <p className={detailValueClasses}>{code.planName}</p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.colDays')}</label>
              <p className={detailValueClasses}>
                {code.trialDays} {t('trialCodes.days')}
              </p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.colUsage')}</label>
              <p className={detailValueClasses}>
                {code.redeemedCount} / {code.maxRedemptions}
              </p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.validFrom')}</label>
              <p className={detailValueClasses}>{validityFrom}</p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.validTo')}</label>
              <p className={detailValueClasses}>{validityTo}</p>
            </div>
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.fieldCreated')}</label>
              <p className={detailValueClasses}>{formatDate(code.createdAt)}</p>
            </div>
          </div>

          {code.notes?.trim() && (
            <div>
              <label className={detailLabelClasses}>{t('trialCodes.fieldNotes')}</label>
              <div className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {code.notes}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {t('trialCodes.redemptionsHeading')}
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-900/40 px-2.5 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-200">
                {code.redeemedCount}
              </span>
            </div>

            {redemptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/30 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <Icon name="tenants" className="h-6 w-6" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('trialCodes.noRedemptions')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.redemptionCompany')}</th>
                      <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.redemptionOwner')}</th>
                      <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.redemptionRedeemed')}</th>
                      <th scope="col" className="px-6 py-3 text-center">{t('trialCodes.redemptionEnds')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((r) => (
                      <tr
                        key={r.id}
                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 last:border-b-0"
                      >
                        <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                          {r.companyName}
                        </td>
                        <td className="px-6 py-4 text-center" dir="ltr">
                          {r.ownerEmail || r.ownerName || '—'}
                        </td>
                        <td className="px-6 py-4 text-center">{formatDate(r.redeemedAt)}</td>
                        <td className="px-6 py-4 text-center">{formatDate(r.trialEndsAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium"
          >
            {t('tenants.modal.close')}
          </button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/70 flex items-center justify-center rounded-lg">
            <LoadingSpinner label={t('common.loading')} />
          </div>
        )}
      </div>
    </div>
  );
};

export type { CreateFormState, BatchFormState };
