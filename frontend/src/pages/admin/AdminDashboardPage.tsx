import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import HomePage from "../home/HomePage";
import HistorySheet from "../../features/history/components/HistorySheet";
import StatementSheet from "../../features/finance/components/StatementSheet";
import { getAdminBookings } from "../../features/admin/api/get-admin-bookings";
import { getStoredAdminToken } from "../../lib/storage";
import type { ServicoResponse } from "../../types/api";
import "../../app/admin-dashboard.css";

function isPastBooking(booking: ServicoResponse, todayIso: string) {
  return booking.start.slice(0, 10) < todayIso;
}

export default function AdminDashboardPage() {
  const token = getStoredAdminToken();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [activeSheet, setActiveSheet] = useState<"history" | "statement" | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", "all"],
    queryFn: getAdminBookings,
    enabled: Boolean(token),
    retry: 1,
  });

  const bookings = bookingsQuery.data ?? [];

  const historyBookings = useMemo(
    () => bookings.filter((booking) => isPastBooking(booking, todayIso)).sort((a, b) => b.start.localeCompare(a.start)),
    [bookings, todayIso],
  );

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard__toolbar">
        <div className="admin-dashboard__toolbar-copy">
          <span className="timeline-panel__eyebrow">Admin</span>
          <strong className="admin-dashboard__toolbar-title">Painel operacional</strong>
        </div>

        <div className="admin-dashboard__toolbar-actions">
          <button
            type="button"
            className={`admin-header-button ${activeSheet === "history" ? "admin-header-button--active" : ""}`}
            onClick={() => setActiveSheet("history")}
          >
            Histórico
          </button>
          <button
            type="button"
            className={`admin-header-button ${activeSheet === "statement" ? "admin-header-button--active" : ""}`}
            onClick={() => setActiveSheet("statement")}
          >
            Extrato
          </button>
        </div>
      </div>

      <HomePage mode="admin" />

      <div className="admin-dashboard__dock" aria-label="Ações rápidas do admin">
        <button
          type="button"
          className={`admin-dashboard__dock-button ${activeSheet === "history" ? "admin-dashboard__dock-button--active" : ""}`}
          onClick={() => setActiveSheet("history")}
        >
          Histórico
        </button>
        <button
          type="button"
          className={`admin-dashboard__dock-button ${activeSheet === "statement" ? "admin-dashboard__dock-button--active" : ""}`}
          onClick={() => setActiveSheet("statement")}
        >
          Extrato
        </button>
      </div>

      <HistorySheet
        open={activeSheet === "history"}
        onClose={() => setActiveSheet(null)}
        bookings={historyBookings}
      />

      <StatementSheet
        open={activeSheet === "statement"}
        onClose={() => setActiveSheet(null)}
        bookings={bookings}
      />
    </div>
  );
}
