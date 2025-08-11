import React, { useState, useEffect, useContext } from 'react';
import {
  FiShoppingBag,
  FiChevronLeft,
  FiChevronRight,
  FiPieChart,
} from 'react-icons/fi';
import {
  FaPills,
  FaExclamationTriangle,
  FaBoxes,
  FaChartLine,
} from 'react-icons/fa';
import { Pie, Bar } from 'react-chartjs-2';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import UserContext from '../../../context/UserContext';
import Chart from 'chart.js/auto';
import api from '../../../api/api';

const AnalyticsDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState(0);

  // Stats state
  const [stats, setStats] = useState({
    totalDrugs: 0,
    lowStockDrugs: 0,
    expiringSoon: 0,
    loading: true,
  });

  // Charts data state
  const [chartsData, setChartsData] = useState({
    stockLevels: null,
    categoryDistribution: null,
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
    const fetchData = async () => {
      try {
        // Fetch stats
        const statsResponse = await api.get('/analytics/stats');

        setStats({
          totalDrugs: statsResponse.data.stats.totalDrugs,
          ipdDrugs: statsResponse.data.stats.ipdDrugs || 0,
          opdDrugs: statsResponse.data.stats.opdDrugs || 0,
          outreachDrugs: statsResponse.data.stats.outreachDrugs || 0,
          loading: false,
        });

        // Fetch charts data
        const chartsResponse = await api.get('/analytics/charts');

        setChartsData({
          stockLevels: chartsResponse.data.charts.stockLevels,
          categoryDistribution: chartsResponse.data.charts.categoryDistribution,
          loading: false,
        });

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching data:', error);
        setStats((prev) => ({ ...prev, loading: false }));
        setChartsData((prev) => ({ ...prev, loading: false }));
      }
    };

    const fetchExpiringDrugs = async () => {
      try {
        setDrugsLoading(true);
        const response = await api.get('/drugs/expiring', {
          params: {
            days: pagination.daysThreshold,
            page: pagination.page,
            limit: pagination.limit,
          },
        });

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
      } finally {
        setDrugsLoading(false);
      }
    };

    if (user?.isAuthenticated) {
      fetchData();
      fetchExpiringDrugs();
    }
  }, [user, pagination.page, pagination.daysThreshold, pagination.limit]);

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

  // Prepare chart data
  const stockLevelsData = {
    labels: ['Low (<10)', 'Medium (10-50)', 'High (50+)'],
    datasets: [
      {
        data: [
          chartsData.stockLevels?.low || 0,
          chartsData.stockLevels?.medium || 0,
          chartsData.stockLevels?.high || 0,
        ],
        backgroundColor: [
          '#EF4444', // Red
          '#F59E0B', // Yellow
          '#10B981', // Green
        ],
        hoverBackgroundColor: ['#DC2626', '#D97706', '#059669'],
      },
    ],
  };

  const categoryDistributionData = {
    labels: ['IPD', 'OPD', 'OUTREACH', 'Uncategorized'],
    datasets: [
      {
        data: [
          chartsData.categoryDistribution?.ipd || 0,
          chartsData.categoryDistribution?.opd || 0,
          chartsData.categoryDistribution?.outreach || 0,
          chartsData.categoryDistribution?.uncategorized || 0,
        ],
        backgroundColor: [
          '#3B82F6', // Blue
          '#10B981', // Green
          '#F59E0B', // Yellow
          '#9CA3AF', // Gray
        ],
        hoverBackgroundColor: ['#2563EB', '#059669', '#D97706', '#6B7280'],
      },
    ],
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Dispensary Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Overview of your dispensary inventory and metrics
            </p>
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mt-2 md:mt-0">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          selectedIndex={activeTab}
          onSelect={(index) => setActiveTab(index)}
        >
          <TabList className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200">
            <Tab className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer">
              <div
                className={`flex items-center ${
                  activeTab === 0
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : ''
                }`}
              >
                <FiPieChart className="mr-1 sm:mr-2" /> Overview
              </div>
            </Tab>
            <Tab className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer">
              <div
                className={`flex items-center ${
                  activeTab === 1
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : ''
                }`}
              >
                <FaExclamationTriangle className="mr-1 sm:mr-2" /> Expiring Drugs
              </div>
            </Tab>
          </TabList>

          {/* Overview Tab */}
          <TabPanel>
            <div className="mt-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  icon={<FaPills className="w-6 h-6" />}
                  title="Total Drugs"
                  value={stats.totalDrugs}
                  loading={stats.loading}
                  color="blue"
                />
                <StatCard
                  icon={<FaBoxes className="w-6 h-6" />}
                  title="IPD Drugs"
                  value={stats.ipdDrugs}
                  loading={stats.loading}
                  color="green"
                />
                <StatCard
                  icon={<FaBoxes className="w-6 h-6" />}
                  title="OPD Drugs"
                  value={stats.opdDrugs}
                  loading={stats.loading}
                  color="orange"
                />
                <StatCard
                  icon={<FaBoxes className="w-6 h-6" />}
                  title="Outreach Drugs"
                  value={stats.outreachDrugs}
                  loading={stats.loading}
                  color="purple"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Stock Levels Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                    Stock Levels
                  </h3>
                  {chartsData.loading ? (
                    <div className="flex justify-center items-center h-48 sm:h-64">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="h-48 sm:h-64">
                      <Pie
                        data={stockLevelsData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  const label = context.label || '';
                                  const value = context.raw || 0;
                                  const total = context.dataset.data.reduce(
                                    (a, b) => a + b,
                                    0
                                  );
                                  const percentage =
                                    total > 0
                                      ? parseFloat(((value / total) * 100).toFixed(2))
                                      : 0;
                                  return `${label}: ${value} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Category Distribution Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                    Drug Category Distribution
                  </h3>
                  {chartsData.loading ? (
                    <div className="flex justify-center items-center h-48 sm:h-64">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="h-48 sm:h-64">
                      <Bar
                        data={categoryDistributionData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  return `${context.label}: ${context.raw}`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Expiring Drugs Tab */}
          <TabPanel>
            <div className="mt-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-3 sm:mb-0">
                      <FaExclamationTriangle className="text-yellow-500 mr-3 text-lg" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Drugs Expiring Within
                        <select
                          value={pagination.daysThreshold}
                          onChange={(e) =>
                            handleDaysChange(Number(e.target.value))
                          }
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
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{' '}
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
                              onClick={() =>
                                handlePageChange(pagination.page - 1)
                              }
                              disabled={pagination.page === 1}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() =>
                                handlePageChange(pagination.page + 1)
                              }
                              disabled={
                                pagination.page >= pagination.totalPages
                              }
                              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700">
                                Page{' '}
                                <span className="font-medium">
                                  {pagination.page}
                                </span>{' '}
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
                                  {
                                    length: Math.min(5, pagination.totalPages),
                                  },
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
                                        onClick={() =>
                                          handlePageChange(pageNum)
                                        }
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
                                  disabled={
                                    pagination.page >= pagination.totalPages
                                  }
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
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, loading, color = 'blue' }) => {
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
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
  };

  // Add fallback in case an invalid color is provided
  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div
      className={`${selectedColor.bg} p-5 rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md`}
    >
      <div className="flex items-start">
        <div className={`${selectedColor.iconBg} p-3 rounded-lg mr-4`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex items-end justify-between">
              <h3 className={`text-2xl font-bold ${selectedColor.text}`}>
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
