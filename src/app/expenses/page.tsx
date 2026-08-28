"use client";

import React, { useEffect, useState } from "react";
import { financeService } from "@/services/financeService";
import { Expense, RecurringExpense, ExpenseCategory, ExpenseFrequency, PaymentMethod } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { TrendingDown, Plus, RefreshCw, Calendar, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"registered" | "recurring">("registered");

  // Modal Registro Gasto
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<ExpenseFrequency>("UNICO");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [status, setStatus] = useState<"PAGADO" | "PENDIENTE">("PAGADO");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Gasto Recurrente
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recDesc, setRecDesc] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recFreq, setRecFreq] = useState<ExpenseFrequency>("MENSUAL");
  const [recCatId, setRecCatId] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, recData, catData] = await Promise.all([
        financeService.getExpenses(),
        financeService.getRecurringExpenses(),
        financeService.getExpenseCategories(),
      ]);
      setExpenses(expData);
      setRecurring(recData);
      setCategories(catData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenExpenseModal = () => {
    setDescription("");
    setAmount("");
    setCategoryId(categories.length > 0 ? categories[0].id : "");
    setFrequency("UNICO");
    setPaymentMethod("EFECTIVO");
    setStatus("PAGADO");
    setNotes("");
    setErrorMsg("");
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("El monto del gasto debe ser mayor a cero.");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("Debe ingresar la descripción del gasto.");
      return;
    }

    setSubmitting(true);
    try {
      await financeService.createExpense({
        category_id: categoryId || undefined,
        description: description.trim(),
        amount: amt,
        frequency,
        status,
        payment_method: paymentMethod,
        registered_by: user?.id,
        notes: notes.trim() || undefined,
      });

      setExpenseModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const amt = parseFloat(recAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("El monto debe ser mayor a cero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeService.createRecurringExpense({
        category_id: recCatId || undefined,
        description: recDesc.trim(),
        expected_amount: amt,
        frequency: recFreq,
      });

      setRecurringModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar gasto recurrente.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalRegistered = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-amber-400" />
            Gastos & Gastos Recurrentes
          </h1>
          <p className="text-sm text-slate-400">Administra los egresos operativos diarios, mensuales y proyectados</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRecDesc("");
              setRecAmount("");
              setRecFreq("MENSUAL");
              setRecCatId(categories.length > 0 ? categories[0].id : "");
              setErrorMsg("");
              setRecurringModalOpen(true);
            }}
            className="border-slate-800 text-slate-300 gap-2"
          >
            <RefreshCw className="h-4 w-4 text-blue-400" />
            Configurar Gasto Recurrente
          </Button>

          <Button onClick={handleOpenExpenseModal} className="bg-amber-600 hover:bg-amber-500 font-semibold gap-2 shadow-lg shadow-amber-600/20">
            <Plus className="h-4 w-4" />
            Registrar Gasto Efectivo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase">Gastos Totales Registrados</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(totalRegistered)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase">Gastos Recurrentes Configurados</div>
            <div className="text-2xl font-black text-white mt-1">{recurring.length} Plantillas</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("registered")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "registered"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Gastos Registrados ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab("recurring")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "recurring"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          Configuración de Recurrentes ({recurring.length})
        </button>
      </div>

      {activeTab === "registered" ? (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Listado de Gastos Efectivamente Pagados / Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center p-8 text-slate-500">No hay gastos registrados aún.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Descripción</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Frecuencia</th>
                      <th className="p-3">Método Pago</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-xs text-slate-400 font-mono">{formatDate(exp.expense_date)}</td>
                        <td className="p-3 font-semibold text-white">{exp.description}</td>
                        <td className="p-3 text-xs">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {exp.category?.name || "General"}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-400">{exp.frequency}</td>
                        <td className="p-3 text-xs text-slate-300">{exp.payment_method}</td>
                        <td className="p-3">
                          <Badge variant={exp.status === "PAGADO" ? "success" : "warning"}>
                            {exp.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-amber-400 text-base">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* PLANTILLAS GASTOS RECURRENTES */
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Plantillas de Gastos Recurrentes (Ej. Alquiler, Luz Q1000, Internet Q300)</CardTitle>
            <CardDescription>Sirven para proyectar el impacto financiero sin duplicar filas futuras innecesarias</CardDescription>
          </CardHeader>
          <CardContent>
            {recurring.length === 0 ? (
              <div className="text-center p-8 text-slate-500">No hay gastos recurrentes configurados.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurring.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-sm">{rec.description}</h4>
                      <Badge variant="outline">{rec.frequency}</Badge>
                    </div>
                    <div className="text-xs text-slate-400">Categoría: {rec.category?.name || "General"}</div>
                    <div className="text-xl font-black text-amber-400">{formatCurrency(rec.expected_amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Registrar Gasto */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Registrar Gasto Efectivo</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Descripción del Gasto</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Pago de luz del mes, compra de bolsas..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Monto (Q)</label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Frecuencia</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UNICO">Único</option>
                  <option value="DIARIO">Diario</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="MENSUAL">Mensual</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setExpenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Gasto Recurrente */}
      <Dialog open={recurringModalOpen} onOpenChange={setRecurringModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Configurar Gasto Recurrente</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRecurring} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Concepto / Nombre</label>
              <Input
                value={recDesc}
                onChange={(e) => setRecDesc(e.target.value)}
                placeholder="Ej. Alquiler de Local, Energía Eléctrica..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Monto Estimado / Fijo (Q)</label>
              <Input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value)}
                placeholder="Ej. 1000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Frecuencia</label>
              <select
                value={recFreq}
                onChange={(e) => setRecFreq(e.target.value as ExpenseFrequency)}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
              >
                <option value="DIARIO">Diario (Ej. Q400 gastos diarios)</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSUAL">Mensual (Ej. Q1000 luz, Q300 internet)</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRecurringModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
