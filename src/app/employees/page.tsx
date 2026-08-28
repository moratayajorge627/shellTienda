"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee, Profile } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Users, Plus, Edit, UserCheck, UserX, Search, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    position: "Cajero",
    salary: "3000.00",
    status: "ACTIVO" as "ACTIVO" | "INACTIVO",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select("*, profile:profiles!employees_user_id_fkey(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleOpenModal = (emp?: Employee) => {
    setErrorMsg("");
    if (emp) {
      setEditingEmp(emp);
      setFormData({
        first_name: emp.first_name,
        last_name: emp.last_name,
        phone: emp.phone || "",
        email: emp.email || "",
        address: emp.address || "",
        position: emp.position || "Cajero",
        salary: emp.salary.toString(),
        status: emp.status,
      });
    } else {
      setEditingEmp(null);
      setFormData({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address: "",
        position: "Cajero",
        salary: "3000.00",
        status: "ACTIVO",
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const sal = parseFloat(formData.salary);
    if (isNaN(sal) || sal < 0) {
      setErrorMsg("El salario no puede ser negativo.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (editingEmp) {
        // No borrado físico, solo desactivar si corresponde
        await supabase
          .from("employees")
          .update({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim() || undefined,
            email: formData.email.trim() || undefined,
            address: formData.address.trim() || undefined,
            position: formData.position.trim(),
            salary: sal,
            status: formData.status,
          })
          .eq("id", editingEmp.id);
      } else {
        await supabase.from("employees").insert([
          {
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim() || undefined,
            email: formData.email.trim() || undefined,
            address: formData.address.trim() || undefined,
            position: formData.position.trim(),
            salary: sal,
            status: "ACTIVO",
            created_by: user?.id,
          },
        ]);
      }

      setModalOpen(false);
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el empleado.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter(
    (e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.position && e.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Administración de Empleados
          </h1>
          <p className="text-sm text-slate-400">Control de personal, puestos, salarios y vinculación de usuarios</p>
        </div>

        <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Registrar Empleado
        </Button>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre o puesto..."
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
            <div className="text-center p-8 text-slate-500">No hay empleados registrados.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <Badge variant={emp.status === "ACTIVO" ? "success" : "destructive"}>
                        {emp.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-blue-400 font-medium mt-1">{emp.position || "Empleado"}</p>

                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      <div>Ingreso: <span className="text-slate-200">{formatDate(emp.hire_date)}</span></div>
                      <div>Salario: <span className="font-semibold text-emerald-400">{formatCurrency(emp.salary)}</span></div>
                      {emp.email && <div>Correo: <span className="text-slate-200">{emp.email}</span></div>}
                      {emp.phone && <div>Teléfono: <span className="text-slate-200">{emp.phone}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(emp)}
                      className="text-xs text-blue-400 hover:text-blue-300 gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar / Estado
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear/Editar Empleado */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>{editingEmp ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Apellido</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Pérez"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Puesto / Cargo</label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Cajero, Supervisor, Encargado..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5555-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Salario (Q)</label>
                <Input
                  type="number"
                  step="100"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="empleado@supertienda.gt"
              />
            </div>

            {editingEmp && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Estado del Empleado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO (Desactivado sin borrado histórico)</option>
                </select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Empleado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
