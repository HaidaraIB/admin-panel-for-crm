import React, { useState, useEffect } from 'react';
import { LimitedAdmin } from '../types';
import { useI18n } from '../context/i18n';
import { useAlert } from '../context/AlertContext';
import Icon from './Icon';

interface LimitedAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (admin: Partial<LimitedAdmin> & {
    username: string;
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
  }) => void;
  editingAdmin?: LimitedAdmin | null;
  isLoading?: boolean;
}

const LimitedAdminModal: React.FC<LimitedAdminModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAdmin,
  isLoading = false,
}) => {
  const { t, language } = useI18n();
  const { showAlert } = useAlert();
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
        can_manage_settings: false,
        can_manage_limited_admins: false,
      });
    }
  }, [editingAdmin, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin && !formData.password) {
      showAlert(t('limitedAdmins.passwordRequired') || 'Password is required', { variant: 'warning' });
      return;
    }
    onSave(formData);
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
            {editingAdmin 
              ? t('limitedAdmins.modal.editTitle') || 'Edit Limited Admin'
              : t('limitedAdmins.modal.addTitle') || 'Add Limited Admin'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                className={inputClasses}
                required
              />
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
                className={inputClasses}
                required
              />
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
                className={inputClasses}
                required
                disabled={!!editingAdmin}
              />
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
                className={inputClasses}
                required
                disabled={!!editingAdmin}
              />
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
                    className={`${inputClasses} pr-10 ${language === 'ar' ? 'pl-10 pr-3' : 'pl-3'}`}
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

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  {t('common.saving') || 'Saving...'}
                </span>
              ) : (
                t('common.save') || 'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LimitedAdminModal;
