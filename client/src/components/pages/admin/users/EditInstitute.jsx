import React, { useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import UserContext from '../../../../context/UserContext';
import api from '../../../../api/api'; // Import the api instance

const EditInstitute = ({ isOpen, onClose, onSave, institute }) => {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    license_number: '',
    role: 'institute',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (institute) {
      setFormData({
        name: institute.name || '',
        email: institute.email || '',
        phone: institute.phone || '',
        street: institute.street || '',
        city: institute.city || '',
        state: institute.state || '',
        postal_code: institute.postal_code || '',
        country: institute.country || 'India',
        license_number: institute.license_number || '',
        role: institute.role || 'institute',
        status: institute.status || 'Active'
      });
    }
  }, [institute]);

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
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
      isValid = false;
    }

    if (!formData.license_number.trim()) {
      errors.license_number = 'License number is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user || !user.isAuthenticated) {
        throw new Error('User not authenticated. Please login again.');
      }

      if (user.role !== 'admin') {
        throw new Error('Only admin users can update institutes');
      }

      const response = await api.put(`/users/${institute.id}`, formData);

      toast.success('Institute updated successfully!');
      onSave(response.data.institute);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Failed to update institute';
      let newFieldErrors = {};

      if (error.response?.status === 409) {
        errorMessage = error.response.data.message;
        if (error.response.data.conflicts) {
          error.response.data.conflicts.forEach((field) => {
            newFieldErrors[field] = `This ${field} is already in use`;
          });
        }
      } else {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      }

      setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Edit Institute</h3>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    fieldErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone*</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                )}
              </div>

              {/* License Number Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number*</label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    fieldErrors.license_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.license_number && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.license_number}</p>
                )}
              </div>

              {/* Street Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street*</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* City Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City*</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* State Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State*</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Postal Code Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code*</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Country Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="institute">Institute</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>

              {/* Status Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
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
                {isSubmitting ? 'Updating...' : 'Update Institute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditInstitute;