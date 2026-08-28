"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Role, Permission } from "@/types/database";
import { ShieldCheck, Lock, CheckCircle2, Shield, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const [rRes, pRes] = await Promise.all([
          supabase.from("roles").select("*").order("name"),
          supabase.from("permissions").select("*").order("module"),
        ]);
        setRoles((rRes.data || []) as Role[]);
        setPermissions((pRes.data || []) as Permission[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
          Roles & Matriz de Permisos (RBAC)
        </h1>
        <p className="text-sm text-slate-400">Control de Acceso Basado en Roles (Validado en Frontend y Supabase RLS)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="glass-card border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  {role.name}
                </CardTitle>
                {role.is_system && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Permisos Asignados:</div>
              <div className="space-y-1 text-xs text-slate-300">
                {role.name === "ADMIN" ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Acceso Total ilimitado a todos los módulos y operaciones.
                  </div>
                ) : role.name === "SUPERVISOR" ? (
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>Consultar y crear productos / inventarios</li>
                    <li>Registrar compras e ingresos de mercadería</li>
                    <li>Realizar y consultar ventas</li>
                    <li>Registrar gastos autorizados</li>
                    <li>Consultar reportes operativos</li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>Realizar ventas en el POS</li>
                    <li>Buscar productos y escanear códigos</li>
                    <li>Abrir y cerrar turno de caja propio</li>
                    <li>Consultar existencias de stock</li>
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matriz de Permisos del Sistema */}
      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Catálogo de Permisos Granulares del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Módulo</th>
                    <th className="p-3">Código del Permiso</th>
                    <th className="p-3">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {permissions.map((perm) => (
                    <tr key={perm.id}>
                      <td className="p-3 font-semibold text-white">
                        <Badge variant="outline">{perm.module}</Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-blue-400 font-bold">{perm.code}</td>
                      <td className="p-3 text-xs text-slate-300">{perm.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
