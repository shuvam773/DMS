import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import api from '../../../../api/api';

const DrugManagement = () => {
  const [drugTypes, setDrugTypes] = useState([]);
  const [drugNames, setDrugNames] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newDrugName, setNewDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all drug types
  useEffect(() => {
    const fetchDrugTypes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/drug-types-names/drug-types');
        if (response.data.status) {
          setDrugTypes(response.data.drugTypes);
        }
      } catch (err) {
        setError('Failed to fetch drug types');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrugTypes();
  }, []);

  // Fetch drug names when type is selected
  useEffect(() => {
    if (selectedType) {
      const fetchDrugNames = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/drug-types-names/drug-names/${selectedType}`);
          if (response.data.status) {
            setDrugNames(response.data.drugNames);
          }
        } catch (err) {
          setError('Failed to fetch drug names');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchDrugNames();
    }
  }, [selectedType]);

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      setError('Type name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/drug-types-names/drug-types', {
        type_name: newTypeName
      });
      
      if (response.data.status) {
        setDrugTypes([...drugTypes, response.data.drugType]);
        setNewTypeName('');
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add drug type');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrugName = async () => {
    if (!selectedType || !newDrugName.trim()) {
      setError('Please select a type and enter a drug name');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/drug-types-names/drug-names', {
        type_id: selectedType,
        name: newDrugName
      });
      
      if (response.data.status) {
        setDrugNames([...drugNames, response.data.drugName]);
        setNewDrugName('');
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add drug name');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this drug type?')) return;

    try {
      setLoading(true);
      const response = await api.delete(`/drug-types-names/drug-types/${typeId}`);
      
      if (response.data.status) {
        setDrugTypes(drugTypes.filter(type => type.id !== typeId));
        if (selectedType === typeId) {
          setSelectedType(null);
          setDrugNames([]);
        }
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete drug type');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrugName = async (drugId) => {
    if (!window.confirm('Are you sure you want to delete this drug name?')) return;

    try {
      setLoading(true);
      const response = await api.delete(`/drug-types-names/drug-names/${drugId}`);
      
      if (response.data.status) {
        setDrugNames(drugNames.filter(drug => drug.id !== drugId));
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete drug name');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Drug Types & Names Management</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Drug Types Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Drug Types</h3>
          
          <div className="flex mb-4">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="New drug type name"
              className="flex-1 border rounded-l px-3 py-2"
            />
            <button
              onClick={handleAddType}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 disabled:bg-blue-300"
            >
              <FiPlus className="inline mr-1" /> Add
            </button>
          </div>

          <div className="border rounded">
            {drugTypes.map(type => (
              <div 
                key={type.id} 
                className={`p-3 border-b flex justify-between items-center ${selectedType === type.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <span 
                  className="cursor-pointer flex-1"
                  onClick={() => setSelectedType(type.id)}
                >
                  {type.type_name}
                </span>
                <button
                  onClick={() => handleDeleteType(type.id)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 disabled:text-red-300"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Drug Names Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            {selectedType 
              ? `Drug Names (${drugTypes.find(t => t.id === selectedType)?.type_name || ''})`
              : 'Select a drug type to view names'}
          </h3>
          
          {selectedType && (
            <>
              <div className="flex mb-4">
                <input
                  type="text"
                  value={newDrugName}
                  onChange={(e) => setNewDrugName(e.target.value)}
                  placeholder="New drug name"
                  className="flex-1 border rounded-l px-3 py-2"
                />
                <button
                  onClick={handleAddDrugName}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 disabled:bg-blue-300"
                >
                  <FiPlus className="inline mr-1" /> Add
                </button>
              </div>

              <div className="border rounded">
                {drugNames.length > 0 ? (
                  drugNames.map(drug => (
                    <div key={drug.id} className="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                      <span>{drug.name}</span>
                      <button
                        onClick={() => handleDeleteDrugName(drug.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 disabled:text-red-300"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500">No drug names found for this type</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrugManagement;