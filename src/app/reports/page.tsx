"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { PieChart, TrendingUp, TrendingDown, DollarSign, Receipt, FileText, Calendar, Filter, ArrowUpRight, ArrowDownRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("TODAY");

  // Ejemplo financiero real (Requerimiento #51):
  // Ventas: Q5,000 | Costo: Q3,000 | Ganancia Bruta: Q2,000 | Gastos: Q1,400 (Q400 diario + Q1000 luz) | Resultado Neto: Q600
  // Préstamo recibido: Q5,000 (Flujo +, NO venta) | Pago capital: Q500 (Flujo -, Reducción Deuda, NO gasto)
  const financialData = {
    grossSales: 5000.00,
    discounts: 0.00,
    netSales: 5000.00,
    cogs: 3000.00, // Costo de mercadería vendida histórico
    grossProfit: 2000.00, // Ventas Netas - COGS
    operatingExpenses: 1400.00, // Q400 diarios + Q1000 energía eléctrica
    otherExpenses: 0.00,
    otherIncomes: 0.00,
    netResult: 600.00, // Ganancia Real Limpia

    // Flujo de Efectivo
    cashFlowIn: 10000.00, // Q5000 ventas + Q5000 préstamo recibido
    cashFlowOut: 4900.00, // Q3000 compras + Q1400 gastos + Q500 capital préstamo
    netCashFlow: 5100.00,

    // Obligaciones
    accountsPayable: 5000.00,
    loansBalance: 9500.00, // Q10000 - Q500 abonados
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="h-6 w-6 text-blue-400" />
            Reportes & Resultado Financiero Real
          </h1>
          <p className="text-sm text-slate-400">Separación rigurosa entre Utilidad Real (P&L), Flujo de Efectivo y Pasivos</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <Button
            size="sm"
            variant={dateRange === "TODAY" ? "default" : "ghost"}
            onClick={() => setDateRange("TODAY")}
            className="text-xs"
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant={dateRange === "MONTH" ? "default" : "ghost"}
            onClick={() => setDateRange("MONTH")}
            className="text-xs"
          >
            Mes Actual
          </Button>
        </div>
      </div>

      <Tabs defaultValue="incomeStatement" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="incomeStatement">Estado de Resultados</TabsTrigger>
          <TabsTrigger value="cashFlow">Flujo de Efectivo</TabsTrigger>
          <TabsTrigger value="liabilities">Pasivos & Deudas</TabsTrigger>
        </TabsList>

        {/* 1. ESTADO DE RESULTADOS (P&L / UTILIDAD REAL) */}
        <TabsContent value="incomeStatement" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-slate-400 uppercase">Ventas Netas</span>
                <div className="text-2xl font-black text-white mt-1">{formatCurrency(financialData.netSales)}</div>
                <div className="text-xs text-slate-500 mt-1">Ventas Brutas - Descuentos</div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-emerald-400 uppercase">Ganancia Bruta</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(financialData.grossProfit)}</div>
                <div className="text-xs text-slate-500 mt-1">Ventas Netas - Costo de Ventas (Q3,000)</div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-gradient-to-br from-blue-950/60 to-slate-900 border-blue-500/30">
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-blue-300 uppercase">RESULTADO NETO REAL (UTILIDAD)</span>
                <div className="text-3xl font-black text-white mt-1">{formatCurrency(financialData.netResult)}</div>
                <div className="text-xs text-blue-200/80 mt-1">Dinero real ganado tras costos y gastos</div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-400" />
                Desglose del Estado de Resultados (Ejemplo Real Caso de Uso)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 font-semibold">(+) Ventas Brutas:</span>
                  <span className="font-bold text-white">{formatCurrency(financialData.grossSales)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">(-) Descuentos Concedidos:</span>
                  <span className="text-slate-400">-{formatCurrency(financialData.discounts)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-bold">
                  <span className="text-white">(=) VENTAS NETAS:</span>
                  <span className="text-white">{formatCurrency(financialData.netSales)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-red-400">(-) Costo de Mercadería Vendida (COGS Histórico):</span>
                  <span className="font-bold text-red-400">-{formatCurrency(financialData.cogs)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 font-bold">
                  <span className="text-emerald-400">(=) GANANCIA BRUTA:</span>
                  <span className="text-emerald-400">{formatCurrency(financialData.grossProfit)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-amber-400">(-) Gastos Operativos (Gastos diarios Q400 + Luz Q1000):</span>
                  <span className="font-bold text-amber-400">-{formatCurrency(financialData.operatingExpenses)}</span>
                </div>

                <div className="flex justify-between p-4 rounded-xl bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/40 font-black text-lg">
                  <span className="text-white">(=) RESULTADO NETO (UTILIDAD REAL):</span>
                  <span className="text-blue-400">{formatCurrency(financialData.netResult)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. FLUJO DE EFECTIVO */}
        <TabsContent value="cashFlow" className="space-y-6 pt-4">
          <Card className="glass-card border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Estado de Flujo de Efectivo
              </CardTitle>
              <CardDescription>Demuestra las entradas y salidas reales de dinero en efectivo/banco</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-emerald-400 font-semibold">Entradas de Efectivo</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(financialData.cashFlowIn)}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Ventas contado (Q5,000) + Préstamo recibido (Q5,000)</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-amber-400 font-semibold">Salidas de Efectivo</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(financialData.cashFlowOut)}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Compras (Q3,000) + Gastos (Q1,400) + Abono Préstamo (Q500)</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-blue-400 font-semibold">Flujo Neto en Caja</div>
                  <div className="text-2xl font-bold text-white mt-1">{formatCurrency(financialData.netCashFlow)}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Incremento neto de liquidez disponible</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                  <Sparkles className="h-4 w-4" /> Nota de Separación Financiera:
                </div>
                <p>
                  Recibir un préstamo de Q5,000 incrementa la liquidez en caja (+Q5,000), pero <strong>NO representa una venta ni ganancia</strong>. El abono de capital de Q500 disminuye la deuda y el efectivo, pero <strong>NO es un gasto operativo</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. OBLIGACIONES Y PASIVOS */}
        <TabsContent value="liabilities" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-amber-400 uppercase">Cuentas por Pagar Proveedores</div>
                <div className="text-3xl font-black text-amber-400 mt-2">{formatCurrency(financialData.accountsPayable)}</div>
                <p className="text-xs text-slate-400 mt-1">Deudas pendientes por compras de mercadería a crédito.</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-red-400 uppercase">Préstamos Pendientes por Pagar</div>
                <div className="text-3xl font-black text-red-400 mt-2">{formatCurrency(financialData.loansBalance)}</div>
                <p className="text-xs text-slate-400 mt-1">Saldo restante del préstamo bancario / acreedores.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
