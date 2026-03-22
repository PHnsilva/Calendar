import { useMemo, useState } from "react";
import type { AdminFilters } from "../types";

const initialFilters: AdminFilters = {
  search: "",
  status: "",
  city: "",
  from: "",
  to: "",
};

export function useAdminFilters() {
  const [filters, setFilters] = useState<AdminFilters>(initialFilters);

  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    [filters],
  );

  return {
    filters,
    filtersKey,
    setFilters,
    updateFilter<K extends keyof AdminFilters>(key: K, value: AdminFilters[K]) {
      setFilters((current) => ({
        ...current,
        [key]: value,
      }));
    },
    resetFilters() {
      setFilters(initialFilters);
    },
  };
}
