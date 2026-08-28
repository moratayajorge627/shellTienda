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
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card text-card-foreground min-h-screen sticky top-0 z-30 shadow-sm transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-card">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ED1C24] to-[#C9151C] flex items-center justify-center text-[#FFD500] font-bold shadow-md shadow-red-500/20">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-foreground leading-tight flex items-center gap-1.5">
            <span>SuperTienda</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#FFD500]" />
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Sistema POS & Finanzas</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-card">
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
                  ? "bg-[#ED1C24] text-white font-semibold shadow-sm shadow-red-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                isActive ? "text-white" : "text-muted-foreground group-hover:text-[#ED1C24]"
              )} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between bg-card">
        <span className="font-medium">Moneda: GTQ (Q)</span>
        <span className="bg-[#FFD500]/20 text-foreground px-2 py-0.5 rounded border border-[#FFD500]/50 font-bold font-mono text-[10px]">
          v1.0.0
        </span>
      </div>
    </aside>
  );
};
