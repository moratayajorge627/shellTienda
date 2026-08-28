import { createClient } from "@/lib/supabase/client";
import { Product, Category, InventoryMovement, MovementType } from "@/types/database";

export const productService = {
  // CATEGORÍAS
  async getCategories(): Promise<Category[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []) as Category[];
  },

  async createCategory(category: { name: string; description?: string }): Promise<Category> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  // PRODUCTOS
  async getProducts(): Promise<Product[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Product[];
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .or(`barcode.eq.${barcode},internal_code.eq.${barcode}`)
      .single();

    if (error) return null;
    return data as Product;
  },

  async createProduct(product: {
    internal_code: string;
    barcode?: string | null;
    name: string;
    description?: string;
    category_id?: string | null;
    brand?: string;
    unit_of_measure: string;
    purchase_price: number;
    sale_price: number;
    stock_quantity: number;
    min_stock: number;
    image_url?: string;
    status: "ACTIVO" | "INACTIVO";
  }): Promise<Product> {
    const supabase = createClient();

    // Validar código de barras duplicado
    if (product.barcode) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", product.barcode)
        .maybeSingle();

      if (existing) {
        throw new Error("Ya existe un producto registrado con este código de barras.");
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const supabase = createClient();

    if (updates.barcode) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", updates.barcode)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        throw new Error("Ya existe otro producto registrado con este código de barras.");
      }
    }

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // INVENTARIO & AJUSTES DE STOCK
  async getInventoryMovements(): Promise<InventoryMovement[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*, product:products(*), user:profiles(*)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return (data || []) as InventoryMovement[];
  },

  async adjustStock(params: {
    product_id: string;
    quantity: number;
    movement_type: MovementType;
    notes?: string;
    user_id?: string;
  }): Promise<void> {
    const supabase = createClient();

    // 1. Obtener producto actual con lock
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", params.product_id)
      .single();

    if (fetchErr || !product) {
      throw new Error("Producto no encontrado.");
    }

    const currentStock = Number(product.stock_quantity);
    const newStock = currentStock + params.quantity;

    if (newStock < 0) {
      throw new Error("El ajuste dejaría el stock en negativo.");
    }

    // 2. Actualizar stock
    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq("id", params.product_id);

    if (updateErr) throw updateErr;

    // 3. Crear movimiento de inventario auditoría
    const { error: movErr } = await supabase.from("inventory_movements").insert([
      {
        product_id: params.product_id,
        quantity: params.quantity,
        stock_before: currentStock,
        stock_after: newStock,
        movement_type: params.movement_type,
        user_id: params.user_id,
        notes: params.notes || `Ajuste manual (${params.movement_type})`,
      },
    ]);

    if (movErr) throw movErr;
  },
};
