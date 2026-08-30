"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Lock, User, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const raw = identifier.trim();

      if (!raw) {
        setErrorMsg("Ingresa tu usuario o correo electrónico.");
        setLoading(false);
        return;
      }

      // Si no contiene '@', es un nombre de usuario y se usa el identificador interno
      let authEmail = raw;
      if (!raw.includes("@")) {
        const cleanUser = raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
        authEmail = `${cleanUser}@tienda.local`;
      }

      let { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      // Fallback amigable si el usuario fue registrado originalmente con un dominio como @tienda.com o similar
      if (error && !raw.includes("@")) {
        const fallback1 = await supabase.auth.signInWithPassword({
          email: `${raw.toLowerCase()}@tienda.com`,
          password,
        });
        if (!fallback1.error) {
          error = null;
        }
      }

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Usuario, correo o contraseña incorrectos. Verifica tus datos.");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg("Ocurrió un error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#ED1C24] to-[#C9151C] flex items-center justify-center text-[#FFD500] shadow-xl shadow-red-500/25 border-2 border-[#FFD500]/50">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground">
            SuperTienda <span className="text-[#ED1C24]">POS</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Ingresa con tu usuario o correo electrónico
          </p>
        </div>

        <Card className="border-border bg-card shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-foreground font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-muted-foreground">Accede al Punto de Venta, Caja e Inventarios</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#ED1C24]" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Usuario o Correo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    required
                    placeholder="Ej. cajero1 o admin@tienda.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 bg-card border-input text-foreground"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Contraseña</label>
                  <Link href="/recovery" className="text-xs text-[#ED1C24] font-semibold hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-card border-input text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold h-11 gap-2 shadow-lg shadow-red-500/25 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    Ingresar al Sistema
                    <ArrowRight className="h-4 w-4 text-[#FFD500]" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center font-medium">
              Acceso restringido únicamente a empleados registrados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
