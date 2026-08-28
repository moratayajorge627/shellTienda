"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Store, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function RecoveryPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setErrorMsg("Ocurrió un error al enviar el enlace de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Store className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Recuperación de Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Ingresa tu correo para recibir instrucciones de restablecimiento
          </p>
        </div>

        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle>Restablecer Acceso</CardTitle>
            <CardDescription>Te enviaremos un correo seguro</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Correo Enviado</h3>
                <p className="text-sm text-slate-400">
                  Hemos enviado las instrucciones a <span className="font-semibold text-white">{email}</span>. Revisa tu bandeja de entrada o spam.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full mt-4 border-slate-800 gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al Inicio de Sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Correo Registrado</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      required
                      placeholder="tu-correo@supertienda.gt"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 shadow-lg shadow-blue-500/25"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Enviar Enlace de Recuperación"
                  )}
                </Button>

                <div className="pt-2">
                  <Link href="/login" className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white">
                    <ArrowLeft className="h-3 w-3" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
