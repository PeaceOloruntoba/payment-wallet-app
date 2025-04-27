import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  isLoggedIn: boolean;
  user: {
    _id: string,
    name: string,
    email: string,
    phone: string,
    currency: string,
    accountNumber: string,
    token: string,
    rapydWalletId: string,
  } | null;
  login: (userData: Omit<AuthState["user"], "isLoggedIn">) => void;
  logout: () => void;
}

interface PaymentState {
  transactions: {
    id: string,
    type: string,
    amount: number,
    status: string,
    timestamp: number,
  }[];
  addTransaction: (
    transaction: Omit<
      (typeof PaymentState.prototype.transactions)[0],
      "id" | "timestamp"
    >
  ) => void;
}

const useAppStore = create()(
  persist(
    (set, get) => ({
      // Authentication State
      ...(() => {
        const initialAuthState: AuthState = {
          isLoggedIn: false,
          user: null,
          login: (userData) => {
            set({ isLoggedIn: true, user: userData });
          },
          logout: () => {
            set({ isLoggedIn: false, user: null });
          },
        };
        return initialAuthState;
      })(),

      // Payment State
      ...(() => {
        const initialPaymentState: PaymentState = {
          transactions: [],
          addTransaction: (transaction) => {
            const newTransaction = {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              ...transaction,
            };
            set({ transactions: [...get().transactions, newTransaction] });
          },
        };
        return initialPaymentState;
      })(),
    }),
    {
      name: "app", // Name of the storage (localStorage)
      storage: createJSONStorage(() => localStorage), // Use localStorage
    }
  )
);

export default useAppStore;
