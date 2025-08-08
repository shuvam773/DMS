import React, { useContext, useState } from 'react';
import { toast } from 'react-toastify';
import UserContext from '../../../../context/UserContext';
import api from '../../../../api/api'; // Import the api instance

const AddPharmacy = ({ isOpen, onClose, onSave }) => {
  const { user } = useContext(UserContext);
  
  const initialFormState = {
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
    role: 'pharmacy',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const resetForm = () => {
    setFormData(initialFormState);
    setFieldErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const postalCodeRegex = /^[0-9]{6}$/;

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!emailRegex.test(formData.email)) errors.email = 'Invalid email format';
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!phoneRegex.test(formData.phone)) errors.phone = 'Invalid phone number (10 digits required)';
    if (!formData.license_number.trim()) errors.license_number = 'License number is required';
    if (!formData.street.trim()) errors.street = 'Street address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!postalCodeRegex.test(formData.postal_code)) errors.postal_code = 'Invalid postal code (6 digits required)';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user?.isAuthenticated || user?.role !== 'institute') {
      toast.error('Unauthorized access');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/users/pharmacy', formData);
      
      toast.success('Dispensary created successfully!');
      onSave(response.data.pharmacy);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      
      if (error.response?.status === 409) {
        const conflicts = error.response.data.conflicts || [];
        const newErrors = {};
        conflicts.forEach(field => {
          newErrors[field] = `This ${field} is already in use`;
        });
        setFieldErrors(newErrors);
        toast.error(error.response.data.message || 'Conflict detected');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create dispensary');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed pb-12 inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h3 className="text-lg sm:text-xl font-bold">Add New Dispensary</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { name: 'name', label: 'Name*', type: 'text' },
                { name: 'email', label: 'Email*', type: 'email' },
                { name: 'password', label: 'Password*', type: 'password' },
                { name: 'phone', label: 'Phone*', type: 'tel' },
                { name: 'license_number', label: 'License Number*', type: 'text' },
                { name: 'street', label: 'Street*', type: 'text' },
                { name: 'city', label: 'City*', type: 'text' },
                { name: 'state', label: 'State*', type: 'text' },
                { name: 'postal_code', label: 'Postal Code*', type: 'text' },
                { name: 'country', label: 'Country', type: 'text', disabled: true },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      fieldErrors[field.name] ? 'border-red-500' : 'border-gray-300'
                    } rounded-md`}
                    disabled={field.disabled || isSubmitting}
                    required={field.label.includes('*')}
                  />
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors[field.name]}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSubmitting}
                >
                  <option value="pharmacy">Dispensary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSubmitting}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Dispensary'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPharmacy;