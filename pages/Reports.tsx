
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Icon from '../components/Icon';
import FilterButton from '../components/FilterButton';
import RefreshButton from '../components/RefreshButton';
import { useI18n } from '../context/i18n';
import {
  getAllPaymentsAPI,
  getAllSubscriptionsAPI,
  getAllCompaniesAPI,
  isSuccessfulPayment,
} from '../services/api';
import Skeleton from '../components/Skeleton';
import ReportsFilterDrawer, { ReportsFilters, reportsFilterDefaults } from '../components/ReportsFilterDrawer';
import { hasActiveFilters as filtersAreActive } from '../components/filters';
import { ADMIN_PAGE_TAB_ACTIVE, ADMIN_PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { withLatinDigits } from '../utils/latinNumerals';
import { getChartTheme, renderChartLegend, useIsDarkMode } from '../utils/chartTheme';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const parseDateValue = (value?: string) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const buildMonthSequence = (filters: ReportsFilters): Date[] => {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const startDate = parseDateValue(filters.fromDate) ?? defaultStart;
    const endDate = parseDateValue(filters.toDate) ?? defaultEnd;

    const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    if (normalizedStart > normalizedEnd) {
        return [normalizedStart];
    }

    const sequence: Date[] = [];
    const cursor = new Date(normalizedStart);
    let guard = 0;

    while (cursor <= normalizedEnd && guard < 60) {
        sequence.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
        guard += 1;
    }

    if (sequence.length === 0) {
        sequence.push(new Date(normalizedEnd));
    }

    return sequence.length > 12 ? sequence.slice(sequence.length - 12) : sequence;
};

const getRangeBounds = (filters: ReportsFilters) => {
    const start = parseDateValue(filters.fromDate);
    if (start) {
        start.setHours(0, 0, 0, 0);
    }
    const end = parseDateValue(filters.toDate);
    if (end) {
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};

const formatRangeLabel = (filters: ReportsFilters, language: string, t: (key: string) => string) => {
    const formatterLocale = language === 'ar' ? 'ar-EG' : 'en-US';
    const formatter = new Intl.DateTimeFormat(formatterLocale, withLatinDigits({
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }));

    const start = parseDateValue(filters.fromDate);
    const end = parseDateValue(filters.toDate);

    if (start && end) {
        return `${formatter.format(start)} - ${formatter.format(end)}`;
    }

    if (start) {
        return `${t('reports.filter.from')} ${formatter.format(start)}`;
    }

    if (end) {
        return `${t('reports.filter.to')} ${formatter.format(end)}`;
    }

    return t('reports.filters.allTime');
};

const SummaryCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-3">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
  </div>
);

const RevenueReports: React.FC<{
  filters: ReportsFilters;
  refreshNonce?: number;
  onLoadingChange?: (loading: boolean) => void;
}> = ({ filters, refreshNonce = 0, onLoadingChange }) => {
    const { t, language } = useI18n();
    const isDark = useIsDarkMode();
    const chartTheme = useMemo(() => getChartTheme(isDark), [isDark]);
    const [mrrData, setMrrData] = useState<Array<{month: string; MRR: number; ARR: number}>>([]);
    const [summary, setSummary] = useState({ totalMrr: 0, paymentCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        loadRevenueData();
    }, [language, t, filters, refreshNonce]);

    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

    const loadRevenueData = async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const paymentsRes = await getAllPaymentsAPI();
            const payments = paymentsRes.results || [];

            const monthSequence = buildMonthSequence(filters);
            const revenueByMonth = monthSequence.map(date => {
                const monthIndex = date.getMonth();
                const monthKey = MONTH_KEYS[monthIndex];
                const monthName = t(`dashboard.months.${monthKey}`);
                return {
                    key: `${date.getFullYear()}-${monthIndex}`,
                    month: monthName,
                    MRR: 0,
                    ARR: 0,
                };
            });

            const { start: rangeStart, end: rangeEnd } = getRangeBounds(filters);
            const isWithinRange = (value?: string | null) => {
                if (!value) {
                    return true;
                }
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                    return true;
                }
                if (rangeStart && date < rangeStart) {
                    return false;
                }
                if (rangeEnd && date > rangeEnd) {
                    return false;
                }
                return true;
            };

            let totalMrr = 0;
            let paymentCount = 0;

            payments.forEach((payment: any) => {
                if (!isSuccessfulPayment(payment.payment_status) || !isWithinRange(payment.created_at)) {
                    return;
                }

                paymentCount += 1;
                const paymentDate = new Date(payment.created_at);
                const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
                const monthData = revenueByMonth.find((m) => m.key === key);
                const amount = payment.amount_usd != null ? parseFloat(String(payment.amount_usd)) : parseFloat(String(payment.amount || 0));
                totalMrr += amount;
                if (monthData) {
                    monthData.MRR += amount;
                    monthData.ARR += amount * 12;
                }
            });

            setSummary({ totalMrr, paymentCount });
            setMrrData(revenueByMonth.map(({ key, ...rest }) => rest));
        } catch (error) {
            console.error('Error loading revenue data:', error);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        const csvContent = [
            ['Month', 'MRR', 'ARR'],
            ...mrrData.map(d => [d.month, d.MRR.toString(), d.ARR.toString()])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'revenue-report.csv';
        link.click();
    };

    const currencyFormatter = useMemo(
      () =>
        new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits({
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        })),
      [language],
    );

    return (
    <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('reports.revenue.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatRangeLabel(filters, language, t)}
                </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleExport} 
                    className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center w-full sm:w-auto text-gray-900 dark:text-white"
                    disabled={isLoading || mrrData.length === 0}
                >
                    <Icon name="pdf" className="w-5 h-5 mx-2"/> {t('reports.revenue.export')}
                </button>
            </div>
        </div>

        {!isLoading && !loadError ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard label={t('reports.revenue.mrr')} value={currencyFormatter.format(summary.totalMrr)} />
            <SummaryCard label={t('reports.revenue.successfulPayments')} value={summary.paymentCount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits())} />
          </div>
        ) : null}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
             <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.revenue.chartTitle')}</h3>
             {isLoading ? (
                 <Skeleton className="w-full h-[300px]" />
             ) : loadError ? (
                 <p className="text-sm text-red-500 dark:text-red-400 py-12 text-center">{t('reports.loadError')}</p>
             ) : (
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mrrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} strokeOpacity={0.3} />
                    <XAxis 
                        dataKey="month" 
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
                        width={language === 'ar' ? 60 : 50}
                        stroke={chartTheme.axis}
                        axisLine={{ stroke: chartTheme.grid }}
                    />
                    <Tooltip contentStyle={chartTheme.tooltipContent} labelStyle={chartTheme.tooltipLabel} itemStyle={chartTheme.tooltipItem} />
                    <Legend content={renderChartLegend(chartTheme, language)} />
                    <Bar dataKey="MRR" fill={chartTheme.primary} name={t('reports.revenue.mrr')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ARR" fill={chartTheme.primaryLight} name={t('reports.revenue.arr')} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
             )}
        </div>
    </div>
)};


