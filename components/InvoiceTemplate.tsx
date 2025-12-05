import React from 'react';
import { Invoice, InvoiceStatus } from '../types';

interface InvoiceTemplateProps {
  invoice: Invoice;
  logoUrl: string | null;
  t: (key: string) => string;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, logoUrl, t }) => {
  const statusColors: { [key in InvoiceStatus]: string } = {
    [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [InvoiceStatus.Due]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  const getStatusLabel = (status: InvoiceStatus) => t(`status.${status}`);
  
  return (
    <div className="bg-white p-8 md:p-12 text-gray-900 shadow-lg font-sans w-full max-w-[800px] mx-auto">
      {/* Header */}
      <header className="flex justify-between items-start pb-6 border-b">
        <div>
          {logoUrl ? <img src={logoUrl} alt="Company Logo" className="h-16 w-auto max-w-[200px] object-contain" /> : <h1 className="text-2xl font-bold text-gray-700">Your Company</h1>}
          <p className="text-sm text-gray-500 mt-2">123 Business Rd.<br/>Business City, 12345</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-primary-600 tracking-wider">{t('invoice.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('invoice.invoiceNo')} {invoice.id}</p>
        </div>
      </header>
      
      {/* Bill To & Dates */}
      <section className="flex justify-between mt-8">
        <div>
          <h3 className="font-semibold text-gray-600 uppercase text-sm tracking-wide">{t('invoice.billTo')}</h3>
          <p className="font-bold text-lg">{invoice.companyName}</p>
        </div>
        <div className="text-right">
            <p><span className="font-semibold text-gray-600">{t('invoice.dateIssued')}:</span> {new Date().toLocaleDateString()}</p>
            <p><span className="font-semibold text-gray-600">{t('invoice.dueDate')}:</span> {invoice.dueDate}</p>
            <p className="mt-2"><span className="font-semibold text-gray-600">{t('invoice.status')}:</span> <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}>{getStatusLabel(invoice.status)}</span></p>
        </div>
      </section>

      {/* Table */}
      <section className="mt-10 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0 uppercase tracking-wide">{t('invoice.item')}</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('invoice.price')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr>
                  <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">Subscription Plan - Monthly</td>
                  <td className="px-3 py-4 text-sm text-gray-500 text-right">${invoice.amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Total */}
      <section className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-gray-600">
            <dt>Subtotal</dt>
            <dd>${invoice.amount.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t-2 border-gray-900 pt-2 text-gray-900">
            <dt>{t('invoice.total')}</dt>
            <dd>${invoice.amount.toFixed(2)}</dd>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="mt-12 border-t pt-6 text-center text-sm text-gray-500">
        <p>{t('invoice.thankYou')}</p>
      </footer>
    </div>
  );
};

export default InvoiceTemplate;
