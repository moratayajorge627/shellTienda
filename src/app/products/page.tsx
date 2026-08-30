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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
        await productService.createProduct(payload as any);
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setSearchTerm(scannedCode);
  };

  const filtered = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.internal_code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));

    const matchesCat =
      selectedCategory === "ALL" || p.category_id === selectedCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Package className="h-7 w-7 text-[#ED1C24]" />
            Catálogo de Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Administra precios, existencias y códigos de barra</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="border-border text-foreground hover:bg-muted gap-2 font-bold"
          >
            <Scan className="h-4 w-4 text-[#ED1C24]" />
            Escanear
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20">
            <Plus className="h-4 w-4 text-[#FFD500]" />
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

      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código interno o barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card border-input text-foreground"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#ED1C24] w-full sm:w-48 font-medium"
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
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No se encontraron productos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3.5">Código</th>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Costo Compra</th>
                    <th className="p-3.5">Precio Venta</th>
                    <th className="p-3.5">Stock Actual</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((prod) => {
                    const isLow = prod.stock_quantity <= prod.min_stock;

                    return (
                      <tr key={prod.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3.5 font-mono text-xs text-[#ED1C24] font-bold">
                          <div>{prod.internal_code}</div>
                          {prod.barcode && <div className="text-[10px] text-muted-foreground font-mono">{prod.barcode}</div>}
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          <div>{prod.name}</div>
                          {prod.brand && <div className="text-xs text-muted-foreground font-normal">{prod.brand}</div>}
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-md font-medium border border-border">
                            {prod.category?.name || "Sin Categoría"}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground font-medium">{formatCurrency(prod.purchase_price)}</td>
                        <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(prod.sale_price)}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={isLow ? "text-amber-500 font-black" : "text-foreground"}>
                              {prod.stock_quantity} {prod.unit_of_measure}s
                            </span>
                            {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant={prod.status === "ACTIVO" ? "success" : "secondary"}>
                            {prod.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(prod)}
                            className="text-xs text-[#ED1C24] hover:bg-red-500/10 gap-1 font-bold"
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
        <DialogContent className="sm:max-w-xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-[#ED1C24]" />
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define los datos del producto, precios de compra y venta e inventario inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Código Interno</label>
                <Input
                  value={formData.internal_code}
                  onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                  placeholder="PROD-001"
                  required
                  className="bg-card border-input font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Código de Barras (Opcional)</label>
                <div className="relative">
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="7501055300010"
                    className="font-mono bg-card border-input"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nombre del Producto *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Coca Cola 600ml"
                  required
                  className="bg-card border-input font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Categoría</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full focus:ring-2 focus:ring-[#ED1C24]"
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Marca</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ej. Coca Cola, Lala..."
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Costo de Compra (Q) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  required
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Precio de Venta (Q) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required
                  className="bg-card border-input font-black text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Stock Inicial *</label>
                <Input
                  type="number"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  required
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Stock Mínimo Alerta *</label>
                <Input
                  type="number"
                  step="1"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  required
                  className="bg-card border-input"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
