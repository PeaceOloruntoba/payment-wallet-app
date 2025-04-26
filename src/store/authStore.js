import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      login: (userData) => {
        set({ isLoggedIn: true, user: userData });
      },
      logout: () => {
        set({ isLoggedIn: false, user: null });
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;
