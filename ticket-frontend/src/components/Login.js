import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

// Use destructuring to extract setUser from props immediately
const Login = ({ setUser }) => {
  // State variables for form inputs and UI status
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload
    setLoading(true);
    setError(""); // Clear previous errors

    try {
      // Send POST request to API
      const res = await axios.post("http://localhost/ticket-api/api.php?action=login", { 
        email, 
        password 
      });
      
      if (res.data.status) {
        // SUCCESS: Save user to storage and update Global State
        localStorage.setItem("user", JSON.stringify(res.data.data));
        setUser(res.data.data);
      } else {
        // FAILURE: Show error message from backend
        setError(res.data.message);
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      // Always turn off loading spinner
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Simple SVG Logo */}
        <div style={{ marginBottom: '1rem' }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="12" fill="#2563eb"/>
            <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2>User Login</h2>
        <p className="subtitle">Enter your credentials to access the portal</p>

        {/* Conditional Error Rendering */}
        {error && (
          <div style={{ 
            background: '#fef2f2', color: '#b91c1c', padding: '10px', 
            borderRadius: '6px', fontSize: '14px', marginBottom: '15px', 
            border: '1px solid #fee2e2' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              onChange={(e) => setEmail(e.target.value)} 
              value={email}
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              value={password}
              required 
            />
          </div>
          
          <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="footer-text">
          Don't have an account? <Link to="/register">Register now</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;