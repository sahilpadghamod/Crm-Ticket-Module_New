<?php
include 'db.php';

// Allow requests from any origin (Update '*' to specific domain in production)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Get the HTTP method (GET, POST, etc.)
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON input for standard API requests
$input = json_decode(file_get_contents('php://input'), true);

function response($status, $message, $data = null) {
    echo json_encode(["status" => $status, "message" => $message, "data" => $data]);
    exit();
}

// 2. SYSTEM INITIALIZATION (Auto-Seeding)
// Auto-Seed Admin User
// Checks on every request if the default admin exists. 
// If not, it creates one. This ensures the system is never inaccessible.
 
$adminCheck = $conn->query("SELECT * FROM users WHERE email = 'admin@gmail.com'");
if ($adminCheck->num_rows == 0) {
    // Default password 'admin123' hashed using Bcrypt
    $hash = password_hash("admin123", PASSWORD_BCRYPT);
    $conn->query("INSERT INTO users (name, email, password, role) VALUES ('System Admin', 'admin@gmail.com', '$hash', 'admin')");
}

// 3. AUTHENTICATION MODULE
// Action: Register New User
// Method: POST
// Note: Forces role to 'user' for security reasons.

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'register') {
    $name = $input['name'];
    $email = $input['email'];
    // Hash password before storage
    $password = password_hash($input['password'], PASSWORD_BCRYPT);
    $role = 'user';

    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $password, $role);
    
    if ($stmt->execute()) response(true, "User registered successfully");
    else response(false, "Email already exists");
}

// Action: Login User
// Method: POST
// Logic: Verifies email exists and password hash matches.

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'login') {
    $email = $input['email'];
    $password = $input['password'];

    $stmt = $conn->prepare("SELECT id, name, role, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['password'])) {
            // Remove sensitive data before sending back to client
            unset($row['password']);
            response(true, "Login success", $row);
        }
    }
    response(false, "Invalid credentials");
}

// 4. USER MANAGEMENT MODULE (Admin/Author)
// Action: Fetch All Users
// Access: Admin Only
// Description: Returns a list of all users for the management dashboard.

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'all_users') {
    $result = $conn->query("SELECT id, name, email, role FROM users ORDER BY id DESC");
    $all_users = [];
    while ($row = $result->fetch_assoc()) $all_users[] = $row;
    response(true, "All users fetched", $all_users);
}


// Action: Update User Role
// Access: Admin Only
// Description: Promotes or demotes a user (User <-> Author).

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'update_user_role') {
    $id = $input['id'];
    $newRole = $input['new_role'];

    // Input Validation: Ensure only valid roles are applied
    if ($newRole !== 'admin' && $newRole !== 'author' && $newRole !== 'user') {
        response(false, "Invalid role");
    }

    $stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->bind_param("si", $newRole, $id);

    if ($stmt->execute()) response(true, "Role updated successfully");
    else response(false, "Failed to update role");
}

// Action: Delete User
// Access: Admin Only
// Logic: 
// 1. Protects the Super Admin from deletion.
// 2. Checks if user has active tickets (created or assigned) to preserve data integrity.

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete_user') {
    $id = $input['id'];
    
    // Safety Check: Prevent deleting the main admin
    $checkAdmin = $conn->query("SELECT email FROM users WHERE id = $id");
    $userData = $checkAdmin->fetch_assoc();
    if($userData['email'] === 'admin@gmail.com') {
        response(false, "Cannot delete the System Admin.");
    }

    // Integrity Check: Do not delete if they are involved in active tickets
    $checkTickets = $conn->prepare("SELECT COUNT(*) as ticket_count FROM tickets WHERE (assigned_to = ? OR created_by = ?) AND deleted_at IS NULL");
    $checkTickets->bind_param("ii", $id, $id);
    $checkTickets->execute();
    $result = $checkTickets->get_result();
    $row = $result->fetch_assoc();

    if ($row['ticket_count'] > 0) {
        response(false, "User has active tickets, cannot delete.");
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) response(true, "User deleted");
    else response(false, "Delete failed");
}

