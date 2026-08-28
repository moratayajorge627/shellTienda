"use client";

import React, { useEffect, useState } from "react";
import { supplierService } from "@/services/supplierService";
import { AccountPayable, PaymentMethod } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<AccountPayable | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadDebts = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getAccountsPayable();
      setDebts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const handleOpenPayModal = (debt: AccountPayable) => {
    setSelectedDebt(debt);
    setPayAmount(debt.balance.toString());
    setPaymentMethod("EFECTIVO");
    setReferenceNumber("");
    setNotes("");
    setErrorMsg("");
    setSuccessMsg("");
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedDebt) return;
    const amount = parseFloat(payAmount);

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("El monto a pagar debe ser mayor a cero.");
      return;
    }

    if (amount > selectedDebt.balance) {
      setErrorMsg("El monto excede el saldo pendiente de la deuda.");
      return;
    }

    setSubmitting(true);
    try {
      await supplierService.registerAccountPayablePayment({
        account_payable_id: selectedDebt.id,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        user_id: user?.id,
      });

      setSuccessMsg("Abono/Pago a proveedor registrado exitosamente.");
      setTimeout(async () => {
        setPayModalOpen(false);
        await loadDebts();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending = debts.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-400" />
            Cuentas por Pagar (Deudas a Proveedores)
          </h1>
          <p className="text-sm text-slate-400">Control de compras a crédito y abonos realizados</p>
        </div>

        <Card className="glass-card p-4 border-amber-500/30 flex items-center gap-4">
          <div>
            <div className="text-xs text-amber-400 font-semibold uppercase">Saldo Total Pendiente</div>
            <div className="text-2xl font-black text-white">{formatCurrency(totalPending)}</div>
          </div>
        </Card>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Listado de Obligaciones Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No hay cuentas por pagar activas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Proveedor</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3">Fecha Vencimiento</th>
                    <th className="p-3">Monto Original</th>
                    <th className="p-3">Abonado</th>
                    <th className="p-3">Saldo Pendiente</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {debts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        {debt.supplier?.name || "Proveedor General"}
                      </td>
                      <td className="p-3 text-xs text-slate-300">{debt.concept}</td>
                      <td className="p-3 text-xs font-mono text-slate-400">
                        {formatDate(debt.due_date)}
                      </td>
                      <td className="p-3 text-slate-400">{formatCurrency(debt.original_amount)}</td>
                      <td className="p-3 text-emerald-400">{formatCurrency(debt.total_paid)}</td>
                      <td className="p-3 font-bold text-amber-400 text-base">{formatCurrency(debt.balance)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            debt.status === "PAGADA"
                              ? "success"
                              : debt.status === "PARCIAL"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {debt.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {debt.balance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(debt)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Abonar / Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Registrar Pago de Deuda */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Registrar Pago / Abono a Proveedor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePaySubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">Proveedor: <span className="font-bold text-white">{selectedDebt?.supplier?.name}</span></div>
              <div className="text-slate-400">Saldo Pendiente Actual: <span className="font-bold text-amber-400">{formatCurrency(selectedDebt?.balance)}</span></div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Monto a Abonar (Q)</label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">No. Referencia / Comprobante (Opcional)</label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej. TRANS-908234"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
