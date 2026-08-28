import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

// Cliente con Service Role Key — SOLO servidor, nunca exponer al cliente
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    const { email, password, full_name, role_name, employee_id } = body;

    if (!email || !password || !full_name || !role_name || !employee_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirmado automáticamente
        user_metadata: { full_name },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este correo ya tiene una cuenta en el sistema." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Insertar/upsert perfil en profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: newUserId,
      full_name,
      status: "ACTIVO",
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Error al crear el perfil: " + profileError.message },
        { status: 500 }
      );
    }

    // 3. Buscar el ID del rol por nombre
    const { data: roleData, error: roleQueryError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role_name)
      .single();

    if (roleQueryError || !roleData) {
      await supabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Rol '${role_name}' no encontrado en la base de datos.` },
        { status: 404 }
      );
    }

    // 4. Asignar rol en user_roles
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: newUserId,
      role_id: roleData.id,
    });

    if (roleError) {
      await supabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Error al asignar el rol: " + roleError.message },
        { status: 500 }
      );
    }

    // 5. Vincular user_id al registro de empleado
    const { error: empError } = await supabase
      .from("employees")
      .update({ user_id: newUserId, email })
      .eq("id", employee_id);

    if (empError) {
      console.warn("Advertencia: No se pudo vincular user_id al empleado:", empError.message);
    }

    return NextResponse.json(
      { success: true, user_id: newUserId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error en /api/admin/create-user:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
