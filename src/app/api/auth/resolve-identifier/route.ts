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
  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identificador no proporcionado." }, { status: 400 });
    }

    const raw = identifier.trim().toLowerCase();

    // Si ya es un correo electrónico con @, devolverlo tal cual
    if (raw.includes("@")) {
      return NextResponse.json({ email: raw });
    }

    const cleanUser = raw.replace(/[^a-z0-9_.-]/g, "");
    const supabase = createAdminClient();

    // 1. Buscar en la lista de usuarios de Auth
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (!userError && userData?.users) {
      // Coincidencia 1: user_metadata.username exacto
      const matchByMetadata = userData.users.find(
        (u) => u.user_metadata?.username?.toLowerCase() === cleanUser
      );
      if (matchByMetadata?.email) {
        return NextResponse.json({ email: matchByMetadata.email });
      }

      // Coincidencia 2: prefijo del correo antes del @ (ej: 'moratayajorge627' para 'moratayajorge627@gmail.com')
      const matchByEmailPrefix = userData.users.find(
        (u) => u.email?.toLowerCase().split("@")[0] === cleanUser
      );
      if (matchByEmailPrefix?.email) {
        return NextResponse.json({ email: matchByEmailPrefix.email });
      }

      // Coincidencia 3: correo interno directo
      const internalEmail = `${cleanUser}@tienda.local`;
      const matchByInternal = userData.users.find(
        (u) => u.email?.toLowerCase() === internalEmail
      );
      if (matchByInternal?.email) {
        return NextResponse.json({ email: matchByInternal.email });
      }
    }

    // 2. Buscar en la tabla de empleados si hay algún email o user_id asociado
    const { data: empData } = await supabase
      .from("employees")
      .select("email, first_name, last_name, user_id")
      .or(`email.ilike.%${cleanUser}%,first_name.ilike.%${cleanUser}%`)
      .limit(1)
      .maybeSingle();

    if (empData?.email && empData.email.includes("@")) {
      return NextResponse.json({ email: empData.email });
    }

    // Fallback por defecto si no se encontró coincidencia previa
    return NextResponse.json({ email: `${cleanUser}@tienda.local` });
  } catch (err: any) {
    console.error("Error en resolve-identifier:", err);
    return NextResponse.json({ email: `${identifier.trim().toLowerCase()}@tienda.local` });
  }
}
