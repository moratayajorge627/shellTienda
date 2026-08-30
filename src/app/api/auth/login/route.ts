import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xgyvbrnszhgkonomstsm.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneXZicm5zemhna29ub21zdHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NzI0MDEsImV4cCI6MjEwMzQ0ODQwMX0.e3K0nBxn763Ly5aTEHFWRvuJFdEiIF2K7f4BGZsFdd4";
  return createServerClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier || "").toString().trim();
    const password = (body?.password || "").toString();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Por favor ingresa tu usuario/correo y contraseña." },
        { status: 400 }
      );
    }

    const raw = identifier.toLowerCase();
    const cleanUser = raw.replace(/[^a-z0-9_.-]/g, "");
    const candidateEmails: string[] = [];

    // Si ingresó un correo real con @
    if (identifier.includes("@")) {
      candidateEmails.push(identifier.trim().toLowerCase());
    } else {
      // 1. Intentar resolver mediante usuarios de Auth
      const adminClient = createAdminClient();
      const { data: userData } = await adminClient.auth.admin.listUsers();

      if (userData?.users && userData.users.length > 0) {
        const users = userData.users;

        // A. Match exacto de username en metadata
        const m1 = users.find((u) => u.user_metadata?.username?.toLowerCase() === cleanUser);
        if (m1?.email) candidateEmails.push(m1.email.toLowerCase());

        // B. Match de prefijo de correo (antes del @)
        const m2 = users.find((u) => u.email?.toLowerCase().split("@")[0] === cleanUser);
        if (m2?.email && !candidateEmails.includes(m2.email.toLowerCase())) {
          candidateEmails.push(m2.email.toLowerCase());
        }

        // C. Match de admin
        if (cleanUser === "admin") {
          const adminUser = users.find((u) => u.user_metadata?.role_name === "ADMIN" || u.user_metadata?.username === "admin");
          if (adminUser?.email && !candidateEmails.includes(adminUser.email.toLowerCase())) {
            candidateEmails.push(adminUser.email.toLowerCase());
          }
        }

        // D. Match en nombre completo
        const m3 = users.find((u) => {
          const fn = u.user_metadata?.full_name?.toLowerCase() || "";
          return fn.includes(cleanUser);
        });
        if (m3?.email && !candidateEmails.includes(m3.email.toLowerCase())) {
          candidateEmails.push(m3.email.toLowerCase());
        }
      }

      // 2. Intentar buscar en tabla de empleados
      const { data: empData } = await adminClient
        .from("employees")
        .select("email, first_name, last_name, user_id");

      if (empData && empData.length > 0) {
        const matchEmp = empData.find((e) => {
          const full = `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase();
          const em = (e.email || "").toLowerCase();
          return full.includes(cleanUser) || em.includes(cleanUser);
        });
        if (matchEmp?.email && matchEmp.email.includes("@") && !candidateEmails.includes(matchEmp.email.toLowerCase())) {
          candidateEmails.push(matchEmp.email.toLowerCase());
        }
      }

      // Candidatos estándar por dominio interno
      candidateEmails.push(`${cleanUser}@tienda.local`);
      candidateEmails.push(`${cleanUser}@tienda.com`);
    }

    // Probar inicio de sesión con cada correo candidato
    const anonClient = createAnonClient();
    let authSuccessData: any = null;
    let successfulEmail = "";

    for (const emailToTry of candidateEmails) {
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: emailToTry,
        password: password,
      });

      if (!error && data?.session) {
        authSuccessData = data;
        successfulEmail = emailToTry;
        break;
      }
    }

    if (!authSuccessData) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos. Verifica tus credenciales." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      email: successfulEmail,
      session: authSuccessData.session,
      user: authSuccessData.user,
    });
  } catch (err: any) {
    console.error("Error en /api/auth/login:", err);
    return NextResponse.json(
      { error: "Ocurrió un error en el servidor al autenticar." },
      { status: 500 }
    );
  }
}
