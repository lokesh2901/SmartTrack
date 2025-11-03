// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminHome from "./pages/AdminHome";
import HRMHome from "./pages/HRMHome";
import EmployeeHome from "./pages/EmployeeHome";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
        <Route path="/hrm" element={<ProtectedRoute role="hr"><HRMHome /></ProtectedRoute>} />
        <Route path="/employee/*" element={<ProtectedRoute role="employee"><EmployeeHome /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
