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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <WalletCards className="h-7 w-7 text-[#ED1C24]" />
            Caja Diaria & Arqueo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Apertura, movimientos de turno y cierre auditado de caja</p>
        </div>

        <div>
          {!activeRegister ? (
            <Button
              onClick={() => {
                setInitialAmount("200.00");
                setErrorMsg("");
                setOpenModalOpen(true);
              }}
              className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20"
            >
              <Unlock className="h-4 w-4 text-[#FFD500]" />
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
                className="border-border text-foreground hover:bg-muted gap-2 font-bold"
              >
                <PlusCircle className="h-4 w-4 text-[#ED1C24]" />
                Registrar Movimiento
              </Button>

              <Button
                onClick={() => {
                  setCountedAmount(expectedCurrentCash.toFixed(2));
                  setErrorMsg("");
                  setCloseModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold gap-2 shadow-lg shadow-red-600/20"
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
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
        </div>
      ) : activeRegister ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-border">
            <CardContent className="p-6">
              <div className="text-xs text-muted-foreground font-bold uppercase">Monto Inicial</div>
              <div className="text-2xl font-black text-foreground mt-2">{formatCurrency(activeRegister.initial_amount)}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Apertura: {formatDateTime(activeRegister.opened_at)}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardContent className="p-6">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Ventas en Efectivo</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(totalSalesCash)}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Ingresos del turno</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardContent className="p-6">
              <div className="text-xs text-amber-500 font-bold uppercase">Egresos & Retiros</div>
              <div className="text-2xl font-black text-amber-500 mt-2">{formatCurrency(totalExpensesCash)}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Gastos y pagos de caja</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[#ED1C24]/30 bg-red-500/5">
            <CardContent className="p-6">
              <div className="text-xs text-[#ED1C24] font-bold uppercase">Efectivo Esperado en Caja</div>
              <div className="text-3xl font-black text-foreground mt-2">{formatCurrency(expectedCurrentCash)}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">Monto para arqueo de cierre</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-card p-12 text-center space-y-3 border-border">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No hay ninguna caja abierta en este momento</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto font-medium">
            Abre un turno de caja indicando el monto inicial en quetzales para poder comenzar a registrar ventas e ingresos de efectivo.
          </p>
        </Card>
      )}

      {/* MOVIMIENTOS DEL TURNO */}
      {activeRegister && (
        <Card className="glass-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-[#ED1C24]" />
              Movimientos de Efectivo del Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground font-medium">No hay movimientos registrados en esta caja.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="p-3.5">Hora</th>
                      <th className="p-3.5">Tipo Movimiento</th>
                      <th className="p-3.5">Descripción</th>
                      <th className="p-3.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((mov) => {
                      const isIncome = ["VENTA", "INGRESO_EXTRA"].includes(mov.movement_type);

                      return (
                        <tr key={mov.id} className="hover:bg-muted/50 transition-colors">
                          <td className="p-3.5 text-xs text-muted-foreground font-mono">{formatDateTime(mov.created_at)}</td>
                          <td className="p-3.5">
                            <Badge variant={isIncome ? "success" : "warning"} className="text-[11px] font-bold">
                              {mov.movement_type}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-foreground font-semibold">{mov.description}</td>
                          <td className={`p-3.5 text-right font-black font-mono text-base ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
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
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Unlock className="h-5 w-5 text-[#ED1C24]" />
              Apertura de Caja Diaria
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOpenRegister} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Monto Inicial en Efectivo (Fondo de Caja Q) *</label>
              <Input
                type="number"
                step="0.50"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                required
                className="bg-card border-input font-mono font-bold"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setOpenModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Abrir Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cierre y Arqueo de Caja */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-red-500 font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              Arqueo & Cierre de Caja
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCloseRegister} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted border border-border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Efectivo Esperado en Sistema:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(expectedCurrentCash)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Efectivo Físico Contado (Q) *</label>
              <Input
                type="number"
                step="0.50"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                required
                className="bg-card border-input font-mono font-bold"
              />
            </div>

            {countedAmount !== "" && !isNaN(parseFloat(countedAmount)) && (
              <div className="p-3 rounded-lg bg-muted border border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Diferencia de Arqueo:</span>
                <span className={`font-black font-mono ${parseFloat(countedAmount) - expectedCurrentCash >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {formatCurrency(parseFloat(countedAmount) - expectedCurrentCash)}
                </span>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setCloseModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-500 text-white font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Cierre de Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Movimiento de Caja */}
      <Dialog open={movModalOpen} onOpenChange={setMovModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#ED1C24]" />
              Registrar Movimiento de Caja
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMovement} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tipo de Movimiento</label>
              <select
                value={movType}
                onChange={(e) => setMovType(e.target.value as CashMovementType)}
                className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full font-bold focus:ring-2 focus:ring-[#ED1C24]"
              >
                <option value="INGRESO_EXTRA">Ingreso Extra (+)</option>
                <option value="EGRESO_GASTO">Egreso por Gasto (-)</option>
                <option value="PAGO_PROVEEDOR">Pago a Proveedor (-)</option>
                <option value="RETIRO">Retiro de Efectivo (-)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Monto (Q) *</label>
              <Input
                type="number"
                step="0.50"
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                required
                className="bg-card border-input font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Descripción / Concepto *</label>
              <Input
                value={movDescription}
                onChange={(e) => setMovDescription(e.target.value)}
                placeholder="Ej. Pago de flete, retiro de cambio..."
                required
                className="bg-card border-input"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setMovModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Movimiento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
