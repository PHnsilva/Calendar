import { useState } from "react";
import type { HomeSelectedSlot } from "../types";

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthStart(dateString: string): string {
  return `${dateString.slice(0, 7)}-01`;
}

export function useHomeCalendarView() {
  const today = toIsoDate(new Date());

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedSlot, setSelectedSlot] = useState<HomeSelectedSlot>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(toMonthStart(today));
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setCurrentMonth(toMonthStart(date));
  };

  const handleSlotSelect = (slot: HomeSelectedSlot) => {
    setSelectedSlot(slot);
  };

  const clearSelection = () => {
    setSelectedDate("");
    setSelectedSlot(null);
  };

  const openBookingModal = () => {
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  return {
    selectedDate,
    selectedSlot,
    currentMonth,
    isBookingModalOpen,
    setCurrentMonth,
    handleDateSelect,
    handleSlotSelect,
    clearSelection,
    openBookingModal,
    closeBookingModal,
  };
}
