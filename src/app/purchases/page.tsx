"use client";

import React, { useEffect, useState } from "react";
import { supplierService } from "@/services/supplierService";
import { productService } from "@/services/productService";
import { Supplier, Product, Purchase, PaymentMethod } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Search,
  Loader2,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PurchaseLineItem {
  product: Product;
  quantity: number;
  unit_cost: number;
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Ingreso de Compra
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<PurchaseLineItem[]>([]);

  // Item selector modal
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("12");
  const [addCost, setAddCost] = useState("0.00");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [purcData, supData, prodData] = await Promise.all([
        supplierService.getPurchases(),
        supplierService.getSuppliers(),
        productService.getProducts(),
      ]);
      setPurchases(purcData);
      setSuppliers(supData);
      setProducts(prodData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : "");
    setInvoiceNumber("");
    setPaymentMethod("EFECTIVO");
    setIsPendingPayment(false);
    setNotes("");
    setCartItems([]);
    setErrorMsg("");
    setSuccessMsg("");
    setModalOpen(true);
  };

  const handleAddProductToCart = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseFloat(addQty);
    const cost = parseFloat(addCost);

    if (isNaN(qty) || qty <= 0) return;
    if (isNaN(cost) || cost < 0) return;

    // Verificar si ya está en el carrito
    const existingIndex = cartItems.findIndex((item) => item.product.id === prod.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].unit_cost = cost;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { product: prod, quantity: qty, unit_cost: cost }]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const totalPurchase = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setAddCost(prod.purchase_price.toString());
    }
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedSupplierId) {
      setErrorMsg("Debe seleccionar un proveedor.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMsg("Debe agregar al menos un producto a la compra.");
      return;
    }

    setSubmitting(true);

    try {
      await supplierService.createPurchase({
        supplier_id: selectedSupplierId,
        invoice_number: invoiceNumber.trim() || undefined,
        payment_method: paymentMethod,
        is_pending_payment: isPendingPayment,
        notes: notes.trim() || undefined,
        user_id: user?.id,
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
      });

      setSuccessMsg("Compra registrada exitosamente e inventario incrementado.");
      setTimeout(async () => {
        setModalOpen(false);
        await loadData();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar la compra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-400" />
            Compras de Mercadería
          </h1>
          <p className="text-sm text-slate-400">Ingreso transaccional de productos e incremento de stock</p>
        </div>

        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Registrar Nueva Compra
        </Button>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Historial de Compras</CardTitle>
          <CardDescription>Compras al contado y a crédito registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No hay compras registradas aún.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">No. Compra</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Proveedor</th>
                    <th className="p-3">Factura</th>
                    <th className="p-3">Método Pago</th>
                    <th className="p-3">Estado Pago</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {purchases.map((purc) => (
                    <tr key={purc.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-xs text-blue-400 font-bold">
                        {purc.purchase_number}
                      </td>
                      <td className="p-3 text-xs text-slate-400 font-mono">
                        {formatDateTime(purc.purchase_date)}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        {purc.supplier?.name || "Proveedor sin nombre"}
                      </td>
                      <td className="p-3 text-xs font-mono text-slate-400">
                        {purc.invoice_number || "-"}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {purc.payment_method}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={purc.payment_status === "PAGADA" ? "success" : "warning"}>
                          {purc.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold text-white text-base">
                        {formatCurrency(purc.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Registro de Nueva Compra */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Compra de Mercadería</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitPurchase} className="space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Proveedor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar Proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company_name ? `(${s.company_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">No. Factura (Opcional)</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej. FAC-10982"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <input
                type="checkbox"
                id="pendingPayment"
                checked={isPendingPayment}
                onChange={(e) => setIsPendingPayment(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="pendingPayment" className="text-xs font-semibold text-amber-300 cursor-pointer">
                Compra a Crédito (Generar Cuenta por Pagar al Proveedor)
              </label>
            </div>

            {/* Selector de Producto para la Compra */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Agregar Productos a la Compra</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                    className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.internal_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Cantidad"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Costo Unit. (Q)"
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" size="sm" onClick={handleAddProductToCart} className="bg-slate-800 hover:bg-slate-700 text-blue-400 gap-1 w-full sm:w-auto">
                <Plus className="h-4 w-4" /> Agregar Item
              </Button>
            </div>

            {/* Tabla de Items Agregados */}
            {cartItems.length > 0 && (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3">Costo Unitario</th>
                      <th className="p-3">Subtotal</th>
                      <th className="p-3 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold text-white">{item.product.name}</td>
                        <td className="p-3 font-mono">{item.quantity}</td>
                        <td className="p-3 text-slate-400">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatCurrency(item.quantity * item.unit_cost)}</td>
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 border-t border-slate-800">
                    <tr>
                      <td colSpan={3} className="p-3 font-bold text-right text-white">TOTAL COMPRA:</td>
                      <td colSpan={2} className="p-3 font-black text-xl text-emerald-400">{formatCurrency(totalPurchase)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 font-semibold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Compra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
