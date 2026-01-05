import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from 'sweetalert2';

// API Configuration
// Base endpoint for the PHP backend ticket system
const API_URL = "http://localhost/ticket-api/api.php";


// Dashboard Component

const Dashboard = ({ user, setUser }) => {

  // State Management

  // Ticket Data
  const [tickets, setTickets] = useState([]);
  
  // User Data Lists
  const [assignableUsers, setAssignableUsers] = useState([]); // Users available for ticket assignment
  const [allUsers, setAllUsers] = useState([]); // Full user list for Admin management
  
  // Form State
  const [newTicket, setNewTicket] = useState({ title: "", description: "", assigned_to: "", file: null });
  
  // UI State
  // Default view: Admins see 'users' first, others see 'tickets'
  const [view, setView] = useState(user.role === 'admin' ? "users" : "tickets");
  const [loading, setLoading] = useState(false);

  // API Data Fetching Methods

  // Fetches tickets based on the current user's role and ID.
  // Admins fetch all tickets; Authors/Users fetch specific subsets.
  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API_URL}?action=tickets&user_id=${user.id}&role=${user.role}`);
      if (res.data.status) setTickets(res.data.data);
    } catch (err) { console.error("Error fetching tickets:", err); }
  };

  // Fetches a list of users specifically for the "Assign To" dropdown.

  const fetchAssignableUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}?action=users`);
      if (res.data.status) setAssignableUsers(res.data.data);
    } catch (err) { console.error("Error fetching assignable users:", err); }
  };

  // Admin Only: Fetches all registered users for the User Management table.
  
  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}?action=all_users`);
      if (res.data.status) setAllUsers(res.data.data);
    } catch (err) { console.error("Error fetching all users:", err); }
  };

  // Side Effects
  useEffect(() => {
    // Determine which data to fetch based on current View and User Role
    if (view === 'tickets') fetchTickets();
    if (user.role === 'author') fetchAssignableUsers();
    if (user.role === 'admin' && view === 'users') fetchAllUsers();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user.role]);

  // Helper Functions
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // Formats a raw timestamp string into a readable date format.
  const formatDate = (dateString) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Event Handlers

  // Handles ticket creation with file upload support.
  // Uses FormData to handle multipart/form-data requests.

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("title", newTicket.title);
    formData.append("description", newTicket.description);
    formData.append("assigned_to", newTicket.assigned_to);
    formData.append("created_by", user.id);
    if (newTicket.file) formData.append("file", newTicket.file);

    try {
      await axios.post(`${API_URL}?action=create_ticket`, formData);
      Swal.fire('Success', 'Ticket Created Successfully', 'success');
      
      // Reset form and refresh list
      setNewTicket({ title: "", description: "", assigned_to: "", file: null });
      fetchTickets();
    } catch (err) {
      Swal.fire('Error', 'Failed to create ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Updates the lifecycle status of a ticket (Pending -> In Progress -> Completed).

  const handleUpdateStatus = async (id, status, title, desc) => {
    try {
      await axios.post(`${API_URL}?action=update_ticket`, { id, status, role: user.role, title, description: desc });
      fetchTickets(); // Refresh UI
      
      // Show non-intrusive toast notification
      const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      toast.fire({ icon: 'success', title: `Status updated to ${status}` });
    } catch (err) { console.error(err); }
  };

  // Deletes a ticket with a confirmation warning.
  // Only accessible to Authors for their own tickets.
   
  const handleDeleteTicket = async (id) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (confirm.isConfirmed) {
      await axios.post(`${API_URL}?action=delete_ticket`, { id, role: user.role });
      Swal.fire('Deleted!', 'Ticket has been deleted.', 'success');
      fetchTickets();
    }
  };


  // Admin: Changes a user's permission role (User <-> Author).
  
  const handleChangeRole = async (userId, newRole) => {
    const res = await axios.post(`${API_URL}?action=update_user_role`, { id: userId, new_role: newRole });
    if(res.data.status) {
        Swal.fire('Success', `User role updated to ${newRole}`, 'success');
        fetchAllUsers();
    }
  };

  // Admin: Permanently deletes a user from the system.

  const handleDeleteUser = async (userId) => {
    const confirm = await Swal.fire({ title: 'Delete User?', text: "Cannot be undone.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (confirm.isConfirmed) {
      const res = await axios.post(`${API_URL}?action=delete_user`, { id: userId });
      if (res.data.status) {
        Swal.fire('Deleted', 'User removed.', 'success');
        fetchAllUsers();
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    }
  };

  // Render

  return (
    <div className="container">
      {/* --- Header Section: Title & User Info --- */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="user-info">
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Ticket Dashboard</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b' }}>
              Welcome, <strong>{user.name}</strong> <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', textTransform: 'uppercase' }}>{user.role}</span>
            </p>
        </div>

        {/* --- Navigation: Admin Role Toggle & Logout --- */}
        <div className="nav-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user.role === 'admin' && (
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '6px', marginRight: '10px' }}>
                  <button onClick={() => setView('users')} style={{ background: view === 'users' ? '#ffffff' : 'transparent', color: view === 'users' ? '#2563eb' : '#64748b', boxShadow: view === 'users' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', margin: 0, width: 'auto', padding: '6px 12px', borderRadius: '4px' }}>Users</button>
                  <button onClick={() => setView('tickets')} style={{ background: view === 'tickets' ? '#ffffff' : 'transparent', color: view === 'tickets' ? '#2563eb' : '#64748b', boxShadow: view === 'tickets' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', margin: 0, width: 'auto', padding: '6px 12px', borderRadius: '4px' }}>Tickets</button>
                </div>
            )}
            <button onClick={logout} style={{ background: "#ef4444", width: "auto", margin: 0, padding: "8px 16px" }}>Logout</button>
        </div>
      </div>

      <div className="content-area">
        {/* --- View: User Management (Admin Only) --- */}
        {view === 'users' && user.role === 'admin' ? (
          <div className="dashboard-card">
            <h2 style={{ marginTop: 0 }}>User Management</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name} {u.email === 'admin@gmail.com' && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>(You)</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      {/* Protect the main Admin account from role changes */}
                      {u.email === 'admin@gmail.com' ? (
                        <span style={{ fontWeight: 'bold', color: '#ef4444' }}>ADMIN</span>
                      ) : (
                        <select value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value)} style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>
                          <option value="user">User</option>
                          <option value="author">Author</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {/* Protect the main Admin account from deletion */}
                      {u.email !== 'admin@gmail.com' && (
                        <button onClick={() => handleDeleteUser(u.id)} style={{ background: '#ef4444', width: 'auto', padding: '6px 12px', margin: 0, fontSize: '0.9em' }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {/* --- View: Ticket Creation Form (Author Only) --- */}
            {user.role === 'author' && (
              <div className="dashboard-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#334155' }}>Create New Ticket</h3>
                <form onSubmit={handleCreateTicket} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input placeholder="Ticket Title" value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input placeholder="Description" value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} required />
                  </div>
                  <div>
                    <select value={newTicket.assigned_to} onChange={(e) => setNewTicket({ ...newTicket, assigned_to: e.target.value })} required>
                      <option value="">Assign to User...</option>
                      {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <input type="file" onChange={(e) => setNewTicket({ ...newTicket, file: e.target.files[0] })} style={{ background: '#fff' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" disabled={loading} style={{ width: 'auto' }}>{loading ? 'Creating...' : 'Create Ticket'}</button>
                  </div>
                </form>
              </div>
            )}

            {/* --- View: Ticket List Table --- */}
            <div className="dashboard-card">
              <h3 style={{ marginTop: 0 }}>{user.role === 'admin' ? 'All System Tickets (Read Only)' : 'My Tickets'}</h3>
              <table>
                <thead>
                  {/* Fixed width headers for better alignment */}
                  <tr>
                    <th style={{ width: '20%' }}>Details</th>
                    <th style={{ width: '20%' }}>Status</th>
                    <th style={{ width: '20%' }}>Assigned To</th>
                    <th style={{ width: '20%' }}>Created By</th>
                    <th style={{ width: '20%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length > 0 ? (
                    tickets.map(ticket => (
                      <tr key={ticket.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{ticket.title}</div>
                          <div style={{ fontSize: '0.9em', color: '#64748b' }}>{ticket.description}</div>
                          {ticket.file_path && (
                            <a href={`http://localhost/ticket-api/${ticket.file_path}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8em', color: '#2563eb', textDecoration: 'underline' }}>View Attachment</a>
                          )}
                          <div style={{ fontSize: '0.75em', color: '#94a3b8', marginTop: '4px' }}>{formatDate(ticket.created_at)}</div>
                        </td>
                        <td><span className={`status-${ticket.status}`}>{ticket.status}</span></td>
                        <td>{ticket.assigned_name || 'Unassigned'}</td>
                        <td>{ticket.author_name || 'Unknown'}</td>
                        <td>
                          {/* Admin View is Read-Only */}
                          {user.role === 'admin' ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>View Only</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Status Update Dropdown */}
                              <select value={ticket.status} onChange={(e) => handleUpdateStatus(ticket.id, e.target.value, ticket.title, ticket.description)} style={{ width: 'auto', padding: '6px', fontSize: '0.9em', margin: 0 }}>
                                <option value="pending">Pending</option>
                                <option value="inprogress">In Progress</option>
                                <option value="completed">Completed</option>
                                {user.role === 'author' && <option value="onhold">On Hold</option>}
                              </select>
                              
                              {/* Delete Action (Author Only) */}
                              {user.role === 'author' && (
                                <button onClick={() => handleDeleteTicket(ticket.id)} style={{ background: '#ef4444', width: 'auto', padding: '6px 10px', margin: 0, fontSize: '0.9em' }}>Delete</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No tickets found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;