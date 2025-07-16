import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import PropTypes from 'prop-types';

const OrderCard = ({ order, user, handleStatusChange }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{order.drug}</h3>
            <p className="text-sm text-gray-500">Order #{order.order_no}</p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            order.status === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Quantity:</span>
            <span className="text-sm font-medium">{order.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Seller:</span>
            <span className="text-sm font-medium">{order.seller_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Placed by:</span>
            <span className="text-sm font-medium">{order.user_name} ({order.user_role})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Date:</span>
            <span className="text-sm font-medium">{order.created_at}</span>
          </div>
        </div>
        
        {user.role === 'admin' && (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleStatusChange(order.id, 'approved')}
              disabled={order.status === 'approved'}
              className={`flex-1 py-1 px-3 rounded text-sm ${
                order.status === 'approved'
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange(order.id, 'pending')}
              disabled={order.status === 'pending'}
              className={`flex-1 py-1 px-3 rounded text-sm ${
                order.status === 'pending'
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              Mark Pending
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

OrderCard.propTypes = {
  order: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  handleStatusChange: PropTypes.func.isRequired
};

export default OrderCard;