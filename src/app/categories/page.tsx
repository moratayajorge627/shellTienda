"use client";

import React, { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { Category } from "@/types/database";
import { Plus, Tag, Edit, Check, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-400" />
            Categorías de Productos
          </h1>
          <p className="text-sm text-slate-400">Organiza y clasifica los productos de tu tienda</p>
        </div>

        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 text-slate-500">No se encontraron categorías.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base">{cat.name}</h3>
                      <Badge variant={cat.is_active ? "success" : "secondary"}>
                        {cat.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {cat.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(cat)}
                      className="text-xs text-blue-400 hover:text-blue-300 gap-1"
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
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Nombre de la Categoría</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Bebidas, Dulcería..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Descripción (Opcional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Bebidas gaseosas y refrescos"
              />
            </div>

            {editingCategory && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="catActive" className="text-xs text-slate-300 cursor-pointer">
                  Categoría Activa
                </label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
