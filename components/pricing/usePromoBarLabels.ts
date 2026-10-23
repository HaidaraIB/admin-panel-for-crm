import type { PromoBarLabels } from './PromoBarView';

/** Bar chrome strings for a given UI language (preview can differ from the admin UI language). */
export function promoBarLabels(t: (key: string) => string, endsOn?: string): PromoBarLabels {
  return {
    endsIn: t('promo.endsIn'),
    days: t('promo.unit.d'),
    hours: t('promo.unit.h'),
    minutes: t('promo.unit.m'),
    seconds: t('promo.unit.s'),
    dismiss: t('promo.dismiss'),
    region: t('promo.region'),
    endsOn,
  };
}
