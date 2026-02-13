import React, { useState, useEffect } from 'react';
import { Tenant } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import { translateApiMessage } from '../utils/translateApiError';
import Icon from './Icon';
import { getPlansAPI } from '../services/api';

interface TenantActivationModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onActivate: (tenantId: number, planId: number, startDate: string, endDate: string) => Promise<void>;
  onDeactivate: (tenantId: number) => Promise<void>;
}

const TenantActivationModal: React.FC<TenantActivationModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onActivate,
  onDeactivate,
}) => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      // Set default dates
      const today = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(oneMonthLater.toISOString().split('T')[0]);
      
      // Reset plan selection
      setSelectedPlanId('');
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await getPlansAPI();
      setPlans(response.results || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  if (!isOpen || !tenant) return null;

  const isActive = tenant.status === 'Active' || tenant.status === 'Trial';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isActive) {
      // Deactivate
      setIsLoading(true);
      try {
        await onDeactivate(tenant.id);
        onClose();
      } catch (error: any) {
        showAlert(translateApiMessage(error.message, t) || t('errors.deactivateTenant'), { variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Activate - need plan and dates
      if (!selectedPlanId) {
        showAlert(t('tenants.activation.selectPlan') || 'Please select a plan', { variant: 'warning' });
        return;
      }
      if (!startDate || !endDate) {
        showAlert(t('tenants.activation.selectDates') || 'Please select start and end dates', { variant: 'warning' });
        return;
      }
      if (new Date(endDate) <= new Date(startDate)) {
        showAlert(t('tenants.activation.invalidDates') || 'End date must be after start date', { variant: 'warning' });
        return;
      }

      setIsLoading(true);
      try {
        await onActivate(tenant.id, selectedPlanId as number, startDate, endDate);
        onClose();
      } catch (error: any) {
        showAlert(translateApiMessage(error.message, t) || t('errors.activateTenant'), { variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isActive 
              ? t('tenants.activation.deactivateTitle') || 'Deactivate Company'
              : t('tenants.activation.activateTitle') || 'Activate Company'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClasses}>
              {t('tenants.table.companyName')}
            </label>
            <p className="px-3 py-2 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-md">
              {tenant.name}
            </p>
          </div>

          {!isActive && (
            <>
              <div>
                <label htmlFor="plan" className={labelClasses}>
                  {t('tenants.activation.selectPlan') || 'Select Plan'} *
                </label>
                {isLoadingPlans ? (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    {t('common.loading') || 'Loading...'}
                  </div>
                ) : (
                  <select
                    id="plan"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value ? parseInt(e.target.value) : '')}
                    className={inputClasses}
                    required
                  >
                    <option value="">{t('tenants.activation.selectPlan') || 'Select a plan...'}</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="startDate" className={labelClasses}>
                  {t('tenants.table.startDate')} *
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className={labelClasses}>
                  {t('tenants.table.endDate')} *
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClasses}
                  min={startDate}
                  required
                />
              </div>
            </>
          )}

          {isActive && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('tenants.activation.deactivateWarning') || 'Are you sure you want to deactivate this company? The subscription will be disabled.'}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium transition-colors"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  {t('common.processing') || 'Processing...'}
                </span>
              ) : (
                isActive 
                  ? t('tenants.activation.deactivate') || 'Deactivate'
                  : t('tenants.activation.activate') || 'Activate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantActivationModal;
