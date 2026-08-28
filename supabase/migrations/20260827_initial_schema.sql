-- ==========================================
-- MIGRACIÓN INICIAL: SISTEMA DE ADMINISTRACIÓN DE TIENDA
-- PostgreSQL + Supabase RLS + RPC Transaccionales
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORE SETTINGS (Configuración General)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'Mi Tienda',
    nit TEXT DEFAULT 'CF',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'GTQ',
    currency_symbol TEXT NOT NULL DEFAULT 'Q',
    timezone TEXT NOT NULL DEFAULT 'America/Guatemala',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLES, PERMISSIONS, ROLE_PERMISSIONS, USER_ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    position TEXT,
    salary NUMERIC(12,2) DEFAULT 0.00 CHECK (salary >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CATEGORIES & PRODUCTS
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_code TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT,
    unit_of_measure TEXT DEFAULT 'Unidad',
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (stock_quantity >= 0),
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 5.00 CHECK (min_stock >= 0),
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_internal_code ON public.products(internal_code);

-- 6. INVENTORY MOVEMENTS
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL,
    stock_before NUMERIC(12,2) NOT NULL,
    stock_after NUMERIC(12,2) NOT NULL,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN (
            'COMPRA', 'VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 
            'DEVOLUCION', 'PRODUCTO_DAÑADO', 'ANULACION_VENTA', 'OTRO'
        )
    ),
    reference_id UUID,
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPPLIERS, PURCHASES & ACCOUNTS PAYABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    nit TEXT DEFAULT 'CF',
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    invoice_number TEXT,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO')),
    payment_status TEXT NOT NULL DEFAULT 'PAGADA' CHECK (payment_status IN ('PAGADA', 'PENDIENTE')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    concept TEXT NOT NULL,
    original_amount NUMERIC(12,2) NOT NULL CHECK (original_amount >= 0),
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
    balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0),
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts_payable_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_payable_id UUID NOT NULL REFERENCES public.accounts_payable(id) ON DELETE RESTRICT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE')),
    reference_number TEXT,
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT
);

-- 8. CASH REGISTERS & MOVEMENTS
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    register_number TEXT NOT NULL,
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    closed_by UUID REFERENCES public.profiles(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    initial_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (initial_amount >= 0),
    expected_amount NUMERIC(12,2) DEFAULT 0.00,
    counted_amount NUMERIC(12,2) DEFAULT 0.00,
    difference NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (status IN ('ABIERTA', 'CERRADA')),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('VENTA', 'INGRESO_EXTRA', 'EGRESO_GASTO', 'PAGO_PROVEEDOR', 'PAGO_PRESTAMO', 'RETIRO')
    ),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SALES & HISTORICAL COST SALE ITEMS
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number TEXT UNIQUE NOT NULL,
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_name TEXT DEFAULT 'Cliente General',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO', 'CREDITO')),
    status TEXT NOT NULL DEFAULT 'COMPLETADA' CHECK (status IN ('COMPLETADA', 'ANULADA', 'PENDIENTE')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0), -- HISTORICAL COST CONGELADO EN LA VENTA
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    cost_total NUMERIC(12,2) NOT NULL CHECK (cost_total >= 0),
    profit NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXPENSES & RECURRING EXPENSES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'OPERATIVO' CHECK (type IN ('OPERATIVO', 'ADMINISTRATIVO', 'VENTAS', 'FINANCIERO', 'EXTRAORDINARIO'))
);

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount >= 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT CURRENT_DATE,
    frequency TEXT NOT NULL DEFAULT 'UNICO' CHECK (frequency IN ('UNICO', 'DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL')),
    status TEXT NOT NULL DEFAULT 'PAGADO' CHECK (status IN ('PAGADO', 'PENDIENTE')),
    payment_method TEXT NOT NULL DEFAULT 'EFECTIVO' CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE')),
    registered_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXTRAORDINARY INCOMES (No Comercial)
