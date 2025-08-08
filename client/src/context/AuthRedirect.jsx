import React, { useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserContext from './UserContext';

const AuthRedirect = () => {
  const { user, loading } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if not loading and user is authenticated
    if (!loading && user?.isAuthenticated) {
      const currentPath = location.pathname;
      
      // If user is on login/register page but is authenticated, redirect to appropriate dashboard
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        switch (user.role.toLowerCase()) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'institute':
            navigate('/institute/dashboard');
            break;
          case 'pharmacy':
            navigate('/pharmacy/dashboard');
            break;
          default:
            navigate('/unauthorized');
        }
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return null; // This component doesn't render anything
};

export default AuthRedirect;
