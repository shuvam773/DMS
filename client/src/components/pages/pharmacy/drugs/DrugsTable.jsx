import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiX,
  FiSave,
  FiCheck,
  FiXCircle,
  FiUpload,
} from 'react-icons/fi';
import { FaPills, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../../../api/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DrugsTable = () => {
  const [drugs, setDrugs] = useState([]);
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    expiringSoon: false,
    lowStock: false,
    priceRange: ['', ''],
    category: '',
    drugType: '',
    expDateRange: [null, null],
  });
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDrug, setNewDrug] = useState({
    name: '',
    description: '',
    stock: 0,
    mfg_date: '',
    exp_date: '',
    price: 0,
    batch_no: '',
    drug_type: '',
    category: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // State for drug types and names from database
  const [drugTypes, setDrugTypes] = useState([]);
  const [availableDrugNames, setAvailableDrugNames] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  // Fetch drug types from database
  const fetchDrugTypes = async () => {
    try {
      const response = await api.get('/drug-types-names/drug-types');
      if (response.data.status) {
        setDrugTypes(response.data.drugTypes);
      }
    } catch (error) {
      console.error('Error fetching drug types:', error);
      toast.error('Failed to load drug types');
    }
  };

  // Fetch drug names by type from database
  const fetchDrugNamesByType = async (typeId) => {
    try {
      const response = await api.get(`/drug-types-names/drug-names/${typeId}`);
      if (response.data.status) {
        setAvailableDrugNames(response.data.drugNames.map((item) => item.name));
      } else {
        setAvailableDrugNames([]);
      }
    } catch (error) {
      console.error('Error fetching drug names:', error);
      setAvailableDrugNames([]);
    }
  };

  const fetchDrugs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/drugs');

      if (response.data && Array.isArray(response.data.drugs)) {
        setDrugs(response.data.drugs);
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Received invalid data format from server');
        setDrugs([]);
      }
    } catch (error) {
      console.error('Error fetching drugs:', error);
      toast.error(error.response?.data?.message || 'Failed to load drugs');
      setDrugs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugTypes();
    fetchDrugs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [drugs, searchTerm, filters]);

  const isExpiringSoon = (expDate) => {
    if (!expDate) return false;
    const expirationDate = new Date(expDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expirationDate <= threeMonthsFromNow;
  };

  const applyFilters = () => {
    let result = [...drugs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (drug) =>
          drug.name.toLowerCase().includes(term) ||
          drug.batch_no?.toLowerCase().includes(term) ||
          drug.description?.toLowerCase().includes(term) ||
          drug.drug_type?.toLowerCase().includes(term) ||
          drug.category?.toLowerCase().includes(term)
      );
    }

    if (filters.expiringSoon) {
      result = result.filter((drug) => isExpiringSoon(drug.exp_date));
    }

    if (filters.lowStock) {
      result = result.filter((drug) => drug.stock <= 10);
    }

    if (filters.priceRange[0] || filters.priceRange[1]) {
      const minPrice = filters.priceRange[0]
        ? parseFloat(filters.priceRange[0])
        : 0;
      const maxPrice = filters.priceRange[1]
        ? parseFloat(filters.priceRange[1])
        : Infinity;
      result = result.filter(
        (drug) => drug.price >= minPrice && drug.price <= maxPrice
      );
    }

    if (filters.category) {
      result = result.filter((drug) => drug.category === filters.category);
    }

    if (filters.drugType) {
      result = result.filter((drug) => drug.drug_type === filters.drugType);
    }

    if (filters.expDateRange[0] || filters.expDateRange[1]) {
      result = result.filter((drug) => {
        if (!drug.exp_date) return false;
        const expDate = new Date(drug.exp_date);
        const startDate = filters.expDateRange[0]
          ? new Date(filters.expDateRange[0])
          : null;
        const endDate = filters.expDateRange[1]
          ? new Date(filters.expDateRange[1])
          : null;

        if (startDate && expDate < startDate) return false;
        if (endDate && expDate > endDate) return false;
        return true;
      });
    }

    // Update pagination
    const total = result.length;
    const totalPages = Math.ceil(total / pagination.limit);
    setPagination((prev) => ({
      ...prev,
      total,
      totalPages,
      page: prev.page > totalPages ? 1 : prev.page,
    }));

    setFilteredDrugs(result);
  };

  // Get paginated drugs
  const getPaginatedDrugs = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredDrugs.slice(startIndex, endIndex);
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePriceRangeChange = (index, value) => {
    const newRange = [...filters.priceRange];
    newRange[index] = value;
    setFilters((prev) => ({
      ...prev,
      priceRange: newRange,
    }));
  };

  const resetFilters = () => {
    setFilters({
      expiringSoon: false,
      lowStock: false,
      priceRange: ['', ''],
      category: '',
      drugType: '',
      expDateRange: [null, null],
    });
    setSearchTerm('');
  };

  const handleDrugTypeChange = (e, isEditing = false, drugId = null) => {
    const { value } = e.target;
    const selectedType = drugTypes.find((type) => type.type_name === value);

    if (isEditing) {
      handleDrugChange(drugId, e);
    } else {
      handleAddChange(e);
    }

    if (selectedType) {
      fetchDrugNamesByType(selectedType.id);
    } else {
      setAvailableDrugNames([]);
    }

    if (isEditing) {
      handleDrugChange(drugId, { target: { name: 'name', value: '' } });
    } else {
      setNewDrug((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleEdit = (drug) => {
    setEditingId(drug.id);
    const selectedType = drugTypes.find(
      (type) => type.type_name === drug.drug_type
    );
    if (selectedType) {
      fetchDrugNamesByType(selectedType.id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAvailableDrugNames([]);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setNewDrug({
      name: '',
      description: '',
      stock: 0,
      mfg_date: '',
      exp_date: '',
      price: 0,
      batch_no: '',
      drug_type: '',
      category: '',
    });
    setAvailableDrugNames([]);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setAvailableDrugNames([]);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewDrug((prev) => ({
      ...prev,
      [name]: name === 'stock' || name === 'price' ? Number(value) : value,
    }));
  };

  const handleSaveNewDrug = async () => {
    try {
      if (new Date(newDrug.mfg_date) >= new Date(newDrug.exp_date)) {
        toast.error('Manufacturing date must be before expiration date');
        return;
      }

      if (!newDrug.batch_no || !newDrug.drug_type || !newDrug.name) {
        toast.error('Batch number, drug type and name are required');
        return;
      }

      setIsLoading(true);
      await api.post('/drugs', newDrug);

      toast.success('Drug added successfully!');
      fetchDrugs();
      setIsAdding(false);
      setAvailableDrugNames([]);
    } catch (error) {
      console.error('Error adding drug:', error);
      toast.error(error.response?.data?.message || 'Failed to add drug');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    try {
      const drugToUpdate = drugs.find((drug) => drug.id === id);
      if (!drugToUpdate) return;

      if (
        !drugToUpdate.batch_no ||
        !drugToUpdate.drug_type ||
        !drugToUpdate.name
      ) {
        toast.error('Batch number, drug type and name are required');
        return;
      }

      setIsLoading(true);
      await api.put(`/drugs/${id}`, {
        name: drugToUpdate.name,
        description: drugToUpdate.description,
        stock: drugToUpdate.stock,
        price: drugToUpdate.price,
        batch_no: drugToUpdate.batch_no,
        drug_type: drugToUpdate.drug_type,
        category: drugToUpdate.category,
      });

      toast.success('Drug updated successfully!');
      setEditingId(null);
      setAvailableDrugNames([]);
      fetchDrugs();
    } catch (error) {
      console.error('Error updating drug:', error);
      toast.error(error.response?.data?.message || 'Failed to update drug');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportProgress(null);
    setImportErrors([]);
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      setImportProgress({ status: 'Uploading...', percent: 0 });

      const response = await api.post('/drugs/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setImportProgress({
            status: 'Uploading...',
            percent: percentCompleted,
          });
        },
      });

      setImportProgress({
        status: 'Processing...',
        percent: 100,
      });

      if (response.data.errors && response.data.errors.length > 0) {
        setImportErrors(response.data.errors);
        toast.warning(
          `Import completed with ${response.data.successCount} successes and ${response.data.errors.length} errors`
        );
      } else {
        toast.success(
          `Successfully imported ${response.data.successCount} drugs`
        );
        fetchDrugs(); // Refresh the drug list
        setShowImportModal(false);
      }
    } catch (error) {
      console.error('Error importing drugs:', error);
      toast.error(error.response?.data?.message || 'Failed to import drugs');
    } finally {
      setImportProgress(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this drug?')) {
      return;
    }

    try {
      await api.delete(`/drugs/${id}`);
      toast.success('Drug deleted successfully');
      fetchDrugs();
    } catch (error) {
      console.error('Error deleting drug:', error);
      toast.error(error.response?.data?.message || 'Failed to delete drug');
    }
  };

  const handleDrugChange = (id, e) => {
    const { name, value } = e.target;
    setDrugs((prev) =>
      prev.map((drug) =>
        drug.id === id
          ? {
              ...drug,
              [name]:
                name === 'stock' || name === 'price' ? Number(value) : value,
            }
          : drug
      )
    );
  };

  const uniqueCategories = [
    ...new Set(drugs.map((drug) => drug.category).filter(Boolean)),
  ];
  const uniqueDrugTypes = [
    ...new Set(drugs.map((drug) => drug.drug_type).filter(Boolean)),
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaPills className="mr-2 text-blue-600" />
            Drugs Inventory
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              <FiUpload className="mr-2" />
              Import CSV
            </button>
            <button
              onClick={handleAddNew}
              disabled={isAdding}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <FiPlus className="mr-2" />
              Add New Drug
            </button>
          </div>
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
                placeholder="Search drugs by name, batch, type or description..."
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
              {(filters.expiringSoon ||
                filters.lowStock ||
                filters.category ||
                filters.drugType ||
                filters.priceRange[0] ||
                filters.priceRange[1] ||
                filters.expDateRange[0] ||
                filters.expDateRange[1]) && (
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
                  <label
                    htmlFor="expiringSoon"
                    className="ml-2 text-sm text-gray-700"
                  >
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
                  <label
                    htmlFor="lowStock"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Low Stock (≤ 10)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.priceRange[0]}
                      onChange={(e) =>
                        handlePriceRangeChange(0, e.target.value)
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      placeholder="Min"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={filters.priceRange[1]}
                      onChange={(e) =>
                        handlePriceRangeChange(1, e.target.value)
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
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
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="drugType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Drug Type
                  </label>
                  <select
                    id="drugType"
                    name="drugType"
                    value={filters.drugType}
                    onChange={handleFilterChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                  >
                    <option value="">All Types</option>
                    {uniqueDrugTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date Range
                  </label>
                  <div className="flex flex-col space-y-2">
                    <DatePicker
                      selected={filters.expDateRange[0]}
                      onChange={(date) =>
                        setFilters((prev) => ({
                          ...prev,
                          expDateRange: [date, prev.expDateRange[1]],
                        }))
                      }
                      selectsStart
                      startDate={filters.expDateRange[0]}
                      endDate={filters.expDateRange[1]}
                      placeholderText="Start Date"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      isClearable
                    />
                    <DatePicker
                      selected={filters.expDateRange[1]}
                      onChange={(date) =>
                        setFilters((prev) => ({
                          ...prev,
                          expDateRange: [prev.expDateRange[0], date],
                        }))
                      }
                      selectsEnd
                      startDate={filters.expDateRange[0]}
                      endDate={filters.expDateRange[1]}
                      minDate={filters.expDateRange[0]}
                      placeholderText="End Date"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      isClearable
                    />
                  </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Batch No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      MFG Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      EXP Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Add new drug row */}
                  {isAdding && (
                    <tr className="bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          name="drug_type"
                          value={newDrug.drug_type}
                          onChange={(e) => handleDrugTypeChange(e)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="">Select Type</option>
                          {drugTypes.map((type) => (
                            <option key={type.id} value={type.type_name}>
                              {type.type_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {availableDrugNames.length > 0 ? (
                          <select
                            name="name"
                            value={newDrug.name}
                            onChange={handleAddChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            required
                          >
                            <option value="">Select Name</option>
                            {availableDrugNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name="name"
                            value={newDrug.name}
                            onChange={handleAddChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            required
                            placeholder="Enter drug name"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          name="batch_no"
                          value={newDrug.batch_no}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          required
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          name="description"
                          value={newDrug.description}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="date"
                          name="mfg_date"
                          value={newDrug.mfg_date}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="date"
                          name="exp_date"
                          value={newDrug.exp_date}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          name="price"
                          value={newDrug.price}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          name="stock"
                          value={newDrug.stock}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          min="0"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          name="category"
                          value={newDrug.category}
                          onChange={handleAddChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md"
                        >
                          <option value="">N/A</option>
                          <option value="IPD">IPD</option>
                          <option value="OPD">OPD</option>
                          <option value="OUTREACH">OUTREACH</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveNewDrug}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Save"
                          >
                            <FiCheck className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCancelAdd}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Cancel"
                          >
                            <FiXCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {getPaginatedDrugs().length > 0 ? (
                    getPaginatedDrugs().map((drug) => {
                      const expiringSoon = isExpiringSoon(drug.exp_date);
                      const isEditing = editingId === drug.id;

                      return (
                        <tr
                          key={drug.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isEditing ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                name="drug_type"
                                value={drug.drug_type}
                                onChange={(e) =>
                                  handleDrugTypeChange(e, true, drug.id)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                required
                              >
                                <option value="">Select Type</option>
                                {drugTypes.map((type) => (
                                  <option key={type.id} value={type.type_name}>
                                    {type.type_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {drug.drug_type}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${
                              expiringSoon ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center">
                              {expiringSoon && (
                                <FaExclamationTriangle className="mr-2 text-red-500" />
                              )}
                              {isEditing ? (
                                availableDrugNames.length > 0 ? (
                                  <select
                                    name="name"
                                    value={drug.name}
                                    onChange={(e) =>
                                      handleDrugChange(drug.id, e)
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                    required
                                  >
                                    <option value="">Select Name</option>
                                    {availableDrugNames.map((name) => (
                                      <option key={name} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    name="name"
                                    value={drug.name}
                                    onChange={(e) =>
                                      handleDrugChange(drug.id, e)
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                    required
                                  />
                                )
                              ) : (
                                <span className="text-sm font-medium">
                                  {drug.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                name="batch_no"
                                value={drug.batch_no}
                                onChange={(e) => handleDrugChange(drug.id, e)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                required
                              />
                            ) : (
                              <span className="text-sm text-gray-500">
                                {drug.batch_no}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                type="text"
                                name="description"
                                value={drug.description}
                                onChange={(e) => handleDrugChange(drug.id, e)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                              />
                            ) : (
                              <span className="text-sm text-gray-500 max-w-xs truncate">
                                {drug.description}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500">
                              {new Date(drug.mfg_date).toLocaleDateString()}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${
                              expiringSoon
                                ? 'font-semibold text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            <span className="text-sm">
                              {new Date(drug.exp_date).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                name="price"
                                value={drug.price}
                                onChange={(e) => handleDrugChange(drug.id, e)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                min="0"
                                step="0.01"
                                required
                              />
                            ) : (
                              <span className="text-sm text-gray-500 font-medium">
                                ₹
                                {typeof drug.price === 'number'
                                  ? drug.price.toFixed(2)
                                  : parseFloat(drug.price).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                name="stock"
                                value={drug.stock}
                                onChange={(e) => handleDrugChange(drug.id, e)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                min="0"
                                required
                              />
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  drug.stock > 10
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {drug.stock} in stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                name="category"
                                value={drug.category}
                                onChange={(e) => handleDrugChange(drug.id, e)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                              >
                                <option value="">N/A</option>
                                <option value="IPD">IPD</option>
                                <option value="OPD">OPD</option>
                                <option value="OUTREACH">OUTREACH</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  drug.category === 'IPD'
                                    ? 'bg-blue-100 text-blue-800'
                                    : drug.category === 'OPD'
                                    ? 'bg-purple-100 text-purple-800'
                                    : drug.category === 'OUTREACH'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {drug.category || 'N/A'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleUpdate(drug.id)}
                                    className="text-green-600 hover:text-green-800 transition-colors"
                                    title="Save"
                                  >
                                    <FiSave className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Cancel"
                                  >
                                    <FiXCircle className="h-5 w-5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(drug)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit"
                                  >
                                    <FiEdit2 className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(drug.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="10"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No drugs found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center py-4">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="mx-2 text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Import Drugs from CSV</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  CSV should include columns: Drug Type, Name, Batch No,
                  Description, Stock, Manufacturing Date (YYYY-MM-DD),
                  Expiration Date (YYYY-MM-DD), Price, Category
                </p>
              </div>

              {importProgress && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {importProgress.status}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {importProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${importProgress.percent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="mb-4 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-medium text-red-700 mb-2">
                    Errors ({importErrors.length})
                  </h4>
                  <div className="space-y-2">
                    {importErrors.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 p-2 bg-red-50 rounded"
                      >
                        <p>
                          <strong>Row {error.row}:</strong> {error.error}
                        </p>
                        <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                          {JSON.stringify(error.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={!importFile || importProgress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrugsTable;
