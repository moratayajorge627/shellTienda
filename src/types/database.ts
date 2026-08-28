export type RoleName = 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | string;

export type EmployeeStatus = 'ACTIVO' | 'INACTIVO';
export type ProductStatus = 'ACTIVO' | 'INACTIVO';
export type SupplierStatus = 'ACTIVO' | 'INACTIVO';
export type CashRegisterStatus = 'ABIERTA' | 'CERRADA';
export type SaleStatus = 'COMPLETADA' | 'ANULADA' | 'PENDIENTE';
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO' | 'CREDITO' | 'CHEQUE';
export type PaymentStatus = 'PAGADA' | 'PENDIENTE' | 'PARCIAL' | 'VENCIDA';
export type MovementType = 
  | 'COMPRA' 
  | 'VENTA' 
  | 'AJUSTE_ENTRADA' 
  | 'AJUSTE_SALIDA' 
  | 'DEVOLUCION' 
  | 'PRODUCTO_DAÑADO' 
  | 'ANULACION_VENTA' 
  | 'OTRO';

export type CashMovementType = 
  | 'VENTA' 
  | 'INGRESO_EXTRA' 
  | 'EGRESO_GASTO' 
  | 'PAGO_PROVEEDOR' 
  | 'PAGO_PRESTAMO' 
  | 'RETIRO';

export type ExpenseFrequency = 'UNICO' | 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
export type ExpenseStatus = 'PAGADO' | 'PENDIENTE';
export type LoanStatus = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'PAGADO' | 'VENCIDO';

export interface StoreSettings {
  id: string;
  store_name: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address?: string;
  hire_date: string;
  position?: string;
  salary: number;
  status: EmployeeStatus;
  user_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  internal_code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id?: string | null;
  brand?: string;
  unit_of_measure: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  image_url?: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  movement_type: MovementType;
  reference_id?: string;
  user_id?: string;
  notes?: string;
  created_at: string;
  product?: Product;
  user?: Profile;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_name?: string;
  notes?: string;
  status: SupplierStatus;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  total_amount: number;
  invoice_number?: string;
  purchase_date: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  product?: Product;
}

export interface AccountPayable {
  id: string;
  supplier_id?: string;
  purchase_id?: string;
  concept: string;
  original_amount: number;
  total_paid: number;
  balance: number;
  due_date?: string;
  status: PaymentStatus;
  created_at: string;
  supplier?: Supplier;
}

export interface AccountPayablePayment {
  id: string;
  account_payable_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  user_id?: string;
  notes?: string;
}

export interface CashRegister {
  id: string;
  register_number: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  initial_amount: number;
  expected_amount?: number;
  counted_amount?: number;
  difference?: number;
  status: CashRegisterStatus;
  notes?: string;
  opened_by_user?: Profile;
  closed_by_user?: Profile;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  user_id: string;
  movement_type: CashMovementType;
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  cash_register_id?: string;
  user_id: string;
  customer_name: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
  payments?: SalePayment[];
  seller?: Profile;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number; // Historical Cost
  subtotal: number;
  cost_total: number;
  profit: number;
  product?: Product;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference_number?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  type: 'OPERATIVO' | 'ADMINISTRATIVO' | 'VENTAS' | 'FINANCIERO' | 'EXTRAORDINARIO';
}

export interface RecurringExpense {
  id: string;
  category_id?: string;
  description: string;
  expected_amount: number;
  frequency: ExpenseFrequency;
  is_active: boolean;
  created_at: string;
  category?: ExpenseCategory;
}

export interface Expense {
  id: string;
  category_id?: string;
  recurring_expense_id?: string;
  description: string;
  amount: number;
  expense_date: string;
  frequency: ExpenseFrequency;
  status: ExpenseStatus;
  payment_method: PaymentMethod;
  registered_by?: string;
  notes?: string;
  created_at: string;
  category?: ExpenseCategory;
}

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Income {
  id: string;
  category_id?: string;
  description: string;
  amount: number;
  income_date: string;
  payment_method: PaymentMethod;
  registered_by?: string;
  notes?: string;
  created_at: string;
  category?: IncomeCategory;
}

export interface Loan {
  id: string;
  loan_name: string;
  creditor: string;
  original_amount: number;
  interest_rate: number;
  total_installments: number;
  installment_amount: number;
  frequency: ExpenseFrequency;
  start_date: string;
  next_payment_date?: string;
  total_paid: number;
  balance: number;
  status: LoanStatus;
  created_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  user_id?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_name: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: Profile;
}

// Financial Statements Summary DTOs
export interface DailyFinancialSummary {
  date: string;
  gross_sales: number;
  discounts: number;
  net_sales: number;
  cogs: number; // Cost of Goods Sold (Historical)
  gross_profit: number;
  operating_expenses: number;
  other_expenses: number;
  other_incomes: number;
  net_result: number; // Utilization / Net Profit
  cash_flow_in: number;
  cash_flow_out: number;
  net_cash_flow: number;
}
