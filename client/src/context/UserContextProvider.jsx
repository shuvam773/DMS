import React, { useEffect, useState } from 'react';
import UserContext from './UserContext';
import { jwtDecode } from 'jwt-decode';

const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          logout();
          return;
        }

        const userData = {
          name: localStorage.getItem('loggedInUser') || decoded.name || '',
          role: localStorage.getItem('userRole') || decoded.role || '',
          email: localStorage.getItem('userEmail') || decoded.email || '',
          id: localStorage.getItem('userId') || decoded.userId || '',
          created_by:
            localStorage.getItem('userCreatedBy') || decoded.created_by || null,
          isAuthenticated: true,
          jwtToken: token,
        };
        setUser(userData);
      } catch (error) {
        console.error('Token verification failed:', error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('token', userData.jwtToken);
    localStorage.setItem('loggedInUser', userData.name);
    localStorage.setItem('userRole', userData.role.toLowerCase());
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('userCreatedBy', userData.created_by);

    setUser({
      name: userData.name,
      role: userData.role.toLowerCase(),
      email: userData.email,
      id: userData.id,
      created_by: userData.created_by,
      isAuthenticated: true,
      jwtToken: userData.jwtToken,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userCreatedBy');
    setUser(null);
    window.location.href = '/login';
  };

  const [signupInfo, setSignupInfo] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    license_number: '',
  });

  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: '',
  });

  return (
    <UserContext.Provider
      value={{
        signupInfo,
        setSignupInfo,
        loginInfo,
        setLoginInfo,
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContextProvider;
