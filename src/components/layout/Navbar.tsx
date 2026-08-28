"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  User as UserIcon,
  LogOut,
  WalletCards,
  ShoppingCart,
  Shield,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileNav }) => {
  const { profile, roles, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm transition-colors duration-200">
      {/* Left side: Mobile Toggle & Quick POS Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground hover:bg-muted"
          onClick={onToggleMobileNav}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="hidden sm:flex items-center gap-2">
          <Link href="/pos">
            <Button size="sm" className="bg-[#ED1C24] hover:bg-[#C9151C] text-white shadow-md shadow-red-500/20 font-bold gap-2">
              <ShoppingCart className="h-4 w-4 text-[#FFD500]" />
              Abrir POS (Ventas)
            </Button>
          </Link>

          <Link href="/cash">
            <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted gap-2 font-medium">
              <WalletCards className="h-4 w-4 text-[#ED1C24]" />
              Caja Diaria
            </Button>
          </Link>
        </div>
      </div>

      {/* Right side: Theme toggle, User info & Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Dark/Light Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full bg-muted/60 border border-border text-foreground hover:text-[#ED1C24] transition-all"
          title={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-[#FFD500] animate-in zoom-in" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 animate-in zoom-in" />
          )}
        </Button>

        {/* User Badges */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-bold text-foreground leading-tight">
            {profile?.full_name || "Administrador"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {roles.map((r) => (
              <Badge key={r} variant={r === "ADMIN" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 uppercase font-bold">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* Profile Link */}
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full bg-muted border border-border text-foreground hover:text-[#ED1C24]">
            <UserIcon className="h-4 w-4" />
          </Button>
        </Link>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-muted-foreground hover:text-[#ED1C24] hover:bg-red-500/10 rounded-full"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
