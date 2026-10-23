import React, { useEffect, useMemo, useState } from 'react';
import type { Plan, Promotion, PromotionAudience, PromotionMessage, PromotionTheme } from '../types';
import { translateIn, useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import { FormInput } from './settings/FormFields';
import FieldError from './FieldError';
import IconButton from './IconButton';
import LoadingButton from './LoadingButton';
import Toggle from './Toggle';
import DateTimeInput from './DateTimeInput';
import { NumberInput } from './NumberInput';
import { Checkbox } from './Checkbox';
import Icon from './Icon';
import PromoBarView, { PROMO_THEMES } from './pricing/PromoBarView';
import { promoBarLabels } from './pricing/usePromoBarLabels';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateTimeShort, localTimeZoneLabel } from '../utils/datetime';
import type { PromotionPayload } from '../services/api';

const MAX_MESSAGES = 6;
const MESSAGE_MAX = 120;
const THEMES: PromotionTheme[] = ['sale', 'brand', 'dark', 'amber'];
const AUDIENCES: PromotionAudience[] = ['public', 'dashboard', 'mobile'];

export type PromotionDraft = Omit<Promotion, 'id' | 'status' | 'created_at' | 'updated_at'> & { id?: number };

export const emptyPromotion = (): PromotionDraft => ({
  name: '',
  messages: [{ en: '', ar: '' }],
  cta_label: '',
  cta_label_ar: '',
  cta_url: '',
  theme: 'sale',
  starts_at: new Date().toISOString(),
  ends_at: null,
  show_countdown: false,
  audiences: ['public', 'dashboard'],
  dismissible: true,
  is_active: true,
  priority: 0,
});

interface PromotionModalProps {
  isOpen: boolean;
  initial: PromotionDraft | null;
  onClose: () => void;
  onSave: (payload: PromotionPayload, id?: number) => Promise<void>;
  isSaving: boolean;
  /** Other promotions, to warn about a higher-priority overlap. */
  others: Promotion[];
  /** Plans, to warn when a discounted plan's sale ends at a different time. */
  plans: Plan[];
}

const labelClasses = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';
const sectionClasses = 'space-y-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900/50';

