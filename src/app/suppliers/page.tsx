"use client";

import React, { useEffect, useState } from "react";
import { supplierService } from "@/services/supplierService";
import { Supplier } from "@/types/database";
import { Store, Plus, Search, Edit, Phone, Mail, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Store className="h-7 w-7 text-[#ED1C24]" />
            Directorio de Proveedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Administra los proveedores de mercadería y servicios</p>
        </div>

        <Button onClick={() => handleOpenModal()} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20">
          <Plus className="h-4 w-4 text-[#FFD500]" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-input text-foreground"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground font-medium">No hay proveedores registrados.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((sup) => (
                <div
                  key={sup.id}
                  className="p-5 rounded-xl bg-card border border-border flex flex-col justify-between hover:border-[#ED1C24]/50 transition-all shadow-sm space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-base">{sup.name}</h3>
                      <Badge variant={sup.status === "ACTIVO" ? "success" : "secondary"}>
                        {sup.status}
                      </Badge>
                    </div>
                    {sup.company_name && (
                      <p className="text-xs text-[#ED1C24] font-bold mt-0.5">{sup.company_name}</p>
                    )}

                    <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground bg-muted p-3 rounded-xl border border-border">
                      {sup.nit && <div><span className="font-bold text-foreground">NIT:</span> <span className="font-mono">{sup.nit}</span></div>}
                      {sup.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground font-medium">{sup.phone}</span>
                        </div>
                      )}
                      {sup.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground font-medium">{sup.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(sup)}
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

      {/* Modal Crear/Editar Proveedor */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="h-5 w-5 text-[#ED1C24]" />
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registra los datos de contacto y facturación del proveedor.
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
                <label className="text-xs font-bold text-foreground">Nombre del Proveedor *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Distribuidora Central"
                  required
                  className="bg-card border-input font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Empresa / Razón Social</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Ej. Bebidas S.A."
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">NIT</label>
                <Input
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="1234567-8"
                  className="bg-card border-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="2200-0000"
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Correo Electrónico</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ventas@empresa.gt"
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nombre de Contacto</label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="bg-card border-input"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-foreground">Dirección</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zona 1, Ciudad de Guatemala"
                  className="bg-card border-input"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
