"use client";

import React, { useEffect, useState } from "react";
import { posService } from "@/services/posService";
import { Sale } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Receipt, Eye, XCircle, Search, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function SalesPage() {
  const { user, hasPermission } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Details Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Annul Modal
  const [annulModalOpen, setAnnulModalOpen] = useState(false);
  const [saleToAnnul, setSaleToAnnul] = useState<Sale | null>(null);
  const [annulReason, setAnnulReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await posService.getSales();
      setSales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleOpenAnnulModal = (sale: Sale) => {
    setSaleToAnnul(sale);
    setAnnulReason("");
    setErrorMsg("");
    setAnnulModalOpen(true);
  };

  const handleConfirmAnnul = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!saleToAnnul || !user) return;
    if (!annulReason.trim()) {
      setErrorMsg("Debe ingresar el motivo de la anulación.");
      return;
    }

    setSubmitting(true);
    try {
      await posService.annulSale(saleToAnnul.id, user.id, annulReason.trim());
      setAnnulModalOpen(false);
      await loadSales();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al anular la venta.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = sales.filter(
    (s) =>
      s.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-400" />
            Historial de Ventas
          </h1>
          <p className="text-sm text-slate-400">Consulta transaccional y anulación auditada de ventas</p>
        </div>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por número de venta o cliente..."
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
            <div className="text-center p-8 text-slate-500">No hay ventas registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">No. Venta</th>
                    <th className="p-3">Fecha & Hora</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Cajero</th>
                    <th className="p-3">Método Pago</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold text-blue-400">
                        {sale.sale_number}
                      </td>
                      <td className="p-3 text-xs text-slate-400 font-mono">
                        {formatDateTime(sale.created_at)}
                      </td>
                      <td className="p-3 font-semibold text-white">{sale.customer_name}</td>
                      <td className="p-3 text-xs text-slate-300">
                        {sale.seller?.full_name || "Cajero"}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400 text-base">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="p-3">
                        <Badge variant={sale.status === "COMPLETADA" ? "success" : "destructive"}>
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSale(sale)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detalles
                        </Button>

                        {sale.status === "COMPLETADA" && hasPermission("sales.annul") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAnnulModal(sale)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Anular
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalles de Venta */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Detalle de Venta: {selectedSale?.sale_number}</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
                <div>Cliente: <span className="font-semibold text-white">{selectedSale.customer_name}</span></div>
                <div>Fecha: <span className="font-mono text-slate-300">{formatDateTime(selectedSale.created_at)}</span></div>
                <div>Cajero: <span className="text-slate-300">{selectedSale.seller?.full_name}</span></div>
                <div>Estado: <Badge variant={selectedSale.status === "COMPLETADA" ? "success" : "destructive"}>{selectedSale.status}</Badge></div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 font-semibold text-slate-400">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2">Cant</th>
                      <th className="p-2">Precio</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedSale.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-semibold text-white">{item.product?.name}</td>
                        <td className="p-2 font-mono">{item.quantity}</td>
                        <td className="p-2">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2 text-right font-bold text-emerald-400">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 font-bold border-t border-slate-800">
                    <tr>
                      <td colSpan={3} className="p-2 text-right text-white">TOTAL:</td>
                      <td className="p-2 text-right text-emerald-400 text-sm">{formatCurrency(selectedSale.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Anulación */}
      <Dialog open={annulModalOpen} onOpenChange={setAnnulModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-400">Anular Venta {saleToAnnul?.sale_number}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmAnnul} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              Esta acción revertirá atómicamente el stock de los productos vendidos y ajustará el flujo de caja sin borrado físico.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Motivo de Anulación (Obligatorio Auditoría)</label>
              <Input
                value={annulReason}
                onChange={(e) => setAnnulReason(e.target.value)}
                placeholder="Ej. Error en la cantidad cobrada, devolución del cliente..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAnnulModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} variant="destructive">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Anulación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