const overlaps = (a: PromotionDraft, b: Promotion) => {
  const aStart = new Date(a.starts_at).getTime();
  const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Infinity;
  const bStart = new Date(b.starts_at).getTime();
  const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Infinity;
  return aStart < bEnd && bStart < aEnd;
};

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, initial, onClose, onSave, isSaving, others, plans }) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const translate = (key: string) => {
    const v = t(key);
    return v && v !== key ? v : undefined;
  };
  const [form, setForm] = useState<PromotionDraft>(initial ?? emptyPromotion());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewLang, setPreviewLang] = useState<'en' | 'ar'>(language === 'ar' ? 'ar' : 'en');
  const [previewReduced, setPreviewReduced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initial ? { ...initial, messages: initial.messages.map((m) => ({ ...m })) } : emptyPromotion());
      setErrors({});
    }
  }, [isOpen, initial]);

  const countdown = useCountdown(form.show_countdown ? form.ends_at : null);

  const conflicts = useMemo(
    () =>
      others.filter(
        (o) => o.id !== form.id && o.is_active && o.priority >= form.priority && overlaps(form, o) &&
          o.audiences.some((a) => form.audiences.includes(a)),
      ),
    [others, form],
  );
  const mismatchedPlans = useMemo(() => {
    if (!form.ends_at) return [];
    const end = new Date(form.ends_at).getTime();
    return plans.filter(
      (p) =>
        p.type === 'Paid' &&
        (p.salePriceMonthly != null || p.salePriceYearly != null) &&
        p.saleStatus !== 'ended' &&
        Math.abs((p.saleEndsAt ? new Date(p.saleEndsAt).getTime() : Infinity) - end) > 60_000,
    );
  }, [plans, form.ends_at]);

  if (!isOpen) return null;

  const set = <K extends keyof PromotionDraft>(key: K, value: PromotionDraft[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setMessage = (i: number, patch: Partial<PromotionMessage>) =>
    setForm((f) => ({ ...f, messages: f.messages.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));
  const moveMessage = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.messages];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, messages: next };
    });
  const removeMessage = (i: number) => setForm((f) => ({ ...f, messages: f.messages.filter((_, idx) => idx !== i) }));
  const addMessage = () => setForm((f) => ({ ...f, messages: [...f.messages, { en: '', ar: '' }] }));
  const toggleAudience = (a: PromotionAudience, on: boolean) =>
    setForm((f) => ({ ...f, audiences: on ? [...new Set([...f.audiences, a])] : f.audiences.filter((x) => x !== a) }));

  const payload = (): PromotionPayload => ({
    name: form.name.trim(),
    messages: form.messages.map((m) => ({ en: m.en.trim(), ar: m.ar.trim() })),
    cta_label: form.cta_label.trim(),
    cta_label_ar: form.cta_label_ar.trim(),
    cta_url: form.cta_url.trim(),
    theme: form.theme,
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    show_countdown: !!form.ends_at && form.show_countdown,
    audiences: form.audiences,
    dismissible: form.dismissible,
    is_active: form.is_active,
    priority: form.priority,
  });

  const validate = () => catalogFieldErrors('promotion.upsert', payload() as Record<string, unknown>, translate);
  /** Re-validate only the blurred field so untouched rows never light up mid-edit. */
  const blurField = (field: string) => {
    const next = validate();
    setErrors((prev) => {
      const copy = { ...prev };
      Object.keys(copy).filter((k) => k === field || k.startsWith(`${field}.`)).forEach((k) => delete copy[k]);
      Object.entries(next).filter(([k]) => k === field || k.startsWith(`${field}.`)).forEach(([k, v]) => (copy[k] = v));
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await onSave(payload(), form.id);
    } catch (error) {
      const server = serverFieldErrors(error, 'promotion.upsert', translate);
      if (Object.keys(server).length > 0) setErrors((prev) => ({ ...prev, ...server }));
      else showToast(translateAdminApiError(error, t) || t('subscriptions.promotions.saveError'), { variant: 'error' });
    }
  };

  const pt = (key: string) => translateIn(previewLang, key);
  const previewMessages = form.messages.map((m) => (previewLang === 'ar' ? m.ar || m.en : m.en || m.ar));
  const previewCta = previewLang === 'ar' ? form.cta_label_ar || form.cta_label : form.cta_label || form.cta_label_ar;
  const messageError = (i: number, locale: 'en' | 'ar') => errors[`messages.${i}.${locale}`];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-modal-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
            <h2 id="promotion-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {form.id ? t('subscriptions.promotions.editTitle') : t('subscriptions.promotions.createTitle')}
            </h2>
            <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>

          {/* Live preview — exactly what tenants see. */}
          <div className="border-b border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('subscriptions.promotions.preview')}
              </span>
              <div className="flex items-center gap-1">
                {(['en', 'ar'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={previewLang === l}
                    onClick={() => setPreviewLang(l)}
                    className={`rounded-md px-2 py-1 text-xs font-medium uppercase transition ${previewLang === l ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                  >
                    {l}
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                <button
                  type="button"
                  aria-pressed={previewReduced}
                  onClick={() => setPreviewReduced((v) => !v)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition ${previewReduced ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  {t('subscriptions.promotions.previewReducedMotion')}
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-md shadow-sm">
              {previewMessages.some((m) => m.trim()) ? (
                <PromoBarView
                  messages={previewMessages}
                  theme={form.theme}
                  ctaLabel={previewCta || undefined}
                  countdown={form.show_countdown ? countdown : null}
                  dismissible={form.dismissible}
                  onDismiss={() => undefined}
                  labels={promoBarLabels(pt)}
                  dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
                  reducedMotion={previewReduced || undefined}
                />
              ) : (
                <div className="flex h-11 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  {t('subscriptions.promotions.previewEmpty')}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {errors._general && <FieldError>{errors._general}</FieldError>}
            {conflicts.length > 0 && (
              <div role="status" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t('subscriptions.promotions.conflictWarning').replace('{names}', conflicts.map((c) => c.name).join(', '))}
                </span>
              </div>
            )}

            <div>
              <label htmlFor="promo_name" className={labelClasses}>{t('subscriptions.promotions.name')}</label>
              <FormInput
                id="promo_name"
                value={form.name}
                maxLength={120}
                placeholder={t('subscriptions.promotions.namePlaceholder')}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => blurField('name')}
                aria-invalid={!!errors.name || undefined}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.nameHint')}</p>
              <FieldError>{errors.name}</FieldError>
            </div>

            <section className={sectionClasses} aria-labelledby="promo-messages-heading">
              <div className="flex items-center justify-between">
                <h3 id="promo-messages-heading" className="font-medium">{t('subscriptions.promotions.messages')}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                  {form.messages.length}/{MAX_MESSAGES}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.messagesHint')}</p>
              <ol className="space-y-3">
                {form.messages.map((m, i) => (
                  <li key={i} className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {t('subscriptions.promotions.messageN').replace('{n}', String(i + 1))}
                      </span>
                      <div className="flex items-center">
                        <IconButton icon="arrow-up" label={t('subscriptions.promotions.moveUp')} disabled={i === 0} onClick={() => moveMessage(i, -1)} />
                        <IconButton icon="arrow-down" label={t('subscriptions.promotions.moveDown')} disabled={i === form.messages.length - 1} onClick={() => moveMessage(i, 1)} />
                        <IconButton icon="trash" tone="danger" label={t('subscriptions.promotions.removeMessage')} disabled={form.messages.length <= 1} onClick={() => removeMessage(i)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label htmlFor={`promo_msg_${i}_en`} className="sr-only">{t('subscriptions.promotions.messageEn')}</label>
                        <FormInput
                          id={`promo_msg_${i}_en`}
                          dir="ltr"
                          value={m.en}
                          maxLength={MESSAGE_MAX}
                          placeholder={t('subscriptions.promotions.messageEnPlaceholder')}
                          onChange={(e) => setMessage(i, { en: e.target.value })}
                          onBlur={() => blurField(`messages.${i}.en`)}
                          aria-invalid={!!messageError(i, 'en') || undefined}
                        />
                        <FieldError>{messageError(i, 'en')}</FieldError>
                      </div>
                      <div>
                        <label htmlFor={`promo_msg_${i}_ar`} className="sr-only">{t('subscriptions.promotions.messageAr')}</label>
                        <FormInput
                          id={`promo_msg_${i}_ar`}
                          dir="rtl"
                          value={m.ar}
                          maxLength={MESSAGE_MAX}
                          placeholder={t('subscriptions.promotions.messageArPlaceholder')}
                          onChange={(e) => setMessage(i, { ar: e.target.value })}
                          onBlur={() => blurField(`messages.${i}.ar`)}
                          aria-invalid={!!messageError(i, 'ar') || undefined}
                        />
                        <FieldError>{messageError(i, 'ar')}</FieldError>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <FieldError>{errors.messages}</FieldError>
              <LoadingButton variant="secondary" size="sm" icon="plus" onClick={addMessage} disabled={form.messages.length >= MAX_MESSAGES}>
                {t('subscriptions.promotions.addMessage')}
              </LoadingButton>
            </section>

            <section className={sectionClasses} aria-labelledby="promo-cta-heading">
              <h3 id="promo-cta-heading" className="font-medium">{t('subscriptions.promotions.cta')}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="promo_cta_en" className={labelClasses}>{t('subscriptions.promotions.ctaLabel')}</label>
                  <FormInput id="promo_cta_en" dir="ltr" value={form.cta_label} maxLength={40} placeholder="See plans"
                    onChange={(e) => set('cta_label', e.target.value)} onBlur={() => blurField('ctaLabel')} aria-invalid={!!errors.ctaLabel || undefined} />
                  <FieldError>{errors.ctaLabel}</FieldError>
                </div>
                <div>
                  <label htmlFor="promo_cta_ar" className={labelClasses}>{t('subscriptions.promotions.ctaLabelAr')}</label>
                  <FormInput id="promo_cta_ar" dir="rtl" value={form.cta_label_ar} maxLength={40}
                    onChange={(e) => set('cta_label_ar', e.target.value)} onBlur={() => blurField('ctaLabelAr')} aria-invalid={!!errors.ctaLabelAr || undefined} />
                  <FieldError>{errors.ctaLabelAr}</FieldError>
                </div>
                <div>
                  <label htmlFor="promo_cta_url" className={labelClasses}>{t('subscriptions.promotions.ctaUrl')}</label>
                  <FormInput id="promo_cta_url" dir="ltr" value={form.cta_url} maxLength={500}
                    placeholder={t('subscriptions.promotions.ctaUrlPlaceholder')}
                    onChange={(e) => set('cta_url', e.target.value)} onBlur={() => blurField('ctaUrl')} aria-invalid={!!errors.ctaUrl || undefined} />
                  <FieldError>{errors.ctaUrl}</FieldError>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.ctaHint')}</p>
            </section>

            <section className={sectionClasses} aria-labelledby="promo-theme-heading">
              <h3 id="promo-theme-heading" className="font-medium">{t('subscriptions.promotions.theme')}</h3>
              <div role="radiogroup" aria-labelledby="promo-theme-heading" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEMES.map((theme) => {
                  const selected = form.theme === theme;
                  return (
                    <button
                      key={theme}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set('theme', theme)}
                      className={`overflow-hidden rounded-lg border-2 text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${selected ? 'border-primary-500 shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <span className={`flex h-9 items-center justify-center gap-1 text-xs font-bold ${PROMO_THEMES[theme].bar}`}>
                        <span aria-hidden="true" dir="ltr">✦ −50% ✦</span>
                      </span>
                      <span className="flex items-center justify-between bg-white px-2 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {t(`subscriptions.promotions.themes.${theme}`)}
                        {selected && <Icon name="check" className="h-3.5 w-3.5 text-primary-600" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={sectionClasses} aria-labelledby="promo-schedule-heading">
              <h3 id="promo-schedule-heading" className="font-medium">{t('subscriptions.promotions.schedule')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="promo_starts" className={labelClasses}>{t('subscriptions.promotions.startsAt')}</label>
                  <DateTimeInput id="promo_starts" value={form.starts_at} onChange={(iso) => set('starts_at', iso || new Date().toISOString())}
                    onBlur={() => blurField('startsAt')} invalid={!!errors.startsAt} />
                  <FieldError>{errors.startsAt}</FieldError>
                </div>
                <div>
                  <label htmlFor="promo_ends" className={labelClasses}>{t('subscriptions.promotions.endsAt')}</label>
                  <DateTimeInput id="promo_ends" value={form.ends_at}
                    onChange={(iso) => setForm((f) => ({ ...f, ends_at: iso, show_countdown: iso ? f.show_countdown : false }))}
                    onBlur={() => blurField('endsAt')} invalid={!!errors.endsAt} />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.endsHint')}</p>
                  <FieldError>{errors.endsAt}</FieldError>
                </div>
              </div>
              {localTimeZoneLabel() && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('subscriptions.plans.sale.timezone').replace('{zone}', localTimeZoneLabel())}
                </p>
              )}
              <Toggle
                id="promo_countdown"
                checked={!!form.ends_at && form.show_countdown}
                disabled={!form.ends_at}
                onChange={(v) => set('show_countdown', v)}
                label={t('subscriptions.promotions.showCountdown')}
                description={form.ends_at ? t('subscriptions.promotions.showCountdownHint') : t('subscriptions.promotions.countdownNeedsEnd')}
              />
              <FieldError>{errors.showCountdown}</FieldError>
              {mismatchedPlans.length > 0 && (
                <div role="status" className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-200">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p>{t('subscriptions.promotions.planEndMismatch')}</p>
                    <ul className="mt-1 list-disc ps-4">
                      {mismatchedPlans.map((p) => (
                        <li key={p.id}>
                          {(language === 'ar' ? p.nameAr || p.name : p.name)} —{' '}
                          {p.saleEndsAt ? formatDateTimeShort(p.saleEndsAt, language) : t('subscriptions.promotions.noEnd')}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            <section className={sectionClasses} aria-labelledby="promo-audience-heading">
              <h3 id="promo-audience-heading" className="font-medium">{t('subscriptions.promotions.audiences')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {AUDIENCES.map((a) => (
                  <Checkbox
                    key={a}
                    id={`promo_aud_${a}`}
                    checked={form.audiences.includes(a)}
                    onChange={(e) => toggleAudience(a, e.target.checked)}
                    label={t(`subscriptions.promotions.audience.${a}`)}
                  />
                ))}
              </div>
              <FieldError>{errors.audiences}</FieldError>
              <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700 sm:grid-cols-2">
                <Toggle id="promo_dismissible" checked={form.dismissible} onChange={(v) => set('dismissible', v)}
                  label={t('subscriptions.promotions.dismissible')} description={t('subscriptions.promotions.dismissibleHint')} />
                <Toggle id="promo_active" checked={form.is_active} onChange={(v) => set('is_active', v)}
                  label={t('subscriptions.promotions.active')} description={t('subscriptions.promotions.activeHint')} />
              </div>
              <div className="max-w-xs">
                <label htmlFor="promo_priority" className={labelClasses}>{t('subscriptions.promotions.priority')}</label>
                <NumberInput id="promo_priority" value={form.priority} min={-999} max={999} step={1}
                  onChange={(e) => set('priority', Math.round(Number(e.target.value) || 0))} onBlur={() => blurField('priority')}
                  aria-invalid={!!errors.priority} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.promotions.priorityHint')}</p>
                <FieldError>{errors.priority}</FieldError>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
            <LoadingButton variant="secondary" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </LoadingButton>
            <LoadingButton type="submit" isLoading={isSaving} loadingText={t('common.saving')}>
              {t('subscriptions.promotions.save')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromotionModal;
