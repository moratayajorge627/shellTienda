# Diseño de Base de Datos - Sistema de Administración de Tienda

El sistema utiliza **PostgreSQL en Supabase** con extensión UUID, campos monetarios en tipo `numeric(12,2)`, restricciones `CHECK` de integridad, auditoría mediante triggers, funciones almacenadas (RPC) para operaciones atómicas de POS y Compras, y políticas RLS (Row Level Security).

---

## 1. Principios Fundamentales del Diseño Financiero

### A. Costo Histórico de Venta (`sale_items.unit_cost`)
Cuando se realiza una venta, el costo unitario de cada producto se **congela** en `sale_items.unit_cost`. 
- **Razón**: Si una Coca Cola se vendió hoy con un costo de Q4.00 y dentro de un mes el costo sube a Q4.50, los reportes de ganancias pasadas **NO** deben ser modificados.
- **Campos en `sale_items`**: `quantity`, `unit_price`, `unit_cost`, `subtotal` (`quantity * unit_price`), `cost_total` (`quantity * unit_cost`), `profit` (`subtotal - cost_total`).

### B. Separación entre Estado de Resultados y Flujo de Caja
El modelo de datos separa estrictamente:
1. **Estado de Resultados (P&L / Utilidad Real)**:
   - **Ingresos comerciales**: Ventas netas (Ventas brutas - Descuentos).
   - **Costo de Ventas (COGS)**: Suma de `cost_total` de los `sale_items` vendidos en el período.
   - **Ganancia Bruta**: Ventas Netas - Costo de Ventas.
   - **Gastos Operativos/Administrativos**: Gastos registrados (`expenses`).
   - **Utilidad/Resultado Neto**: Ganancia Bruta - Gastos + Otros Ingresos Comerciales - Otros Egresos.
2. **Flujo de Efectivo (Cash Flow)**:
   - **Entradas de Dinero**: Ventas en efectivo, cobros, aportes de capital (`incomes`), préstamos recibidos (`loans`).
   - **Salidas de Dinero**: Compras al contado, pagos de gastos, pagos a proveedores (`accounts_payable_payments`), pago de capital e intereses de préstamos (`loan_payments`).
3. **Obligaciones (Pasivos)**:
   - Cuentas por Pagar (`accounts_payable`)
   - Saldo de Préstamos (`loans.balance`)

*Ejemplo*: Recibir un préstamo de Q10,000 ingresa dinero al flujo de caja (`cash_movements`), pero **NO** entra al Estado de Resultados como venta ni como utilidad. Un pago de capital de préstamo de Q500 reduce la deuda y el efectivo, pero **NO** es un gasto operativo.

---

## 2. Diagrama Entidad-Relación y Tablas Principales

### Auth & Usuarios / Empleados / RBAC
- `store_settings`: Configuración general de la tienda (Nombre, NIT, Teléfono, Dirección, Moneda GTQ, Timezone America/Guatemala).
- `profiles`: Extensión de `auth.users` de Supabase (id UUID, full_name, phone, status `ACTIVO`/`INACTIVO`).
- `employees`: Datos laborales del empleado (id UUID, first_name, last_name, phone, email, address, hire_date, position, salary, status, user_id FK -> profiles.id, created_by).
- `roles`: Roles del sistema (`ADMIN`, `SUPERVISOR`, `CAJERO` y roles personalizados).
- `permissions`: Permisos detallados del sistema (ej: `products.create`, `sales.annul`, `reports.financial`).
- `role_permissions`: Tabla pivote entre `roles` y `permissions`.
- `user_roles`: Tabla pivote entre `profiles` y `roles`.

### Productos e Inventario
- `categories`: Categorías de productos (id UUID, name, description, is_active).
- `products`: Catálogo de productos (id UUID, internal_code, barcode UNIQUE NULLABLE, name, description, category_id, brand, unit_of_measure, purchase_price, sale_price, stock_quantity, min_stock, image_url, status).
- `inventory_movements`: Historial inmutable de movimientos de stock (id UUID, product_id, quantity, stock_before, stock_after, movement_type [`COMPRA`, `VENTA`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `DEVOLUCION`, `PRODUCTO_DAÑADO`, `ANULACION_VENTA`, `OTRO`], reference_id, user_id, date, notes).

### Proveedores, Compras y Cuentas por Pagar
- `suppliers`: Registro de proveedores (id UUID, name, company_name, nit, phone, email, address, contact, notes, status).
- `purchases`: Encabezado de compras de mercadería (id UUID, purchase_number, supplier_id, total_amount, invoice_number, purchase_date, payment_method, payment_status [`PAGADA`, `PENDIENTE`], notes, created_by).
- `purchase_items`: Detalle de compra (id UUID, purchase_id, product_id, quantity, unit_cost, subtotal).
- `accounts_payable`: Cuentas por pagar creadas por compras a crédito o deudas con proveedores (id UUID, supplier_id, purchase_id, concept, original_amount, total_paid, balance, due_date, status [`PENDIENTE`, `PARCIAL`, `PAGADA`, `VENCIDA`]).
- `accounts_payable_payments`: Registro de abonos/pagos a cuentas por pagar (id UUID, account_payable_id, payment_date, amount, payment_method, reference_number, user_id, notes).

