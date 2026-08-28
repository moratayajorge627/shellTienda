"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StoreSettings } from "@/types/database";
import { Settings, Save, Store, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
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

    loadSettings();
  }, []);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-400" />
          Configuración General de la Tienda
        </h1>
        <p className="text-sm text-slate-400">Datos del establecimiento, nit, moneda y zona horaria</p>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-400" />
            Información del Negocio
          </CardTitle>
          <CardDescription>Estos datos figurarán en los recibos y reportes financieros</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre de la Tienda</label>
                <Input
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">NIT de la Empresa</label>
                <Input
                  value={settings.nit}
                  onChange={(e) => setSettings({ ...settings, nit: e.target.value })}
                  placeholder="1234567-8"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Teléfono</label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="2200-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="tienda@supertienda.gt"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Dirección Física</label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Ciudad de Guatemala, Guatemala"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Moneda Principal</label>
                <Input
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  placeholder="GTQ"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Símbolo de Moneda</label>
                <Input
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  placeholder="Q"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Zona Horaria Negocio</label>
                <Input
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  placeholder="America/Guatemala"
                  disabled
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Configuración
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
