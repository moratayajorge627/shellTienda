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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <DollarSign className="h-7 w-7 text-[#ED1C24]" />
            Cuentas por Pagar (Deudas a Proveedores)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Control de compras a crédito y abonos realizados</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-4">
          <div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Saldo Total Pendiente</div>
            <div className="text-2xl font-black text-foreground">{formatCurrency(totalPending)}</div>
          </div>
        </div>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#ED1C24]" />
            Listado de Obligaciones Pendientes
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Registro de saldos pendientes con proveedores</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No hay cuentas por pagar activas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3.5">Proveedor</th>
                    <th className="p-3.5">Concepto</th>
                    <th className="p-3.5">Fecha Vencimiento</th>
                    <th className="p-3.5">Monto Original</th>
                    <th className="p-3.5">Abonado</th>
                    <th className="p-3.5">Saldo Pendiente</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {debts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        {debt.supplier?.name || "Proveedor General"}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground font-medium">{debt.concept}</td>
                      <td className="p-3.5 text-xs font-mono text-muted-foreground">
                        {formatDate(debt.due_date)}
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">{formatCurrency(debt.original_amount)}</td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(debt.total_paid)}</td>
                      <td className="p-3.5 font-black text-amber-500 text-base">{formatCurrency(debt.balance)}</td>
                      <td className="p-3.5">
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
                      <td className="p-3.5 text-right">
                        {debt.balance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(debt)}
                            className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold text-xs gap-1 shadow-md shadow-red-500/20"
                          >
                            <CreditCard className="h-3.5 w-3.5 text-[#FFD500]" />
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
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#ED1C24]" />
              Registrar Pago / Abono a Proveedor
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePaySubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-muted border border-border space-y-1.5 text-xs">
              <div><span className="text-muted-foreground font-medium">Proveedor:</span> <span className="font-bold text-foreground">{selectedDebt?.supplier?.name}</span></div>
              <div><span className="text-muted-foreground font-medium">Saldo Pendiente Actual:</span> <span className="font-black text-amber-500 text-sm">{formatCurrency(selectedDebt?.balance)}</span></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Monto a Abonar (Q) *</label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="bg-card border-input font-mono font-bold text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full font-bold focus:ring-2 focus:ring-[#ED1C24]"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">No. Referencia / Comprobante (Opcional)</label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej. TRANS-908234"
                className="bg-card border-input font-mono"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setPayModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
