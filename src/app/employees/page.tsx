"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee, Role } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Plus, Edit, Search, Loader2, Shield,
  KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, RefreshCw, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal principal Crear/Editar Empleado
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

  // Estado para creación automática de acceso al sistema
  const [createAccess, setCreateAccess] = useState(true);
  const [username, setUsername] = useState("");
  const [systemPassword, setSystemPassword] = useState("");
  const [showSystemPassword, setShowSystemPassword] = useState(false);
  const [roleName, setRoleName] = useState("CAJERO");
  const [userManuallyEditedUsername, setUserManuallyEditedUsername] = useState(false);

  // Modal rápido de Reset/Crear Acceso individual
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [targetEmpForAccess, setTargetEmpForAccess] = useState<Employee | null>(null);
  const [quickUsername, setQuickUsername] = useState("");
  const [quickPassword, setQuickPassword] = useState("");
  const [quickRoleName, setQuickRoleName] = useState("CAJERO");
  const [quickShowPassword, setQuickShowPassword] = useState(false);

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
      
      const roles = (rolesRes.data || []) as Role[];
      setAvailableRoles(roles);
      if (roles.length > 0 && !roles.some(r => r.name === "CAJERO")) {
        setRoleName(roles[0].name);
        setQuickRoleName(roles[0].name);
      }
    } catch (e) {
      console.error("Error al cargar empleados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Generador de contraseñas seguras rápidas
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
    let pass = "Shell";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += "2026!";
    return pass;
  };

  // Auto-sugerir nombre de usuario cuando se escriben nombres y apellidos
  const handleNameChange = (firstName: string, lastName: string) => {
    setFormData((prev) => ({ ...prev, first_name: firstName, last_name: lastName }));
    
    if (!userManuallyEditedUsername && !editingEmp) {
      const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanFirst && cleanLast) {
        setUsername(`${cleanFirst}.${cleanLast}`);
      } else if (cleanFirst) {
        setUsername(`${cleanFirst}1`);
      }
    }
  };

  const handleOpenModal = (emp?: Employee) => {
    setErrorMsg("");
    setSuccessMsg("");
    setUserManuallyEditedUsername(false);

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
      setCreateAccess(false);
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
      setCreateAccess(true);
      setUsername("");
      setSystemPassword(generateRandomPassword());
      setShowSystemPassword(true);
      setRoleName("CAJERO");
    }
    setModalOpen(true);
  };

  const handleOpenAccessModal = (emp: Employee) => {
    setTargetEmpForAccess(emp);
    setErrorMsg("");
    setSuccessMsg("");

    const suggestedUser = emp.email?.includes("@tienda.local")
      ? emp.email.split("@")[0]
      : `${emp.first_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${emp.last_name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    setQuickUsername(suggestedUser);
    setQuickPassword(generateRandomPassword());
    setQuickShowPassword(true);
    setQuickRoleName(emp.position?.toUpperCase().includes("ADMIN") ? "ADMIN" : "CAJERO");
    setAccessModalOpen(true);
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

    if (!editingEmp && createAccess) {
      if (!username.trim()) {
        setErrorMsg("Ingresa un nombre de usuario para el acceso.");
        return;
      }
      if (systemPassword.length < 6) {
        setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (editingEmp) {
        // ---- EDICIÓN ----
        const { error: updateErr } = await supabase
          .from("employees")
          .update({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            address: formData.address.trim() || null,
            position: formData.position.trim(),
            salary: sal,
            status: formData.status,
          })
          .eq("id", editingEmp.id);

        if (updateErr) throw updateErr;

        setSuccessMsg("Empleado actualizado correctamente.");
      } else {
        // ---- CREACIÓN ----
        const { data: newEmpData, error: insertError } = await supabase
          .from("employees")
          .insert([
            {
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              phone: formData.phone.trim() || null,
              email: formData.email.trim() || null,
              address: formData.address.trim() || null,
              position: formData.position.trim(),
              salary: sal,
              status: "ACTIVO",
              created_by: user?.id || null,
            },
          ])
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Creación automática de acceso si está activado
        if (createAccess && newEmpData) {
          const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
          const res = await fetch("/api/admin/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: username.trim(),
              email: formData.email.trim() || undefined,
              password: systemPassword,
              full_name,
              role_name: roleName,
              employee_id: newEmpData.id,
            }),
          });

          const json = await res.json();
          if (!res.ok) {
            setErrorMsg(`Empleado registrado, pero falló la cuenta de usuario: ${json.error}`);
            setSubmitting(false);
            await loadEmployees();
            return;
          }

          setSuccessMsg(
            `✅ Empleado registrado y acceso habilitado automáticamente. Usuario: @${json.username} (Rol: ${roleName}).`
          );
        } else {
          setSuccessMsg("Empleado registrado correctamente (sin acceso al sistema).");
        }
      }

      await loadEmployees();
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el empleado.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuickAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpForAccess) return;

    if (!quickUsername.trim()) {
      setErrorMsg("Ingresa un nombre de usuario.");
      return;
    }
    if (quickPassword.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const full_name = `${targetEmpForAccess.first_name} ${targetEmpForAccess.last_name}`;
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: quickUsername.trim(),
          email: targetEmpForAccess.email || undefined,
          password: quickPassword,
          full_name,
          role_name: quickRoleName,
          employee_id: targetEmpForAccess.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "No se pudo actualizar el acceso.");
        setSubmitting(false);
        return;
      }

      setSuccessMsg(`✅ Acceso configurado exitosamente para @${json.username}.`);
      await loadEmployees();
      setTimeout(() => {
        setAccessModalOpen(false);
        setSuccessMsg("");
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al configurar el acceso.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter(
    (e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.position && e.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-[#ED1C24]" />
            Administración de Empleados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            Control de personal, puestos, salarios y asignación automática de usuarios
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20"
        >
          <Plus className="h-4 w-4 text-[#FFD500]" />
          Registrar Nuevo Empleado
        </Button>
      </div>

      {/* Listado y Búsqueda */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, puesto o usuario..."
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
            <div className="text-center p-12 text-muted-foreground font-medium">
              No se encontraron empleados registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((emp) => {
                const hasAccount = !!emp.user_id;
                const displayUser = emp.email?.includes("@tienda.local")
                  ? emp.email.replace("@tienda.local", "")
                  : emp.email || null;

                return (
                  <div
                    key={emp.id}
                    className="p-5 rounded-xl bg-card border border-border hover:border-[#ED1C24]/50 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-foreground text-base leading-tight">
                          {emp.first_name} {emp.last_name}
                        </h3>
                        <Badge variant={emp.status === "ACTIVO" ? "success" : "destructive"}>
                          {emp.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-[#ED1C24]">{emp.position || "Empleado"}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-black text-emerald-500">{formatCurrency(emp.salary)}/mes</span>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border">
                        <div><span className="font-bold text-foreground">Fecha Ingreso:</span> {formatDate(emp.hire_date)}</div>
                        {emp.phone && <div><span className="font-bold text-foreground">Teléfono:</span> {emp.phone}</div>}
                        {emp.email && !emp.email.includes("@tienda.local") && (
                          <div><span className="font-bold text-foreground">Correo:</span> {emp.email}</div>
                        )}
                      </div>

                      {/* Estado de Acceso al Sistema */}
                      <div className="mt-3 flex items-center justify-between">
                        {hasAccount ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>@{displayUser || "usuario"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Sin acceso</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAccessModal(emp)}
                        className="text-xs border-border hover:border-[#ED1C24] text-foreground hover:text-[#ED1C24] gap-1 font-bold"
                        title="Configurar usuario y contraseña"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-[#ED1C24]" />
                        {hasAccount ? "Resetear Clave" : "Crear Acceso"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(emp)}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Principal Crear/Editar Empleado */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) { setSuccessMsg(""); setErrorMsg(""); } }}>
        <DialogContent className="sm:max-w-xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingEmp ? "Editar Datos del Empleado" : "Registrar Nuevo Empleado"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {editingEmp
                ? "Actualiza la información laboral y personal del empleado."
                : "Ingresa los datos personales y se generará su acceso al sistema automáticamente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Datos Personales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nombres *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleNameChange(e.target.value, formData.last_name)}
                  placeholder="Ej. Carlos"
                  required
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Apellidos *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleNameChange(formData.first_name, e.target.value)}
                  placeholder="Ej. Gómez"
                  required
                  className="bg-card border-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Puesto / Cargo *</label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Cajero, Supervisor, Bodeguero..."
                  required
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Salario Mensual (Q) *</label>
                <Input
                  type="number"
                  step="50"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                  className="bg-card border-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Teléfono (Opcional)</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej. 5555-1234"
                  className="bg-card border-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Correo (Opcional)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="empleado@correo.com"
                  className="bg-card border-input"
                />
              </div>
            </div>

            {editingEmp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Estado del Empleado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full focus:ring-2 focus:ring-[#ED1C24]"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO (Desactivado sin borrado histórico)</option>
                </select>
              </div>
            )}

            {/* ── SECCIÓN ACCESO AL SISTEMA (AUTOMÁTICO AL CREAR) ── */}
            {!editingEmp && (
              <div className="rounded-xl border border-border bg-muted/40 overflow-hidden p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#ED1C24]" />
                    <span className="text-sm font-bold text-foreground">Acceso al Sistema (Usuario & Clave)</span>
                  </div>
                  <Badge variant="default" className="bg-[#FFD500] text-[#222222] font-black text-[10px]">
                    Automático
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Nombre de usuario */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Nombre de Usuario *</label>
                    <div className="relative">
                      <Input
                        value={username}
                        onChange={(e) => {
                          setUserManuallyEditedUsername(true);
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""));
                        }}
                        placeholder="Ej. carlos.gomez"
                        required={createAccess}
                        className="bg-card border-input font-mono font-bold text-sm"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Iniciará sesión con este usuario.</p>
                  </div>

                  {/* Rol del Sistema */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Rol Asignado *</label>
                    <select
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full font-bold focus:ring-2 focus:ring-[#ED1C24]"
                      required={createAccess}
                    >
                      {availableRoles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}{r.description ? ` (${r.description})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Define sus permisos en el POS y Caja.</p>
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Contraseña de Acceso *</label>
                    <button
                      type="button"
                      onClick={() => setSystemPassword(generateRandomPassword())}
                      className="text-[11px] text-[#ED1C24] font-bold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Generar otra
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showSystemPassword ? "text" : "password"}
                      value={systemPassword}
                      onChange={(e) => setSystemPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10 bg-card border-input font-mono"
                      required={createAccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSystemPassword((v) => !v)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showSystemPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showSystemPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEmp ? "Guardar Cambios" : "Crear Empleado y Acceso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido: Crear / Resetear Acceso */}
      <Dialog open={accessModalOpen} onOpenChange={(open) => { setAccessModalOpen(open); if (!open) { setSuccessMsg(""); setErrorMsg(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#ED1C24]" />
              Acceso al Sistema: {targetEmpForAccess?.first_name} {targetEmpForAccess?.last_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configura o restablece el nombre de usuario, contraseña y rol de este empleado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuickAccess} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nombre de Usuario *</label>
              <Input
                value={quickUsername}
                onChange={(e) => setQuickUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder="cajero1"
                required
                className="bg-card border-input font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Rol del Sistema *</label>
              <select
                value={quickRoleName}
                onChange={(e) => setQuickRoleName(e.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground w-full font-bold focus:ring-2 focus:ring-[#ED1C24]"
                required
              >
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}{r.description ? ` (${r.description})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Nueva Contraseña *</label>
                <button
                  type="button"
                  onClick={() => setQuickPassword(generateRandomPassword())}
                  className="text-[11px] text-[#ED1C24] font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Generar otra
                </button>
              </div>
              <div className="relative">
                <Input
                  type={quickShowPassword ? "text" : "password"}
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10 bg-card border-input font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setQuickShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={quickShowPassword ? "Ocultar" : "Mostrar"}
                >
                  {quickShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setAccessModalOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar & Activar Acceso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
