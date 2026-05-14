import { createContext, useContext, useState, ReactNode } from "react";

type TabType = "home" | "bookings" | "track" | "reports" | "profile";

interface CustomerPortalContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  isVerified: boolean;
  setIsVerified: (verified: boolean) => void;
  orgId: string;
  selectedBookingNumber: string | null;
  setSelectedBookingNumber: (bookingNumber: string | null) => void;
}

const CustomerPortalContext = createContext<CustomerPortalContextType | undefined>(undefined);

interface CustomerPortalProviderProps {
  children: ReactNode;
  orgId: string;
}

export function CustomerPortalProvider({ children, orgId }: CustomerPortalProviderProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [selectedBookingNumber, setSelectedBookingNumber] = useState<string | null>(null);

  return (
    <CustomerPortalContext.Provider
      value={{
        activeTab,
        setActiveTab,
        customerPhone,
        setCustomerPhone,
        isVerified,
        setIsVerified,
        orgId,
        selectedBookingNumber,
        setSelectedBookingNumber,
      }}
    >
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const context = useContext(CustomerPortalContext);
  if (context === undefined) {
    throw new Error("useCustomerPortal must be used within a CustomerPortalProvider");
  }
  return context;
}

export type { TabType };
