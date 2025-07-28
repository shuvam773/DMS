import React from 'react';
import { FiX } from 'react-icons/fi';

const OrderDetailsModal = ({ order, onClose }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to safely format numbers
  const formatCurrency = (value) => {
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Order Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Order Information</h3>
              <div className="mt-2 space-y-1">
                <p><span className="font-medium">Order #:</span> {order.order_no}</p>
                <p><span className="font-medium">Date:</span> {new Date(order.created_at).toLocaleString()}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(order.overall_status)}`}>
                    {order.overall_status}
                  </span>
                </p>
                <p><span className="font-medium">Total Amount:</span> ₹{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">Parties</h3>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="font-medium">From:</p>
                  <p>{order.sender_name} ({order.sender_role})</p>
                </div>
                <div>
                  <p className="font-medium">To:</p>
                  <p>{order.recipient_name} ({order.recipient_role})</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Order Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Items ({order.items?.length || 0})</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drug
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.drug_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.batch_no || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{formatCurrency(item.total_price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Notes */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900">Notes</h3>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;