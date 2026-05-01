
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { SystemBackup, LimitedAdmin } from '../types';
import { useI18n } from '../context/i18n';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuditLog } from '../context/AuditLogContext';
import { useAlert } from '../context/AlertContext';
import { useUser } from '../context/UserContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { messageFromParsedErrorBody } from '../services/api';
import LimitedAdminModal from '../components/LimitedAdminModal';
import AlertDialog from '../components/AlertDialog';
import { getSystemBackupsAPI, createSystemBackupAPI, deleteSystemBackupAPI, restoreSystemBackupAPI, getSystemBackupDownloadResponse, getSystemSettingsAPI, updateSystemSettingsAPI, getPlatformTwilioSettingsAPI, updatePlatformTwilioSettingsAPI, getPlatformWhatsAppSettingsAPI, updatePlatformWhatsAppSettingsAPI, getLimitedAdminsAPI, createLimitedAdminAPI, updateLimitedAdminAPI, deleteLimitedAdminAPI, toggleLimitedAdminActiveAPI, getCompaniesAPI, getPhoneOtpRequirementAPI, updatePhoneOtpRequirementAPI, getRegistrationEmailRequirementAPI, updateRegistrationEmailRequirementAPI, type PhoneOtpChannel, getBillingSettingsAPI, updateBillingSettingsAPI } from '../services/api';

type BackupSchedule = 'daily' | 'weekly' | 'monthly';

const BACKUP_SCHEDULE_STORAGE_KEY = 'systemSettings.backupSchedule';

const loadStoredSchedule = (): BackupSchedule => {
    if (typeof window === 'undefined') return 'daily';
    const saved = localStorage.getItem(BACKUP_SCHEDULE_STORAGE_KEY);
    if (saved === 'weekly' || saved === 'monthly' || saved === 'daily') {
        return saved;
    }
    return 'daily';
};

const persistSchedule = (schedule: BackupSchedule) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BACKUP_SCHEDULE_STORAGE_KEY, schedule);
};

type IntegrationPlatformKey = 'meta' | 'tiktok' | 'whatsapp' | 'twilio';
type IntegrationPolicyState = Record<IntegrationPlatformKey, {
    global_enabled: boolean;
    global_message: string;
    company_overrides: Record<string, { enabled: boolean; message: string }>;
}>;

const DEFAULT_INTEGRATION_POLICIES: IntegrationPolicyState = {
    meta: { global_enabled: true, global_message: '', company_overrides: {} },
    tiktok: { global_enabled: true, global_message: '', company_overrides: {} },
    whatsapp: { global_enabled: true, global_message: '', company_overrides: {} },
    twilio: { global_enabled: true, global_message: '', company_overrides: {} },
};

