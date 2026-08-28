"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  User as UserIcon,
  LogOut,
  WalletCards,
  ShoppingCart,
  Shield,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileNav }) => {
  const { profile, roles, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 md:px-6 backdrop-blur-xl">
      {/* Left side: Mobile Toggle & Quick POS Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-300 hover:bg-slate-900"
          onClick={onToggleMobileNav}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="hidden sm:flex items-center gap-2">
          <Link href="/pos">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 font-semibold gap-2">
              <ShoppingCart className="h-4 w-4" />
              Abrir POS (Ventas)
            </Button>
          </Link>

          <Link href="/cash">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-2">
              <WalletCards className="h-4 w-4 text-emerald-400" />
              Caja
            </Button>
          </Link>
        </div>
      </div>

      {/* Right side: User info & Actions */}
      <div className="flex items-center gap-4">
        {/* User Badges */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-semibold text-white leading-tight">
            {profile?.full_name || "Administrador"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {roles.map((r) => (
              <Badge key={r} variant={r === "ADMIN" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 uppercase">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* Profile Link */}
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700">
            <UserIcon className="h-4 w-4" />
          </Button>
        </Link>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
