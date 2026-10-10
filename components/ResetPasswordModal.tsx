
import React, { useState } from 'react';
import { changePasswordAPI } from '../services/api';
import { useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import Icon from './Icon';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
    const { t, language } = useI18n();
    const translate = (key: string) => {
        const value = t(key);
        return value && value !== key ? value : undefined;
    };
    const { showToast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Link new password and confirm password visibility - when one changes, update both
    const handleNewPasswordVisibilityToggle = () => {
        const newValue = !showNewPassword;
        setShowNewPassword(newValue);
        setShowConfirmPassword(newValue);
    };
    
    const handleConfirmPasswordVisibilityToggle = () => {
        const newValue = !showConfirmPassword;
        setShowNewPassword(newValue);
        setShowConfirmPassword(newValue);
    };
    const catalogValues = () => ({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
    });

    const blurField = (field: string) => {
        const next = catalogFieldErrors('auth.change_password', catalogValues(), translate);
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
        const next = catalogFieldErrors('auth.change_password', catalogValues(), translate);
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setIsLoading(true);
        try {
            await changePasswordAPI(currentPassword, newPassword, confirmPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setErrors({});
            showToast(t('resetPassword.successMessage') || t('resetPassword.success'), { variant: 'success' });
            onClose();
        } catch (error: unknown) {
            const serverErrors = serverFieldErrors(error, 'auth.change_password', translate);
            if (Object.keys(serverErrors).length > 0) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else showToast(translateAdminApiError(error, t) || t('resetPassword.errors.incorrect'), { variant: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
    const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-semibold">{t('resetPassword.title')}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Icon name="x" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        {errors._general && <p className="text-sm text-red-500">{errors._general}</p>}
                        <div>
                            <label htmlFor="currentPassword" className={labelClasses}>{t('resetPassword.currentPassword')}</label>
                            <div className="relative">
                                <input 
                                    id="currentPassword" 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    value={currentPassword} 
                                    onChange={(e) => {
                                        setCurrentPassword(e.target.value);
                                        if (errors.currentPassword) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.currentPassword;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    onBlur={() => blurField('currentPassword')}
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.currentPassword ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className={`absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`}
                                >
                                    <Icon name={showCurrentPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                            {errors.currentPassword && (
                                <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="newPassword" className={labelClasses}>{t('resetPassword.newPassword')}</label>
                            <div className="relative">
                                <input 
                                    id="newPassword" 
                                    type={showNewPassword ? "text" : "password"} 
                                    value={newPassword} 
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (errors.newPassword) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.newPassword;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    onBlur={() => blurField('newPassword')}
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={handleNewPasswordVisibilityToggle}
                                    className={`absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`}
                                >
                                    <Icon name={showNewPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                            {errors.newPassword && (
                                <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
                            )}
                        </div>
                         <div>
                            <label htmlFor="confirmPassword" className={labelClasses}>{t('resetPassword.confirmNewPassword')}</label>
                            <div className="relative">
                                <input 
                                    id="confirmPassword" 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    value={confirmPassword} 
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (errors.confirmPassword) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.confirmPassword;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    onBlur={() => blurField('confirmPassword')}
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={handleConfirmPasswordVisibilityToggle}
                                    className={`absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`}
                                >
                                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
                            {t('resetPassword.cancel')}
                        </button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? t('resetPassword.changing') : t('resetPassword.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </>
    );
};

export default ResetPasswordModal;
