import React, { useState } from 'react';

import { useI18n } from '../../context/i18n';
import { useToast } from '../../context/ToastContext';
import {
  migratePbxTenantAPI,
  provisionPbxTenantAPI,
  repushPbxTenantAPI,
  resumePbxTenantAPI,
  suspendPbxTenantAPI,
  updatePbxTenantAPI,
  type PbxFraudLimits,
  type PbxNode,
  type PbxTenant,
} from '../../services/api';
import { DataTable, TableActions, TableBody, TableHead, TableMessageRow, TableRow, Td, Th } from '../DataTable';
import FieldError from '../FieldError';
import { FormInput, FormSelect } from '../settings/FormFields';
import IconButton from '../IconButton';
import LoadingButton from '../LoadingButton';
import { Badge, Ltr, ModalShell, labelClass, useApiErrorText, useCatalogForm } from './shared';

const STATUS_TONE = { pending: 'blue', active: 'green', failed: 'red', suspended: 'amber', deprovisioned: 'gray' } as const;

type Dialog =
  | { kind: 'suspend' | 'migrate' | 'settings'; tenant: PbxTenant }
  | null;

const SuspendModal: React.FC<{ tenant: PbxTenant; onClose: () => void; onDone: () => void }> = ({ tenant, onClose, onDone }) => {
  const { t } = useI18n();
  const form = useCatalogForm('pbx_tenant.suspend');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate({ reason })) return;
    setBusy(true);
    try {
      await suspendPbxTenantAPI(tenant.company, reason.trim());
      onDone();
    } catch (error) {
      form.fromServer(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title={`${t('telephony.tenants.suspend')} · ${tenant.company_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('telephony.tenants.suspendHint')}</p>
        {form.errors._general ? <p role="alert" className="text-sm text-red-600">{form.errors._general}</p> : null}
        <div>
          <label htmlFor="pbx-suspend-reason" className={labelClass}>{t('telephony.tenants.reason')}</label>
          <FormInput id="pbx-suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <FieldError>{form.errors.reason}</FieldError>
        </div>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" variant="danger" isLoading={busy}>{t('telephony.tenants.suspend')}</LoadingButton>
        </div>
      </form>
    </ModalShell>
  );
};

const MigrateModal: React.FC<{ tenant: PbxTenant; nodes: PbxNode[]; onClose: () => void; onDone: (gateways: number) => void }> = ({
  tenant, nodes, onClose, onDone,
}) => {
  const { t } = useI18n();
  const form = useCatalogForm('pbx_tenant.migrate');
  const targets = nodes.filter((n) => n.id !== tenant.home_node && n.status === 'active');
  const [node, setNode] = useState(targets[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate({ node })) return;
    setBusy(true);
    try {
      const result = await migratePbxTenantAPI(tenant.company, node);
      onDone(result.gateways_moved);
    } catch (error) {
      form.fromServer(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title={`${t('telephony.tenants.migrate')} · ${tenant.company_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('telephony.tenants.migrateHint')}</p>
        {form.errors._general ? <p role="alert" className="text-sm text-red-600">{form.errors._general}</p> : null}
        <div>
          <label htmlFor="pbx-migrate-node" className={labelClass}>{t('telephony.tenants.targetNode')} *</label>
          <FormSelect id="pbx-migrate-node" value={node} onChange={(e) => setNode(e.target.value)}>
            <option value="">{t('telephony.tenants.chooseNode')}</option>
            {targets.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tenant_count}/{n.max_tenants})</option>)}
          </FormSelect>
          <FieldError>{form.errors.node}</FieldError>
        </div>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" isLoading={busy} disabled={!targets.length}>{t('telephony.tenants.migrate')}</LoadingButton>
        </div>
      </form>
    </ModalShell>
  );
};

const LIMIT_NUMBERS = ['max_calls_per_hour', 'max_new_destinations_per_hour', 'min_calls_for_share', 'max_international_share'] as const;

