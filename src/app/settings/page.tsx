"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StoreSettings } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { Settings, Save, Store, CheckCircle2, AlertCircle, Loader2, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function SettingsPage() {
  const { hasRole, hasPermission, isLoading: authLoading } = useAuth();
  const canAccess = hasRole("ADMIN") || hasPermission("settings.manage");

  const [settings, setSettings] = useState<StoreSettings>({
    id: "",
    store_name: "Super Tienda Guatemala",
    nit: "1234567-8",
    phone: "2200-0000",
    email: "contacto@supertienda.gt",
    address: "Ciudad de Guatemala",
    logo_url: "",
    currency: "GTQ",
    currency_symbol: "Q",
    timezone: "America/Guatemala",
    updated_at: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from("store_settings").select("*").single();
        if (data) {
          setSettings(data as StoreSettings);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (canAccess) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [canAccess]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("store_settings")
        .upsert([{ ...settings, updated_at: new Date().toISOString() }]);

      if (error) throw error;

      setStatusMsg({ type: "success", text: "Configuración de la tienda guardada correctamente." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error al guardar la configuración." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
      </div>
    );
  }

  // Protección: Si no tiene el permiso correspondiente, bloquear acceso
  if (!canAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md w-full border-border bg-card shadow-xl text-center p-6 space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[#ED1C24] mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
          <p className="text-sm text-muted-foreground">
            La configuración general del sistema requiere el permiso de <strong>Configuración de Tienda</strong> (<code className="font-mono text-xs text-[#ED1C24]">settings.manage</code>) asignado a tu rol.
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-[#ED1C24]" />
          Configuración General de la Tienda
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-medium">Datos del establecimiento, NIT, moneda y zona horaria</p>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-500"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <Card className="glass-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-[#ED1C24]" />
            Información del Negocio
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Estos datos figurarán en los recibos y reportes financieros</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nombre de la Tienda *</label>
                <Input
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  required
                  className="bg-card border-input font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">NIT de la Empresa</label>
                <Input
                  value={settings.nit}
                  onChange={(e) => setSettings({ ...settings, nit: e.target.value })}
                  placeholder="1234567-8"
                  className="bg-card border-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Teléfono</label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="2200-0000"
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Correo Electrónico</label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="tienda@supertienda.gt"
                  className="bg-card border-input"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground">Dirección Física</label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Ciudad de Guatemala, Guatemala"
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Moneda Principal</label>
                <Input
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  placeholder="GTQ"
                  className="bg-card border-input font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Símbolo de Moneda</label>
                <Input
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  placeholder="Q"
                  className="bg-card border-input font-bold"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground">Zona Horaria Negocio</label>
                <Input
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  placeholder="America/Guatemala"
                  disabled
                  className="bg-muted border-input text-muted-foreground"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-md shadow-red-500/20">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#FFD500]" />}
                Guardar Configuración
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