const SubscriberReports: React.FC<{
  filters: ReportsFilters;
  refreshNonce?: number;
  onLoadingChange?: (loading: boolean) => void;
}> = ({ filters, refreshNonce = 0, onLoadingChange }) => {
    const { t, language } = useI18n();
    const isDark = useIsDarkMode();
    const chartTheme = useMemo(() => getChartTheme(isDark), [isDark]);
    const [subscriberData, setSubscriberData] = useState<Array<{month: string; new: number; churned: number}>>([]);
    const [conversionData, setConversionData] = useState<Array<{name: string; value: number}>>([]);
    const [summary, setSummary] = useState({ totalNew: 0, totalChurned: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        loadSubscriberData();
    }, [language, t, filters, refreshNonce]);

    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

    const loadSubscriberData = async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const [subscriptionsRes, companiesRes] = await Promise.all([
                getAllSubscriptionsAPI(),
                getAllCompaniesAPI(),
            ]);

            const subscriptions = subscriptionsRes.results || [];
            const companies = companiesRes.results || [];

            const monthSequence = buildMonthSequence(filters);
            const subscriberByMonth = monthSequence.map(date => {
                const monthIndex = date.getMonth();
                const monthKey = MONTH_KEYS[monthIndex];
                const monthName = t(`dashboard.months.${monthKey}`);
                return {
                    key: `${date.getFullYear()}-${monthIndex}`,
                    month: monthName,
                    new: 0,
                    churned: 0,
                };
            });

            const { start: rangeStart, end: rangeEnd } = getRangeBounds(filters);
            const isWithinRange = (value?: string | null) => {
                if (!value) {
                    return true;
                }
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                    return true;
                }
                if (rangeStart && date < rangeStart) {
                    return false;
                }
                if (rangeEnd && date > rangeEnd) {
                    return false;
                }
                return true;
            };

            const now = new Date();
            let totalNew = 0;
            let totalChurned = 0;

            subscriptions.forEach((sub: any) => {
                if (isWithinRange(sub.created_at)) {
                    const createdDate = new Date(sub.created_at);
                    const key = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
                    const monthData = subscriberByMonth.find((m) => m.key === key);
                    if (monthData) {
                        monthData.new += 1;
                    }
                    totalNew += 1;
                }

                if (!sub.is_active && sub.end_date && isWithinRange(sub.end_date)) {
                    const endDate = new Date(sub.end_date);
                    if (endDate < now) {
                        const key = `${endDate.getFullYear()}-${endDate.getMonth()}`;
                        const endMonthData = subscriberByMonth.find((m) => m.key === key);
                        if (endMonthData) {
                            endMonthData.churned += 1;
                        }
                        totalChurned += 1;
                    }
                }
            });

            setSummary({ totalNew, totalChurned });
            setSubscriberData(subscriberByMonth.map(({ key, ...rest }) => rest));

            const filteredSubscriptions = subscriptions.filter((sub: any) => isWithinRange(sub.created_at));
            const filteredCompanies = companies.filter((company: any) => isWithinRange(company.created_at));
            const activeSubscriptions = filteredSubscriptions.filter((sub: any) => sub.is_active).length;

            const shouldUseFilteredCompanies = (filters.fromDate || filters.toDate) && filteredCompanies.length > 0;
            const totalCompanies = shouldUseFilteredCompanies ? filteredCompanies.length : companies.length;
            const converted = activeSubscriptions;
            const notConverted = Math.max(0, totalCompanies - converted);

            setConversionData([
                { name: t('reports.subscribers.converted'), value: converted },
                { name: t('reports.subscribers.notConverted'), value: notConverted }
            ]);
        } catch (error) {
            console.error('Error loading subscriber data:', error);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        const csvContent = [
            ['Month', 'New', 'Churned'],
            ...subscriberData.map(d => [d.month, d.new.toString(), d.churned.toString()])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'subscriber-report.csv';
        link.click();
    };

    return (
     <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('reports.subscribers.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatRangeLabel(filters, language, t)}
                </p>
            </div>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleExport} 
                    className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center w-full sm:w-auto text-gray-900 dark:text-white"
                    disabled={isLoading || subscriberData.length === 0}
                >
                    <Icon name="pdf" className="w-5 h-5 mx-2"/> {t('reports.revenue.export')}
                </button>
            </div>
        </div>

        {!isLoading && !loadError ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard label={t('reports.subscribers.new')} value={summary.totalNew.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits())} />
            <SummaryCard label={t('reports.subscribers.churned')} value={summary.totalChurned.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', withLatinDigits())} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.subscribers.chart1Title')}</h3>
                 {isLoading ? (
                     <Skeleton className="w-full h-[300px]" />
                 ) : loadError ? (
                     <p className="text-sm text-red-500 dark:text-red-400 py-12 text-center">{t('reports.loadError')}</p>
                 ) : (
                 <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={subscriberData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} strokeOpacity={0.3} />
                            <XAxis 
                                dataKey="month" 
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
                                width={language === 'ar' ? 60 : 50}
                                stroke={chartTheme.axis}
                                axisLine={{ stroke: chartTheme.grid }}
                            />
                            <Tooltip contentStyle={chartTheme.tooltipContent} labelStyle={chartTheme.tooltipLabel} itemStyle={chartTheme.tooltipItem} />
                            <Legend content={renderChartLegend(chartTheme, language)} />
                            <Line type="monotone" dataKey="new" name={t('reports.subscribers.new')} stroke={chartTheme.primary} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="churned" name={t('reports.subscribers.churned')} stroke={chartTheme.muted} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                </ResponsiveContainer>
                 )}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('reports.subscribers.chart2Title')}</h3>
                 {isLoading ? (
                     <Skeleton className="w-full h-[300px]" />
                 ) : loadError ? (
                     <p className="text-sm text-red-500 dark:text-red-400 py-12 text-center">{t('reports.loadError')}</p>
                 ) : (
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={conversionData} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false} 
                                outerRadius={80} 
                                fill={chartTheme.primary} 
                                dataKey="value" 
                                label={false}
                            >
                                {conversionData.map((entry, index) => (
                                    <Cell key={`cell-${entry.name}`} fill={index === 0 ? chartTheme.primary : chartTheme.muted} />
                                ))}
                            </Pie>
                             <Tooltip contentStyle={chartTheme.tooltipContent} labelStyle={chartTheme.tooltipLabel} itemStyle={chartTheme.tooltipItem} />
                             <Legend content={renderChartLegend(chartTheme, language)} />
                        </PieChart>
                     </ResponsiveContainer>
                 )}
            </div>
        </div>
    </div>
)};


