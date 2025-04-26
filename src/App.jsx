import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import Layout from "./layouts/Layout";

// Define your routes
const routes = [
  {
    path: "/",
    element: lazy(() => import("./pages/Welcome")), // Welcome page
    title: "Welcome",
  },
  {
    path: "/register",
    element: lazy(() => import("./pages/Register")), // Register page
    title: "Register",
  },
  {
    path: "/login",
    element: lazy(() => import("./pages/Login")), // Login page
    title: "Login",
  },
  {
    path: "/dashboard",
    element: lazy(() => import("./pages/Dashboard")), // Dashboard
    title: "Dashboard",
    protected: true, // Example of a protected route
  },
  {
    path: "/wallet/virtual-card",
    element: lazy(() => import("./pages/VirtualCard")),
    title: "Virtual Card",
    protected: true,
  },
  {
    path: "/wallet/transfer",
    element: lazy(() => import("./pages/Transfer")),
    title: "Transfer",
    protected: true,
  },
  {
    path: "/wallet/withdraw",
    element: lazy(() => import("./pages/Withdraw")),
    title: "Withdraw",
    protected: true,
  },
  {
    path: "/wallet/deposit",
    element: lazy(() => import("./pages/Deposit")),
    title: "Deposit",
    protected: true,
  },
  {
    path: "*",
    element: lazy(() => import("./pages/NotFound")), // Not Found
    title: "Not Found",
  },
];

// Main App Component
const App = () => {
  return (
    <>
      <Router>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="animate-pulse bg-gray-200 rounded-md w-[400px] h-[300px]"></div>
            </div>
          }
        >
          <Routes>
            {routes.map((route) => {
              const RouteComponent = route.element;
              if (route.protected) {
                return (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <Layout>
                        <RouteComponent />
                      </Layout>
                    }
                  />
                );
              }
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<RouteComponent />}
                />
              );
            })}
          </Routes>
        </Suspense>
      </Router>
      <Toaster richColors position="top-right"  />
    </>
  );
};

export default App;
