import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../../../context/UserContext';
import { toast } from 'react-toastify';
import {
  FiPackage,
  FiCheck,
  FiX,
  FiTruck,
  FiClock,
  FiFilter,
  FiSearch,
} from 'react-icons/fi';

const PharmacyOrderHistory = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (user?.role !== 'pharmacy') {
      navigate('/unauthorized');
      return;
    }
    fetchOrderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, searchTerm, page]);

  const fetchOrderHistory = async () => {
  try {
    setLoading(true);

    let url = `http://localhost:8080/api/pharmacy/orders/history?page=${page}&limit=${limit}`;

    if (statusFilter !== 'all') {
      url += `&status=${statusFilter}`;
    }

    if (searchTerm) {
      url += `&search=${searchTerm}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status) {
      setOrders(data.orders || []);
    } else {
      toast.error(data.message || 'Failed to fetch order history');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    toast.error(`Failed to load order history: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheck className="mr-1" />;
      case 'shipped':
        return <FiTruck className="mr-1" />;
      case 'rejected':
        return <FiX className="mr-1" />;
      default:
        return <FiClock className="mr-1" />;
    }
  };

  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrderHistory();
  };

  const handleRefresh = () => {
    setPage(1);
    fetchOrderHistory();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Pharmacy Order History</h1>
      <p className="text-gray-600 mb-6">View your orders to institutes</p>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by order number, drug name..."
                className="pl-10 w-full p-2 border rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              Refresh
            </button>
            <div className="flex items-center">
              <FiFilter className="text-gray-500 mr-2" />
              <select
                className="border rounded p-2"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiPackage className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-600">
            No institute orders found
            {statusFilter !== 'all' ? ` with status: ${statusFilter}` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-indigo-300 rounded-lg shadow overflow-hidden border  border-gray-200"
            >
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">
                      Order #{order.order_no}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Institute Order
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex justify-between">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">Institute:</span>{' '}
                      {order.recipient_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Total: ₹{parseFloat(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-medium mb-2">
                  Items ({order.item_count}):
                </h4>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.drug_name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} | Price: ₹
                          {parseFloat(item.unit_price).toFixed(2)}
                        </p>
                        {item.batch_no && (
                          <p className="text-xs text-gray-500">
                            Batch: {item.batch_no}
                          </p>
                        )}
                        {item.seller_name && (
                          <p className="text-xs text-gray-500">
                            Seller: {item.seller_name}
                          </p>
                        )}
                        {item.manufacturer_name && (
                          <p className="text-xs text-gray-500">
                            Manufacturer: {item.manufacturer_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs flex items-center ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={orders.length < limit}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyOrderHistory;