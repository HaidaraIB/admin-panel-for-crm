
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { SystemBackup, LimitedAdmin } from '../types';
import { useI18n } from '../context/i18n';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuditLog } from '../context/AuditLogContext';
import { useAlert } from '../context/AlertContext';
import { useUser } from '../context/UserContext';
import { translateApiMessage } from '../utils/translateApiError';
import LimitedAdminModal from '../components/LimitedAdminModal';
import AlertDialog from '../components/AlertDialog';
import { getSystemBackupsAPI, createSystemBackupAPI, deleteSystemBackupAPI, restoreSystemBackupAPI, getSystemSettingsAPI, updateSystemSettingsAPI, getLimitedAdminsAPI, createLimitedAdminAPI, updateLimitedAdminAPI, deleteLimitedAdminAPI, toggleLimitedAdminActiveAPI } from '../services/api';

// Helper to get headers with API Key (same as in api.ts)
const getHeadersWithApiKey = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  const API_KEY = import.meta.env.VITE_API_KEY || '';
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
};

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

const GeneralSettings: React.FC = () => {
    const { t } = useI18n();
    const { addLog } = useAuditLog();
    const [usdToIqdRate, setUsdToIqdRate] = useState<number>(1300);
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
            if (settings && settings.usd_to_iqd_rate) {
                setUsdToIqdRate(parseFloat(settings.usd_to_iqd_rate));
            }
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
            await updateSystemSettingsAPI({ usd_to_iqd_rate: usdToIqdRate });
            addLog('audit.log.generalSettingsSaved');
            setFeedback({ type: 'success', message: t('settings.general.saveSuccess') || 'Settings saved successfully!' });
        } catch (error: any) {
            console.error('Failed to save settings', error);
            setFeedback({ type: 'error', message: error.message || t('settings.general.saveError') || 'Failed to save settings' });
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
            setBackups(response.results || []);
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
            setFeedback({ type: 'error', message: translateApiMessage(error?.message, t) || t('settings.security.scheduleSaveError') || 'Failed to save backup schedule.' });
        } finally {
            setScheduleSaving(false);
        }
    };

    const handleDeleteBackup = async (backup: SystemBackup) => {
        if (!window.confirm(t('settings.security.deleteConfirm'))) return;
        try {
            await deleteSystemBackupAPI(backup.id);
            addLog('audit.log.backupDeleted', { backupId: backup.id });
            setFeedback({ type: 'success', message: t('settings.security.backupDeletedMessage') });
            await loadBackups(currentPage);
        } catch (error) {
            console.error('Failed to delete backup', error);
            setFeedback({ type: 'error', message: t('settings.security.deleteError') });
        }
    };

    const handleDownloadBackup = async (backup: SystemBackup) => {
        if (!backup.download_url) {
            setFeedback({ type: 'error', message: t('settings.security.downloadError') });
            return;
        }
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(backup.download_url, {
                headers: getHeadersWithApiKey(
                    token ? { Authorization: `Bearer ${token}` } : {}
                ),
            });
            if (!response.ok) {
                throw new Error('Download failed');
            }
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
            const filename = backup.download_url.split('/').filter(Boolean).pop() || `${backup.id}.sqlite3`;
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

    const handleRestoreBackup = async (backup: SystemBackup) => {
        if (restoringId || backupStatus === 'in-progress') return;
        if (!window.confirm(t('settings.security.restoreConfirm'))) return;
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
                                            <td className="px-6 py-4 text-center font-mono text-xs break-all">{backup.id}</td>
                                            <td className="px-6 py-4 text-center">{new Date(backup.created_at).toLocaleString(language)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[statusKey] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                                                    {t(`settings.security.status.${statusKey}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{t(`settings.security.initiator.${backup.initiator.toLowerCase()}`)}</td>
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
            setLimitedAdmins(response.results || []);
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
            showAlert(translateApiMessage(error.message, t) || t('errors.saveLimitedAdmin'), { variant: 'error' });
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
            showAlert(translateApiMessage(error.message, t) || t('errors.toggleLimitedAdmin'), { variant: 'error' });
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
            showAlert(translateApiMessage(error.message, t) || t('errors.deleteLimitedAdmin'), { variant: 'error' });
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
                                        {t('common.loading') || 'Loading...'}
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
        const validTabs = ['general', 'security', 'limitedAdmins', 'audit'];
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
        { id: 'security', label: t('settings.menu.security') },
        ...(canSeeLimitedAdmins ? [{ id: 'limitedAdmins' as const, label: t('settings.menu.limitedAdmins') || 'Limited Admins' }] : []),
        { id: 'audit', label: t('settings.menu.audit') },
    ];

    const renderSetting = () => {
        if (activeSetting === 'limitedAdmins' && !canSeeLimitedAdmins) {
            return <GeneralSettings />;
        }
        switch (activeSetting) {
            case 'general': return <GeneralSettings />;
            case 'security': return <SecurityBackups />;
            case 'limitedAdmins': return <LimitedAdmins />;
            case 'audit': return <AuditLog />;
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
