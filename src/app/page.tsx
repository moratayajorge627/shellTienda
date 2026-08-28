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
      {/* Welcome Banner Shell */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ED1C24] via-[#C9151C] to-[#8C0005] border border-red-500/30 p-6 md:p-8 shadow-xl text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="bg-[#FFD500] text-[#222222] font-black border-transparent shadow-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Guatemala (GTQ - Q)
              </Badge>
              <span className="text-xs text-red-100 font-mono">America/Guatemala</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Bienvenido, {profile?.full_name || "Administrador"} 👋
            </h1>
            <p className="text-sm text-red-100 mt-1 font-medium">
              Panel de control operativo y financiero en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/pos">
              <Button size="lg" className="bg-[#FFD500] hover:bg-[#E6C000] text-[#222222] font-black gap-2 shadow-lg shadow-black/20 text-base">
                <ShoppingCart className="h-5 w-5 text-[#ED1C24]" />
                Ir al Punto de Venta (POS)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* METRICAS DE HOY */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#ED1C24]" />
            Operaciones de Hoy
          </h2>
          {loading ? (
            <span className="flex items-center gap-1.5 text-xs text-[#666666]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
            </span>
          ) : (
            <span className="text-xs text-[#666666] font-mono">Datos en tiempo real</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas Hoy */}
          <Card className="glass-card hover:border-[#ED1C24]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">Ventas de Hoy</span>
                <div className="h-9 w-9 rounded-lg bg-red-50 text-[#ED1C24] flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-8 w-28 bg-[#E2E2E2] animate-pulse rounded-lg" />
                ) : (
                  <div className="text-2xl font-black text-[#222222]">{formatCurrency(metrics.todaySales)}</div>
                )}
                <div className="flex items-center justify-between text-xs text-[#666666] mt-1">
                  <span>{loading ? "—" : `${metrics.todaySalesCount} transacciones`}</span>
                  {!loading && metrics.todaySales > 0 && (
                    <span className="text-emerald-600 flex items-center font-bold">
                      <ArrowUpRight className="h-3 w-3" /> activo
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ganancia Bruta */}
          {isAdmin && (
            <Card className="glass-card hover:border-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">Ganancia Bruta</span>
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  {loading ? (
                    <div className="h-8 w-28 bg-[#E2E2E2] animate-pulse rounded-lg" />
                  ) : (
                    <div className="text-2xl font-black text-emerald-600">{formatCurrency(metrics.todayGrossProfit)}</div>
                  )}
                  <div className="text-xs text-[#666666] mt-1 font-medium">Ventas menos costo histórico</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gastos Hoy */}
          <Card className="glass-card hover:border-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">Gastos de Hoy</span>
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-8 w-28 bg-[#E2E2E2] animate-pulse rounded-lg" />
                ) : (
                  <div className="text-2xl font-black text-amber-600">{formatCurrency(metrics.todayExpenses)}</div>
                )}
                <div className="text-xs text-[#666666] mt-1 font-medium">Operativos y adicionales</div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado Neto */}
          {isAdmin && (
            <Card className="glass-card hover:border-[#ED1C24] bg-gradient-to-br from-white to-red-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#222222] uppercase tracking-wider">Resultado Neto</span>
                  <div className="h-9 w-9 rounded-lg bg-[#FFD500]/30 text-[#222222] flex items-center justify-center font-bold">
                    <Receipt className="h-5 w-5 text-[#ED1C24]" />
                  </div>
                </div>
                <div className="mt-3">
                  {loading ? (
                    <div className="h-8 w-28 bg-[#E2E2E2] animate-pulse rounded-lg" />
                  ) : (
                    <div className={`text-2xl font-black ${metrics.todayNetResult >= 0 ? "text-[#ED1C24]" : "text-red-700"}`}>
                      {formatCurrency(metrics.todayNetResult)}
                    </div>
                  )}
                  <div className="text-xs text-[#666666] mt-1 font-medium">Utilidad limpia del día</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* SECCION INVENTARIO Y FINANZAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estado de Inventario */}
        <Card className="glass-card border-[#E2E2E2] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#E2E2E2]/60">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-[#222222]">
                <Boxes className="h-5 w-5 text-[#ED1C24]" />
                Estado del Inventario
              </CardTitle>
              <CardDescription>Resumen de productos y existencias críticas</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs text-[#ED1C24] font-bold hover:bg-red-50">Ver Todo &rarr;</Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-[#F7F7F7] border border-[#E2E2E2]">
                <div className="text-xs text-[#666666] font-medium">Productos Activos</div>
                {loading ? (
                  <div className="h-7 w-12 bg-[#E2E2E2] animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-black text-[#222222] mt-1">{metrics.activeProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-800 font-bold">Stock Bajo (&le; Mín)</div>
                {loading ? (
                  <div className="h-7 w-10 bg-[#E2E2E2] animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-black text-amber-700 mt-1">{metrics.lowStockProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-xs text-red-800 font-bold">Sin Existencia</div>
                {loading ? (
                  <div className="h-7 w-10 bg-[#E2E2E2] animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-xl font-black text-red-700 mt-1">{metrics.outOfStockProducts}</div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-[#F7F7F7] border border-[#E2E2E2]">
                <div className="text-xs text-[#666666] font-medium">Valor Inventario</div>
                {loading ? (
                  <div className="h-7 w-24 bg-[#E2E2E2] animate-pulse rounded mt-1" />
                ) : (
                  <div className="text-lg font-black text-[#222222] mt-1">{formatCurrency(metrics.inventoryValue)}</div>
                )}
              </div>
            </div>

            {/* Alerta de Stock bajo */}
            {!loading && metrics.lowStockProducts > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <span className="font-bold">¡Atención! Hay {metrics.lowStockProducts} productos con stock por debajo del mínimo.</span>
                  <p className="text-xs text-amber-800 mt-0.5">Te sugerimos registrar un ingreso de compras de mercadería.</p>
                </div>
                <Link href="/purchases">
                  <Button size="sm" className="bg-[#FFD500] text-[#222222] hover:bg-[#E6C000] font-bold text-xs">Registrar Compra</Button>
                </Link>
              </div>
            )}

            {!loading && metrics.activeProducts === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F7F7F7] border border-[#E2E2E2] text-[#666666] text-sm">
                <Package className="h-5 w-5 shrink-0" />
                <span>No hay productos registrados aún. <Link href="/products" className="text-[#ED1C24] font-bold underline">Agregar productos</Link></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen Financiero */}
        <Card className="glass-card border-[#E2E2E2]">
          <CardHeader className="pb-2 border-b border-[#E2E2E2]/60">
            <CardTitle className="text-base flex items-center gap-2 text-[#222222]">
              <Landmark className="h-5 w-5 text-[#ED1C24]" />
              Pasivos & Compromisos
            </CardTitle>
            <CardDescription>Cuentas por pagar y saldos pendientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-[#F7F7F7] border border-[#E2E2E2] space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#666666] font-medium">Cuentas por Pagar:</span>
                {loading ? (
                  <div className="h-5 w-20 bg-[#E2E2E2] animate-pulse rounded" />
                ) : (
                  <span className="font-bold text-amber-700">{formatCurrency(metrics.accountsPayable)}</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#666666] font-medium">Préstamos Pendientes:</span>
                {loading ? (
                  <div className="h-5 w-20 bg-[#E2E2E2] animate-pulse rounded" />
                ) : (
                  <span className="font-bold text-red-700">{formatCurrency(metrics.pendingLoans)}</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200/80 space-y-2">
              <div className="text-xs font-bold text-[#ED1C24] uppercase tracking-wider">Resultado del Mes</div>
              {loading ? (
                <div className="h-8 w-32 bg-[#E2E2E2] animate-pulse rounded-lg" />
              ) : (
                <div className={`text-2xl font-black ${metrics.monthlyNetResult >= 0 ? "text-[#222222]" : "text-red-700"}`}>
                  {formatCurrency(metrics.monthlyNetResult)}
                </div>
              )}
              <p className="text-xs text-[#666666]">Diferencia entre Ganancia Bruta y Gastos acumulados del mes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACCIONES RAPIDAS */}
      <Card className="glass-card border-[#E2E2E2]">
        <CardHeader>
          <CardTitle className="text-base text-[#222222]">Accesos Rápidos del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/pos">
              <Button variant="outline" className="w-full h-20 border-[#E2E2E2] flex-col gap-2 hover:border-[#ED1C24] hover:bg-red-50 bg-white">
                <ShoppingCart className="h-6 w-6 text-[#ED1C24]" />
                <span className="text-xs font-bold text-[#222222]">Punto de Venta (POS)</span>
              </Button>
            </Link>

            <Link href="/inventory">
              <Button variant="outline" className="w-full h-20 border-[#E2E2E2] flex-col gap-2 hover:border-[#ED1C24] hover:bg-red-50 bg-white">
                <Package className="h-6 w-6 text-[#ED1C24]" />
                <span className="text-xs font-bold text-[#222222]">Escanear / Inventario</span>
              </Button>
            </Link>

            <Link href="/purchases">
              <Button variant="outline" className="w-full h-20 border-[#E2E2E2] flex-col gap-2 hover:border-[#ED1C24] hover:bg-red-50 bg-white">
                <PlusCircle className="h-6 w-6 text-[#ED1C24]" />
                <span className="text-xs font-bold text-[#222222]">Ingreso de Compras</span>
              </Button>
            </Link>

            <Link href="/cash">
              <Button variant="outline" className="w-full h-20 border-[#E2E2E2] flex-col gap-2 hover:border-[#ED1C24] hover:bg-red-50 bg-white">
                <WalletCards className="h-6 w-6 text-[#ED1C24]" />
                <span className="text-xs font-bold text-[#222222]">Caja & Arqueo</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
