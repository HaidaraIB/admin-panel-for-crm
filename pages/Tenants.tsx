
import React, { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Tenant, TenantStatus, Page } from '../types';
import { useI18n } from '../context/i18n';
import TenantModal from '../components/TenantModal';
import TenantActivationModal from '../components/TenantActivationModal';
import { useAuditLog } from '../context/AuditLogContext';
import TenantsFilterDrawer, { TenantFilters, tenantFilterDefaults } from '../components/TenantsFilterDrawer';

const statusColors: { [key in TenantStatus]: string } = {
    [TenantStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [TenantStatus.Trial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [TenantStatus.Expired]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [TenantStatus.Deactivated]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

interface TenantsProps {
    tenants: Tenant[];
    onUpdateTenant: (tenant: Tenant) => void;
    onActivateTenant: (tenantId: number, planId: number, startDate: string, endDate: string) => Promise<void>;
    onDeactivateTenant: (tenantId: number) => Promise<void>;
    isLoading?: boolean;
    onRefresh?: () => void;
}

const Tenants: React.FC<TenantsProps> = ({ 
    tenants, 
    onUpdateTenant, 
    onActivateTenant,
    onDeactivateTenant,
    isLoading = false,
    onRefresh
}) => {
    const { t, language } = useI18n();
    const { addLog } = useAuditLog();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
    const [filters, setFilters] = useState<TenantFilters>(tenantFilterDefaults);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [tenantToActivate, setTenantToActivate] = useState<Tenant | null>(null);

    const handleViewDetails = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setModalMode('view');
        setIsModalOpen(true);
    };


    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTenant(null);
    };

    const handleSaveTenant = (updatedTenant: Tenant) => {
        onUpdateTenant(updatedTenant);
        handleCloseModal();
    };

    const handleToggleStatus = (tenant: Tenant) => {
        setTenantToActivate(tenant);
        setIsActivationModalOpen(true);
    };

    const uniquePlans = useMemo(() => {
        const planSet = new Set<string>();
        tenants.forEach((tenant) => {
            if (tenant.currentPlan) {
                planSet.add(tenant.currentPlan);
            }
        });
        return Array.from(planSet).sort((a, b) => a.localeCompare(b));
    }, [tenants]);

    const filteredTenants = useMemo(() => {
        return tenants.filter((tenant) => {
            const searchTerm = filters.search.trim().toLowerCase();
            if (searchTerm) {
                const matchesSearch =
                    tenant.name.toLowerCase().includes(searchTerm) ||
                    tenant.domain.toLowerCase().includes(searchTerm);
                if (!matchesSearch) {
                    return false;
                }
            }

            if (filters.plan && tenant.currentPlan !== filters.plan) {
                return false;
            }

            if (filters.statuses.length > 0 && !filters.statuses.includes(tenant.status)) {
                return false;
            }

            const startDateValue = tenant.startDate ? new Date(tenant.startDate) : null;
            const endDateValue = tenant.endDate ? new Date(tenant.endDate) : null;

            if (filters.startDateFrom) {
                const from = new Date(filters.startDateFrom);
                if (!startDateValue || startDateValue < from) {
                    return false;
                }
            }

            if (filters.startDateTo) {
                const to = new Date(filters.startDateTo);
                if (!startDateValue || startDateValue > to) {
                    return false;
                }
            }

            if (filters.endDateFrom) {
                const from = new Date(filters.endDateFrom);
                if (!endDateValue || endDateValue < from) {
                    return false;
                }
            }

            if (filters.endDateTo) {
                const to = new Date(filters.endDateTo);
                if (!endDateValue || endDateValue > to) {
                    return false;
                }
            }

            return true;
        });
    }, [tenants, filters]);

    const hasActiveFilters = useMemo(() => {
        return (
            filters.search.trim() !== '' ||
            filters.plan !== '' ||
            filters.statuses.length > 0 ||
            filters.startDateFrom !== '' ||
            filters.startDateTo !== '' ||
            filters.endDateFrom !== '' ||
            filters.endDateTo !== ''
        );
    }, [filters]);

    const handleApplyFilters = (nextFilters: TenantFilters) => {
        setFilters(nextFilters);
        setIsFilterDrawerOpen(false);
    };

    const handleResetFilters = () => {
        setFilters(tenantFilterDefaults);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('tenants.title')}</h1>
                <div className="flex gap-2 self-start md:self-auto">
                    <button
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                        type="button"
                    >
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
                            <Icon name="filter" className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {t('tenants.filters.open')}
                        </span>
                        {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.companyName')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.subdomain')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.currentPlan')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.status')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.endDate')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('tenants.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        {t('tenants.loading')}
                                    </td>
                                </tr>
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        {t('tenants.noTenants')}
                                    </td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        {t('tenants.filters.noResults')}
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 text-center font-medium text-gray-900 whitespace-nowrap dark:text-white">{tenant.name}</td>
                                    <td className="px-6 py-4 text-center">{tenant.domain}</td>
                                    <td className="px-6 py-4 text-center">{tenant.currentPlan || t('dashboard.noPlan')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[tenant.status || TenantStatus.Deactivated]}`}>{t(`status.${tenant.status || TenantStatus.Deactivated}`)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{tenant.endDate || 'N/A'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => handleViewDetails(tenant)} 
                                                className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20" 
                                                title={t('tenants.actions.view')}
                                            >
                                                <Icon name="view" className="w-5 h-5"/>
                                            </button>
                                            <label 
                                                className="relative inline-flex items-center cursor-pointer" 
                                                title={(tenant.status === TenantStatus.Active || tenant.status === TenantStatus.Trial) ? t('tenants.actions.deactivate') : t('tenants.actions.activate')}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={tenant.status === TenantStatus.Active || tenant.status === TenantStatus.Trial} 
                                                    onChange={() => handleToggleStatus(tenant)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <TenantModal 
                isOpen={isModalOpen}
                tenant={selectedTenant}
                mode={modalMode}
                onClose={handleCloseModal}
                onSave={handleSaveTenant}
            />
            <TenantsFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                filters={filters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                plans={uniquePlans}
            />
            <TenantActivationModal
                tenant={tenantToActivate}
                isOpen={isActivationModalOpen}
                onClose={() => {
                    setIsActivationModalOpen(false);
                    setTenantToActivate(null);
                }}
                onActivate={async (tenantId, planId, startDate, endDate) => {
                    await onActivateTenant(tenantId, planId, startDate, endDate);
                    if (onRefresh) {
                        await onRefresh();
                    }
                }}
                onDeactivate={async (tenantId) => {
                    await onDeactivateTenant(tenantId);
                    if (onRefresh) {
                        await onRefresh();
                    }
                }}
            />
        </div>
    );
};

export default Tenants;
