"use client";

import React, { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { Product, Category } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { BarcodeScannerModal } from "@/components/scanner/BarcodeScannerModal";
import {
  Package,
  Plus,
  Search,
  Scan,
  Edit,
  Tag,
  AlertTriangle,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Product Create/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    internal_code: "",
    barcode: "",
    name: "",
    description: "",
    category_id: "",
    brand: "",
    unit_of_measure: "Unidad",
    purchase_price: "0.00",
    sale_price: "0.00",
    stock_quantity: "0",
    min_stock: "5",
    image_url: "",
    status: "ACTIVO" as "ACTIVO" | "INACTIVO",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (prod?: Product) => {
    setErrorMsg("");
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        internal_code: prod.internal_code,
        barcode: prod.barcode || "",
        name: prod.name,
        description: prod.description || "",
        category_id: prod.category_id || "",
        brand: prod.brand || "",
        unit_of_measure: prod.unit_of_measure || "Unidad",
        purchase_price: prod.purchase_price.toString(),
        sale_price: prod.sale_price.toString(),
        stock_quantity: prod.stock_quantity.toString(),
        min_stock: prod.min_stock.toString(),
        image_url: prod.image_url || "",
        status: prod.status,
      });
    } else {
      setEditingProduct(null);
      const nextCode = `PROD-${String(products.length + 1).padStart(3, "0")}`;
      setFormData({
        internal_code: nextCode,
        barcode: "",
        name: "",
        description: "",
        category_id: categories.length > 0 ? categories[0].id : "",
        brand: "",
        unit_of_measure: "Unidad",
        purchase_price: "0.00",
        sale_price: "0.00",
        stock_quantity: "0",
        min_stock: "5",
        image_url: "",
        status: "ACTIVO",
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const purchase = parseFloat(formData.purchase_price);
    const sale = parseFloat(formData.sale_price);

    if (isNaN(purchase) || purchase < 0) {
      setErrorMsg("El precio de compra no puede ser negativo.");
      return;
    }

    if (isNaN(sale) || sale < 0) {
      setErrorMsg("El precio de venta no puede ser negativo.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        internal_code: formData.internal_code,
        barcode: formData.barcode.trim() || undefined,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id || null,
        brand: formData.brand.trim() || undefined,
        unit_of_measure: formData.unit_of_measure,
        purchase_price: purchase,
        sale_price: sale,
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
        min_stock: parseFloat(formData.min_stock) || 5,
        image_url: formData.image_url.trim() || undefined,
        status: formData.status,
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, payload);
      } else {
        await productService.createProduct(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setSearchTerm(scannedCode);
    setScannerOpen(false);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));

    const matchesCat =
      selectedCategory === "ALL" || p.category_id === selectedCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-400" />
            Catálogo de Productos
          </h1>
          <p className="text-sm text-slate-400">Administra precios, existencias y códigos de barra</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-2"
          >
            <Scan className="h-4 w-4 text-blue-400" />
            Escanear
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Producto para Filtrar"
      />

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por nombre, código interno o barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No se encontraron productos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Costo Compra</th>
                    <th className="p-3">Precio Venta</th>
                    <th className="p-3">Stock Actual</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((prod) => {
                    const isLow = prod.stock_quantity <= prod.min_stock;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono text-xs text-blue-400">
                          <div>{prod.internal_code}</div>
                          {prod.barcode && <div className="text-[10px] text-slate-500 font-mono">{prod.barcode}</div>}
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div>{prod.name}</div>
                          {prod.brand && <div className="text-xs text-slate-400 font-normal">{prod.brand}</div>}
                        </td>
                        <td className="p-3">
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {prod.category?.name || "Sin Categoría"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{formatCurrency(prod.purchase_price)}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatCurrency(prod.sale_price)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={isLow ? "text-amber-400" : "text-white"}>
                              {prod.stock_quantity} {prod.unit_of_measure}s
                            </span>
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={prod.status === "ACTIVO" ? "success" : "secondary"}>
                            {prod.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(prod)}
                            className="text-xs text-blue-400 hover:text-blue-300 gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
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

      {/* Modal Crear/Editar Producto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Código Interno</label>
                <Input
                  value={formData.internal_code}
                  onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                  placeholder="PROD-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Código de Barras (Opcional)</label>
                <div className="relative">
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="7501055300010"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre del Producto</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Coca Cola 600ml"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Categoría</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Marca</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ej. Coca Cola, Lala..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Costo de Compra (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Precio de Venta (Q)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Stock Inicial</label>
                <Input
                  type="number"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Stock Mínimo Alerta</label>
                <Input
                  type="number"
                  step="1"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