CREATE TABLE IF NOT EXISTS public.income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.income_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    income_date DATE DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'EFECTIVO' CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE')),
    registered_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. LOANS & LOAN PAYMENTS
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_name TEXT NOT NULL,
    creditor TEXT NOT NULL,
    original_amount NUMERIC(12,2) NOT NULL CHECK (original_amount > 0),
    interest_rate NUMERIC(5,2) DEFAULT 0.00 CHECK (interest_rate >= 0),
    total_installments INT DEFAULT 1 CHECK (total_installments > 0),
    installment_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (installment_amount >= 0),
    frequency TEXT DEFAULT 'MENSUAL' CHECK (frequency IN ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'ANUAL')),
    start_date DATE DEFAULT CURRENT_DATE,
    next_payment_date DATE,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
    balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0),
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'PARCIALMENTE_PAGADO', 'PAGADO', 'VENCIDO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    principal_amount NUMERIC(12,2) NOT NULL CHECK (principal_amount >= 0),
    interest_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (interest_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE')),
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRIGGERS Y FUNCIONES DE ACTUALIZACIÓN
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrar usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuario'),
        'ACTIVO'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- FUNCIONES RPC TRANSACCIONALES
-- ==========================================

-- RPC POS Sale Process (Atómico con Bloqueo de Stock y Costo Histórico)
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_cash_register_id UUID,
    p_user_id UUID,
    p_customer_name TEXT,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_sale_items JSONB, -- Array de objetos: [{product_id, quantity, unit_price}]
    p_sale_payments JSONB -- Array de objetos: [{payment_method, amount, reference_number}]
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_sale_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_unit_price NUMERIC;
    v_purchase_price NUMERIC;
    v_current_stock NUMERIC;
    v_item_subtotal NUMERIC;
    v_item_cost_total NUMERIC;
    v_item_profit NUMERIC;
    v_pay JSONB;
    v_seq INT;
BEGIN
    -- Generar Número de Venta Secuencial
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq FROM public.sales;
    v_sale_number := 'V-GT-' || LPAD(v_seq::TEXT, 6, '0');

    -- Insertar Encabezado de Venta
    INSERT INTO public.sales (
        sale_number, cash_register_id, user_id, customer_name,
        subtotal, discount, total, payment_method, status
    ) VALUES (
        v_sale_number, p_cash_register_id, p_user_id, COALESCE(p_customer_name, 'Cliente General'),
        p_subtotal, p_discount, p_total, p_payment_method, 'COMPLETADA'
    ) RETURNING id INTO v_sale_id;

    -- Procesar cada Item de Venta
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;

        -- Bloquear la fila del producto para concurrencia segura
        SELECT stock_quantity, purchase_price 
        INTO v_current_stock, v_purchase_price
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Producto no encontrado: %', v_product_id;
        END IF;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto. Disponible: %, Solicitado: %', v_current_stock, v_quantity;
        END IF;

        -- Calcular montos con COSTO HISTÓRICO
        v_item_subtotal := v_quantity * v_unit_price;
        v_item_cost_total := v_quantity * v_purchase_price;
        v_item_profit := v_item_subtotal - v_item_cost_total;

        -- Insertar Detalle de Venta
        INSERT INTO public.sale_items (
            sale_id, product_id, quantity, unit_price, unit_cost, subtotal, cost_total, profit
        ) VALUES (
            v_sale_id, v_product_id, v_quantity, v_unit_price, v_purchase_price, v_item_subtotal, v_item_cost_total, v_item_profit
        );

        -- Actualizar Stock
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- Registrar Movimiento de Inventario
        INSERT INTO public.inventory_movements (
            product_id, quantity, stock_before, stock_after, movement_type, reference_id, user_id, notes
        ) VALUES (
            v_product_id, -v_quantity, v_current_stock, v_current_stock - v_quantity, 'VENTA', v_sale_id, p_user_id, 'Venta ' || v_sale_number
        );
    END LOOP;

    -- Registrar Formas de Pago
    FOR v_pay IN SELECT * FROM jsonb_array_elements(p_sale_payments)
    LOOP
        INSERT INTO public.sale_payments (
            sale_id, payment_method, amount, reference_number
        ) VALUES (
            v_sale_id, (v_pay->>'payment_method'), (v_pay->>'amount')::NUMERIC, (v_pay->>'reference_number')
        );

        -- Registrar movimiento en caja si hay caja abierta y pago es en efectivo
        IF p_cash_register_id IS NOT NULL AND (v_pay->>'payment_method') = 'EFECTIVO' THEN
            INSERT INTO public.cash_movements (
                cash_register_id, user_id, movement_type, amount, description, reference_id
            ) VALUES (
                p_cash_register_id, p_user_id, 'VENTA', (v_pay->>'amount')::NUMERIC, 'Ingreso por Venta ' || v_sale_number, v_sale_id
            );
        END IF;
    END LOOP;

    -- Auditoría
    INSERT INTO public.audit_logs (user_id, action, entity_name, entity_id, new_data)
    VALUES (p_user_id, 'CREATE_SALE', 'sales', v_sale_id::TEXT, jsonb_build_object('sale_number', v_sale_number, 'total', p_total));

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para Anular Venta (Reversión Atómica)
CREATE OR REPLACE FUNCTION public.annul_pos_sale(
    p_sale_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
    v_product RECORD;
BEGIN
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
    IF v_sale.id IS NULL THEN
        RAISE EXCEPTION 'Venta no encontrada.';
    END IF;

    IF v_sale.status = 'ANULADA' THEN
        RAISE EXCEPTION 'La venta ya se encuentra anulada.';
    END IF;

    -- Marcar venta como ANULADA
    UPDATE public.sales SET status = 'ANULADA', notes = COALESCE(notes, '') || ' [ANULADA: ' || p_reason || ']' WHERE id = p_sale_id;

    -- Revertir Stock y registrar movimientos
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        SELECT stock_quantity INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;

        UPDATE public.products
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.product_id;

        INSERT INTO public.inventory_movements (
            product_id, quantity, stock_before, stock_after, movement_type, reference_id, user_id, notes
        ) VALUES (
            v_item.product_id, v_item.quantity, v_product.stock_quantity, v_product.stock_quantity + v_item.quantity,
            'ANULACION_VENTA', p_sale_id, p_user_id, 'Anulación de Venta ' || v_sale.sale_number
        );
    END LOOP;

    -- Auditoría
    INSERT INTO public.audit_logs (user_id, action, entity_name, entity_id, old_data, new_data)
    VALUES (p_user_id, 'ANNUL_SALE', 'sales', p_sale_id::TEXT, jsonb_build_object('status', 'COMPLETADA'), jsonb_build_object('status', 'ANULADA', 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para usuarios autenticados
CREATE POLICY "Permitir lectura general a autenticados" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de perfiles a autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de empleados a autenticados" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de roles a autenticados" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de permisos a autenticados" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de role_permissions a autenticados" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de user_roles a autenticados" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de categorias a autenticados" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de productos a autenticados" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de inventario a autenticados" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de proveedores a autenticados" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de compras a autenticados" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de items compra a autenticados" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de cuentas por pagar a autenticados" ON public.accounts_payable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de pagos proveedores a autenticados" ON public.accounts_payable_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de cajas a autenticados" ON public.cash_registers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de movimientos de caja a autenticados" ON public.cash_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de ventas a autenticados" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de items de venta a autenticados" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de pagos de venta a autenticados" ON public.sale_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de categorias de gasto a autenticados" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de gastos recurrentes a autenticados" ON public.recurring_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de gastos a autenticados" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de otros ingresos a autenticados" ON public.income_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de ingresos a autenticados" ON public.incomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de prestamos a autenticados" ON public.loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de pagos prestamos a autenticados" ON public.loan_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura de auditoria a autenticados" ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- Permisos de modificación directa por RLS para usuarios autenticados
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.accounts_payable_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.cash_registers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.sale_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.recurring_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.income_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.incomes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.loan_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insert/update a usuarios autenticados" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
