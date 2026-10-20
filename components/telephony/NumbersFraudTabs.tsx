import React, { useState } from 'react';

import { useI18n } from '../../context/i18n';
import { useToast } from '../../context/ToastContext';
import {
  resolvePbxFraudAlertAPI,
  verifyPbxNumberAPI,
  type PbxAdminNumber,
  type PbxFraudAlert,
} from '../../services/api';
import FieldError from '../FieldError';
import LoadingButton from '../LoadingButton';
import { Badge, Ltr, ModalShell, inputClass, labelClass, tdClass, thClass, useApiErrorText, useCatalogForm, when } from './shared';

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; labels: [string, string]; id: string }> = ({ value, onChange, labels, id }) => (
  <div role="tablist" aria-label={id} className="mb-3 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
    {[true, false].map((v, i) => (
      <button key={String(v)} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}
        className={`h-8 rounded-md px-3 text-sm font-medium ${value === v ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        {labels[i]}
      </button>
    ))}
  </div>
);

export const NumbersTab: React.FC<{
  numbers: PbxAdminNumber[];
  pendingOnly: boolean;
  onPendingOnly: (v: boolean) => void;
  onChanged: () => void;
  readOnly?: boolean;
}> = ({ numbers, pendingOnly, onPendingOnly, onChanged, readOnly = false }) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const errorText = useApiErrorText();
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (row: PbxAdminNumber, verified: boolean) => {
    setBusy(row.id);
    try {
      await verifyPbxNumberAPI(row.id, verified);
      showToast(t(verified ? 'telephony.numbers.verifiedToast' : 'telephony.numbers.unverifiedToast'), { variant: 'success' });
      onChanged();
    } catch (error) {
      showToast(errorText(error), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div>
      <Toggle id="pbx-numbers-filter" value={pendingOnly} onChange={onPendingOnly}
        labels={[t('telephony.numbers.pending'), t('telephony.numbers.all')]} />
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{t('telephony.numbers.hint')}</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className={thClass}>{t('telephony.numbers.number')}</th>
              <th className={thClass}>{t('telephony.tenants.company')}</th>
              <th className={thClass}>{t('telephony.numbers.trunk')}</th>
              <th className={thClass}>{t('telephony.numbers.added')}</th>
              <th className={thClass}>{t('telephony.numbers.status')}</th>
              <th className={thClass}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {numbers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t(pendingOnly ? 'telephony.numbers.emptyPending' : 'telephony.numbers.empty')}</td></tr>
            ) : numbers.map((row) => (
              <tr key={row.id} data-number={row.e164}>
                <td className={tdClass}><Ltr className="font-medium text-gray-900 dark:text-white">{row.e164}</Ltr>{row.label ? <p className="text-xs text-gray-500">{row.label}</p> : null}</td>
                <td className={tdClass}>{row.company_name}</td>
                <td className={tdClass}>{row.trunk_name} <span className="text-xs text-gray-500">· {t(`telephony.numbers.kind_${row.trunk_kind}`)}</span></td>
                <td className={tdClass}><span className="text-xs">{when(row.created_at, language)}</span></td>
                <td className={tdClass}>{row.verified ? <Badge tone="green">{t('telephony.numbers.verified')}</Badge> : <Badge tone="amber">{t('telephony.numbers.pending')}</Badge>}</td>
                <td className={tdClass}>
                  {readOnly ? <span className="text-xs text-gray-400">—</span> : row.verified ? (
                    <LoadingButton size="sm" variant="secondary" isLoading={busy === row.id} disabled={busy !== null} onClick={() => set(row, false)}>
                      {t('telephony.numbers.unverify')}
                    </LoadingButton>
                  ) : (
                    <LoadingButton size="sm" isLoading={busy === row.id} disabled={busy !== null} onClick={() => set(row, true)}>
                      {t('telephony.numbers.verify')}
                    </LoadingButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ResolveModal: React.FC<{ alert: PbxFraudAlert; onClose: () => void; onDone: () => void }> = ({ alert, onClose, onDone }) => {
  const { t } = useI18n();
  const form = useCatalogForm('pbx_fraud_alert.resolve');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate({ note })) return;
    setBusy(true);
    try {
      await resolvePbxFraudAlertAPI(alert.id, note.trim());
      onDone();
    } catch (error) {
      form.fromServer(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title={`${t('telephony.fraud.resolve')} · ${alert.company_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {alert.tenant_outbound_suspended ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{t('telephony.fraud.stillSuspended')}</p>
        ) : null}
        {form.errors._general ? <p role="alert" className="text-sm text-red-600">{form.errors._general}</p> : null}
        <div>
          <label htmlFor="pbx-resolve-note" className={labelClass}>{t('telephony.fraud.note')}</label>
          <input id="pbx-resolve-note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          <FieldError>{form.errors.note}</FieldError>
        </div>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" isLoading={busy}>{t('telephony.fraud.resolve')}</LoadingButton>
        </div>
      </form>
    </ModalShell>
  );
};

export const FraudTab: React.FC<{
  alerts: PbxFraudAlert[];
  openOnly: boolean;
  onOpenOnly: (v: boolean) => void;
  onChanged: () => void;
  readOnly?: boolean;
}> = ({ alerts, openOnly, onOpenOnly, onChanged, readOnly = false }) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [resolving, setResolving] = useState<PbxFraudAlert | null>(null);
  const value = (rule: PbxFraudAlert['rule'], v: number | null) =>
    v == null ? '—' : rule === 'international_share' ? `${Math.round(v * 100)}%` : String(v);
  return (
    <div>
      <Toggle id="pbx-fraud-filter" value={openOnly} onChange={onOpenOnly} labels={[t('telephony.fraud.open'), t('telephony.fraud.all')]} />
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className={thClass}>{t('telephony.fraud.when')}</th>
              <th className={thClass}>{t('telephony.tenants.company')}</th>
              <th className={thClass}>{t('telephony.fraud.rule')}</th>
              <th className={thClass}>{t('telephony.fraud.observed')}</th>
              <th className={thClass}>{t('telephony.fraud.destination')}</th>
              <th className={thClass}>{t('telephony.fraud.actionTaken')}</th>
              <th className={thClass}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {alerts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t(openOnly ? 'telephony.fraud.emptyOpen' : 'telephony.fraud.empty')}</td></tr>
            ) : alerts.map((a) => (
              <tr key={a.id} data-alert={a.id}>
                <td className={tdClass}><span className="text-xs">{when(a.occurred_at, language)}</span></td>
                <td className={tdClass}>{a.company_name}</td>
                <td className={tdClass}>
                  <Badge tone={a.severity === 'critical' ? 'red' : 'amber'}>{t(`telephony.fraud.rule_${a.rule}`)}</Badge>
                </td>
                <td className={tdClass}><Ltr>{value(a.rule, a.observed)} / {value(a.rule, a.threshold)}</Ltr></td>
                <td className={tdClass}>{a.destination ? <Ltr>{a.destination}</Ltr> : '—'}</td>
                <td className={tdClass}>{a.action_taken === 'outbound_suspended'
                  ? <Badge tone="red">{t('telephony.fraud.suspendedAction')}</Badge>
                  : <Badge tone="gray">{t('telephony.fraud.alertOnly')}</Badge>}</td>
                <td className={tdClass}>
                  {a.resolved_at ? (
                    <span className="text-xs text-gray-500">{t('telephony.fraud.resolvedBy').replace('{name}', a.resolved_by_name || '—')}</span>
                  ) : readOnly ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <LoadingButton size="sm" variant="secondary" onClick={() => setResolving(a)}>{t('telephony.fraud.resolve')}</LoadingButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resolving ? (
        <ResolveModal alert={resolving} onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); showToast(t('telephony.fraud.resolved'), { variant: 'success' }); onChanged(); }} />
      ) : null}
    </div>
  );
};
