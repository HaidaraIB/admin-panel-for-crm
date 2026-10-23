import React from 'react';
import type { Plan } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';
import IconButton from './IconButton';
import Toggle from './Toggle';
import { Badge } from './telephony/shared';
import { discountPercent, formatUsd, planBadgeLabel } from '../utils/planOffer';
import { formatDateTimeShort } from '../utils/datetime';

interface PlanAdminCardProps {
  plan: Plan;
  isDeletable: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

const SALE_TONE = { live: 'green', scheduled: 'blue', ended: 'gray', none: 'gray' } as const;

/** One cycle's price line: struck regular price + charged price + discount pill while on sale. */
const PriceLine: React.FC<{
  regular: number;
  sale: number | null | undefined;
  saleLive: boolean;
  period: string;
  size: 'lg' | 'sm';
  language: string;
}> = ({ regular, sale, saleLive, period, size, language }) => {
  const pct = saleLive ? discountPercent(regular, sale) : 0;
  const charged = pct > 0 ? Number(sale) : regular;
  const pill = pct > 0 && (
    <span className="inline-flex shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 ring-1 ring-inset ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
      <span dir="ltr">−{pct}%</span>
    </span>
  );
  const struck = pct > 0 && (
    <del dir="ltr" className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium text-gray-400 dark:text-gray-500`}>
      {formatUsd(regular, language)}
    </del>
  );
  const amount = (
    <span className="inline-flex items-baseline gap-x-1 whitespace-nowrap">
      <span
        dir="ltr"
        className={`${size === 'lg' ? 'text-3xl font-extrabold' : 'text-base font-bold'} tracking-tight text-gray-900 dark:text-white`}
      >
        {formatUsd(charged, language)}
      </span>
      <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} text-gray-500 dark:text-gray-400`}>/{period}</span>
    </span>
  );
  if (size === 'lg') {
    // Big line: struck price + pill share the top row so the amount never collides with the pill.
    return (
      <div>
        {pct > 0 && <div className="mb-0.5 flex items-center justify-between gap-2">{struck}{pill}</div>}
        {amount}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-baseline gap-x-2">{struck}{amount}</span>
      {pill}
    </div>
  );
};

const Stat: React.FC<{ icon: string; value: React.ReactNode; label: string }> = ({ icon, value, label }) => (
  <div className="min-w-0 rounded-lg bg-gray-50 px-2.5 py-2 text-center dark:bg-gray-900/40">
    <Icon name={icon} className="mx-auto mb-1 h-4 w-4 text-primary-600 dark:text-primary-400" />
    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

/** Super Admin plan card: what the plan costs now, how it is marketed, and who is on it. */
const PlanAdminCard: React.FC<PlanAdminCardProps> = ({ plan, isDeletable, onView, onEdit, onDelete, onToggleVisibility }) => {
  const { t, language } = useI18n();
  const isAr = language === 'ar';
  const name = (isAr && plan.nameAr?.trim()) || plan.name;
  const description = (isAr && plan.featuresAr?.trim()) || plan.features;
  const badgeLabel = planBadgeLabel(plan, language, t);
  const saleStatus = plan.saleStatus ?? 'none';
  const saleLive = saleStatus === 'live';
  const note = isAr ? plan.offerNoteAr || plan.offerNote : plan.offerNote || plan.offerNoteAr;
  const unlimited = t('subscriptions.plans.unlimited');
  const fmtLimit = (v: number | 'unlimited') => (v === 'unlimited' ? unlimited : <span dir="ltr">{v}</span>);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-gray-800 ${
        plan.isFeatured ? 'border-primary-300 dark:border-primary-700' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Accent: featured plans get the brand gradient; hidden plans fade. */}
      <div
        aria-hidden="true"
        className={`h-1.5 w-full ${
          plan.isFeatured ? 'bg-gradient-to-r from-primary-500 via-fuchsia-500 to-rose-500' : 'bg-primary-500/70'
        } ${plan.visible ? '' : 'opacity-30'}`}
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-gray-900 dark:text-white" title={name}>
              {name}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t(`subscriptions.plans.type.${plan.type}`)}</span>
              <span aria-hidden="true">·</span>
              <span>{t('subscriptions.plans.card.tier').replace('{n}', String(plan.tier ?? 0))}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t(plan.subscriptionCount === 1 ? 'subscriptions.plans.card.subscriber' : 'subscriptions.plans.card.subscribers').replace('{n}', String(plan.subscriptionCount ?? 0))}
              </span>
              {!plan.visible && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{t('subscriptions.plans.card.hidden')}</span>
                </>
              )}
            </p>
          </div>
          {plan.isFeatured && (
            <span
              title={t('subscriptions.plans.card.featured')}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
            >
              <Icon name="star" className="h-3.5 w-3.5" />
              {t('subscriptions.plans.card.featuredShort')}
            </span>
          )}
        </header>

        {(badgeLabel || saleStatus !== 'none') && (
          <div className="flex flex-wrap items-center gap-1.5">
            {badgeLabel && <Badge tone="amber">{badgeLabel}</Badge>}
            {saleStatus !== 'none' && (
              <Badge tone={SALE_TONE[saleStatus]}>
                {t(`subscriptions.plans.sale.status.${saleStatus}`)}
                {saleLive && plan.saleEndsAt && (
                  <span className="opacity-80"> · {formatDateTimeShort(plan.saleEndsAt, language)}</span>
                )}
                {saleStatus === 'scheduled' && plan.saleStartsAt && (
                  <span className="opacity-80"> · {formatDateTimeShort(plan.saleStartsAt, language)}</span>
                )}
              </Badge>
            )}
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700/60 dark:bg-gray-900/40">
          {plan.type === 'Paid' ? (
            <div className="space-y-3">
              <PriceLine regular={plan.priceMonthly} sale={plan.salePriceMonthly} saleLive={saleLive}
                period={t('common.month')} size="lg" language={language} />
              <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                <PriceLine regular={plan.priceYearly} sale={plan.salePriceYearly} saleLive={saleLive}
                  period={t('common.year')} size="sm" language={language} />
              </div>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              {plan.type === 'Trial' && plan.trialDays > 0 ? (
                <>
                  <span dir="ltr" className="text-3xl font-extrabold text-gray-900 dark:text-white">{plan.trialDays}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('subscriptions.plans.card.trialDaysFree')}</span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('subscriptions.plans.card.freeForever')}</span>
              )}
            </div>
          )}
        </div>

        {note && (
          <p className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white" aria-hidden="true">
              <Icon name="gift" className="h-3.5 w-3.5" />
            </span>
            <span className="line-clamp-2">{note}</span>
          </p>
        )}

        {description && (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300" dir={isAr ? 'rtl' : 'ltr'}>
            {description}
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Stat icon="user" value={fmtLimit(plan.users)} label={t('subscriptions.plans.card.statUsers')} />
          <Stat icon="building" value={fmtLimit(plan.clients)} label={t('subscriptions.plans.card.statClients')} />
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700/60">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5" title={t('subscriptions.plans.show')}>
            <Toggle id={`plan_visible_${plan.id}`} checked={plan.visible} onChange={onToggleVisibility} label={t('subscriptions.plans.show')} hideLabel />
            <label
              htmlFor={`plan_visible_${plan.id}`}
              aria-hidden="true"
              className={`cursor-pointer text-sm font-medium ${plan.visible ? 'text-gray-700 dark:text-gray-200' : 'text-amber-600 dark:text-amber-400'}`}
            >
              {plan.visible ? t('subscriptions.plans.card.visible') : t('subscriptions.plans.card.hidden')}
            </label>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 border-s border-gray-100 ps-2 dark:border-gray-700/60">
          <IconButton icon="view" label={t('common.view')} onClick={onView} />
          <IconButton icon="edit" label={t('subscriptions.plans.editPlan')} onClick={onEdit} />
          <IconButton
            icon="trash"
            tone="danger"
            label={isDeletable ? t('subscriptions.plans.deletePlan') : t('subscriptions.plans.deleteDisabledTooltip')}
            onClick={onDelete}
            disabled={!isDeletable}
          />
        </div>
      </footer>
    </article>
  );
};

export default PlanAdminCard;
