import { createClient } from "@/lib/supabase/client";
import {
  ExpenseCategory,
  RecurringExpense,
  Expense,
  IncomeCategory,
  Income,
  Loan,
  LoanPayment,
  ExpenseFrequency,
  PaymentMethod,
  DailyFinancialSummary
} from "@/types/database";

export const financeService = {
  // CATEGORÍAS DE GASTOS
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  },

  // GASTOS RECURRENTES (CONFIGURACIÓN)
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_expenses")
      .select("*, category:expense_categories(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as RecurringExpense[];
  },

  async createRecurringExpense(expense: {
    category_id?: string;
    description: string;
    expected_amount: number;
    frequency: ExpenseFrequency;
  }): Promise<RecurringExpense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_expenses")
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  // GASTOS REGISTRADOS / PAGADOS
  async getExpenses(): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*, category:expense_categories(*)")
      .order("expense_date", { ascending: false });

    if (error) throw error;
    return (data || []) as Expense[];
  },

  async createExpense(expense: {
    category_id?: string;
    recurring_expense_id?: string;
    description: string;
    amount: number;
    expense_date?: string;
    frequency: ExpenseFrequency;
    status: "PAGADO" | "PENDIENTE";
    payment_method: PaymentMethod;
    registered_by?: string;
    notes?: string;
  }): Promise<Expense> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expenses")
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  // OTROS INGRESOS (NO COMERCIALES)
  async getIncomes(): Promise<Income[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("incomes")
      .select("*, category:income_categories(*)")
      .order("income_date", { ascending: false });

    if (error) throw error;
    return (data || []) as Income[];
  },

  async createIncome(income: {
    category_id?: string;
    description: string;
    amount: number;
    income_date?: string;
    payment_method: PaymentMethod;
    registered_by?: string;
    notes?: string;
  }): Promise<Income> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("incomes")
      .insert([income])
      .select()
      .single();

    if (error) throw error;
    return data as Income;
  },

  // PRÉSTAMOS & PAGOS DE CAPITAL/INTERESES
  async getLoans(): Promise<Loan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Loan[];
  },

  async createLoan(loan: {
    loan_name: string;
    creditor: string;
    original_amount: number;
    interest_rate: number;
    total_installments: number;
    installment_amount: number;
    frequency: ExpenseFrequency;
  }): Promise<Loan> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("loans")
      .insert([
        {
          ...loan,
          total_paid: 0,
          balance: loan.original_amount,
          status: "PENDIENTE",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Loan;
  },

  async registerLoanPayment(params: {
    loan_id: string;
    principal_amount: number;
    interest_amount: number;
    payment_method: PaymentMethod;
    user_id?: string;
    notes?: string;
  }): Promise<void> {
    const supabase = createClient();

    // 1. Obtener saldo actual
    const { data: loan, error: fetchErr } = await supabase
      .from("loans")
      .select("*")
      .eq("id", params.loan_id)
      .single();

    if (fetchErr || !loan) throw new Error("Préstamo no encontrado.");

    const totalPayment = params.principal_amount + params.interest_amount;
    const currentPaid = Number(loan.total_paid || 0);
    const newPaid = currentPaid + params.principal_amount;
    const newBalance = Number(loan.original_amount) - newPaid;

    if (newBalance < 0) {
      throw new Error("El abono de capital excede el saldo pendiente del préstamo.");
    }

    const newStatus = newBalance === 0 ? "PAGADO" : "PARCIALMENTE_PAGADO";

    // 2. Insertar historial de pago
    const { error: payErr } = await supabase.from("loan_payments").insert([
      {
        loan_id: params.loan_id,
        principal_amount: params.principal_amount,
        interest_amount: params.interest_amount,
        total_amount: totalPayment,
        payment_method: params.payment_method,
        user_id: params.user_id || null,
        notes: params.notes || null,
      },
    ]);

    if (payErr) throw payErr;

    // 3. Actualizar préstamo
    await supabase
      .from("loans")
      .update({
        total_paid: newPaid,
        balance: newBalance,
        status: newStatus,
      })
      .eq("id", params.loan_id);
  },
};
