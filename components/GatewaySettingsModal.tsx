
import React, { useState, useEffect } from 'react';
import { PaymentGateway, PaymentGatewayStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface GatewaySettingsModalProps {
  gateway: PaymentGateway | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (gateway: PaymentGateway) => void;
}

const GatewaySettingsModal: React.FC<GatewaySettingsModalProps> = ({ gateway, isOpen, onClose, onSave }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<PaymentGateway['config'] | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    if (gateway) {
      setFormData({ ...gateway.config });
      setTestStatus('idle'); // Reset test status when modal opens or gateway changes
      setShowKeys(false); // Reset visibility state
    }
  }, [gateway, isOpen]);
  
  if (!isOpen || !gateway || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
    setTestStatus('idle'); // Reset test status on any input change
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    // Simulate API call
    setTimeout(() => {
      const isPaytabs = gateway.name.toLowerCase().includes('paytabs') || gateway.id.toLowerCase().includes('paytabs');
      if (isPaytabs) {
        // Paytabs requires Profile ID, Server Key, and Client Key
        if (formData.profileId && formData.serverKey && formData.clientKey) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
        }
      } else {
        // Generic gateways (Stripe, etc.)
        if (formData.publishableKey && formData.secretKey) {
          setTestStatus('success');
        } else {
          setTestStatus('error');
        }
      }
    }, 1500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isPaytabs = gateway.name.toLowerCase().includes('paytabs') || gateway.id.toLowerCase().includes('paytabs');
    let hasKeys = false;
    
    if (isPaytabs) {
      hasKeys = !!(formData.profileId && formData.serverKey && formData.clientKey);
    } else {
      hasKeys = !!(formData.publishableKey && formData.secretKey);
    }
    
    const newStatus = hasKeys ? (gateway.enabled ? PaymentGatewayStatus.Active : PaymentGatewayStatus.Disabled) : PaymentGatewayStatus.SetupRequired;
    const newEnabled = hasKeys ? gateway.enabled : false;

    onSave({
      ...gateway,
      config: formData,
      status: newStatus,
      enabled: newEnabled,
    });
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  const isPaytabs = gateway.name.toLowerCase().includes('paytabs') || gateway.id.toLowerCase().includes('paytabs');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSave}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <i className={`pf pf-${gateway.id.toLowerCase()} pf-lg`}></i>
                    <h2 className="text-xl font-semibold">{gateway.name} {t('paymentGateways.modal.title')}</h2>
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Icon name="x" className="w-6 h-6" />
                </button>
            </div>
            
            <div className="p-8 space-y-6">
                {isPaytabs ? (
                    <>
                        <div>
                            <label htmlFor="profileId" className={labelClasses}>{t('paymentGateways.modal.profileId')}</label>
                            <input 
                                id="profileId" 
                                name="profileId" 
                                type="text" 
                                value={formData.profileId || ''} 
                                onChange={handleChange} 
                                className={inputClasses} 
                                placeholder={t('paymentGateways.modal.profileIdPlaceholder')}
                            />
                        </div>
                        <div>
                            <label htmlFor="serverKey" className={labelClasses}>{t('paymentGateways.modal.serverKey')}</label>
                            <div className="relative">
                                <input 
                                    id="serverKey" 
                                    name="serverKey" 
                                    type={showKeys ? 'text' : 'password'} 
                                    value={formData.serverKey || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.serverKeyPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKeys(!showKeys)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showKeys ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="clientKey" className={labelClasses}>{t('paymentGateways.modal.clientKey')}</label>
                            <div className="relative">
                                <input 
                                    id="clientKey" 
                                    name="clientKey" 
                                    type={showKeys ? 'text' : 'password'} 
                                    value={formData.clientKey || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.clientKeyPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKeys(!showKeys)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showKeys ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label htmlFor="publishableKey" className={labelClasses}>{t('paymentGateways.modal.publishableKey')}</label>
                            <input id="publishableKey" name="publishableKey" type="text" value={formData.publishableKey || ''} onChange={handleChange} className={inputClasses}/>
                        </div>
                        <div>
                            <label htmlFor="secretKey" className={labelClasses}>{t('paymentGateways.modal.secretKey')}</label>
                            <input id="secretKey" name="secretKey" type="password" value={formData.secretKey || ''} onChange={handleChange} className={inputClasses}/>
                        </div>
                    </>
                )}
                 <div>
                    <label className={labelClasses}>{t('paymentGateways.modal.environment')}</label>
                    <div className="flex space-x-4 rtl:space-x-reverse">
                       <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                           <input type="radio" name="environment" value="test" checked={formData.environment === 'test' || !formData.environment} onChange={handleChange} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                           <span>{t('paymentGateways.modal.environment.test')}</span>
                       </label>
                       <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                           <input type="radio" name="environment" value="live" checked={formData.environment === 'live'} onChange={handleChange} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                           <span>{t('paymentGateways.modal.environment.live')}</span>
                       </label>
                    </div>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                     <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'} className="w-full flex justify-center items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-70 disabled:cursor-wait">
                        {testStatus === 'testing' ? <LoadingSpinner /> : t('paymentGateways.modal.testConnection')}
                     </button>
                     {testStatus === 'success' && <p className="text-sm text-green-600 dark:text-green-400 mt-2 text-center">✅ {t('paymentGateways.modal.connectionSuccess')}</p>}
                     {testStatus === 'error' && <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">❌ {t('paymentGateways.modal.connectionError')}</p>}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
                {t('common.cancel')}
                </button>
                <button type="submit" disabled={testStatus !== 'success'} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-not-allowed">
                {t('common.save')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default GatewaySettingsModal;