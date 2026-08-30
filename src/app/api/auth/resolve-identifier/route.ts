import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xgyvbrnszhgkonomstsm.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneXZicm5zemhna29ub21zdHNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg3MjQwMSwiZXhwIjoyMTAzNDQ4NDAxfQ.azGQEoyvVpurcQ4a7lXtu9qgZqpQcjcrBdgPZCAShO4";
  return createServerClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  let rawIdentifier = "";
  try {
    const body = await req.json();
    rawIdentifier = (body?.identifier || "").toString().trim().toLowerCase();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Identificador no proporcionado." }, { status: 400 });
    }

    // Si ya es un correo electrónico con @, devolverlo tal cual
    if (rawIdentifier.includes("@")) {
      return NextResponse.json({ email: rawIdentifier });
    }

    const cleanUser = rawIdentifier.replace(/[^a-z0-9_.-]/g, "");
    const supabase = createAdminClient();

    // 1. Obtener la lista de usuarios de Auth
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (!userError && userData?.users && userData.users.length > 0) {
      const users = userData.users;

      // Prioridad 1: Coincidencia exacta con user_metadata.username
      const matchByMetadata = users.find(
        (u) => u.user_metadata?.username?.toLowerCase() === cleanUser
      );
      if (matchByMetadata?.email) {
        return NextResponse.json({ email: matchByMetadata.email });
      }

      // Prioridad 2: Coincidencia exacta con el prefijo del correo antes del @
      const matchByEmailPrefix = users.find(
        (u) => u.email?.toLowerCase().split("@")[0] === cleanUser
      );
      if (matchByEmailPrefix?.email) {
        return NextResponse.json({ email: matchByEmailPrefix.email });
      }

      // Prioridad 3: Correo interno @tienda.local
      const internalEmail = `${cleanUser}@tienda.local`;
      const matchByInternal = users.find(
        (u) => u.email?.toLowerCase() === internalEmail
      );
      if (matchByInternal?.email) {
        return NextResponse.json({ email: matchByInternal.email });
      }

      // Prioridad 4: Si ingresó 'admin' y existe un usuario con rol ADMIN o username 'admin'
      if (cleanUser === "admin") {
        const adminUser = users.find(
          (u) => u.user_metadata?.role_name === "ADMIN" || u.email?.toLowerCase().includes("admin")
        );
        if (adminUser?.email) {
          return NextResponse.json({ email: adminUser.email });
        }
      }

      // Prioridad 5: Búsqueda por coincidencia en nombre completo o parte del correo
      const matchByFullNameOrPartial = users.find((u) => {
        const fn = u.user_metadata?.full_name?.toLowerCase() || "";
        const em = u.email?.toLowerCase() || "";
        return fn.includes(cleanUser) || em.includes(cleanUser);
      });
      if (matchByFullNameOrPartial?.email) {
        return NextResponse.json({ email: matchByFullNameOrPartial.email });
      }
    }

    // 2. Buscar en la tabla employees
    const { data: emps } = await supabase
      .from("employees")
      .select("email, first_name, last_name, user_id");

    if (emps && emps.length > 0) {
      const matchEmp = emps.find((e) => {
        const full = `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase();
        const em = (e.email || "").toLowerCase();
        return full.includes(cleanUser) || em.includes(cleanUser);
      });

      if (matchEmp?.email && matchEmp.email.includes("@")) {
        return NextResponse.json({ email: matchEmp.email });
      }
    }

    // Fallback por defecto
    return NextResponse.json({ email: `${cleanUser}@tienda.local` });
  } catch (err: any) {
    console.error("Error en resolve-identifier:", err);
    const fallbackUser = rawIdentifier ? rawIdentifier.replace(/[^a-z0-9_.-]/g, "") : "usuario";
    return NextResponse.json({ email: `${fallbackUser}@tienda.local` });
  }
}
