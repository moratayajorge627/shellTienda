import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

// Cliente con Service Role Key — Servidor exclusivo para creación/administración de usuarios
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
    const body = await req.json();
    const { username, email, password, full_name, role_name = "CAJERO", employee_id } = body;

    // El username o email es requerido, junto con password, full_name y employee_id
    if ((!username && !email) || !password || !full_name || !employee_id) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (Usuario, Contraseña y Nombre)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanUsername = (username || (email ? email.split("@")[0] : "usuario"))
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_.-]/g, "");

    // Si el usuario proporcionó un correo real válido, lo usamos; si no, construimos el identificador interno de auth
    const authEmail = email && email.includes("@")
      ? email.trim().toLowerCase()
      : `${cleanUsername}@tienda.local`;

    const supabase = createAdminClient();

    // 1. Verificar si ya existe un usuario con este correo/identificador en Supabase Auth
    let newUserId: string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        full_name,
        role_name: role_name.toUpperCase(),
        raw_email: email && email.includes("@") ? email.trim() : null,
      },
    });

    if (authError) {
      // Si el usuario ya existe, actualizar su contraseña y metadata
      if (authError.message.toLowerCase().includes("already") || authError.message.includes("registered")) {
        // Buscar el usuario existente por email
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === authEmail.toLowerCase()
        );

        if (existingUser) {
          newUserId = existingUser.id;
          // Actualizar contraseña y metadata
          await supabase.auth.admin.updateUserById(newUserId, {
            password: password,
            user_metadata: {
              username: cleanUsername,
              full_name,
              role_name: role_name.toUpperCase(),
              raw_email: email && email.includes("@") ? email.trim() : null,
            },
          });
        } else {
          return NextResponse.json(
            { error: `El usuario o identificador '${cleanUsername}' ya está en uso. Por favor elige otro nombre de usuario.` },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      newUserId = authData.user.id;
    }

    // 2. Insertar o actualizar perfil en profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: newUserId,
      full_name,
      status: "ACTIVO",
    });

    if (profileError) {
      console.warn("Advertencia al upsert en profiles:", profileError.message);
    }

    // 3. Buscar el ID del rol por nombre
    const { data: roleData } = await supabase
      .from("roles")
      .select("id, name")
      .ilike("name", role_name)
      .maybeSingle();

    let targetRoleId = roleData?.id;

    if (!targetRoleId) {
      // Fallback al primer rol disponible
      const { data: fallbackRole } = await supabase.from("roles").select("id").limit(1).single();
      targetRoleId = fallbackRole?.id;
    }

    // 4. Asignar rol en user_roles
    if (targetRoleId) {
      // Eliminar roles previos si existían y reasignar
      await supabase.from("user_roles").delete().eq("user_id", newUserId);
      await supabase.from("user_roles").insert({
        user_id: newUserId,
        role_id: targetRoleId,
      });
    }

    // 5. Vincular user_id al registro de empleado
    const employeeEmailToSave = email && email.includes("@") ? email.trim() : authEmail;
    await supabase
      .from("employees")
      .update({
        user_id: newUserId,
        email: employeeEmailToSave,
      })
      .eq("id", employee_id);

    return NextResponse.json(
      {
        success: true,
        user_id: newUserId,
        username: cleanUsername,
        authEmail,
        role: role_name.toUpperCase(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error en /api/admin/create-user:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno al crear el acceso del empleado." },
      { status: 500 }
    );
  }
}
