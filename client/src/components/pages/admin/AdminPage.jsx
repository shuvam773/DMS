import React, { useContext, useState } from 'react';
import { 
  FiHome, 
  FiUsers, 
  FiPackage, 
  FiShoppingBag, 
  FiSettings, 
  FiLogOut,
  FiChevronLeft
} from 'react-icons/fi';
import { 
  FaRegHospital, 
  FaPills 
} from 'react-icons/fa';
import AnalyticsDashboard from './AnalyticsDashboard';
import InstitutesTable from './users/InstitutesTable';
import DrugsTable from './drugs/DrugsTable';
import AdminSettings from './AdminSettings';
import UserContext from '../../../context/UserContext';
import logo from '../../../assets/logo.jpeg';
import OrderPage from './orders/OrderPage';
import { MdBorderColor } from 'react-icons/md';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useContext(UserContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AnalyticsDashboard />;
      case 'institutes': return <InstitutesTable />;
      case 'drugs': return <DrugsTable />;
      case 'orders': return <OrderPage />;
      case 'settings': return <AdminSettings />;
      default: return <AnalyticsDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-indigo-800 text-white transition-all duration-300 ease-in-out 
        ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col relative`}>
        
        {/* Collapse Button */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 bg-white text-indigo-800 rounded-full p-1 shadow-md hover:bg-gray-100"
        >
          <FiChevronLeft className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Logo and User Profile */}
        <div className="flex flex-col items-center pt-6 pb-4 border-b border-indigo-700">
          {!sidebarCollapsed && (
            <>
              <div className="mb-4 flex justify-center">
                <img 
                  src={logo} 
                  alt="logo" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
              </div>
              <div className="flex items-center w-full px-4">
                <div className="bg-indigo-600 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="font-medium">{user?.name?.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-medium text-sm">{user?.name}</h2>
                  <p className="text-xs text-indigo-300">Admin</p>
                </div>
              </div>
            </>
          )}
          {sidebarCollapsed && (
            <div className="bg-indigo-600 rounded-full w-10 h-10 flex items-center justify-center">
              <span className="font-medium">{user?.name?.charAt(0)}</span>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2">
          <ul className="space-y-1">
            {[
              { id: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
              { id: 'institutes', icon: <FaRegHospital />, label: 'Users' },
              { id: 'drugs', icon: <FaPills />, label: 'Drugs' },
              {id: 'orders', icon:<MdBorderColor/>, label: 'Orders'},
              { id: 'settings', icon: <FiSettings />, label: 'Settings' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors
                    ${activeTab === item.id ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-700/50'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logout */}
        <div className="p-4 border-t border-indigo-700">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center p-3 rounded-lg text-indigo-200 hover:bg-indigo-700/50
              ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <FiLogOut className="text-lg" />
            {!sidebarCollapsed && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-end items-center">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="text-gray-500 hover:text-gray-700">
                <FiPackage className="text-xl" />
              </button>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-800 font-medium">{user?.name?.charAt(0)}</span>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;