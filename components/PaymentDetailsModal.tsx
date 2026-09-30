import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentStatus } from '../types';
import { useI18n } from '../context/i18n';
import { getPaymentAPI } from '../services/api';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import PaymentGatewayLogo from './PaymentGatewayLogo';
import { withLatinDigits } from '../utils/latinNumerals';

type PaymentDetailRecord = {
    id: number;
    subscription: number;
    subscription_company_name?: string;
    subscription_plan_name?: string;
    target_plan_name?: string;
    billing_cycle?: string;
    amount?: string | number;
    currency?: string;
    exchange_rate?: string | number | null;
    amount_usd?: string | number | null;
    payment_method_name?: string;
    payment_status?: string;
    tran_ref?: string;
    gateway_request_id?: string;
    gateway_refund_id?: string;
    session_meta?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
};

function mapApiPaymentStatus(raw: string | undefined): PaymentStatus {
    const s = (raw || '').toLowerCase();
    if (s === 'completed' || s === 'successful' || s === 'success') return PaymentStatus.Successful;
    if (s === 'pending') return PaymentStatus.Pending;
    if (s === 'canceled' || s === 'cancelled') return PaymentStatus.Canceled;
    if (s === 'refunded') return PaymentStatus.Refunded;
    return PaymentStatus.Failed;
}

const statusBadgeClass: Record<PaymentStatus, string> = {
    [PaymentStatus.Successful]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    [PaymentStatus.Failed]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [PaymentStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    [PaymentStatus.Canceled]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    [PaymentStatus.Refunded]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const DetailRow: React.FC<{
    label: string;
    children: React.ReactNode;
    className?: string;
}> = ({ label, children, className = '' }) => (
    <div className={className}>
        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
        <dd className="text-sm text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
);

const CopyableId: React.FC<{ value: string; copyLabel: string; copiedLabel: string }> = ({
    value,
    copyLabel,
    copiedLabel,
}) => {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    }, [value]);

    return (
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 px-3 py-2">
            <code className="flex-1 min-w-0 text-xs font-mono break-all text-gray-800 dark:text-gray-200" dir="ltr">
                {value}
            </code>
            <button
                type="button"
                onClick={() => void onCopy()}
                className="shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400"
                title={copied ? copiedLabel : copyLabel}
                aria-label={copyLabel}
            >
                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
            </button>
        </div>
    );
};

interface PaymentDetailsModalProps {
    paymentId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
    paymentId,
    isOpen,
    onClose,
}) => {
    const { t, language } = useI18n();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payment, setPayment] = useState<PaymentDetailRecord | null>(null);

    useEffect(() => {
        if (!isOpen || paymentId == null) {
            setPayment(null);
            setError(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        void getPaymentAPI(paymentId)
            .then((data) => {
                if (!cancelled) setPayment(data as PaymentDetailRecord);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : t('subscriptions.payments.details.loadError'));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, paymentId, t]);

    if (!isOpen) return null;

    const status = payment ? mapApiPaymentStatus(payment.payment_status) : PaymentStatus.Pending;
    const refundMeta = payment?.session_meta?.qicard_refund as Record<string, unknown> | undefined;

    const formatMoney = (amount: number, currency: string) =>
        `${amount.toLocaleString(undefined, withLatinDigits({ minimumFractionDigits: 2, maximumFractionDigits: 2 }))} ${currency}`;

    const formatDateTime = (iso?: string) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
        } catch {
            return iso;
        }
    };

    const gatewayRows: { label: string; value: string }[] = [];
    if (payment?.tran_ref) {
        gatewayRows.push({
            label: t('subscriptions.payments.gateway.paymentId'),
            value: payment.tran_ref,
        });
    }
    if (payment?.gateway_request_id) {
        gatewayRows.push({
            label: t('subscriptions.payments.gateway.requestId'),
            value: payment.gateway_request_id,
        });
    }
    if (payment?.gateway_refund_id) {
        gatewayRows.push({
            label: t('subscriptions.payments.gateway.refundId'),
            value: payment.gateway_refund_id,
        });
    } else if (refundMeta?.refundId) {
        gatewayRows.push({
            label: t('subscriptions.payments.gateway.refundId'),
            value: String(refundMeta.refundId),
        });
    }
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-details-title"
            >
                <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 min-w-0">
                        {payment?.payment_method_name ? (
                            <PaymentGatewayLogo
                                gatewayName={payment.payment_method_name}
                                imageClassName="h-9 w-auto object-contain"
                            />
                        ) : null}
                        <div className="min-w-0">
                            <h2
                                id="payment-details-title"
                                className="text-lg font-semibold text-gray-900 dark:text-white truncate"
                            >
                                {t('subscriptions.payments.details.title')}
                            </h2>
                            {payment?.subscription_company_name ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {payment.subscription_company_name}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('common.close')}
                    >
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-600 dark:text-red-400 text-center py-8">{error}</p>
                    ) : payment ? (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[status]}`}
                                >
                                    {t(`status.${status}`)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
                                    #{payment.id}
                                </span>
                            </div>

                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                                    {t('subscriptions.payments.details.overview')}
                                </h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailRow label={t('subscriptions.payments.details.amountPaid')}>
                                        {formatMoney(
                                            parseFloat(String(payment.amount ?? 0)),
                                            (payment.currency || 'USD').toUpperCase(),
                                        )}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.amountUsd')}>
                                        {payment.amount_usd != null
                                            ? `$${parseFloat(String(payment.amount_usd)).toLocaleString(undefined, withLatinDigits({ minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`
                                            : '—'}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.plan')}>
                                        {payment.target_plan_name ||
                                            payment.subscription_plan_name ||
                                            '—'}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.billingCycle')}>
                                        {payment.billing_cycle || '—'}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.subscriptionId')}>
                                        <span className="font-mono" dir="ltr">{payment.subscription}</span>
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.exchangeRate')}>
                                        {payment.exchange_rate != null ? String(payment.exchange_rate) : '—'}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.createdAt')}>
                                        {formatDateTime(payment.created_at)}
                                    </DetailRow>
                                    <DetailRow label={t('subscriptions.payments.details.updatedAt')}>
                                        {formatDateTime(payment.updated_at)}
                                    </DetailRow>
                                </dl>
                            </section>

                            {gatewayRows.length > 0 ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                                        {t('subscriptions.payments.details.gateway')}
                                    </h3>
                                    <div className="space-y-3">
                                        {gatewayRows.map((row) => (
                                            <div key={row.label}>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                                    {row.label}
                                                </p>
                                                <CopyableId
                                                    value={row.value}
                                                    copyLabel={t('subscriptions.payments.gateway.copy')}
                                                    copiedLabel={t('subscriptions.payments.gateway.copied')}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default PaymentDetailsModal;
