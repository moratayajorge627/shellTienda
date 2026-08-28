"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee, Role } from "@/types/database";

import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Plus, Edit, Search, Loader2,
  KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";


export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
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

  // Estado para creación de acceso al sistema
  const [createAccess, setCreateAccess] = useState(false);
  const [systemEmail, setSystemEmail] = useState("");
  const [systemPassword, setSystemPassword] = useState("");
  const [showSystemPassword, setShowSystemPassword] = useState(false);
  const [roleName, setRoleName] = useState("CAJERO");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [empRes, rolesRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*, profile:profiles!employees_user_id_fkey(*)")
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("*").order("name"),
      ]);

      if (empRes.error) throw empRes.error;
      setEmployees((empRes.data || []) as Employee[]);
      setAvailableRoles((rolesRes.data || []) as Role[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const resetAccessFields = () => {
    setCreateAccess(false);
    setSystemEmail("");
    setSystemPassword("");
    setShowSystemPassword(false);
    setRoleName("CAJERO");
  };

  const handleOpenModal = (emp?: Employee) => {
    setErrorMsg("");
    setSuccessMsg("");
    resetAccessFields();

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
    setSuccessMsg("");

    const sal = parseFloat(formData.salary);
    if (isNaN(sal) || sal < 0) {
      setErrorMsg("El salario no puede ser negativo.");
      return;
    }

    // Validar campos de acceso si está activado (solo en creación)
    if (!editingEmp && createAccess) {
      if (!systemEmail) { setErrorMsg("Ingresa el correo del sistema."); return; }
      if (systemPassword.length < 6) { setErrorMsg("La contraseña debe tener al menos 6 caracteres."); return; }
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (editingEmp) {
        // ---- EDICIÓN ----
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

        setSuccessMsg("Empleado actualizado correctamente.");
      } else {
        // ---- CREACIÓN ----
        const { data: newEmpData, error: insertError } = await supabase
          .from("employees")
          .insert([
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
          ])
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Si se solicitó crear acceso al sistema
        if (createAccess && newEmpData) {
          const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
          const res = await fetch("/api/admin/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: systemEmail.trim(),
              password: systemPassword,
              full_name,
              role_name: roleName,
              employee_id: newEmpData.id,
            }),
          });

          const json = await res.json();
          if (!res.ok) {
            setErrorMsg(`Empleado registrado, pero falló la cuenta: ${json.error}`);
            setSubmitting(false);
            await loadEmployees();
            return;
          }

          setSuccessMsg(
            `✅ Empleado registrado y cuenta creada con rol ${roleName}. Ya puede iniciar sesión con el correo ${systemEmail.trim()}.`
          );
        } else {
          setSuccessMsg("Empleado registrado correctamente (sin acceso al sistema).");
        }
      }

      await loadEmployees();
      if (!errorMsg) {
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg("");
        }, 2500);
      }
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

                    {/* Indicador de acceso al sistema */}
                    <div className="mt-2">
                      {emp.user_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          <Shield className="h-3 w-3" /> Acceso al Sistema
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/40 rounded-full px-2 py-0.5">
                          Sin acceso al sistema
                        </span>
                      )}
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
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) { setSuccessMsg(""); setErrorMsg(""); } }}>
        <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmp ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Datos laborales */}
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
              <label className="text-xs font-semibold text-slate-300">Correo (informativo)</label>
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

            {/* ── SECCIÓN ACCESO AL SISTEMA (solo al crear) ── */}
            {!editingEmp && (
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
                {/* Toggle header */}
                <button
                  type="button"
                  onClick={() => setCreateAccess((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-slate-200">Crear acceso al sistema</span>
                  </div>
                  {/* Toggle pill */}
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                      createAccess ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        createAccess ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                {createAccess && (
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-700/60 pt-4">
                    <p className="text-xs text-slate-400">
                      Se creará una cuenta en el sistema con el rol seleccionado. El empleado podrá iniciar sesión inmediatamente.
                    </p>

                    {/* Selector de Rol */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Rol del Sistema</label>
                      <select
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 w-full focus:ring-2 focus:ring-blue-500"
                        required={createAccess}
                      >
                        {availableRoles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}{r.description ? ` — ${r.description}` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">
                        Los roles y sus permisos se administran en la sección <span className="text-blue-400">Roles & Permisos</span>.
                      </p>
                    </div>

                    {/* Correo del sistema */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Correo de acceso</label>
                      <Input
                        type="email"
                        value={systemEmail}
                        onChange={(e) => setSystemEmail(e.target.value)}
                        placeholder="cajero@supertienda.gt"
                        required={createAccess}
                      />
                    </div>

                    {/* Contraseña temporal */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Contraseña temporal</label>
                      <div className="relative">
                        <Input
                          type={showSystemPassword ? "text" : "password"}
                          value={systemPassword}
                          onChange={(e) => setSystemPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                          required={createAccess}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSystemPassword((v) => !v)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                          tabIndex={-1}
                          aria-label={showSystemPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showSystemPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">Mínimo 6 caracteres. El empleado puede cambiarla después desde su perfil.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEmp ? "Guardar Cambios" : "Registrar Empleado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
