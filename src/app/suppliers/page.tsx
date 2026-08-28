"use client";

import React, { useEffect, useState } from "react";
import { supplierService } from "@/services/supplierService";
import { Supplier } from "@/types/database";
import { Store, Plus, Search, Edit, Phone, Mail, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    nit: "CF",
    phone: "",
    email: "",
    address: "",
    contact_name: "",
    notes: "",
    status: "ACTIVO" as "ACTIVO" | "INACTIVO",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenModal = (sup?: Supplier) => {
    setErrorMsg("");
    if (sup) {
      setEditingSupplier(sup);
      setFormData({
        name: sup.name,
        company_name: sup.company_name || "",
        nit: sup.nit || "CF",
        phone: sup.phone || "",
        email: sup.email || "",
        address: sup.address || "",
        contact_name: sup.contact_name || "",
        notes: sup.notes || "",
        status: sup.status,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        company_name: "",
        nit: "CF",
        phone: "",
        email: "",
        address: "",
        contact_name: "",
        notes: "",
        status: "ACTIVO",
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, {
          name: formData.name.trim(),
          company_name: formData.company_name.trim() || undefined,
          nit: formData.nit.trim() || "CF",
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          contact_name: formData.contact_name.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          status: formData.status,
        });
      } else {
        await supplierService.createSupplier({
          name: formData.name.trim(),
          company_name: formData.company_name.trim() || undefined,
          nit: formData.nit.trim() || "CF",
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          contact_name: formData.contact_name.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
      }

      setModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.company_name && s.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-400" />
            Directorio de Proveedores
          </h1>
          <p className="text-sm text-slate-400">Administra los proveedores de mercadería y servicios</p>
        </div>

        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre o empresa..."
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
            <div className="text-center p-8 text-slate-500">No hay proveedores registrados.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base">{sup.name}</h3>
                      <Badge variant={sup.status === "ACTIVO" ? "success" : "secondary"}>
                        {sup.status}
                      </Badge>
                    </div>
                    {sup.company_name && (
                      <p className="text-xs text-blue-400 font-medium">{sup.company_name}</p>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      {sup.nit && <div>NIT: <span className="text-slate-200">{sup.nit}</span></div>}
                      {sup.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-500" />
                          <span>{sup.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(sup)}
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

      {/* Modal Crear/Editar Proveedor */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre del Proveedor</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Distribuidora Central"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Empresa / Razón Social</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Ej. Bebidas S.A."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">NIT</label>
                <Input
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="1234567-8"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="2200-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ventas@empresa.gt"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre de Contacto</label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Dirección</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zona 1, Ciudad de Guatemala"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
