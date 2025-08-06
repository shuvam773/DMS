import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserContext from '../../context/UserContext';
import backgroundImage from '../../assets/logo.jpeg';
import api from '../../api/api';

const Login = () => {
  const navigate = useNavigate();
  const { loginInfo, setLoginInfo, login } = useContext(UserContext);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // validation
    if (!loginInfo.email?.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(loginInfo.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!loginInfo.password) {
      setError('Password is required');
      return;
    }

    if (loginInfo.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', loginInfo); // Using the api instance

      if (response.data.jwtToken) {
        // Store token and user info
        login({
          jwtToken: response.data.jwtToken,
          name: response.data.name || '',
          role: response.data.role || '',
          email: response.data.email || loginInfo.email,
          created_by: response.data.created_by || '',
          id: response.data.id || response.data._id,
          isAuthenticated: true,
        });

        // Navigate according to role
        switch (response.data.role.toLowerCase()) {
          case 'admin':
            navigate('/admin');
            break;
          case 'institute':
            navigate('/institute');
            break;
          case 'pharmacy':
            navigate('/pharmacy');
            break;
          default:
            console.log('Unknown role:', response.data.role);
            navigate('/unauthorized');
        }
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <div>
                <img
                  src={backgroundImage}
                  alt="logo"
                  className="w-32 h-32 mx-auto"
                />
              </div>
              <h1 className="text-center text-3xl font-extrabold text-gray-900">
                Login
              </h1>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  onChange={handleChange}
                  type="email"
                  name="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your Email"
                  value={loginInfo.email}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  onChange={handleChange}
                  type="password"
                  name="password"
                  required
                  minLength="6"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your Password"
                  value={loginInfo.password}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
                    isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Logging in...' : 'Log in'}
                </button>
              </div>
              <div className="text-center text-sm text-gray-600">
                <span>
                  Don't have Account?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    Register
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
