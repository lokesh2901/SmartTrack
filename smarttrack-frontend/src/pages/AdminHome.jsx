import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Navbar,
  Nav,
  Container,
  Button,
  Table,
  Modal,
  Form,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import MapView from "../components/MapView";

const API_URL = "https://smarttrack-backend-oo3q.onrender.com/api";

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  // ---------------------- FETCH DATA ----------------------
  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "offices") fetchOffices();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchOffices = async () => {
    try {
      const res = await axios.get(`${API_URL}/offices`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOffices(res.data);
    } catch (err) {
      console.error("Failed to fetch offices", err);
    }
  };

  // ---------------------- LOGOUT ----------------------
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ---------------------- CRUD HANDLERS ----------------------
  const handleAdd = () => {
    setEditMode(false);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedData(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    setSelectedData(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      if (activeTab === "users") {
        await axios.delete(`${API_URL}/users/${selectedData.id}`, { headers });
        fetchUsers();
      } else {
        await axios.delete(`${API_URL}/offices/${selectedData.id}`, { headers });
        fetchOffices();
      }
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSave = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      if (activeTab === "users") {
        if (editMode) {
          await axios.put(`${API_URL}/users/${selectedData.id}`, formData, { headers });
        } else {
          await axios.post(`${API_URL}/users`, formData, { headers });
        }
        fetchUsers();
      } else {
        if (editMode) {
          await axios.put(`${API_URL}/offices/${selectedData.id}`, formData, { headers });
        } else {
          await axios.post(`${API_URL}/offices`, formData, { headers });
        }
        fetchOffices();
      }
      setShowModal(false);
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ---------------------- RENDER ----------------------
  return (
    <div className="admin-dashboard">
      {/* NAVBAR */}
      <Navbar bg="dark" expand="lg" className="shadow-sm" variant="dark" sticky="top">
        <Container fluid>
          <Navbar.Brand className="fw-bold text-uppercase fs-5">
            SmartTrack Admin Panel
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link
                active={activeTab === "users"}
                onClick={() => setActiveTab("users")}
              >
                👥 Users
              </Nav.Link>
              <Nav.Link
                active={activeTab === "offices"}
                onClick={() => setActiveTab("offices")}
              >
                🏢 Offices
              </Nav.Link>
              <Nav.Link
                active={activeTab === "mapview"}
                onClick={() => setActiveTab("mapview")}
              >
                🗺️ Map View
              </Nav.Link>
            </Nav>
            <Button
              variant="outline-light"
              onClick={handleLogout}
              className="ms-auto"
            >
              🚪 Logout
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* CONTENT */}
      <Container fluid className="py-4">
        {/* USERS TAB */}
        {activeTab === "users" && (
          <section className="tab-content animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold text-secondary">User Management</h4>
              <Button variant="success" onClick={handleAdd}>
                + Add User
              </Button>
            </div>
            <Table striped bordered hover responsive className="shadow-sm bg-white">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u, i) => (
                    <tr key={u.id}>
                      <td>{i + 1}</td>
                      <td>{u.employee_id || "—"}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone_number || "—"}</td>
                      <td>{u.role}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() => handleEdit(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteClick(u)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        )}

        {/* OFFICES TAB */}
        {activeTab === "offices" && (
          <section className="tab-content animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold text-secondary">Office Management</h4>
              <Button variant="success" onClick={handleAdd}>
                + Add Office
              </Button>
            </div>
            <Table striped bordered hover responsive className="shadow-sm bg-white">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Radius</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offices.length > 0 ? (
                  offices.map((o, i) => (
                    <tr key={o.id}>
                      <td>{i + 1}</td>
                      <td>{o.name}</td>
                      <td>{o.latitude}</td>
                      <td>{o.longitude}</td>
                      <td>{o.radius} m</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() => handleEdit(o)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteClick(o)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No offices found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        )}

        {/* MAP VIEW TAB */}
        {activeTab === "mapview" && (
          <section className="tab-content animate__animated animate__fadeIn">
            <MapView offices={offices} />
          </section>
        )}
      </Container>

      {/* ADD / EDIT MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit" : "Add"}{" "}
            {activeTab === "users" ? "User" : "Office"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeTab === "users" ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Employee ID</Form.Label>
                <Form.Control
                  name="employee_id"
                  value={formData.employee_id || ""}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  placeholder="Enter email"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  name="role"
                  value={formData.role || ""}
                  onChange={handleChange}
                >
                  <option value="">Select role</option>
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </Form.Select>
              </Form.Group>
            </>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Office Name</Form.Label>
                <Form.Control
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="Enter office name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Latitude</Form.Label>
                <Form.Control
                  name="latitude"
                  value={formData.latitude || ""}
                  onChange={handleChange}
                  placeholder="Enter latitude"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Longitude</Form.Label>
                <Form.Control
                  name="longitude"
                  value={formData.longitude || ""}
                  onChange={handleChange}
                  placeholder="Enter longitude"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Radius (m)</Form.Label>
                <Form.Control
                  name="radius"
                  value={formData.radius || ""}
                  onChange={handleChange}
                  placeholder="Enter radius in meters"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {editMode ? "Update" : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeTab === "users" ? (
            <p>
              Are you sure you want to delete <strong>{selectedData?.name}</strong> (
              {selectedData?.email})?
            </p>
          ) : (
            <p>
              Are you sure you want to delete the office{" "}
              <strong>{selectedData?.name}</strong>?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* FOOTER */}
      <footer className="bg-dark text-light text-center py-2 mt-auto">
        <small>© 2025 SmartTrack Attendance — All Rights Reserved</small>
      </footer>

      {/* STYLES */}
      <style>{`
        .admin-dashboard {
          background-color: #f5f6fa;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .table tbody tr:hover {
          background-color: #f1f1f1;
        }
        .tab-content {
          animation: fadeIn 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          h4 { font-size: 1.1rem; }
          .btn { font-size: 0.85rem; padding: 6px 10px; }
          .navbar-brand { font-size: 1rem; }
          .table td { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
