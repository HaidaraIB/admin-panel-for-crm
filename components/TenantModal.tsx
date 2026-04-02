
import React, { useState, useEffect } from 'react';
import { Tenant, TenantStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

interface TenantModalProps {
  tenant: Tenant | null;
  mode: 'view' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSave: (tenant: Tenant) => void;
}

const TenantModal: React.FC<TenantModalProps> = ({ tenant, mode, isOpen, onClose, onSave }) => {
  const { t, language } = useI18n();
  const [formData, setFormData] = useState<Tenant | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({ ...tenant });
    }
  }, [tenant]);

  if (!isOpen || !tenant || !formData) return null;

  const isEditMode = mode === 'edit';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleTrialConsumedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData(prev => (prev ? { ...prev, freeTrialConsumed: checked } : null));
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  const statusColors: { [key in TenantStatus]: string } = {
    [TenantStatus.Active]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    [TenantStatus.Trial]: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    [TenantStatus.Expired]: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20',
    [TenantStatus.Deactivated]: 'bg-gray-400/15 text-gray-600 dark:text-gray-400 border border-gray-400/20',
  };

  const inputClasses = "w-full px-4 py-2.5 border border-gray-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
  const labelClasses = "block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5";
  const valueClasses = "text-sm font-medium text-gray-900 dark:text-white";

  const FieldRow = ({ icon, label, children, href }: { icon?: string; label: string; children: React.ReactNode; href?: string }) => (
    <div className="flex gap-3 items-start">
      {icon && (
        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Icon name={icon} className="w-4 h-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={labelClasses}>{label}</p>
        {href ? (
          <a href={href} className={`${valueClasses} hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate block`}>
            {children}
          </a>
        ) : (
          <p className={valueClasses}>{children}</p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <Icon name="building" className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditMode ? t('tenants.modal.editTitle') : t('tenants.modal.viewTitle')}
              </h2>
              {!isEditMode && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tenant.name}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 max-h-[65vh] overflow-y-auto">
          {/* Company info */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 pb-2 mb-4 border-b-2 border-gray-200 dark:border-gray-600">
              {t('tenants.filters.general')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t('tenants.table.companyName')}</label>
                {isEditMode ? (
                  <input name="name" value={formData.name} onChange={handleChange} className={inputClasses} />
                ) : (
                  <p className={valueClasses}>{tenant.name}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>{t('tenants.table.subdomain')}</label>
                {isEditMode ? (
                  <input name="domain" value={formData.domain} onChange={handleChange} className={inputClasses} />
                ) : (
                  <p className={valueClasses}>{tenant.domain}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>{t('tenants.modal.specialization')}</label>
                {isEditMode ? (
                  <select name="specialization" value={formData.specialization} onChange={handleChange} className={inputClasses}>
                    <option value="real_estate">{t('specialization.real_estate')}</option>
                    <option value="services">{t('specialization.services')}</option>
                    <option value="products">{t('specialization.products')}</option>
                  </select>
                ) : (
                  <p className={valueClasses}>{t(`specialization.${formData.specialization}`) || formData.specialization}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>{t('tenants.modal.createdAt')}</label>
                <p className={valueClasses}>
                  {tenant.created_at
                    ? new Date(tenant.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>{t('tenants.modal.freeTrialConsumed')}</label>
                {isEditMode ? (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.freeTrialConsumed)}
                      onChange={handleTrialConsumedChange}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('tenants.modal.freeTrialConsumedHint')}</span>
                  </label>
                ) : (
                  <p className={valueClasses}>
                    {formData.freeTrialConsumed
                      ? language === 'ar'
                        ? 'نعم'
                        : 'Yes'
                      : language === 'ar'
                        ? 'لا'
                        : 'No'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 pb-2 mb-4 border-b-2 border-gray-200 dark:border-gray-600">
              {t('tenants.modal.contact')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldRow icon="user" label={t('tenants.modal.owner')}>
                {tenant.owner_username || tenant.owner_email || `ID: ${tenant.owner}`}
              </FieldRow>
              <FieldRow icon="mail" label={t('tenants.modal.email')} href={tenant.owner_email ? `mailto:${tenant.owner_email}` : undefined}>
                {tenant.owner_email || '—'}
              </FieldRow>
              <FieldRow icon="phone" label={t('tenants.modal.phone')} href={tenant.owner_phone ? `tel:${tenant.owner_phone}` : undefined}>
                {tenant.owner_phone || '—'}
              </FieldRow>
            </div>
          </section>

          {/* Subscription (when present) */}
          {(tenant.currentPlan || tenant.status || tenant.startDate || tenant.endDate) && (
            <section>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 pb-2 mb-4 border-b-2 border-gray-200 dark:border-gray-600">
                {t('tenants.modal.subscription')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {tenant.currentPlan && (
                  <div>
                    <label className={labelClasses}>{t('tenants.table.currentPlan')}</label>
                    <p className={valueClasses}>{tenant.currentPlan}</p>
                  </div>
                )}
                {tenant.status && (
                  <div>
                    <label className={labelClasses}>{t('tenants.table.status')}</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${statusColors[tenant.status]}`}>
                      {t(`status.${tenant.status}`)}
                    </span>
                  </div>
                )}
                {tenant.startDate && (
                  <FieldRow icon="calendar" label={t('tenants.table.startDate')}>
                    {tenant.startDate}
                  </FieldRow>
                )}
                {tenant.endDate && (
                  <FieldRow icon="clock" label={t('tenants.table.endDate')}>
                    {tenant.endDate}
                  </FieldRow>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t('tenants.modal.close')}
          </button>
          {isEditMode && (
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
            >
              {t('tenants.modal.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantModal;
