"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isLoading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/recovery";

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F7F7] text-[#222222]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
          <p className="text-sm font-semibold text-[#666666]">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#F7F7F7] text-[#222222]">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F7F7] text-[#222222]">
      <Sidebar />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <Navbar onToggleMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
