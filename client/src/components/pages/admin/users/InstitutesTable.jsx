import React, { useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import UserContext from '../../../../context/UserContext';
import AddInstitute from './AddInstitute';
import EditInstitute from './EditInstitute';
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
} from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';

const InstituteTable = () => {
  const { user } = useContext(UserContext);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentInstitute, setCurrentInstitute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchInstitutes = async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/users`, {
        params: {
          page,
          limit,
          search,
        },
        headers: {
          Authorization: `Bearer ${user.jwtToken}`,
        },
      });

      setInstitutes(response.data.institutes);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to fetch institutes'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAuthenticated) {
      fetchInstitutes();
    }
  }, [user]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this institute? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:8080/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${user.jwtToken}`,
        },
      });

      toast.success('Institute deleted successfully');
      fetchInstitutes(pagination.page, pagination.limit, searchTerm);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete institute'
      );
    }
  };

  const handlePageChange = (newPage) => {
    fetchInstitutes(newPage, pagination.limit, searchTerm);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInstitutes(1, pagination.limit, searchTerm);
  };

  const handleAddSuccess = () => {
    fetchInstitutes(pagination.page, pagination.limit, searchTerm);
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    fetchInstitutes(pagination.page, pagination.limit, searchTerm);
    setIsEditModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                User Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage all registered users
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, email or license..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 block w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </form>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <FiPlus className="mr-2" />
                  Add New User
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
              <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          License
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        {user?.role === 'admin' && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {institutes.length > 0 ? (
                        institutes.map((institute) => (
                          <tr
                            key={institute.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {institute.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {institute.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                {institute.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                              {institute.city || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {institute.license_number || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${
                                  institute.status === 'Active'
                                    ? 'bg-green-100 text-green-800'
                                    : institute.status === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {institute.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(
                                institute.created_at
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            {user?.role === 'admin' && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-3">
                                  <button
                                    onClick={() => {
                                      setCurrentInstitute(institute);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                    title="Edit"
                                  >
                                    <FiEdit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(institute.id)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={user?.role === 'admin' ? 8 : 7}
                            className="px-6 py-8 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <FiSearch className="h-12 w-12 text-gray-400 mb-2" />
                              <h3 className="text-lg font-medium text-gray-900">
                                No institutes found
                              </h3>
                              <p className="text-sm text-gray-500">
                                {searchTerm
                                  ? 'Try adjusting your search'
                                  : 'Add a new institute to get started'}
                              </p>
                              {!searchTerm && user?.role === 'admin' && (
                                <button
                                  onClick={() => setIsAddModalOpen(true)}
                                  className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  <FiPlus className="mr-2" />
                                  Add New Institute
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">
                            {(pagination.page - 1) * pagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(
                              pagination.page * pagination.limit,
                              pagination.total
                            )}
                          </span>{' '}
                          of{' '}
                          <span className="font-medium">
                            {pagination.total}
                          </span>{' '}
                          results
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
                            disabled={pagination.page <= 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page <= 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Previous</span>
                            <FiChevronLeft
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </button>
                          {Array.from(
                            { length: pagination.totalPages },
                            (_, i) => i + 1
                          ).map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              handlePageChange(pagination.page + 1)
                            }
                            disabled={pagination.page >= pagination.totalPages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                              pagination.page >= pagination.totalPages
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
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
                )}
              </div>
            </>
          )}

          {/* Modals */}
          <AddInstitute
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddSuccess}
          />

          {currentInstitute && (
            <EditInstitute
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSave={handleEditSuccess}
              institute={currentInstitute}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InstituteTable;
