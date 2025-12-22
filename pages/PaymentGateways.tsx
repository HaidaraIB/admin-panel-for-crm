
import React, { useState, useEffect } from 'react';
import { PaymentGateway, PaymentGatewayStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from '../components/Icon';
import GatewaySettingsModal from '../components/GatewaySettingsModal';
import AddGatewayModal from '../components/AddGatewayModal';
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

    const getGatewayLogo = () => {
        if (isPaytabs) {
            return <img src="/paytabs_logo.png" alt="PayTabs" className="h-10 w-auto object-contain" />;
        } else if (isStripe) {
            return <img src="/stripe_logo.png" alt="Stripe" className="h-10 w-auto object-contain" />;
        } else if (isZaincash) {
            return <img src="/zain_cash_logo.png" alt="Zain Cash" className="h-10 w-auto object-contain" />;
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
                        <input type="checkbox" checked={gateway.enabled} onChange={(e) => onToggle(e.target.checked)} className="sr-only peer" disabled={isToggleDisabled} />
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

    const handleToggle = async (gatewayId: string, enabled: boolean) => {
        try {
            const gateway = gateways.find(gw => gw.id === gatewayId);
            if (!gateway) return;

            // Use API endpoint to toggle
            await togglePaymentGatewayAPI(parseInt(gatewayId));
            await loadGateways();
            
            const action = enabled ? t('audit.log.activated') : t('audit.log.deactivated');
            addLog('audit.log.gatewayToggled', { action, gatewayName: gateway.name });
        } catch (error: any) {
            console.error('Error toggling gateway:', error);
            alert(error.message || 'Failed to toggle gateway');
        }
    };
    
    const handleSaveSettings = async (updatedGateway: PaymentGateway) => {
        try {
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
            alert(error.message || 'Failed to save gateway settings');
        }
    };

    const handleAddGateway = async (gatewayData: { name: string; description: string }) => {
        try {
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
        } catch (error: any) {
            console.error('Error creating payment gateway:', error);
            alert(error.message || 'Failed to create payment gateway');
        }
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
        </div>
    );
};

export default PaymentGateways;