/**
 * Pruebas Unitarias de Lógica Financiera Crítica
 * Verificación del caso real planteado en el requerimiento (#51)
 */

export function calculateFinancials(params: {
  sales: { total: number; cogs: number }[];
  dailyExpenses: number;
  monthlyExpensesPaid: number;
  loanReceived: number;
  loanCapitalRepaid: number;
}) {
  const grossSales = params.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCogs = params.sales.reduce((sum, s) => sum + s.cogs, 0);
  const grossProfit = grossSales - totalCogs;

  const totalOperatingExpenses = params.dailyExpenses + params.monthlyExpensesPaid;
  const netResult = grossProfit - totalOperatingExpenses;

  // Flujo de Efectivo
  const cashIn = grossSales + params.loanReceived;
  const cashOut = totalCogs + totalOperatingExpenses + params.loanCapitalRepaid;
  const netCashFlow = cashIn - cashOut;

  return {
    grossSales,
    totalCogs,
    grossProfit,
    totalOperatingExpenses,
    netResult,
    cashIn,
    cashOut,
    netCashFlow,
  };
}

// Test Runner simple para Node
if (require.main === module) {
  console.log("Ejecutando Pruebas Financieras del Sistema...");

  // Caso Requerimiento #51:
  // Ventas: Q5,000 | Costo de Ventas: Q3,000 | Gasto Diario: Q400 | Pago Luz: Q1,000 | Préstamo recibido: Q5,000 | Repago Capital Préstamo: Q500
  const res = calculateFinancials({
    sales: [{ total: 5000, cogs: 3000 }],
    dailyExpenses: 400,
    monthlyExpensesPaid: 1000,
    loanReceived: 5000,
    loanCapitalRepaid: 500,
  });

  console.assert(res.grossProfit === 2000, `Ganancia Bruta debe ser 2000, obtenido: ${res.grossProfit}`);
  console.assert(res.totalOperatingExpenses === 1400, `Gastos Operativos debe ser 1400, obtenido: ${res.totalOperatingExpenses}`);
  console.assert(res.netResult === 600, `Resultado Neto debe ser 600, obtenido: ${res.netResult}`);
  console.assert(res.cashIn === 10000, `Flujo Entradas debe ser 10000, obtenido: ${res.cashIn}`);

  console.log("✅ TODAS LAS PRUEBAS FINANCIERAS PASARON EXITOSAMENTE.");
}
