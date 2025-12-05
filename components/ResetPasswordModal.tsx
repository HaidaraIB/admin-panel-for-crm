
import React, { useState } from 'react';
import { changePasswordAPI } from '../services/api';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
    const { t, language } = useI18n();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{[key: string]: string[]}>({});
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
    const [showSuccess, setShowSuccess] = useState(false);

    // Function to translate error messages
    const translateError = (errorMsg: string): string => {
        const errorLower = errorMsg.toLowerCase();
        
        // Map common Django password validation errors
        if (errorLower.includes('too similar') || errorLower.includes('similar to the username')) {
            return t('resetPassword.errors.tooSimilar');
        }
        if (errorLower.includes('too common') || errorLower.includes('common')) {
            return t('resetPassword.errors.tooCommon');
        }
        if (errorLower.includes('too short') || errorLower.includes('at least')) {
            return t('resetPassword.errors.minLength');
        }
        if (errorLower.includes('entirely numeric') || errorLower.includes('numeric')) {
            return t('resetPassword.errors.entirelyNumeric');
        }
        if (errorLower.includes('do not match') || errorLower.includes('match')) {
            return t('resetPassword.passwordMismatch');
        }
        if (errorLower.includes('required')) {
            return t('resetPassword.errors.required');
        }
        if (errorLower.includes('incorrect')) {
            return t('resetPassword.errors.incorrect');
        }
        
        // Return original message if no translation found
        return errorMsg;
    };

    if (!isOpen) return null;

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        
        if (newPassword !== confirmPassword) {
            setErrors({ confirm_password: [t('resetPassword.passwordMismatch') || 'Passwords do not match'] });
            return;
        }

        if (newPassword.length < 8) {
            setErrors({ new_password: [t('resetPassword.errors.minLength')] });
            return;
        }

        setIsLoading(true);
        try {
            await changePasswordAPI(currentPassword, newPassword, confirmPassword);
            setShowSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setErrors({});
            // Close modal after 2 seconds
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
            }, 2000);
        } catch (error: any) {
            try {
                // Try to parse error response as JSON
                let errorData: any;
                if (typeof error.message === 'string') {
                    try {
                        errorData = JSON.parse(error.message);
                    } catch {
                        // If it's not JSON, check if it's already an object
                        errorData = error.message;
                    }
                } else {
                    errorData = error.message;
                }
                
                if (typeof errorData === 'object' && errorData !== null && !Array.isArray(errorData)) {
                    // Handle API validation errors (field-specific errors)
                    const formattedErrors: {[key: string]: string[]} = {};
                    Object.keys(errorData).forEach(key => {
                        if (Array.isArray(errorData[key])) {
                            // Translate each error message
                            formattedErrors[key] = errorData[key].map((err: string) => translateError(err));
                        } else if (typeof errorData[key] === 'string') {
                            formattedErrors[key] = [translateError(errorData[key])];
                        }
                    });
                    
                    if (Object.keys(formattedErrors).length > 0) {
                        setErrors(formattedErrors);
                    } else {
                        // If no field errors, show as general error
                        const errorMsg = errorData.detail || errorData.message || errorData.error || 'Failed to change password';
                        setErrors({ general: [translateError(errorMsg)] });
                    }
                } else {
                    // If it's a string or other format, show as general error
                    const errorMsg = typeof errorData === 'string' ? errorData : (error.message || 'Failed to change password');
                    setErrors({ general: [translateError(errorMsg)] });
                }
            } catch {
                // If parsing fails, show general error
                setErrors({ general: [translateError(error.message || 'Failed to change password')] });
            }
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
                        <div>
                            <label htmlFor="currentPassword" className={labelClasses}>{t('resetPassword.currentPassword')}</label>
                            <div className="relative">
                                <input 
                                    id="currentPassword" 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    value={currentPassword} 
                                    onChange={(e) => {
                                        setCurrentPassword(e.target.value);
                                        if (errors.current_password) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.current_password;
                                                return newErrors;
                                            });
                                        }
                                    }} 
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.current_password ? 'border-red-500 focus:ring-red-500' : ''}`} 
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
                            {errors.current_password && (
                                <div className="mt-1 space-y-1">
                                    {errors.current_password.map((err, idx) => (
                                        <p key={idx} className="text-sm text-red-500">{err}</p>
                                    ))}
                                </div>
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
                                        if (errors.new_password) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.new_password;
                                                return newErrors;
                                            });
                                        }
                                    }} 
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.new_password ? 'border-red-500 focus:ring-red-500' : ''}`} 
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
                            {errors.new_password && (
                                <div className="mt-1 space-y-1">
                                    {errors.new_password.map((err, idx) => (
                                        <p key={idx} className="text-sm text-red-500">{err}</p>
                                    ))}
                                </div>
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
                                        if (errors.confirm_password) {
                                            setErrors(prev => {
                                                const newErrors = {...prev};
                                                delete newErrors.confirm_password;
                                                return newErrors;
                                            });
                                        }
                                    }} 
                                    className={`${inputClasses} ${language === 'ar' ? 'pe-10' : 'ps-10'} ${errors.confirm_password ? 'border-red-500 focus:ring-red-500' : ''}`} 
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
                            {errors.confirm_password && (
                                <div className="mt-1 space-y-1">
                                    {errors.confirm_password.map((err, idx) => (
                                        <p key={idx} className="text-sm text-red-500">{err}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.general && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{errors.general[0]}</p>
                            </div>
                        )}
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
        {showSuccess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={handleCloseSuccess}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in fade-in zoom-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <Icon name="check" className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {t('resetPassword.success')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {t('resetPassword.successMessage') || 'Your password has been changed successfully.'}
                        </p>
                        <button
                            onClick={handleCloseSuccess}
                            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium transition-colors"
                        >
                            {t('common.ok') || 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
    );
};

export default ResetPasswordModal;
