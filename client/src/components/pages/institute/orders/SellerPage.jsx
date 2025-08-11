import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../../../context/UserContext';
import { toast } from 'react-toastify';
import { FiPackage, FiEdit, FiSave, FiX } from 'react-icons/fi';
import api from '../../../../api/api';

const SellerPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [editingQuantities, setEditingQuantities] = useState({});
  const [tempQuantities, setTempQuantities] = useState({});

  useEffect(() => {
    if (user?.role !== 'institute') {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user, selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/seller/orders', {
        params: { status: selectedStatus },
      });

      if (response.data.status) {
        const filteredOrders =
          response.data.orders
            ?.map((order) => ({
              ...order,
              items:
                order.items?.filter((item) => item.status === selectedStatus) ||
                [],
            }))
            .filter((order) => order.items.length > 0) || [];

        setOrders(filteredOrders);
      } else {
        toast.error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const toggleEditQuantity = (itemId, currentQuantity) => {
    setEditingQuantities((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
    setTempQuantities((prev) => ({
      ...prev,
      [itemId]: currentQuantity,
    }));
  };

  const saveQuantity = async (orderItemId) => {
    try {
      const response = await api.patch(
        `/seller/order-items/${orderItemId}/status`,
        {
          quantity: tempQuantities[orderItemId],
        }
      );

      if (response.data.status) {
        toast.success('Quantity updated successfully');
        setEditingQuantities((prev) => {
          const newState = { ...prev };
          delete newState[orderItemId];
          return newState;
        });
        fetchOrders();
      } else {
        toast.error(response.data.message || 'Failed to update');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Error updating');
    }
  };

  const updateItemStatus = async (orderItemId, newStatus) => {
    try {
      const response = await api.patch(
        `/seller/order-items/${orderItemId}/status`,
        { status: newStatus }
      );

      if (response.data.status) {
        toast.success('Status updated successfully');
        fetchOrders();
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error(error.response?.data?.message || 'Error updating status');
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      shipped: 'bg-blue-100 text-blue-800',
      default: 'bg-yellow-100 text-yellow-800',
    };
    return statusColors[status] || statusColors.default;
  };

  const getStatusOptions = (currentStatus) => {
    const baseOptions = [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approve' },
      { value: 'rejected', label: 'Reject' },
    ];

    if (currentStatus === 'approved') {
      return [...baseOptions, { value: 'shipped', label: 'Shipped' }];
    }

    return baseOptions;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Manage Orders</h1>
        <div className="flex space-x-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded p-2"
          >
            <option value="pending">Pending Items</option>
            <option value="approved">Approved Items</option>
            <option value="shipped">Shipped Items</option>
            <option value="rejected">Rejected Items</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiPackage className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-600">
            No orders found with status: {selectedStatus}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden space-y-4">
          {orders.map((order) => (
            <div
              key={order.order_id}
              className="border-b last:border-b-0 bg-gray-300 rounded-2xl p-4 sm:p-8"
            >
              <div className="p-0 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <h3 className="font-medium">Order #{order.order_no}</h3>
                  <p className="text-sm text-gray-600">
                    Placed on: {formatDate(order.order_date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Buyer: {order.buyer_name}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold">
                    ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.transaction_type}
                  </p>
                </div>
              </div>

              <div className="p-0 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between text-sm mb-4 gap-2">
                  <span>Items: {order.item_count}</span>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'approved', 'rejected', 'shipped'].map(
                      (status) => (
                        <span
                          key={status}
                          className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                            status
                          )}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}:{' '}
                          {order[`${status}_items`] || 0}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded gap-2"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.drug_name}</p>
                        <div className="flex items-center mt-1">
                          {editingQuantities[item.id] ? (
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={tempQuantities[item.id] || item.quantity}
                                onChange={(e) =>
                                  setTempQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: parseInt(e.target.value) || 1,
                                  }))
                                }
                                className="w-16 p-1 border rounded mr-2"
                              />
                              <button
                                onClick={() => saveQuantity(item.id)}
                                className="text-green-600 hover:text-green-800 mr-2"
                                title="Save"
                              >
                                <FiSave size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  toggleEditQuantity(item.id, item.quantity)
                                }
                                className="text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="mr-2">
                                {item.quantity} × ₹
                                {parseFloat(item.unit_price || 0).toFixed(2)} =
                                ₹{parseFloat(item.total_price || 0).toFixed(2)}
                              </span>
                              {item.status === 'pending' && (
                                <button
                                  onClick={() =>
                                    toggleEditQuantity(item.id, item.quantity)
                                  }
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit quantity"
                                >
                                  <FiEdit size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {item.batch_no && (
                          <p className="text-xs text-gray-500">
                            Batch: {item.batch_no}
                          </p>
                        )}
                        {item.category && (
                          <p className="text-xs text-gray-500 mt-1">
                            Category:{' '}
                            <span className="font-medium">{item.category}</span>
                          </p>
                        )}
                        <div className="flex items-center mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateItemStatus(item.id, e.target.value)
                          }
                          className="border rounded p-1 text-sm"
                          disabled={
                            item.status === 'rejected' ||
                            editingQuantities[item.id]
                          }
                        >
                          {getStatusOptions(item.status).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerPage;
