import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { bulkCancelAdminBookings } from "../api/bulk-cancel-admin-bookings";
import { deleteAdminBooking } from "../api/delete-admin-booking";
import { getAdminBookings } from "../api/get-admin-bookings";
import { getAdminDashboardSummary } from "../api/get-admin-dashboard-summary";
import type { AdminFilters } from "../types";
import type { AdminDashboardSummaryResponse, ServicoResponse } from "../../../types/booking";

function normalizeText(value: string | undefined): string {
  return (value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function toBookingName(booking: ServicoResponse): string {
  return `${booking.clientFirstName ?? ""} ${booking.clientLastName ?? ""}`.trim();
}

function buildLocalSummary(bookings: ServicoResponse[]): AdminDashboardSummaryResponse {
  const pendingBookings = bookings.filter((booking) => booking.status?.toUpperCase() === "PENDING").length;
  const confirmedBookings = bookings.filter((booking) => booking.status?.toUpperCase() === "CONFIRMED").length;

  return {
    totalBookings: bookings.length,
    pendingBookings,
    confirmedBookings,
    otherBookings: Math.max(bookings.length - pendingBookings - confirmedBookings, 0),
    totalAmountCents: 0,
    totalBlocks: 0,
  };
}

function filterBookings(bookings: ServicoResponse[], filters: AdminFilters): ServicoResponse[] {
  const today = new Date();
  const searchValue = normalizeText(filters.search);

  return bookings
    .filter((booking) => {
      const bookingDate = new Date(booking.start);
      const bookingDay = new Date(
        bookingDate.getFullYear(),
        bookingDate.getMonth(),
        bookingDate.getDate(),
      );
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (bookingDay < todayDay) {
        return false;
      }

      if (filters.status && booking.status?.toUpperCase() !== filters.status.toUpperCase()) {
        return false;
      }

      if (filters.city && normalizeText(booking.clientCity) !== normalizeText(filters.city)) {
        return false;
      }

      if (filters.from) {
        const from = new Date(`${filters.from}T00:00:00`);
        if (bookingDay < from) {
          return false;
        }
      }

      if (filters.to) {
        const to = new Date(`${filters.to}T23:59:59`);
        if (bookingDate > to) {
          return false;
        }
      }

      if (!searchValue) {
        return true;
      }

      const haystack = normalizeText(
        [
          toBookingName(booking),
          booking.clientAddressLine,
          booking.clientEmail,
          booking.clientPhone,
          booking.clientCity,
          booking.serviceType,
        ].join(" "),
      );

      return haystack.includes(searchValue);
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function useAdminBookings(filters: AdminFilters) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");

  const bookingsQuery = useQuery({
    queryKey: queryKeys.adminBookings,
    queryFn: getAdminBookings,
    staleTime: 30_000,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.adminSummary(JSON.stringify({
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    })),
    queryFn: () =>
      getAdminDashboardSummary({
        from: filters.from,
        to: filters.to,
        status: filters.status,
        city: filters.city,
      }),
    staleTime: 30_000,
  });

  const filteredBookings = useMemo(
    () => filterBookings(bookingsQuery.data ?? [], filters),
    [bookingsQuery.data, filters],
  );

  const localSummary = useMemo(
    () => buildLocalSummary(filteredBookings),
    [filteredBookings],
  );

  const summary = summaryQuery.data ?? localSummary;

  const selectedBooking = useMemo(
    () => filteredBookings.find((booking) => booking.eventId === selectedBookingId) ?? filteredBookings[0] ?? null,
    [filteredBookings, selectedBookingId],
  );

  const selectedCount = selectedIds.length;
  const allVisibleSelected = filteredBookings.length > 0 && filteredBookings.every((booking) => selectedIds.includes(booking.eventId));

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings }),
      queryClient.invalidateQueries({ queryKey: ["admin", "summary"] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteAdminBooking,
    onSuccess: async (_, eventId) => {
      setSelectedIds((current) => current.filter((id) => id !== eventId));
      if (selectedBookingId === eventId) {
        setSelectedBookingId("");
      }
      await refreshAll();
    },
  });

  const bulkCancelMutation = useMutation({
    mutationFn: bulkCancelAdminBookings,
    onSuccess: async () => {
      setSelectedIds([]);
      await refreshAll();
    },
  });

  return {
    bookingsQuery,
    summaryQuery,
    filteredBookings,
    summary,
    selectedBooking,
    selectedIds,
    selectedCount,
    allVisibleSelected,
    deleteMutation,
    bulkCancelMutation,
    setSelectedBookingId,
    toggleSelection(eventId: string) {
      setSelectedIds((current) =>
        current.includes(eventId)
          ? current.filter((id) => id !== eventId)
          : [...current, eventId],
      );
    },
    toggleSelectVisible() {
      setSelectedIds((current) => {
        if (filteredBookings.length === 0) {
          return current;
        }

        if (filteredBookings.every((booking) => current.includes(booking.eventId))) {
          return current.filter(
            (id) => !filteredBookings.some((booking) => booking.eventId === id),
          );
        }

        const next = new Set(current);
        filteredBookings.forEach((booking) => next.add(booking.eventId));
        return Array.from(next);
      });
    },
    clearSelection() {
      setSelectedIds([]);
    },
    async removeBooking(eventId: string) {
      await deleteMutation.mutateAsync(eventId);
    },
    async bulkCancel(reason?: string) {
      if (selectedIds.length === 0) {
        return;
      }

      await bulkCancelMutation.mutateAsync({
        eventIds: selectedIds,
        reason: reason?.trim() || undefined,
      });
    },
  };
}
