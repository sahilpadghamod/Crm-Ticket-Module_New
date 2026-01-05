import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

// 
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post("http://localhost/ticket-api/api.php?action=register", formData);
    if (res.data.status) {
      alert("Registered Successfully! Please Login.");
      navigate("/");
    } else {
      alert(res.data.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          
          {/* Wrapped in form-group for spacing */}
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Full Name" 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required 
            />
          </div>

          {/* Wrapped in form-group for spacing */}
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              required 
            />
          </div>

          {/* Wrapped in form-group for spacing */}
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              required 
            />
          </div>

          <button type="submit">Register</button>
        </form>
        <p className="footer-text">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;