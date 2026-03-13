
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { translateApiMessage } from '../utils/translateApiError';
import Icon from '../components/Icon';
import PhoneInput from '../components/PhoneInput';
import { Tenant } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { registerCompanyAPI, getPlansAPI, checkRegistrationAvailabilityAPI } from '../services/api';

interface AddTenantProps {
  onSave: (tenant: Omit<Tenant, 'id'>) => void;
}

interface PlanOption {
  id: number;
  name: string;
  name_ar?: string;
}

const slugify = (text: string) =>
  text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const AddTenant: React.FC<AddTenantProps> = ({ onSave }) => {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { showAlert } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepCheckLoading, setStepCheckLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Company
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [specialization, setSpecialization] = useState<'real_estate' | 'services' | 'products'>('real_estate');

  // Step 2: Owner
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  // Step 3: Plan
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [planId, setPlanId] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(true);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const next: Record<string, string> = {};
    if (!companyName.trim()) next.companyName = t('validation.requiredFields') || 'Required';
    if (!companyDomain.trim()) next.companyDomain = t('validation.requiredFields') || 'Required';
    else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*$/.test(companyDomain))
      next.companyDomain = t('tenants.add.subdomainTaken') || 'Invalid domain format';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = (): boolean => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = t('validation.requiredFields') || 'Required';
    if (!lastName.trim()) next.lastName = t('validation.requiredFields') || 'Required';
    if (!email.trim()) next.email = t('validation.requiredFields') || 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('validation.invalidEmail') || 'Invalid email';
    if (!username.trim()) next.username = t('validation.requiredFields') || 'Required';
    else if (username.length < 3) next.username = t('validation.minLength') || 'At least 3 characters';
    const p = phone.trim();
    if (!p) next.phone = t('validation.requiredFields') || 'Required';
    else if (!/^\+[1-9]\d{8,14}$/.test(p)) next.phone = t('validation.invalidPhone') || 'Invalid phone';
    if (!password.trim()) next.password = t('validation.requiredFields') || 'Required';
    else if (password.length < 8) next.password = t('validation.passwordMinLength') || 'At least 8 characters';
    if (password !== confirmPassword) next.confirmPassword = t('tenants.add.passwordsDoNotMatch') || 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const checkAvailability = async (fields: {
    company_domain?: string;
    email?: string;
    username?: string;
    phone?: string;
  }) => {
    setStepCheckLoading(true);
    try {
      await checkRegistrationAvailabilityAPI(fields);
      return true;
    } catch (err: any) {
      const backend = err?.fields || err?.errors || {};
      const next: Record<string, string> = {};
      if (backend.company_domain) next.companyDomain = Array.isArray(backend.company_domain) ? backend.company_domain[0] : backend.company_domain;
      if (backend.email) next.email = Array.isArray(backend.email) ? backend.email[0] : backend.email;
      if (backend.username) next.username = Array.isArray(backend.username) ? backend.username[0] : backend.username;
      if (backend.phone) next.phone = Array.isArray(backend.phone) ? backend.phone[0] : backend.phone;
      if (Object.keys(next).length > 0) setErrors((e) => ({ ...e, ...next }));
      else if (err?.message) setErrors((e) => ({ ...e, general: err.message }));
      return false;
    } finally {
      setStepCheckLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && validateStep1()) {
      const ok = await checkAvailability({ company_domain: companyDomain.trim() });
      if (ok) setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      const ok = await checkAvailability({
        email: email.trim(),
        username: username.trim(),
        phone: phone.trim(),
      });
      if (ok) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) return;
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!planId || !plans.some((p) => String(p.id) === planId)) {
      showAlert(t('tenants.add.selectPlan') || 'Please select a plan', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await registerCompanyAPI({
        company: {
          name: companyName.trim(),
          domain: companyDomain.trim(),
          specialization,
        },
        owner: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
          phone: phone.trim(),
        },
        plan_id: parseInt(planId, 10),
        billing_cycle: 'monthly',
      });

      onSave({
        name: companyName.trim(),
        domain: companyDomain.trim(),
        specialization,
        owner: 0,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      const backend = err?.fields || err?.errors || err;
      const next: Record<string, string> = {};
      if (backend?.company?.name) next.companyName = Array.isArray(backend.company.name) ? backend.company.name[0] : backend.company.name;
      if (backend?.company?.domain) next.companyDomain = Array.isArray(backend.company.domain) ? backend.company.domain[0] : backend.company.domain;
      if (backend?.owner?.first_name) next.firstName = Array.isArray(backend.owner.first_name) ? backend.owner.first_name[0] : backend.owner.first_name;
      if (backend?.owner?.last_name) next.lastName = Array.isArray(backend.owner.last_name) ? backend.owner.last_name[0] : backend.owner.last_name;
      if (backend?.owner?.email) next.email = Array.isArray(backend.owner.email) ? backend.owner.email[0] : backend.owner.email;
      if (backend?.owner?.username) next.username = Array.isArray(backend.owner.username) ? backend.owner.username[0] : backend.owner.username;
      if (backend?.owner?.phone) next.phone = Array.isArray(backend.owner.phone) ? backend.owner.phone[0] : backend.owner.phone;
      if (backend?.owner?.password) next.password = Array.isArray(backend.owner.password) ? backend.owner.password[0] : backend.owner.password;
      if (Object.keys(next).length > 0) setErrors(next);
      else showAlert(translateApiMessage(err?.message, t) || t('errors.createTenantSubdomain'), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    getPlansAPI()
      .then((res) => {
        if (cancelled) return;
        const list = res.results || [];
        setPlans(list);
        if (list.length > 0 && !planId) setPlanId(String(list[0].id));
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCompanyNameBlur = useCallback(() => {
    if (companyName && !companyDomain) setCompanyDomain(slugify(companyName));
  }, [companyName, companyDomain]);

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let value = '';
    for (let i = 0; i < 12; i++) value += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(value);
    setConfirmPassword(value);
  };

  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';
  const errorClasses = 'mt-1 text-sm text-red-600 dark:text-red-400';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('tenants.add.title')}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && <div className={`flex-1 h-1 max-w-[60px] ${currentStep > step ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`} />}
                </React.Fragment>
              ))}
            </div>

            {errors.general && (
              <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
                {errors.general}
              </div>
            )}

            {/* Step 1: Company */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tenants.add.stepCompany')}</h3>
                <div>
                  <label htmlFor="companyName" className={labelClasses}>{t('tenants.table.companyName')} <span className="text-red-500">*</span></label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder={t('tenants.add.companyNamePlaceholder')}
                    className={`${inputClasses} ${errors.companyName ? 'border-red-500' : ''}`}
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); clearFieldError('companyName'); }}
                    onBlur={handleCompanyNameBlur}
                  />
                  {errors.companyName && <p className={errorClasses}>{errors.companyName}</p>}
                </div>
                <div>
                  <label htmlFor="companyDomain" className={labelClasses}>{t('tenants.table.subdomain')} <span className="text-red-500">*</span></label>
                  <input
                    id="companyDomain"
                    type="text"
                    placeholder={t('tenants.add.subdomainPlaceholder')}
                    className={`${inputClasses} ${errors.companyDomain ? 'border-red-500' : ''}`}
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(slugify(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('tenants.add.domainHint')}</p>
                  {errors.companyDomain && <p className={errorClasses}>{errors.companyDomain}</p>}
                </div>
                <div>
                  <label htmlFor="specialization" className={labelClasses}>{t('tenants.modal.specialization')} <span className="text-red-500">*</span></label>
                  <select
                    id="specialization"
                    className={inputClasses}
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value as 'real_estate' | 'services' | 'products')}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <option value="real_estate">{t('specialization.real_estate')}</option>
                    <option value="services">{t('specialization.services')}</option>
                    <option value="products">{t('specialization.products')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Owner */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tenants.add.stepOwner')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className={labelClasses}>{t('limitedAdmins.modal.firstName')} <span className="text-red-500">*</span></label>
                    <input id="firstName" type="text" placeholder={t('tenants.add.adminNamePlaceholder')} className={`${inputClasses} ${errors.firstName ? 'border-red-500' : ''}`} value={firstName} onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }} />
                    {errors.firstName && <p className={errorClasses}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClasses}>{t('limitedAdmins.modal.lastName')} <span className="text-red-500">*</span></label>
                    <input id="lastName" type="text" placeholder={t('tenants.add.adminNamePlaceholder')} className={`${inputClasses} ${errors.lastName ? 'border-red-500' : ''}`} value={lastName} onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }} />
                    {errors.lastName && <p className={errorClasses}>{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className={labelClasses}>{t('tenants.add.adminEmail')} <span className="text-red-500">*</span></label>
                  <input id="email" type="email" placeholder={t('tenants.add.adminEmailPlaceholder')} className={`${inputClasses} ${errors.email ? 'border-red-500' : ''}`} value={email} onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }} />
                  {errors.email && <p className={errorClasses}>{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="username" className={labelClasses}>{t('limitedAdmins.modal.username')} <span className="text-red-500">*</span></label>
                  <input id="username" type="text" placeholder="e.g. admin" className={`${inputClasses} ${errors.username ? 'border-red-500' : ''}`} value={username} onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }} />
                  {errors.username && <p className={errorClasses}>{errors.username}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className={labelClasses}>{t('tenants.modal.phone')} <span className="text-red-500">*</span></label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(v) => {
                      setPhone(v);
                      clearFieldError('phone');
                    }}
                    placeholder=""
                    error={!!errors.phone}
                    defaultCountry="IQ"
                  />
                  {errors.phone && <p className={errorClasses}>{errors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="password" className={labelClasses}>{t('tenants.add.password')} <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="password"
                        type={passwordVisible ? 'text' : 'password'}
                        className={`${inputClasses} pr-10 ${errors.password ? 'border-red-500' : ''}`}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                      />
                      <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400" onClick={() => { setPasswordVisible(!passwordVisible); setConfirmPasswordVisible(!passwordVisible); }}>
                        <Icon name={passwordVisible ? 'eye-off' : 'eye'} className="w-5 h-5" />
                      </button>
                    </div>
                    <button type="button" onClick={handleGeneratePassword} className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 whitespace-nowrap">
                      {t('tenants.add.generate')}
                    </button>
                  </div>
                  {errors.password && <p className={errorClasses}>{errors.password}</p>}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className={labelClasses}>{t('tenants.add.confirmPassword')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={confirmPasswordVisible ? 'text' : 'password'}
                      className={`${inputClasses} pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400" onClick={() => { setConfirmPasswordVisible(!confirmPasswordVisible); setPasswordVisible(!confirmPasswordVisible); }}>
                      <Icon name={confirmPasswordVisible ? 'eye-off' : 'eye'} className="w-5 h-5" />
                    </button>
                  </div>
                  {errors.confirmPassword && <p className={errorClasses}>{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Plan */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tenants.add.stepPlan')}</h3>
                {loadingPlans && <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>}
                {!loadingPlans && plans.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">—</p>}
                {!loadingPlans && plans.length > 0 && (
                  <div className="space-y-2">
                    {plans.map((p) => (
                      <label key={p.id} className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${planId === String(p.id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                        <input type="radio" name="plan" value={p.id} checked={planId === String(p.id)} onChange={() => setPlanId(String(p.id))} className="text-primary-600 focus:ring-primary-500" />
                        <span className="font-medium text-gray-900 dark:text-white">{language === 'ar' && p.name_ar?.trim() ? p.name_ar : p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between gap-4">
              <div>
                {currentStep > 1 && (
                  <button type="button" onClick={handleBack} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
                    {t('common.back')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {currentStep < 3 ? (
                  <button type="button" onClick={handleNext} disabled={stepCheckLoading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 disabled:opacity-70">
                    {stepCheckLoading && <LoadingSpinner />}
                    {t('common.next')}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => navigate('/tenants')} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSubmitting && <LoadingSpinner />}
                      {isSubmitting ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : t('common.createAndSave')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTenant;
