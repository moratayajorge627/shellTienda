"use client";

import React, { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { Product, InventoryMovement, MovementType } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import {
  Boxes,
  Plus,
  Minus,
  History,
  Scan,
  Search,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [searchTerm, setSearchTerm] = useState("");

  // Barcode Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Manual Adjustment Modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [movementType, setMovementType] = useState<MovementType>("AJUSTE_ENTRADA");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, movData] = await Promise.all([
        productService.getProducts(),
        productService.getInventoryMovements(),
      ]);
      setProducts(prodData);
      setMovements(movData);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjustModal = (prod: Product) => {
    setSelectedProduct(prod);
    setAdjustQuantity("1");
    setMovementType("AJUSTE_ENTRADA");
    setNotes("");
    setErrorMsg("");
    setSuccessMsg("");
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedProduct) return;
    const qty = parseFloat(adjustQuantity);

    if (isNaN(qty) || qty === 0) {
      setErrorMsg("La cantidad ingresada debe ser diferente de cero.");
      return;
    }

    // Determinar signo
    const finalQty =
      movementType === "AJUSTE_SALIDA" || movementType === "PRODUCTO_DAÑADO"
        ? -Math.abs(qty)
        : Math.abs(qty);

    setSubmitting(true);

    try {
      await productService.adjustStock({
        product_id: selectedProduct.id,
        quantity: finalQty,
        movement_type: movementType,
        notes: notes.trim() || undefined,
        user_id: user?.id,
      });

      setSuccessMsg("Ajuste de inventario aplicado exitosamente.");
      setTimeout(async () => {
        setAdjustModalOpen(false);
        await loadData();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al realizar ajuste de stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    setScannerOpen(false);
    const prod = await productService.getProductByBarcode(code);
    if (prod) {
      handleOpenAdjustModal(prod);
    } else {
      setSearchTerm(code);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-[#ED1C24]" />
            Control de Inventario
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Trazabilidad inmutable y ajustes auditados de stock</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setScannerOpen(true)}
            className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20"
          >
            <Scan className="h-4 w-4 text-[#FFD500]" />
            Escanear para Ajuste
          </Button>
        </div>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escaneo para Ingreso / Ajuste de Inventario"
      />

      {/* Navigation tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "stock"
              ? "border-[#ED1C24] text-[#ED1C24]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Boxes className="h-4 w-4" />
          Existencias de Stock
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "history"
              ? "border-[#ED1C24] text-[#ED1C24]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Historial de Movimientos ({movements.length})
        </button>
      </div>

      {activeTab === "stock" ? (
        <Card className="glass-card border-border">
          <CardHeader className="pb-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nombre, código..."
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3.5">Código</th>
                      <th className="p-3.5">Producto</th>
                      <th className="p-3.5">Stock Actual</th>
                      <th className="p-3.5">Stock Mínimo</th>
                      <th className="p-3.5">Estado Alerta</th>
                      <th className="p-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((prod) => {
                      const isLow = prod.stock_quantity <= prod.min_stock;
                      const isZero = prod.stock_quantity === 0;

                      return (
                        <tr key={prod.id} className="hover:bg-muted/50 transition-colors">
                          <td className="p-3.5 font-mono text-xs text-[#ED1C24] font-bold">{prod.internal_code}</td>
                          <td className="p-3.5 font-bold text-foreground">{prod.name}</td>
                          <td className="p-3.5 font-bold text-base text-foreground">
                            {prod.stock_quantity} {prod.unit_of_measure}s
                          </td>
                          <td className="p-3.5 text-muted-foreground font-medium">{prod.min_stock}</td>
                          <td className="p-3.5">
                            {isZero ? (
                              <Badge variant="destructive">Agotado</Badge>
                            ) : isLow ? (
                              <Badge variant="warning">Stock Bajo</Badge>
                            ) : (
                              <Badge variant="success">Normal</Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAdjustModal(prod)}
                              className="border-border text-xs text-[#ED1C24] hover:bg-red-500/10 font-bold"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Ajustar Stock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* HISTORIAL DE MOVIMIENTOS */
        <Card className="glass-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-[#ED1C24]" />
              Historial Inmutable de Movimientos de Inventario
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">Registro auditado de compras, ventas, devoluciones y ajustes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground font-medium">No hay movimientos registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Producto</th>
                      <th className="p-3.5">Tipo Movimiento</th>
                      <th className="p-3.5">Cantidad</th>
                      <th className="p-3.5">Stock Ant. &rarr; Post.</th>
                      <th className="p-3.5">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((mov) => {
                      const isPositive = Number(mov.quantity) > 0;

                      return (
                        <tr key={mov.id} className="hover:bg-muted/50 transition-colors">
                          <td className="p-3.5 text-xs text-muted-foreground font-mono">
                            {formatDateTime(mov.created_at)}
                          </td>
                          <td className="p-3.5 font-bold text-foreground">
                            {mov.product?.name || "Producto borrado"}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                mov.movement_type === "COMPRA" || mov.movement_type === "AJUSTE_ENTRADA"
                                  ? "success"
                                  : mov.movement_type === "VENTA"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-[11px] font-bold"
                            >
                              {mov.movement_type}
                            </Badge>
                          </td>
                          <td className={`p-3.5 font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                            {isPositive ? `+${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="p-3.5 text-xs text-muted-foreground font-mono">
                            {mov.stock_before} &rarr; <span className="font-bold text-foreground">{mov.stock_after}</span>
                          </td>
                          <td className="p-3.5 text-xs text-muted-foreground">{mov.notes || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Ajuste Manual de Stock */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Boxes className="h-5 w-5 text-[#ED1C24]" />
              Ajuste de Stock: {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajusta manualmente la cantidad física en existencia con registro auditado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted border border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Stock Actual en Sistema:</span>
              <span className="font-black text-foreground text-sm">{selectedProduct?.stock_quantity} unidades</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tipo de Movimiento</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as MovementType)}
                className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full font-bold focus:ring-2 focus:ring-[#ED1C24]"
              >
                <option value="AJUSTE_ENTRADA">Entrada / Incremento de Stock (+)</option>
                <option value="AJUSTE_SALIDA">Salida / Reducción de Stock (-)</option>
                <option value="PRODUCTO_DAÑADO">Producto Dañado / Vencido (-)</option>
                <option value="DEVOLUCION">Devolución de Cliente (+)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Cantidad *</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                required
                className="bg-card border-input font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Motivo / Observaciones *</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Conteo físico de inventario, merma..."
                required
                className="bg-card border-input"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setAdjustModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
