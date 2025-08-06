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
const App = () => {
  return (
    <BrowserRouter>
      <UserContextProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
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
          }></Route>
          
          {/* institute */}
          <Route path='/institute' element={
            <ProtectedRoute roles={['institute', 'admin']}>
              <InstitutePage/>
            </ProtectedRoute>
          }></Route>

          {/* pharmacy  */}
          <Route path='/pharmacy' element={
            <ProtectedRoute roles={['institute', 'admin', 'pharmacy']}>
              <PharmacyPage/>
            </ProtectedRoute>
          }></Route>
          



        </Routes>
        <Chatbot />
        <ToastContainer />
      </UserContextProvider>
    </BrowserRouter>
  );
};

export default App;
