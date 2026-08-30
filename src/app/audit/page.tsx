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
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
          <History className="h-7 w-7 text-[#ED1C24]" />
          Bitácora de Auditoría del Sistema
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-medium">Trazabilidad inmutable de cambios de precios, costos, ajustes de inventario y anulación de ventas</p>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por acción o entidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-input text-foreground"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No hay registros de auditoría aún.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3.5">Fecha & Hora</th>
                    <th className="p-3.5">Usuario</th>
                    <th className="p-3.5">Acción</th>
                    <th className="p-3.5">Entidad</th>
                    <th className="p-3.5">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3.5 text-xs text-muted-foreground font-mono">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {log.user?.full_name || "Sistema / Supabase"}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="default" className="font-mono text-[10px] bg-[#ED1C24] text-white font-bold">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-[#ED1C24] font-bold">{log.entity_name}</td>
                      <td className="p-3.5 text-xs font-mono text-muted-foreground truncate max-w-xs">
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