### Caja y Ventas (POS)
- `cash_registers`: Sesiones de caja diaria (id UUID, register_number, opened_by, closed_by, opened_at, closed_at, initial_amount, expected_amount, counted_amount, difference, status [`ABIERTA`, `CERRADA`], notes).
- `sales`: Encabezado de venta (id UUID, sale_number, cash_register_id, user_id, customer_name, subtotal, discount, total, payment_method [`EFECTIVO`, `TARJETA`, `TRANSFERENCIA`, `MIXTO`, `CREDITO`], status [`COMPLETADA`, `ANULADA`], created_at).
- `sale_items`: Detalle con costo histórico congelado (id UUID, sale_id, product_id, quantity, unit_price, **unit_cost**, subtotal, cost_total, profit).
- `sale_payments`: Formas de pago desglosadas para pagos mixtos (id UUID, sale_id, payment_method, amount, reference_number, created_at).
- `cash_movements`: Movimientos de dinero en caja (id UUID, cash_register_id, user_id, movement_type [`VENTA`, `INGRESO_EXTRA`, `EGRESO_GASTO`, `PAGO_PROVEEDOR`, `PAGO_PRESTAMO`, `RETIRO`], amount, description, reference_id, created_at).

### Gastos, Gastos Recurrentes e Ingresos Adicionales
- `expense_categories`: Categorías de gastos (id UUID, name, description, type).
- `recurring_expenses`: Configuración de gastos recurrentes (id UUID, category_id, description, expected_amount, frequency [`DIARIO`, `SEMANAL`, `MENSUAL`, `ANUAL`], is_active).
- `expenses`: Gastos efectivamente registrados/pagados (id UUID, category_id, recurring_expense_id, description, amount, expense_date, frequency, status [`PAGADO`, `PENDIENTE`], payment_method, registered_by, notes).
- `income_categories`: Categorías de otros ingresos no comerciales.
- `incomes`: Registros de otros ingresos extraordinarios (id UUID, category_id, description, amount, income_date, payment_method, registered_by, notes).

### Préstamos y Deudas Financieras
- `loans`: Registro de préstamos y financiamientos recibidos (id UUID, loan_name, creditor, original_amount, interest_rate, total_installments, installment_amount, frequency, start_date, next_payment_date, total_paid, balance, status [`PENDIENTE`, `PARCIALMENTE_PAGADO`, `PAGADO`, `VENCIDO`]).
- `loan_payments`: Pagos individuales de préstamos desglosando capital e intereses (id UUID, loan_id, payment_date, principal_amount, interest_amount, total_amount, payment_method, user_id, notes).

### Auditoría y Trazabilidad
- `audit_logs`: Registro inmutable de acciones críticas (id UUID, user_id, action, entity_name, entity_id, old_data JSONB, new_data JSONB, ip_address, user_agent, created_at).

---

## 3. Funciones Almacenadas (RPC) Transaccionales

### `process_pos_sale(...)`
1. Recibe el id de caja, usuario, cliente, descuento, métodos de pago y arreglo de items (`product_id`, `quantity`, `unit_price`).
2. Verifica la existencia de caja abierta.
3. Para cada producto:
   - Realiza `SELECT stock_quantity, purchase_price FROM products WHERE id = p_id FOR UPDATE` para evitar condiciones de carrera en inventario.
   - Valida que `stock_quantity >= quantity`.
   - Congela el `purchase_price` como `unit_cost` en `sale_items`.
   - Actualiza `stock_quantity = stock_quantity - quantity`.
   - Inserta registro en `inventory_movements` tipo `VENTA`.
4. Inserta encabezado en `sales` y desglosa `sale_payments`.
5. Si incluye pago en efectivo y la caja está abierta, registra `cash_movements` de tipo `VENTA`.
6. Genera log en `audit_logs`.
7. Retorna la venta creada.

### `process_inventory_purchase(...)`
1. Recibe proveedor, número de factura, fecha, forma de pago, si es a crédito y arreglo de items (`product_id`, `quantity`, `unit_cost`).
2. Inserta registro en `purchases` y `purchase_items`.
3. Para cada item:
   - Incrementa `stock_quantity` y opcionalmente actualiza `purchase_price` en `products`.
   - Inserta registro en `inventory_movements` tipo `COMPRA`.
4. Si la compra es a crédito (`is_pending_payment`), crea registro en `accounts_payable`.
5. Registra log en `audit_logs`.

---

## 4. Reglas de Eliminación Lógica y RLS

- Ninguna transacción financiera (`sales`, `purchases`, `expenses`, `loans`, `payments`, `cash_movements`, `inventory_movements`) permite borrado físico (`DELETE`).
- Las anulaciones o cancelaciones marcan `status = 'ANULADA'` y generan los movimientos inversos correspondientes para trazabilidad auditada.
- Políticas RLS por rol:
  - `ADMIN`: Control total (SELECT, INSERT, UPDATE).
  - `SUPERVISOR`: SELECT general, INSERT en productos, inventario, compras, ventas y gastos.
  - `CAJERO`: SELECT productos/categorías/inventario, INSERT en ventas y aperturas/cierres de caja propia.
