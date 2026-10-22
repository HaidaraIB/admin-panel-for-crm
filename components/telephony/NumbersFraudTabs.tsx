import React, { useState } from 'react';

import { useI18n } from '../../context/i18n';
import { useToast } from '../../context/ToastContext';
import {
  resolvePbxFraudAlertAPI,
  verifyPbxNumberAPI,
  type PbxAdminNumber,
  type PbxFraudAlert,
} from '../../services/api';
import { DataTable, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../DataTable';
import FieldError from '../FieldError';
import { FormInput } from '../settings/FormFields';
import LoadingButton from '../LoadingButton';
import { Badge, Ltr, ModalShell, labelClass, useApiErrorText, useCatalogForm, when } from './shared';

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
        <DataTable>
          <TableHead>
            <Th>{t('telephony.numbers.number')}</Th>
            <Th>{t('telephony.tenants.company')}</Th>
            <Th>{t('telephony.numbers.trunk')}</Th>
            <Th>{t('telephony.numbers.added')}</Th>
            <Th>{t('telephony.numbers.status')}</Th>
            <Th>{t('common.actions')}</Th>
          </TableHead>
          <TableBody>
            {numbers.length === 0 ? (
              <TableMessageRow colSpan={6}>{t(pendingOnly ? 'telephony.numbers.emptyPending' : 'telephony.numbers.empty')}</TableMessageRow>
            ) : numbers.map((row) => (
              <TableRow key={row.id} data-number={row.e164}>
                <Td><Ltr className="font-medium text-gray-900 dark:text-white">{row.e164}</Ltr>{row.label ? <p className="text-xs text-gray-500">{row.label}</p> : null}</Td>
                <Td>{row.company_name}</Td>
                <Td>{row.trunk_name} <span className="text-xs text-gray-500">· {t(`telephony.numbers.kind_${row.trunk_kind}`)}</span></Td>
                <Td><span className="text-xs">{when(row.created_at, language)}</span></Td>
                <Td>{row.verified ? <Badge tone="green">{t('telephony.numbers.verified')}</Badge> : <Badge tone="amber">{t('telephony.numbers.pending')}</Badge>}</Td>
                <Td>
                  {readOnly ? <span className="text-xs text-gray-400">—</span> : row.verified ? (
                    <LoadingButton size="sm" variant="secondary" isLoading={busy === row.id} disabled={busy !== null} onClick={() => set(row, false)}>
                      {t('telephony.numbers.unverify')}
                    </LoadingButton>
                  ) : (
                    <LoadingButton size="sm" isLoading={busy === row.id} disabled={busy !== null} onClick={() => set(row, true)}>
                      {t('telephony.numbers.verify')}
                    </LoadingButton>
                  )}
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
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
          <FormInput id="pbx-resolve-note" value={note} onChange={(e) => setNote(e.target.value)} />
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
        <DataTable>
          <TableHead>
            <Th>{t('telephony.fraud.when')}</Th>
            <Th>{t('telephony.tenants.company')}</Th>
            <Th>{t('telephony.fraud.rule')}</Th>
            <Th>{t('telephony.fraud.observed')}</Th>
            <Th>{t('telephony.fraud.destination')}</Th>
            <Th>{t('telephony.fraud.actionTaken')}</Th>
            <Th>{t('common.actions')}</Th>
          </TableHead>
          <TableBody>
            {alerts.length === 0 ? (
              <TableMessageRow colSpan={7}>{t(openOnly ? 'telephony.fraud.emptyOpen' : 'telephony.fraud.empty')}</TableMessageRow>
            ) : alerts.map((a) => (
              <TableRow key={a.id} data-alert={a.id}>
                <Td><span className="text-xs">{when(a.occurred_at, language)}</span></Td>
                <Td>{a.company_name}</Td>
                <Td>
                  <Badge tone={a.severity === 'critical' ? 'red' : 'amber'}>{t(`telephony.fraud.rule_${a.rule}`)}</Badge>
                </Td>
                <Td><Ltr>{value(a.rule, a.observed)} / {value(a.rule, a.threshold)}</Ltr></Td>
                <Td>{a.destination ? <Ltr>{a.destination}</Ltr> : '—'}</Td>
                <Td>{a.action_taken === 'outbound_suspended'
                  ? <Badge tone="red">{t('telephony.fraud.suspendedAction')}</Badge>
                  : <Badge tone="gray">{t('telephony.fraud.alertOnly')}</Badge>}</Td>
                <Td>
                  {a.resolved_at ? (
                    <span className="text-xs text-gray-500">{t('telephony.fraud.resolvedBy').replace('{name}', a.resolved_by_name || '—')}</span>
                  ) : readOnly ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <LoadingButton size="sm" variant="secondary" onClick={() => setResolving(a)}>{t('telephony.fraud.resolve')}</LoadingButton>
                  )}
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </div>
      {resolving ? (
        <ResolveModal alert={resolving} onClose={() => setResolving(null)}
          onDone={() => { setResolving(null); showToast(t('telephony.fraud.resolved'), { variant: 'success' }); onChanged(); }} />
      ) : null}
    </div>
  );
};
