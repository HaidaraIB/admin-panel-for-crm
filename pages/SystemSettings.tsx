
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { SystemBackup } from '../types';
import { useI18n } from '../context/i18n';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuditLog } from '../context/AuditLogContext';
import { getSystemBackupsAPI, createSystemBackupAPI, deleteSystemBackupAPI, restoreSystemBackupAPI } from '../services/api';

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
    
    const handleSaveChanges = () => {
        // In a real app, this would save all settings.
        // For now, it just logs the action.
        addLog('audit.log.generalSettingsSaved');
        alert('Changes saved (simulation)!');
    }

    return(
    <div className="space-y-6">
        <h3 className="text-xl font-semibold">{t('settings.general.title')}</h3>
        <div className="space-y-4">
            <button onClick={handleSaveChanges} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium">{t('settings.general.save')}</button>
        </div>
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
    const PAGE_SIZE = 20;

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

    const handleScheduleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSchedule = event.target.value as BackupSchedule;
        setBackupSchedule(newSchedule);
        addLog('audit.log.backupScheduleUpdated', { schedule: t(`settings.security.schedule.${newSchedule}`) });
        setFeedback({ type: 'success', message: t('settings.security.scheduleSaved') });
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
                headers: token ? { Authorization: `Bearer ${token}` } : {},
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
                    className="max-w-lg w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                                <th scope="col" className="px-6 py-3">{t('settings.security.table.id')}</th>
                                <th scope="col" className="px-6 py-3">{t('settings.security.table.date')}</th>
                                <th scope="col" className="px-6 py-3">{t('settings.security.table.status')}</th>
                                <th scope="col" className="px-6 py-3">{t('settings.security.table.initiator')}</th>
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
                                            <td className="px-6 py-4 font-mono text-xs break-all">{backup.id}</td>
                                            <td className="px-6 py-4">{new Date(backup.created_at).toLocaleString(language)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[statusKey] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}>
                                                    {t(`settings.security.status.${statusKey}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{t(`settings.security.initiator.${backup.initiator.toLowerCase()}`)}</td>
                                            <td className="px-6 py-4">
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
                        <th className="px-6 py-3">{t('settings.audit.table.user')}</th>
                        <th className="px-6 py-3">{t('settings.audit.table.action')}</th>
                        <th className="px-6 py-3">{t('settings.audit.table.timestamp')}</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedLogs.map(log => (
                        <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className="px-6 py-4 font-mono">{log.user}</td>
                            <td className="px-6 py-4">{formatAction(log.action)}</td>
                            <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString(language)}</td>
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

const SystemSettings: React.FC = () => {
    const { t, language } = useI18n();
    const { addLog } = useAuditLog();
    const [activeSetting, setActiveSetting] = useState('security');

    const settingsMenu = [
        { id: 'security', label: t('settings.menu.security') },
        { id: 'audit', label: t('settings.menu.audit') },
    ];
    
    const renderSetting = () => {
        switch (activeSetting) {
            case 'general': return <GeneralSettings />;
            case 'security': return <SecurityBackups />;
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
