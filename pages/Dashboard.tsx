import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import { useI18n } from '../context/i18n';
import { getCompaniesAPI, getSubscriptionsAPI, getPaymentsAPI, getPlansAPI } from '../services/api';

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
  
  const [loading, setLoading] = useState(false);
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
  const [revenueData, setRevenueData] = useState<Array<{name: string; revenue: number; profit: number}>>([]);
  const [planData, setPlanData] = useState<Array<{name: string; count: number}>>([]);
  const [recentCompanies, setRecentCompanies] = useState<Array<{name: string; plan: string}>>([]);
  const [recentPayments, setRecentPayments] = useState<Array<{name: string; amount: string}>>([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [companiesRes, subscriptionsRes, paymentsRes, plansRes] = await Promise.all([
        getCompaniesAPI(),
        getSubscriptionsAPI(),
        getPaymentsAPI(),
        getPlansAPI()
      ]);

      const companies = companiesRes.results || [];
      const subscriptions = subscriptionsRes.results || [];
      const payments = paymentsRes.results || [];
      const plans = plansRes.results || [];

      // Calculate MRR from active subscriptions
      const activeSubscriptions = subscriptions.filter((sub: any) => sub.is_active);
      const mrr = activeSubscriptions.reduce((sum: number, sub: any) => {
        const plan = plans.find((p: any) => p.id === sub.plan);
        return sum + (plan ? parseFloat(plan.price_monthly || 0) : 0);
      }, 0);

      // Count active tenants (companies with active subscriptions)
      const activeTenants = activeSubscriptions.length;

      // New subscriptions this month
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newSubscriptions = subscriptions.filter((sub: any) => {
        const created = new Date(sub.created_at);
        return created >= thisMonth;
      }).length;

      // Expiring subscriptions (within 30 days)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSubscriptions = subscriptions.filter((sub: any) => {
        if (!sub.is_active || !sub.end_date) return false;
        const endDate = new Date(sub.end_date);
        return endDate <= thirtyDaysFromNow && endDate > now;
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

      // Calculate revenue data (last 12 months)
      const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const revenueByMonth: Array<{name: string; revenue: number; profit: number}> = [];
      
      // Create month data with translated names in order - ensure all 12 months are created
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthIndex = date.getMonth(); // 0-11
        const monthKey = monthKeys[monthIndex];
        const monthName = t(`dashboard.months.${monthKey}`);
        revenueByMonth.push({ name: monthName, revenue: 0, profit: 0 });
      }

      // Update revenue data from payments
      payments.forEach((payment: any) => {
        if (payment.payment_status === 'successful' || payment.payment_status === 'Success') {
          const paymentDate = new Date(payment.created_at);
          const monthIndex = paymentDate.getMonth();
          const monthKey = monthKeys[monthIndex];
          const monthName = t(`dashboard.months.${monthKey}`);
          const monthData = revenueByMonth.find(m => m.name === monthName);
          if (monthData) {
            monthData.revenue += parseFloat(payment.amount || 0);
            monthData.profit += parseFloat(payment.amount || 0) * 0.7; // Assume 70% profit margin
          }
        }
      });

      // Ensure we have exactly 12 months
      if (revenueByMonth.length !== 12) {
        console.warn(`Expected 12 months but got ${revenueByMonth.length}`, revenueByMonth.map(m => m.name));
      }

      // Debug: Log all months to verify
      console.log('Revenue data months:', revenueByMonth.map(m => m.name));

      setRevenueData(revenueByMonth);

      // Plan distribution
      const planCounts: {[key: string]: number} = {};
      plans.forEach((plan: any) => {
        planCounts[plan.name] = 0;
      });
      activeSubscriptions.forEach((sub: any) => {
        const plan = plans.find((p: any) => p.id === sub.plan);
        if (plan) {
          planCounts[plan.name] = (planCounts[plan.name] || 0) + 1;
        }
      });
      setPlanData(Object.entries(planCounts).map(([name, count]) => ({ name, count })));

      // Recent companies (last 5)
      const recent = companies
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((company: any) => {
          const sub = subscriptions.find((s: any) => s.company === company.id && s.is_active);
          const plan = sub ? plans.find((p: any) => p.id === sub.plan) : null;
          return {
            name: company.name,
            plan: plan ? plan.name : t('dashboard.noPlan')
          };
        });
      setRecentCompanies(recent);

      // Recent payments (last 5)
      const recentPaymentsList = payments
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
  };

  const handleRefresh = () => {
    loadDashboardData();
  };
  
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
            <input type="date" className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm"/>
            <button 
              onClick={handleRefresh}
              className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={loading}
            >
                <Icon name="refresh" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((item, index) => <KpiCard key={index} {...item} loading={loading} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">{t('dashboard.revenueGrowth.title')}</h3>
            {loading ? <Skeleton className="w-full h-[350px]" /> : (
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart 
                        data={revenueData}
                        margin={{ 
                            top: 20, 
                            right: language === 'ar' ? 20 : 30, 
                            left: language === 'ar' ? 50 : 20, 
                            bottom: language === 'ar' ? 60 : 40 
                        }}
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
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }}/>
                        <Legend 
                            wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }} 
                            formatter={(value) => ` ${value}`}
                            iconSize={12}
                        />
                        <Line type="monotone" dataKey="revenue" name={t('dashboard.revenueGrowth.revenue')} stroke="hsl(var(--color-primary-500))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                        <Line type="monotone" dataKey="profit" name={t('dashboard.revenueGrowth.profit')} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">{t('dashboard.planDistribution.title')}</h3>
             {loading ? <Skeleton className="w-full h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={planData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'rgba(107, 114, 128, 0.1)'}} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }}/>
                        <Legend 
                            wrapperStyle={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '10px' }} 
                            formatter={(value) => ` ${value}`}
                            iconSize={12}
                        />
                        <Bar dataKey="count" name={t('dashboard.planDistribution.tenants')} fill="hsl(var(--color-primary-500))" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
             )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
      </div>
    </div>
  );
};

export default Dashboard;