
import React, { useState, useEffect } from 'react';
import { PaymentGateway, PaymentGatewayStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import { testPaymentGatewayConnectionAPI } from '../services/api';

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
  const [testMessage, setTestMessage] = useState<string>('');
  const [testPassed, setTestPassed] = useState<boolean>(false); // Track if test passed, persists through input changes
  const [showServerKey, setShowServerKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [showMerchantSecret, setShowMerchantSecret] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (gateway && isOpen) {
      // Ensure config exists and initialize formData with all possible fields
      const config = gateway.config || {};
      setFormData({
        merchantId: config.merchantId || '',
        merchantSecret: config.merchantSecret || '',
        msisdn: config.msisdn || '',
        profileId: config.profileId || '',
        serverKey: config.serverKey || '',
        clientKey: config.clientKey || '',
        publishableKey: config.publishableKey || '',
        secretKey: config.secretKey || '',
        terminalId: config.terminalId || config.terminalId || '',
        username: config.username || '',
        password: config.password || '',
        clientId: config.clientId || '',
        clientSecret: config.clientSecret || '',
        environment: config.environment || 'test',
      });
      setTestStatus('idle'); // Reset test status when modal opens or gateway changes
      setTestMessage(''); // Reset test message
      setTestPassed(false); // Reset test passed flag
      // Reset all visibility states
      setShowServerKey(false);
      setShowClientKey(false);
      setShowMerchantSecret(false);
      setShowSecretKey(false);
      setShowPassword(false);
    }
  }, [gateway, isOpen]);
  
  if (!isOpen || !gateway || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'radio') {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
    setTestStatus('idle'); // Reset test status on any input change
    // Only reset testPassed if a credential field changed
    const credentialFields = ['merchantId', 'merchantSecret', 'profileId', 'serverKey', 'clientKey', 'publishableKey', 'secretKey', 'terminalId', 'username', 'password', 'clientId', 'clientSecret'];
    if (credentialFields.includes(name)) {
      setTestPassed(false); // Reset test passed flag when credentials change
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    
    try {
      // First validate required fields are present
      const gatewayNameLower = gateway.name.toLowerCase();
      const isPaytabs = gatewayNameLower.includes('paytabs');
      const isZaincash = gatewayNameLower.includes('zaincash') || gatewayNameLower.includes('zain cash');
      const isStripe = gatewayNameLower.includes('stripe');
      const isQicard = gatewayNameLower.includes('qicard') || gatewayNameLower.includes('qi card') || gatewayNameLower.includes('qi-card');
      const isFib = gatewayNameLower.includes('fib') || gatewayNameLower.includes('first iraqi');
      
      if (isPaytabs) {
        if (!formData.profileId || !formData.serverKey || !formData.clientKey) {
          setTestStatus('error');
          return;
        }
      } else if (isZaincash) {
        if (!formData.merchantId || !formData.merchantSecret) {
          setTestStatus('error');
          return;
        }
      } else if (isStripe) {
        if (!formData.secretKey) {
          setTestStatus('error');
          return;
        }
      } else if (isQicard) {
        if (!formData.terminalId || !formData.username || !formData.password) {
          setTestStatus('error');
          return;
        }
      } else if (isFib) {
        if (!formData.clientId || !formData.clientSecret) {
          setTestStatus('error');
          return;
        }
      } else {
        // Generic gateways
        if (!formData.publishableKey || !formData.secretKey) {
          setTestStatus('error');
          return;
        }
      }
      
      // For Zain Cash, Stripe, QiCard, and FIB, make actual API test call
      if (isZaincash || isStripe || isQicard || isFib) {
        try {
          const result = await testPaymentGatewayConnectionAPI(parseInt(gateway.id), formData);
          setTestMessage(result.message || '');
          if (result.success) {
            setTestStatus('success');
            setTestPassed(true); // Mark test as passed
          } else {
            setTestStatus('error');
            setTestPassed(false);
          }
        } catch (error: any) {
          console.error('Test connection error:', error);
          setTestMessage(error.message || 'Connection failed, please check your keys.');
          setTestStatus('error');
          setTestPassed(false);
        }
      } else {
        // For other gateways (PayTabs, etc.), just validate fields are present
        // (Could add actual API tests for PayTabs later)
        setTestMessage('Credentials validated (no API test available for this gateway)');
        setTestStatus('success');
        setTestPassed(true);
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setTestMessage(error.message || 'Connection failed, please check your keys.');
      setTestStatus('error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const gatewayNameLower = gateway.name.toLowerCase();
    const isPaytabs = gatewayNameLower.includes('paytabs') || gateway.id.toLowerCase().includes('paytabs');
    const isZaincash = gatewayNameLower.includes('zaincash') || gatewayNameLower.includes('zain cash');
    const isFib = gatewayNameLower.includes('fib') || gatewayNameLower.includes('first iraqi');
    let hasKeys = false;
    
    if (isPaytabs) {
      hasKeys = !!(formData?.profileId && formData?.serverKey && formData?.clientKey);
    } else if (isZaincash) {
      // Check if merchantId and merchantSecret exist and are not empty strings
      const merchantId = formData?.merchantId ? String(formData.merchantId).trim() : '';
      const merchantSecret = formData?.merchantSecret ? String(formData.merchantSecret).trim() : '';
      hasKeys = !!(merchantId && merchantSecret);
    } else if (isQicard) {
      // Check if terminalId, username, and password exist and are not empty strings
      const terminalId = formData?.terminalId ? String(formData.terminalId).trim() : '';
      const username = formData?.username ? String(formData.username).trim() : '';
      const password = formData?.password ? String(formData.password).trim() : '';
      hasKeys = !!(terminalId && username && password);
    } else if (isFib) {
      const clientId = formData?.clientId ? String(formData.clientId).trim() : '';
      const clientSecret = formData?.clientSecret ? String(formData.clientSecret).trim() : '';
      hasKeys = !!(clientId && clientSecret);
    } else {
      hasKeys = !!(formData?.publishableKey && formData?.secretKey);
    }
    
    // If test was successful and keys are present, set to Active
    // Otherwise, if keys are present but test wasn't done/failed, set to Disabled
    // If no keys, set to SetupRequired
    let newStatus: PaymentGatewayStatus;
    let newEnabled: boolean;
    
    if (!hasKeys) {
      newStatus = PaymentGatewayStatus.SetupRequired;
      newEnabled = false;
    } else if (testPassed || testStatus === 'success') {
      // Test passed - set to Active and enable it
      newStatus = PaymentGatewayStatus.Active;
      newEnabled = true;
    } else {
      // Keys are present but test wasn't done or failed - set to Disabled
      newStatus = PaymentGatewayStatus.Disabled;
      newEnabled = gateway.enabled || false;
    }

    // Merge formData with existing config to preserve any fields not in the form
    // This ensures we don't lose any existing configuration
    const existingConfig = gateway.config || {};
    const mergedConfig = {
      ...existingConfig,  // Start with existing config
      ...formData,        // Override with form data (only non-empty values)
    };
    
    // Remove empty string values to keep config clean
    const cleanedConfig: any = {};
    Object.keys(mergedConfig).forEach(key => {
      const value = mergedConfig[key];
      // Keep the value if it's not an empty string
      if (value !== '' && value !== null && value !== undefined) {
        cleanedConfig[key] = value;
      } else if (existingConfig[key] !== undefined && existingConfig[key] !== '') {
        // Keep existing value if form value is empty but existing value exists
        cleanedConfig[key] = existingConfig[key];
      }
    });

    onSave({
      ...gateway,
      config: cleanedConfig,
      status: newStatus,
      enabled: newEnabled,
    });
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  const gatewayNameLower = gateway.name.toLowerCase();
  const isPaytabs = gatewayNameLower.includes('paytabs');
  const isZaincash = gatewayNameLower.includes('zaincash') || gatewayNameLower.includes('zain cash');
  const isStripe = gatewayNameLower.includes('stripe');
  const isQicard = gatewayNameLower.includes('qicard') || gatewayNameLower.includes('qi card') || gatewayNameLower.includes('qi-card');
  const isFib = gatewayNameLower.includes('fib') || gatewayNameLower.includes('first iraqi');

  const getGatewayLogo = () => {
    if (isPaytabs) {
      return <img src="/paytabs_logo.png" alt="PayTabs" className="h-8 w-auto object-contain" />;
    } else if (isStripe) {
      return <img src="/stripe_logo.png" alt="Stripe" className="h-8 w-auto object-contain" />;
    } else if (isZaincash) {
      return <img src="/zain_cash_logo.png" alt="Zain Cash" className="h-8 w-auto object-contain" />;
    } else if (isQicard) {
      return <img src="/q_card_logo.svg" alt="QiCard" className="h-8 w-auto object-contain" />;
    } else if (isFib) {
      return <span className="text-lg font-bold text-blue-700 dark:text-blue-400">FIB</span>;
    } else {
      return <i className={`pf pf-${gateway.id.toLowerCase()} pf-lg`}></i>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSave} autoComplete="off">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {getGatewayLogo()}
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
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="serverKey" className={labelClasses}>{t('paymentGateways.modal.serverKey')}</label>
                            <div className="relative">
                                <input 
                                    id="serverKey" 
                                    name="serverKey" 
                                    type={showServerKey ? 'text' : 'password'} 
                                    value={formData.serverKey || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.serverKeyPlaceholder')}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowServerKey(!showServerKey)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showServerKey ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="clientKey" className={labelClasses}>{t('paymentGateways.modal.clientKey')}</label>
                            <div className="relative">
                                <input 
                                    id="clientKey" 
                                    name="clientKey" 
                                    type={showClientKey ? 'text' : 'password'} 
                                    value={formData.clientKey || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.clientKeyPlaceholder')}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowClientKey(!showClientKey)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showClientKey ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : isZaincash ? (
                    <>
                        <div>
                            <label htmlFor="merchantId" className={labelClasses}>{t('paymentGateways.modal.merchantId')}</label>
                            <input 
                                id="merchantId" 
                                name="merchantId" 
                                type="text" 
                                value={formData.merchantId || ''} 
                                onChange={handleChange} 
                                className={inputClasses} 
                                placeholder={t('paymentGateways.modal.merchantIdPlaceholder')}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="merchantSecret" className={labelClasses}>{t('paymentGateways.modal.merchantSecret')}</label>
                            <div className="relative">
                                <input 
                                    id="merchantSecret" 
                                    name="merchantSecret" 
                                    type={showMerchantSecret ? 'text' : 'password'} 
                                    value={formData.merchantSecret || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.merchantSecretPlaceholder')}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowMerchantSecret(!showMerchantSecret)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showMerchantSecret ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="msisdn" className={labelClasses}>{t('paymentGateways.modal.msisdn')}</label>
                            <input 
                                id="msisdn" 
                                name="msisdn" 
                                type="text" 
                                value={formData.msisdn || ''} 
                                onChange={handleChange} 
                                className={inputClasses} 
                                placeholder={t('paymentGateways.modal.msisdnPlaceholder')}
                                autoComplete="off"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('paymentGateways.modal.msisdnHint')}</p>
                        </div>
                    </>
                ) : isQicard ? (
                    <>
                        <div>
                            <label htmlFor="terminalId" className={labelClasses}>{t('paymentGateways.modal.terminalId')}</label>
                            <input 
                                id="terminalId" 
                                name="terminalId" 
                                type="text" 
                                value={formData.terminalId || ''} 
                                onChange={handleChange} 
                                className={inputClasses} 
                                placeholder={t('paymentGateways.modal.terminalIdPlaceholder')}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className={labelClasses}>{t('paymentGateways.modal.username')}</label>
                            <input 
                                id="username" 
                                name="username" 
                                type="text" 
                                value={formData.username || ''} 
                                onChange={handleChange} 
                                className={inputClasses} 
                                placeholder={t('paymentGateways.modal.usernamePlaceholder')}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className={labelClasses}>{t('paymentGateways.modal.password')}</label>
                            <div className="relative">
                                <input 
                                    id="password" 
                                    name="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={formData.password || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'} 
                                    placeholder={t('paymentGateways.modal.passwordPlaceholder')}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : isFib ? (
                    <>
                        <div>
                            <label htmlFor="clientId" className={labelClasses}>Client ID</label>
                            <input
                                id="clientId"
                                name="clientId"
                                type="text"
                                value={formData.clientId || ''}
                                onChange={handleChange}
                                className={inputClasses}
                                placeholder="FIB Client ID"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="clientSecret" className={labelClasses}>Client Secret</label>
                            <div className="relative">
                                <input
                                    id="clientSecret"
                                    name="clientSecret"
                                    type={showSecretKey ? 'text' : 'password'}
                                    value={formData.clientSecret || ''}
                                    onChange={handleChange}
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'}
                                    placeholder="FIB Client Secret"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecretKey(!showSecretKey)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showSecretKey ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>{t('paymentGateways.modal.environment') || 'Environment'}</label>
                            <div className="flex gap-4 rtl:gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="environment" value="test" checked={(formData.environment || 'test') === 'test'} onChange={handleChange} className="rounded" />
                                    <span>Test (Sandbox)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="environment" value="live" checked={formData.environment === 'live'} onChange={handleChange} className="rounded" />
                                    <span>Live</span>
                                </label>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label htmlFor="publishableKey" className={labelClasses}>{t('paymentGateways.modal.publishableKey')}</label>
                            <input 
                                id="publishableKey" 
                                name="publishableKey" 
                                type="text" 
                                value={formData.publishableKey || ''} 
                                onChange={handleChange} 
                                className={inputClasses}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="secretKey" className={labelClasses}>{t('paymentGateways.modal.secretKey')}</label>
                            <div className="relative">
                                <input 
                                    id="secretKey" 
                                    name="secretKey" 
                                    type={showSecretKey ? 'text' : 'password'} 
                                    value={formData.secretKey || ''} 
                                    onChange={handleChange} 
                                    className={inputClasses + ' pr-10 rtl:pl-10 rtl:pr-3'}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecretKey(!showSecretKey)}
                                    className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 rtl:pr-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <Icon name={showSecretKey ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
                {!isFib && (
                <div>
                    <label className={labelClasses}>{t('paymentGateways.modal.environment')}</label>
                    <div className="flex space-x-4 rtl:space-x-reverse">
                       <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                           <input 
                               type="radio" 
                               name="environment" 
                               value="test" 
                               checked={formData.environment === 'test' || !formData.environment} 
                               onChange={handleChange} 
                               className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                           />
                           <span>{t('paymentGateways.modal.environment.test')}</span>
                       </label>
                       <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                           <input 
                               type="radio" 
                               name="environment" 
                               value="live" 
                               checked={formData.environment === 'live'} 
                               onChange={handleChange} 
                               className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                           />
                           <span>{t('paymentGateways.modal.environment.live')}</span>
                       </label>
                    </div>
                </div>
                )}
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                     <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'} className="w-full flex justify-center items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-70 disabled:cursor-wait">
                        {testStatus === 'testing' ? <LoadingSpinner /> : t('paymentGateways.modal.testConnection')}
                     </button>
                     {testStatus === 'success' && (
                       <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                         <div className="flex items-start space-x-2 rtl:space-x-reverse">
                           <span className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5">✅</span>
                           <p className="text-sm text-green-700 dark:text-green-300 break-words overflow-wrap-anywhere">
                             {testMessage || t('paymentGateways.modal.connectionSuccess')}
                           </p>
                         </div>
                       </div>
                     )}
                     {testStatus === 'error' && (
                       <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md max-h-32 overflow-y-auto">
                         <div className="flex items-start space-x-2 rtl:space-x-reverse">
                           <span className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">❌</span>
                           <p className="text-sm text-red-700 dark:text-red-300 break-words overflow-wrap-anywhere leading-relaxed">
                             {testMessage || t('paymentGateways.modal.connectionError')}
                           </p>
                         </div>
                       </div>
                     )}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
                {t('common.cancel')}
                </button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium">
                {t('common.save')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default GatewaySettingsModal;