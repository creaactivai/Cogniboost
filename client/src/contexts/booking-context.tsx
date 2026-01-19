import { createContext, useContext, useState, ReactNode } from "react";
import { BookClassModal } from "@/components/book-class-modal";

export type BookingType = 'class' | 'demo';

interface BookingContextType {
  openBooking: (type?: BookingType) => void;
  closeBooking: () => void;
  isOpen: boolean;
  bookingType: BookingType;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>('class');

  const openBooking = (type: BookingType = 'class') => {
    setBookingType(type);
    setIsOpen(true);
  };
  const closeBooking = () => setIsOpen(false);

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking, isOpen, bookingType }}>
      {children}
      <BookClassModal isOpen={isOpen} onClose={closeBooking} bookingType={bookingType} />
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
