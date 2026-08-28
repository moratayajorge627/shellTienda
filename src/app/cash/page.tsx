"use client";

import React, { useEffect, useState } from "react";
import { posService } from "@/services/posService";
import { CashRegister, CashMovement, CashMovementType } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { WalletCards, Lock, Unlock, PlusCircle, MinusCircle, History, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CashPage() {
  const { user } = useAuth();
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Open Modal
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState("200.00");

  // Close Modal (Arqueo)
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [countedAmount, setCountedAmount] = useState("");

  // Movement Modal
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movType, setMovType] = useState<CashMovementType>("INGRESO_EXTRA");
  const [movAmount, setMovAmount] = useState("");
  const [movDescription, setMovDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCashData = async () => {
    setLoading(true);
    try {
      const reg = await posService.getActiveCashRegister();
      setActiveRegister(reg);

      if (reg) {
        const movs = await posService.getCashMovements(reg.id);
        setMovements(movs);
      } else {
        setMovements([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashData();
  }, []);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!user) return;
    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) {
      setErrorMsg("El monto inicial no puede ser negativo.");
      return;
    }

    setSubmitting(true);
    try {
      await posService.openCashRegister(amount, user.id);
      setOpenModalOpen(false);
      await loadCashData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al abrir la caja.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!activeRegister || !user) return;

    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      setErrorMsg("El efectivo contado no puede ser negativo.");
      return;
    }

    setSubmitting(true);
    try {
      await posService.closeCashRegister(activeRegister.id, counted, user.id);
      setCloseModalOpen(false);
      await loadCashData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cerrar la caja.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!activeRegister || !user) return;

    const amt = parseFloat(movAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("El monto debe ser mayor a cero.");
      return;
    }

    if (!movDescription.trim()) {
      setErrorMsg("Debe ingresar la descripción del movimiento.");
      return;
    }

    setSubmitting(true);
    try {
      await posService.addCashMovement({
        cash_register_id: activeRegister.id,
        user_id: user.id,
        movement_type: movType,
        amount: amt,
        description: movDescription.trim(),
      });
      setMovModalOpen(false);
      setMovAmount("");
      setMovDescription("");
      await loadCashData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar movimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular totales en caja activa
  const totalSalesCash = movements
    .filter((m) => m.movement_type === "VENTA")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOtherIncomes = movements
    .filter((m) => m.movement_type === "INGRESO_EXTRA")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpensesCash = movements
    .filter((m) => m.movement_type !== "VENTA" && m.movement_type !== "INGRESO_EXTRA")
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCurrentCash =
    (activeRegister?.initial_amount || 0) + totalSalesCash + totalOtherIncomes - totalExpensesCash;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <WalletCards className="h-6 w-6 text-emerald-400" />
            Caja Diaria & Arqueo
          </h1>
          <p className="text-sm text-slate-400">Apertura, movimientos de turno y cierre auditado de caja</p>
        </div>

        <div>
          {!activeRegister ? (
            <Button
              onClick={() => {
                setInitialAmount("200.00");
                setErrorMsg("");
                setOpenModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Unlock className="h-4 w-4" />
              Abrir Turno de Caja
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMovAmount("");
                  setMovDescription("");
                  setErrorMsg("");
                  setMovModalOpen(true);
                }}
                className="border-slate-800 text-slate-300 gap-2"
              >
                <PlusCircle className="h-4 w-4 text-blue-400" />
                Registrar Movimiento
              </Button>

              <Button
                onClick={() => {
                  setCountedAmount(expectedCurrentCash.toFixed(2));
                  setErrorMsg("");
                  setCloseModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-500 font-bold gap-2 shadow-lg shadow-red-600/20"
              >
                <Lock className="h-4 w-4" />
                Cerrar & Arqueo de Caja
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ESTADO CAJA ACTIVA */}
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : activeRegister ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="text-xs text-slate-400 font-semibold uppercase">Monto Inicial</div>
              <div className="text-2xl font-bold text-white mt-2">{formatCurrency(activeRegister.initial_amount)}</div>
              <div className="text-xs text-slate-500 mt-1">Apertura: {formatDateTime(activeRegister.opened_at)}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="text-xs text-emerald-400 font-semibold uppercase">Ventas en Efectivo</div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(totalSalesCash)}</div>
              <div className="text-xs text-slate-500 mt-1">Ingresos del turno</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="text-xs text-amber-400 font-semibold uppercase">Egresos & Retiros</div>
              <div className="text-2xl font-bold text-amber-400 mt-2">{formatCurrency(totalExpensesCash)}</div>
              <div className="text-xs text-slate-500 mt-1">Gastos y pagos de caja</div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/30">
            <CardContent className="p-6">
              <div className="text-xs text-emerald-300 font-semibold uppercase">Efectivo Esperado en Caja</div>
              <div className="text-3xl font-black text-white mt-2">{formatCurrency(expectedCurrentCash)}</div>
              <div className="text-xs text-emerald-200/70 mt-1">Monto para arqueo de cierre</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-card p-8 text-center space-y-3">
          <Lock className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No hay ninguna caja abierta en este momento</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Abre un turno de caja indicando el monto inicial en quetzales para poder comenzar a registrar ventas e ingresos de efectivo.
          </p>
        </Card>
      )}

      {/* MOVIMIENTOS DEL TURNO */}
      {activeRegister && (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Movimientos de Efectivo del Turno</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center p-6 text-slate-500">No hay movimientos registrados en esta caja.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Tipo Movimiento</th>
                      <th className="p-3">Descripción</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {movements.map((mov) => {
                      const isIncome = ["VENTA", "INGRESO_EXTRA"].includes(mov.movement_type);

                      return (
                        <tr key={mov.id}>
                          <td className="p-3 text-xs text-slate-400 font-mono">{formatDateTime(mov.created_at)}</td>
                          <td className="p-3">
                            <Badge variant={isIncome ? "success" : "warning"} className="text-[11px]">
                              {mov.movement_type}
                            </Badge>
                          </td>
                          <td className="p-3 text-white font-medium">{mov.description}</td>
                          <td className={`p-3 text-right font-bold font-mono text-base ${isIncome ? "text-emerald-400" : "text-amber-400"}`}>
                            {isIncome ? `+${formatCurrency(mov.amount)}` : `-${formatCurrency(mov.amount)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Apertura de Caja */}
      <Dialog open={openModalOpen} onOpenChange={setOpenModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Apertura de Caja Diaria</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOpenRegister} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Monto Inicial en Efectivo (Fondo de Caja Q)</label>
              <Input
                type="number"
                step="0.50"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Abrir Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cierre y Arqueo de Caja */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-400">Arqueo & Cierre de Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCloseRegister} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Efectivo Esperado en Sistema:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(expectedCurrentCash)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Efectivo Físico Contado (Q)</label>
              <Input
                type="number"
                step="0.50"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                required
              />
            </div>

            {countedAmount !== "" && !isNaN(parseFloat(countedAmount)) && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Diferencia de Arqueo:</span>
                <span className={`font-bold font-mono ${parseFloat(countedAmount) - expectedCurrentCash >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(parseFloat(countedAmount) - expectedCurrentCash)}
                </span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCloseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} variant="destructive">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Cierre de Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Movimiento de Caja */}
      <Dialog open={movModalOpen} onOpenChange={setMovModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento de Caja</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMovement} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Tipo de Movimiento</label>
              <select
                value={movType}
                onChange={(e) => setMovType(e.target.value as CashMovementType)}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
              >
                <option value="INGRESO_EXTRA">Ingreso Extra (+)</option>
                <option value="EGRESO_GASTO">Egreso por Gasto (-)</option>
                <option value="PAGO_PROVEEDOR">Pago a Proveedor (-)</option>
                <option value="RETIRO">Retiro de Efectivo (-)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Monto (Q)</label>
              <Input
                type="number"
                step="0.50"
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Descripción / Concepto</label>
              <Input
                value={movDescription}
                onChange={(e) => setMovDescription(e.target.value)}
                placeholder="Ej. Pago de flete, retiro de cambio..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMovModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Movimiento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
