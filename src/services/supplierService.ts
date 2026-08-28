import { createClient } from "@/lib/supabase/client";
import { Supplier, Purchase, AccountPayable, AccountPayablePayment, PaymentMethod } from "@/types/database";

export const supplierService = {
  // PROVEEDORES
  async getSuppliers(): Promise<Supplier[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []) as Supplier[];
  },

  async createSupplier(supplier: {
    name: string;
    company_name?: string;
    nit?: string;
    phone?: string;
    email?: string;
    address?: string;
    contact_name?: string;
    notes?: string;
  }): Promise<Supplier> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert([supplier])
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  // COMPRAS DE MERCADERÍA
  async getPurchases(): Promise<Purchase[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("purchases")
      .select("*, supplier:suppliers(*), items:purchase_items(*, product:products(*))")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Purchase[];
  },

  async createPurchase(params: {
    supplier_id: string;
    invoice_number?: string;
    payment_method: PaymentMethod;
    is_pending_payment: boolean;
    notes?: string;
    user_id?: string;
    items: {
      product_id: string;
      quantity: number;
      unit_cost: number;
    }[];
  }): Promise<Purchase> {
    const supabase = createClient();
    
    // Generar Número de Compra
    const { count } = await supabase.from("purchases").select("*", { count: "exact", head: true });
    const purchaseNumber = `PUR-${String((count || 0) + 1).padStart(6, "0")}`;

    const totalAmount = params.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
    const paymentStatus = params.is_pending_payment ? "PENDIENTE" : "PAGADA";

    // 1. Crear encabezado de Compra
    const { data: purchase, error: purchaseErr } = await supabase
      .from("purchases")
      .insert([
        {
          purchase_number: purchaseNumber,
          supplier_id: params.supplier_id,
          total_amount: totalAmount,
          invoice_number: params.invoice_number || null,
          payment_method: params.payment_method,
          payment_status: paymentStatus,
          notes: params.notes || null,
          created_by: params.user_id || null,
        },
      ])
      .select()
      .single();

    if (purchaseErr) throw purchaseErr;

    // 2. Crear detalles de compra e incrementar stock
    for (const item of params.items) {
      const subtotal = item.quantity * item.unit_cost;

      // Insertar item
      await supabase.from("purchase_items").insert([
        {
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: subtotal,
        },
      ]);

      // Obtener stock actual
      const { data: prod } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      const currentStock = Number(prod?.stock_quantity || 0);
      const newStock = currentStock + item.quantity;

      // Actualizar stock y costo de compra en catálogo
      await supabase
        .from("products")
        .update({
          stock_quantity: newStock,
          purchase_price: item.unit_cost, // Actualizar último costo de compra
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.product_id);

      // Registrar movimiento de inventario
      await supabase.from("inventory_movements").insert([
        {
          product_id: item.product_id,
          quantity: item.quantity,
          stock_before: currentStock,
          stock_after: newStock,
          movement_type: "COMPRA",
          reference_id: purchase.id,
          user_id: params.user_id,
          notes: `Ingreso por Compra ${purchaseNumber}`,
        },
      ]);
    }

    // 3. Si la compra quedó pendiente de pago (a crédito), crear cuenta por pagar
    if (params.is_pending_payment) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 días crédito por defecto

      await supabase.from("accounts_payable").insert([
        {
          supplier_id: params.supplier_id,
          purchase_id: purchase.id,
          concept: `Compra de Mercadería ${purchaseNumber}`,
          original_amount: totalAmount,
          total_paid: 0,
          balance: totalAmount,
          due_date: dueDate.toISOString().split("T")[0],
          status: "PENDIENTE",
        },
      ]);
    }

    // Audit log
    await supabase.from("audit_logs").insert([
      {
        user_id: params.user_id,
        action: "CREATE_PURCHASE",
        entity_name: "purchases",
        entity_id: purchase.id,
        new_data: { purchase_number: purchaseNumber, total_amount: totalAmount },
      },
    ]);

    return purchase as Purchase;
  },

  // CUENTAS POR PAGAR & ABONOS
  async getAccountsPayable(): Promise<AccountPayable[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("accounts_payable")
      .select("*, supplier:suppliers(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as AccountPayable[];
  },

  async registerAccountPayablePayment(params: {
    account_payable_id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
    user_id?: string;
    notes?: string;
  }): Promise<void> {
    const supabase = createClient();

    // 1. Obtener deuda actual
    const { data: debt, error: debtErr } = await supabase
      .from("accounts_payable")
      .select("*")
      .eq("id", params.account_payable_id)
      .single();

    if (debtErr || !debt) throw new Error("Cuenta por pagar no encontrada.");

    const currentPaid = Number(debt.total_paid || 0);
    const newPaid = currentPaid + params.amount;
    const newBalance = Number(debt.original_amount) - newPaid;

    if (newBalance < 0) {
      throw new Error("El monto abonado excede el saldo pendiente de la deuda.");
    }

    const newStatus = newBalance === 0 ? "PAGADA" : "PARCIAL";

    // 2. Registrar pago
    const { error: payErr } = await supabase.from("accounts_payable_payments").insert([
      {
        account_payable_id: params.account_payable_id,
        amount: params.amount,
        payment_method: params.payment_method,
        reference_number: params.reference_number || null,
        user_id: params.user_id || null,
        notes: params.notes || null,
      },
    ]);

    if (payErr) throw payErr;

    // 3. Actualizar balance de la deuda
    await supabase
      .from("accounts_payable")
      .update({
        total_paid: newPaid,
        balance: newBalance,
        status: newStatus,
      })
      .eq("id", params.account_payable_id);

    // Audit log
    await supabase.from("audit_logs").insert([
      {
        user_id: params.user_id,
        action: "PAY_ACCOUNT_PAYABLE",
        entity_name: "accounts_payable",
        entity_id: params.account_payable_id,
        new_data: { amount: params.amount, new_balance: newBalance },
      },
    ]);
  },
};
