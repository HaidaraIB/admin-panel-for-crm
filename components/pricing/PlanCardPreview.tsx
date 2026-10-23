import React from 'react';
import type { Plan } from '../../types';
import { discountPercent, formatUsd, planBadgeLabel, saleWindowStatus } from '../../utils/planOffer';

/**
 * Admin-side mirror of the tenant plan card (CRM-project components/pricing/*)
 * so the editor shows exactly how the offer will render. Display only.
 */

interface PlanCardPreviewProps {
  plan: Partial<Plan>;
  cycle: 'monthly' | 'yearly';
  language: 'en' | 'ar';
  t: (key: string) => string;
}

const GiftIcon = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8m16-4H4a1 1 0 00-1 1v2a1 1 0 001 1h16a1 1 0 001-1V9a1 1 0 00-1-1zm-8 0v13m0-13s-1.5-5-4.5-5a2.5 2.5 0 000 5H12zm0 0s1.5-5 4.5-5a2.5 2.5 0 010 5H12z" />
  </svg>
);

const PlanCardPreview: React.FC<PlanCardPreviewProps> = ({ plan, cycle, language, t }) => {
  const isAr = language === 'ar';
  const featured = !!plan.isFeatured;
  const name = (isAr ? plan.nameAr || plan.name : plan.name || plan.nameAr) || t('subscriptions.plans.preview.untitled');
  const regular = Number(cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly) || 0;
  const saleRaw = cycle === 'yearly' ? plan.salePriceYearly : plan.salePriceMonthly;
  const status = saleWindowStatus({
    salePriceMonthly: plan.salePriceMonthly ?? null,
    salePriceYearly: plan.salePriceYearly ?? null,
    saleStartsAt: plan.saleStartsAt ?? null,
    saleEndsAt: plan.saleEndsAt ?? null,
  });
  const pct = plan.type === 'Paid' && status === 'live' ? discountPercent(regular, saleRaw ?? null) : 0;
  const onSale = pct > 0;
  const price = onSale ? Number(saleRaw) : regular;
  const badge = planBadgeLabel(
    { badge: plan.badge, badgeText: plan.badgeText, badgeTextAr: plan.badgeTextAr },
    language,
    t,
  );
  const note = isAr ? plan.offerNoteAr || plan.offerNote : plan.offerNote || plan.offerNoteAr;
  const per = cycle === 'yearly' ? t('plans.preview.perYear') : t('plans.preview.perMonth');

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`relative flex flex-col rounded-2xl p-5 text-start shadow-sm transition ${
        featured
          ? 'bg-gradient-to-b from-primary-900 via-primary-950 to-gray-950 text-white ring-1 ring-primary-400/40'
          : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
      }`}
    >
      {(onSale || badge) && (
        <div className="absolute -top-3 end-4 flex items-center gap-1.5">
          {badge && (
            <span
              className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm ${
                featured ? 'bg-white text-primary-800' : 'bg-amber-400 text-gray-900'
              }`}
            >
              {badge}
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <span dir="ltr" className="[unicode-bidi:isolate]">−{pct}%</span>
            </span>
          )}
        </div>
      )}
      <h4 className="text-lg font-bold">{name}</h4>
      <div className="mt-3 min-h-[4.5rem]">
        {plan.type !== 'Paid' ? (
          <span className="text-3xl font-extrabold">{t(`subscriptions.plans.type.${plan.type || 'Paid'}`)}</span>
        ) : (
          <>
            <div className={`h-5 text-sm ${featured ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
              {onSale && (
                <del dir="ltr" className="[unicode-bidi:isolate]">
                  {formatUsd(regular, language)}
                </del>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span dir="ltr" className="text-3xl font-extrabold tracking-tight [unicode-bidi:isolate]">
                {formatUsd(price, language)}
              </span>
              <span className={`text-sm ${featured ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{per}</span>
            </div>
          </>
        )}
      </div>
      {note && (
        <div
          className={`mt-3 flex items-center gap-3 rounded-xl p-3 text-sm ${
            featured ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700/50'
          }`}
        >
          <span className="flex-1 font-medium leading-snug">{note}</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
            <GiftIcon className="h-4 w-4" />
          </span>
        </div>
      )}
      <span
        className={`mt-4 block w-full rounded-lg py-2 text-center text-sm font-semibold ${
          featured ? 'bg-primary-500 text-white' : 'border border-primary-500 text-primary-700 dark:text-primary-300'
        }`}
      >
        {t('plans.preview.choose')}
      </span>
    </div>
  );
};

export default PlanCardPreview;
