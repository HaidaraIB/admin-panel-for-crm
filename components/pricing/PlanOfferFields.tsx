import React from 'react';
import type { Plan, PlanBadgeKey } from '../../types';
import { useI18n } from '../../context/i18n';
import { NumberInput } from '../NumberInput';
import { FormInput, FormSelect } from '../settings/FormFields';
import FieldError from '../FieldError';
import Toggle from '../Toggle';
import DateTimeInput from '../DateTimeInput';
import { Badge } from '../telephony/shared';
import { PLAN_BADGE_KEYS, discountPercent, saleWindowStatus } from '../../utils/planOffer';
import { formatDateTimeShort, localTimeZoneLabel } from '../../utils/datetime';

type PlanDraft = Omit<Plan, 'id'> & { id?: number };

interface PlanOfferFieldsProps {
  formData: PlanDraft;
  setFormData: React.Dispatch<React.SetStateAction<PlanDraft>>;
  errors: Record<string, string>;
  onBlurField: (field: string) => void;
}

const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';
const sectionClasses = 'p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md space-y-4';

const parseOptionalPrice = (raw: string): number | null => {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Sale pricing + card presentation sections of the plan editor. */
const PlanOfferFields: React.FC<PlanOfferFieldsProps> = ({ formData, setFormData, errors, onBlurField }) => {
  const { t, language } = useI18n();
  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const status = saleWindowStatus({
    salePriceMonthly: formData.salePriceMonthly ?? null,
    salePriceYearly: formData.salePriceYearly ?? null,
    saleStartsAt: formData.saleStartsAt ?? null,
    saleEndsAt: formData.saleEndsAt ?? null,
  });

  const statusLine = () => {
    if (status === 'none') return t('subscriptions.plans.sale.statusNone');
    if (status === 'scheduled')
      return t('subscriptions.plans.sale.statusScheduled').replace('{date}', formatDateTimeShort(formData.saleStartsAt, language));
    if (status === 'ended') return t('subscriptions.plans.sale.statusEnded');
    return formData.saleEndsAt
      ? t('subscriptions.plans.sale.statusLiveUntil').replace('{date}', formatDateTimeShort(formData.saleEndsAt, language))
      : t('subscriptions.plans.sale.statusLive');
  };
  const statusTone = status === 'live' ? 'green' : status === 'scheduled' ? 'blue' : status === 'ended' ? 'amber' : 'gray';

  const cycleRow = (
    cycle: 'monthly' | 'yearly',
    key: 'salePriceMonthly' | 'salePriceYearly',
    regular: number,
  ) => {
    const sale = formData[key] ?? null;
    const pct = discountPercent(regular, sale);
    const invalid = sale != null && pct === 0;
    const errorKey = errors[key];
    return (
      <div>
        <label htmlFor={`plan_${key}`} className={labelClasses}>
          {t(cycle === 'monthly' ? 'subscriptions.plans.sale.monthly' : 'subscriptions.plans.sale.yearly')}
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <NumberInput
              id={`plan_${key}`}
              name={key}
              value={sale ?? ''}
              placeholder={t('subscriptions.plans.sale.placeholder')}
              min={0}
              step={0.01}
              onChange={(e) => set(key, parseOptionalPrice(e.target.value))}
              onBlur={() => onBlurField(key)}
              aria-invalid={!!errorKey || invalid}
              aria-describedby={`plan_${key}_hint`}
            />
          </div>
          <div className="w-24 shrink-0 text-center" aria-live="polite">
            {pct > 0 ? (
              <span className="inline-flex rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                <span dir="ltr">−{pct}%</span>
              </span>
            ) : null}
          </div>
        </div>
        <p id={`plan_${key}_hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('subscriptions.plans.sale.regularHint').replace('{price}', `$${regular}`)}
        </p>
        {errorKey ? (
          <FieldError>{errorKey}</FieldError>
        ) : invalid ? (
          <FieldError>{t('validation.sale_price_below_regular')}</FieldError>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {formData.type === 'Paid' && (
        <section className={sectionClasses} aria-labelledby="plan-sale-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="plan-sale-heading" className="font-medium">
              {t('subscriptions.plans.sale.title')}
            </h3>
            <Badge tone={statusTone as any}>{t(`subscriptions.plans.sale.status.${status}`)}</Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.plans.sale.help')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cycleRow('monthly', 'salePriceMonthly', Number(formData.priceMonthly) || 0)}
            {cycleRow('yearly', 'salePriceYearly', Number(formData.priceYearly) || 0)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="plan_sale_starts" className={labelClasses}>
                {t('subscriptions.plans.sale.startsAt')}
              </label>
              <DateTimeInput
                id="plan_sale_starts"
                value={formData.saleStartsAt}
                onChange={(iso) => set('saleStartsAt', iso)}
                onBlur={() => onBlurField('saleStartsAt')}
                invalid={!!errors.saleStartsAt}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.plans.sale.startsHint')}</p>
              <FieldError>{errors.saleStartsAt}</FieldError>
            </div>
            <div>
              <label htmlFor="plan_sale_ends" className={labelClasses}>
                {t('subscriptions.plans.sale.endsAt')}
              </label>
              <DateTimeInput
                id="plan_sale_ends"
                value={formData.saleEndsAt}
                onChange={(iso) => set('saleEndsAt', iso)}
                onBlur={() => onBlurField('saleEndsAt')}
                invalid={!!errors.saleEndsAt}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.plans.sale.endsHint')}</p>
              <FieldError>{errors.saleEndsAt}</FieldError>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {statusLine()}
            {localTimeZoneLabel() ? ` · ${t('subscriptions.plans.sale.timezone').replace('{zone}', localTimeZoneLabel())}` : ''}
          </p>
        </section>
      )}

      <section className={sectionClasses} aria-labelledby="plan-card-heading">
        <h3 id="plan-card-heading" className="font-medium">
          {t('subscriptions.plans.card.title')}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan_badge" className={labelClasses}>
              {t('subscriptions.plans.card.badge')}
            </label>
            <FormSelect
              id="plan_badge"
              value={formData.badge || ''}
              onChange={(e) => set('badge', e.target.value as PlanBadgeKey)}
            >
              <option value="">{t('plans.badge.none')}</option>
              {PLAN_BADGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`plans.badge.${key}`)}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label htmlFor="plan_sort_order" className={labelClasses}>
              {t('subscriptions.plans.card.sortOrder')}
            </label>
            <NumberInput
              id="plan_sort_order"
              name="sortOrder"
              value={formData.sortOrder ?? 0}
              min={0}
              max={999}
              step={1}
              onChange={(e) => set('sortOrder', Math.max(0, Math.round(Number(e.target.value) || 0)))}
              onBlur={() => onBlurField('sortOrder')}
              aria-invalid={!!errors.sortOrder}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.plans.card.sortOrderHint')}</p>
            <FieldError>{errors.sortOrder}</FieldError>
          </div>
        </div>
        {formData.badge === 'custom' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="plan_badge_text" className={labelClasses}>
                {t('subscriptions.plans.card.badgeText')}
              </label>
              <FormInput
                id="plan_badge_text"
                value={formData.badgeText || ''}
                maxLength={40}
                onChange={(e) => set('badgeText', e.target.value)}
                onBlur={() => onBlurField('badgeText')}
                aria-invalid={!!errors.badgeText || undefined}
              />
              <FieldError>{errors.badgeText}</FieldError>
            </div>
            <div>
              <label htmlFor="plan_badge_text_ar" className={labelClasses}>
                {t('subscriptions.plans.card.badgeTextAr')}
              </label>
              <FormInput
                id="plan_badge_text_ar"
                dir="rtl"
                value={formData.badgeTextAr || ''}
                maxLength={40}
                onChange={(e) => set('badgeTextAr', e.target.value)}
                onBlur={() => onBlurField('badgeTextAr')}
                aria-invalid={!!errors.badgeTextAr || undefined}
              />
              <FieldError>{errors.badgeTextAr}</FieldError>
            </div>
          </div>
        )}
        <Toggle
          id="plan_is_featured"
          checked={!!formData.isFeatured}
          onChange={(v) => set('isFeatured', v)}
          label={t('subscriptions.plans.card.featured')}
          description={t('subscriptions.plans.card.featuredHint')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan_offer_note" className={labelClasses}>
              {t('subscriptions.plans.card.offerNote')}
            </label>
            <FormInput
              id="plan_offer_note"
              value={formData.offerNote || ''}
              maxLength={160}
              placeholder={t('subscriptions.plans.card.offerNotePlaceholder')}
              onChange={(e) => set('offerNote', e.target.value)}
              onBlur={() => onBlurField('offerNote')}
              aria-invalid={!!errors.offerNote || undefined}
            />
            <FieldError>{errors.offerNote}</FieldError>
          </div>
          <div>
            <label htmlFor="plan_offer_note_ar" className={labelClasses}>
              {t('subscriptions.plans.card.offerNoteAr')}
            </label>
            <FormInput
              id="plan_offer_note_ar"
              dir="rtl"
              value={formData.offerNoteAr || ''}
              maxLength={160}
              onChange={(e) => set('offerNoteAr', e.target.value)}
              onBlur={() => onBlurField('offerNoteAr')}
              aria-invalid={!!errors.offerNoteAr || undefined}
            />
            <FieldError>{errors.offerNoteAr}</FieldError>
          </div>
        </div>
      </section>
    </>
  );
};

export default PlanOfferFields;
