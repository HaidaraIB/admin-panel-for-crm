
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Icon from '../components/Icon';
import { useI18n } from '../context/i18n';
import { getPaymentsAPI, getSubscriptionsAPI, getCompaniesAPI } from '../services/api';
import Skeleton from '../components/Skeleton';
import ReportsFilterDrawer, { ReportsFilters, reportsFilterDefaults } from '../components/ReportsFilterDrawer';

const COLORS = ['#3b82f6', '#ef4444'];

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
    const formatter = new Intl.DateTimeFormat(formatterLocale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

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


const RevenueReports: React.FC<{ filters: ReportsFilters }> = ({ filters }) => {
    const { t, language } = useI18n();
    const [mrrData, setMrrData] = useState<Array<{month: string; MRR: number; ARR: number}>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRevenueData();
    }, [language, t, filters]);

    const loadRevenueData = async () => {
        setIsLoading(true);
        try {
            const paymentsRes = await getPaymentsAPI();
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

            payments.forEach((payment: any) => {
                const isSuccessful = payment.payment_status === 'successful' || payment.payment_status === 'Success';
                if (!isSuccessful || !isWithinRange(payment.created_at)) {
                    return;
                }

                const paymentDate = new Date(payment.created_at);
                const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
                const monthData = revenueByMonth.find((m) => m.key === key);
                if (monthData) {
                    const amount = parseFloat(payment.amount || 0);
                    monthData.MRR += amount;
                    monthData.ARR += amount * 12; // Annualized
                }
            });

            setMrrData(revenueByMonth.map(({ key, ...rest }) => rest));
        } catch (error) {
            console.error('Error loading revenue data:', error);
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

    return (
    <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h2 className="text-2xl font-semibold">{t('reports.revenue.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatRangeLabel(filters, language, t)}
                </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleExport} 
                    className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center justify-center w-full sm:w-auto"
                    disabled={isLoading}
                >
                    <Icon name="pdf" className="w-5 h-5 mx-2"/> {t('reports.revenue.export')}
                </button>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
             <h3 className="text-lg font-semibold mb-4">{t('reports.revenue.chartTitle')}</h3>
             {isLoading ? (
                 <Skeleton className="w-full h-[300px]" />
             ) : (
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mrrData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                    <XAxis 
                        dataKey="month" 
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
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }}/>
                        <Legend 
                            wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }} 
                            formatter={(value) => ` ${value}`}
                            iconSize={12}
                        />
                        <Bar dataKey="MRR" fill="#3b82f6" name={t('reports.revenue.mrr')} />
                        <Bar dataKey="ARR" fill="#818cf8" name={t('reports.revenue.arr')} />
                </BarChart>
            </ResponsiveContainer>
             )}
        </div>
    </div>
)};


const SubscriberReports: React.FC<{ filters: ReportsFilters }> = ({ filters }) => {
    const { t, language } = useI18n();
    const [subscriberData, setSubscriberData] = useState<Array<{month: string; new: number; churned: number}>>([]);
    const [conversionData, setConversionData] = useState<Array<{name: string; value: number}>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSubscriberData();
    }, [language, t, filters]);

    const loadSubscriberData = async () => {
        setIsLoading(true);
        try {
            const [subscriptionsRes, companiesRes] = await Promise.all([
                getSubscriptionsAPI(),
                getCompaniesAPI()
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

            subscriptions.forEach((sub: any) => {
                if (isWithinRange(sub.created_at)) {
                    const createdDate = new Date(sub.created_at);
                    const key = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
                    const monthData = subscriberByMonth.find((m) => m.key === key);
                    if (monthData) {
                        monthData.new += 1;
                    }
                }

                if (!sub.is_active && sub.end_date && isWithinRange(sub.end_date)) {
                    const endDate = new Date(sub.end_date);
                    if (endDate < now) {
                        const key = `${endDate.getFullYear()}-${endDate.getMonth()}`;
                        const endMonthData = subscriberByMonth.find((m) => m.key === key);
                        if (endMonthData) {
                            endMonthData.churned += 1;
                        }
                    }
                }
            });

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
                <h2 className="text-2xl font-semibold">{t('reports.subscribers.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatRangeLabel(filters, language, t)}
                </p>
            </div>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleExport} 
                    className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center justify-center w-full sm:w-auto"
                    disabled={isLoading}
                >
                    <Icon name="pdf" className="w-5 h-5 mx-2"/> {t('reports.revenue.export')}
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-semibold mb-4">{t('reports.subscribers.chart1Title')}</h3>
                 {isLoading ? (
                     <Skeleton className="w-full h-[300px]" />
                 ) : (
                 <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={subscriberData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
                            <XAxis 
                                dataKey="month" 
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
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }}/>
                            <Legend 
                                wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }} 
                                formatter={(value) => ` ${value}`}
                                iconSize={12}
                            />
                            <Line type="monotone" dataKey="new" name={t('reports.subscribers.new')} stroke="#10b981" />
                            <Line type="monotone" dataKey="churned" name={t('reports.subscribers.churned')} stroke="#ef4444" />
                        </LineChart>
                </ResponsiveContainer>
                 )}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-semibold mb-4">{t('reports.subscribers.chart2Title')}</h3>
                 {isLoading ? (
                     <Skeleton className="w-full h-[300px]" />
                 ) : (
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={conversionData} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false} 
                                outerRadius={80} 
                                fill="#8884d8" 
                                dataKey="value" 
                                label={false}
                            >
                                {conversionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }}/>
                             <Legend 
                                wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }} 
                                formatter={(value) => ` ${value}`}
                                iconSize={12}
                            />
                        </PieChart>
                     </ResponsiveContainer>
                 )}
            </div>
        </div>
    </div>
)};


const Reports: React.FC = () => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState('revenue');
  const [filters, setFilters] = useState<ReportsFilters>(reportsFilterDefaults);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const tabs = [
    { id: 'revenue', label: t('reports.tabs.revenue') },
    { id: 'subscribers', label: t('reports.tabs.subscribers') },
  ];

  const hasActiveFilters = useMemo(
    () => filters.fromDate !== '' || filters.toDate !== '',
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
        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
            type="button"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
              <Icon name="filter" className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('reports.filters.open')}
            </span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </button>
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {activeTab === 'revenue' && <RevenueReports filters={filters} />}
      {activeTab === 'subscribers' && <SubscriberReports filters={filters} />}

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
