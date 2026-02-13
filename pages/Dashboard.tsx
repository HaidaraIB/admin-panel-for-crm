import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import { useI18n } from '../context/i18n';
import { useUser } from '../context/UserContext';
import { getCompaniesAPI, getSubscriptionsAPI, getPaymentsAPI, getPlansAPI } from '../services/api';

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

const buildMonthSequence = (range: DateRange): Date[] => {
  const fallbackSequence = () => {
    const fallbackEnd = new Date();
    const fallbackStart = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth() - 11, 1);
    const seq: Date[] = [];
    const cursor = new Date(fallbackStart);
    while (cursor <= fallbackEnd) {
      seq.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return seq;
  };

  const start = new Date(range.start);
  const end = new Date(range.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return fallbackSequence();
  }

  const normalizedStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  const sequence: Date[] = [];
  const cursor = new Date(normalizedStart);
  let guard = 0;

  while (cursor <= normalizedEnd && guard < 60) {
    sequence.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }

  if (sequence.length === 0) {
    return fallbackSequence();
  }

  return sequence.length > 12 ? sequence.slice(sequence.length - 12) : sequence;
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
  const { t, language } = useI18n();
  const { hasPermission, isSuperAdmin } = useUser();

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
      const formatter = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
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

  const toggleDatePicker = () => {
    setIsDatePickerOpen(prev => !prev);
    setDateError('');
    setTempRange(dateRange);
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Only fetch data if user has permission
      const promises: Promise<any>[] = [];
      if (canViewTenants) promises.push(getCompaniesAPI());
      else promises.push(Promise.resolve({ results: [] }));
      
      if (canViewSubscriptions) promises.push(getSubscriptionsAPI());
      else promises.push(Promise.resolve({ results: [] }));
      
      if (canViewPayments) promises.push(getPaymentsAPI());
      else promises.push(Promise.resolve({ results: [] }));
      
      if (canViewPlans) promises.push(getPlansAPI());
      else promises.push(Promise.resolve({ results: [] }));

      const [companiesRes, subscriptionsRes, paymentsRes, plansRes] = await Promise.all(promises);

      const companies = companiesRes.results || [];
      const subscriptions = subscriptionsRes.results || [];
      const payments = paymentsRes.results || [];
      const plans = plansRes.results || [];

      const rangeStart = new Date(dateRange.start);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(dateRange.end);
      rangeEnd.setHours(23, 59, 59, 999);

      const isWithinSelectedRange = (value?: string | null) => {
        if (!value) return false;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        return date >= rangeStart && date <= rangeEnd;
      };

      // Filter data based on date range
      const filteredCompanies = companies.filter((company: any) => isWithinSelectedRange(company.created_at));
      const filteredSubscriptions = subscriptions.filter((sub: any) => isWithinSelectedRange(sub.created_at));
      const filteredPayments = payments.filter((payment: any) => isWithinSelectedRange(payment.created_at));
      
      // Get ALL currently active subscriptions (not filtered by date range for MRR and active tenants)
      // MRR and Active Tenants should reflect current state, not historical state
      const allActiveSubscriptions = subscriptions.filter((sub: any) => sub.is_active);
      
      // Calculate MRR from ALL currently active subscriptions (current state)
      const mrr = allActiveSubscriptions.reduce((sum: number, sub: any) => {
        const plan = plans.find((p: any) => p.id === sub.plan);
        return sum + (plan ? parseFloat(plan.price_monthly || 0) : 0);
      }, 0);

      // Count ALL active tenants (current state)
      const activeTenants = allActiveSubscriptions.length;

      // New subscriptions created within the selected range (last 30 days from end date)
      const endDate = new Date(dateRange.end);
      const thirtyDaysAgo = new Date(endDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newSubscriptions = subscriptions.filter((sub: any) => {
        if (!sub.created_at) return false;
        const createdDate = new Date(sub.created_at);
        return createdDate >= thirtyDaysAgo && createdDate <= endDate;
      }).length;

      // Expiring subscriptions - subscriptions that will expire within the next 7 days from today
      // (not based on date range, but based on current date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const expiringSubscriptions = subscriptions.filter((sub: any) => {
        if (!sub.is_active || !sub.end_date) return false;
        const endDate = new Date(sub.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today && endDate <= sevenDaysFromNow;
      }).length;

      // Update KPIs
      setKpiData([
        {
          title: t('dashboard.kpi.mrr'),
          value: `$${mrr.toLocaleString()}`,
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

      // Calculate revenue data for the selected range
      const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthSequence = buildMonthSequence(dateRange);
      const revenueByMonth = monthSequence.map(date => {
        const monthIndex = date.getMonth();
        const monthKey = monthKeys[monthIndex];
        return {
          name: t(`dashboard.months.${monthKey}`),
          key: `${date.getFullYear()}-${monthIndex}`,
          revenue: 0,
        };
      });

      filteredPayments.forEach((payment: any) => {
        // Backend PaymentStatus enum values: 'completed', 'pending', 'failed', 'canceled'
        const paymentStatus = payment.payment_status?.toLowerCase() || '';
        if (paymentStatus === 'completed' || paymentStatus === 'successful' || paymentStatus === 'success') {
          const paymentDate = new Date(payment.created_at);
          const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
          const monthData = revenueByMonth.find(m => m.key === key);
          if (monthData) {
            const amount = parseFloat(payment.amount || 0);
            monthData.revenue += amount;
          }
        }
      });

      setRevenueData(revenueByMonth.map(({ key, ...rest }) => rest));

      // Plan distribution - count companies (not subscriptions) by their active plan
      // Each company should be counted only once, based on their current active subscription
      const planCounts: { [key: string]: number } = {};
      const companyPlanMap: { [companyId: number]: string } = {};
      
      // First, initialize all plans with 0
      plans.forEach((plan: any) => {
        const planName = language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name;
        planCounts[planName] = 0;
      });
      
      // Map each company to its active plan
      allActiveSubscriptions.forEach((sub: any) => {
        if (sub.company && !companyPlanMap[sub.company]) {
          const plan = plans.find((p: any) => p.id === sub.plan);
          if (plan) {
            const planName = language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name;
            companyPlanMap[sub.company] = planName;
          }
        }
      });
      
      // Count companies by plan
      Object.values(companyPlanMap).forEach((planName) => {
        if (planCounts.hasOwnProperty(planName)) {
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        }
      });
      
      setPlanData(Object.entries(planCounts).map(([name, count]) => ({ name, count })));

      // Recent companies (last 5) - show ALL companies, not filtered by date range
      const recent = companies
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((company: any) => {
          const sub = subscriptions.find((s: any) => s.company === company.id && s.is_active);
          const plan = sub ? plans.find((p: any) => p.id === sub.plan) : null;
          const planName = plan ? (language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name) : null;
          return {
            name: company.name,
            plan: planName || t('dashboard.noPlan')
          };
        });
      setRecentCompanies(recent);

      // Recent payments (last 5) - show ALL completed payments, not filtered by date range
      const recentPaymentsList = payments
        .filter((payment: any) => {
          const paymentStatus = payment.payment_status?.toLowerCase() || '';
          return paymentStatus === 'completed' || paymentStatus === 'successful' || paymentStatus === 'success';
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((payment: any) => ({
          name: payment.subscription_company_name || t('dashboard.unknown'),
          amount: `$${parseFloat(payment.amount || 0).toFixed(2)}`
        }));
      setRecentPayments(recentPaymentsList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, t, language, hasPermission, isSuperAdmin]);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2">
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
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">{t('dashboard.filters.from')}</label>
                  <input
                    type="date"
                    value={tempRange.start}
                    onChange={(event) => handleTempRangeChange('start', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">{t('dashboard.filters.to')}</label>
                  <input
                    type="date"
                    value={tempRange.end}
                    onChange={(event) => handleTempRangeChange('end', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
        </div>
      </div>

      {canViewDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((item, index) => <KpiCard key={index} {...item} loading={loading} />)}
        </div>
      )}

      {(canViewPayments || canViewSubscriptions) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">{t('dashboard.revenueGrowth.title')}</h3>
          {loading ? <Skeleton className="w-full h-[350px]" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={revenueData}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  tick={{ fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, dx: language === 'ar' ? -5 : 0 }}
                  width={language === 'ar' ? 60 : 50}
                />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }} />
                <Legend
                  wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }}
                  formatter={(value) => ` ${value}`}
                  iconSize={12}
                />
                <Line type="monotone" dataKey="revenue" name={t('dashboard.revenueGrowth.revenue')} stroke="hsl(var(--color-primary-500))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          </div>
          {canViewPlans && (
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold">{t('dashboard.planDistribution.title')}</h3>
              </div>
          <div className="px-6 pb-6">
            {loading ? (
              <Skeleton className="w-full h-[350px]" />
            ) : (
              <div className="w-full min-h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={planData}
                    barCategoryGap={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis
                      type="category"
                      dataKey="name"
                      textAnchor={language === 'ar' ? 'middle' : 'end'}
                      height={60}
                      tick={{ fontSize: 12 }}
                      interval={0}
                      dy={10}
                      dx={language === 'ar' ? 0 : 12}
                    />
                    <YAxis
                      type="number"
                      tick={{ fontSize: 12, dx: language === 'ar' ? -25 : 0 }}
                      width={language === 'ar' ? 50 : 50}
                    />
                    <Tooltip cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }} />
                    <Legend
                      wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }}
                      formatter={(value) => ` ${value}`}
                      iconSize={12}
                    />
                    <Bar dataKey="count" name={t('dashboard.planDistribution.tenants')} fill="hsl(var(--color-primary-500))" barSize={56} />
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
          {loading ? <ListSkeleton /> : (
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
          {loading ? <ListSkeleton /> : (
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