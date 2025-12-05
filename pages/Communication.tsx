
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { Broadcast } from '../types';
import { useI18n } from '../context/i18n';
import BroadcastViewModal from '../components/BroadcastViewModal';
import AlertDialog from '../components/AlertDialog';
import { getBroadcastsAPI, createBroadcastAPI, deleteBroadcastAPI, sendBroadcastAPI, scheduleBroadcastAPI, getBroadcastAPI, getPlansAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const mapBroadcastFromApi = (broadcast: any): Broadcast => ({
    id: broadcast.id,
    subject: broadcast.subject,
    content: broadcast.content || '',
    target: (broadcast.target || 'all') as Broadcast['target'],
    status: (broadcast.status || 'draft') as Broadcast['status'],
    createdAt: broadcast.created_at,
    scheduledAt: broadcast.scheduled_at,
    sentAt: broadcast.sent_at,
});

interface NewBroadcastProps {
    onBroadcastCreated: () => void;
}

const NewBroadcast: React.FC<NewBroadcastProps> = ({ onBroadcastCreated }) => {
    const { t, language } = useI18n();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [target, setTarget] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
    });

    useEffect(() => {
        const fetchPlans = async () => {
            setIsLoadingPlans(true);
            try {
                const response = await getPlansAPI();
                setPlans(response.results || []);
            } catch (error) {
                console.error('Error fetching plans:', error);
            } finally {
                setIsLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);


    const handleSchedule = async () => {
        if (!subject || !content || !scheduledDate || !scheduledTime) {
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.validation.title'),
                message: t('communication.alerts.validation.message'),
                type: 'warning',
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
            const broadcast = await createBroadcastAPI({
                subject,
                content,
                target,
                status: 'scheduled',
                scheduled_at: scheduledAt,
            });
            await scheduleBroadcastAPI(broadcast.id, scheduledAt);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.scheduleSuccess.title'),
                message: t('communication.alerts.scheduleSuccess.message'),
                type: 'success',
            });
            setSubject('');
            setContent('');
            setScheduledDate('');
            setScheduledTime('');
            onBroadcastCreated();
        } catch (error: any) {
            console.error('Error scheduling broadcast:', error);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.scheduleError.title'),
                message: error.message || t('communication.alerts.scheduleError.message'),
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendNow = async () => {
        if (!subject || !content) {
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.validation.title'),
                message: t('communication.alerts.validation.message'),
                type: 'warning',
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const broadcast = await createBroadcastAPI({
                subject,
                content,
                target,
            });
            await sendBroadcastAPI(broadcast.id);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.sendSuccess.title'),
                message: t('communication.alerts.sendSuccess.message'),
                type: 'success',
            });
            setSubject('');
            setContent('');
            onBroadcastCreated();
        } catch (error: any) {
            console.error('Error sending broadcast:', error);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.sendError.title'),
                message: error.message || t('communication.alerts.sendError.message'),
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return(
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">{t('communication.new.title')}</h2>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">{t('communication.new.to')}</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={isLoadingPlans}
                >
                    <option value="all">{t('communication.new.target.all')}</option>
                    {plans.map((plan) => (
                        <option key={plan.id} value={`plan_${plan.id}`}>
                            {language === 'ar' ? (plan.name_ar || plan.name) : plan.name}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('communication.new.subject')}</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('communication.new.content')}</label>
                <textarea 
                    rows={8} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('communication.new.scheduleDateTime')}</label>
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                    />
                    <input 
                        type="time" 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                    />
                </div>
            </div>
            <div className={`flex justify-end ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
                <button 
                    onClick={handleSchedule} 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? <LoadingSpinner /> : t('communication.new.schedule')}
                </button>
                <button 
                    onClick={handleSendNow} 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? <LoadingSpinner /> : t('communication.new.sendNow')}
                </button>
            </div>
        </div>
        <AlertDialog
            isOpen={alertDialog.isOpen}
            onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
            title={alertDialog.title}
            message={alertDialog.message}
            type={alertDialog.type}
        />
    </div>
)};

interface HistoryProps {
    history: Broadcast[];
    onView: (broadcast: Broadcast) => void;
    onDelete: (id: number) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
    lastUpdated?: string | null;
}

const History: React.FC<HistoryProps> = ({ history, onView, onDelete, onRefresh, isLoading = false, lastUpdated }) => {
    const { t, language } = useI18n();

    const statusLabels: Record<Broadcast['status'], string> = {
        sent: t('communication.history.status.sent'),
        scheduled: t('communication.history.status.scheduled'),
        draft: t('communication.history.status.draft'),
    };

    const statusColors: Record<Broadcast['status'], string> = {
        sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        draft: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    };

    const targetLabels: Record<Broadcast['target'], string> = {
        all: t('communication.new.target.all'),
    };

    const getDisplayDate = (record: Broadcast) => {
        const value = record.sentAt || record.scheduledAt || record.createdAt;
        if (!value) {
            return t('communication.history.datePending');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return t('communication.history.datePending');
        }
        try {
            return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        } catch {
            return t('communication.history.datePending');
        }
    };

    const lastUpdatedLabel = (() => {
        if (!lastUpdated) return null;
        const date = new Date(lastUpdated);
        if (Number.isNaN(date.getTime())) return null;
        try {
            return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        } catch {
            return null;
        }
    })();

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('communication.history.title')}</h2>
                    {lastUpdatedLabel && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('communication.history.lastUpdated')} {lastUpdatedLabel}
                        </p>
                    )}
                </div>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                    >
                        {isLoading ? <LoadingSpinner /> : <Icon name="refresh" className="w-4 h-4" />}
                        <span>{t('common.refresh')}</span>
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">{t('communication.history.table.subject')}</th>
                            <th className="px-6 py-3">{t('communication.history.table.target')}</th>
                            <th className="px-6 py-3">{t('communication.history.table.date')}</th>
                            <th className="px-6 py-3">{t('communication.history.table.status')}</th>
                            <th className="px-6 py-3">{t('communication.history.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    {t('communication.history.loading')}
                                </td>
                            </tr>
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    {t('communication.history.empty')}
                                </td>
                            </tr>
                        ) : (
                            history.map(item => (
                                <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4">{item.subject}</td>
                                    <td className="px-6 py-4">{targetLabels[item.target] || item.target}</td>
                                    <td className="px-6 py-4">{getDisplayDate(item)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {statusLabels[item.status] || item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => onView(item)} className="p-1 text-blue-600 hover:text-blue-800" title={t('communication.history.actions.view')}>
                                                <Icon name="view" className="w-5 h-5" />
                                            </button>
                                            {item.status === 'scheduled' && (
                                                <button onClick={() => onDelete(item.id)} className="p-1 text-red-600 hover:text-red-800" title={t('communication.history.actions.delete')}>
                                                    <Icon name="trash" className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Communication: React.FC = () => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState('new');
    const [history, setHistory] = useState<Broadcast[]>([]);
    const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isViewLoading, setIsViewLoading] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });
    const [alertDialog, setAlertDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
    });

    const tabs = [
        { id: 'new', label: t('communication.tabs.new') },
        { id: 'history', label: t('communication.tabs.history') },
    ];

    const loadBroadcasts = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const response = await getBroadcastsAPI({ ordering: '-created_at' });
            const apiBroadcasts: Broadcast[] = (response.results || []).map(mapBroadcastFromApi);
            setHistory(apiBroadcasts);
            setLastUpdatedAt(new Date().toISOString());
        } catch (error: any) {
            console.error('Error loading broadcasts:', error);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.loadError.title'),
                message: error?.message || t('communication.alerts.loadError.message'),
                type: 'error',
            });
        } finally {
            setIsHistoryLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadBroadcasts();
    }, [loadBroadcasts]);

    useEffect(() => {
        if (activeTab === 'history') {
            loadBroadcasts();
        }
    }, [activeTab, loadBroadcasts]);

    const handleViewBroadcast = async (broadcast: Broadcast) => {
        setSelectedBroadcast(broadcast);
        setIsViewModalOpen(true);
        setIsViewLoading(true);
        try {
            const response = await getBroadcastAPI(broadcast.id);
            setSelectedBroadcast(mapBroadcastFromApi(response));
        } catch (error: any) {
            console.error('Error loading broadcast:', error);
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.viewError.title'),
                message: error?.message || t('communication.alerts.viewError.message'),
                type: 'error',
            });
        } finally {
            setIsViewLoading(false);
        }
    };

    const handleDeleteBroadcast = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: t('communication.alerts.deleteConfirm.title'),
            message: t('communication.alerts.deleteConfirm.message'),
            onConfirm: async () => {
                try {
                    await deleteBroadcastAPI(id);
                    await loadBroadcasts();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setAlertDialog({
                        isOpen: true,
                        title: t('communication.alerts.deleteSuccess.title'),
                        message: t('communication.alerts.deleteSuccess.message'),
                        type: 'success',
                    });
                } catch (error: any) {
                    console.error('Error deleting broadcast:', error);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setAlertDialog({
                        isOpen: true,
                        title: t('communication.alerts.deleteError.title'),
                        message: error?.message || t('communication.alerts.deleteError.message'),
                        type: 'error',
                    });
                }
            },
        });
    };

    const handleCloseModal = () => {
        setIsViewModalOpen(false);
        setSelectedBroadcast(null);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('communication.title')}</h1>
             <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex gap-8" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                        activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                    {tab.label}
                    </button>
                ))}
                </nav>
            </div>
            {activeTab === 'new' && <NewBroadcast onBroadcastCreated={loadBroadcasts} />}
            {activeTab === 'history' && (
                <History
                    history={history}
                    onView={handleViewBroadcast}
                    onDelete={handleDeleteBroadcast}
                    onRefresh={loadBroadcasts}
                    isLoading={isHistoryLoading}
                    lastUpdated={lastUpdatedAt}
                />
            )}
            <BroadcastViewModal 
                isOpen={isViewModalOpen}
                onClose={handleCloseModal}
                broadcast={selectedBroadcast}
                isLoading={isViewLoading}
            />
            <AlertDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type="warning"
                showCancel={true}
                confirmText={t('common.delete')}
                onConfirm={confirmDialog.onConfirm}
            />
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

export default Communication;
