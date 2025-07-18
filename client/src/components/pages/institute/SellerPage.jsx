import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../../context/UserContext';
import { toast } from 'react-toastify';
import { FiPackage, FiCheck, FiX, FiTruck } from 'react-icons/fi';

const SellerPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');

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
      const response = await fetch(
        `http://localhost:8080/api/seller/orders?status=${selectedStatus}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched orders:', data); // Debug log
      
      if (data.status) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (orderItemId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/seller/order-items/${orderItemId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status) {
        toast.success('Status updated successfully');
        fetchOrders(); // Refresh the orders list
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusOptions = (currentStatus) => {
    const options = [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approve' },
      { value: 'rejected', label: 'Reject' }
    ];

    if (currentStatus === 'approved') {
      options.push({ value: 'shipped', label: 'Shipped' });
    }

    return options;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Orders</h1>
        <div className="flex space-x-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded p-2"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="shipped">Shipped</option>
            <option value="rejected">Rejected</option>
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {orders.map((order) => (
            <div key={order.order_id} className="border-b last:border-b-0">
              <div className="p-4 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Order #{order.order_no}</h3>
                  <p className="text-sm text-gray-600">
                    Placed on: {new Date(order.order_date).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Buyer: {order.buyer_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.transaction_type}
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between text-sm mb-4">
                  <span>Items: {order.item_count}</span>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor('pending')}`}>
                      Pending: {order.pending_items || 0}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor('approved')}`}>
                      Approved: {order.approved_items || 0}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor('rejected')}`}>
                      Rejected: {order.rejected_items || 0}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor('shipped')}`}>
                      Shipped: {order.shipped_items || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.drug_name}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ₹{parseFloat(item.unit_price || 0).toFixed(2)} = ₹{parseFloat(item.total_price || 0).toFixed(2)}
                          </p>
                          {item.batch_no && (
                            <p className="text-xs text-gray-500">
                              Batch: {item.batch_no}
                            </p>
                          )}
                          <div className="flex items-center mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={item.status}
                            onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            className="border rounded p-1 text-sm"
                            disabled={item.status === 'rejected'}
                          >
                            {getStatusOptions(item.status).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No items found for this order
                    </p>
                  )}
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