"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Role, Permission } from "@/types/database";
import {
  ShieldCheck, Lock, CheckCircle2, Shield, Loader2, Plus,
  Edit, Trash2, AlertCircle, X, Check, ChevronsUpDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ─── Tipos extendidos ──────────────────────────────────────────────────────────
interface RoleWithPermissions extends Role {
  permissionIds: Set<string>;
}

// ─── Colores por módulo ────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  products:   "text-violet-400 bg-violet-500/10 border-violet-500/20",
  inventory:  "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  sales:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cash:       "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  suppliers:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  expenses:   "text-red-400 bg-red-500/10 border-red-500/20",
  loans:      "text-pink-400 bg-pink-500/10 border-pink-500/20",
  incomes:    "text-lime-400 bg-lime-500/10 border-lime-500/20",
  reports:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  users:      "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  roles:      "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
  audit:      "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const moduleColor = (mod: string) =>
  MODULE_COLORS[mod] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";

// ─── Componente principal ──────────────────────────────────────────────────────
export default function RolesPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RoleWithPermissions | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Carga de datos ───────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [rRes, pRes, rpRes] = await Promise.all([
        supabase.from("roles").select("*").order("name"),
        supabase.from("permissions").select("*").order("module"),
        supabase.from("role_permissions").select("role_id, permission_id"),
      ]);

      const allPerms = (pRes.data || []) as Permission[];
      const allRolePerms = (rpRes.data || []) as { role_id: string; permission_id: string }[];

      // Mapear permisos a cada rol
      const rolesWithPerms: RoleWithPermissions[] = ((rRes.data || []) as Role[]).map((r) => ({
        ...r,
        permissionIds: new Set(
          allRolePerms.filter((rp) => rp.role_id === r.id).map((rp) => rp.permission_id)
        ),
      }));

      setRoles(rolesWithPerms);
      setPermissions(allPerms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Permisos agrupados por módulo ─────────────────────────────────────────────
  const permsByModule = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return map;
  }, [permissions]);

  // ── Dialog: abrir para crear / editar ────────────────────────────────────────
  const openCreate = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPerms(new Set());
    setErrorMsg("");
    setDialogOpen(true);
  };

  const openEdit = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || "");
    setSelectedPerms(new Set(role.permissionIds));
    setErrorMsg("");
    setDialogOpen(true);
  };

  // ── Toggles de permisos ───────────────────────────────────────────────────────
  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPerms.size === permissions.length) {
      setSelectedPerms(new Set());
    } else {
      setSelectedPerms(new Set(permissions.map((p) => p.id)));
    }
  };

  // ── Guardar rol ───────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmed = roleName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!trimmed) { setErrorMsg("El nombre del rol es requerido."); return; }

    setSubmitting(true);
    try {
      const supabase = createClient();
      let roleId: string;

      if (editingRole) {
        if (!editingRole.is_system) {
          // Actualizar nombre/descripción solo para roles no-sistema
          const { error } = await supabase
            .from("roles")
            .update({ name: trimmed, description: roleDesc.trim() || null })
            .eq("id", editingRole.id);
          if (error) throw error;
        }
        roleId = editingRole.id;
      } else {
        // Crear rol nuevo
        const { data, error } = await supabase
          .from("roles")
          .insert({ name: trimmed, description: roleDesc.trim() || null, is_system: false })
          .select("id")
          .single();
        if (error) {
          if (error.message.includes("unique") || error.code === "23505") {
            throw new Error(`Ya existe un rol llamado "${trimmed}".`);
          }
          throw error;
        }
        roleId = data.id;
      }

      // Reemplazar permisos: borrar todos y reinsertarlos
      await supabase.from("role_permissions").delete().eq("role_id", roleId);

      if (selectedPerms.size > 0) {
        const inserts = Array.from(selectedPerms).map((pid) => ({
          role_id: roleId,
          permission_id: pid,
        }));
        const { error: rpError } = await supabase.from("role_permissions").insert(inserts);
        if (rpError) throw rpError;
      }

      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el rol.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Eliminar rol ──────────────────────────────────────────────────────────────
  const openDelete = (role: RoleWithPermissions) => {
    setDeleteTarget(role);
    setDeleteError("");
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const supabase = createClient();

      // Verificar si tiene usuarios asignados
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role_id", deleteTarget.id);

      if (count && count > 0) {
        setDeleteError(
          `No se puede eliminar: ${count} usuario(s) tienen asignado este rol. Reasígnalos primero.`
        );
        setDeleting(false);
        return;
      }

      // Eliminar permisos y luego el rol
      await supabase.from("role_permissions").delete().eq("role_id", deleteTarget.id);
      const { error } = await supabase.from("roles").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || "Error al eliminar el rol.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            Roles & Permisos (RBAC)
          </h1>
          <p className="text-sm text-slate-400">
            Crea y configura roles personalizados con permisos granulares por módulo
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 font-semibold gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </Button>
      </div>

      {/* Tarjetas de Roles */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              permissions={permissions}
              onEdit={() => openEdit(role)}
              onDelete={() => openDelete(role)}
            />
          ))}
        </div>
      )}

      {/* Catálogo de permisos */}
      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400" />
            Catálogo de Permisos del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${moduleColor(perm.module)}`}>
                        {perm.module}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-blue-400 font-bold">{perm.code}</td>
                    <td className="p-3 text-xs text-slate-300">{perm.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog Crear / Editar Rol ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {editingRole ? `Editar Rol: ${editingRole.name}` : "Crear Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 overflow-hidden flex-1">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nombre y descripción */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Nombre del Rol *</label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="BODEGUERO"
                  className="uppercase placeholder:normal-case"
                  required
                  disabled={!!editingRole?.is_system}
                />
                {!editingRole?.is_system && (
                  <p className="text-[10px] text-slate-500">Se guardará en mayúsculas con guiones bajos</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Descripción</label>
                <Input
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Control de bodega e inventario"
                  disabled={!!editingRole?.is_system}
                />
              </div>
            </div>

            {/* Aviso para roles sistema */}
            {editingRole?.is_system && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 shrink-0">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Este es un <strong>rol del sistema</strong>. Solo puedes modificar sus permisos asignados — el nombre y la descripción están protegidos.
                </span>
              </div>
            )}

            {/* Selector de permisos */}
            <div className="flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-xs font-semibold text-slate-300">
                  Permisos Asignados
                  <span className="ml-2 text-blue-400 font-normal">
                    ({selectedPerms.size} / {permissions.length} seleccionados)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  {selectedPerms.size === permissions.length ? "Quitar todos" : "Seleccionar todos"}
                </button>
              </div>

              {/* Scroll area */}
              <div className="overflow-y-auto flex-1 rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-4">
                {Array.from(permsByModule.entries()).map(([module, perms]) => {
                  const modulePermsIds = perms.map((p) => p.id);
                  const allModuleSelected = modulePermsIds.every((id) => selectedPerms.has(id));
                  const someModuleSelected = modulePermsIds.some((id) => selectedPerms.has(id));

                  return (
                    <div key={module}>
                      {/* Encabezado del módulo */}
                      <button
                        type="button"
                        onClick={() => toggleModule(perms)}
                        className="flex items-center gap-2 w-full mb-2 group"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          allModuleSelected
                            ? "bg-blue-600 border-blue-600"
                            : someModuleSelected
                            ? "bg-blue-600/40 border-blue-500"
                            : "border-slate-600 group-hover:border-slate-400"
                        }`}>
                          {allModuleSelected && <Check className="h-3 w-3 text-white" />}
                          {someModuleSelected && !allModuleSelected && (
                            <span className="w-2 h-0.5 bg-white rounded" />
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${moduleColor(module)}`}>
                          {module.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({modulePermsIds.filter((id) => selectedPerms.has(id)).length}/{perms.length})
                        </span>
                      </button>

                      {/* Permisos del módulo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-6">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                              selectedPerms.has(perm.id)
                                ? "border-blue-500/40 bg-blue-600/10"
                                : "border-slate-800 hover:border-slate-600 hover:bg-slate-800/40"
                            }`}
                          >
                            <div
                              onClick={() => togglePerm(perm.id)}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                selectedPerms.has(perm.id)
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-slate-600"
                              }`}
                            >
                              {selectedPerms.has(perm.id) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div onClick={() => togglePerm(perm.id)} className="flex-1 min-w-0">
                              <div className="font-mono text-[10px] text-blue-400 font-bold leading-tight">{perm.code}</div>
                              <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{perm.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 gap-2">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Check className="h-4 w-4" /> {editingRole ? "Guardar Cambios" : "Crear Rol"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Eliminación ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Eliminar Rol
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              ¿Estás seguro de que deseas eliminar el rol{" "}
              <span className="font-bold text-white">{deleteTarget?.name}</span>? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Subcomponente: Tarjeta de Rol ─────────────────────────────────────────────
function RoleCard({
  role,
  permissions,
  onEdit,
  onDelete,
}: {
  role: RoleWithPermissions;
  permissions: Permission[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignedPerms = permissions.filter((p) => role.permissionIds.has(p.id));
  const isSystem = role.is_system;

  // Color de acento por rol
  const accentClass =
    role.name === "ADMIN"
      ? "border-emerald-500/30 shadow-emerald-500/5"
      : role.name === "SUPERVISOR"
      ? "border-blue-500/30 shadow-blue-500/5"
      : role.name === "CAJERO"
      ? "border-yellow-500/30 shadow-yellow-500/5"
      : "border-slate-700/60";

  return (
    <div className={`rounded-xl border bg-slate-900/60 p-4 flex flex-col gap-3 shadow-lg ${accentClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isSystem ? (
            <Lock className="h-4 w-4 text-slate-500 shrink-0" />
          ) : (
            <Shield className="h-4 w-4 text-blue-400 shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-white text-sm leading-tight">{role.name}</h3>
            {role.description && (
              <p className="text-[11px] text-slate-400 mt-0.5">{role.description}</p>
            )}
          </div>
        </div>
        {isSystem && (
          <Badge variant="secondary" className="text-[9px] shrink-0">Sistema</Badge>
        )}
      </div>

      {/* Permisos */}
      <div className="flex-1">
        {role.name === "ADMIN" ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Acceso total a todos los módulos
          </div>
        ) : assignedPerms.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Sin permisos asignados</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {assignedPerms.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${moduleColor(p.module)}`}
              >
                {p.code}
              </span>
            ))}
            {assignedPerms.length > 6 && (
              <span className="text-[9px] text-slate-500 px-1.5 py-0.5">
                +{assignedPerms.length - 6} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <span className="text-[10px] text-slate-500">
          {role.name === "ADMIN" ? "Todos los permisos" : `${assignedPerms.length} permisos`}
        </span>
        {isSystem && role.name === "ADMIN" ? (
          <span className="text-[10px] text-slate-600 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Acceso total fijo
          </span>
        ) : isSystem ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 gap-1"
          >
            <Edit className="h-3.5 w-3.5" />
            Editar permisos
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 gap-1"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
