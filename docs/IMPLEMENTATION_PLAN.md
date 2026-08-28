# Implementation Plan - Sistema de Administración de Tienda

Un sistema web completo, moderno y profesional para la administración integral de una tienda (Inventario, POS con escáner de códigos de barras, Caja, Compras, Proveedores, Gastos, Préstamos, Cuentas por Pagar, Auditoría y Finanzas avanzadas con separación de Estado de Resultados y Flujo de Caja).

## Technical Stack
- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage, RLS)
- **Styling**: Tailwind CSS + Lucide Icons + Framer Motion (para micro-animaciones)
- **UI Components**: shadcn/ui (Radix primitives) + Tailwind
- **Forms & Validation**: React Hook Form + Zod
- **Barcode Scanning**: `@zxing/library` / `@zxing/browser` para cámara móvil (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39)
- **Currency & Timezone**: GTQ (Quetzales `Q`), Zona Horaria `America/Guatemala`

---

## User Review Required

> [!IMPORTANT]
> **Configuración de Supabase requerida por el usuario:**
> Para ejecutar este proyecto con Supabase real, deberás:
> 1. Crear un proyecto en [Supabase.com](https://supabase.com).
> 2. Obtener la URL del proyecto (`NEXT_PUBLIC_SUPABASE_URL`) y la Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) e incluirlas en `.env.local`.
> 3. Ejecutar las migraciones SQL provistas en `supabase/migrations/` desde el SQL Editor de Supabase o usando Supabase CLI.
> 4. Crear el usuario Administrador inicial utilizando el script o endpoint de inicialización provisto.

---

## Phases & Deliverables

### Fase 1: Setup del Proyecto, Arquitectura y Base de Datos Inicial
- Inicializar proyecto Next.js App Router con TypeScript, Tailwind CSS, shadcn/ui.
- Configuración de clientes Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
- Definición de tipos TypeScript completos y esquema de base de datos PostgreSQL.
- Migraciones de base de datos: `profiles`, `employees`, `roles`, `permissions`, `user_roles`, `role_permissions`, `audit_logs`, `store_settings`.
- Sistema RBAC (Role Based Access Control) con triggers PostgreSQL y políticas RLS.
- Layout principal responsivo (Sidebar en Desktop, Mobile Header/Drawer en móviles) con soporte para permisos por rol.
- Pantalla de Login, Recuperación de contraseña y Perfil de Usuario.

### Fase 2: Módulo de Productos, Categorías y Control de Inventario
- CRUD de Categorías (Bebidas, Alimentos, Limpieza, Dulces, Lácteos, etc.).
- CRUD de Productos (UUID, Código Interno, Código de Barras Único, Nombre, Marca, Categoría, Costo de compra, Precio de venta, Stock actual, Stock mínimo, Imagen).
- Módulo de Movimientos de Inventario (`inventory_movements`): `COMPRA`, `VENTA`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `DEVOLUCION`, `PRODUCTO_DAÑADO`, `ANULACION_VENTA`.
- Trazabilidad total del inventario: prohibida la modificación directa de stock sin movimiento explicativo.
- Componente de Escáner de Código de Barras con la cámara del teléfono (soporte EAN-13, EAN-8, UPC, Code 128) con feedback auditivo y visual.

### Fase 3: Módulo de Proveedores, Compras y Cuentas por Pagar
- CRUD de Proveedores (Nombre, Empresa, NIT, Teléfono, Correo, Dirección, Estado).
- Módulo de Registro de Compras de Mercadería con detalle de productos, costo unitario, total, número de factura y estado de pago (Contado / Crédito).
- Transacción atómica de compra: actualiza inventario, genera movimientos de inventario y crea cuenta por pagar (`accounts_payable`) si la compra fue a crédito.
- Módulo de Gestión de Cuentas por Pagar a Proveedores y registro de abonos/pagos (`accounts_payable_payments`).

