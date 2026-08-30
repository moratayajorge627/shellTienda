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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-[#ED1C24]" />
            Historial de Ventas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Consulta transaccional y anulación auditada de ventas</p>
        </div>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número de venta o cliente..."
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
            <div className="text-center p-12 text-muted-foreground font-medium">No hay ventas registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3.5">No. Venta</th>
                    <th className="p-3.5">Fecha & Hora</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Cajero</th>
                    <th className="p-3.5">Método Pago</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3.5 font-mono text-xs font-bold text-[#ED1C24]">
                        {sale.sale_number}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground font-mono">
                        {formatDateTime(sale.created_at)}
                      </td>
                      <td className="p-3.5 font-bold text-foreground">{sale.customer_name}</td>
                      <td className="p-3.5 text-xs text-muted-foreground font-medium">
                        {sale.seller?.full_name || "Cajero"}
                      </td>
                      <td className="p-3.5 text-xs">
                        <span className="bg-muted text-foreground border border-border px-2.5 py-1 rounded-md font-bold">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-base">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={sale.status === "COMPLETADA" ? "success" : "destructive"}>
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSale(sale)}
                          className="text-xs text-[#ED1C24] hover:bg-red-500/10 font-bold"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detalles
                        </Button>

                        {sale.status === "COMPLETADA" && hasPermission("sales.annul") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAnnulModal(sale)}
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold"
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
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#ED1C24]" />
              Detalle de Venta: {selectedSale?.sale_number}
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-muted border border-border space-y-1.5 text-xs">
                <div><span className="text-muted-foreground font-medium">Cliente:</span> <span className="font-bold text-foreground">{selectedSale.customer_name}</span></div>
                <div><span className="text-muted-foreground font-medium">Fecha:</span> <span className="font-mono text-foreground">{formatDateTime(selectedSale.created_at)}</span></div>
                <div><span className="text-muted-foreground font-medium">Cajero:</span> <span className="text-foreground font-bold">{selectedSale.seller?.full_name}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-muted-foreground font-medium">Estado:</span> <Badge variant={selectedSale.status === "COMPLETADA" ? "success" : "destructive"}>{selectedSale.status}</Badge></div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted font-bold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5">Cant</th>
                      <th className="p-2.5">Precio</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedSale.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-bold text-foreground">{item.product?.name}</td>
                        <td className="p-2.5 font-mono">{item.quantity}</td>
                        <td className="p-2.5">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-black border-t border-border">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right text-foreground">TOTAL:</td>
                      <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(selectedSale.total)}</td>
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
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-red-500 font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Anular Venta {saleToAnnul?.sale_number}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmAnnul} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
              Esta acción revertirá atómicamente el stock de los productos vendidos y registrará el movimiento en auditoría.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Motivo de Anulación *</label>
              <Input
                value={annulReason}
                onChange={(e) => setAnnulReason(e.target.value)}
                placeholder="Ej. Error en cobro, devolución..."
                required
                className="bg-card border-input"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setAnnulModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-500 text-white font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Anulación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
