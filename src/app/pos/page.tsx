"use client";

import React, { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { posService } from "@/services/posService";
import { Product, CashRegister, PaymentMethod } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import {
  ShoppingCart,
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Printer,
  WalletCards,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface CartLineItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

export default function POSPage() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Barcode Camera Scanner
  const [scannerOpen, setScannerOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [customerName, setCustomerName] = useState("Cliente General");
  const [discount, setDiscount] = useState("0.00");

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [cashGiven, setCashGiven] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Receipt Modal State
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, regData] = await Promise.all([
        productService.getProducts(),
        posService.getActiveCashRegister(),
      ]);
      setProducts(prodData.filter((p) => p.status === "ACTIVO"));
      setActiveRegister(regData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      alert("Este producto no tiene stock disponible.");
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > product.stock_quantity) {
        alert(`No hay suficiente stock. Disponibles: ${product.stock_quantity}`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, unit_price: product.sale_price }]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.product.stock_quantity) {
      alert(`No hay suficiente stock. Disponibles: ${item.product.stock_quantity}`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleBarcodeScanned = (code: string) => {
    setScannerOpen(false);
    const found = products.find(
      (p) => p.barcode === code || p.internal_code === code
    );

    if (found) {
      addToCart(found);
    } else {
      setSearchTerm(code);
    }
  };

  // Totales
  const subtotalCart = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountVal = parseFloat(discount) || 0;
  const totalCart = Math.max(0, subtotalCart - discountVal);
  const cashGivenVal = parseFloat(cashGiven) || 0;
  const changeVal = Math.max(0, cashGivenVal - totalCart);

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod("EFECTIVO");
    setCashGiven(totalCart.toFixed(2));
    setReferenceNumber("");
    setErrorMsg("");
    setCheckoutOpen(true);
  };

  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!user) {
      setErrorMsg("Usuario no autenticado.");
      return;
    }

    if (paymentMethod === "EFECTIVO" && cashGivenVal < totalCart) {
      setErrorMsg(`El efectivo entregado debe ser al menos ${formatCurrency(totalCart)}.`);
      return;
    }

    setSubmitting(true);

    try {
      const saleId = await posService.processSale({
        cash_register_id: activeRegister?.id,
        user_id: user.id,
        customer_name: customerName.trim() || "Cliente General",
        subtotal: subtotalCart,
        discount: discountVal,
        total: totalCart,
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        payments: [
          {
            payment_method: paymentMethod,
            amount: totalCart,
            reference_number: referenceNumber.trim() || undefined,
          },
        ],
      });

      setLastSaleId(saleId);
      setCheckoutOpen(false);
      setCart([]);
      setDiscount("0.00");
      setCustomerName("Cliente General");

      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la venta.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-4">
      {/* Header POS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Punto de Venta (POS)</h1>
            <p className="text-xs text-slate-400">Atención rápida a clientes & escaneo directo</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeRegister ? (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <WalletCards className="h-3.5 w-3.5" />
              Caja Abierta: {activeRegister.register_number}
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 py-1 px-3">
              <AlertTriangle className="h-3.5 w-3.5" />
              Caja No Aperturada
            </Badge>
          )}

          <Button onClick={() => setScannerOpen(true)} className="bg-blue-600 hover:bg-blue-500 gap-2 font-semibold">
            <Scan className="h-4 w-4" />
            Escanear Código
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escaneo para Carrito POS"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LADO IZQUIERDO: Búsqueda y Catálogo de Productos (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="glass-card border-slate-800">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar por nombre, código interno o barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-950/90 text-base"
                  autoFocus
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-600/10 text-left transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono text-blue-400 group-hover:text-blue-300">
                          {prod.internal_code}
                        </div>
                        <h4 className="font-bold text-white text-sm mt-1 line-clamp-2 leading-snug">
                          {prod.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-xs text-slate-400">{prod.stock_quantity} disp.</span>
                        <span className="font-extrabold text-emerald-400 text-base">
                          {formatCurrency(prod.sale_price)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LADO DERECHO: Carrito de Compras (5 Cols) */}
        <div className="lg:col-span-5">
          <Card className="glass-card border-slate-800 sticky top-20 flex flex-col h-[82vh]">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-400" />
                  Carrito de Venta ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-xs text-red-400">
                    Vaciar
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Cart Items List */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm py-12">
                  <ShoppingCart className="h-12 w-12 stroke-1 mb-2 opacity-40" />
                  <span>El carrito está vacío.</span>
                  <span className="text-xs text-slate-600 mt-1">Selecciona productos o escanea con la cámara.</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-white text-sm truncate">{item.product.name}</h5>
                      <span className="text-xs text-emerald-400 font-bold">{formatCurrency(item.unit_price)} c/u</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="h-7 w-7 border-slate-800"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-mono font-bold text-white text-sm">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="h-7 w-7 border-slate-800"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(idx)}
                        className="h-7 w-7 text-red-400 hover:text-red-300 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            {/* Cart Summary Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-white">{formatCurrency(subtotalCart)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Descuento (Q):</span>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 h-7 text-right text-xs py-0"
                  />
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-xl text-emerald-400">{formatCurrency(totalCart)}</span>
                </div>
              </div>

              <Button
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25"
              >
                Cobrar {formatCurrency(totalCart)}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Cobro y Pago */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Finalizar Venta</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProcessSale} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold">Monto Total a Cobrar</span>
              <div className="text-3xl font-black text-emerald-400">{formatCurrency(totalCart)}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nombre del Cliente</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cliente General"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {(["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as PaymentMethod[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={paymentMethod === m ? "default" : "outline"}
                    onClick={() => setPaymentMethod(m)}
                    className="text-xs font-semibold"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "EFECTIVO" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Efectivo Recibido</label>
                  <Input
                    type="number"
                    step="0.50"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Cambio a Entregar</label>
                  <div className="h-10 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-lg font-bold text-emerald-400 flex items-center">
                    {formatCurrency(changeVal)}
                  </div>
                </div>
              </div>
            )}

            {paymentMethod !== "EFECTIVO" && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300">No. Referencia / Comprobante</label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej. VOUCHER-9871"
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCheckoutOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar & Emitir Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
