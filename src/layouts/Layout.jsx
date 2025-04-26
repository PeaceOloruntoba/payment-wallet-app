import React from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  CreditCard,
  ArrowRightLeft,
  ArrowLeftRight,
  PlusCircle,
} from "lucide-react"; // Install lucide-react

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar (Navigation) */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h1 className="text-2xl font-bold mb-4">Payment Wallet</h1>
        <nav className="space-y-2">
          <a
            href="/dashboard"
            className={cn(
              "block px-4 py-2 rounded-md transition-colors hover:bg-gray-100 w-full text-left",
              "flex items-center gap-2"
            )}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
          <a
            href="/wallet/virtual-card"
            className={cn(
              "block px-4 py-2 rounded-md transition-colors hover:bg-gray-100 w-full text-left",
              "flex items-center gap-2"
            )}
          >
            <CreditCard className="w-4 h-4" />
            Virtual Card
          </a>
          <a
            href="/wallet/transfer"
            className={cn(
              "block px-4 py-2 rounded-md transition-colors hover:bg-gray-100 w-full text-left",
              "flex items-center gap-2"
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </a>
          <a
            href="/wallet/withdraw"
            className={cn(
              "block px-4 py-2 rounded-md transition-colors hover:bg-gray-100 w-full text-left",
              "flex items-center gap-2"
            )}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Withdraw
          </a>
          <a
            href="/wallet/deposit"
            className={cn(
              "block px-4 py-2 rounded-md transition-colors hover:bg-gray-100 w-full text-left",
              "flex items-center gap-2"
            )}
          >
            <PlusCircle className="w-4 h-4" />
            Deposit
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
