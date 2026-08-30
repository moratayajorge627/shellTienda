"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Store, User, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function RecoveryPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const raw = identifier.trim();
      if (!raw) {
        setErrorMsg("Ingresa tu usuario o correo electrónico.");
        setLoading(false);
        return;
      }

      let emailToSend = raw;

      // Si ingresó username, resolver el correo asociado
      if (!raw.includes("@")) {
        try {
          const res = await fetch("/api/auth/resolve-identifier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: raw }),
          });
          const data = await res.json();
          if (data.email) {
            emailToSend = data.email;
          }
        } catch (resErr) {
          console.warn("Fallo al resolver identificador:", resErr);
        }
      }

      setTargetEmail(emailToSend);

      // Si es un correo interno @tienda.local, no se puede enviar email real
      if (emailToSend.endsWith("@tienda.local")) {
        setErrorMsg(
          `La cuenta @${raw} no tiene un correo electrónico externo registrado. Pídele al Administrador que resetee tu clave en el módulo de Empleados.`
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/profile`
        : "https://shell-tienda.vercel.app/profile";

      const { error } = await supabase.auth.resetPasswordForEmail(emailToSend, {
        redirectTo: redirectUrl,
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
    <div className="flex min-h-[85vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#ED1C24] to-[#C9151C] flex items-center justify-center text-[#FFD500] shadow-xl shadow-red-500/25 border-2 border-[#FFD500]/50">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground">
            Recuperación de Contraseña
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Ingresa tu usuario o correo para recibir el enlace de acceso
          </p>
        </div>

        <Card className="border-border bg-card shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-foreground">Restablecer Acceso</CardTitle>
            <CardDescription className="text-muted-foreground">Te enviaremos un enlace seguro a tu correo</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Correo Enviado</h3>
                <p className="text-sm text-muted-foreground">
                  Hemos enviado las instrucciones a <span className="font-bold text-foreground">{targetEmail}</span>. Revisa tu bandeja de entrada o spam.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full mt-4 border-border text-foreground gap-2">
                    <ArrowLeft className="h-4 w-4 text-[#ED1C24]" />
                    Volver al Inicio de Sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#ED1C24]" />
                    <span className="font-medium">{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Usuario o Correo Registrado</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      required
                      placeholder="Ej. angelica.camey o tu-correo@gmail.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="pl-9 bg-card border-input text-foreground"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold h-11 shadow-lg shadow-red-500/25 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando enlace...
                    </>
                  ) : (
                    "Enviar Enlace de Recuperación"
                  )}
                </Button>

                <div className="pt-2">
                  <Link href="/login" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-3 w-3 text-[#ED1C24]" />
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
