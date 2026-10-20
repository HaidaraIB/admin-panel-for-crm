import React, { useState } from 'react';

import { useI18n } from '../../context/i18n';
import { useToast } from '../../context/ToastContext';
import {
  createPbxNodeAPI,
  rotatePbxNodeTokensAPI,
  updatePbxNodeAPI,
  type PbxHealth,
  type PbxNode,
} from '../../services/api';
import FieldError from '../FieldError';
import IconButton from '../IconButton';
import LoadingButton from '../LoadingButton';
import { Badge, Ltr, ModalShell, inputClass, labelClass, tdClass, thClass, useApiErrorText, useCatalogForm, when } from './shared';

const NODE_TONE = { active: 'green', draining: 'amber', offline: 'gray' } as const;

const FIELDS = ['name', 'region', 'control_url', 'max_tenants', 'gateway_wg_public_key', 'gateway_wg_endpoint', 'gateway_wg_address'] as const;

const NodeModal: React.FC<{ node: PbxNode | null; onClose: () => void; onSaved: (node: PbxNode) => void }> = ({ node, onClose, onSaved }) => {
  const { t } = useI18n();
  const form = useCatalogForm('pbx_node.upsert');
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    name: node?.name ?? '',
    region: node?.region ?? '',
    control_url: node?.control_url ?? '',
    status: node?.status ?? 'active',
    max_tenants: String(node?.max_tenants ?? 100),
    gateway_wg_public_key: node?.gateway_wg_public_key ?? '',
    gateway_wg_endpoint: node?.gateway_wg_endpoint ?? '',
    gateway_wg_address: node?.gateway_wg_address ?? '10.78.0.1',
  });
  const payload = () => ({ ...values, name: values.name.trim(), max_tenants: Number(values.max_tenants) });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = payload();
    if (!form.validate(data)) return;
    setSaving(true);
    try {
      onSaved(node ? await updatePbxNodeAPI(node.id, data) : await createPbxNodeAPI(data));
    } catch (error) {
      form.fromServer(error);
    } finally {
      setSaving(false);
    }
  };
  const field = (name: (typeof FIELDS)[number], ltr = true) => (
    <div>
      <label htmlFor={`pbx-node-${name}`} className={labelClass}>{t(`telephony.nodes.${name}`)}{name === 'name' ? ' *' : ''}</label>
      <input
        id={`pbx-node-${name}`}
        dir={ltr ? 'ltr' : undefined}
        inputMode={name === 'max_tenants' ? 'numeric' : undefined}
        className={`${inputClass} ${form.errors[name] ? 'border-red-500' : ''}`}
        value={values[name]}
        onChange={(e) => setValues((prev) => ({ ...prev, [name]: name === 'max_tenants' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value }))}
      />
      <FieldError>{form.errors[name]}</FieldError>
    </div>
  );
  return (
    <ModalShell title={node ? t('telephony.nodes.edit') : t('telephony.nodes.add')} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.errors._general ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{form.errors._general}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {field('name')}
          {field('region')}
          {field('control_url')}
          <div>
            <label htmlFor="pbx-node-status" className={labelClass}>{t('telephony.nodes.status')}</label>
            <select id="pbx-node-status" className={inputClass} value={values.status}
              onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value as PbxNode['status'] }))}>
              {(['active', 'draining', 'offline'] as const).map((s) => <option key={s} value={s}>{t(`telephony.nodes.status_${s}`)}</option>)}
            </select>
          </div>
          {field('max_tenants')}
        </div>
        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('telephony.nodes.gatewayLink')}</legend>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('telephony.nodes.gatewayLinkHint')}</p>
          {field('gateway_wg_public_key')}
          <div className="grid gap-4 md:grid-cols-2">
            {field('gateway_wg_endpoint')}
            {field('gateway_wg_address')}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <LoadingButton variant="secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" isLoading={saving}>{t('common.save')}</LoadingButton>
        </div>
      </form>
    </ModalShell>
  );
};

/** Node and CRM tokens are shown once: on create and on rotation. */
const TokensModal: React.FC<{ tokens: { node_token: string; crm_token: string }; onClose: () => void }> = ({ tokens, onClose }) => {
  const { t } = useI18n();
  return (
    <ModalShell title={t('telephony.nodes.tokensTitle')} onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{t('telephony.nodes.tokensOnce')}</p>
        {(['node_token', 'crm_token'] as const).map((key) => (
          <div key={key}>
            <p className={labelClass}>{t(`telephony.nodes.${key}`)}</p>
            <p dir="ltr" className="break-all rounded-md bg-gray-100 p-2 font-mono text-xs text-gray-900 dark:bg-gray-900 dark:text-gray-100" data-token={key}>{tokens[key]}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t(`telephony.nodes.${key}Hint`)}</p>
          </div>
        ))}
        <div className="flex justify-end">
          <LoadingButton onClick={onClose}>{t('common.done')}</LoadingButton>
        </div>
      </div>
    </ModalShell>
  );
};

