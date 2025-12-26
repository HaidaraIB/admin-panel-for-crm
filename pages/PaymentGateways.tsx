
import React, { useState, useEffect } from 'react';
import { PaymentGateway, PaymentGatewayStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from '../components/Icon';
import GatewaySettingsModal from '../components/GatewaySettingsModal';
import AddGatewayModal from '../components/AddGatewayModal';
import AlertDialog from '../components/AlertDialog';
import { useAuditLog } from '../context/AuditLogContext';
import GatewayCardSkeleton from '../components/GatewayCardSkeleton';
import { getPaymentGatewaysAPI, getPaymentGatewayAPI, updatePaymentGatewayAPI, togglePaymentGatewayAPI, createPaymentGatewayAPI } from '../services/api';

const GatewayCard: React.FC<{ gateway: PaymentGateway, onManage: () => void, onToggle: (enabled: boolean) => void }> = ({ gateway, onManage, onToggle }) => {
    const { t } = useI18n();

    const statusMap: { [key in PaymentGatewayStatus]: { text: string; bg: string; text_color: string } } = {
        [PaymentGatewayStatus.Active]: { text: t('status.Active'), bg: 'bg-green-100 dark:bg-green-900', text_color: 'text-green-800 dark:text-green-300' },
        [PaymentGatewayStatus.Disabled]: { text: t('status.Disabled'), bg: 'bg-gray-100 dark:bg-gray-700', text_color: 'text-gray-800 dark:text-gray-300' },
        [PaymentGatewayStatus.SetupRequired]: { text: t('status.SetupRequired'), bg: 'bg-yellow-100 dark:bg-yellow-900', text_color: 'text-yellow-800 dark:text-yellow-300' },
    };
    
    const currentStatus = statusMap[gateway.status];
    const isToggleDisabled = gateway.status === PaymentGatewayStatus.SetupRequired;
    const gatewayNameLower = gateway.name.toLowerCase();
    const isPaytabs = gatewayNameLower.includes('paytabs');
    const isStripe = gatewayNameLower.includes('stripe');
    const isZaincash = gatewayNameLower.includes('zaincash') || gatewayNameLower.includes('zain cash');
    const isQicard = gatewayNameLower.includes('qicard') || gatewayNameLower.includes('qi card') || gatewayNameLower.includes('qi-card');

    const getGatewayLogo = () => {
        if (isPaytabs) {
            return <img src="/paytabs_logo.png" alt="PayTabs" className="h-10 w-auto object-contain" />;
        } else if (isStripe) {
            return <img src="/stripe_logo.png" alt="Stripe" className="h-10 w-auto object-contain" />;
        } else if (isZaincash) {
            return <img src="/zain_cash_logo.png" alt="Zain Cash" className="h-10 w-auto object-contain" />;
        } else if (isQicard) {
            return <img src="/q_card_logo.svg" alt="QiCard" className="h-10 w-auto object-contain" />;
        } else {
            return <i className={`pf pf-${gateway.id.toLowerCase()} pf-3x`}></i>;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="h-10 flex items-center gap-3 rtl:gap-3 text-gray-700 dark:text-gray-300">
                        {getGatewayLogo()}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{gateway.name}</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer" title={isToggleDisabled ? "Setup required to enable" : (gateway.enabled ? "Deactivate" : "Activate")}>
                        <input 
                            type="checkbox" 
                            checked={gateway.enabled} 
                            onChange={(e) => {
                                e.preventDefault();
                                onToggle(!gateway.enabled);
                            }} 
                            className="sr-only peer" 
                            disabled={isToggleDisabled} 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 min-h-[40px]">{gateway.description}</p>
            </div>
            <div className="mt-6 flex justify-between items-center">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${currentStatus.bg} ${currentStatus.text_color}`}>
                    {currentStatus.text}
                </span>
                <button onClick={onManage} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
                    <Icon name="settings" className="w-4 h-4" />
                    <span>{t('paymentGateways.manage')}</span>
                </button>
            </div>
        </div>
    );
};


const PaymentGateways: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmToggle, setConfirmToggle] = useState<{ gatewayId: string; enabled: boolean; gatewayName: string } | null>(null);
    const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'error',
    });

    useEffect(() => {
        loadGateways();
    }, []);

    const loadGateways = async () => {
        setIsLoading(true);
        try {
            const response = await getPaymentGatewaysAPI();
            // Map API payment gateway fields to frontend format
            const apiGateways: PaymentGateway[] = (response.results || []).map((gateway: any) => ({
                id: gateway.id.toString(), // API field: id
                name: gateway.name, // API field: name
                description: gateway.description || '', // API field: description
                status: gateway.status === 'active' ? PaymentGatewayStatus.Active
                    : gateway.status === 'disabled' ? PaymentGatewayStatus.Disabled
                    : PaymentGatewayStatus.SetupRequired, // API field: status
                enabled: gateway.enabled || false, // API field: enabled
                config: gateway.config || {}, // API field: config
            }));
            setGateways(apiGateways);
        } catch (error) {
            console.error('Error loading payment gateways:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManage = async (gateway: PaymentGateway) => {
        try {
            // Reload the gateway from API to get latest data including config
            const freshGateway = await getPaymentGatewayAPI(parseInt(gateway.id));
            // Map API response to frontend format
            const mappedGateway: PaymentGateway = {
                id: freshGateway.id.toString(),
                name: freshGateway.name,
                description: freshGateway.description || '',
                status: freshGateway.status === 'active' ? PaymentGatewayStatus.Active
                    : freshGateway.status === 'disabled' ? PaymentGatewayStatus.Disabled
                    : PaymentGatewayStatus.SetupRequired,
                enabled: freshGateway.enabled || false,
                config: freshGateway.config || {},
            };
            setSelectedGateway(mappedGateway);
            setIsSettingsModalOpen(true);
        } catch (error) {
            console.error('Error loading gateway details:', error);
            // Fallback to using the gateway from list if API call fails
            setSelectedGateway(gateway);
            setIsSettingsModalOpen(true);
        }
    };

    const handleToggle = (gatewayId: string, enabled: boolean) => {
        const gateway = gateways.find(gw => gw.id === gatewayId);
        if (!gateway) return;

        // Show confirmation for both activation and deactivation
        setConfirmToggle({ gatewayId, enabled, gatewayName: gateway.name });
    };

    const performToggle = async (gatewayId: string, enabled: boolean) => {
        try {
            const gateway = gateways.find(gw => gw.id === gatewayId);
            if (!gateway) return;

            const gatewayNameLower = gateway.name.toLowerCase();
            const isPaytabs = gatewayNameLower.includes('paytabs');
            const isStripe = gatewayNameLower.includes('stripe');

            // If enabling PayTabs or Stripe, disable the other one
            if (enabled && (isPaytabs || isStripe)) {
                const otherGatewayType = isPaytabs ? 'stripe' : 'paytabs';
                const otherGateway = gateways.find(gw => {
                    const nameLower = gw.name.toLowerCase();
                    return nameLower.includes(otherGatewayType) && gw.enabled;
                });

                if (otherGateway) {
                    // Disable the other gateway first
                    await updatePaymentGatewayAPI(parseInt(otherGateway.id), {
                        name: otherGateway.name,
                        description: otherGateway.description,
                        status: otherGateway.status === PaymentGatewayStatus.Active ? 'active'
                            : otherGateway.status === PaymentGatewayStatus.Disabled ? 'disabled'
                            : 'setup_required',
                        enabled: false,
                        config: otherGateway.config,
                    });
                }
            }

            // Use API endpoint to toggle
            await togglePaymentGatewayAPI(parseInt(gatewayId));
            await loadGateways();
            
            const action = enabled ? t('audit.log.activated') : t('audit.log.deactivated');
            addLog('audit.log.gatewayToggled', { action, gatewayName: gateway.name });
        } catch (error: any) {
            console.error('Error toggling gateway:', error);
            setAlertDialog({
                isOpen: true,
                title: t('common.error') || 'Error',
                message: error.message || t('paymentGateways.errors.toggleFailed') || 'Failed to toggle gateway',
                type: 'error',
            });
        } finally {
            setConfirmToggle(null);
        }
    };
    
    const handleSaveSettings = async (updatedGateway: PaymentGateway) => {
        try {
            const gatewayNameLower = updatedGateway.name.toLowerCase();
            const isPaytabs = gatewayNameLower.includes('paytabs');
            const isStripe = gatewayNameLower.includes('stripe');

            // If enabling PayTabs or Stripe, disable the other one
            if (updatedGateway.enabled && (isPaytabs || isStripe)) {
                const otherGatewayType = isPaytabs ? 'stripe' : 'paytabs';
                const otherGateway = gateways.find(gw => {
                    const nameLower = gw.name.toLowerCase();
                    return nameLower.includes(otherGatewayType) && gw.id !== updatedGateway.id && gw.enabled;
                });

                if (otherGateway) {
                    // IMPORTANT: Reload the other gateway from API to get the latest config
                    // This ensures we have all the current configuration values before disabling
                    try {
                        const freshOtherGateway = await getPaymentGatewayAPI(parseInt(otherGateway.id));
                        const otherGatewayConfig = freshOtherGateway.config || {};
                        
                        // Log the config before disabling to debug
                        console.log(`Disabling ${otherGatewayType} gateway. Current config:`, JSON.stringify(otherGatewayConfig, null, 2));
                        
                        // Disable the other gateway - only send enabled: false, let backend merge config
                        // The backend serializer will merge the config, so we only need to send enabled: false
                        // But to be safe, we'll send the full config to ensure nothing is lost
                        await updatePaymentGatewayAPI(parseInt(otherGateway.id), {
                            name: freshOtherGateway.name,
                            description: freshOtherGateway.description || '',
                            status: freshOtherGateway.status === 'active' ? 'active'
                                : freshOtherGateway.status === 'disabled' ? 'disabled'
                                : 'setup_required',
                            enabled: false,
                            config: otherGatewayConfig, // Send complete config to ensure nothing is lost
                        });
                        console.log(`Successfully disabled ${otherGatewayType} gateway with preserved config`);
                    } catch (error) {
                        console.error(`Error loading ${otherGatewayType} gateway before disabling:`, error);
                        // Fallback: use the gateway from the list (may be outdated)
                        const fallbackConfig = otherGateway.config || {};
                        console.log(`Using fallback config for ${otherGatewayType}:`, JSON.stringify(fallbackConfig, null, 2));
                        await updatePaymentGatewayAPI(parseInt(otherGateway.id), {
                            name: otherGateway.name,
                            description: otherGateway.description,
                            status: otherGateway.status === PaymentGatewayStatus.Active ? 'active'
                                : otherGateway.status === PaymentGatewayStatus.Disabled ? 'disabled'
                                : 'setup_required',
                            enabled: false,
                            config: fallbackConfig, // Fallback to list config
                        });
                    }
                }
            }

            // Use API field names: name, description, status, enabled, config
            await updatePaymentGatewayAPI(parseInt(updatedGateway.id), {
                name: updatedGateway.name, // API field: name
                description: updatedGateway.description, // API field: description
                status: updatedGateway.status === PaymentGatewayStatus.Active ? 'active'
                    : updatedGateway.status === PaymentGatewayStatus.Disabled ? 'disabled'
                    : 'setup_required', // API field: status
                enabled: updatedGateway.enabled, // API field: enabled
                config: updatedGateway.config, // API field: config
            });
            await loadGateways();
            addLog('audit.log.gatewaySettingsUpdated', { gatewayName: updatedGateway.name });
            setIsSettingsModalOpen(false);
            setSelectedGateway(null);
        } catch (error: any) {
            console.error('Error saving gateway settings:', error);
            setAlertDialog({
                isOpen: true,
                title: t('common.error') || 'Error',
                message: error.message || t('paymentGateways.errors.saveFailed') || 'Failed to save gateway settings',
                type: 'error',
            });
        }
    };

    const handleAddGateway = async (gatewayData: { name: string; description: string }): Promise<void> => {
        const response = await createPaymentGatewayAPI({
            name: gatewayData.name,
            description: gatewayData.description,
            status: 'setup_required',
            enabled: false,
            config: {},
        });
        
        // Map API response to frontend format
        const newGateway: PaymentGateway = {
            id: response.id.toString(),
            name: response.name,
            description: response.description || '',
            status: PaymentGatewayStatus.SetupRequired,
            enabled: response.enabled || false,
            config: response.config || {},
        };
        
        await loadGateways();
        addLog('audit.log.gatewayAdded', { gatewayName: gatewayData.name });
        setIsAddModalOpen(false);
        
        // Open settings modal for the new gateway
        setSelectedGateway(newGateway);
        setIsSettingsModalOpen(true);
    };

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('paymentGateways.title')}</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{t('paymentGateways.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium transition-colors"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    <span>{t('paymentGateways.addGateway')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <GatewayCardSkeleton key={i} />)
                ) : gateways.length === 0 ? (
                    <div className="col-span-full">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border dark:border-gray-700">
                            <Icon name="cash" className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {t('paymentGateways.noGateways')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('paymentGateways.noGatewaysDescription')}
                            </p>
                        </div>
                    </div>
                ) : (
                    gateways.map(gw => (
                        <GatewayCard 
                            key={gw.id} 
                            gateway={gw}
                            onManage={() => handleManage(gw)}
                            onToggle={(enabled) => handleToggle(gw.id, enabled)}
                        />
                    ))
                )}
            </div>
            
            <GatewaySettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                gateway={selectedGateway}
                onSave={handleSaveSettings}
            />
            
            <AddGatewayModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddGateway}
            />

            {/* Confirmation Modal for Gateway Activation */}
            {confirmToggle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setConfirmToggle(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {confirmToggle.enabled 
                                    ? t('paymentGateways.confirmActivation') 
                                    : t('paymentGateways.confirmDeactivation')}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                                {confirmToggle.enabled
                                    ? t('paymentGateways.confirmActivationMessage').replace('{gatewayName}', confirmToggle.gatewayName)
                                    : t('paymentGateways.confirmDeactivationMessage').replace('{gatewayName}', confirmToggle.gatewayName)}
                            </p>
                            {confirmToggle.enabled && (() => {
                                const gatewayNameLower = confirmToggle.gatewayName.toLowerCase();
                                const isPaytabs = gatewayNameLower.includes('paytabs');
                                const isStripe = gatewayNameLower.includes('stripe');
                                if (isPaytabs || isStripe) {
                                    const otherGatewayType = isPaytabs ? 'stripe' : 'paytabs';
                                    const otherGateway = gateways.find(gw => {
                                        const nameLower = gw.name.toLowerCase();
                                        return nameLower.includes(otherGatewayType) && gw.enabled;
                                    });
                                    if (otherGateway) {
                                        return (
                                            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                                    {t('paymentGateways.willDisableOther').replace('{otherGatewayName}', otherGateway.name)}
                                                </p>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <button
                                type="button"
                                onClick={() => setConfirmToggle(null)}
                                className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirmToggle) {
                                        performToggle(confirmToggle.gatewayId, confirmToggle.enabled);
                                    }
                                }}
                                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                            >
                                {t('common.confirm') || 'تأكيد'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog
                isOpen={alertDialog.isOpen}
                onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
                title={alertDialog.title}
                message={alertDialog.message}
                type={alertDialog.type}
            />
        </div>
    );
};

export default PaymentGateways;