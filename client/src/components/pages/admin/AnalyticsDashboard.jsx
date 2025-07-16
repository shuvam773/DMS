import React, { useState, useEffect, useContext } from 'react';
import {
  FiUsers,
  FiShoppingBag,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import {
  FaRegHospital,
  FaPills,
  FaExclamationTriangle,
  FaChartLine,
} from 'react-icons/fa';
import axios from 'axios';
import UserContext from '../../../context/UserContext';

const AnalyticsDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState(null);
  const { user } = useContext(UserContext);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInstitutes: 0,
    totalPharmacies: 0,
    totalDrugs: 0,
    loading: true,
  });

  const [expiringDrugs, setExpiringDrugs] = useState([]);
  const [drugsLoading, setDrugsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    daysThreshold: 90,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(
          'http://localhost:8080/api/analytics/stats',
          {
            headers: { Authorization: `Bearer ${user.jwtToken}` },
          }
        );
        setStats({
          totalUsers: response.data.stats.totalUsers,
          totalInstitutes: response.data.stats.totalInstitutes,
          totalPharmacies: response.data.stats.totalPharmacies,
          totalDrugs: response.data.stats.totalDrugs,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    const fetchExpiringDrugs = async () => {
      try {
        setDrugsLoading(true);
        const response = await axios.get(
          'http://localhost:8080/api/drugs/expiring',
          {
            headers: { Authorization: `Bearer ${user.jwtToken}` },
            params: {
              days: pagination.daysThreshold,
              page: pagination.page,
              limit: pagination.limit,
            },
          }
        );

        setExpiringDrugs(response.data.drugs);
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
      } catch (error) {
        console.error(
          'Failed to fetch drugs:',
          error.response?.data || error.message
        );
        // Optionally set some error state to show to the user
      } finally {
        setDrugsLoading(false);
      }
    };

    if (user?.isAuthenticated) {
      fetchStats();
      fetchExpiringDrugs();
    }
  }, [
    user,
    pagination.page,
    pagination.daysThreshold,
    lastUpdated,
    pagination.limit,
  ]);

  const handleDaysChange = (days) => {
    setPagination((prev) => ({
      ...prev,
      daysThreshold: days,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Overview of your system metrics and statistics
            </p>
          </div>
          {lastUpdated && (
            <div className="text-sm text-gray-500 mt-2 md:mt-0">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FiUsers className="w-6 h-6" />}
            title="Total Users"
            value={stats.totalUsers}
            loading={stats.loading}
            color="blue"
          />
          <StatCard
            icon={<FaRegHospital className="w-6 h-6" />}
            title="Institutes"
            value={stats.totalInstitutes}
            loading={stats.loading}
            color="green"
          />
          <StatCard
            icon={<FiShoppingBag className="w-6 h-6" />}
            title="Pharmacies"
            value={stats.totalPharmacies}
            loading={stats.loading}
            color="purple"
          />
          <StatCard
            icon={<FaPills className="w-6 h-6" />}
            title="Total Drugs"
            value={stats.totalDrugs}
            loading={stats.loading}
            color="orange"
          />
        </div>

        {/* Expiring Drugs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-3 sm:mb-0">
                <FaExclamationTriangle className="text-yellow-500 mr-3 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Drugs Expiring Within
                  <select
                    value={pagination.daysThreshold}
                    onChange={(e) => handleDaysChange(Number(e.target.value))}
                    className="ml-3 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </h3>
              </div>
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} drugs
              </div>
            </div>
          </div>

          {drugsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Drug Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Left
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expiringDrugs.length > 0 ? (
                      expiringDrugs.map((drug) => (
                        <tr
                          key={`${drug.id}-${drug.batch_no}`}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {drug.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {drug.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {drug.batch_no || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                drug.stock < 10
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {drug.stock} units
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(drug.exp_date).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                drug.days_until_expiry < 7
                                  ? 'bg-red-100 text-red-800'
                                  : drug.days_until_expiry < 30
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {drug.days_until_expiry} days
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {typeof drug.price === 'number'
                              ? drug.price.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : drug.price}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <FaExclamationTriangle className="h-10 w-10 mb-2 text-yellow-400" />
                            <h4 className="text-lg font-medium">
                              No expiring drugs found
                            </h4>
                            <p className="text-sm">
                              Try adjusting your days threshold
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Page{' '}
                          <span className="font-medium">{pagination.page}</span>{' '}
                          of{' '}
                          <span className="font-medium">
                            {pagination.totalPages}
                          </span>
                        </p>
                      </div>
                      <div>
                        <nav
                          className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                          aria-label="Pagination"
                        >
                          <button
                            onClick={() =>
                              handlePageChange(pagination.page - 1)
                            }
                            disabled={pagination.page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <FiChevronLeft
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </button>
                          {Array.from(
                            { length: Math.min(5, pagination.totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (pagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (pagination.page <= 3) {
                                pageNum = i + 1;
                              } else if (
                                pagination.page >=
                                pagination.totalPages - 2
                              ) {
                                pageNum = pagination.totalPages - 4 + i;
                              } else {
                                pageNum = pagination.page - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    pagination.page === pageNum
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                          <button
                            onClick={() =>
                              handlePageChange(pagination.page + 1)
                            }
                            disabled={pagination.page >= pagination.totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <FiChevronRight
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, loading, color }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
  };

  return (
    <div
      className={`${colorClasses[color].bg} p-5 rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md`}
    >
      <div className="flex items-start">
        <div className={`${colorClasses[color].iconBg} p-3 rounded-lg mr-4`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex items-end justify-between">
              <h3 className={`text-2xl font-bold ${colorClasses[color].text}`}>
                {value}
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
