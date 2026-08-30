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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Landmark className="h-7 w-7 text-[#ED1C24]" />
            Préstamos & Deudas Financieras
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Control riguroso de financiamientos y abonos de capital e intereses</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-[#ED1C24] font-bold uppercase">Saldo Deuda Total</div>
            <div className="text-xl font-black text-foreground">{formatCurrency(totalLoanBalance)}</div>
          </div>

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
            className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20"
          >
            <Plus className="h-4 w-4 text-[#FFD500]" />
            Registrar Préstamo
          </Button>
        </div>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base text-foreground font-bold">Listado de Préstamos Recibidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No hay préstamos registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3.5">Préstamo</th>
                    <th className="p-3.5">Acreedor</th>
                    <th className="p-3.5">Monto Original</th>
                    <th className="p-3.5">Total Pagado</th>
                    <th className="p-3.5">Saldo Pendiente</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        <div>{loan.loan_name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{loan.frequency} - {loan.total_installments} cuotas</div>
                      </td>
                      <td className="p-3.5 text-foreground font-medium">{loan.creditor}</td>
                      <td className="p-3.5 text-muted-foreground font-medium">{formatCurrency(loan.original_amount)}</td>
                      <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(loan.total_paid)}</td>
                      <td className="p-3.5 font-black text-[#ED1C24] text-base">{formatCurrency(loan.balance)}</td>
                      <td className="p-3.5">
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
                      <td className="p-3.5 text-right">
                        {loan.balance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(loan)}
                            className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold text-xs gap-1 shadow-md shadow-red-500/20"
                          >
                            <CreditCard className="h-3.5 w-3.5 text-[#FFD500]" />
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
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#ED1C24]" />
              Registrar Nuevo Préstamo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nombre / Identificador del Préstamo *</label>
              <Input
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="Ej. Préstamo de Capital de Trabajo"
                required
                className="bg-card border-input font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Acreedor / Prestamista / Banco *</label>
              <Input
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="Ej. Banco Industrial, Propietario..."
                required
                className="bg-card border-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Monto Original (Q) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="10000.00"
                  required
                  className="bg-card border-input font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Monto de Cuota (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="1000.00"
                  className="bg-card border-input font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setNewLoanOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Préstamo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pago Cuota Préstamo */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#ED1C24]" />
              Abonar a Préstamo: {selectedLoan?.loan_name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPayment} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-muted border border-border text-xs flex justify-between">
              <span className="text-muted-foreground font-medium">Saldo Pendiente de Capital:</span>
              <span className="font-black text-[#ED1C24] text-sm">{formatCurrency(selectedLoan?.balance)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Abono a Capital (Q) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  required
                  className="bg-card border-input font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground font-medium">Reduce la deuda (NO es gasto)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Pago de Intereses (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
                  className="bg-card border-input font-mono"
                />
                <span className="text-[10px] text-muted-foreground font-medium">Costo financiero (Gasto)</span>
              </div>
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
