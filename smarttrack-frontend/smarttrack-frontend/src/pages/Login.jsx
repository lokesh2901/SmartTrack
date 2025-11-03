import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import axios from "axios";

// --- Mobile Responsiveness Hook ---
/**
 * Custom hook to get the current window width.
 */
const useWindowSize = () => {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Cleanup listener on component unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return width;
};

// --- Constants ---
const API_BASE_URL = "https://smarttrack-khz8.onrender.com/api";
const MOBILE_BREAKPOINT = 768;

// UI Constants
const PRIMARY_COLOR = '#007bff';
const DANGER_COLOR = '#dc3545';
const FONT_COLOR = '#343a40';
const BACKGROUND_COLOR = '#f8f9fa';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // For error messages
  const navigate = useNavigate();

  // --- Responsive Hook ---
  const width = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  useEffect(() => {
    // If user is already logged in, redirect based on role
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      switch (user.role) {
        case "admin":
          navigate("/admin");
          break;
        case "hr":
          navigate("/hrm");
          break;
        case "employee":
          navigate("/employee");
          break;
        default:
          navigate("/");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToastMessage(null); // Clear previous errors

    try {
      const res = await axios.post(`${API_BASE_URL}/users/login`, {
        email,
        password,
      });

      const data = res.data;

      if (!data.user) {
        setToastMessage(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Save token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      switch (data.user.role) {
        case "admin":
          navigate("/admin");
          break;
        case "hr":
          navigate("/hrm");
          break;
        case "employee":
          navigate("/employee");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      if (error.response) {
        setToastMessage(error.response.data.message || "Login failed");
      } else if (error.request) {
        setToastMessage("No response from backend. Is the server running?");
      } else {
        setToastMessage("Something went wrong. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer(isMobile)}>
      <div style={styles.loginCard(isMobile)}>
        <h1 style={styles.title(isMobile)}>Login</h1>
        
        {/* Error Message Toast */}
        {toastMessage && (
            <div style={styles.toast(isMobile)}>
                {toastMessage}
            </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.formGroup(isMobile)}>
            <label style={styles.label(isMobile)}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input(isMobile)}
            />
          </div>
          <div style={styles.formGroup(isMobile)}>
            <label style={styles.label(isMobile)}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input(isMobile)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button(isMobile, loading)}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* --- FIX: Changed <a> to <Link> --- */}
        <div style={styles.linkContainer(isMobile)}>
          <Link to="/forgot-password" style={styles.link(isMobile)}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  pageContainer: (isMobile) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: BACKGROUND_COLOR,
    padding: isMobile ? '1rem' : '2rem',
    boxSizing: 'border-box',
  }),
  loginCard: (isMobile) => ({
    backgroundColor: 'white',
    padding: isMobile ? '1.5rem' : '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    width: '100%',
    maxWidth: '400px',
  }),
  title: (isMobile) => ({
    textAlign: 'center',
    color: PRIMARY_COLOR,
    marginBottom: '1.5rem',
    fontSize: isMobile ? '1.5rem' : '2rem',
  }),
  toast: (isMobile) => ({
    padding: '10px 15px',
    borderRadius: '4px',
    marginBottom: '1.5rem',
    fontSize: '0.95em',
    backgroundColor: '#f8d7da',
    color: DANGER_COLOR,
    border: `1px solid ${DANGER_COLOR}`,
    textAlign: 'center',
  }),
  formGroup: (isMobile) => ({
    marginBottom: '1rem',
  }),
  label: (isMobile) => ({
    display: 'block',
    marginBottom: '0.5rem',
    color: FONT_COLOR,
    fontWeight: '600',
  }),
  input: (isMobile) => ({
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  }),
  button: (isMobile, loading) => ({
    width: '100%',
    padding: '0.75rem',
    fontSize: '1.1rem',
    color: 'white',
    backgroundColor: PRIMARY_COLOR,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s, opacity 0.2s',
    opacity: loading ? 0.7 : 1,
  }),
  linkContainer: (isMobile) => ({
    marginTop: '1.5rem',
    textAlign: 'center',
  }),
  link: (isMobile) => ({
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontSize: '0.9rem',
    '&:hover': {
        textDecoration: 'underline',
    }
  }),
};

export default Login;
