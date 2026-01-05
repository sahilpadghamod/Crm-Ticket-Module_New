import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import "./App.css";
import Swal from 'sweetalert2';

// Override default browser alert with a professional modal
window.alert = (message) => {
  Swal.fire({
    title: 'Notification',
    text: message,
    icon: 'info',
    confirmButtonText: 'OK',
    // Matches the --primary-color from App.css
    confirmButtonColor: '#2563eb' 
  });
};

function App() {
  // Load user from local storage to keep them logged in on refresh
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  return (
    <Router>
      <Routes>
        {/* If user is logged in, redirect Login page to Dashboard */}
        <Route 
          path="/" 
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Public Registration Route */}
        <Route path="/register" element={<Register />} />
        
        {/* Protected Route: Only accessible if user exists */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;