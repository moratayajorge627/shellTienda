"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Profile, Role, Permission } from "@/types/database";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
  hasRole: (roleName: string) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  permissions: [],
  isLoading: true,
  hasPermission: () => false,
  hasRole: () => false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Obtener Perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        // Fallback profile si aún no se crea
        setProfile({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email || "Usuario",
          status: "ACTIVO",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Obtener Roles del usuario
      const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", currentUser.id);

      const userRoleNames = (userRolesData || []).map((r: any) => r.roles?.name).filter(Boolean);
      setRoles(userRoleNames);

      // Si no tiene rol asignado por defecto, o si es admin inicial
      if (userRoleNames.length === 0) {
        // Por defecto asumimos ADMIN para modo local/desarrollo si no hay restricción
        setRoles(["ADMIN"]);
      }

      // 3. Obtener Permisos basados en sus roles
      const { data: userPermissionsData } = await supabase
        .from("user_roles")
        .select("roles(role_permissions(permissions(code)))")
        .eq("user_id", currentUser.id);

      const permSet = new Set<string>();
      (userPermissionsData || []).forEach((ur: any) => {
        ur.roles?.role_permissions?.forEach((rp: any) => {
          if (rp.permissions?.code) {
            permSet.add(rp.permissions.code);
          }
        });
      });

      // Si es ADMIN, tiene todos los permisos
      if (userRoleNames.includes("ADMIN") || userRoleNames.length === 0) {
        setPermissions([
          "users.manage", "roles.manage", "products.view", "products.create", "products.edit",
          "inventory.adjust", "inventory.purchase", "sales.create", "sales.view", "sales.annul",
          "cash.open_close", "cash.view", "cash.movements", "suppliers.manage", "suppliers.pay",
          "expenses.manage", "loans.manage", "incomes.manage", "reports.operational", "reports.financial",
          "audit.view"
        ]);
      } else {
        setPermissions(Array.from(permSet));
      }
    } catch (error) {
      console.error("Error fetching user RBAC data:", error);
      // Fallback dev mode
      setRoles(["ADMIN"]);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await fetchUserData(initialSession.user);
      } else {
        // Mock Admin Profile para primera vista si no hay Supabase backend conectado todavía
        setUser({
          id: "00000000-0000-0000-0000-000000000000",
          email: "admin@tienda.com",
          app_metadata: {},
          user_metadata: { full_name: "Administrador General" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as User);
        setProfile({
          id: "00000000-0000-0000-0000-000000000000",
          full_name: "Administrador General",
          status: "ACTIVO",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setRoles(["ADMIN"]);
        setPermissions([
          "users.manage", "roles.manage", "products.view", "products.create", "products.edit",
          "inventory.adjust", "inventory.purchase", "sales.create", "sales.view", "sales.annul",
          "cash.open_close", "cash.view", "cash.movements", "suppliers.manage", "suppliers.pay",
          "expenses.manage", "loans.manage", "incomes.manage", "reports.operational", "reports.financial",
          "audit.view"
        ]);
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchUserData(newSession.user);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (code: string): boolean => {
    if (roles.includes("ADMIN")) return true;
    return permissions.includes(code);
  };

  const hasRole = (roleName: string): boolean => {
    return roles.includes(roleName);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        permissions,
        isLoading,
        hasPermission,
        hasRole,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
