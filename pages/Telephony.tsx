/**
 * Telephony (Loop Cloud PBX platform console): PBX nodes and their health, each
 * company's phone-system tenant (provision / suspend / resume / move to another
 * node / settings), the number verification queue, and fraud alerts. Backed by
 * /api/v1/admin/telephony/ (CanManageTelephony).
 */
import React, { useCallback, useEffect, useState } from 'react';

import RefreshButton from '../components/RefreshButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { NodesTab } from '../components/telephony/NodesTab';
import { FraudTab, NumbersTab } from '../components/telephony/NumbersFraudTabs';
import { TenantsTab } from '../components/telephony/TenantsTab';
import { useApiErrorText } from '../components/telephony/shared';
import { useI18n } from '../context/i18n';
import { useUser } from '../context/UserContext';
import { usePersistedTab } from '../hooks/usePersistedTab';
import {
  getPbxFraudAlertsAPI,
  getPbxHealthAPI,
  getPbxNodesAPI,
  getPbxNumbersAPI,
  getPbxTenantsAPI,
  type PbxAdminNumber,
  type PbxFraudAlert,
  type PbxHealth,
  type PbxNode,
  type PbxTenant,
} from '../services/api';
import { ADMIN_PAGE_TAB_ACTIVE, ADMIN_PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';

const TABS = ['nodes', 'tenants', 'numbers', 'fraud'] as const;
type Tab = (typeof TABS)[number];

const Stat: React.FC<{ id: string; label: string; value: number; tone?: 'amber' | 'red' }> = ({ id, label, value, tone }) => (
  <div data-stat={id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`mt-1 text-2xl font-semibold tabular-nums ${value && tone === 'red' ? 'text-red-600 dark:text-red-400'
      : value && tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{value}</p>
  </div>
);

const Telephony: React.FC = () => {
  const { t } = useI18n();
  const { hasPermission, isSuperAdmin } = useUser();
  // Tenant managers (can_manage_tenants) may look but not act (CanManageTelephony on the API).
  const readOnly = !isSuperAdmin() && !hasPermission('can_manage_telephony');
  const errorText = useApiErrorText();
  const [tab, setTab] = usePersistedTab<Tab>('telephony', TABS, 'nodes');
  const [health, setHealth] = useState<PbxHealth>();
  const [nodes, setNodes] = useState<PbxNode[]>([]);
  const [tenants, setTenants] = useState<PbxTenant[]>([]);
  const [numbers, setNumbers] = useState<PbxAdminNumber[]>([]);
  const [alerts, setAlerts] = useState<PbxFraudAlert[]>([]);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);
  const [openOnly, setOpenOnly] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Health asks every node's worker (up to 1.5 s each when one is unreachable),
  // so it loads on its own and never holds up the lists.
  const loadHealth = useCallback(async () => {
    try {
      setHealth(await getPbxHealthAPI());
    } catch {
      /* the lists still work; the counts stay as they were */
    }
  }, []);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [n, ts, ns, as] = await Promise.all([
        getPbxNodesAPI(),
        getPbxTenantsAPI(search || undefined),
        getPbxNumbersAPI({ verified: pendingOnly ? 'false' : undefined }),
        getPbxFraudAlertsAPI(openOnly),
      ]);
      setNodes(n);
      setTenants(ts);
      setNumbers(ns);
      setAlerts(as);
      setLoaded(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [search, pendingOnly, openOnly, errorText]);

  const load = useCallback(() => {
    void loadHealth();
    void loadLists();
  }, [loadHealth, loadLists]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);
  useEffect(() => {
    const id = window.setTimeout(() => void loadLists(), search ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [loadLists, search]);

  const badge = (id: Tab) =>
    id === 'numbers' ? health?.numbers_to_verify : id === 'fraud' ? health?.open_fraud_alerts : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('telephony.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('telephony.subtitle')}</p>
        </div>
        <RefreshButton onClick={load} loading={loading} />
      </div>
      {readOnly ? (
        <p role="status" data-telephony-readonly
          className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          {t('telephony.readOnly')}
        </p>
      ) : null}
      {health ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat id="nodes" label={t('telephony.stats.nodes')} value={health.nodes.length} />
          <Stat id="failed_tenants" label={t('telephony.stats.failedTenants')} value={health.failed_tenants} tone="red" />
          <Stat id="numbers_to_verify" label={t('telephony.stats.numbersToVerify')} value={health.numbers_to_verify} tone="amber" />
          <Stat id="open_fraud_alerts" label={t('telephony.stats.openAlerts')} value={health.open_fraud_alerts} tone="red" />
        </div>
      ) : null}
      <nav className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700" aria-label={t('telephony.title')}>
        {TABS.map((id) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={`whitespace-nowrap px-1 py-3 text-sm ${tab === id ? ADMIN_PAGE_TAB_ACTIVE : ADMIN_PAGE_TAB_INACTIVE}`}>
            {t(`telephony.tabs.${id}`)}
            {badge(id) ? <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">{badge(id)}</span> : null}
          </button>
        ))}
      </nav>
      {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p> : null}
      {loading && !loaded ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {tab === 'nodes' ? <NodesTab nodes={nodes} health={health} onChanged={load} readOnly={readOnly} /> : null}
          {tab === 'tenants' ? (
            <TenantsTab tenants={tenants} nodes={nodes} search={search} onSearch={setSearch} onChanged={load} readOnly={readOnly} />
          ) : null}
          {tab === 'numbers' ? (
            <NumbersTab numbers={numbers} pendingOnly={pendingOnly} onPendingOnly={setPendingOnly} onChanged={load} readOnly={readOnly} />
          ) : null}
          {tab === 'fraud' ? (
            <FraudTab alerts={alerts} openOnly={openOnly} onOpenOnly={setOpenOnly} onChanged={load} readOnly={readOnly} />
          ) : null}
        </>
      )}
    </div>
  );
};

export default Telephony;
