import { createClient } from "@/lib/supabase/client";
import { Sale, SaleItem, CashRegister, CashMovement, PaymentMethod, CashMovementType } from "@/types/database";

export const posService = {
  // CAJA DIARIA
  async getActiveCashRegister(): Promise<CashRegister | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*, opened_by_user:profiles!cash_registers_opened_by_fkey(*)")
      .eq("status", "ABIERTA")
      .maybeSingle();

    if (error) return null;
    return data as CashRegister;
  },

  async openCashRegister(initialAmount: number, userId: string, notes?: string): Promise<CashRegister> {
    const supabase = createClient();
    const { count } = await supabase.from("cash_registers").select("*", { count: "exact", head: true });
    const regNum = `CAJA-${String((count || 0) + 1).padStart(4, "0")}`;

    const { data, error } = await supabase
      .from("cash_registers")
      .insert([
        {
          register_number: regNum,
          opened_by: userId,
          initial_amount: initialAmount,
          expected_amount: initialAmount,
          counted_amount: 0,
          difference: 0,
          status: "ABIERTA",
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as CashRegister;
  },

  async closeCashRegister(registerId: string, countedAmount: number, userId: string, notes?: string): Promise<CashRegister> {
    const supabase = createClient();

    // 1. Obtener caja e ingresos en efectivo
    const { data: reg, error: fetchErr } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("id", registerId)
      .single();

    if (fetchErr || !reg) throw new Error("Caja no encontrada.");

    // Calcular movimientos de efectivo
    const { data: movs } = await supabase
      .from("cash_movements")
      .select("movement_type, amount")
      .eq("cash_register_id", registerId);

    let expected = Number(reg.initial_amount);
    (movs || []).forEach((m: any) => {
      if (["VENTA", "INGRESO_EXTRA"].includes(m.movement_type)) {
        expected += Number(m.amount);
      } else {
        expected -= Number(m.amount);
      }
    });

    const diff = countedAmount - expected;

    const { data, error } = await supabase
      .from("cash_registers")
      .update({
        closed_by: userId,
        closed_at: new Date().toISOString(),
        expected_amount: expected,
        counted_amount: countedAmount,
        difference: diff,
        status: "CERRADA",
        notes: notes || null,
      })
      .eq("id", registerId)
      .select()
      .single();

    if (error) throw error;
    return data as CashRegister;
  },

  async getCashMovements(registerId: string): Promise<CashMovement[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_movements")
      .select("*")
      .eq("cash_register_id", registerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CashMovement[];
  },

  async addCashMovement(params: {
    cash_register_id: string;
    user_id: string;
    movement_type: CashMovementType;
    amount: number;
    description: string;
  }): Promise<CashMovement> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_movements")
      .insert([params])
      .select()
      .single();

    if (error) throw error;
    return data as CashMovement;
  },

  // PROCESAR VENTA ATÓMICA RPC POS
  async processSale(params: {
    cash_register_id?: string;
    user_id: string;
    customer_name?: string;
    subtotal: number;
    discount: number;
    total: number;
    payment_method: PaymentMethod;
    items: { product_id: string; quantity: number; unit_price: number }[];
    payments: { payment_method: PaymentMethod; amount: number; reference_number?: string }[];
  }): Promise<string> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("process_pos_sale", {
      p_cash_register_id: params.cash_register_id || null,
      p_user_id: params.user_id,
      p_customer_name: params.customer_name || "Cliente General",
      p_subtotal: params.subtotal,
      p_discount: params.discount,
      p_total: params.total,
      p_payment_method: params.payment_method,
      p_sale_items: params.items,
      p_sale_payments: params.payments,
    });

    if (error) throw new Error(error.message || "Error al procesar la venta en POS.");
    return data as string;
  },

  // HISTORIAL DE VENTAS Y ANULACIÓN
  async getSales(): Promise<Sale[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select("*, seller:profiles!sales_user_id_fkey(*), items:sale_items(*, product:products(*)), payments:sale_payments(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Sale[];
  },

  async annulSale(saleId: string, userId: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("annul_pos_sale", {
      p_sale_id: saleId,
      p_user_id: userId,
      p_reason: reason,
    });

    if (error) throw new Error(error.message || "Error al anular la venta.");
  },
};
