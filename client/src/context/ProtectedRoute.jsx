import React, { useContext } from 'react';
import UserContext from './UserContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!roles.map((r) => r.toLowerCase()).includes(user?.role?.toLowerCase())) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;
