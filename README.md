# Sistema de Administración de Tienda (POS & Finanzas)

Sistema web completo y moderno para la administración integral de tiendas de abarrotes y comercios. Incluye control de inventario inmutable, punto de venta (POS) táctil con escáner de códigos de barras mediante cámara móvil, caja diaria con arqueo, compras a proveedores, gastos operativos/recurrentes, préstamos, cuentas por pagar y reportes de utilidad real con separación estricta entre Estado de Resultados y Flujo de Caja.

---

## 🚀 Tecnologías Principales

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Base de Datos & Auth**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, Row Level Security RLS)
- **Estilos**: Tailwind CSS + Lucide Icons + Framer Motion (Diseño moderno dark mode glassmorphism)
- **Componentes UI**: Radix UI primitives + shadcn/ui
- **Validaciones & Formularios**: Zod + React Hook Form
- **Escáner de Código de Barras**: `@zxing/library` para cámara móvil (EAN-13, EAN-8, UPC, Code 128, Code 39)
- **Moneda & Zona Horaria**: Quetzales `GTQ` (`Q`), Zona Horaria `America/Guatemala`

---

## 📌 Requisitos Previos

- **Node.js**: `v18.17.0` o superior (Recomendado Node `v20.x` o `v22.x`)
- **npm**: `v9.x` o superior
- **Cuenta de Supabase**: [https://supabase.com](https://supabase.com) (Gratuita o Pro)

---

## 🛠️ Instalación y Configuración Paso a Paso

### 1. Clonar / Descargar el Proyecto
```bash
git clone <URL_DEL_REPOSITORIO>
cd ShellProyect
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo `.env.local` basado en `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

Obtén estos valores desde tu proyecto en **Supabase** (`Project Settings -> API`).

---

## 🗄️ Migraciones de Base de Datos en Supabase

1. Entra a tu consola de Supabase en **SQL Editor**.
2. Ejecuta en orden los scripts ubicados en la carpeta `supabase/migrations/`:
   - **Paso 1**: Copia y ejecuta el contenido de [`20260827_initial_schema.sql`](file:///d:/PersonalProyect/ShellProyect/supabase/migrations/20260827_initial_schema.sql) (crea las tablas, índices, triggers, políticas RLS y funciones RPC).
   - **Paso 2**: Copia y ejecuta el contenido de [`20260827_seed_data.sql`](file:///d:/PersonalProyect/ShellProyect/supabase/migrations/20260827_seed_data.sql) (crea los roles `ADMIN`, `SUPERVISOR`, `CAJERO`, matriz de permisos, categorías iniciales y productos de prueba).

---

## 👑 Procedimiento Seguro para Crear el Primer Usuario Administrador

Dado que el registro público de empleados está desactivado por seguridad:

1. Ve a **Supabase Dashboard -> Authentication -> Users**.
2. Haz clic en **Add User -> Create User**.
3. Ingresa el correo y contraseña del primer administrador (ejemplo: `admin@supertienda.gt`).
4. Copia el **User ID (UUID)** generado para ese usuario.
5. Ve al **SQL Editor** de Supabase y ejecuta:

```sql
SELECT public.setup_initial_admin('AQUI_PONE_EL_UUID_DEL_USUARIO');
```

¡Listo! El usuario ahora tendrá el rol `ADMIN` con acceso total al sistema.

---

## 🖥️ Ejecución del Proyecto

### Modo Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Compilación y Verificación de Producción
```bash
npm run build
npm run start
```

### Ejecutar Pruebas Financieras
```bash
npm run test
```

---

## 📁 Estructura del Proyecto

```text
src/
  app/                      # Rutas de Next.js App Router
    audit/                  # Bitácora de auditoría inmutable
    cash/                   # Caja diaria, turno y arqueo
    categories/             # Administración de categorías
    debts/                  # Cuentas por pagar a proveedores
    employees/              # Gestión de empleados y estado activo/inactivo
    expenses/               # Gastos efectivos y plantillas recurrentes
    inventory/              # Stock de inventario y ajustes de stock
    loans/                  # Préstamos y abonos a capital/intereses
    login/                  # Inicio de sesión seguro
    pos/                    # Punto de venta y cámara escáner de barras
    products/               # Catálogo de productos y existencias
    profile/                # Perfil de usuario y cambio de clave
    purchases/              # Registro de compras e incremento de stock
    recovery/               # Recuperación de contraseña
    reports/                # P&L (Estado de Resultados) y Flujo de Efectivo
    roles/                  # Matriz de permisos RBAC
    settings/               # Configuración general de la tienda
  components/
    layout/                 # Sidebar, Navbar, MobileNav drawer, AppLayout
    scanner/                # Módulo reutilizable de escáner de cámara ZXing
    ui/                     # Primitivos UI shadcn/ui (Button, Card, Dialog, Input, etc.)
  context/                  # AuthContext y verificación de RBAC
  lib/                      # Clientes Supabase SSR y funciones utilitarias
  services/                 # Capa de servicios API (productService, posService, etc.)
  types/                    # Definiciones TypeScript completas (database.ts)
supabase/
  migrations/               # DDL PostgreSQL, RLS y funciones RPC atómicas
docs/
  IMPLEMENTATION_PLAN.md    # Plan de implementación detallado por fases
  DATABASE_DESIGN.md        # Diseño relacional y principios financieros
tests/
  financial.test.ts         # Pruebas unitarias de cálculo financiero
```

---

## ⚖️ Principales Reglas Financieras del Sistema

1. **Costo Histórico Congelado**:
   - Cada `sale_item` almacena el costo del producto en el instante exacto de la venta (`unit_cost`). Si el producto sube de precio en el futuro, las utilidades pasadas permanecen intactas sin recalcularse.
2. **Separación de Estado de Resultados vs. Flujo de Efectivo**:
   - **Resultado Neto (Utilidad)** = Ventas Netas - Costo de Ventas (COGS) - Gastos Operativos.
   - **Flujo de Efectivo** = Entradas Reales de Efectivo (Ventas + Préstamos + Aportes) - Salidas Reales de Efectivo (Compras + Gastos + Pagos de Capital).
   - Recibir un préstamo de Q10,000 **NO** es venta ni ganancia. Pagar Q500 de capital de préstamo **NO** es gasto operativo.
3. **Integridad de Inventario sin Borrado Físico**:
   - Prohibido modificar stock directamente en la BD sin un registro en `inventory_movements`. Las anulaciones revierten atómicamente el stock registrando movimientos inversos auditados.
