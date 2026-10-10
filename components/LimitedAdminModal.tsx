import React, { useState, useEffect } from 'react';
import LoadingButton from './LoadingButton';
import { LimitedAdmin } from '../types';
import { useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface LimitedAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (admin: Partial<LimitedAdmin> & {
    username: string;
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
  }) => void | Promise<void>;
  editingAdmin?: LimitedAdmin | null;
  isLoading?: boolean;
  readOnly?: boolean;
}

const LimitedAdminModal: React.FC<LimitedAdminModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAdmin,
  isLoading = false,
  readOnly = false,
}) => {
  const { t, language } = useI18n();
  const translate = (key: string) => {
    const value = t(key);
    return value && value !== key ? value : undefined;
  };
  const { showToast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_active: true,
    can_view_dashboard: false,
    can_manage_tenants: false,
    can_manage_subscriptions: false,
    can_manage_payment_gateways: false,
    can_view_reports: false,
    can_manage_communication: false,
    can_manage_content: false,
    can_manage_demo_bookings: false,
    can_manage_settings: false,
    can_manage_limited_admins: false,
  });

  useEffect(() => {
    if (editingAdmin) {
      setFormData({
        username: editingAdmin.user.username,
        email: editingAdmin.user.email,
        password: '', // Don't show password when editing
        first_name: editingAdmin.user.first_name,
        last_name: editingAdmin.user.last_name,
        is_active: editingAdmin.is_active,
        can_view_dashboard: editingAdmin.can_view_dashboard,
        can_manage_tenants: editingAdmin.can_manage_tenants,
        can_manage_subscriptions: editingAdmin.can_manage_subscriptions,
        can_manage_payment_gateways: editingAdmin.can_manage_payment_gateways,
        can_view_reports: editingAdmin.can_view_reports,
        can_manage_communication: editingAdmin.can_manage_communication,
        can_manage_content: editingAdmin.can_manage_content,
        can_manage_demo_bookings: editingAdmin.can_manage_demo_bookings,
        can_manage_settings: editingAdmin.can_manage_settings,
        can_manage_limited_admins: editingAdmin.can_manage_limited_admins,
      });
    } else {
      // Reset form for new admin
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_active: true,
        can_view_dashboard: false,
        can_manage_tenants: false,
        can_manage_subscriptions: false,
        can_manage_payment_gateways: false,
        can_view_reports: false,
        can_manage_communication: false,
        can_manage_content: false,
        can_manage_demo_bookings: false,
        can_manage_settings: false,
        can_manage_limited_admins: false,
      });
    }
    setErrors({});
  }, [editingAdmin, isOpen]);

  const catalogValues = () => ({
    username: formData.username,
    email: formData.email,
    password: formData.password,
    first_name: formData.first_name,
    last_name: formData.last_name,
  });

  const blurField = (field: string) => {
    const next = catalogFieldErrors('limited_admin.create', catalogValues(), translate);
    if (editingAdmin && !formData.password) delete next.password;
    setErrors((prev) => {
      const copy = { ...prev };
      if (next[field]) copy[field] = next[field];
      else delete copy[field];
      return copy;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const next = catalogFieldErrors('limited_admin.create', catalogValues(), translate);
    if (editingAdmin && !formData.password) delete next.password;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await onSave(formData);
    } catch (error) {
      const serverErrors = serverFieldErrors(error, 'limited_admin.create', translate);
      if (editingAdmin && !formData.password) delete serverErrors.password;
      if (Object.keys(serverErrors).length > 0) setErrors((prev) => ({ ...prev, ...serverErrors }));
      else showToast(translateAdminApiError(error, t) || t('errors.saveLimitedAdmin'), { variant: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {readOnly
              ? t('limitedAdmins.modal.viewTitle')
              : editingAdmin
                ? t('limitedAdmins.modal.editTitle') || 'Edit Limited Admin'
                : t('limitedAdmins.modal.addTitle') || 'Add Limited Admin'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors._general && <p className="text-sm text-red-600 dark:text-red-400">{errors._general}</p>}
          <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className={labelClasses}>
                {t('limitedAdmins.modal.firstName') || 'First Name'} *
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                onBlur={() => blurField('firstName')}
                className={`${inputClasses} ${errors.firstName ? 'border-red-500' : ''}`}
                required
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="last_name" className={labelClasses}>
                {t('limitedAdmins.modal.lastName') || 'Last Name'} *
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                onBlur={() => blurField('lastName')}
                className={`${inputClasses} ${errors.lastName ? 'border-red-500' : ''}`}
                required
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="username" className={labelClasses}>
                {t('limitedAdmins.modal.username') || 'Username'} *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                onBlur={() => blurField('username')}
                className={`${inputClasses} ${errors.username ? 'border-red-500' : ''}`}
                required
                disabled={!!editingAdmin}
              />
              {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
            </div>
            <div>
              <label htmlFor="email" className={labelClasses}>
                {t('limitedAdmins.modal.email') || 'Email'} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => blurField('email')}
                className={`${inputClasses} ${errors.email ? 'border-red-500' : ''}`}
                required
                disabled={!!editingAdmin}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
            </div>
            {!editingAdmin && (
              <div className="md:col-span-2">
                <label htmlFor="password" className={labelClasses}>
                  {t('limitedAdmins.modal.password') || 'Password'} *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => blurField('password')}
                    className={`${inputClasses} pr-10 ${errors.password ? 'border-red-500' : ''} ${language === 'ar' ? 'pl-10 pr-3' : 'pl-3'}`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none ${language === 'ar' ? 'left-0' : 'right-0'}`}
                    title={showPassword ? (t('login.hidePassword') || 'Hide password') : (t('login.showPassword') || 'Show password')}
                    aria-label={showPassword ? (t('login.hidePassword') || 'Hide password') : (t('login.showPassword') || 'Show password')}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('limitedAdmins.modal.status') || 'Status'}
            </h3>
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.modal.isActive') || 'Active'}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('limitedAdmins.modal.permissions') || 'Permissions'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_view_dashboard"
                  checked={formData.can_view_dashboard}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.viewDashboard') || 'View Dashboard'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_tenants"
                  checked={formData.can_manage_tenants}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageTenants') || 'Manage Tenants'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_subscriptions"
                  checked={formData.can_manage_subscriptions}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageSubscriptions') || 'Manage Subscriptions'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_payment_gateways"
                  checked={formData.can_manage_payment_gateways}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.managePaymentGateways') || 'Manage Payment Gateways'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_view_reports"
                  checked={formData.can_view_reports}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.viewReports') || 'View Reports'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_communication"
                  checked={formData.can_manage_communication}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageCommunication') || 'Manage Communication'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_content"
                  checked={formData.can_manage_content}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageContent') || 'Manage Content'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_demo_bookings"
                  checked={formData.can_manage_demo_bookings}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('demoBookings.permission')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_settings"
                  checked={formData.can_manage_settings}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageSettings') || 'Manage Settings'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="can_manage_limited_admins"
                  checked={formData.can_manage_limited_admins}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('limitedAdmins.permissions.manageLimitedAdmins') || 'Manage Limited Admins'}
                </span>
              </label>
            </div>
          </div>
          </fieldset>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {readOnly ? (
              <LoadingButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
                {t('common.close')}
              </LoadingButton>
            ) : (
              <>
                <LoadingButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </LoadingButton>
                <LoadingButton
                  type="submit"
                  className="flex-1"
                  isLoading={isLoading}
                  loadingText={t('common.saving')}
                >
                  {t('common.save')}
                </LoadingButton>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LimitedAdminModal;
