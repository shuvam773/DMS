import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AddDrugModal from './AddDrugModal';
import EditDrugModal from './EditDrugModal';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { FaPills, FaExclamationTriangle } from 'react-icons/fa';

const DrugsTable = () => {
  const [drugs, setDrugs] = useState([]);
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDrug, setCurrentDrug] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    expiringSoon: false,
    lowStock: false,
    priceRange: [0, 1000],
    category: '',
    manufacturer: '',
    addedBy: ''
  });

  const isExpiringSoon = (expDate) => {
    const expirationDate = new Date(expDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expirationDate <= threeMonthsFromNow;
  };

  useEffect(() => {
    fetchDrugs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [drugs, searchTerm, filters]);

  const fetchDrugs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/drugs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data.drugs)) {
        setDrugs(response.data.drugs);
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Received invalid data format from server');
        setDrugs([]);
      }
    } catch (error) {
      console.error('Error fetching drugs:', error);
      toast.error('Failed to load drugs');
      setDrugs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...drugs];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(drug => 
        drug.name.toLowerCase().includes(term) ||
        drug.batch_no?.toLowerCase().includes(term) ||
        drug.description?.toLowerCase().includes(term) ||
        drug.manufacturer_name?.toLowerCase().includes(term) ||
        drug.creator_name?.toLowerCase().includes(term)
      );
    }

    // Apply additional filters
    if (filters.expiringSoon) {
      result = result.filter(drug => isExpiringSoon(drug.exp_date));
    }

    if (filters.lowStock) {
      result = result.filter(drug => drug.stock <= 10);
    }

    if (filters.priceRange) {
      result = result.filter(drug => 
        drug.price >= filters.priceRange[0] && 
        drug.price <= filters.priceRange[1]
      );
    }

    if (filters.category) {
      result = result.filter(drug => drug.category === filters.category);
    }

    if (filters.manufacturer) {
      result = result.filter(drug => 
        drug.manufacturer_name?.toLowerCase().includes(filters.manufacturer.toLowerCase())
      );
    }

    if (filters.addedBy) {
      result = result.filter(drug => 
        drug.creator_name?.toLowerCase().includes(filters.addedBy.toLowerCase())
      );
    }

    setFilteredDrugs(result);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePriceRangeChange = (index, value) => {
    const newRange = [...filters.priceRange];
    newRange[index] = parseFloat(value) || 0;
    setFilters(prev => ({
      ...prev,
      priceRange: newRange
    }));
  };

  const resetFilters = () => {
    setFilters({
      expiringSoon: false,
      lowStock: false,
      priceRange: [0, 1000],
      category: '',
      addedBy: ''
    });
    setSearchTerm('');
  };

  const handleDrugAdded = (newDrug) => {
    const updatedDrugs = [
      ...drugs,
      {
        ...newDrug,
        price: typeof newDrug.price === 'string' ? parseFloat(newDrug.price) : newDrug.price,
      },
    ];
    setDrugs(updatedDrugs);
  };

  const handleDrugUpdated = (updatedDrug) => {
    const updatedDrugs = drugs.map((drug) =>
      drug.id === updatedDrug.id
        ? {
            ...updatedDrug,
            price: typeof updatedDrug.price === 'string' ? parseFloat(updatedDrug.price) : updatedDrug.price,
          }
        : drug
    );
    setDrugs(updatedDrugs);
  };

  const handleEdit = (drug) => {
    setCurrentDrug(drug);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this drug?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/drugs/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Drug deleted successfully');
      setDrugs((prev) => prev.filter((drug) => drug.id !== id));
    } catch (error) {
      console.error('Error deleting drug:', error);
      toast.error(error.response?.data?.error || 'Failed to delete drug');
    }
  };

  // Get unique values for select filters
  const uniqueCategories = [...new Set(drugs.map(drug => drug.category).filter(Boolean))];
  const uniqueCreators = [...new Set(drugs.map(drug => drug.creator_name).filter(Boolean))];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaPills className="mr-2 text-blue-600" />
            Drugs Inventory
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-2" />
            Add New Drug
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search drugs by name, batch, manufacturer, or description..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                <FiFilter className="mr-2" />
                Filters
              </button>
              {(filters.expiringSoon || filters.lowStock || filters.category || 
               filters.manufacturer || filters.addedBy ||
               filters.priceRange[0] !== 0 || filters.priceRange[1] !== 1000) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  <FiX className="mr-2" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="expiringSoon"
                    name="expiringSoon"
                    checked={filters.expiringSoon}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="expiringSoon" className="ml-2 text-sm text-gray-700">
                    Expiring Soon (≤ 3 months)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lowStock"
                    name="lowStock"
                    checked={filters.lowStock}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="lowStock" className="ml-2 text-sm text-gray-700">
                    Low Stock (≤ 10)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.priceRange[0]}
                      onChange={(e) => handlePriceRangeChange(0, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      placeholder="Min"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={filters.priceRange[1]}
                      onChange={(e) => handlePriceRangeChange(1, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="addedBy" className="block text-sm font-medium text-gray-700 mb-1">
                    Added By
                  </label>
                  <select
                    id="addedBy"
                    name="addedBy"
                    value={filters.addedBy}
                    onChange={handleFilterChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                  >
                    <option value="">All Users</option>
                    {uniqueCreators.map(creator => (
                      <option key={creator} value={creator}>{creator}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Batch No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">MFG Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">EXP Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Added by</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrugs.length > 0 ? (
                    filteredDrugs.map((drug) => {
                      const expiringSoon = isExpiringSoon(drug.exp_date);
                      return (
                        <tr key={drug.id} className="hover:bg-gray-50 transition-colors">
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${expiringSoon ? 'text-red-600' : 'text-gray-900'}`}>
                            <div className="flex items-center">
                              {expiringSoon && <FaExclamationTriangle className="mr-2 text-red-500" />}
                              {drug.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drug.batch_no}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{drug.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(drug.mfg_date).toLocaleDateString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${expiringSoon ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                            {new Date(drug.exp_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                            ₹{typeof drug.price === 'number' ? drug.price.toFixed(2) : parseFloat(drug.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${drug.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {drug.stock} in stock
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              drug.category === 'IPD' ? 'bg-blue-100 text-blue-800' :
                              drug.category === 'OPD' ? 'bg-purple-100 text-purple-800' :
                              drug.category === 'OUTREACH' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {drug.category || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {drug.creator_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-4">
                              <button 
                                onClick={() => handleEdit(drug)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Edit"
                              >
                                <FiEdit2 className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(drug.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                        No drugs found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AddDrugModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onDrugAdded={handleDrugAdded}
        />

        {currentDrug && (
          <EditDrugModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            drug={currentDrug}
            onDrugUpdated={handleDrugUpdated}
          />
        )}
      </div>
    </div>
  );
};

export default DrugsTable;