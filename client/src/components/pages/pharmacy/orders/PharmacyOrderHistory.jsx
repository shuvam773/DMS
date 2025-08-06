import React, { useContext, useState, useEffect, useCallback } from 'react';
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
  FiDownload,
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../../../api/api';

const PharmacyOrderHistory = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const limit = 10;

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to first page when search term changes
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }

      const response = await api.get('/pharmacy/orders/history', { params });

      if (response.data.status) {
        setOrders(response.data.orders || []);
        setTotalOrders(response.data.total || 0);
      } else {
        toast.error(response.data.message || 'Failed to fetch order history');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(
        `Failed to load order history: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    if (user?.role !== 'pharmacy') {
      navigate('/unauthorized');
      return;
    }
    fetchOrderHistory();
  }, [user, fetchOrderHistory, navigate]);

  const downloadInvoice = (order) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(20);
      doc.setTextColor(33, 37, 41);
      doc.text('DISPENSARY ORDER INVOICE', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Order #: ${order.order_no}`, 20, 30);
      doc.text(`Date: ${formatDate(order.created_at)}`, 20, 38);
      doc.text(`Institute: ${order.recipient_name || 'N/A'}`, 20, 46);

      const totalText = `Total Amount: ₹${parseFloat(
        order.total_amount
      ).toFixed(2)}`;
      doc.text(totalText, 20, 54);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 60, 195, 60);

      const tableData = order.items.map((item) => [
        item.drug_name,
        item.quantity.toString(),
        parseFloat(item.unit_price).toFixed(2),
        parseFloat(item.unit_price * item.quantity).toFixed(2),
        item.status.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Item', 'Qty', 'Unit Price', 'Total', 'Status']],
        body: tableData,
        margin: { left: 15, right: 15 },
        headStyles: {
          fillColor: [13, 110, 253],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 5,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right', cellPadding: { right: 10 } },
          3: { cellWidth: 30, halign: 'right', cellPadding: { right: 10 } },
          4: { cellWidth: 30, halign: 'center' },
        },
        styles: {
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [221, 221, 221],
        },
      });

      const batches = order.items
        .filter((item) => item.batch_no)
        .map((item) => `${item.drug_name}: ${item.batch_no}`);

      if (batches.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Batch Numbers:', 20, finalY);
        batches.forEach((batch, index) => {
          doc.text(batch, 25, finalY + 5 + index * 5);
        });
      }

      const footerY =
        doc.lastAutoTable.finalY +
        (batches.length > 0 ? batches.length * 5 + 15 : 15);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Invoice generated by: ${user.name} (${user.role})`,
        20,
        footerY
      );
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, footerY + 6);

      doc.save(`pharmacy_order_${order.order_no}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice');
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
      default: // pending
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
      default: // pending
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchOrderHistory();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Indent History</h1>
      <p className="text-gray-600 mb-6">View your indent to institutes</p>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by order number, drug name..."
                className="pl-10 w-full p-2 border rounded"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1"
            >
              <FiClock className="text-gray-600" />
              Refresh
            </button>
            <div className="flex items-center">
              <FiFilter className="text-gray-500 mr-2" />
              <select
                className="border rounded p-2"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="shipped">Shipped</option>
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
            {debouncedSearchTerm ? ` matching "${debouncedSearchTerm}"` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow overflow-hidden border border-gray-200"
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
                  <button
                    onClick={() => downloadInvoice(order)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1 text-sm"
                  >
                    <FiDownload size={14} />
                    Invoice
                  </button>
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
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.drug_name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} | Price: ₹
                          {parseFloat(item.unit_price).toFixed(2)}
                        </p>
                        <span>Category: {item.category}</span>
                        {item.batch_no && (
                          <p className="text-xs text-gray-500">
                            Batch: {item.batch_no}
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
              className="px-4 py-2 border rounded disabled:opacity-50 flex items-center gap-1"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {Math.ceil(totalOrders / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={orders.length < limit}
              className="px-4 py-2 border rounded disabled:opacity-50 flex items-center gap-1"
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
