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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// ─── Tipos extendidos ──────────────────────────────────────────────────────────
interface RoleWithPermissions extends Role {
  permissionIds: Set<string>;
}

// ─── Colores por módulo ────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  products:   "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  inventory:  "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  sales:      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cash:       "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  suppliers:  "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  expenses:   "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
  loans:      "text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20",
  incomes:    "text-lime-600 dark:text-lime-400 bg-lime-500/10 border-lime-500/20",
  reports:    "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  users:      "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  roles:      "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
  audit:      "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
  settings:   "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const moduleColor = (mod: string) =>
  MODULE_COLORS[mod] ?? "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";

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
          const { error } = await supabase
            .from("roles")
            .update({ name: trimmed, description: roleDesc.trim() || null })
            .eq("id", editingRole.id);
          if (error) throw error;
        }
        roleId = editingRole.id;
      } else {
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
      const { error } = await supabase.from("roles").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || "No se pudo eliminar el rol.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-[#ED1C24]" />
            Roles & Permisos (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            Crea y configura roles personalizados con permisos granulares por módulo
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold gap-2 shadow-lg shadow-red-500/20"
        >
          <Plus className="h-4 w-4 text-[#FFD500]" />
          Nuevo Rol
        </Button>
      </div>

      {/* Tarjetas de Roles */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ED1C24]" />
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
      <Card className="glass-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Lock className="h-4 w-4 text-[#ED1C24]" />
            Catálogo de Permisos del Sistema
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Lista completa de permisos disponibles para asociar a los roles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted text-xs font-bold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="p-3.5">Módulo</th>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${moduleColor(perm.module)}`}>
                        {perm.module}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-xs text-[#ED1C24] font-bold">{perm.code}</td>
                    <td className="p-3.5 text-xs text-foreground font-medium">{perm.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog Crear / Editar Rol ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border text-foreground max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5 text-[#ED1C24]" />
              {editingRole ? `Editar Rol: ${editingRole.name}` : "Crear Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 overflow-hidden flex-1">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nombre y descripción */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nombre del Rol *</label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="BODEGUERO"
                  className="uppercase placeholder:normal-case bg-card border-input font-bold"
                  required
                  disabled={!!editingRole?.is_system}
                />
                {!editingRole?.is_system && (
                  <p className="text-[10px] text-muted-foreground">Se guardará en mayúsculas</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Descripción</label>
                <Input
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Control de bodega e inventario"
                  className="bg-card border-input"
                  disabled={!!editingRole?.is_system}
                />
              </div>
            </div>

            {/* Aviso para roles sistema */}
            {editingRole?.is_system && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 font-medium">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Este es un <strong>rol del sistema</strong>. Solo puedes modificar sus permisos asignados.
                </span>
              </div>
            )}

            {/* Selector de permisos */}
            <div className="flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-xs font-bold text-foreground">
                  Permisos Asignados
                  <span className="ml-2 text-[#ED1C24] font-bold">
                    ({selectedPerms.size} / {permissions.length} seleccionados)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-[#ED1C24] font-bold hover:underline flex items-center gap-1 transition-colors"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  {selectedPerms.size === permissions.length ? "Quitar todos" : "Seleccionar todos"}
                </button>
              </div>

              {/* Scroll area */}
              <div className="overflow-y-auto flex-1 rounded-xl border border-border bg-muted/40 p-3 space-y-4">
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
                            ? "bg-[#ED1C24] border-[#ED1C24]"
                            : someModuleSelected
                            ? "bg-[#ED1C24]/40 border-[#ED1C24]"
                            : "border-border group-hover:border-foreground"
                        }`}>
                          {allModuleSelected && <Check className="h-3 w-3 text-white" />}
                          {someModuleSelected && !allModuleSelected && (
                            <span className="w-2 h-0.5 bg-white rounded" />
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${moduleColor(module)}`}>
                          {module.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
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
                                ? "border-[#ED1C24]/50 bg-red-500/10 text-foreground font-semibold"
                                : "border-border hover:border-border/80 hover:bg-card text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(perm.id)}
                              onChange={() => togglePerm(perm.id)}
                              className="mt-0.5 rounded border-border text-[#ED1C24] focus:ring-[#ED1C24]"
                            />
                            <div className="text-xs">
                              <span className="font-mono font-bold text-[#ED1C24]">{perm.code}</span>
                              <p className="text-[11px] leading-tight mt-0.5">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shadow-md shadow-red-500/20">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Rol"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Eliminación ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-red-500 font-bold">Eliminar Rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              ¿Estás seguro de que deseas eliminar el rol{" "}
              <span className="font-bold text-[#ED1C24]">{deleteTarget?.name}</span>? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white font-bold gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar Rol
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

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3.5 shadow-sm hover:border-[#ED1C24]/40 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            {isSystem ? (
              <Lock className="h-4 w-4 text-[#ED1C24]" />
            ) : (
              <Shield className="h-4 w-4 text-[#ED1C24]" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base leading-tight">{role.name}</h3>
            {role.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
            )}
          </div>
        </div>
        {isSystem && (
          <Badge variant="secondary" className="text-[10px] shrink-0 font-bold">Sistema</Badge>
        )}
      </div>

      {/* Permisos */}
      <div className="flex-1">
        {role.name === "ADMIN" ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Acceso total a todos los módulos
          </div>
        ) : assignedPerms.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin permisos asignados</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {assignedPerms.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${moduleColor(p.module)}`}
              >
                {p.code}
              </span>
            ))}
            {assignedPerms.length > 6 && (
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 font-bold">
                +{assignedPerms.length - 6} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs font-medium text-muted-foreground">
          {role.name === "ADMIN" ? "Todos los permisos" : `${assignedPerms.length} permisos`}
        </span>
        {isSystem && role.name === "ADMIN" ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
            <Lock className="h-3 w-3" /> Fijo
          </span>
        ) : isSystem ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-xs text-[#ED1C24] hover:bg-red-500/10 gap-1 font-bold"
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
              className="h-7 px-2 text-xs text-foreground hover:text-[#ED1C24] gap-1 font-bold"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
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
