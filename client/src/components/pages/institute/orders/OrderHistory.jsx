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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../../../api/api';

const OrderHistory = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('institute');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (user?.role !== 'institute') {
      navigate('/unauthorized');
      return;
    }
    fetchOrderHistory();
  }, [user, activeTab, statusFilter, searchTerm, page]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
        transaction_type: activeTab
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await api.get('/history', { params });

      if (response.data.status) {
        setOrders(response.data.orders || []);
      } else {
        toast.error(response.data.message || 'Failed to fetch order history');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(`Failed to load order history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (order) => {
    try {
      // Initialize jsPDF with better default settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set default font
      doc.setFont('helvetica', 'normal');

      // Add logo or title
      doc.setFontSize(20);
      doc.setTextColor(33, 37, 41); // Dark gray
      doc.text('ORDER INVOICE', 105, 20, { align: 'center' });

      // Order information section
      doc.setFontSize(12);
      doc.text(`Order #: ${order.order_no}`, 20, 30);
      doc.text(`Date: ${formatDate(order.created_at)}`, 20, 38);

      // Show manufacturer/seller based on order type
      if (order.transaction_type === 'manufacturer') {
        const manufacturerName = order.items[0]?.manufacturer_name || 'Unknown';
        doc.text(`Manufacturer: ${manufacturerName}`, 20, 46);
      } else {
        doc.text(`Seller: ${order.recipient_name || 'N/A'}`, 20, 46);
      }

      // Format total amount with proper spacing
      const totalText = `Total Amount: ₹${parseFloat(
        order.total_amount
      ).toFixed(2)}`;
      doc.text(totalText, 20, 54);

      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 60, 195, 60);

      // Prepare table data with proper number formatting
      const tableData = order.items.map((item) => [
        item.drug_name,
        item.quantity.toString(),
        parseFloat(item.unit_price).toFixed(2),
        parseFloat(item.unit_price * item.quantity).toFixed(2),
        item.status.toUpperCase(),
      ]);

      // Add the table with improved styling
      autoTable(doc, {
        startY: 65,
        head: [['Item', 'Qty', 'Unit Price', 'Total', 'Status']],
        body: tableData,
        margin: { left: 15, right: 15 },
        headStyles: {
          fillColor: [13, 110, 253], // Bootstrap primary blue
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
          0: {
            cellWidth: 70,
            halign: 'left',
            fontStyle: 'bold',
          },
          1: {
            cellWidth: 20,
            halign: 'center',
          },
          2: {
            cellWidth: 30,
            halign: 'right',
            cellPadding: { right: 10 },
          },
          3: {
            cellWidth: 30,
            halign: 'right',
            cellPadding: { right: 10 },
          },
          4: {
            cellWidth: 30,
            halign: 'center',
          },
        },
        styles: {
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [221, 221, 221], // Light gray borders
        },
        didDrawCell: (data) => {
          // Add ₹ symbol to price columns after drawing
          if (data.column.index === 2 || data.column.index === 3) {
            doc.setFontSize(10);
            doc.setTextColor(33, 37, 41);
            doc.text(
              '',
              data.cell.x + 2,
              data.cell.y + data.cell.height / 2 + 3
            );
          }
        },
      });

      // Add additional drug information if manufacturer order
      if (order.transaction_type === 'manufacturer') {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);

        // Add batch numbers if available
        const batches = order.items
          .filter((item) => item.batch_no)
          .map((item) => `${item.drug_name}: ${item.batch_no}`);

        if (batches.length > 0) {
          doc.text('Batch Numbers:', 20, finalY);
          batches.forEach((batch, index) => {
            doc.text(batch, 25, finalY + 5 + index * 5);
          });
        }
      }

      // Add footer section
      const footerY =
        doc.lastAutoTable.finalY +
        (order.transaction_type === 'manufacturer'
          ? order.items.filter((item) => item.batch_no).length * 5 + 15
          : 15);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Invoice generated by: ${user.name} (${user.role})`,
        20,
        footerY
      );
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, footerY + 6);

      // Save the PDF
      doc.save(`invoice_${order.order_no}.pdf`);
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

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Order History</h1>

      <div className="flex border-b mb-6 overflow-x-auto whitespace-nowrap">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'institute'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          }`}
          onClick={() => {
            setActiveTab('institute');
            setPage(1);
          }}
        >
          Institute Orders
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'manufacturer'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          }`}
          onClick={() => {
            setActiveTab('manufacturer');
            setPage(1);
          }}
        >
          Manufacturer Orders
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
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
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="shipped">Shipped</option>
              <option value="rejected">Rejected</option>
            </select>
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
            No {activeTab === 'institute' ? 'institute' : 'manufacturer'} orders
            found
            {statusFilter !== 'all' ? ` with status: ${statusFilter}` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-300 rounded-lg shadow overflow-hidden"
            >
              <div className="p-3 sm:p-4 border-b">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">
                      Order #{order.order_no}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {order.transaction_type === 'institute'
                        ? 'Institute'
                        : 'Manufacturer'}{' '}
                      Order
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex justify-between">
                  {activeTab === 'manufacturer' && (
                    <p className="text-sm">
                      <span className="font-medium">Manufacturer: </span>
                      {order.items[0]?.manufacturer_name || 'Unknown'}
                    </p>
                  )}
                  {activeTab === 'institute' && (
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Seller:</span>{' '}
                        {order.recipient_name || 'N/A'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Total: ₹{parseFloat(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <h4 className="font-medium mb-2">
                  Items ({order.item_count}):
                </h4>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 bg-gray-50 rounded gap-2"
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
              <div className="p-3 sm:p-4 border-t">
                <button
                  onClick={() => downloadInvoice(order)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Download Invoice
                </button>
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

export default OrderHistory;
