"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Boxes,
  AlertTriangle,
  WalletCards,
  ArrowUpRight,
  ShoppingCart,
  PlusCircle,
  Package,
  Landmark,
  Receipt,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardMetrics {
  // Hoy
  todaySales: number;
  todaySalesCount: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayNetResult: number;
  // Inventario
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
  // Finanzas
  accountsPayable: number;
  pendingLoans: number;
  monthlyNetResult: number;
}

const EMPTY_METRICS: DashboardMetrics = {
  todaySales: 0,
  todaySalesCount: 0,
  todayGrossProfit: 0,
  todayExpenses: 0,
  todayNetResult: 0,
  activeProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  inventoryValue: 0,
  accountsPayable: 0,
  pendingLoans: 0,
  monthlyNetResult: 0,
};

export default function DashboardPage() {
  const { profile, roles, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes("ADMIN");

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Fecha de hoy en Guatemala (UTC-6)
        const now = new Date();
        const todayGT = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const todayStr = todayGT.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const todayStart = `${todayStr}T00:00:00.000Z`;
        const todayEnd = `${todayStr}T23:59:59.999Z`;

        // Inicio del mes actual
        const monthStart = `${todayStr.slice(0, 7)}-01T00:00:00.000Z`;

        const [
          salesRes,
          expensesTodayRes,
          productsRes,
          apRes,
          loansRes,
          expensesMonthRes,
          salesMonthRes,
        ] = await Promise.all([
          // Ventas completadas de hoy
          supabase
            .from("sales")
            .select("total, subtotal, discount")
            .eq("status", "COMPLETADA")
            .gte("created_at", todayStart)
            .lte("created_at", todayEnd),

          // Gastos de hoy
          supabase
            .from("expenses")
            .select("amount")
            .gte("expense_date", todayStr)
            .lte("expense_date", todayStr),

          // Productos activos
          supabase
            .from("products")
            .select("stock_quantity, min_stock, purchase_price, status"),

          // Cuentas por pagar pendientes/parciales
          supabase
            .from("accounts_payable")
            .select("balance")
            .in("status", ["PENDIENTE", "PARCIAL"]),

          // Préstamos pendientes/parciales
          supabase
            .from("loans")
            .select("balance")
            .in("status", ["PENDIENTE", "PARCIALMENTE_PAGADO"]),

          // Gastos del mes
          supabase
            .from("expenses")
            .select("amount")
            .gte("expense_date", monthStart.split("T")[0])
            .lte("expense_date", todayStr),

          // Ventas del mes (para resultado mensual)
          supabase
            .from("sale_items")
            .select("subtotal, cost_total")
            .gte("created_at", monthStart)
            .lte("created_at", todayEnd),
        ]);

        // ── Métricas de ventas de hoy ──────────────────────────────────────────
        const todaySalesData = salesRes.data || [];
        const todaySales = todaySalesData.reduce((sum, s) => sum + (s.total ?? 0), 0);
        const todaySalesCount = todaySalesData.length;

        // Ganancia bruta = calculada desde sale_items del día
        const { data: saleItemsToday } = await supabase
          .from("sale_items")
          .select("subtotal, cost_total")
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd);

        const todayRevenue = (saleItemsToday || []).reduce((s, i) => s + (i.subtotal ?? 0), 0);
        const todayCOGS = (saleItemsToday || []).reduce((s, i) => s + (i.cost_total ?? 0), 0);
        const todayGrossProfit = todayRevenue - todayCOGS;

        // ── Gastos de hoy ──────────────────────────────────────────────────────
        const todayExpenses = (expensesTodayRes.data || []).reduce(
          (sum, e) => sum + (e.amount ?? 0), 0
        );

        const todayNetResult = todayGrossProfit - todayExpenses;

        // ── Inventario ─────────────────────────────────────────────────────────
        const products = (productsRes.data || []);
        const activeProducts = products.filter((p) => p.status === "ACTIVO").length;
        const lowStockProducts = products.filter(
          (p) => p.status === "ACTIVO" && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock
        ).length;
        const outOfStockProducts = products.filter(
          (p) => p.status === "ACTIVO" && p.stock_quantity <= 0
        ).length;
        const inventoryValue = products
          .filter((p) => p.status === "ACTIVO")
          .reduce((sum, p) => sum + (p.stock_quantity ?? 0) * (p.purchase_price ?? 0), 0);

        // ── Cuentas por pagar ──────────────────────────────────────────────────
        const accountsPayable = (apRes.data || []).reduce(
          (sum, a) => sum + (a.balance ?? 0), 0
        );

        // ── Préstamos pendientes ───────────────────────────────────────────────
        const pendingLoans = (loansRes.data || []).reduce(
          (sum, l) => sum + (l.balance ?? 0), 0
        );

        // ── Resultado del mes ──────────────────────────────────────────────────
        const monthItems = salesMonthRes.data || [];
        const monthRevenue = monthItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);
        const monthCOGS = monthItems.reduce((s, i) => s + (i.cost_total ?? 0), 0);
        const monthGrossProfit = monthRevenue - monthCOGS;
        const monthExpenses = (expensesMonthRes.data || []).reduce(
          (sum, e) => sum + (e.amount ?? 0), 0
        );
        const monthlyNetResult = monthGrossProfit - monthExpenses;

        setMetrics({
          todaySales,
          todaySalesCount,
          todayGrossProfit,
          todayExpenses,
          todayNetResult,
          activeProducts,
          lowStockProducts,
          outOfStockProducts,
          inventoryValue,
          accountsPayable,
          pendingLoans,
          monthlyNetResult,
        });
      } catch (err) {
        console.error("Error cargando métricas del dashboard:", err);
        setMetrics(EMPTY_METRICS);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Guatemala (GTQ - Q)
              </Badge>
              <span className="text-xs text-slate-400 font-mono">America/Guatemala</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Bienvenido, {profile?.full_name || "Administrador"} 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Resumen operativo y financiero de la tienda en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/pos">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 shadow-lg shadow-blue-600/30">
                <ShoppingCart className="h-5 w-5" />
                Ir al Punto de Venta (POS)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* METRICAS DE HOY */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-400" />
            Operaciones de Hoy
          </h2>
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-mono">Datos en tiempo real</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas Hoy */}
          <Card className="glass-card hover:border-blue-500/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas de Hoy</span>
                <div className="h-9 w-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
                ) : (
                  <div className="text-2xl font-black text-white">{formatCurrency(metrics.todaySales)}</div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>{loading ? "—" : `${metrics.todaySalesCount} transacciones`}</span>
                  {!loading && metrics.todaySales > 0 && (
                    <span className="text-emerald-400 flex items-center font-medium">
                      <ArrowUpRight className="h-3 w-3" /> activo
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ganancia Bruta */}
          {isAdmin && (
            <Card className="glass-card hover:border-emerald-500/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ganancia Bruta</span>
                  <div className="h-9 w-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {loading ? (
                    <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    <div className="text-2xl font-black text-emerald-400">{formatCurrency(metrics.todayGrossProfit)}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">Ventas menos costo histórico</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gastos Hoy */}
          <Card className="glass-card hover:border-amber-500/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gastos de Hoy</span>
                <div className="h-9 w-9 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
                ) : (
                  <div className="text-2xl font-black text-amber-400">{formatCurrency(metrics.todayExpenses)}</div>
                )}
                <div className="text-xs text-slate-400 mt-1">Operativos y adicionales</div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado Neto */}
          {isAdmin && (
            <Card className="glass-card hover:border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 to-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Resultado Neto</span>
                  <div className="h-9 w-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {loading ? (
                    <div className="h-8 w-28 bg-slate-800 animate-pulse rounded-lg" />
                  ) : (
                    <div className={`text-2xl font-black ${metrics.todayNetResult >= 0 ? "text-indigo-300" : "text-red-400"}`}>
                      {formatCurrency(metrics.todayNetResult)}
                    </div>
                  )}
                  <div className="text-xs text-indigo-200/70 mt-1">Utilidad limpia del día</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* SECCION INVENTARIO Y FINANZAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estado de Inventario */}
        <Card className="glass-card border-slate-800 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Boxes className="h-5 w-5 text-blue-400" />
                Estado del Inventario
              </CardTitle>
              <CardDescription>Resumen de productos y existencias críticas</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs text-blue-400">Ver Todo &rarr;</Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Productos Activos</div>
                {loading ? (
                  <div className="h-7 w-12 bg-slate-800 animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-bold text-white mt-1">{metrics.activeProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="text-xs text-amber-400">Stock Bajo (&le; Mín)</div>
                {loading ? (
                  <div className="h-7 w-10 bg-slate-800 animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-bold text-amber-300 mt-1">{metrics.lowStockProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="text-xs text-red-400">Sin Existencia</div>
                {loading ? (
                  <div className="h-7 w-10 bg-slate-800 animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-bold text-red-300 mt-1">{metrics.outOfStockProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Valor Inventario</div>
                {loading ? (
                  <div className="h-7 w-24 bg-slate-800 animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(metrics.inventoryValue)}</div>
                )}
              </div>
            </div>

            {/* Alerta de Stock bajo */}
            {!loading && metrics.lowStockProducts > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="flex-1">
                  <span className="font-semibold">¡Atención! Hay {metrics.lowStockProducts} productos con stock por debajo del mínimo.</span>
                  <p className="text-xs text-amber-400/80 mt-0.5">Te sugerimos registrar un ingreso de compras de mercadería.</p>
                </div>
                <Link href="/purchases">
                  <Button size="sm" variant="warning" className="text-xs">Registrar Compra</Button>
                </Link>
              </div>
            )}

            {!loading && metrics.activeProducts === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-sm">
                <Package className="h-5 w-5 shrink-0" />
                <span>No hay productos registrados aún. <Link href="/products" className="text-blue-400 underline">Agregar productos</Link></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen Financiero */}
        <Card className="glass-card border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-400" />
              Pasivos & Compromisos
            </CardTitle>
            <CardDescription>Cuentas por pagar y saldos pendientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Cuentas por Pagar:</span>
                {loading ? (
                  <div className="h-5 w-20 bg-slate-800 animate-pulse rounded" />
                ) : (
                  <span className="font-bold text-amber-400">{formatCurrency(metrics.accountsPayable)}</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Préstamos Pendientes:</span>
                {loading ? (
                  <div className="h-5 w-20 bg-slate-800 animate-pulse rounded" />
                ) : (
                  <span className="font-bold text-red-400">{formatCurrency(metrics.pendingLoans)}</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 uppercase">Resultado del Mes</div>
              {loading ? (
                <div className="h-8 w-32 bg-slate-800 animate-pulse rounded-lg" />
              ) : (
                <div className={`text-2xl font-black ${metrics.monthlyNetResult >= 0 ? "text-white" : "text-red-400"}`}>
                  {formatCurrency(metrics.monthlyNetResult)}
                </div>
              )}
              <p className="text-xs text-slate-400">Diferencia entre Ganancia Bruta y Gastos acumulados del mes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACCIONES RAPIDAS */}
      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Accesos Rápidos del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/pos">
              <Button variant="outline" className="w-full h-20 border-slate-800 flex-col gap-2 hover:border-blue-500/50 hover:bg-blue-600/10">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
                <span className="text-xs font-semibold">Punto de Venta (POS)</span>
              </Button>
            </Link>

            <Link href="/inventory">
              <Button variant="outline" className="w-full h-20 border-slate-800 flex-col gap-2 hover:border-emerald-500/50 hover:bg-emerald-600/10">
                <Package className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-semibold">Escanear / Inventario</span>
              </Button>
            </Link>

            <Link href="/purchases">
              <Button variant="outline" className="w-full h-20 border-slate-800 flex-col gap-2 hover:border-indigo-500/50 hover:bg-indigo-600/10">
                <PlusCircle className="h-6 w-6 text-indigo-400" />
                <span className="text-xs font-semibold">Ingreso de Compras</span>
              </Button>
            </Link>

            <Link href="/cash">
              <Button variant="outline" className="w-full h-20 border-slate-800 flex-col gap-2 hover:border-amber-500/50 hover:bg-amber-600/10">
                <WalletCards className="h-6 w-6 text-amber-400" />
                <span className="text-xs font-semibold">Caja & Arqueo</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
