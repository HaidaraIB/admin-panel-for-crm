import type { Plan, PlanBadgeKey, PlanSaleStatus } from '../types';

/** Preset badges, in the order the admin picker lists them. Labels: `plans.badge.<key>`. */
export const PLAN_BADGE_KEYS: PlanBadgeKey[] = ['most_popular', 'best_value', 'recommended', 'new', 'limited_offer', 'custom'];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** API (snake_case) -> Plan offer fields (camelCase). */
export function planOfferFromApi(api: any): Pick<
  Plan,
  | 'salePriceMonthly' | 'salePriceYearly' | 'saleStartsAt' | 'saleEndsAt' | 'badge' | 'badgeText' | 'badgeTextAr'
  | 'isFeatured' | 'offerNote' | 'offerNoteAr' | 'sortOrder' | 'saleStatus'
> {
  return {
    salePriceMonthly: num(api?.sale_price_monthly),
    salePriceYearly: num(api?.sale_price_yearly),
    saleStartsAt: api?.sale_starts_at || null,
    saleEndsAt: api?.sale_ends_at || null,
    badge: (api?.badge || '') as PlanBadgeKey,
    badgeText: api?.badge_text || '',
    badgeTextAr: api?.badge_text_ar || '',
    isFeatured: !!api?.is_featured,
    offerNote: api?.offer_note || '',
    offerNoteAr: api?.offer_note_ar || '',
    sortOrder: typeof api?.sort_order === 'number' ? api.sort_order : 0,
    saleStatus: (api?.sale_status || 'none') as PlanSaleStatus,
  };
}

/** Plan offer fields -> API payload. Sale fields are cleared for non-paid plans. */
export function planOfferToApi(plan: Partial<Plan>): Record<string, unknown> {
  const paid = plan.type === 'Paid';
  const isCustom = plan.badge === 'custom';
  return {
    sale_price_monthly: paid ? plan.salePriceMonthly ?? null : null,
    sale_price_yearly: paid ? plan.salePriceYearly ?? null : null,
    sale_starts_at: paid ? plan.saleStartsAt ?? null : null,
    sale_ends_at: paid ? plan.saleEndsAt ?? null : null,
    badge: plan.badge || '',
    badge_text: isCustom ? (plan.badgeText || '').trim() : '',
    badge_text_ar: isCustom ? (plan.badgeTextAr || '').trim() : '',
    is_featured: !!plan.isFeatured,
    offer_note: (plan.offerNote || '').trim(),
    offer_note_ar: (plan.offerNoteAr || '').trim(),
    sort_order: plan.sortOrder ?? 0,
  };
}

/** Floored, like the server — never overstate a discount. 0 when the sale is not valid. */
export function discountPercent(regular: number, sale: number | null | undefined): number {
  if (sale == null || !(regular > 0) || !(sale > 0) || sale >= regular) return 0;
  return Math.floor(((regular - sale) / regular) * 100);
}

/** Mirrors pricing.sale_window_status for the live editor preview. */
export function saleWindowStatus(
  plan: Pick<Plan, 'salePriceMonthly' | 'salePriceYearly' | 'saleStartsAt' | 'saleEndsAt'>,
  now: number = Date.now(),
): PlanSaleStatus {
  if (plan.salePriceMonthly == null && plan.salePriceYearly == null) return 'none';
  if (plan.saleStartsAt && new Date(plan.saleStartsAt).getTime() > now) return 'scheduled';
  if (plan.saleEndsAt && new Date(plan.saleEndsAt).getTime() <= now) return 'ended';
  return 'live';
}

export function planBadgeLabel(
  plan: Pick<Plan, 'badge' | 'badgeText' | 'badgeTextAr'>,
  language: string,
  t: (key: string) => string,
): string {
  if (!plan.badge) return '';
  if (plan.badge === 'custom') {
    return (language === 'ar' ? plan.badgeTextAr || plan.badgeText : plan.badgeText || plan.badgeTextAr) || '';
  }
  return t(`plans.badge.${plan.badge}`);
}

export function formatUsd(amount: number, language: string): string {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