// Action: Fetch Assignable Users
// Access: Author
// Description: Fetches only users with role 'user' for the assignment dropdown.

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'users') {
    $result = $conn->query("SELECT id, name FROM users WHERE role = 'user'");
    $users = [];
    while ($row = $result->fetch_assoc()) $users[] = $row;
    response(true, "Users fetched", $users);
}

// 5. TICKET MANAGEMENT MODULE
// Action: Create Ticket
// Method: POST (Multipart/Form-Data)
// Description: Handles ticket creation and optional file attachment.

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'create_ticket') {
    // Access POST directly due to FormData format
    $title = $_POST['title'];
    $desc = $_POST['description'];
    $createdBy = $_POST['created_by'];
    $assignedTo = $_POST['assigned_to'];
    
    // File Upload Logic
    $filePath = "";
    if(isset($_FILES['file'])) {
        $targetDir = "uploads/";
        // Ensure directory exists
        if (!file_exists($targetDir)) mkdir($targetDir, 0777, true);
        
        $filePath = $targetDir . basename($_FILES["file"]["name"]);
        move_uploaded_file($_FILES["file"]["tmp_name"], $filePath);
    }

    $stmt = $conn->prepare("INSERT INTO tickets (title, description, file_path, created_by, assigned_to) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssii", $title, $desc, $filePath, $createdBy, $assignedTo);
    
    if($stmt->execute()) response(true, "Ticket created");
    else response(false, "Error creating ticket");
}


// Action: Fetch Tickets
// Logic: Returns tickets based on role permissions:
// Admin: Sees ALL tickets.
// Author: Sees tickets they CREATED.
// User: Sees tickets ASSIGNED to them.

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'tickets') {
    $userId = $_GET['user_id'];
    $role = $_GET['role'];

    if ($role === 'admin') {
        // Fetch all tickets + join user table for readable names
        $stmt = $conn->prepare("SELECT t.*, u1.name as author_name, u2.name as assigned_name FROM tickets t LEFT JOIN users u1 ON t.created_by = u1.id LEFT JOIN users u2 ON t.assigned_to = u2.id WHERE t.deleted_at IS NULL");
    } elseif ($role === 'author') {
        // Fetch tickets created by this author
        $stmt = $conn->prepare("SELECT t.*, u.name as assigned_name FROM tickets t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.created_by = ? AND t.deleted_at IS NULL");
        $stmt->bind_param("i", $userId);
    } else {
        // Fetch tickets assigned to this user
        $stmt = $conn->prepare("SELECT t.*, u.name as author_name FROM tickets t LEFT JOIN users u ON t.created_by = u.id WHERE t.assigned_to = ? AND t.deleted_at IS NULL");
        $stmt->bind_param("i", $userId);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $tickets = [];
    while ($row = $result->fetch_assoc()) $tickets[] = $row;
    response(true, "Tickets fetched", $tickets);
}


// Action: Update Ticket
// Description: 
//  Authors can update Title, Description, and Status.
//  Users can only update Status.

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'update_ticket') {
    $ticketId = $input['id'];
    $status = $input['status'];
    $role = $input['role'];

    if ($role === 'author') {
        $title = $input['title'];
        $desc = $input['description'];
        $stmt = $conn->prepare("UPDATE tickets SET title=?, description=?, status=? WHERE id=?");
        $stmt->bind_param("sssi", $title, $desc, $status, $ticketId);
    } else {
        $stmt = $conn->prepare("UPDATE tickets SET status=? WHERE id=?");
        $stmt->bind_param("si", $status, $ticketId);
    }
    if($stmt->execute()) response(true, "Ticket updated");
}

 // Action: Delete Ticket
 // Access: Author Only
 // Method: Soft Delete (Sets deleted_at timestamp)
 
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete_ticket') {
    $ticketId = $input['id'];
    $role = $input['role'];
    
    if ($role !== 'author') response(false, "Unauthorized");
    
    $stmt = $conn->prepare("UPDATE tickets SET deleted_at = NOW() WHERE id = ?");
    $stmt->bind_param("i", $ticketId);
    if($stmt->execute()) response(true, "Deleted");
}
?>