export const NodesTab: React.FC<{ nodes: PbxNode[]; health: PbxHealth | undefined; onChanged: () => void; readOnly?: boolean }> = ({ nodes, health, onChanged, readOnly = false }) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const errorText = useApiErrorText();
  const [editing, setEditing] = useState<PbxNode | 'new' | null>(null);
  const [tokens, setTokens] = useState<{ node_token: string; crm_token: string } | null>(null);
  const [confirmRotate, setConfirmRotate] = useState<PbxNode | null>(null);
  const [rotating, setRotating] = useState(false);
  const workerOf = (id: string) => health?.nodes.find((n) => n.id === id)?.worker;

  const rotate = async () => {
    if (!confirmRotate) return;
    setRotating(true);
    try {
      setTokens(await rotatePbxNodeTokensAPI(confirmRotate.id));
      setConfirmRotate(null);
    } catch (error) {
      showToast(errorText(error), { variant: 'error' });
    } finally {
      setRotating(false);
    }
  };

  return (
    <div>
      {readOnly ? null : (
        <div className="mb-3 flex justify-end">
          <LoadingButton icon="plus" onClick={() => setEditing('new')}>{t('telephony.nodes.add')}</LoadingButton>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className={thClass}>{t('telephony.nodes.name')}</th>
              <th className={thClass}>{t('telephony.nodes.status')}</th>
              <th className={thClass}>{t('telephony.nodes.tenants')}</th>
              <th className={thClass}>{t('telephony.nodes.worker')}</th>
              <th className={thClass}>{t('telephony.nodes.gatewayLink')}</th>
              <th className={thClass}>{t('telephony.nodes.lastSeen')}</th>
              <th className={thClass}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {nodes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('telephony.nodes.empty')}</td></tr>
            ) : nodes.map((node) => {
              const worker = workerOf(node.id);
              return (
                <tr key={node.id} data-node={node.name}>
                  <td className={tdClass}>
                    <p className="font-medium text-gray-900 dark:text-white">{node.name}</p>
                    <p className="text-xs text-gray-500"><Ltr>{node.control_url || '—'}</Ltr>{node.region ? ` · ${node.region}` : ''}</p>
                  </td>
                  <td className={tdClass}><Badge tone={NODE_TONE[node.status]}>{t(`telephony.nodes.status_${node.status}`)}</Badge></td>
                  <td className={tdClass}><Ltr>{node.tenant_count} / {node.max_tenants}</Ltr></td>
                  <td className={tdClass}>
                    {worker ? (
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={worker.ari ? 'green' : 'red'}>ARI</Badge>
                        <Badge tone={worker.redis ? 'green' : 'red'}>Redis</Badge>
                        <Badge tone={worker.buffer_depth > 100 ? 'amber' : 'gray'}>{t('telephony.nodes.buffer')} <Ltr>{worker.buffer_depth}</Ltr></Badge>
                      </div>
                    ) : <Badge tone="red">{t('telephony.nodes.unreachable')}</Badge>}
                  </td>
                  <td className={tdClass}>
                    {node.gateway_wg_public_key && node.gateway_wg_endpoint
                      ? <Ltr className="font-mono text-xs">{node.gateway_wg_endpoint}</Ltr>
                      : <Badge tone="amber">{t('telephony.nodes.gatewayNotSet')}</Badge>}
                  </td>
                  <td className={tdClass}>
                    <p className="text-xs">{when(node.last_seen_at, language)}</p>
                    {node.asterisk_version ? <p className="text-xs text-gray-500">Asterisk <Ltr>{node.asterisk_version}</Ltr></p> : null}
                  </td>
                  <td className={tdClass}>
                    {readOnly ? <span className="text-xs text-gray-400">—</span> : (
                      <div className="flex items-center gap-1">
                        <IconButton icon="edit" label={t('telephony.nodes.edit')} onClick={() => setEditing(node)} />
                        <IconButton icon="refresh" label={t('telephony.nodes.rotate')} tone="warning" onClick={() => setConfirmRotate(node)} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing ? (
        <NodeModal
          node={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            onChanged();
            if (saved.node_token && saved.crm_token) setTokens({ node_token: saved.node_token, crm_token: saved.crm_token });
            else showToast(t('telephony.saved'), { variant: 'success' });
          }}
        />
      ) : null}
      {confirmRotate ? (
        <ModalShell title={t('telephony.nodes.rotate')} onClose={() => setConfirmRotate(null)}>
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">{t('telephony.nodes.rotateWarning').replace('{name}', confirmRotate.name)}</p>
          <div className="flex justify-end gap-2">
            <LoadingButton variant="secondary" onClick={() => setConfirmRotate(null)} disabled={rotating}>{t('common.cancel')}</LoadingButton>
            <LoadingButton variant="danger" onClick={rotate} isLoading={rotating}>{t('telephony.nodes.rotate')}</LoadingButton>
          </div>
        </ModalShell>
      ) : null}
      {tokens ? <TokensModal tokens={tokens} onClose={() => setTokens(null)} /> : null}
    </div>
  );
};
