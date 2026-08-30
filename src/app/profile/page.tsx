"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { User, Shield, Key, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      await refreshProfile();
      setStatusMsg({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error al actualizar perfil." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (password !== confirmPassword) {
      setStatusMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    if (password.length < 6) {
      setStatusMsg({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      setStatusMsg({ type: "success", text: "Contraseña actualizada exitosamente." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error al cambiar la contraseña." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <User className="h-7 w-7 text-[#ED1C24]" />
          Mi Perfil
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-medium">Administra tus datos personales y credenciales de acceso</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="glass-card md:col-span-1 border-border">
          <CardHeader className="text-center">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-tr from-[#ED1C24] to-[#C9151C] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-red-500/20 border-2 border-[#FFD500]/50">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
            <CardTitle className="mt-3 text-foreground font-bold">{profile?.full_name || "Usuario"}</CardTitle>
            <CardDescription className="text-muted-foreground">{user?.email}</CardDescription>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {roles.map((role) => (
                <Badge key={role} variant="default" className="text-xs uppercase bg-[#ED1C24] text-white font-bold">
                  <Shield className="h-3 w-3 mr-1 text-[#FFD500]" />
                  {role}
                </Badge>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-[#ED1C24]" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nombre Completo *</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-card border-input font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Teléfono</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 5555-4444"
                    className="bg-card border-input"
                  />
                </div>
                <Button type="submit" disabled={loading} size="sm" className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
                <Key className="h-4 w-4 text-[#ED1C24]" />
                Cambiar Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nueva Contraseña</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-card border-input font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Confirmar Nueva Contraseña</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-card border-input font-mono"
                  />
                </div>
                <Button type="submit" disabled={loading} size="sm" variant="outline" className="border-border text-foreground hover:border-[#ED1C24] font-bold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar Contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
