"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Landmark,
  WalletCards,
  PieChart,
  Users,
  ShieldCheck,
  Settings,
  Store,
  DollarSign,
  TrendingDown,
  History,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

export const sidebarMenuItems: MenuItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Punto de Venta (POS)", href: "/pos", icon: ShoppingCart, permission: "sales.create" },
  { title: "Ventas & Historial", href: "/sales", icon: Receipt, permission: "sales.view" },
  { title: "Inventario & Stock", href: "/inventory", icon: Boxes, permission: "products.view" },
  { title: "Catálogo Productos", href: "/products", icon: Package, permission: "products.view" },
  { title: "Compras & Mercadería", href: "/purchases", icon: Truck, permission: "inventory.purchase" },
  { title: "Proveedores", href: "/suppliers", icon: Store, permission: "suppliers.manage" },
  { title: "Caja Diaria", href: "/cash", icon: WalletCards, permission: "cash.view" },
  { title: "Gastos & Recurrentes", href: "/expenses", icon: TrendingDown, permission: "expenses.manage" },
  { title: "Cuentas por Pagar", href: "/debts", icon: DollarSign, permission: "suppliers.manage" },
  { title: "Préstamos & Deudas", href: "/loans", icon: Landmark, permission: "loans.manage" },
  { title: "Reportes & Finanzas", href: "/reports", icon: PieChart, permission: "reports.operational" },
  { title: "Empleados", href: "/employees", icon: Users, permission: "users.manage" },
  { title: "Usuarios y Roles", href: "/roles", icon: ShieldCheck, permission: "roles.manage" },
  { title: "Auditoría", href: "/audit", icon: History, permission: "audit.view" },
  { title: "Configuración", href: "/settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const filteredItems = sidebarMenuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/90 text-slate-200 min-h-screen sticky top-0 backdrop-blur-xl z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
            SuperTienda
          </h1>
          <p className="text-xs text-slate-400 font-medium">Sistema Pos & Finanzas</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
              )} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
        <span>Moneda: GTQ (Q)</span>
        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-[10px]">
          v1.0.0
        </span>
      </div>
    </aside>
  );
};
