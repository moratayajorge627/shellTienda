import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgyvbrnszhgkonomstsm.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhneXZicm5zemhna29ub21zdHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NzI0MDEsImV4cCI6MjEwMzQ0ODQwMX0.e3K0nBxn763Ly5aTEHFWRvuJFdEiIF2K7f4BGZsFdd4',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresca la sesión de Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  // Proteger rutas si no hay usuario autenticado (excepto login y recovery)
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/recovery');

  if (!user && !isAuthPage && request.nextUrl.pathname !== '/') {
    // Si no está autenticado y trata de entrar a rutas protegidas, redirigir a login
    // Nota: Permitimos acceso para desarrollo inicial con fallback
  }

  return response;
}
