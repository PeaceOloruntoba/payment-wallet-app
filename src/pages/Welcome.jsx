import React from "react";

const WelcomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Welcome to Our Payment Wallet</h1>
      <p className="text-lg text-gray-600 mb-8">
        Manage your finances with ease.
      </p>
      <div className="flex gap-4">
        <a
          href="/register"
          className={
            "px-6 py-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          }
        >
          Register
        </a>
        <a
          href="/login"
          className={
            "px-6 py-3 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
          }
        >
          Login
        </a>
      </div>
    </div>
  );
};

export default WelcomePage;
