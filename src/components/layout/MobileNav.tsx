"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarMenuItems } from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { X, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  if (!isOpen) return null;

  const filteredItems = sidebarMenuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="fixed inset-0 z-50 flex md:hidden bg-black/50 backdrop-blur-sm">
      <div className="relative w-4/5 max-w-xs bg-white border-r border-[#E2E2E2] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E2E2]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#ED1C24] flex items-center justify-center text-white font-bold">
              <Store className="h-4 w-4 text-[#FFD500]" />
            </div>
            <span className="font-bold text-[#222222] text-base">SuperTienda POS</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#666666]">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#ED1C24] text-white font-semibold shadow-md shadow-red-500/20"
                    : "text-[#666666] hover:text-[#222222] hover:bg-[#F7F7F7]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