### Fase 4: Punto de Venta (POS), Escáner y Control Histórico de Costos
- Interfaz POS ultra-rápida y táctil optimizada para Laptop, Tablet y Smartphone.
- Búsqueda por nombre, código interno o escaneo continuo por cámara móvil o lector USB.
- Carrito de compras interactivo con subtotales, descuentos y cálculo de cambio.
- Soporte para métodos de pago: Efectivo, Tarjeta, Transferencia, Mixto, Crédito.
- **Función RPC Transaccional Atómica (`process_pos_sale`)**:
  - Verifica stock con bloqueo de filas (`FOR UPDATE`) para concurrencia.
  - Almacena el **COSTO HISTÓRICO UNITARIO** (`unit_cost`) en cada `sale_item` en el instante exacto de la venta (evita alterar reportes pasados si el producto sube de precio).
  - Registra movimientos de inventario y movimiento de caja si la caja está abierta.
- Historial de Ventas, vista detallada e impresiones de comprobantes simples.
- Módulo de Anulación de Ventas con reversión atómica de stock y caja sin borrado físico (`ANULADA`).

### Fase 5: Manejo de Caja Diaria y Arqueo (Cash Register)
- Apertura y cierre de caja por usuario con registro de monto inicial, efectivo esperado, efectivo contado y diferencia.
- Registro de todos los movimientos de caja (ventas en efectivo, ingresos extraordinarios, egresos, gastos pagados en efectivo, retiros).
- Vista de Arqueo de Caja y resumen de turno del cajero.

### Fase 6: Gastos, Gastos Recurrentes e Ingresos Adicionales
- Módulo de Categorías de Gastos e Ingresos.
- Configuración de Gastos Recurrentes (Diarios, Semanales, Mensuales, Anuales) como alquiler, energía eléctrica, internet.
- Registro efectivo de Gastos Pagados vs Proyectados.
- Módulo de Otros Ingresos (aportes de capital, venta de activos, reembolsos) con tipificación clara para no confundirlos con ventas comerciales.

### Fase 7: Préstamos, Deudas Financieras y Pagos
- Módulo de Préstamos Recibidos y Obligaciones Financieras.
- Tabla de Pagos de Préstamos separando Capital de Intereses.
- Tratamiento contable riguroso: el capital de préstamo recibido aumenta efectivo pero NO es venta/ganancia; el pago de capital disminuye efectivo y deuda pero NO es gasto operativo.

### Fase 8: Dashboard, Reportes Financieros y Análisis de Rentabilidad
- Dashboard en tiempo real adaptado por rol (Admin, Supervisor, Cajero).
- **Métricas Financieras del Día y del Mes**:
  - Ventas Brutas, Descuentos, Ventas Netas.
  - Costo de Mercadería Vendida (COGS basado en costo histórico).
  - Ganancia Bruta.
  - Gastos Operativos y Recurrentes.
  - **Resultado Neto Real (Utilidad Real)**.
  - **Estado de Flujo de Efectivo** (Efectivo real en caja/banco).
  - Estado de Deudas y Obligaciones.
- Gráficas interactivas: Ventas últimos 7 días, ventas mensuales, gastos por categoría, productos más vendidos.
- Reportes filtrables por rango de fechas, empleado, categoría y exportables a CSV / PDF impresión.

### Fase 9: Auditoría, Seguridad y RLS
- Tabla `audit_logs` y triggers automáticos de auditoría para cambios de precio, ajuste de inventarios, anulación de ventas, pagos y borrados lógicos.
- Políticas RLS (Row Level Security) exhaustivas en todas las tablas de Supabase.

### Fase 10: Testing, Documentación y Verificación Final
- Pruebas unitarias/integración de cálculos financieros, ventas, inventario y permisos.
- Verificación responsiva y compilación limpia de producción (`npm run build`).
- Documentación final en `README.md` con instrucciones de despliegue y administración.

---

## Verification Plan

### Automated Tests
- Running `npm run test` or custom jest/vitest suites for financial calculation logic:
  - POS sale profit calculation (Historical Cost vs Sale Price).
  - Income Statement vs Cash Flow separation logic.
  - Stock update consistency upon purchase & sale annulment.
  - RBAC permission resolution.
- Running `npm run build` to verify zero TypeScript or linting errors.

### Manual Verification
- Testing user workflow from Employee creation -> Cash Register Open -> Stock Entry -> POS Sale via Barcode Scanner -> Cash Register Closure -> Income Statement Report.
