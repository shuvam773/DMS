import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AddDrugModal from './AddDrugModal';
import EditDrugModal from './EditDrugModal';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { FaPills, FaExclamationTriangle } from 'react-icons/fa';

const DrugsTable = () => {
  const [drugs, setDrugs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDrug, setCurrentDrug] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isExpiringSoon = (expDate) => {
    const expirationDate = new Date(expDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expirationDate <= threeMonthsFromNow;
  };

  useEffect(() => {
    fetchDrugs();
  }, []);

  const fetchDrugs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/drugs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDrugs(response.data);
    } catch (error) {
      console.error('Error fetching drugs:', error);
      toast.error('Failed to load drugs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrugAdded = (newDrug) => {
    setDrugs(prev => [...prev, {
      ...newDrug,
      price: typeof newDrug.price === 'string' ? parseFloat(newDrug.price) : newDrug.price
    }]);
  };

  const handleDrugUpdated = (updatedDrug) => {
    setDrugs(prev => prev.map(drug => 
      drug.id === updatedDrug.id ? {
        ...updatedDrug,
        price: typeof updatedDrug.price === 'string' ? parseFloat(updatedDrug.price) : updatedDrug.price
      } : drug
    ));
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
      setDrugs(prev => prev.filter(drug => drug.id !== id));
    } catch (error) {
      console.error('Error deleting drug:', error);
      toast.error(error.response?.data?.error || 'Failed to delete drug');
    }
  };

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Added by</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drugs.map((drug) => {
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
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{drug.creator_name}</td>
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
                  })}
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