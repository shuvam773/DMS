import React, { useEffect, useState } from 'react';
import UserContext from './UserContext';
import { jwtDecode } from 'jwt-decode';

const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage if token exists
  // Verify token and initialize user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          // Token expired
          logout();
          return;
        }

        const userData = {
          name: localStorage.getItem('loggedInUser') || decoded.name || '',
          role: localStorage.getItem('userRole') || decoded.role || '',
          email: localStorage.getItem('userEmail') || decoded.email || '',
          id: localStorage.getItem('userId') || decoded.id || decoded.id || '',
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
    localStorage.setItem('userId', userData.id || userData._id);
    setUser({
      name: userData.name,
      role: userData.role.toLowerCase(), // Ensure lowercase
      email: userData.email,
      id: userData.id,
      isAuthenticated: true,
      jwtToken: userData.jwtToken,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setUser(null);
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
