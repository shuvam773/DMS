import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react"; 

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <Lock className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Unauthorized Access
        </h1>
        <p className="text-gray-600 mb-6">
          Oops! You don’t have permission to view this page.  
          Please log in with the correct account or go back to safety.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
          >
            Go Home
          </Link>
          <Link
            to="/login"
            className="px-6 py-2 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
