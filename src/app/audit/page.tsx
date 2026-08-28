"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { History, ShieldAlert, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*, user:profiles!audit_logs_user_id_fkey(*)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs((data || []) as AuditLog[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-blue-400" />
          Bitácora de Auditoría del Sistema
        </h1>
        <p className="text-sm text-slate-400">Trazabilidad inmutable de cambios de precios, costos, ajustes de inventario y anulación de ventas</p>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Filtrar por acción o entidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No hay registros de auditoría aún.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Fecha & Hora</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Acción</th>
                    <th className="p-3">Entidad</th>
                    <th className="p-3">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-xs text-slate-400 font-mono">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        {log.user?.full_name || "Sistema / Supabase"}
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-blue-400">{log.entity_name}</td>
                      <td className="p-3 text-xs font-mono text-slate-400 truncate max-w-xs">
                        {JSON.stringify(log.new_data || log.old_data || {})}
                      </td>
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
