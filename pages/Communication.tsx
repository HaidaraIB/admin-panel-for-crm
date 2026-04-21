
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { Broadcast } from '../types';
import { useI18n } from '../context/i18n';
import BroadcastViewModal from '../components/BroadcastViewModal';
import AlertDialog from '../components/AlertDialog';
import { getBroadcastsAPI, createBroadcastAPI, deleteBroadcastAPI, sendBroadcastAPI, scheduleBroadcastAPI, getBroadcastAPI, getPlansAPI, getCompaniesAPI, sendSmsBroadcastAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const mapBroadcastFromApi = (broadcast: any): Broadcast => {
    const targets = Array.isArray(broadcast.targets) && broadcast.targets.length > 0
        ? broadcast.targets
        : ['all'];
    return {
        id: broadcast.id,
        subject: broadcast.subject,
        content: broadcast.content || '',
        target: (targets[0] || 'all') as Broadcast['target'],
        targets,
        broadcast_type: (broadcast.broadcast_type || 'email') as Broadcast['broadcast_type'],
        status: (broadcast.status || 'draft') as Broadcast['status'],
        createdAt: broadcast.created_at,
        scheduledAt: broadcast.scheduled_at,
        sentAt: broadcast.sent_at,
    };
};

/** Resolve target to a display label (all, plan name, role, or company name). */
function getTargetDisplayLabel(
    target: string,
    plans: { id: number; name: string; name_ar?: string }[],
    companies: { id: number; name: string }[],
    language: string,
    t: (key: string) => string
): string {
    if (target === 'all') return t('communication.new.target.all');
    if (target.startsWith('plan_')) {
        const id = parseInt(target.replace('plan_', ''), 10);
        const plan = plans.find((p) => p.id === id);
        return plan ? (language === 'ar' ? (plan.name_ar || plan.name) : plan.name) : target;
    }
    if (target.startsWith('role_')) {
        const role = target.replace('role_', '');
        if (role === 'admin') return t('communication.new.target.roleAdmin');
        if (role === 'supervisor') return t('communication.new.target.roleSupervisor');
        if (role === 'employee') return t('communication.new.target.roleEmployee');
    }
    if (target.startsWith('company_')) {
        const id = parseInt(target.replace('company_', ''), 10);
        const company = companies.find((c) => c.id === id);
        return company ? company.name : target;
    }
    return target;
}

/** Comma-separated display labels for multiple targets. */
function getTargetsDisplayLabel(
    targets: string[],
    plans: { id: number; name: string; name_ar?: string }[],
    companies: { id: number; name: string }[],
    language: string,
    t: (key: string) => string
): string {
    if (!targets || targets.length === 0) return t('communication.new.target.all');
    return targets.map((tgt) => getTargetDisplayLabel(tgt, plans, companies, language, t)).join(', ');
}

/** Display status: show "Scheduled" when pending and has scheduled_at. */
function getDisplayStatus(broadcast: Broadcast): Broadcast['status'] {
    if (broadcast.status === 'pending' && broadcast.scheduledAt) return 'scheduled';
    return broadcast.status;
}

interface NewBroadcastProps {
    onBroadcastCreated: () => void;
}

interface NewBroadcastPropsWithPlans extends NewBroadcastProps {
    plans: { id: number; name: string; name_ar?: string }[];
    companies: { id: number; name: string }[];
}

const NewBroadcast: React.FC<NewBroadcastPropsWithPlans> = ({ onBroadcastCreated, plans, companies }) => {
    const { t, language } = useI18n();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [targets, setTargets] = useState<string[]>([]);
    const [targetSelectValue, setTargetSelectValue] = useState('');
    const [broadcastType, setBroadcastType] = useState<'email' | 'push'>('email');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
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

    const addTarget = (value: string) => {
        if (!value || targets.includes(value)) return;
        setTargets((prev) => [...prev, value]);
        setTargetSelectValue('');
    };

    const removeTarget = (value: string) => {
        setTargets((prev) => prev.filter((t) => t !== value));
    };

    const handleSchedule = async () => {
        const effectiveTargets = targets.length > 0 ? targets : ['all'];
        if (!subject || !content || !scheduledDate || !scheduledTime) {
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.validation.title'),
                message: t('communication.alerts.validation.message'),
                type: 'warning',
            });
            return;
        }
        
        // Validate that scheduled time is in the future
        const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
        const scheduledDateTime = new Date(scheduledAt);
        const now = new Date();
        
        if (scheduledDateTime <= now) {
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.validation.title'),
                message: t('communication.alerts.schedulePastError'),
                type: 'warning',
            });
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Create broadcast with pending status (will be set to pending by schedule endpoint)
            const broadcast = await createBroadcastAPI({
                subject,
                content,
                targets: effectiveTargets,
                broadcast_type: broadcastType,
                status: 'pending',
            });
            
            // Schedule the broadcast
            await scheduleBroadcastAPI(broadcast.id, scheduledAt);
            
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.scheduleSuccess.title'),
                message: t('communication.alerts.scheduleSuccess.message'),
                type: 'success',
            });
            setSubject('');
            setContent('');
            setTargets([]);
            setScheduledDate('');
            setScheduledTime('');
            onBroadcastCreated();
        } catch (error: any) {
            console.error('Error scheduling broadcast:', error);
            const msg = error?.message || '';
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.scheduleError.title'),
                message: /no recipients|No recipients/i.test(msg) ? t('communication.alerts.noRecipients') : (msg || t('communication.alerts.scheduleError.message')),
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
        const effectiveTargets = targets.length > 0 ? targets : ['all'];
        setIsSubmitting(true);
        try {
            const broadcast = await createBroadcastAPI({
                subject,
                content,
                targets: effectiveTargets,
                broadcast_type: broadcastType,
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
            setTargets([]);
            onBroadcastCreated();
        } catch (error: any) {
            console.error('Error sending broadcast:', error);
            const msg = error?.message || '';
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.sendError.title'),
                message: /no recipients|No recipients/i.test(msg) ? t('communication.alerts.noRecipients') : (msg || t('communication.alerts.sendError.message')),
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
                <label className="block text-sm font-medium mb-1">{t('communication.new.broadcastType') || 'نوع البث'}</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as 'email' | 'push')}
                >
                    <option value="email">{t('communication.new.broadcastType.email') || 'بريد إلكتروني'}</option>
                    <option value="push">{t('communication.new.broadcastType.push') || 'إشعار Push'}</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('communication.new.to')}</label>
                <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    value={targetSelectValue}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v) addTarget(v);
                    }}
                >
                    <option value="">{t('communication.new.target.addPlaceholder')}</option>
                    <option value="all">{t('communication.new.target.all')}</option>
                    <optgroup label={t('communication.new.target.byRole')}>
                        <option value="role_admin">{t('communication.new.target.roleAdmin')}</option>
                        <option value="role_supervisor">{t('communication.new.target.roleSupervisor')}</option>
                        <option value="role_employee">{t('communication.new.target.roleEmployee')}</option>
                    </optgroup>
                    {plans.length > 0 && (
                        <optgroup label={t('communication.new.target.plans')}>
                            {plans.map((plan) => (
                                <option key={plan.id} value={`plan_${plan.id}`}>
                                    {language === 'ar' ? (plan.name_ar || plan.name) : plan.name}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    {companies.length > 0 && (
                        <optgroup label={t('communication.new.target.company')}>
                            {companies.map((company) => (
                                <option key={company.id} value={`company_${company.id}`}>
                                    {company.name}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
                {targets.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {targets.map((tgt) => (
                            <span
                                key={tgt}
                                onClick={() => removeTarget(tgt)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                                title={t('communication.new.target.removeTag')}
                            >
                                {getTargetDisplayLabel(tgt, plans, companies, language, t)}
                                <Icon name="x" className="w-3.5 h-3.5" />
                            </span>
                        ))}
                    </div>
                )}
                {targets.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('communication.new.target.emptyHint')}</p>
                )}
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

interface SendSMSProps {
    plans: { id: number; name: string; name_ar?: string }[];
    companies: { id: number; name: string }[];
}

const SendSMS: React.FC<SendSMSProps> = ({ plans, companies }) => {
    const { t, language } = useI18n();
    const [content, setContent] = useState('');
    const [targets, setTargets] = useState<string[]>([]);
    const [targetSelectValue, setTargetSelectValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const addTarget = (value: string) => {
        if (!value || targets.includes(value)) return;
        setTargets((prev) => [...prev, value]);
        setTargetSelectValue('');
    };

    const removeTarget = (value: string) => {
        setTargets((prev) => prev.filter((tgt) => tgt !== value));
    };

    const handleSend = async () => {
        if (!content.trim()) {
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.validation.title'),
                message: t('communication.alerts.validation.message'),
                type: 'warning',
            });
            return;
        }
        const effectiveTargets = targets.length > 0 ? targets : ['all'];
        setIsSubmitting(true);
        try {
            const result = await sendSmsBroadcastAPI({ targets: effectiveTargets, content: content.trim() });
            const sent = result?.sent_count ?? 0;
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.sendSuccess.title'),
                message: t('communication.sms.success') + (sent > 0 ? ` (${sent})` : ''),
                type: 'success',
            });
            setContent('');
            setTargets([]);
        } catch (error: any) {
            const msg = error?.message || '';
            setAlertDialog({
                isOpen: true,
                title: t('communication.alerts.sendError.title'),
                message: /no recipients|No recipients|phone/i.test(msg) ? t('communication.sms.noRecipients') : (msg || t('communication.alerts.sendError.message')),
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">{t('communication.sms.title')}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">{t('communication.new.to')}</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        value={targetSelectValue}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v) addTarget(v);
                        }}
                    >
                        <option value="">{t('communication.new.target.addPlaceholder')}</option>
                        <option value="all">{t('communication.new.target.all')}</option>
                        <optgroup label={t('communication.new.target.byRole')}>
                            <option value="role_admin">{t('communication.new.target.roleAdmin')}</option>
                            <option value="role_supervisor">{t('communication.new.target.roleSupervisor')}</option>
                            <option value="role_employee">{t('communication.new.target.roleEmployee')}</option>
                        </optgroup>
                        {plans.length > 0 && (
                            <optgroup label={t('communication.new.target.plans')}>
                                {plans.map((plan) => (
                                    <option key={plan.id} value={`plan_${plan.id}`}>
                                        {language === 'ar' ? (plan.name_ar || plan.name) : plan.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {companies.length > 0 && (
                            <optgroup label={t('communication.new.target.company')}>
                                {companies.map((company) => (
                                    <option key={company.id} value={`company_${company.id}`}>
                                        {company.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    {targets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {targets.map((tgt) => (
                                <span
                                    key={tgt}
                                    onClick={() => removeTarget(tgt)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                                    title={t('communication.new.target.removeTag')}
                                >
                                    {getTargetDisplayLabel(tgt, plans, companies, language, t)}
                                    <Icon name="x" className="w-3.5 h-3.5" />
                                </span>
                            ))}
                        </div>
                    )}
                    {targets.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('communication.new.target.emptyHint')}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('communication.sms.content')}</label>
                    <textarea
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
                <div className={`flex justify-end ${language === 'ar' ? 'gap-4' : 'gap-2'}`}>
                    <button
                        onClick={handleSend}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? <LoadingSpinner /> : t('communication.sms.send')}
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
    );
};

interface HistoryProps {
    history: Broadcast[];
    onView: (broadcast: Broadcast) => void;
    onDelete: (id: number) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
    lastUpdated?: string | null;
    plans: { id: number; name: string; name_ar?: string }[];
    companies: { id: number; name: string }[];
}

const History: React.FC<HistoryProps> = ({ history, onView, onDelete, onRefresh, isLoading = false, lastUpdated, plans, companies }) => {
    const { t, language } = useI18n();

    const statusLabels: Record<Broadcast['status'], string> = {
        sent: t('communication.history.status.sent'),
        scheduled: t('communication.history.status.scheduled'),
        pending: t('communication.history.status.pending'),
        failed: t('communication.history.status.failed'),
        draft: t('communication.history.status.draft'),
    };

    const statusColors: Record<Broadcast['status'], string> = {
        sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        draft: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
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
                        {isLoading ? <LoadingSpinner size="sm" label={t('common.loading') || 'Loading'} /> : <Icon name="refresh" className="w-4 h-4" />}
                        <span>{t('common.refresh')}</span>
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400`}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.subject')}</th>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.type') || 'النوع'}</th>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.target')}</th>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.date')}</th>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.status')}</th>
                            <th className="px-6 py-3 text-center">{t('communication.history.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center justify-center">
                                        <LoadingSpinner label={t('communication.history.loading') || 'Loading history'} />
                                    </div>
                                </td>
                            </tr>
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    {t('communication.history.empty')}
                                </td>
                            </tr>
                        ) : (
                            history.map(item => (
                                <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 text-center">{item.subject}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            item.broadcast_type === 'push' 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {item.broadcast_type === 'push' 
                                                ? (t('communication.new.broadcastType.push') || 'إشعار Push')
                                                : (t('communication.new.broadcastType.email') || 'بريد إلكتروني')
                                            }
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{getTargetsDisplayLabel(item.targets ?? [item.target], plans, companies, language, t)}</td>
                                    <td className="px-6 py-4 text-center">{getDisplayDate(item)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[getDisplayStatus(item)] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {statusLabels[getDisplayStatus(item)] || item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => onView(item)} className="p-1 text-blue-600 hover:text-blue-800" title={t('communication.history.actions.view')}>
                                                <Icon name="view" className="w-5 h-5" />
                                            </button>
                                            {(getDisplayStatus(item) === 'scheduled' || item.status === 'draft') && (
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
    const { t, language } = useI18n();
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('communication_activeTab') || 'new';
    });
    
    // Save active tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('communication_activeTab', activeTab);
    }, [activeTab]);
    const [history, setHistory] = useState<Broadcast[]>([]);
    const [plans, setPlans] = useState<{ id: number; name: string; name_ar?: string }[]>([]);
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
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
        { id: 'sms', label: t('communication.tabs.sms') },
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
        const fetchPlansAndCompanies = async () => {
            try {
                const [plansRes, companiesRes] = await Promise.all([
                    getPlansAPI(),
                    getCompaniesAPI(),
                ]);
                setPlans((plansRes.results || []) as { id: number; name: string; name_ar?: string }[]);
                setCompanies((companiesRes.results || []).map((c: any) => ({ id: c.id, name: c.name || c.company_name || String(c.id) })));
            } catch (e) {
                console.error('Error fetching plans/companies:', e);
            }
        };
        fetchPlansAndCompanies();
    }, []);

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
            {activeTab === 'new' && <NewBroadcast onBroadcastCreated={loadBroadcasts} plans={plans} companies={companies} />}
            {activeTab === 'sms' && <SendSMS plans={plans} companies={companies} />}
            {activeTab === 'history' && (
                <History
                    history={history}
                    onView={handleViewBroadcast}
                    onDelete={handleDeleteBroadcast}
                    onRefresh={loadBroadcasts}
                    isLoading={isHistoryLoading}
                    lastUpdated={lastUpdatedAt}
                    plans={plans}
                    companies={companies}
                />
            )}
            <BroadcastViewModal 
                isOpen={isViewModalOpen}
                onClose={handleCloseModal}
                broadcast={selectedBroadcast}
                isLoading={isViewLoading}
                targetLabel={selectedBroadcast ? getTargetsDisplayLabel(selectedBroadcast.targets ?? [selectedBroadcast.target], plans, companies, language, t) : ''}
                displayStatus={selectedBroadcast ? getDisplayStatus(selectedBroadcast) : undefined}
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
