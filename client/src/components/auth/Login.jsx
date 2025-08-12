import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserContext from '../../context/UserContext';
import backgroundImage from '../../assets/logo.jpeg';
import api from '../../api/api';

const Login = () => {
  const navigate = useNavigate();
  const { loginInfo, setLoginInfo, login, user, loading } =
    useContext(UserContext);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  // Redirect if authenticated
  useEffect(() => {
    if (!loading && user?.isAuthenticated) {
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
  }, [user, loading, navigate]);

  // Handle rate limit countdown
  useEffect(() => {
    if (!retryAfter) return;

    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRateLimitExceeded(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAttemptsRemaining(null);
    setRateLimitExceeded(false);
    setRetryAfter(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', loginInfo);

      if (response.data.jwtToken) {
        // Successful login → clear warnings/errors
        setError('');
        setAttemptsRemaining(null);
        setRetryAfter(null);
        setRateLimitExceeded(false);

        login({
          jwtToken: response.data.jwtToken,
          name: response.data.user?.name || '',
          role: response.data.user?.role || '',
          email: response.data.user?.email || loginInfo.email,
          id: response.data.user?.id || '',
          isAuthenticated: true,
        });
      }
    } catch (err) {
      if (err.response?.data) {
        const { errorType, message, attemptsRemaining, retryAfter } =
          err.response.data;

        setError(message || 'Login failed');

        if (typeof attemptsRemaining === 'number') {
          setAttemptsRemaining(attemptsRemaining);
        }

        if (errorType === 'rate_limit_exceeded') {
          setRetryAfter(retryAfter || 300); // fallback 5 mins
          setRateLimitExceeded(true);
        }
      } else {
        setError('Network error, please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          <div className="mb-6 text-center">
            <img
              src={backgroundImage}
              alt="logo"
              className="w-24 h-24 mx-auto mb-4 sm:w-32 sm:h-32"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Login
            </h1>
          </div>

          {/* Error Display */}
          {error && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                rateLimitExceeded
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              <p className="font-medium text-center">{error}</p>

              {retryAfter && (
                <div className="mt-3">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(retryAfter / 300) * 100}%`,
                      }}
                    ></div>
                  </div>

                  {/* Countdown text */}
                  <p className="text-xs text-gray-600 mt-2 text-center break-words">
                    Try again in{' '}
                    <span className="font-semibold">{retryAfter}</span> seconds
                  </p>
                </div>
              )}
            </div>
          )}

          {attemptsRemaining !== null && attemptsRemaining > 0 && (
            <p className="text-sm text-yellow-600 text-center mb-4">
              {attemptsRemaining} attempts remaining.
            </p>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 sr-only"
              >
                Email
              </label>
              <input
                onChange={handleChange}
                type="email"
                name="email"
                required
                disabled={rateLimitExceeded}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Email Address"
                value={loginInfo.email}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 sr-only"
              >
                Password
              </label>
              <input
                onChange={handleChange}
                type="password"
                name="password"
                required
                minLength="6"
                disabled={rateLimitExceeded}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Password"
                value={loginInfo.password}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading || rateLimitExceeded}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
                  isLoading || rateLimitExceeded
                    ? 'opacity-50 cursor-wait'
                    : 'hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Log In'
                )}
              </button>
            </div>
            <div className="text-center text-sm text-gray-600 pt-4">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
