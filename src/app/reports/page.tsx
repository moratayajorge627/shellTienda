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

  const financialData = {
    grossSales: 5000.00,
    discounts: 0.00,
    netSales: 5000.00,
    cogs: 3000.00,
    grossProfit: 2000.00,
    operatingExpenses: 1400.00,
    otherExpenses: 0.00,
    otherIncomes: 0.00,
    netResult: 600.00,

    cashFlowIn: 10000.00,
    cashFlowOut: 4900.00,
    netCashFlow: 5100.00,

    accountsPayable: 5000.00,
    loansBalance: 9500.00,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <PieChart className="h-7 w-7 text-[#ED1C24]" />
            Reportes & Resultado Financiero Real
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Separación rigurosa entre Utilidad Real (P&L), Flujo de Efectivo y Pasivos</p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border">
          <Button
            size="sm"
            variant={dateRange === "TODAY" ? "default" : "ghost"}
            onClick={() => setDateRange("TODAY")}
            className={`text-xs font-bold ${dateRange === "TODAY" ? "bg-[#ED1C24] hover:bg-[#C9151C] text-white" : "text-muted-foreground"}`}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant={dateRange === "MONTH" ? "default" : "ghost"}
            onClick={() => setDateRange("MONTH")}
            className={`text-xs font-bold ${dateRange === "MONTH" ? "bg-[#ED1C24] hover:bg-[#C9151C] text-white" : "text-muted-foreground"}`}
          >
            Mes Actual
          </Button>
        </div>
      </div>

      <Tabs defaultValue="incomeStatement" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted border border-border">
          <TabsTrigger value="incomeStatement" className="font-bold data-[state=active]:bg-card data-[state=active]:text-[#ED1C24]">Estado de Resultados</TabsTrigger>
          <TabsTrigger value="cashFlow" className="font-bold data-[state=active]:bg-card data-[state=active]:text-[#ED1C24]">Flujo de Efectivo</TabsTrigger>
          <TabsTrigger value="liabilities" className="font-bold data-[state=active]:bg-card data-[state=active]:text-[#ED1C24]">Pasivos & Deudas</TabsTrigger>
        </TabsList>

        {/* 1. ESTADO DE RESULTADOS (P&L / UTILIDAD REAL) */}
        <TabsContent value="incomeStatement" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-border">
              <CardContent className="p-6">
                <span className="text-xs font-bold text-muted-foreground uppercase">Ventas Netas</span>
                <div className="text-2xl font-black text-foreground mt-1">{formatCurrency(financialData.netSales)}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Ventas Brutas - Descuentos</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border">
              <CardContent className="p-6">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ganancia Bruta</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(financialData.grossProfit)}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Ventas Netas - Costo de Ventas (COGS)</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-[#ED1C24]/30 bg-red-500/5">
              <CardContent className="p-6">
                <span className="text-xs font-black text-[#ED1C24] uppercase">RESULTADO NETO REAL (UTILIDAD)</span>
                <div className="text-3xl font-black text-foreground mt-1">{formatCurrency(financialData.netResult)}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Dinero real ganado tras costos y gastos</div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#ED1C24]" />
                Desglose del Estado de Resultados (Ejemplo Real Caso de Uso)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between p-3.5 rounded-xl bg-muted border border-border">
                  <span className="text-foreground font-bold">(+) Ventas Brutas:</span>
                  <span className="font-black text-foreground">{formatCurrency(financialData.grossSales)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-muted border border-border">
                  <span className="text-muted-foreground">(-) Descuentos Concedidos:</span>
                  <span className="text-muted-foreground font-bold">-{formatCurrency(financialData.discounts)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-muted border border-border font-black">
                  <span className="text-foreground">(=) VENTAS NETAS:</span>
                  <span className="text-foreground">{formatCurrency(financialData.netSales)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-muted border border-border">
                  <span className="text-red-500 font-bold">(-) Costo de Mercadería Vendida (COGS Histórico):</span>
                  <span className="font-black text-red-500">-{formatCurrency(financialData.cogs)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-black">
                  <span className="text-emerald-600 dark:text-emerald-400">(=) GANANCIA BRUTA:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(financialData.grossProfit)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-muted border border-border">
                  <span className="text-amber-500 font-bold">(-) Gastos Operativos (Gastos diarios Q400 + Luz Q1000):</span>
                  <span className="font-black text-amber-500">-{formatCurrency(financialData.operatingExpenses)}</span>
                </div>

                <div className="flex justify-between p-4 rounded-xl bg-[#ED1C24]/10 border border-[#ED1C24]/30 font-black text-lg">
                  <span className="text-foreground">(=) RESULTADO NETO (UTILIDAD REAL):</span>
                  <span className="text-[#ED1C24]">{formatCurrency(financialData.netResult)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. FLUJO DE EFECTIVO */}
        <TabsContent value="cashFlow" className="space-y-6 pt-4">
          <Card className="glass-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#ED1C24]" />
                Estado de Flujo de Efectivo
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">Demuestra las entradas y salidas reales de dinero en efectivo/banco</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Entradas de Efectivo</div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(financialData.cashFlowIn)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Ventas contado (Q5,000) + Préstamo recibido (Q5,000)</p>
                </div>

                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="text-xs text-amber-500 font-bold">Salidas de Efectivo</div>
                  <div className="text-2xl font-black text-amber-500 mt-1">{formatCurrency(financialData.cashFlowOut)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Compras (Q3,000) + Gastos (Q1,400) + Abono Préstamo (Q500)</p>
                </div>

                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="text-xs text-[#ED1C24] font-bold">Flujo Neto en Caja</div>
                  <div className="text-2xl font-black text-foreground mt-1">{formatCurrency(financialData.netCashFlow)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Incremento neto de liquidez disponible</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-muted-foreground space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#ED1C24]">
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
            <Card className="glass-card border-border">
              <CardContent className="p-6">
                <div className="text-xs font-bold text-amber-500 uppercase">Cuentas por Pagar Proveedores</div>
                <div className="text-3xl font-black text-amber-500 mt-2">{formatCurrency(financialData.accountsPayable)}</div>
                <p className="text-xs text-muted-foreground mt-1">Deudas pendientes por compras de mercadería a crédito.</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border">
              <CardContent className="p-6">
                <div className="text-xs font-bold text-red-500 uppercase">Préstamos Pendientes por Pagar</div>
                <div className="text-3xl font-black text-red-500 mt-2">{formatCurrency(financialData.loansBalance)}</div>
                <p className="text-xs text-muted-foreground mt-1">Saldo restante del préstamo bancario / acreedores.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
