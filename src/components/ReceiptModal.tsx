import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';
import type { Invoice, CartItem, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  cashTendered?: number;
  changeDue?: number;
  cashierName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  items,
  paymentMethod,
  referenceNumber,
  cashTendered = 0,
  changeDue = 0,
  cashierName = 'Cashier',
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const shortInvoiceId = invoice.id.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs select-none">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-stone-900 text-sm">Sale Completed Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Container (also used for printing) */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-stone-700 bg-[#f5f4ef]/60">
          <div id="printable-receipt" className="bg-white p-5 rounded-xl border border-stone-200 text-stone-800 shadow-xs">
            {/* Business Header */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <h2 className="text-base font-bold text-stone-900 tracking-wider">THE BAR &amp; GRILL</h2>
              <p className="text-[11px] text-stone-500 font-medium">Terminal 01 &bull; Commercial Counter POS</p>
              <p className="text-[10px] text-stone-400 mt-1">Tax ID: REG-8849-0129</p>
            </div>

            {/* Bill Metadata */}
            <div className="py-3 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Invoice:</span>
                <span className="font-bold text-stone-900">#{shortInvoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date/Time:</span>
                <span className="text-stone-700">{formatDateTime(invoice.created_at || new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Served By:</span>
                <span className="text-stone-900 font-semibold">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="uppercase font-bold text-stone-900">{paymentMethod}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Ref / Note:</span>
                  <span className="truncate max-w-[180px] text-stone-700">{referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-3 border-b border-dashed border-stone-300">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-stone-400 border-b border-stone-200">
                    <th className="pb-1 font-bold">ITEM</th>
                    <th className="pb-1 text-center font-bold">QTY</th>
                    <th className="pb-1 text-right font-bold">PRICE</th>
                    <th className="pb-1 text-right font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="text-stone-800">
                      <td className="py-1.5 pr-1 truncate max-w-[130px] font-medium">{item.menuItem.name}</td>
                      <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-1.5 text-right text-stone-600">{formatCurrency(item.menuItem.price)}</td>
                      <td className="py-1.5 text-right font-bold text-stone-900">
                        {formatCurrency(item.menuItem.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="pt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-bold text-stone-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Discount:</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Tax (GST/VAT):</span>
                <span className="font-bold text-stone-900">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>TOTAL:</span>
                <span className="text-[#1b4332] font-bold text-base">{formatCurrency(invoice.total_amount)}</span>
              </div>

              {/* Cash Tender Details */}
              {paymentMethod === 'cash' && cashTendered > 0 && (
                <div className="pt-2 border-t border-stone-100 space-y-1 text-[11px] text-stone-600">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span className="font-bold text-stone-900">{formatCurrency(cashTendered)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900">
                    <span>Change Due:</span>
                    <span className="text-emerald-800">{formatCurrency(changeDue)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-4 mt-3 border-t border-dashed border-stone-300 text-[10px] text-stone-400 font-medium">
              <p>Thank you for your visit!</p>
              <p className="mt-0.5">Please retain this receipt for your records.</p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-stone-600" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b4332] hover:bg-[#143628] active:bg-[#0f281e] text-stone-100 font-semibold text-xs tracking-wide uppercase transition-colors shadow-xs"
          >
            Start Next Sale
          </button>
        </div>
      </div>
    </div>
  );
};
