import React from 'react';
import UserContextProvider from './context/UserContextProvider';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/pages/Dashboard';
import UnauthorizedPage from './components/pages/UnauthorizedPage';
import ProtectedRoute from './context/ProtectedRoute';
import AdminPage from './components/pages/admin/AdminPage'
import InstitutePage from './components/pages/institute/InstitutePage';
import PharmacyPage from './components/pages/pharmacy/PharmacyPage';
import { ToastContainer } from 'react-toastify';
import Chatbot from './components/chatbot/Chatbot';
import DrugManagement from './components/pages/admin/drugs/DrugManagement';
const App = () => {
  return (
    <BrowserRouter>
      <UserContextProvider>
        <Routes>
          
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard/>}/>
          <Route path="/unauthorized" element={<UnauthorizedPage/>}/>

          {/* protected routes  */}
          {/* admin  */}
          <Route path='/admin' element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage/>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminPage type="dashboard" />} />
            <Route path="institutes" element={<AdminPage type="institutes" />} />
            <Route path="drugs" element={<AdminPage type="drugs" />} />
            <Route path="drug-management" element={<AdminPage type="drug-management" />} />
            <Route path="orders-history" element={<AdminPage type="orders-history" />} />
            <Route path="settings" element={<AdminPage type="settings" />} />
          </Route>
          
          {/* institute */}
          <Route path='/institute' element={
            <ProtectedRoute roles={['institute', 'admin']}>
              <InstitutePage/>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<InstitutePage type="dashboard" />} />
            <Route path="dispensaries" element={<InstitutePage type="dispensaries" />} />
            <Route path="drugs" element={<InstitutePage type="drugs" />} />
            <Route path="orders" element={<InstitutePage type="orders" />} />
            <Route path="order-history" element={<InstitutePage type="order-history" />} />
            <Route path="indent" element={<InstitutePage type="indent" />} />
            <Route path="settings" element={<InstitutePage type="settings" />} />
          </Route>

          {/* pharmacy  */}
          <Route path='/pharmacy' element={
            <ProtectedRoute roles={['institute', 'admin', 'pharmacy']}>
              <PharmacyPage/>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PharmacyPage type="dashboard" />} />
            <Route path="drugs" element={<PharmacyPage type="drugs" />} />
            <Route path="indent" element={<PharmacyPage type="indent" />} />
            <Route path="indent-history" element={<PharmacyPage type="indent-history" />} />
            <Route path="settings" element={<PharmacyPage type="settings" />} />
          </Route>
          



        </Routes>
        <Chatbot />
        <ToastContainer />
      </UserContextProvider>
    </BrowserRouter>
  );
};

export default App;
