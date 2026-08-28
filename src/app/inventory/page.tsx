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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
    // Buscar el producto por código
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-400" />
            Control de Inventario
          </h1>
          <p className="text-sm text-slate-400">Trazabilidad inmutable y ajustes auditados de stock</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setScannerOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20"
          >
            <Scan className="h-4 w-4" />
            Escanear Producto para Ingreso
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
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "stock"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Boxes className="h-4 w-4" />
          Existencias de Stock
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "history"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="h-4 w-4" />
          Historial de Movimientos ({movements.length})
        </button>
      </div>

      {activeTab === "stock" ? (
        <Card className="glass-card border-slate-800">
          <CardHeader className="pb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filtrar por nombre, código..."
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Stock Actual</th>
                      <th className="p-3">Stock Mínimo</th>
                      <th className="p-3">Estado Alerta</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.map((prod) => {
                      const isLow = prod.stock_quantity <= prod.min_stock;
                      const isZero = prod.stock_quantity === 0;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-mono text-xs text-blue-400">{prod.internal_code}</td>
                          <td className="p-3 font-semibold text-white">{prod.name}</td>
                          <td className="p-3 font-bold text-base text-white">
                            {prod.stock_quantity} {prod.unit_of_measure}s
                          </td>
                          <td className="p-3 text-slate-400">{prod.min_stock}</td>
                          <td className="p-3">
                            {isZero ? (
                              <Badge variant="destructive">Agotado</Badge>
                            ) : isLow ? (
                              <Badge variant="warning">Stock Bajo</Badge>
                            ) : (
                              <Badge variant="success">Normal</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAdjustModal(prod)}
                              className="border-slate-800 text-xs text-blue-400 hover:bg-blue-600/10"
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
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Historial Inmutable de Movimientos de Inventario</CardTitle>
            <CardDescription>Registro auditado de compras, ventas, devoluciones y ajustes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center p-8 text-slate-500">No hay movimientos registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Tipo Movimiento</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3">Stock Ant. &rarr; Post.</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {movements.map((mov) => {
                      const isPositive = Number(mov.quantity) > 0;

                      return (
                        <tr key={mov.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 text-xs text-slate-400 font-mono">
                            {formatDateTime(mov.created_at)}
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {mov.product?.name || "Producto borrado"}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                mov.movement_type === "COMPRA" || mov.movement_type === "AJUSTE_ENTRADA"
                                  ? "success"
                                  : mov.movement_type === "VENTA"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-[11px]"
                            >
                              {mov.movement_type}
                            </Badge>
                          </td>
                          <td className={`p-3 font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? `+${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="p-3 text-xs text-slate-400 font-mono">
                            {mov.stock_before} &rarr; <span className="font-semibold text-white">{mov.stock_after}</span>
                          </td>
                          <td className="p-3 text-xs text-slate-400">{mov.notes || "-"}</td>
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
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Ajuste de Stock: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Stock Actual en Sistema:</span>
              <span className="font-bold text-white text-sm">{selectedProduct?.stock_quantity} unidades</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Tipo de Movimiento</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as MovementType)}
                className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
              >
                <option value="AJUSTE_ENTRADA">Entrada / Incremento de Stock (+)</option>
                <option value="AJUSTE_SALIDA">Salida / Reducción de Stock (-)</option>
                <option value="PRODUCTO_DAÑADO">Producto Dañado / Vencido (-)</option>
                <option value="DEVOLUCION">Devolución de Cliente (+)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Cantidad</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Observaciones / Motivo (Obligatorio trazabilidad)</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Conteo físico de inventario, merma..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAdjustModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
