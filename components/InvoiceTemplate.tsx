import React from 'react';
import type { BillingBranding, Invoice, InvoicePaymentStatus } from '../types';

interface InvoiceTemplateProps {
  invoice: Invoice;
  /** Theme logo (fallback if billing has no logo). */
  logoUrl: string | null;
  /** Platform billing / issuer block for PDF preview. */
  branding?: Partial<BillingBranding> | null;
  t: (key: string) => string;
}

function statusLabelKey(ps: InvoicePaymentStatus): 'Successful' | 'Pending' | 'Failed' | 'Canceled' {
  switch (ps) {
    case 'completed':
      return 'Successful';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    default:
      return 'Pending';
  }
}

const statusColors: Record<InvoicePaymentStatus, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function formatMoney(amount: number, currency: string): string {
  const c = (currency || 'USD').toUpperCase();
  const n = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === 'USD') return `$${n}`;
  return `${n} ${c}`;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, logoUrl, branding, t }) => {
  const ps = invoice.paymentStatus;
  const issuerLogo = branding?.logo_url || logoUrl;
  const issuerName = branding?.issuer_name?.trim();
  const addr = branding?.issuer_address?.trim();

  return (
    <div className="bg-white p-8 md:p-12 text-gray-900 shadow-lg font-sans w-full max-w-[800px] mx-auto">
      <header className="flex justify-between items-start pb-6 border-b">
        <div>
          {issuerLogo ? (
            <img src={issuerLogo} alt="" className="h-16 w-auto max-w-[200px] object-contain" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-700">{issuerName || t('invoice.title')}</h1>
          )}
          {issuerName && issuerLogo ? <h2 className="text-lg font-semibold text-gray-800 mt-1">{issuerName}</h2> : null}
          {addr ? (
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{addr}</p>
          ) : !branding?.issuer_name ? (
            <p className="text-sm text-gray-500 mt-2">{t('invoice.configureBilling')}</p>
          ) : null}
          {branding?.issuer_email ? <p className="text-sm text-gray-500">{branding.issuer_email}</p> : null}
          {branding?.issuer_phone ? <p className="text-sm text-gray-500">{branding.issuer_phone}</p> : null}
          {branding?.issuer_tax_id ? (
            <p className="text-sm text-gray-500">
              {t('invoice.taxId')}: {branding.issuer_tax_id}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-primary-600 tracking-wider">{t('invoice.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('invoice.invoiceNo')} {invoice.id}
          </p>
        </div>
      </header>

      <section className="flex justify-between mt-8">
        <div>
          <h3 className="font-semibold text-gray-600 uppercase text-sm tracking-wide">{t('invoice.billTo')}</h3>
          <p className="font-bold text-lg">{invoice.companyName}</p>
        </div>
        <div className="text-right">
          <p>
            <span className="font-semibold text-gray-600">{t('invoice.dateIssued')}:</span>{' '}
            {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>
          {invoice.dueDate ? (
            <p>
              <span className="font-semibold text-gray-600">{t('invoice.dueDate')}:</span> {invoice.dueDate}
            </p>
          ) : null}
          <p className="mt-2">
            <span className="font-semibold text-gray-600">{t('invoice.status')}:</span>{' '}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[ps]}`}>
              {t(`status.${statusLabelKey(ps)}`)}
            </span>
          </p>
        </div>
      </section>

      <section className="mt-10 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900 sm:pl-0 uppercase tracking-wide"
                  >
                    {t('invoice.item')}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 uppercase tracking-wide"
                  >
                    {t('invoice.price')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr>
                  <td className="py-4 pl-4 pr-3 text-sm font-medium text-center text-gray-900 sm:pl-0">
                    {invoice.lineDescription || invoice.planName}
                  </td>
                  <td className="px-3 py-4 text-sm text-center text-gray-500">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-gray-600">
            <dt>{t('invoice.subtotal')}</dt>
            <dd>{formatMoney(invoice.amount, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t-2 border-gray-900 pt-2 text-gray-900">
            <dt>{t('invoice.total')}</dt>
            <dd>{formatMoney(invoice.amount, invoice.currency)}</dd>
          </div>
        </div>
      </section>

      {branding?.payment_instructions ? (
        <section className="mt-8 text-sm text-gray-600 whitespace-pre-line border-t pt-4">
          <div className="font-semibold text-gray-700 mb-1">{t('invoice.paymentInstructions')}</div>
          {branding.payment_instructions}
        </section>
      ) : null}

      <footer className="mt-12 border-t pt-6 text-center text-sm text-gray-500 whitespace-pre-line">
        {branding?.footer_text?.trim() ? branding.footer_text : <p>{t('invoice.thankYou')}</p>}
      </footer>
    </div>
  );
};

export default InvoiceTemplate;
