
import React, { useState, useEffect } from 'react';
import { Plan } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import Icon from './Icon';
import LoadingButton from './LoadingButton';
import { NumberInput } from './NumberInput';
import { Checkbox } from './Checkbox';

interface PlanModalProps {
  planToEdit: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Omit<Plan, 'id'> & { id?: number }) => void;
  isLoading?: boolean;
  /** True if another plan already occupies the free-trial slot (excluding the plan being edited). */
  trialSlotTaken?: boolean;
  /** True if another plan already occupies the free-forever slot (excluding the plan being edited). */
  freeForeverSlotTaken?: boolean;
}

const emptyPlan: Omit<Plan, 'id'> = {
  name: '',
  nameAr: '',
  type: 'Paid',
  priceMonthly: 0,
  priceYearly: 0,
  trialDays: 0,
  users: 10,
  clients: 100,
  features: '',
  featuresAr: '',
  entitlementsFeatures: {
    integration_meta: true,
    integration_tiktok: true,
    integration_whatsapp: true,
    integration_twilio: true,
  },
  entitlementsLimits: {
    max_employees: 10,
    max_clients: 100,
    max_deals: null,
  },
  entitlementsUsageLimitsMonthly: {},
  tier: 0,
  visible: true,
};

const PlanModal: React.FC<PlanModalProps> = ({
  planToEdit,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  trialSlotTaken = false,
  freeForeverSlotTaken = false,
}) => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState(planToEdit || emptyPlan);

  useEffect(() => {
    setFormData(planToEdit ? { ...planToEdit } : { ...emptyPlan });
  }, [planToEdit, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };

  const isPlanTypeDisabled = (type: Plan['type']) =>
    (type === 'Trial' && trialSlotTaken) || (type === 'Free' && freeForeverSlotTaken);

  const handleTypeChange = (type: Plan['type']) => {
    if (isPlanTypeDisabled(type)) return;
    const newFormData = { ...formData, type };
    if (type === 'Trial') {
      newFormData.priceMonthly = 0;
      newFormData.priceYearly = 0;
      if (newFormData.trialDays === 0) newFormData.trialDays = 14;
    } else if (type === 'Paid') {
      newFormData.trialDays = 0;
    } else if (type === 'Free') {
      newFormData.priceMonthly = 0;
      newFormData.priceYearly = 0;
      newFormData.trialDays = 0;
    }
    setFormData(newFormData);
  };

  const handleUnlimitedChange = (field: 'max_employees' | 'max_clients' | 'max_deals', isChecked: boolean) => {
    const fallbackValue = field === 'max_employees' ? 10 : field === 'max_clients' ? 100 : null;
    setFormData(prev => ({
      ...prev,
      entitlementsLimits: {
        ...(prev.entitlementsLimits || {}),
        [field]: isChecked ? 'unlimited' : fallbackValue,
      },
    }));
  };

  const handleEntFeatureToggle = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      entitlementsFeatures: {
        ...(prev.entitlementsFeatures || {}),
        [key]: checked,
      },
    }));
  };

  const parseNullableNumber = (raw: string): number | null => {
    const v = raw.trim();
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleExtraLimitChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      entitlementsLimits: {
        ...(prev.entitlementsLimits || {}),
        [key]: parseNullableNumber(value),
      },
    }));
  };

  const validatePlanForm = (): string | null => {
    const name = formData.name.trim();
    const nameAr = (formData.nameAr || '').trim();
    const description = (formData.features || '').trim();
    const arabicScript = /[\u0600-\u06FF]/;
    const latinLetters = /[A-Za-z]/;

    // Align with API: Plan.name required; Plan.description required (non-blank after strip).
    if (!name) {
      return 'subscriptions.plans.validation.nameEnglishRequired';
    }
    if (arabicScript.test(name)) {
      return 'subscriptions.plans.invalidEnglishName';
    }
    if (!latinLetters.test(name)) {
      return 'subscriptions.plans.validation.nameEnglishLatin';
    }

    // API: name_ar is optional (blank=True).
    if (nameAr) {
      if (latinLetters.test(nameAr)) {
        return 'subscriptions.plans.invalidArabicName';
      }
      if (!arabicScript.test(nameAr)) {
        return 'subscriptions.plans.validation.nameArabicScript';
      }
    }

    if (!description) {
      return 'subscriptions.plans.validation.descriptionRequired';
    }

    if (formData.type === 'Trial') {
      const td = Number(formData.trialDays);
      if (!Number.isFinite(td) || td < 1) {
        return 'subscriptions.plans.validation.trialDaysMin';
      }
    }

    if (formData.type === 'Paid') {
      const pm = Number(formData.priceMonthly);
      const py = Number(formData.priceYearly);
      if (!Number.isFinite(pm) || !Number.isFinite(py) || pm <= 0 || py <= 0) {
        return 'subscriptions.plans.validation.paidPricesPositive';
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errorKey = validatePlanForm();
    if (errorKey) {
      showAlert(t(errorKey), { variant: 'warning' });
      return;
    }
    onSave({
      ...formData,
      name: formData.name.trim(),
      nameAr: (formData.nameAr || '').trim(),
      features: (formData.features || '').trim(),
      featuresAr: (formData.featuresAr || '').trim(),
    });
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl transform transition-all" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {planToEdit ? t('subscriptions.plans.editTitle') : t('subscriptions.plans.createTitle')}
            </h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="planName" className={labelClasses}>{t('subscriptions.plans.planName')}</label>
              <input
                id="planName"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`${inputClasses} ${language === 'ar' ? 'text-right' : 'text-left'}`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                placeholder={t('subscriptions.plans.planNamePlaceholder') || ''}
                required
              />
            </div>
            <div>
              <label htmlFor="planNameAr" className={labelClasses}>{t('subscriptions.plans.planNameAr')}</label>
              <input
                id="planNameAr"
                name="nameAr"
                value={formData.nameAr || ''}
                onChange={handleInputChange}
                className={`${inputClasses} ${formData.nameAr ? 'text-right' : (language === 'ar' ? 'text-right' : 'text-left')}`}
                dir={formData.nameAr ? 'rtl' : (language === 'ar' ? 'rtl' : 'ltr')}
                placeholder={t('subscriptions.plans.planNameArPlaceholder') || ''}
              />
            </div>

            <div>
              <label htmlFor="planTier" className={labelClasses}>
                {language === 'ar' ? 'مستوى الخطة (tier)' : 'Plan tier (upgrade level)'}
              </label>
              <NumberInput
                id="planTier"
                name="tier"
                value={formData.tier ?? 0}
                onChange={handleInputChange}
                min={0}
                step={1}
              />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar'
                  ? 'رقم أعلى = خطة أعلى؛ يُستخدم للترقية والتخفيض.'
                  : 'Higher number = higher tier; used for upgrades/downgrades.'}
              </p>
            </div>

            <div>
              <label className={labelClasses}>{t('subscriptions.plans.planType')}</label>
              <div className={`flex ${language === 'ar' ? 'flex-row-reverse gap-3 justify-end' : 'gap-4'}`}>
                {(['Paid', 'Trial', 'Free'] as const).map((type) => {
                  const typeDisabled = isPlanTypeDisabled(type);
                  const selected = formData.type === type;
                  return (
                    <button
                      type="button"
                      key={type}
                      disabled={typeDisabled}
                      onClick={() => handleTypeChange(type)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
                        typeDisabled
                          ? 'opacity-45 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                          : selected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`subscriptions.plans.type.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.type === 'Trial' && (
              <div>
                <label htmlFor="trialDays" className={labelClasses}>{t('subscriptions.plans.trialDuration')}</label>
                <NumberInput id="trialDays" name="trialDays" value={formData.trialDays} onChange={handleInputChange} min={1} step={1} />
              </div>
            )}

            {formData.type === 'Paid' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                <h3 className="font-medium mb-3">{t('subscriptions.plans.pricing')}</h3>
                  <div>
                    <label htmlFor="priceMonthly" className={labelClasses}>{t('subscriptions.plans.priceMonthly')}</label>
                    <NumberInput id="priceMonthly" name="priceMonthly" value={formData.priceMonthly} onChange={handleInputChange} min={0} step={0.1} />
                </div>
                  <div>
                    <label htmlFor="priceYearly" className={labelClasses}>{t('subscriptions.plans.priceYearly')}</label>
                    <NumberInput id="priceYearly" name="priceYearly" value={formData.priceYearly} onChange={handleInputChange} min={0} step={0.1} />
                    <p className="text-xs text-gray-500 mt-1">{t('subscriptions.plans.yearlyDiscount')}</p>
                  </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
              <h3 className="font-medium mb-3">{t('subscriptions.plans.resourceLimits')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="max_employees" className={labelClasses}>{t('subscriptions.plans.maxUsers')}</label>
                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-start' : ''}`}>
                    {language === 'ar' ? (
                      <>
                        <input
                          id="max_employees"
                          className={`${inputClasses} max-w-xs`}
                          inputMode="numeric"
                          value={(formData.entitlementsLimits || {}).max_employees === 'unlimited' ? '' : ((formData.entitlementsLimits || {}).max_employees ?? '')}
                          onChange={(e) => handleExtraLimitChange('max_employees', e.target.value)}
                          placeholder={t('subscriptions.plans.unlimited') || 'Unlimited'}
                          disabled={(formData.entitlementsLimits || {}).max_employees === 'unlimited'}
                        />
                        <Checkbox id="maxEmployeesUnlimited" checked={(formData.entitlementsLimits || {}).max_employees === 'unlimited'} onChange={(e) => handleUnlimitedChange('max_employees', e.target.checked)} label={t('subscriptions.plans.unlimited')} />
                      </>
                    ) : (
                      <>
                        <input
                          id="max_employees"
                          className={inputClasses}
                          inputMode="numeric"
                          value={(formData.entitlementsLimits || {}).max_employees === 'unlimited' ? '' : ((formData.entitlementsLimits || {}).max_employees ?? '')}
                          onChange={(e) => handleExtraLimitChange('max_employees', e.target.value)}
                          placeholder={t('subscriptions.plans.unlimited') || 'Unlimited'}
                          disabled={(formData.entitlementsLimits || {}).max_employees === 'unlimited'}
                        />
                        <Checkbox id="maxEmployeesUnlimited" checked={(formData.entitlementsLimits || {}).max_employees === 'unlimited'} onChange={(e) => handleUnlimitedChange('max_employees', e.target.checked)} label={t('subscriptions.plans.unlimited')} />
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="max_clients" className={labelClasses}>{t('subscriptions.plans.maxClients')}</label>
                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-start' : ''}`}>
                    {language === 'ar' ? (
                      <>
                        <input
                          id="max_clients"
                          className={`${inputClasses} max-w-xs`}
                          inputMode="numeric"
                          value={(formData.entitlementsLimits || {}).max_clients === 'unlimited' ? '' : ((formData.entitlementsLimits || {}).max_clients ?? '')}
                          onChange={(e) => handleExtraLimitChange('max_clients', e.target.value)}
                          placeholder={t('subscriptions.plans.unlimited') || 'Unlimited'}
                          disabled={(formData.entitlementsLimits || {}).max_clients === 'unlimited'}
                        />
                        <Checkbox id="maxClientsUnlimited" checked={(formData.entitlementsLimits || {}).max_clients === 'unlimited'} onChange={(e) => handleUnlimitedChange('max_clients', e.target.checked)} label={t('subscriptions.plans.unlimited')} />
                      </>
                    ) : (
                      <>
                        <input
                          id="max_clients"
                          className={inputClasses}
                          inputMode="numeric"
                          value={(formData.entitlementsLimits || {}).max_clients === 'unlimited' ? '' : ((formData.entitlementsLimits || {}).max_clients ?? '')}
                          onChange={(e) => handleExtraLimitChange('max_clients', e.target.value)}
                          placeholder={t('subscriptions.plans.unlimited') || 'Unlimited'}
                          disabled={(formData.entitlementsLimits || {}).max_clients === 'unlimited'}
                        />
                        <Checkbox id="maxClientsUnlimited" checked={(formData.entitlementsLimits || {}).max_clients === 'unlimited'} onChange={(e) => handleUnlimitedChange('max_clients', e.target.checked)} label={t('subscriptions.plans.unlimited')} />
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>{t('subscriptions.plans.maxDeals') || 'Max deals'}</label>
                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-start' : ''}`}>
                    <input
                      className={inputClasses}
                      inputMode="numeric"
                      value={(formData.entitlementsLimits || {}).max_deals === 'unlimited' ? '' : ((formData.entitlementsLimits || {}).max_deals ?? '')}
                      onChange={(e) => handleExtraLimitChange('max_deals', e.target.value)}
                      placeholder={t('subscriptions.plans.unlimited') || 'Unlimited'}
                      disabled={(formData.entitlementsLimits || {}).max_deals === 'unlimited'}
                    />
                    <Checkbox
                      id="maxDealsUnlimited"
                      checked={(formData.entitlementsLimits || {}).max_deals === 'unlimited'}
                      onChange={(e) => handleUnlimitedChange('max_deals', e.target.checked)}
                      label={t('subscriptions.plans.unlimited')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
              <h3 className="font-medium mb-3">
                {t('subscriptions.plans.entitlements') || 'Entitlements'}
              </h3>

              <div className="space-y-5">
                <div>
                  <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('subscriptions.plans.featureFlags') || 'Feature flags'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Checkbox
                      id="feature_integration_meta"
                      checked={!!(formData.entitlementsFeatures || {}).integration_meta}
                      onChange={(e) => handleEntFeatureToggle('integration_meta', e.target.checked)}
                      label={t('settings.integrations.platform.meta') || 'Meta'}
                    />
                    <Checkbox
                      id="feature_integration_tiktok"
                      checked={!!(formData.entitlementsFeatures || {}).integration_tiktok}
                      onChange={(e) => handleEntFeatureToggle('integration_tiktok', e.target.checked)}
                      label={t('settings.integrations.platform.tiktok') || 'TikTok'}
                    />
                    <Checkbox
                      id="feature_integration_whatsapp"
                      checked={!!(formData.entitlementsFeatures || {}).integration_whatsapp}
                      onChange={(e) => handleEntFeatureToggle('integration_whatsapp', e.target.checked)}
                      label={t('settings.integrations.platform.whatsapp') || 'WhatsApp'}
                    />
                    <Checkbox
                      id="feature_integration_twilio"
                      checked={!!(formData.entitlementsFeatures || {}).integration_twilio}
                      onChange={(e) => handleEntFeatureToggle('integration_twilio', e.target.checked)}
                      label={t('settings.integrations.platform.twilio') || 'Twilio'}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="features" className={labelClasses}>{t('subscriptions.plans.features')}</label>
              <textarea
                id="features"
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                rows={4}
                className={`${inputClasses} ${language === 'ar' ? 'text-right' : 'text-left'}`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                placeholder={t('subscriptions.plans.featuresPlaceholder')}
                required
              ></textarea>
            </div>
            <div>
              <label htmlFor="featuresAr" className={labelClasses}>{t('subscriptions.plans.featuresAr')}</label>
              <textarea
                id="featuresAr"
                name="featuresAr"
                value={formData.featuresAr || ''}
                onChange={handleInputChange}
                rows={4}
                className={`${inputClasses} ${language === 'ar' ? 'text-right' : 'text-left'}`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                placeholder={t('subscriptions.plans.featuresArPlaceholder')}
              ></textarea>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <LoadingButton
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </LoadingButton>
            <LoadingButton
              type="submit"
              variant="primary"
              isLoading={isLoading}
              loadingText={planToEdit ? t('common.updating') : t('common.saving')}
            >
              {t('common.savePlan')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanModal;
