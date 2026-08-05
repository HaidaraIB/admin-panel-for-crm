import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Icon from '../components/Icon';
import RefreshButton from '../components/RefreshButton';
import Skeleton from '../components/Skeleton';
import { FilterInput } from '../components/filters';
import { useI18n } from '../context/i18n';
import { useUser } from '../context/UserContext';
import { getAdminDashboardSummaryAPI } from '../services/api';
import { withLatinDigits } from '../utils/latinNumerals';
import { getChartTheme, renderChartLegend, useIsDarkMode } from '../utils/chartTheme';

type DateRange = {
  start: string;
  end: string;
};

const formatDateInput = (date: Date) => date.toISOString().split('T')[0];

const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
};

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: string;
  colors: {
    bg: string;
    iconContainer: string;
    icon: string;
  };
  loading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeType, icon, colors, loading }) => {
  const { language } = useI18n();
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/4 mt-4" />
      </div>
    );
  }

  return (
    <div className={`relative p-6 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl ${colors.bg}`}>
      <div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
      <p className={`mt-2 text-sm ${changeColor}`}>{change}</p>

      <div className={`absolute bottom-4 ${language === 'ar' ? 'left-4' : 'right-4'} p-3 rounded-full ${colors.iconContainer}`}>
        <Icon name={icon} className={`w-6 h-6 ${colors.icon}`} />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { user, hasPermission, isSuperAdmin } = useUser();

  // Check permissions for different sections
  const canViewDashboard = isSuperAdmin() || hasPermission('can_view_dashboard');
  const canViewTenants = isSuperAdmin() || hasPermission('can_manage_tenants') || hasPermission('can_view_dashboard');
  const canViewSubscriptions = isSuperAdmin() || hasPermission('can_manage_subscriptions') || hasPermission('can_view_dashboard');
  const canViewPayments = isSuperAdmin() || hasPermission('can_manage_payment_gateways') || hasPermission('can_view_reports') || hasPermission('can_view_dashboard');
  const canViewPlans = isSuperAdmin() || hasPermission('can_manage_subscriptions') || hasPermission('can_view_dashboard');

  const [dateRange, setDateRange] = useState<DateRange>(() => getDefaultDateRange());
  const [tempRange, setTempRange] = useState<DateRange>(() => getDefaultDateRange());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateError, setDateError] = useState('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
        setDateError('');
        setTempRange(dateRange);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, dateRange]);
  const [kpiData, setKpiData] = useState([
    {
      title: t('dashboard.kpi.mrr'),
      value: "$0",
      change: "0%",
      changeType: "increase" as const,
      icon: "cash",
      colors: {
        bg: 'bg-blue-50 dark:bg-gray-800',
        iconContainer: 'bg-blue-100 dark:bg-blue-900/50',
        icon: 'text-blue-600 dark:text-blue-400'
      }
    },
    {
      title: t('dashboard.kpi.activeTenants'),
      value: "0",
      change: "0",
      changeType: "increase" as const,
      icon: "tenants",
      colors: {
        bg: 'bg-green-50 dark:bg-gray-800',
        iconContainer: 'bg-green-100 dark:bg-green-900/50',
        icon: 'text-green-600 dark:text-green-400'
      }
    },
    {
      title: t('dashboard.kpi.newSubscriptions'),
      value: "0",
      change: "0",
      changeType: "increase" as const,
      icon: "trending-up",
      colors: {
        bg: 'bg-yellow-50 dark:bg-gray-800',
        iconContainer: 'bg-yellow-100 dark:bg-yellow-900/50',
        icon: 'text-yellow-600 dark:text-yellow-400'
      }
    },
    {
      title: t('dashboard.kpi.expiringSubscriptions'),
      value: "0",
      change: "0",
      changeType: "increase" as const,
      icon: "clock",
      colors: {
        bg: 'bg-indigo-50 dark:bg-gray-800',
        iconContainer: 'bg-indigo-100 dark:bg-indigo-900/50',
        icon: 'text-indigo-600 dark:text-indigo-400'
      }
    },
  ]);
  const [revenueData, setRevenueData] = useState<Array<{ name: string; revenue: number }>>([]);
  const [planData, setPlanData] = useState<Array<{ name: string; count: number }>>([]);
  const [recentCompanies, setRecentCompanies] = useState<Array<{ name: string; plan: string }>>([]);
  const [recentPayments, setRecentPayments] = useState<Array<{ name: string; amount: string }>>([]);

  const dateRangeLabel = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return '';
    }

    try {
      const formatter = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits({
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }));
      const startLabel = formatter.format(new Date(dateRange.start));
      const endLabel = formatter.format(new Date(dateRange.end));
      return `${startLabel} - ${endLabel}`;
    } catch {
      return '';
    }
  }, [dateRange, language]);

  const handleTempRangeChange = (field: keyof DateRange, value: string) => {
    setTempRange(prev => ({ ...prev, [field]: value }));
  };

  const applyDateRange = () => {
    if (!tempRange.start || !tempRange.end) {
      setDateError(t('dashboard.filters.invalidRange'));
      return;
    }

    const startDate = new Date(tempRange.start);
    const endDate = new Date(tempRange.end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      setDateError(t('dashboard.filters.invalidRange'));
      return;
    }

    setDateError('');
    setDateRange(tempRange);
    setIsDatePickerOpen(false);
  };

  const resetDateRange = () => {
    const defaults = getDefaultDateRange();
    setTempRange(defaults);
    setDateRange(defaults);
    setDateError('');
  };

  const setDateRangeToLastMonths = (months: number) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
    const range: DateRange = { start: formatDateInput(start), end: formatDateInput(end) };
    setTempRange(range);
    setDateRange(range);
    setDateError('');
    setIsDatePickerOpen(false);
  };

  const toggleDatePicker = () => {
    setIsDatePickerOpen(prev => !prev);
    setDateError('');
    setTempRange(dateRange);
  };

  const loadDashboardData = useCallback(async () => {
    if (!canViewDashboard) {
      return;
    }
    setLoading(true);
    try {
      const data = await getAdminDashboardSummaryAPI({
        start: dateRange.start,
        end: dateRange.end,
      });

      const mrr = Number(data.mrr) || 0;
      const activeTenants = Number(data.active_tenants) || 0;
      const newSubscriptions = Number(data.new_subscriptions) || 0;
      const expiringSubscriptions = Number(data.expiring_subscriptions) || 0;

      setKpiData([
        {
          title: t('dashboard.kpi.mrr'),
          value: `$${mrr.toLocaleString(undefined, withLatinDigits())}`,
          change: "+0%",
          changeType: "increase" as const,
          icon: "cash",
          colors: {
            bg: 'bg-blue-50 dark:bg-gray-800',
            iconContainer: 'bg-blue-100 dark:bg-blue-900/50',
            icon: 'text-blue-600 dark:text-blue-400'
          }
        },
        {
          title: t('dashboard.kpi.activeTenants'),
          value: activeTenants.toString(),
          change: "+0",
          changeType: "increase" as const,
          icon: "tenants",
          colors: {
            bg: 'bg-green-50 dark:bg-gray-800',
            iconContainer: 'bg-green-100 dark:bg-green-900/50',
            icon: 'text-green-600 dark:text-green-400'
          }
        },
        {
          title: t('dashboard.kpi.newSubscriptions'),
          value: newSubscriptions.toString(),
          change: "+0",
          changeType: "increase" as const,
          icon: "trending-up",
          colors: {
            bg: 'bg-yellow-50 dark:bg-gray-800',
            iconContainer: 'bg-yellow-100 dark:bg-yellow-900/50',
            icon: 'text-yellow-600 dark:text-yellow-400'
          }
        },
        {
          title: t('dashboard.kpi.expiringSubscriptions'),
          value: expiringSubscriptions.toString(),
          change: "+0",
          changeType: "increase" as const,
          icon: "clock",
          colors: {
            bg: 'bg-indigo-50 dark:bg-gray-800',
            iconContainer: 'bg-indigo-100 dark:bg-indigo-900/50',
            icon: 'text-indigo-600 dark:text-indigo-400'
          }
        },
      ]);

      const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      setRevenueData(
        (data.revenue_by_month || []).map((row) => ({
          name: t(`dashboard.months.${monthKeys[row.month] ?? 'jan'}`),
          revenue: Number(row.revenue) || 0,
        }))
      );

      setPlanData(
        (data.plan_distribution || []).map((plan) => ({
          name: language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name,
          count: Number(plan.count) || 0,
        }))
      );

      setRecentCompanies(
        (data.recent_companies || []).map((company) => {
          const planName =
            company.plan_name == null
              ? null
              : language === 'ar' && company.plan_name_ar?.trim()
                ? company.plan_name_ar
                : company.plan_name;
          return {
            name: company.name,
            plan: planName || t('dashboard.noPlan'),
          };
        })
      );

      setRecentPayments(
        (data.recent_payments || []).map((payment) => {
          const amountUsd = Number(payment.amount_usd) || 0;
          return {
            name: payment.company_name || t('dashboard.unknown'),
            amount: `$${amountUsd.toLocaleString(undefined, withLatinDigits({ minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`,
          };
        })
      );
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewDashboard, dateRange, t, language]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const ListSkeleton: React.FC = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/4" />
        </div>
      ))}
    </div>
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 5 && hour < 12 ? t('dashboard.goodMorning') : t('dashboard.goodAfternoon');
  }, [t]);
  const userDisplayName = useMemo(() => {
    if (!user) return '';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return name || user.username || '';
  }, [user]);
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, [language]);

  const isDark = useIsDarkMode();
  const chartTheme = useMemo(() => getChartTheme(isDark), [isDark]);
  const revenueTickFormatter = useCallback(
    (value: number) => {
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
      }
      return `$${value}`;
    },
    [],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setDateRangeToLastMonths(6)}
              className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              {t('dashboard.filters.last6Months')}
            </button>
            <button
              type="button"
              onClick={() => setDateRangeToLastMonths(12)}
              className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              {t('dashboard.filters.last12Months')}
            </button>
          </div>
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={toggleDatePicker}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-gray-700/60 text-blue-600 dark:text-blue-300">
                <Icon name="calendar" className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.filters.dateRange')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{dateRangeLabel}</p>
              </div>
              <Icon name="chevronDown" className={`w-4 h-4 text-gray-500 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 space-y-4 z-50">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400" htmlFor="dashboard-filter-from">
                    {t('dashboard.filters.from')}
                  </label>
                  <FilterInput
                    id="dashboard-filter-from"
                    type="date"
                    value={tempRange.start}
                    onChange={(event) => handleTempRangeChange('start', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400" htmlFor="dashboard-filter-to">
                    {t('dashboard.filters.to')}
                  </label>
                  <FilterInput
                    id="dashboard-filter-to"
                    type="date"
                    value={tempRange.end}
                    onChange={(event) => handleTempRangeChange('end', event.target.value)}
                  />
                </div>
                {dateError && <p className="text-xs text-red-500">{dateError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetDateRange}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    {t('dashboard.filters.reset')}
                  </button>
                  <button
                    type="button"
                    onClick={applyDateRange}
                    className="flex-1 rounded-lg bg-primary-600 text-white px-3 py-2 text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('dashboard.filters.apply')}
                  </button>
                </div>
              </div>
            )}
          </div>
          <RefreshButton onClick={() => void loadDashboardData()} loading={loading} />
        </div>
      </div>

      {canViewDashboard && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-800 dark:text-gray-200">{greeting}{userDisplayName ? `, ${userDisplayName}` : ''}</span>
              <span className="mx-2">·</span>
              <span>{todayDateStr}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {canViewTenants && (
                <button
                  type="button"
                  onClick={() => navigate('/tenants')}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('sidebar.tenants')}
                </button>
              )}
              {canViewSubscriptions && (
                <button
                  type="button"
                  onClick={() => navigate('/subscriptions')}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('sidebar.subscriptions')}
                </button>
              )}
              {(isSuperAdmin() || hasPermission('can_manage_payment_gateways') || hasPermission('can_view_dashboard')) && (
                <button
                  type="button"
                  onClick={() => navigate('/payment-gateways')}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('sidebar.paymentGateways')}
                </button>
              )}
              {(isSuperAdmin() || hasPermission('can_view_reports') || hasPermission('can_view_dashboard')) && (
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('sidebar.reports')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {canViewDashboard && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{t('dashboard.sectionRevenue')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard {...kpiData[0]} loading={loading} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{t('dashboard.sectionSubscriptions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiData.slice(1, 4).map((item, index) => <KpiCard key={index} {...item} loading={loading} />)}
            </div>
          </div>
        </div>
      )}

      {(canViewPayments || canViewSubscriptions) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('dashboard.revenueGrowth.title')}</h3>
          {loading ? <Skeleton className="w-full h-[350px]" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={revenueData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} strokeOpacity={isDark ? 0.55 : 0.4} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  tick={{ fontSize: 11, fill: chartTheme.axis }}
                  dy={10}
                  stroke={chartTheme.axis}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <YAxis
                  tick={{ fontSize: 11, dx: language === 'ar' ? -5 : 0, fill: chartTheme.axis }}
                  tickFormatter={revenueTickFormatter}
                  width={language === 'ar' ? 64 : 56}
                  stroke={chartTheme.axis}
                  axisLine={{ stroke: chartTheme.grid }}
                />
                <Tooltip
                  contentStyle={chartTheme.tooltipContent}
                  labelStyle={chartTheme.tooltipLabel}
                  itemStyle={chartTheme.tooltipItem}
                  formatter={(value: number) => [`$${Number(value).toLocaleString()}`, t('dashboard.revenueGrowth.revenue')]}
                />
                <Legend content={renderChartLegend(chartTheme, language)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={t('dashboard.revenueGrowth.revenue')}
                  stroke={chartTheme.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTheme.primary, stroke: isDark ? '#1f2937' : '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          </div>
          {canViewPlans && (
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.planDistribution.title')}</h3>
              </div>
          <div className="px-6 pb-6">
            {loading ? (
              <Skeleton className="w-full h-[350px]" />
            ) : (
              <div className="w-full min-h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={planData} barCategoryGap={16} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} strokeOpacity={isDark ? 0.55 : 0.4} />
                    <XAxis
                      type="category"
                      dataKey="name"
                      textAnchor="middle"
                      height={60}
                      tick={{ fontSize: 12, fill: chartTheme.axis }}
                      interval={0}
                      dy={10}
                      stroke={chartTheme.axis}
                      axisLine={{ stroke: chartTheme.grid }}
                    />
                    <YAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, dx: language === 'ar' ? -8 : 0, fill: chartTheme.axis }}
                      width={language === 'ar' ? 40 : 36}
                      stroke={chartTheme.axis}
                      axisLine={{ stroke: chartTheme.grid }}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.08)' }}
                      contentStyle={chartTheme.tooltipContent}
                      labelStyle={chartTheme.tooltipLabel}
                      itemStyle={chartTheme.tooltipItem}
                    />
                    <Legend content={renderChartLegend(chartTheme, language)} />
                    <Bar
                      dataKey="count"
                      name={t('dashboard.planDistribution.tenants')}
                      fill={chartTheme.primary}
                      radius={[4, 4, 0, 0]}
                      barSize={48}
                      isAnimationActive
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {canViewTenants && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">{t('dashboard.recentCompanies.title')}</h3>
            {loading ? (
              <ListSkeleton />
            ) : recentCompanies.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.recentCompanies.empty')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/tenants')}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {t('dashboard.viewTenants')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentCompanies.map((company, index) => (
                  <li key={index} className="py-3 flex justify-between items-center">
                    <span className="font-medium">{company.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{company.plan}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {canViewPayments && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">{t('dashboard.recentPayments.title')}</h3>
            {loading ? (
              <ListSkeleton />
            ) : recentPayments.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.recentPayments.empty')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/subscriptions')}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {t('dashboard.viewSubscriptions')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentPayments.map((payment, index) => (
                  <li key={index} className="py-3 flex justify-between items-center">
                    <span className="font-medium">{payment.name}</span>
                    <span className="text-sm font-semibold text-green-500">{payment.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;