const Reports: React.FC = () => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('reports_activeTab') || 'revenue';
  });
  
  useEffect(() => {
    localStorage.setItem('reports_activeTab', activeTab);
  }, [activeTab]);
  const [filters, setFilters] = useState<ReportsFilters>(reportsFilterDefaults);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);

  const tabs = [
    { id: 'revenue', label: t('reports.tabs.revenue') },
    { id: 'subscribers', label: t('reports.tabs.subscribers') },
  ];

  const filtersActive = useMemo(
    () => filtersAreActive(filters, reportsFilterDefaults),
    [filters]
  );

  const rangeLabel = useMemo(
    () => formatRangeLabel(filters, language, t),
    [filters, language, t]
  );

  const handleApplyFilters = (nextFilters: ReportsFilters) => {
    setFilters(nextFilters);
    setIsFilterDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setFilters(reportsFilterDefaults);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('reports.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <FilterButton
            onClick={() => setIsFilterDrawerOpen(true)}
            hasActiveFilters={filtersActive}
          >
            {t('reports.filters.open')}
          </FilterButton>
          <RefreshButton
            onClick={() => setRefreshNonce((n) => n + 1)}
            loading={tabLoading}
          />
        </div>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-8" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? ADMIN_PAGE_TAB_ACTIVE
                  : ADMIN_PAGE_TAB_INACTIVE
              } whitespace-nowrap py-4 px-1 text-sm transition-colors`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {activeTab === 'revenue' && (
        <RevenueReports
          filters={filters}
          refreshNonce={refreshNonce}
          onLoadingChange={setTabLoading}
        />
      )}
      {activeTab === 'subscribers' && (
        <SubscriberReports
          filters={filters}
          refreshNonce={refreshNonce}
          onLoadingChange={setTabLoading}
        />
      )}

      <ReportsFilterDrawer
        isOpen={isFilterDrawerOpen}
        filters={filters}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
};

export default Reports;
