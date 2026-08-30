"use client";

import React, { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { Category } from "@/types/database";
import { Plus, Tag, Edit, Check, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (cat?: Category) => {
    setErrorMsg("");
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setDescription(cat.description || "");
      setIsActive(cat.is_active);
    } else {
      setEditingCategory(null);
      setName("");
      setDescription("");
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name.trim()) return;
    setSaving(true);

    try {
      if (editingCategory) {
        await productService.updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await productService.createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }

      setModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar la categoría.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Tag className="h-7 w-7 text-[#ED1C24]" />
            Categorías de Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Organiza y clasifica los productos de tu tienda</p>
        </div>

        <Button onClick={() => handleOpenModal()} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20">
          <Plus className="h-4 w-4 text-[#FFD500]" />
          Nueva Categoría
        </Button>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-input text-foreground"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center p-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No se encontraron categorías.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((cat) => (
                <div
                  key={cat.id}
                  className="p-5 rounded-xl bg-card border border-border flex flex-col justify-between hover:border-[#ED1C24]/50 transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-base">{cat.name}</h3>
                      <Badge variant={cat.is_active ? "success" : "secondary"}>
                        {cat.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {cat.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(cat)}
                      className="text-xs text-[#ED1C24] hover:bg-red-500/10 gap-1 font-bold"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear/Editar Categoría */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#ED1C24]" />
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define el nombre y descripción para clasificar el inventario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nombre de la Categoría *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Bebidas, Dulcería..."
                required
                className="bg-card border-input font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Descripción (Opcional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Bebidas gaseosas y refrescos"
                className="bg-card border-input"
              />
            </div>

            {editingCategory && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-[#ED1C24] focus:ring-[#ED1C24]"
                />
                <label htmlFor="catActive" className="text-xs text-foreground font-semibold cursor-pointer">
                  Categoría Activa
                </label>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
