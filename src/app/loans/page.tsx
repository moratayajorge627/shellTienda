"use client";

import React, { useEffect, useState } from "react";
import { financeService } from "@/services/financeService";
import { Loan, PaymentMethod, ExpenseFrequency } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Landmark, Plus, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // New Loan Modal
  const [newLoanOpen, setNewLoanOpen] = useState(false);
  const [loanName, setLoanName] = useState("");
  const [creditor, setCreditor] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [frequency, setFrequency] = useState<ExpenseFrequency>("MENSUAL");

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await financeService.getLoans();
      setLoans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const orig = parseFloat(originalAmount);
    if (isNaN(orig) || orig <= 0) {
      setErrorMsg("El monto del préstamo debe ser mayor a cero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeService.createLoan({
        loan_name: loanName.trim(),
        creditor: creditor.trim(),
        original_amount: orig,
        interest_rate: parseFloat(interestRate) || 0,
        total_installments: parseInt(totalInstallments) || 1,
        installment_amount: parseFloat(installmentAmount) || 0,
        frequency,
      });

      setNewLoanOpen(false);
      await loadLoans();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear el préstamo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setPrincipalAmount(loan.installment_amount > 0 ? loan.installment_amount.toString() : "500.00");
    setInterestAmount("0.00");
    setPaymentMethod("EFECTIVO");
    setErrorMsg("");
    setPayModalOpen(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedLoan) return;

    const princ = parseFloat(principalAmount);
    const inth = parseFloat(interestAmount) || 0;

    if (isNaN(princ) || princ < 0) {
      setErrorMsg("El abono de capital debe ser mayor o igual a cero.");
      return;
    }

    if (princ + inth <= 0) {
      setErrorMsg("El total del pago debe ser mayor a cero.");
      return;
    }

    if (princ > selectedLoan.balance) {
      setErrorMsg("El abono de capital excede el saldo pendiente del préstamo.");
      return;
    }

    setSubmitting(true);
    try {
      await financeService.registerLoanPayment({
        loan_id: selectedLoan.id,
        principal_amount: princ,
        interest_amount: inth,
        payment_method: paymentMethod,
        user_id: user?.id,
      });

      setPayModalOpen(false);
      await loadLoans();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalLoanBalance = loans.reduce((sum, l) => sum + l.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-indigo-400" />
            Préstamos & Deudas Financieras
          </h1>
          <p className="text-sm text-slate-400">Control riguroso de financiamientos y abonos de capital e intereses</p>
        </div>

        <div className="flex items-center gap-3">
          <Card className="glass-card px-4 py-2 border-indigo-500/30">
            <div className="text-[10px] text-indigo-300 font-semibold uppercase">Saldo Deuda Total</div>
            <div className="text-xl font-black text-white">{formatCurrency(totalLoanBalance)}</div>
          </Card>

          <Button
            onClick={() => {
              setLoanName("");
              setCreditor("");
              setOriginalAmount("");
              setInterestRate("0");
              setTotalInstallments("12");
              setInstallmentAmount("");
              setFrequency("MENSUAL");
              setErrorMsg("");
              setNewLoanOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 font-semibold gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            Registrar Préstamo
          </Button>
        </div>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Listado de Préstamos Recibidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No hay préstamos registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Préstamo</th>
                    <th className="p-3">Acreedor</th>
                    <th className="p-3">Monto Original</th>
                    <th className="p-3">Total Pagado</th>
                    <th className="p-3">Saldo Pendiente</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        <div>{loan.loan_name}</div>
                        <div className="text-xs text-slate-400 font-normal">{loan.frequency} - {loan.total_installments} cuotas</div>
                      </td>
                      <td className="p-3 text-slate-300">{loan.creditor}</td>
                      <td className="p-3 text-slate-400">{formatCurrency(loan.original_amount)}</td>
                      <td className="p-3 text-emerald-400">{formatCurrency(loan.total_paid)}</td>
                      <td className="p-3 font-bold text-red-400 text-base">{formatCurrency(loan.balance)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            loan.status === "PAGADO"
                              ? "success"
                              : loan.status === "PARCIALMENTE_PAGADO"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {loan.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {loan.balance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(loan)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Abonar Cuota
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

      {/* Modal Registrar Préstamo */}
      <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nombre / Identificador del Préstamo</label>
              <Input
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="Ej. Préstamo de Capital de Trabajo"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Acreedor / Prestamista / Banco</label>
              <Input
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="Ej. Banco Industrial, Propietario..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Monto Original (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="10000.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Monto de Cuota (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="1000.00"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewLoanOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Préstamo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pago Cuota Préstamo */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Abonar a Préstamo: {selectedLoan?.loan_name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPayment} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">Saldo Pendiente de Capital:</span>
              <span className="font-bold text-red-400">{formatCurrency(selectedLoan?.balance)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Abono a Capital (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  required
                />
                <span className="text-[10px] text-slate-500">Reduce la deuda (NO es gasto)</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Pago de Intereses (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
                />
                <span className="text-[10px] text-slate-500">Costo financiero (Gasto)</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
