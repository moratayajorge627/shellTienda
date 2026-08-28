-- ==========================================
-- SEED DATA INICIAL
-- Roles, Permisos, Categorías Básicas, Ajustes
-- ==========================================

-- 1. STORE SETTINGS INICIAL
INSERT INTO public.store_settings (store_name, nit, phone, email, address, currency, currency_symbol, timezone)
VALUES ('Super Tienda Guatemala', '1234567-8', '2200-0000', 'contacto@supertienda.gt', 'Ciudad de Guatemala', 'GTQ', 'Q', 'America/Guatemala')
ON CONFLICT DO NOTHING;

-- 2. ROLES INICIALES
INSERT INTO public.roles (id, name, description, is_system) VALUES
('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Acceso total a la administración de la tienda, usuarios, finanzas y reportes.', TRUE),
('22222222-2222-2222-2222-222222222222', 'SUPERVISOR', 'Acceso a inventarios, compras, ventas, reportes operativos y consulta de caja.', TRUE),
('33333333-3333-3333-3333-333333333333', 'CAJERO', 'Acceso a realización de ventas (POS), apertura/cierre de caja y consulta de existencias.', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 3. PERMISOS INICIALES
INSERT INTO public.permissions (code, module, description) VALUES
-- Módulo Empleados y Usuarios
('users.manage', 'Usuarios', 'Crear, editar, desactivar empleados y asignar roles'),
('roles.manage', 'Roles', 'Administrar roles y asignación de permisos'),

-- Módulo Productos e Inventario
('products.view', 'Productos', 'Consultar catálogo de productos y existencias'),
('products.create', 'Productos', 'Crear nuevos productos'),
('products.edit', 'Productos', 'Editar detalles, costos y precios de productos'),
('inventory.adjust', 'Inventario', 'Realizar ajustes de entrada y salida de inventario'),
('inventory.purchase', 'Inventario', 'Registrar ingresos por compras de mercadería'),

-- Módulo POS y Ventas
('sales.create', 'Ventas', 'Realizar ventas en el Punto de Venta (POS)'),
('sales.view', 'Ventas', 'Consultar historial de ventas'),
('sales.annul', 'Ventas', 'Anular ventas procesadas'),

-- Módulo Caja
('cash.open_close', 'Caja', 'Abrir y cerrar turnos de caja'),
('cash.view', 'Caja', 'Consultar estado y movimientos de caja'),
('cash.movements', 'Caja', 'Registrar ingresos y egresos de caja autorizados'),

-- Módulo Proveedores y Cuentas por Pagar
('suppliers.manage', 'Proveedores', 'Administrar proveedores y cuentas por pagar'),
('suppliers.pay', 'Proveedores', 'Registrar pagos a proveedores'),

-- Módulo Gastos, Préstamos y Finanzas
('expenses.manage', 'Gastos', 'Registrar y administrar gastos operativos y recurrentes'),
('loans.manage', 'Préstamos', 'Registrar préstamos y pagos de deudas'),
('incomes.manage', 'Ingresos', 'Registrar ingresos adicionales no comerciales'),

-- Módulo Reportes y Auditoría
('reports.operational', 'Reportes', 'Ver reportes operativos de ventas e inventario'),
('reports.financial', 'Reportes', 'Ver utilidad real, estado de resultados y flujo de efectivo'),
('audit.view', 'Auditoría', 'Consultar historial de auditoría del sistema')
ON CONFLICT (code) DO NOTHING;

-- 4. ASIGNACIÓN DE PERMISOS A ROLES
-- ADMIN: Todos los permisos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- SUPERVISOR
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM public.permissions
WHERE code IN (
    'products.view', 'products.create', 'products.edit', 'inventory.adjust', 'inventory.purchase',
    'sales.create', 'sales.view', 'cash.open_close', 'cash.view', 'cash.movements',
    'suppliers.manage', 'expenses.manage', 'reports.operational'
)
ON CONFLICT DO NOTHING;

-- CAJERO
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM public.permissions
WHERE code IN (
    'products.view', 'sales.create', 'sales.view', 'cash.open_close', 'cash.movements'
)
ON CONFLICT DO NOTHING;

-- 5. CATEGORÍAS DE PRODUCTOS DE MUESTRA
INSERT INTO public.categories (name, description) VALUES
('Bebidas', 'Gaseosas, jugos, agua purificada y bebidas energéticas'),
('Alimentos y Abarrotes', 'Granos básicos, enlatados, pastas y salsas'),
('Lácteos y Embutidos', 'Leche, queso, crema, jamón y salchichas'),
('Dulcería y Snacks', 'Galletas, chocolates, frituras y confitería'),
('Limpieza y Hogar', 'Detergentes, desinfectantes, papel higiénico y jabones')
ON CONFLICT (name) DO NOTHING;

-- 6. CATEGORÍAS DE GASTOS
INSERT INTO public.expense_categories (name, description, type) VALUES
('Servicios Públicos', 'Energía eléctrica, agua, teléfono e internet', 'OPERATIVO'),
('Alquiler de Local', 'Pago mensual de arrendamiento del inmueble', 'OPERATIVO'),
('Gastos Operativos Diarios', 'Gastos menores del día a día', 'OPERATIVO'),
('Mantenimiento y Reparaciones', 'Reparación de mobiliario, equipos o local', 'ADMINISTRATIVO'),
('Transporte y Fletes', 'Gastos de traslado de mercadería', 'VENTAS')
ON CONFLICT (name) DO NOTHING;

-- 7. CATEGORÍAS DE OTROS INGRESOS
INSERT INTO public.income_categories (name, description) VALUES
('Aporte de Capital', 'Inyección de dinero realizada por los propietarios'),
('Venta de Activo', 'Venta de mobiliario, equipo usado o material reciclable'),
('Reembolsos', 'Devoluciones de dinero o reclamos a favor')
ON CONFLICT (name) DO NOTHING;

-- 8. PRODUCTOS DE PRUEBA INICIALES
INSERT INTO public.products (internal_code, barcode, name, description, brand, unit_of_measure, purchase_price, sale_price, stock_quantity, min_stock) VALUES
('PROD-001', '7501055300010', 'Coca Cola 600ml', 'Bebida gaseosa en botella desechable', 'Coca Cola', 'Unidad', 4.00, 6.00, 48.00, 12.00),
('PROD-002', '7501000100020', 'Leche Entera 1 Litro', 'Leche de vaca pasteurizada', 'Lala', 'Litro', 11.50, 15.00, 24.00, 6.00),
('PROD-003', '7501000100030', 'Galletas Chiky Chocolate', 'Paquete de galletas sabor chocolate', 'Pozuelo', 'Paquete', 1.75, 2.50, 60.00, 15.00),
('PROD-004', NULL, 'Arroz Blanco Libra', 'Arroz de grano entero por libra', 'Abarrotes', 'Libra', 3.20, 4.50, 100.00, 20.00),
('PROD-005', NULL, 'Frijol Negro Libra', 'Frijol negro de primera calidad por libra', 'Abarrotes', 'Libra', 4.50, 6.00, 100.00, 20.00)
ON CONFLICT (internal_code) DO NOTHING;

-- 9. FUNCIÓN RPC PARA CONCEDER ROL ADMIN AL PRIMER USUARIO
CREATE OR REPLACE FUNCTION public.setup_initial_admin(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (p_user_id, '11111111-1111-1111-1111-111111111111')
    ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
