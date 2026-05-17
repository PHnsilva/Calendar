import type { BudgetItem } from "./budget-export";

const BUDGET_TEMPLATE_KEY = "calendar.adminBudgetTemplate.v1";

export function createBudgetItem(description = "Novo item", unitPrice = 0): BudgetItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description,
    quantity: 1,
    unitPrice,
  };
}

export function defaultBudgetItems(): BudgetItem[] {
  return [
    createBudgetItem("Mao de obra", 0),
    createBudgetItem("Materiais", 0),
    createBudgetItem("Deslocamento", 0),
  ];
}

export function loadBudgetTemplate(): BudgetItem[] {
  if (typeof window === "undefined") return defaultBudgetItems();

  try {
    const raw = window.localStorage.getItem(BUDGET_TEMPLATE_KEY);
    if (!raw) return defaultBudgetItems();

    const parsed = JSON.parse(raw) as Array<Partial<BudgetItem>>;
    const items = parsed
      .map((item) => ({
        id: item.id || createBudgetItem().id,
        description: String(item.description ?? "").trim(),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
      }))
      .filter((item) => item.description);

    return items.length ? items : defaultBudgetItems();
  } catch {
    return defaultBudgetItems();
  }
}

export function saveBudgetTemplate(items: BudgetItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUDGET_TEMPLATE_KEY, JSON.stringify(items));
}