const SettingsModal: React.FC<{ tenant: PbxTenant; onClose: () => void; onDone: () => void }> = ({ tenant, onClose, onDone }) => {
  const { t } = useI18n();
  const form = useCatalogForm('pbx_tenant.admin_update');
  const eff = tenant.effective_fraud_limits;
  const [limits, setLimits] = useState(() => ({
    ...Object.fromEntries(LIMIT_NUMBERS.map((k) => [k, String(eff[k])])),
    home_prefixes: eff.home_prefixes.join(', '),
    premium_prefixes: eff.premium_prefixes.join(', '),
    action: eff.action,
  }) as Record<string, string>);
  const [hold, setHold] = useState(tenant.recording_legal_hold);
  const [busy, setBusy] = useState(false);
  const list = (v: string) => v.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fraud_limits: Partial<PbxFraudLimits> = {
      max_calls_per_hour: Number(limits.max_calls_per_hour),
      max_new_destinations_per_hour: Number(limits.max_new_destinations_per_hour),
      min_calls_for_share: Number(limits.min_calls_for_share),
      max_international_share: Number(limits.max_international_share),
      home_prefixes: list(limits.home_prefixes),
      premium_prefixes: list(limits.premium_prefixes),
      action: limits.action as PbxFraudLimits['action'],
    };
    const data = { fraud_limits, recording_legal_hold: hold };
    if (!form.validate(data)) return;
    setBusy(true);
    try {
      await updatePbxTenantAPI(tenant.company, data);
      onDone();
    } catch (error) {
      form.fromServer(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title={`${t('telephony.tenants.settings')} · ${tenant.company_name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {form.errors._general || form.errors.fraud_limits ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{form.errors._general || form.errors.fraud_limits}</p>
        ) : null}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('telephony.tenants.fraudLimits')}</legend>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('telephony.tenants.fraudHint')}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {LIMIT_NUMBERS.map((key) => (
              <div key={key}>
                <label htmlFor={`pbx-fraud-${key}`} className={labelClass}>{t(`telephony.fraud.${key}`)}</label>
                <FormInput id={`pbx-fraud-${key}`} dir="ltr" inputMode="decimal" value={limits[key]}
                  onChange={(e) => setLimits((prev) => ({ ...prev, [key]: e.target.value.replace(/[^0-9.]/g, '') }))} />
              </div>
            ))}
            {(['home_prefixes', 'premium_prefixes'] as const).map((key) => (
              <div key={key}>
                <label htmlFor={`pbx-fraud-${key}`} className={labelClass}>{t(`telephony.fraud.${key}`)}</label>
                <FormInput id={`pbx-fraud-${key}`} dir="ltr" value={limits[key]} placeholder="+964"
                  onChange={(e) => setLimits((prev) => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label htmlFor="pbx-fraud-action" className={labelClass}>{t('telephony.fraud.action')}</label>
              <FormSelect id="pbx-fraud-action" value={limits.action}
                onChange={(e) => setLimits((prev) => ({ ...prev, action: e.target.value }))}>
                <option value="block">{t('telephony.fraud.action_block')}</option>
                <option value="alert">{t('telephony.fraud.action_alert')}</option>
              </FormSelect>
            </div>
          </div>
        </fieldset>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <input id="pbx-legal-hold" type="checkbox" checked={hold} onChange={(e) => setHold(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-primary-600 focus:ring-primary-500" />
          <span>
            <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{t('telephony.tenants.legalHold')}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">{t('telephony.tenants.legalHoldHint')}</span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" isLoading={busy}>{t('common.save')}</LoadingButton>
        </div>
      </form>
    </ModalShell>
  );
};

export const TenantsTab: React.FC<{
  tenants: PbxTenant[];
  nodes: PbxNode[];
  search: string;
  onSearch: (value: string) => void;
  onChanged: () => void;
  readOnly?: boolean;
}> = ({ tenants, nodes, search, onSearch, onChanged, readOnly = false }) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const errorText = useApiErrorText();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      showToast(success, { variant: 'success' });
      onChanged();
    } catch (error) {
      showToast(errorText(error), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };
  const done = (message: string) => {
    setDialog(null);
    showToast(message, { variant: 'success' });
    onChanged();
  };

  return (
    <div>
      <div className="mb-3 max-w-sm">
        <label htmlFor="pbx-tenant-search" className="sr-only">{t('telephony.tenants.search')}</label>
        <FormInput id="pbx-tenant-search" placeholder={t('telephony.tenants.search')} value={search}
          onChange={(e) => onSearch(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <DataTable>
          <TableHead>
            <Th>{t('telephony.tenants.company')}</Th>
            <Th>{t('telephony.tenants.status')}</Th>
            <Th>{t('telephony.tenants.node')}</Th>
            <Th>{t('telephony.tenants.config')}</Th>
            <Th>{t('telephony.tenants.flags')}</Th>
            <Th>{t('common.actions')}</Th>
          </TableHead>
          <TableBody>
            {tenants.length === 0 ? (
              <TableMessageRow colSpan={6}>{t('telephony.tenants.empty')}</TableMessageRow>
            ) : tenants.map((tenant) => (
              <TableRow key={tenant.id} data-tenant={tenant.company}>
                <Td>
                  <p className="font-medium text-gray-900 dark:text-white">{tenant.company_name}</p>
                  <p className="font-mono text-xs text-gray-500"><Ltr>{tenant.tag}</Ltr></p>
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[tenant.status]}>{t(`telephony.tenants.status_${tenant.status}`)}</Badge>
                  {tenant.last_apply_error ? <p className="mt-1 max-w-xs truncate text-xs text-red-600" title={tenant.last_apply_error}>{tenant.last_apply_error}</p> : null}
                </Td>
                <Td>
                  {tenant.home_node_name || '—'}
                  {tenant.draining_node_name ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {/* The node name is LTR inside an RTL sentence: isolate it. */}
                      {t('telephony.tenants.drainingFrom').split('{node}').map((part, i) => (
                        <React.Fragment key={i}>{i ? <bdi>{tenant.draining_node_name}</bdi> : null}{part}</React.Fragment>
                      ))}
                    </p>
                  ) : null}
                </Td>
                <Td>
                  <Ltr>{tenant.applied_version != null ? `v${tenant.applied_version}` : '—'} / v{tenant.config_version}</Ltr>
                </Td>
                <Td>
                  <div className="flex flex-wrap justify-center gap-1">
                    {tenant.outbound_suspended ? <Badge tone="amber">{t('telephony.tenants.outboundSuspended')}</Badge> : null}
                    {tenant.outbound_blocked_on_node ? <Badge tone="red">{t('telephony.tenants.blockedOnNode')}</Badge> : null}
                    {tenant.open_fraud_alerts ? <Badge tone="red">{t('telephony.tenants.openAlerts').replace('{n}', String(tenant.open_fraud_alerts))}</Badge> : null}
                    {tenant.recording_legal_hold ? <Badge tone="blue">{t('telephony.tenants.legalHold')}</Badge> : null}
                    {tenant.recording_paused_quota ? <Badge tone="amber">{t('telephony.tenants.recordingFull')}</Badge> : null}
                  </div>
                </Td>
                <Td>
                  {readOnly ? <span className="text-xs text-gray-400">—</span> : (
                  <TableActions>
                    {tenant.status === 'failed' || tenant.status === 'deprovisioned' ? (
                      <IconButton icon="restore" label={t('telephony.tenants.provision')} disabled={busy !== null}
                        onClick={() => act(`p${tenant.id}`, () => provisionPbxTenantAPI(tenant.company), t('telephony.tenants.provisioned'))} />
                    ) : null}
                    {tenant.outbound_suspended ? (
                      <IconButton icon="check" label={t('telephony.tenants.resume')} tone="primary" disabled={busy !== null}
                        onClick={() => act(`r${tenant.id}`, () => resumePbxTenantAPI(tenant.company), t('telephony.tenants.resumed'))} />
                    ) : (
                      <IconButton icon="ban" label={t('telephony.tenants.suspend')} tone="warning" disabled={busy !== null}
                        onClick={() => setDialog({ kind: 'suspend', tenant })} />
                    )}
                    <IconButton icon="layers" label={t('telephony.tenants.migrate')} disabled={busy !== null || Boolean(tenant.draining_node)}
                      onClick={() => setDialog({ kind: 'migrate', tenant })} />
                    <IconButton icon="send" label={t('telephony.tenants.repush')} disabled={busy !== null}
                      onClick={() => act(`s${tenant.id}`, () => repushPbxTenantAPI(tenant.company), t('telephony.tenants.repushed'))} />
                    <IconButton icon="settings" label={t('telephony.tenants.settings')} onClick={() => setDialog({ kind: 'settings', tenant })} />
                  </TableActions>
                  )}
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </div>
      {dialog?.kind === 'suspend' ? (
        <SuspendModal tenant={dialog.tenant} onClose={() => setDialog(null)} onDone={() => done(t('telephony.tenants.suspended'))} />
      ) : null}
      {dialog?.kind === 'migrate' ? (
        <MigrateModal tenant={dialog.tenant} nodes={nodes} onClose={() => setDialog(null)}
          onDone={(gateways) => done(gateways
            ? t('telephony.tenants.migratedGateways').replace('{n}', String(gateways))
            : t('telephony.tenants.migrated'))} />
      ) : null}
      {dialog?.kind === 'settings' ? (
        <SettingsModal tenant={dialog.tenant} onClose={() => setDialog(null)} onDone={() => done(t('telephony.saved'))} />
      ) : null}
    </div>
  );
};
