"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Lock, Mail, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Correo o contraseña incorrectos. Verifica tus credenciales.");
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
    <div className="flex min-h-[90vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F7F7F7]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#ED1C24] to-[#C9151C] flex items-center justify-center text-[#FFD500] shadow-xl shadow-red-500/25 border-2 border-[#FFD500]/50">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[#222222]">
            SuperTienda <span className="text-[#ED1C24]">POS</span>
          </h2>
          <p className="mt-2 text-sm text-[#666666] font-medium">
            Ingresa con tus credenciales autorizadas
          </p>
        </div>

        <Card className="border-[#E2E2E2] bg-white shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-[#222222] font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-[#666666]">Accede al Punto de Venta, Caja e Inventarios</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#ED1C24]" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#222222]">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#888888]" />
                  <Input
                    type="email"
                    required
                    placeholder="cajero@supertienda.gt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white border-[#E2E2E2] text-[#222222]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#222222]">Contraseña</label>
                  <Link href="/recovery" className="text-xs text-[#ED1C24] font-semibold hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#888888]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-white border-[#E2E2E2] text-[#222222]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-[#888888] hover:text-[#222222] transition-colors"
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
          <CardFooter className="justify-center border-t border-[#E2E2E2] pt-4">
            <p className="text-xs text-[#666666] text-center font-medium">
              Acceso restringido únicamente a empleados registrados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
