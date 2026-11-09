import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Receipt } from 'lucide-react';
import type { Invoice } from '../types';
import { billingService } from '../services/billingService';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface RecentBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecentBillsModal: React.FC<RecentBillsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await billingService.getRecentInvoices(25);
      setInvoices(data);
      if (data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(data[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvoices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs select-none">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-stone-800" />
            <h2 className="text-sm font-bold text-stone-900">Recent Completed Invoices</h2>
            <span className="text-xs text-stone-500 font-mono ml-2 font-semibold">({invoices.length} entries)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadInvoices}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors shadow-xs"
              title="Refresh invoices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-400 hover:text-stone-700 border border-stone-200 transition-colors shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dual Pane View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-stone-200">
          {/* Left Table: Invoices List */}
          <div className="md:col-span-7 overflow-y-auto">
            {invoices.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-stone-400 text-xs font-medium">
                No invoices recorded yet. Complete sales in Counter Billing.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-stone-100 border-b border-stone-200 text-[11px] text-stone-600 uppercase font-mono font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {invoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-stone-100 text-stone-900 font-bold border-l-4 border-stone-900'
                            : 'hover:bg-stone-50 text-stone-700'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="text-stone-900 font-bold">#{inv.id.slice(0, 8).toUpperCase()}</span>
                          {inv.table && (
                            <span className="block text-[10px] text-amber-900 font-semibold">
                              {inv.table.table_number}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                          {formatCurrency(inv.total_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Pane: Invoice Details */}
          <div className="md:col-span-5 p-4 overflow-y-auto bg-stone-50 text-xs flex flex-col">
            {selectedInvoice ? (
              <div className="flex-1 flex flex-col space-y-4 font-mono">
                <div className="pb-3 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      Invoice #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                    </div>
                    {selectedInvoice.table && (
                      <div className="text-xs text-amber-900 font-bold">
                        Table {selectedInvoice.table.table_number} ({selectedInvoice.table.section || 'Dine-In'})
                      </div>
                    )}
                    <div className="text-[11px] text-stone-500">
                      {formatDateTime(selectedInvoice.created_at)}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-white text-stone-800 border border-stone-200 text-[11px] font-bold shadow-xs">
                    {selectedInvoice.payments?.[0]?.payment_method?.toUpperCase() || 'PAID'}
                  </span>
                </div>

                {/* Line Items */}
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold mb-2">
                    Line Items
                  </div>
                  <div className="space-y-1.5">
                    {selectedInvoice.items?.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-1.5 px-2.5 rounded-lg bg-white border border-stone-200 text-[11px] shadow-xs"
                      >
                        <span className="truncate pr-2 text-stone-800 font-medium">
                          {item.quantity}x {item.item_name}
                        </span>
                        <span className="font-bold text-stone-900 shrink-0">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1.5 text-[11px] shadow-xs">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal:</span>
                    <span className="text-stone-800 font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500">
                    <span>Tax (GST/VAT):</span>
                    <span className="text-stone-800 font-semibold">{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 pt-1.5 border-t border-stone-100 text-xs">
                    <span>Total Paid:</span>
                    <span className="text-[#1b4332] text-sm font-bold">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>

                {/* Reference Note if any */}
                {selectedInvoice.payments?.[0]?.reference_number && (
                  <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                    <span className="font-bold text-stone-800">Ref / Note: </span>
                    {selectedInvoice.payments[0].reference_number}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-stone-400 text-xs font-medium">
                Select an invoice on the left to view details.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