const GeneralSettings: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [usdToIqdRate, setUsdToIqdRate] = useState<number>(1300);
    const [mobileMinVersionAndroid, setMobileMinVersionAndroid] = useState('');
    const [mobileMinVersionIos, setMobileMinVersionIos] = useState('');
    const [mobileMinBuildAndroid, setMobileMinBuildAndroid] = useState('');
    const [mobileMinBuildIos, setMobileMinBuildIos] = useState('');
    const [mobileStoreUrlAndroid, setMobileStoreUrlAndroid] = useState('');
    const [mobileStoreUrlIos, setMobileStoreUrlIos] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 6000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const settings = await getSystemSettingsAPI();
            if (!settings) return;
            if (settings.usd_to_iqd_rate != null) setUsdToIqdRate(parseFloat(settings.usd_to_iqd_rate));
            setMobileMinVersionAndroid(settings.mobile_minimum_version_android || '');
            setMobileMinVersionIos(settings.mobile_minimum_version_ios || '');
            setMobileMinBuildAndroid(settings.mobile_minimum_build_android?.toString() || '');
            setMobileMinBuildIos(settings.mobile_minimum_build_ios?.toString() || '');
            setMobileStoreUrlAndroid(settings.mobile_store_url_android || '');
            setMobileStoreUrlIos(settings.mobile_store_url_ios || '');
        } catch (error) {
            console.error('Failed to load settings', error);
            setFeedback({ type: 'error', message: t('settings.general.loadError') || 'Failed to load settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            await updateSystemSettingsAPI({
                usd_to_iqd_rate: usdToIqdRate,
                mobile_minimum_version_android: mobileMinVersionAndroid.trim(),
                mobile_minimum_version_ios: mobileMinVersionIos.trim(),
                mobile_minimum_build_android: mobileMinBuildAndroid.trim() === '' ? null : Number(mobileMinBuildAndroid),
                mobile_minimum_build_ios: mobileMinBuildIos.trim() === '' ? null : Number(mobileMinBuildIos),
                mobile_store_url_android: mobileStoreUrlAndroid.trim(),
                mobile_store_url_ios: mobileStoreUrlIos.trim(),
            });
            addLog('audit.log.generalSettingsSaved');
            setFeedback({ type: 'success', message: t('settings.general.saveSuccess') || 'Settings saved successfully!' });
        } catch (error: any) {
            console.error('Failed to save settings', error);
            setFeedback({
                type: 'error',
                message: translateAdminApiError(error, t) || (error as Error).message || t('settings.general.saveError') || 'Failed to save settings',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const renderFeedback = () => {
        if (!feedback) return null;
        const isSuccess = feedback.type === 'success';
        return (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                isSuccess
                    ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                    : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
            }`}>
                <Icon name={isSuccess ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{feedback.message}</span>
            </div>
        );
    };

    return(
    <div className="space-y-6">
        <h3 className="text-xl font-semibold">{t('settings.general.title')}</h3>
        
        {renderFeedback()}

        {isLoading ? (
            <div className="flex justify-center py-8">
                <LoadingSpinner />
            </div>
        ) : (
            <div className="space-y-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.general.currency.title') || 'Currency Settings'}</h4>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            {t('settings.general.currency.usdToIqdRate') || 'USD to IQD Rate'}
                        </label>
                        <input
                            type="number"
                            step="100"
                            min="0"
                            value={usdToIqdRate}
                            onChange={(e) => setUsdToIqdRate(parseFloat(e.target.value) || 0)}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="1300.00"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.general.currency.usdToIqdRateHelp') || 'The conversion rate from USD to Iraqi Dinar (IQD)'}
                        </p>
                    </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('settings.general.mobileVersion.title') || 'Mobile App Version Gate'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.general.mobileVersion.help') || 'Leave minimum version empty to disable force update for that platform.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.minVersionAndroid') || 'Minimum Android Version'}
                            </label>
                            <input
                                type="text"
                                value={mobileMinVersionAndroid}
                                onChange={(e) => setMobileMinVersionAndroid(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="1.3.0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.minBuildAndroid') || 'Minimum Android Build (optional)'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={mobileMinBuildAndroid}
                                onChange={(e) => setMobileMinBuildAndroid(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="7"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.storeUrlAndroid') || 'Android Store URL'}
                            </label>
                            <input
                                type="text"
                                value={mobileStoreUrlAndroid}
                                onChange={(e) => setMobileStoreUrlAndroid(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="https://play.google.com/store/apps/details?id=..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.minVersionIos') || 'Minimum iOS Version'}
                            </label>
                            <input
                                type="text"
                                value={mobileMinVersionIos}
                                onChange={(e) => setMobileMinVersionIos(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="1.3.0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.minBuildIos') || 'Minimum iOS Build (optional)'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={mobileMinBuildIos}
                                onChange={(e) => setMobileMinBuildIos(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="7"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                {t('settings.general.mobileVersion.storeUrlIos') || 'iOS Store URL'}
                            </label>
                            <input
                                type="text"
                                value={mobileStoreUrlIos}
                                onChange={(e) => setMobileStoreUrlIos(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="https://apps.apple.com/app/id..."
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <LoadingSpinner />
                                <span className="mx-2">{t('settings.general.saving') || 'Saving...'}</span>
                            </>
                        ) : (
                            t('settings.general.save') || 'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        )}
    </div>
)};

const IntegrationsControlSettings: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [integrationPolicies, setIntegrationPolicies] = useState<IntegrationPolicyState>(DEFAULT_INTEGRATION_POLICIES);
    const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const platformLabels: Record<IntegrationPlatformKey, string> = {
        meta: t('settings.integrations.platform.meta') || 'Meta',
        tiktok: t('settings.integrations.platform.tiktok') || 'TikTok',
        whatsapp: t('settings.integrations.platform.whatsapp') || 'WhatsApp',
        twilio: t('settings.integrations.platform.twilio') || 'Twilio',
    };

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            try {
                const [settings, companiesResponse] = await Promise.all([getSystemSettingsAPI(), getCompaniesAPI()]);
                const incoming = (settings?.integration_policies || {}) as Partial<IntegrationPolicyState>;
                setIntegrationPolicies({
                    meta: { ...DEFAULT_INTEGRATION_POLICIES.meta, ...(incoming.meta || {}), company_overrides: incoming.meta?.company_overrides || {} },
                    tiktok: { ...DEFAULT_INTEGRATION_POLICIES.tiktok, ...(incoming.tiktok || {}), company_overrides: incoming.tiktok?.company_overrides || {} },
                    whatsapp: { ...DEFAULT_INTEGRATION_POLICIES.whatsapp, ...(incoming.whatsapp || {}), company_overrides: incoming.whatsapp?.company_overrides || {} },
                    twilio: { ...DEFAULT_INTEGRATION_POLICIES.twilio, ...(incoming.twilio || {}), company_overrides: incoming.twilio?.company_overrides || {} },
                });
                const list = ((companiesResponse?.results || []) as Array<{ id: number; name: string }>).map((c) => ({ id: c.id, name: c.name }));
                setCompanies(list);
                if (list.length > 0) setSelectedCompanyId(String(list[0].id));
            } catch (error) {
                console.error('Failed to load integration settings', error);
                setFeedback({ type: 'error', message: t('settings.integrations.loadError') || 'Failed to load integration settings.' });
            } finally {
                setIsLoading(false);
            }
        };
        loadAll();
    }, [t]);

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            await updateSystemSettingsAPI({ integration_policies: integrationPolicies });
            addLog('audit.log.generalSettingsSaved');
            setFeedback({ type: 'success', message: t('settings.integrations.saveSuccess') || 'Integration policies saved.' });
        } catch (error: any) {
            setFeedback({ type: 'error', message: translateAdminApiError(error, t) || t('settings.integrations.saveError') || 'Failed to save integration policies.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">{t('settings.integrations.title') || 'Integrations Access Control'}</h3>
            {feedback && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                    feedback.type === 'success'
                        ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                        : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
                }`}>
                    <Icon name={feedback.type === 'success' ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{feedback.message}</span>
                </div>
            )}
            {isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.integrations.help') || 'Configure global and per-company integration activation. Global message has priority when globally disabled.'}
                    </p>
                    <div className="space-y-4">
                        {(['meta', 'tiktok', 'whatsapp', 'twilio'] as IntegrationPlatformKey[]).map((platform) => {
                            const policy = integrationPolicies[platform];
                            const companyOverride = selectedCompanyId ? policy.company_overrides[selectedCompanyId] : undefined;
                            return (
                                <div key={platform} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-semibold text-gray-900 dark:text-white">{platformLabels[platform]}</h5>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={policy.global_enabled}
                                                onChange={(e) => setIntegrationPolicies((prev) => ({
                                                    ...prev,
                                                    [platform]: { ...prev[platform], global_enabled: e.target.checked },
                                                }))}
                                            />
                                            {t('settings.integrations.globalActive') || 'Global Active'}
                                        </label>
                                    </div>
                                    <textarea
                                        value={policy.global_message}
                                        onChange={(e) => setIntegrationPolicies((prev) => ({
                                            ...prev,
                                            [platform]: { ...prev[platform], global_message: e.target.value },
                                        }))}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder={t('settings.integrations.globalMessagePlaceholder') || 'Global deactivation message'}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                        <select
                                            value={selectedCompanyId}
                                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
                                        >
                                            {companies.map((company) => (
                                                <option key={company.id} value={company.id}>{company.name}</option>
                                            ))}
                                        </select>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={companyOverride ? companyOverride.enabled : true}
                                                onChange={(e) => {
                                                    if (!selectedCompanyId) return;
                                                    setIntegrationPolicies((prev) => ({
                                                        ...prev,
                                                        [platform]: {
                                                            ...prev[platform],
                                                            company_overrides: {
                                                                ...prev[platform].company_overrides,
                                                                [selectedCompanyId]: {
                                                                    enabled: e.target.checked,
                                                                    message: prev[platform].company_overrides[selectedCompanyId]?.message || '',
                                                                },
                                                            },
                                                        },
                                                    }));
                                                }}
                                            />
                                            {t('settings.integrations.companyActive') || 'Selected Company Active'}
                                        </label>
                                        <input
                                            type="text"
                                            value={companyOverride?.message || ''}
                                            onChange={(e) => {
                                                if (!selectedCompanyId) return;
                                                setIntegrationPolicies((prev) => ({
                                                    ...prev,
                                                    [platform]: {
                                                        ...prev[platform],
                                                        company_overrides: {
                                                            ...prev[platform].company_overrides,
                                                            [selectedCompanyId]: {
                                                                enabled: prev[platform].company_overrides[selectedCompanyId]?.enabled ?? true,
                                                                message: e.target.value,
                                                            },
                                                        },
                                                    },
                                                }));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
                                            placeholder={t('settings.integrations.companyMessagePlaceholder') || 'Company deactivation message'}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                        >
                            {isSaving ? <><LoadingSpinner /><span className="mx-2">{t('settings.general.saving') || 'Saving...'}</span></> : (t('settings.general.save') || 'Save Changes')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SecurityBackups: React.FC = () => {
    const { t, language } = useI18n();
    const { addLog } = useAuditLog();
    const [backupStatus, setBackupStatus] = useState<'idle' | 'in-progress'>('idle');
    const [backups, setBackups] = useState<SystemBackup[]>([]);
    const [backupSchedule, setBackupSchedule] = useState<BackupSchedule>(() => loadStoredSchedule());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalBackups, setTotalBackups] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [confirmBackupAction, setConfirmBackupAction] = useState<{ type: 'delete' | 'restore'; backup: SystemBackup } | null>(null);
    const PAGE_SIZE = 20;

    useEffect(() => {
        const loadSchedule = async () => {
            try {
                const settings = await getSystemSettingsAPI();
                const schedule = settings?.backup_schedule;
                if (schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly') {
                    setBackupSchedule(schedule);
                    persistSchedule(schedule);
                }
            } catch {
                // Keep localStorage fallback
            }
        };
        loadSchedule();
    }, []);

    const loadBackups = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const response = await getSystemBackupsAPI({ page });
            setBackups((response.results ?? []) as SystemBackup[]);
            setTotalBackups(response.count || 0);
        } catch (error) {
            console.error('Failed to load backups', error);
            setFeedback({ type: 'error', message: t('settings.security.loadError') });
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadBackups(currentPage);
    }, [currentPage, loadBackups]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(totalBackups / PAGE_SIZE));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [totalBackups, currentPage]);

    useEffect(() => {
        persistSchedule(backupSchedule);
    }, [backupSchedule]);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 6000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const scheduleOptions = useMemo(
        () => ([
            { value: 'daily', label: t('settings.security.schedule.daily') },
            { value: 'weekly', label: t('settings.security.schedule.weekly') },
            { value: 'monthly', label: t('settings.security.schedule.monthly') },
        ]),
        [t]
    );

    const lastBackupDate = useMemo(() => {
        const completed = backups.find((log) => log.status === 'completed');
        if (!completed) return null;
        return new Date(completed.completed_at || completed.created_at);
    }, [backups]);

    const totalPages = Math.max(1, Math.ceil(totalBackups / PAGE_SIZE));

    const statusColors: Record<string, string> = {
        completed: 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    };

    const handleBackupNow = async () => {
        if (backupStatus === 'in-progress') return;
        setFeedback(null);
        setBackupStatus('in-progress');
        try {
            const newBackup = await createSystemBackupAPI();
            addLog('audit.log.backupManual', { backupId: newBackup.id });
            setFeedback({ type: 'success', message: t('settings.security.backupCompleted') });
            setCurrentPage(1);
            await loadBackups(1);
        } catch (error) {
            console.error('Failed to create backup', error);
            setFeedback({ type: 'error', message: t('settings.security.backupFailedMessage') });
        } finally {
                setBackupStatus('idle');
        }
    };

    const handleScheduleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSchedule = event.target.value as BackupSchedule;
        setScheduleSaving(true);
        setFeedback(null);
        try {
            await updateSystemSettingsAPI({ backup_schedule: newSchedule });
            setBackupSchedule(newSchedule);
            persistSchedule(newSchedule);
            addLog('audit.log.backupScheduleUpdated', { schedule: t(`settings.security.schedule.${newSchedule}`) });
            setFeedback({ type: 'success', message: t('settings.security.scheduleSaved') || 'Backup schedule updated.' });
        } catch (error: any) {
            console.error('Failed to update backup schedule', error);
            setFeedback({ type: 'error', message: translateAdminApiError(error, t) || t('settings.security.scheduleSaveError') || 'Failed to save backup schedule.' });
        } finally {
            setScheduleSaving(false);
        }
    };

    const handleDeleteBackup = (backup: SystemBackup) => {
        setConfirmBackupAction({ type: 'delete', backup });
    };

    const performDeleteBackup = async (backup: SystemBackup) => {
        try {
            await deleteSystemBackupAPI(backup.id);
            addLog('audit.log.backupDeleted', { backupId: backup.id });
            setFeedback({ type: 'success', message: t('settings.security.backupDeletedMessage') });
            await loadBackups(currentPage);
        } catch (error) {
            console.error('Failed to delete backup', error);
            setFeedback({ type: 'error', message: t('settings.security.deleteError') });
        } finally {
            setConfirmBackupAction(null);
        }
    };

    const handleDownloadBackup = async (backup: SystemBackup) => {
        try {
            const response = await getSystemBackupDownloadResponse(backup.id);
            if (!response.ok) {
                const text = await response.text();
                let detail = 'Download failed';
                try {
                    const errBody = JSON.parse(text);
                    detail = messageFromParsedErrorBody(errBody, errBody.detail || detail);
                } catch {
                    if (response.status === 404) detail = 'Backup file not found.';
                }
                throw new Error(detail);
            }
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition');
            let filename = `${backup.id}.sqlite3`;
            if (disposition) {
                const match = /filename[*]?=(?:UTF-8'')?["']?([^"'\s;]+)["']?/i.exec(disposition);
                if (match?.[1]) filename = match[1].trim();
            }
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download backup', error);
            setFeedback({ type: 'error', message: t('settings.security.downloadError') });
        }
    };

    const handleRestoreBackup = (backup: SystemBackup) => {
        if (restoringId || backupStatus === 'in-progress') return;
        setConfirmBackupAction({ type: 'restore', backup });
    };

    const performRestoreBackup = async (backup: SystemBackup) => {
        setConfirmBackupAction(null);
        setRestoringId(backup.id);
        try {
            await restoreSystemBackupAPI(backup.id);
            addLog('audit.log.backupRestored', { backupId: backup.id });
            setFeedback({ type: 'success', message: `${t('settings.security.restoreSuccess')} ${backup.id}` });
        } catch (error) {
            console.error('Failed to restore backup', error);
            setFeedback({ type: 'error', message: t('settings.security.restoreError') });
        } finally {
            setRestoringId(null);
        }
    };

    const renderFeedback = () => {
        if (!feedback) return null;
        const isSuccess = feedback.type === 'success';
        return (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                isSuccess
                    ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                    : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
            }`}>
                <Icon name={isSuccess ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{feedback.message}</span>
            </div>
        );
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.security.title')}</h3>
                <div className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-300 font-semibold">
                    {t('settings.security.schedule')}: {scheduleOptions.find(opt => opt.value === backupSchedule)?.label}
                </div>
            </div>

            {renderFeedback()}

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.security.schedule')}</label>
                <select
                    value={backupSchedule}
                    onChange={handleScheduleChange}
                    disabled={scheduleSaving}
                    className="max-w-lg w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {scheduleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <button 
                        onClick={handleBackupNow}
                        disabled={backupStatus === 'in-progress'}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center w-48 transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                    >
                        {backupStatus === 'in-progress' ? (
                            <>
                                <LoadingSpinner />
                                <span className="mx-2">{t('settings.security.backingUp')}</span>
                            </>
                        ) : (
                            t('settings.security.backupNow')
                        )}
                    </button>
                </div>
                 <div>
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('settings.security.lastBackup')}:</h4>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">
                        {lastBackupDate ? lastBackupDate.toLocaleString(language) : t('settings.security.noBackup')}
                    </p>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.security.historyTitle')}</h4>
                 <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-600 dark:text-gray-300`}>
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-center">{t('settings.security.table.id')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('settings.security.table.date')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('settings.security.table.status')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('settings.security.table.initiator')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('settings.security.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-center">
                                        <LoadingSpinner />
                                    </td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {t('settings.security.noBackup')}
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => {
                                    const statusKey = backup.status.replace('-', '_');
                                    return (
                                        <tr key={backup.id} className="bg-white border-b dark:bg-gray-900/30 dark:border-gray-800 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors">
                                            <td className="px-6 py-4 text-center font-mono text-xs whitespace-nowrap max-w-[200px] truncate" title={backup.id}>{backup.id}</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">{new Date(backup.created_at).toLocaleString(language)}</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[statusKey] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                                                    {t(`settings.security.status.${statusKey}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">{t(`settings.security.initiator.${backup.initiator.toLowerCase()}`)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                                                    <button
                                                        onClick={() => handleDownloadBackup(backup)}
                                                        disabled={restoringId === backup.id}
                                                        className="p-1 text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title={t('settings.security.actions.download')}
                                                    >
                                                        <Icon name="download" className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRestoreBackup(backup)}
                                                        disabled={restoringId === backup.id}
                                                        className="p-1 text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-100 disabled:opacity-40 disabled:cursor-wait"
                                                        title={restoringId === backup.id ? t('settings.security.restoring') : t('settings.security.actions.restore')}
                                                    >
                                                        {restoringId === backup.id ? (
                                                            <div className="w-5 h-5">
                                                                <LoadingSpinner />
                                                            </div>
                                                        ) : (
                                                            <Icon name="restore" className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup)}
                                                        disabled={restoringId === backup.id}
                                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title={t('settings.security.actions.delete')}
                                                    >
                                                        <Icon name="trash" className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalBackups > PAGE_SIZE && (
                    <nav className="flex items-center justify-between pt-4" aria-label="Table navigation">
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            {t('settings.security.pagination.page')} <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> {t('settings.security.pagination.of')} <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                        </span>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('settings.security.pagination.previous')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('settings.security.pagination.next')}
                            </button>
                        </div>
                    </nav>
                )}
            </div>

            <AlertDialog
                isOpen={confirmBackupAction !== null}
                onClose={() => setConfirmBackupAction(null)}
                type="warning"
                title={t('common.confirm')}
                message={confirmBackupAction ? (confirmBackupAction.type === 'delete' ? t('settings.security.deleteConfirm') : t('settings.security.restoreConfirm')) : ''}
                showCancel
                cancelText={t('common.cancel')}
                confirmText={confirmBackupAction?.type === 'delete' ? t('settings.security.actions.delete') : t('settings.security.actions.restore')}
                onConfirm={() => {
                    if (!confirmBackupAction) return;
                    if (confirmBackupAction.type === 'delete') {
                        performDeleteBackup(confirmBackupAction.backup);
                    } else {
                        performRestoreBackup(confirmBackupAction.backup);
                    }
                }}
            />
        </div>
    );
};

export interface PlatformTwilioSettingsData {
    id?: number;
    account_sid?: string;
    twilio_number?: string;
    auth_token_masked?: string | null;
    sender_id?: string;
    is_enabled?: boolean;
}

const TwilioSmsSettings: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [accountSid, setAccountSid] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [showAuthToken, setShowAuthToken] = useState(false);
    const [senderId, setSenderId] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 6000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const data = await getPlatformTwilioSettingsAPI();
            if (data) {
                setAccountSid(data.account_sid || '');
                setTwilioNumber(data.twilio_number || '');
                setSenderId(data.sender_id || '');
                setIsEnabled(!!data.is_enabled);
                setAuthToken('');
            }
        } catch (error) {
            console.error('Failed to load Twilio settings', error);
            setFeedback({ type: 'error', message: t('settings.twilio.loadError') || 'Failed to load Twilio settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const payload: {
                account_sid: string;
                twilio_number: string;
                sender_id: string;
                is_enabled: boolean;
                auth_token?: string;
            } = {
                account_sid: accountSid.trim(),
                twilio_number: twilioNumber.trim(),
                sender_id: senderId.trim(),
                is_enabled: isEnabled,
            };
            if (authToken.trim()) payload.auth_token = authToken.trim();
            await updatePlatformTwilioSettingsAPI(payload);
            addLog('audit.log.twilioSettingsSaved');
            setFeedback({ type: 'success', message: t('settings.twilio.saveSuccess') || 'Twilio settings saved.' });
            setAuthToken('');
        } catch (error: any) {
            console.error('Failed to save Twilio settings', error);
            setFeedback({ type: 'error', message: error?.message || t('settings.twilio.saveError') || 'Failed to save Twilio settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderFeedback = () => {
        if (!feedback) return null;
        const isSuccess = feedback.type === 'success';
        return (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                isSuccess
                    ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                    : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
            }`}>
                <Icon name={isSuccess ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{feedback.message}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.twilio.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.twilio.description')}</p>
            {renderFeedback()}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.twilio.accountSid')}</label>
                        <input
                            type="text"
                            value={accountSid}
                            onChange={(e) => setAccountSid(e.target.value)}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="ACxxxxxxxxxx"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.twilio.authToken')}</label>
                        <div className="flex items-center gap-2 max-w-md">
                            <input
                                type={showAuthToken ? 'text' : 'password'}
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                autoComplete="new-password"
                                name="twilio_platform_auth_token"
                                id="twilio_platform_auth_token"
                                data-form-type="other"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder={t('settings.twilio.authTokenPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowAuthToken((v) => !v)}
                                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title={showAuthToken ? (t('settings.twilio.hideToken') || 'Hide token') : (t('settings.twilio.showToken') || 'Show token')}
                                aria-label={showAuthToken ? (t('settings.twilio.hideToken') || 'Hide token') : (t('settings.twilio.showToken') || 'Show token')}
                            >
                                <Icon name={showAuthToken ? 'eye-off' : 'eye'} className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.twilio.authTokenHelp')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.twilio.twilioNumber')}</label>
                        <input
                            type="text"
                            value={twilioNumber}
                            onChange={(e) => setTwilioNumber(e.target.value)}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="+9647xxxxxxxx"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.twilio.twilioNumberHelp')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.twilio.senderId')}</label>
                        <input
                            type="text"
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Optional"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.twilio.senderIdHelp')}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="twilio-enabled"
                                checked={isEnabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="twilio-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.twilio.isEnabled')}</label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.twilio.isEnabledHelp')}</p>
                    </div>
                    <div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                        >
                            {isSaving ? <><LoadingSpinner /><span className="mx-2">{t('settings.general.saving')}</span></> : (t('settings.general.save') || 'Save Changes')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlatformWhatsAppSettingsPanel: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [graphVersion, setGraphVersion] = useState('v25.0');
    const [otpTemplateName, setOtpTemplateName] = useState('');
    const [otpTemplateLang, setOtpTemplateLang] = useState('en');
    const [adminTemplateName, setAdminTemplateName] = useState('');
    const [adminTemplateLang, setAdminTemplateLang] = useState('en');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 6000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const data = await getPlatformWhatsAppSettingsAPI();
            setPhoneNumberId(data.phone_number_id || '');
            setGraphVersion(data.graph_api_version || 'v25.0');
            setOtpTemplateName(data.otp_template_name || '');
            setOtpTemplateLang(data.otp_template_lang || 'en');
            setAdminTemplateName(data.admin_template_name || '');
            setAdminTemplateLang(data.admin_template_lang || 'en');
            setAccessToken('');
        } catch (error) {
            console.error('Failed to load Platform WhatsApp settings', error);
            setFeedback({ type: 'error', message: t('settings.platformWhatsapp.loadError') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const payload: Record<string, string> = {
                phone_number_id: phoneNumberId.trim(),
                graph_api_version: graphVersion.trim(),
                otp_template_name: otpTemplateName.trim(),
                otp_template_lang: otpTemplateLang.trim(),
                admin_template_name: adminTemplateName.trim(),
                admin_template_lang: adminTemplateLang.trim(),
            };
            if (accessToken.trim()) payload.access_token = accessToken.trim();
            await updatePlatformWhatsAppSettingsAPI(payload);
            addLog('audit.log.platformWhatsappSaved');
            setFeedback({ type: 'success', message: t('settings.platformWhatsapp.saveSuccess') });
            setAccessToken('');
        } catch (error: any) {
            setFeedback({ type: 'error', message: translateAdminApiError(error, t) || t('settings.platformWhatsapp.saveError') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.platformWhatsapp.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.platformWhatsapp.description')}</p>
            {feedback && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                    feedback.type === 'success'
                        ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                        : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
                }`}>
                    <Icon name={feedback.type === 'success' ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{feedback.message}</span>
                </div>
            )}
            {isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.phoneNumberId')}</label>
                        <input type="text" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.accessToken')}</label>
                        <div className="flex items-center gap-2 max-w-md">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                autoComplete="new-password"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder={t('settings.platformWhatsapp.accessTokenPlaceholder')}
                            />
                            <button type="button" onClick={() => setShowToken((v) => !v)} className="p-2 rounded-md border border-gray-300 dark:border-gray-600">
                                <Icon name={showToken ? 'eye-off' : 'eye'} className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.platformWhatsapp.accessTokenHelp')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.graphVersion')}</label>
                        <input type="text" value={graphVersion} onChange={(e) => setGraphVersion(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.otpTemplateName')}</label>
                        <input type="text" value={otpTemplateName} onChange={(e) => setOtpTemplateName(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.otpTemplateLang')}</label>
                        <input type="text" value={otpTemplateLang} onChange={(e) => setOtpTemplateLang(e.target.value)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.adminTemplateName')}</label>
                        <input type="text" value={adminTemplateName} onChange={(e) => setAdminTemplateName(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.platformWhatsapp.adminTemplateLang')}</label>
                        <input type="text" value={adminTemplateLang} onChange={(e) => setAdminTemplateLang(e.target.value)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                        >
                            {isSaving ? <><LoadingSpinner /><span className="mx-2">{t('settings.general.saving')}</span></> : (t('settings.general.save') || 'Save Changes')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const RegistrationOtpSettings: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [phoneOtpRequired, setPhoneOtpRequired] = useState(false);
    const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
    const [phoneOtpChannel, setPhoneOtpChannel] = useState<PhoneOtpChannel>('whatsapp');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const [data, emailData] = await Promise.all([
                getPhoneOtpRequirementAPI(),
                getRegistrationEmailRequirementAPI(),
            ]);
            setPhoneOtpRequired(!!data.phone_otp_required);
            setEmailVerificationRequired(!!emailData.email_verification_required);
            const ch = data.phone_otp_channel;
            if (ch === 'whatsapp' || ch === 'twilio_sms') {
                setPhoneOtpChannel(ch);
            }
        } catch (error: any) {
            setFeedback({ type: 'error', message: translateAdminApiError(error, t) || t('settings.registrationOtp.loadError') });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 6000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const [data, emailData] = await Promise.all([
                updatePhoneOtpRequirementAPI(
                    phoneOtpRequired
                        ? { phone_otp_required: true, phone_otp_channel: phoneOtpChannel }
                        : { phone_otp_required: false }
                ),
                updateRegistrationEmailRequirementAPI({
                    email_verification_required: emailVerificationRequired,
                }),
            ]);
            setPhoneOtpRequired(!!data.phone_otp_required);
            setEmailVerificationRequired(!!emailData.email_verification_required);
            if (data.phone_otp_channel === 'whatsapp' || data.phone_otp_channel === 'twilio_sms') {
                setPhoneOtpChannel(data.phone_otp_channel);
            }
            const chLabel =
                phoneOtpRequired && phoneOtpChannel === 'whatsapp'
                    ? t('settings.registrationOtp.channelWhatsapp')
                    : phoneOtpRequired && phoneOtpChannel === 'twilio_sms'
                      ? t('settings.registrationOtp.channelTwilio')
                      : '';
            addLog('audit.log.registrationOtpUpdated', {
                state: phoneOtpRequired ? `${t('common.enabled')} (${chLabel})` : t('common.disabled'),
            });
            addLog('audit.log.registrationEmailVerificationUpdated', {
                state: emailVerificationRequired ? t('common.enabled') : t('common.disabled'),
            });
            setFeedback({ type: 'success', message: t('settings.registrationOtp.saveSuccess') });
        } catch (error: any) {
            setFeedback({ type: 'error', message: translateAdminApiError(error, t) || t('settings.registrationOtp.saveError') });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.registrationOtp.title')}</h3>
            {feedback && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                    feedback.type === 'success'
                        ? 'bg-primary-50 text-primary-900 border-primary-100 dark:bg-primary-900/20 dark:text-primary-100 dark:border-primary-800'
                        : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800'
                }`}>
                    <Icon name={feedback.type === 'success' ? 'check' : 'warning'} className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{feedback.message}</span>
                </div>
            )}
            {isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 bg-white dark:bg-gray-900/40">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.registrationOtp.description')}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="phone-otp-required"
                                checked={phoneOtpRequired}
                                onChange={(e) => setPhoneOtpRequired(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="phone-otp-required" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('settings.registrationOtp.requireLabel')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.registrationOtp.hint')}
                        </p>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="email-verification-required"
                                checked={emailVerificationRequired}
                                onChange={(e) => setEmailVerificationRequired(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="email-verification-required" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('settings.registrationOtp.requireEmailLabel')}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.registrationOtp.emailHint')}
                        </p>
                    </div>
                    {phoneOtpRequired && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('settings.registrationOtp.channelTitle')}</p>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="phone-otp-channel"
                                    checked={phoneOtpChannel === 'whatsapp'}
                                    onChange={() => setPhoneOtpChannel('whatsapp')}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.registrationOtp.channelWhatsapp')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="phone-otp-channel"
                                    checked={phoneOtpChannel === 'twilio_sms'}
                                    onChange={() => setPhoneOtpChannel('twilio_sms')}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.registrationOtp.channelTwilio')}</span>
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.registrationOtp.channelHelp')}</p>
                        </div>
                    )}
                    <div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center transition-colors hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-wait shadow-sm"
                        >
                            {isSaving ? <><LoadingSpinner /><span className="mx-2">{t('settings.general.saving') || 'Saving...'}</span></> : (t('settings.general.save') || 'Save Changes')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AuditLog: React.FC = () => {
    const { t, language } = useI18n();
    const { logs } = useAuditLog();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [logs, currentPage]);

    const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
    
    const formatAction = (action: { key: string; params: Record<string, string | number> }) => {
        let message = t(action.key);
        if (!message) return action.key;

        for (const key in action.params) {
            message = message.replace(`{${key}}`, String(action.params[key]));
        }
        return message;
    };

    return(
    <div className="space-y-6">
        <h3 className="text-xl font-semibold">{t('settings.audit.title')}</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-3 text-center">{t('settings.audit.table.user')}</th>
                        <th className="px-6 py-3 text-center">{t('settings.audit.table.action')}</th>
                        <th className="px-6 py-3 text-center">{t('settings.audit.table.timestamp')}</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedLogs.map(log => (
                        <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className="px-6 py-4 text-center font-mono">{log.user}</td>
                            <td className="px-6 py-4 text-center">{formatAction(log.action)}</td>
                            <td className="px-6 py-4 text-center">{new Date(log.timestamp).toLocaleString(language)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {totalPages > 1 && (
            <nav className="flex items-center justify-between pt-4" aria-label="Table navigation">
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{t('settings.security.pagination.page')} <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> {t('settings.security.pagination.of')} <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span></span>
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                        {t('settings.security.pagination.previous')}
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                        {t('settings.security.pagination.next')}
                    </button>
                </div>
            </nav>
        )}
    </div>
)};

const LimitedAdmins: React.FC = () => {
    const { t, language } = useI18n();
    const { addLog } = useAuditLog();
    const { showAlert } = useAlert();
    const [limitedAdmins, setLimitedAdmins] = useState<LimitedAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<LimitedAdmin | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState<LimitedAdmin | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadLimitedAdmins();
    }, []);

    const loadLimitedAdmins = async () => {
        setIsLoading(true);
        try {
            const response = await getLimitedAdminsAPI();
            setLimitedAdmins((response.results ?? []) as LimitedAdmin[]);
        } catch (error) {
            console.error('Error loading limited admins:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (admin?: LimitedAdmin) => {
        setEditingAdmin(admin || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAdmin(null);
    };

    const handleSave = async (adminData: any) => {
        setIsSaving(true);
        try {
            if (editingAdmin) {
                const updatePayload = { ...adminData, user_id: editingAdmin.user.id };
                await updateLimitedAdminAPI(editingAdmin.id, updatePayload);
                addLog('audit.log.limitedAdminUpdated', { adminName: `${adminData.first_name} ${adminData.last_name}` });
            } else {
                await createLimitedAdminAPI(adminData);
                addLog('audit.log.limitedAdminCreated', { adminName: `${adminData.first_name} ${adminData.last_name}` });
            }
            await loadLimitedAdmins();
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving limited admin:', error);
            showAlert(translateAdminApiError(error, t) || t('errors.saveLimitedAdmin'), { variant: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (admin: LimitedAdmin) => {
        try {
            await toggleLimitedAdminActiveAPI(admin.id);
            addLog('audit.log.limitedAdminToggled', { adminName: `${admin.user.first_name} ${admin.user.last_name}` });
            await loadLimitedAdmins();
        } catch (error: any) {
            console.error('Error toggling limited admin:', error);
            showAlert(translateAdminApiError(error, t) || t('errors.toggleLimitedAdmin'), { variant: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!adminToDelete) return;
        setIsDeleting(true);
        try {
            await deleteLimitedAdminAPI(adminToDelete.id);
            addLog('audit.log.limitedAdminDeleted', { adminName: `${adminToDelete.user.first_name} ${adminToDelete.user.last_name}` });
            await loadLimitedAdmins();
            setIsDeleteDialogOpen(false);
            setAdminToDelete(null);
        } catch (error: any) {
            console.error('Error deleting limited admin:', error);
            showAlert(translateAdminApiError(error, t) || t('errors.deleteLimitedAdmin'), { variant: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('limitedAdmins.title') || 'Limited Admins'}
                </h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    {t('limitedAdmins.add') || 'Add Limited Admin'}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3 text-center">{t('limitedAdmins.table.name') || 'Name'}</th>
                                <th className="px-6 py-3 text-center">{t('limitedAdmins.table.email') || 'Email'}</th>
                                <th className="px-6 py-3 text-center">{t('limitedAdmins.table.status') || 'Status'}</th>
                                <th className="px-6 py-3 text-center">{t('limitedAdmins.table.permissions') || 'Permissions'}</th>
                                <th className="px-6 py-3 text-center">{t('limitedAdmins.table.actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center justify-center">
                                            <LoadingSpinner label={t('common.loading') || 'Loading'} />
                                        </div>
                                    </td>
                                </tr>
                            ) : limitedAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        {t('limitedAdmins.noAdmins') || 'No limited admins found'}
                                    </td>
                                </tr>
                            ) : (
                                limitedAdmins.map((admin) => (
                                    <tr key={admin.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                                            {admin.user.first_name} {admin.user.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-center">{admin.user.email}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                                admin.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {admin.is_active ? t('status.Active') : t('status.Deactivated')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {admin.can_view_dashboard && (
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                                                        {t('limitedAdmins.permissions.viewDashboard') || 'Dashboard'}
                                                    </span>
                                                )}
                                                {admin.can_manage_tenants && (
                                                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded">
                                                        {t('limitedAdmins.permissions.manageTenants') || 'Tenants'}
                                                    </span>
                                                )}
                                                {admin.can_manage_subscriptions && (
                                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded">
                                                        {t('limitedAdmins.permissions.manageSubscriptions') || 'Subscriptions'}
                                                    </span>
                                                )}
                                                {Object.values({
                                                    can_view_dashboard: admin.can_view_dashboard,
                                                    can_manage_tenants: admin.can_manage_tenants,
                                                    can_manage_subscriptions: admin.can_manage_subscriptions,
                                                    can_manage_payment_gateways: admin.can_manage_payment_gateways,
                                                    can_view_reports: admin.can_view_reports,
                                                    can_manage_communication: admin.can_manage_communication,
                                                    can_manage_settings: admin.can_manage_settings,
                                                    can_manage_limited_admins: admin.can_manage_limited_admins,
                                                }).filter(Boolean).length === 0 && (
                                                    <span className="text-xs text-gray-400">{t('limitedAdmins.noPermissions') || 'No permissions'}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(admin)}
                                                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title={t('limitedAdmins.actions.edit') || 'Edit'}
                                                >
                                                    <Icon name="edit" className="w-5 h-5" />
                                                </button>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={admin.is_active}
                                                        onChange={() => handleToggleActive(admin)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        setAdminToDelete(admin);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                    title={t('limitedAdmins.actions.delete') || 'Delete'}
                                                >
                                                    <Icon name="trash" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <LimitedAdminModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                editingAdmin={editingAdmin}
                isLoading={isSaving}
            />

            <AlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setAdminToDelete(null);
                }}
                title={t('limitedAdmins.deleteConfirm') || 'Delete Limited Admin'}
                message={t('limitedAdmins.deleteConfirmMessage') || `Are you sure you want to delete ${adminToDelete?.user.first_name} ${adminToDelete?.user.last_name}?`}
                type="warning"
                confirmText={isDeleting ? t('common.deleting') || 'Deleting...' : t('common.delete') || 'Delete'}
                onConfirm={isDeleting ? undefined : handleDelete}
                showCancel
                cancelText={t('common.cancel')}
            />
        </div>
    );
};

const BillingInvoiceSettings: React.FC = () => {
    const { t } = useI18n();
    const { showAlert } = useAlert();
    const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
    const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [issuerName, setIssuerName] = useState('');
    const [issuerAddress, setIssuerAddress] = useState('');
    const [issuerEmail, setIssuerEmail] = useState('');
    const [issuerPhone, setIssuerPhone] = useState('');
    const [issuerTaxId, setIssuerTaxId] = useState('');
    const [footerText, setFooterText] = useState('');
    const [paymentInstructions, setPaymentInstructions] = useState('');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ issuerEmail?: string; logo?: string }>({});

    const validateIssuerEmail = useCallback((value: string): string | undefined => {
        const v = value.trim();
        if (!v) return undefined;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(v)) {
            return t('settings.billing.validation.emailInvalid') || 'Please enter a valid email address.';
        }
        return undefined;
    }, [t]);

    const validateLogoFile = useCallback((file: File | null): string | undefined => {
        if (!file) return undefined;
        if (!ALLOWED_LOGO_MIME_TYPES.has(file.type.toLowerCase())) {
            return t('settings.billing.validation.logoType') || 'Logo must be PNG, JPG, GIF, or WEBP.';
        }
        if (file.size > MAX_LOGO_SIZE_BYTES) {
            return t('settings.billing.validation.logoSize') || 'Logo must be 2MB or smaller.';
        }
        return undefined;
    }, [t]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const b = await getBillingSettingsAPI();
            setIssuerName(b.issuer_name || '');
            setIssuerAddress(b.issuer_address || '');
            setIssuerEmail(b.issuer_email || '');
            setIssuerPhone(b.issuer_phone || '');
            setIssuerTaxId(b.issuer_tax_id || '');
            setFooterText(b.footer_text || '');
            setPaymentInstructions(b.payment_instructions || '');
            setLogoPreview(b.logo_url || null);
            setLogoFile(null);
            setFieldErrors({});
        } catch {
            showAlert(t('settings.billing.loadError'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [showAlert, t]);

    useEffect(() => {
        load();
    }, [load]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        const logoError = validateLogoFile(f || null);
        if (logoError) {
            setLogoFile(null);
            setFieldErrors((prev) => ({ ...prev, logo: logoError }));
            e.target.value = '';
            return;
        }
        setFieldErrors((prev) => ({ ...prev, logo: undefined }));
        setLogoFile(f || null);
        if (f) setLogoPreview(URL.createObjectURL(f));
    };

    const handleSave = async () => {
        const emailError = validateIssuerEmail(issuerEmail);
        const logoError = validateLogoFile(logoFile);
        const errors = { issuerEmail: emailError, logo: logoError };
        setFieldErrors(errors);
        if (errors.issuerEmail || errors.logo) {
            showAlert(t('settings.billing.validation.fixErrors') || 'Please fix validation errors before saving.', { variant: 'error' });
            return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('issuer_name', issuerName);
            fd.append('issuer_address', issuerAddress);
            fd.append('issuer_email', issuerEmail);
            fd.append('issuer_phone', issuerPhone);
            fd.append('issuer_tax_id', issuerTaxId);
            fd.append('footer_text', footerText);
            fd.append('payment_instructions', paymentInstructions);
            if (logoFile) fd.append('logo', logoFile);
            await updateBillingSettingsAPI(fd);
            showAlert(t('settings.billing.saveSuccess'), { variant: 'success' });
            await load();
        } catch (error: any) {
            showAlert(translateAdminApiError(error, t) || t('settings.billing.saveError'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.billing.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.billing.description')}</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.issuerName')}</label>
                    <input className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.issuerAddress')}</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" rows={3} value={issuerAddress} onChange={(e) => setIssuerAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.issuerEmail')}</label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                            value={issuerEmail}
                            onChange={(e) => {
                                const next = e.target.value;
                                setIssuerEmail(next);
                                setFieldErrors((prev) => ({ ...prev, issuerEmail: validateIssuerEmail(next) }));
                            }}
                        />
                        {fieldErrors.issuerEmail ? (
                            <p className="mt-1 text-xs text-red-500">{fieldErrors.issuerEmail}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.issuerPhone')}</label>
                        <input className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" value={issuerPhone} onChange={(e) => setIssuerPhone(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.issuerTaxId')}</label>
                    <input className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" value={issuerTaxId} onChange={(e) => setIssuerTaxId(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.footer')}</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" rows={2} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.paymentInstructions')}</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" rows={3} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.billing.logo')}</label>
                    {logoPreview ? <img src={logoPreview} alt="" className="h-16 object-contain mb-2 rounded border border-gray-200 dark:border-gray-600" /> : null}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
                    {fieldErrors.logo ? (
                        <p className="mt-1 text-xs text-red-500">{fieldErrors.logo}</p>
                    ) : null}
                </div>
            </div>
            <button
                type="button"
                onClick={handleSave}
                disabled={saving || Boolean(fieldErrors.issuerEmail || fieldErrors.logo)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
                {saving ? t('settings.billing.saving') : t('settings.billing.save')}
            </button>
        </div>
    );
};

const SystemSettings: React.FC = () => {
    const { t, language } = useI18n();
    const { addLog } = useAuditLog();
    const { isSuperAdmin, hasPermission } = useUser();

    // Limited Admins tab only for super admin or users with can_manage_limited_admins (not for edit-settings-only)
    const canSeeLimitedAdmins = isSuperAdmin() || hasPermission('can_manage_limited_admins');

    const SETTINGS_TAB_STORAGE_KEY = 'systemSettings.activeTab';

    // Load saved tab from localStorage or default to 'general'
    const loadSavedTab = (): string => {
        if (typeof window === 'undefined') return 'general';
        const saved = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
        const validTabs = ['general', 'integrations', 'security', 'twilio', 'platformWhatsapp', 'registrationOtp', 'limitedAdmins', 'audit', 'billing'];
        if (saved && validTabs.includes(saved)) {
            return saved;
        }
        return 'general';
    };

    const [activeSetting, setActiveSetting] = useState<string>(loadSavedTab);

    // If user cannot see Limited Admins, switch away from that tab when they don't have permission
    useEffect(() => {
        if (!canSeeLimitedAdmins && activeSetting === 'limitedAdmins') {
            setActiveSetting('general');
        }
    }, [canSeeLimitedAdmins, activeSetting]);

    // Save tab to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeSetting);
        }
    }, [activeSetting]);

    const settingsMenu = [
        { id: 'general', label: t('settings.menu.general') || 'General' },
        { id: 'integrations', label: t('settings.menu.integrations') || 'Integrations' },
        { id: 'security', label: t('settings.menu.security') },
        { id: 'twilio', label: t('settings.menu.twilio') || 'Twilio (SMS)' },
        { id: 'platformWhatsapp', label: t('settings.menu.platformWhatsapp') || 'Platform WhatsApp' },
        { id: 'registrationOtp', label: t('settings.menu.registrationOtp') || 'Registration OTP' },
        ...(canSeeLimitedAdmins ? [{ id: 'limitedAdmins' as const, label: t('settings.menu.limitedAdmins') || 'Limited Admins' }] : []),
        { id: 'audit', label: t('settings.menu.audit') },
        { id: 'billing', label: t('settings.menu.billing') || 'Billing' },
    ];

    const renderSetting = () => {
        if (activeSetting === 'limitedAdmins' && !canSeeLimitedAdmins) {
            return <GeneralSettings />;
        }
        switch (activeSetting) {
            case 'general': return <GeneralSettings />;
            case 'integrations': return <IntegrationsControlSettings />;
            case 'security': return <SecurityBackups />;
            case 'twilio': return <TwilioSmsSettings />;
            case 'platformWhatsapp': return <PlatformWhatsAppSettingsPanel />;
            case 'registrationOtp': return <RegistrationOtpSettings />;
            case 'limitedAdmins': return <LimitedAdmins />;
            case 'audit': return <AuditLog />;
            case 'billing': return <BillingInvoiceSettings />;
            default: return <GeneralSettings />;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('settings.title')}</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <nav className="space-y-1">
                        {settingsMenu.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSetting(item.id)}
                                className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} px-3 py-2 rounded-md text-sm font-medium ${
                                    activeSetting === item.id 
                                    ? 'bg-primary-600 text-white dark:bg-primary-700 dark:text-white' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`
                                }
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>
                <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                   {renderSetting()}
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
