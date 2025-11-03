import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet"; 
import L from "leaflet";
import axios from "axios";
import 'leaflet/dist/leaflet.css'; 
import officeMarkerImage from '../assets/office.png';
import userMarkerImage from '../assets/user.png';
// --- Calendar Imports for MyAttendance Component ---
import Calendar from 'react-calendar'; 
import 'react-calendar/dist/Calendar.css'; 

// --- Configuration and Constants ---
const API_BASE_URL = "https://smarttrack-khz8.onrender.com/api";
const MOBILE_BREAKPOINT = 768; // Screens smaller than 768px are considered mobile

// UI Constants
const PRIMARY_COLOR = '#007bff';
const SUCCESS_COLOR = '#28a745';
const DANGER_COLOR = '#dc3545';
const WARNING_COLOR = '#ffc107';
const FONT_COLOR = '#343a40';
const BACKGROUND_COLOR = '#f8f9fa';

// Office Marker
const blueIcon = new L.Icon({
  iconUrl: officeMarkerImage,
  iconSize: [60, 62],
  iconAnchor: [25, 40],
  popupAnchor: [0, -35],
});

// User Marker
const userPinIcon = new L.Icon({
  iconUrl: userMarkerImage,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -35],
});

// --- Mobile Responsiveness Hook ---
/**
 * Custom hook to get the current window width.
 * This allows components to adapt their styles for mobile.
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


// Geolocation and Map Helpers 
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine formula to calculate distance in meters
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 18);
    }
  }, [center, map]);
  return null;
};


// ----------------------------------------------------------------------
// --- 1. HOME / CHECK-IN / CHECK-OUT PAGE ---
// ----------------------------------------------------------------------

const CheckInOutPage = () => {
  const [allOffices, setAllOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentDayStatus, setCurrentDayStatus] = useState("Loading Status...");
  const [statusMessage, setStatusMessage] = useState("Ready for action.");
  const [toast, setToast] = useState({ 
    message: "", 
    isVisible: false, 
    isError: false 
  });

  // --- Responsive Hook ---
  const width = useWindowSize();
  const isMobile = width < MOBILE_BREAKPOINT;

  const token = localStorage.getItem("token");

  // --- Geolocation & Pop-up Functions ---
  const getLocation = () => { 
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation is not supported by your browser."));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        }
      );
    });
  };

  const fetchUserLocation = async () => {
    try {
      const location = await getLocation();
      setCurrentLocation([location.latitude, location.longitude]);
    } catch (err) {
      console.warn(err.message);
    }
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isVisible: true, isError });
    setTimeout(() => {
      setToast({ message: "", isVisible: false, isError: false });
    }, 3000);
  };

  // Fetch All Office Data AND Current Status on load
  useEffect(() => {
    const fetchData = async () => {
      fetchUserLocation();
      try {
        // 1. Fetch All Offices
        const officeRes = await axios.get(`${API_BASE_URL}/offices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (officeRes.data && officeRes.data.length > 0) {
          setAllOffices(officeRes.data);
        } else {
          showToast("No offices found in the database.", true);
        }

        // 2. Fetch Today's Attendance Status
        const statusRes = await axios.get(`${API_BASE_URL}/attendance/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const status = statusRes.data.status || 'Absent';
        setCurrentDayStatus(status);

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        showToast("Failed to fetch initial data.", true);
        setCurrentDayStatus("Unknown (Error)");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);


  // --- Attendance Handling Logic ---
  const handleAttendance = async (type) => {
    if (allOffices.length === 0) return showToast("Office location data is missing.", true);
    setStatusMessage(`Attempting to ${type}...`);

    try {
      const location = await getLocation();
      const { latitude: userLat, longitude: userLon } = location;
      setCurrentLocation([userLat, userLon]); 

      // Find the closest valid office
      let closestValidOffice = null;
      for (const office of allOffices) {
        const distance = calculateDistance(userLat, userLon, office.latitude, office.longitude);
        if (distance <= office.radius) {
          closestValidOffice = office;
          break; 
        }
      }

      if (!closestValidOffice) {
        const msg = `You are not within the radius of any registered office to ${type}.`;
        showToast(msg, true);
        setStatusMessage("Failed: Too far from any office.");
        return;
      }

      // API Call to Check In/Out
      const res = await axios.post(
        `${API_BASE_URL}/attendance/${type.toLowerCase().replace(' ', '')}`,
        { latitude: userLat, longitude: userLon },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const successMsg = `${type} successful! Message: ${res.data.message}`;
      showToast(successMsg, false);
      setStatusMessage(`${successMsg} at ${closestValidOffice.name}.`);
      setCurrentDayStatus(type === "Check In" ? "Checked In" : "Checked Out");

    } catch (err) {
      console.error(`Failed to ${type}:`, err.response ? err.response.data : err);
      
      const errorMessage = err.response?.data?.message || err.message || "Please check console for details.";
      
      showToast(`Error during ${type}: ${errorMessage}`, true);
      setStatusMessage(`Failed to ${type}. Reason: ${errorMessage}`);
    }
  };


  // --- JSX Render ---
  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Map and Status...</div>;
  if (allOffices.length === 0) return <div style={{ textAlign: 'center', padding: '50px' }}>No office data available</div>;

  const firstOffice = allOffices[0];
  const initialCenter = [firstOffice.latitude, firstOffice.longitude];

  const getStatusColor = (status) => {
    if (status === 'Checked In') return SUCCESS_COLOR;
    if (status === 'Checked Out') return PRIMARY_COLOR; 
    if (status === 'Absent') return DANGER_COLOR;
    return WARNING_COLOR;
  };

  return (
    <div style={styles.card(isMobile)}>
      
      {/* Toast Notification */}
      {toast.isVisible && (
        <div style={{
          ...styles.toast(isMobile),
          backgroundColor: toast.isError ? DANGER_COLOR : SUCCESS_COLOR, 
        }}>
          {toast.message}
        </div>
      )}
      
      <h3 style={styles.cardTitle(isMobile)}>📍 Geolocation Check-in/out</h3>

      {/* Map Container */}
      <div style={styles.mapContainer(isMobile)}>
        <MapContainer
          key={firstOffice.latitude} 
          center={initialCenter}
          zoom={55} 
          scrollWheelZoom={true}
          style={styles.mapStyle(isMobile)} 
        >
          <RecenterMap center={currentLocation} />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {allOffices.map((office) => {
            const officePosition = [office.latitude, office.longitude];
            return (
              <React.Fragment key={office.id}>
                <Marker position={officePosition} icon={blueIcon}>
                  <Popup>
                    <strong>{office.name}</strong> 
                    <br />
                    Radius: {office.radius}m
                  </Popup>
                </Marker>
                <Circle
                  center={officePosition}
                  radius={office.radius}
                  pathOptions={{ color: SUCCESS_COLOR, fillColor: SUCCESS_COLOR, fillOpacity: 0.2 }}
                />
              </React.Fragment>
            );
          })}
        
          {currentLocation && (
            <Marker position={currentLocation} icon={userPinIcon}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div style={styles.statusBox(isMobile)}>
        <p style={{ margin: '0 0 5px 0' }}>
          <strong>Today's Status:</strong> <span style={{ color: getStatusColor(currentDayStatus), fontWeight: '600', marginLeft: '10px' }}>
            {currentDayStatus}
          </span>
        </p>
        <p style={{ margin: 0, fontSize: '0.9em', color: '#6c757d' }}><strong>Action Status:</strong> {statusMessage}</p>
      </div>

      {/* Check-in / Check-out buttons */}
      <div style={styles.buttonGroup(isMobile)}>
        <button 
          onClick={() => handleAttendance("Check In")}
          style={{ ...styles.button(isMobile), backgroundColor: SUCCESS_COLOR }}
          disabled={currentDayStatus === 'Checked In'}
        >
          ✅ Check In
        </button>
        <button 
          onClick={() => handleAttendance("Check Out")}
          style={{ ...styles.button(isMobile), backgroundColor: DANGER_COLOR }}
          disabled={currentDayStatus === 'Checked Out' || currentDayStatus !== 'Checked In'}
        >
          🚪 Check Out
        </button>
      </div>
    </div>
  );
};


// ----------------------------------------------------------------------
// --- 2. ATTENDANCE PAGE (LOGS BY DATE) - WITH EXPORT FEATURE ---
// ----------------------------------------------------------------------

const MyAttendance = () => {
    // State for single-day view
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [dailyAttendanceData, setDailyAttendanceData] = useState(null); 
    
    // State for date range export (NEW)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    // General UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState("Ready for export.");
    const [isToastError, setIsToastError] = useState(false);
    
    // --- Responsive Hook ---
    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;

    const token = localStorage.getItem("token");

    /**
     * Helper to format the date to YYYY-MM-DD for the API
     */
    const formatDateForApi = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const showStatusMessage = (message, isError = false) => {
        setIsToastError(isError);
        setToastMessage(message);
        setTimeout(() => setToastMessage("Ready for export."), 5000);
    };

    /**
     * Function to fetch attendance logs for a specific date
     */
    const fetchAttendanceLog = async (date) => {
        setLoading(true);
        setError(null);
        setDailyAttendanceData(null); 

        const formattedDate = formatDateForApi(date);

        try {
            const response = await axios.get(
                `${API_BASE_URL}/attendance/logs?date=${formattedDate}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            // Store the entire { logs, summary } object
            setDailyAttendanceData(response.data); 

        } catch (err) {
            console.error("Failed to fetch attendance log:", err.response?.data || err.message);
            setError(`Failed to fetch log: ${err.response?.data?.message || 'Server error'}`);
            setDailyAttendanceData(null);
        } finally {
            setLoading(false);
        }
    };
    
    // --- Daily Export Function (Renamed) ---
    const handleDailyExport = async () => {
        setLoading(true);
        setError(null);
        const formattedDate = formatDateForApi(selectedDate);
        
        try {
            const response = await axios.get(
                `${API_BASE_URL}/attendance/export-daily?date=${formattedDate}`, // ⭐ Existing API Route
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob', // Expecting a file (binary data)
                }
            );

            // 1. Create a link element for download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // 2. Set the filename 
            link.setAttribute('download', `attendance_log_daily_${formattedDate}.xlsx`);
            
            // 3. Trigger the download
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            showStatusMessage(`Daily log exported successfully for ${formattedDate}.`, false);
            
        } catch (err) {
            console.error("Failed to export daily log:", err.response ? err.response.data : err);
            
            let message = "An unexpected error occurred during daily export.";
            if (err.response?.status === 404) {
                message = `No logs found for ${formattedDate} to export.`;
            } else if (err.response?.data) {
                message = `Error exporting: ${err.message}`;
            }

            setError(message);
            showStatusMessage(message, true);
        } finally {
            setLoading(false);
        }
    };

    // ⭐ NEW FUNCTION: Handle Date Range Export
    const handleRangeExport = async () => {
        if (startDate > endDate) {
            showStatusMessage("Start Date cannot be after End Date.", true);
            return;
        }

        setLoading(true);
        setError(null);
        
        const start = formatDateForApi(startDate);
        const end = formatDateForApi(endDate);
        
        try {
            const response = await axios.get(
                `${API_BASE_URL}/attendance/export/mine?start=${start}&end=${end}`, // ⭐ New API Route
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob', // Expecting a file (binary data)
                }
            );

            // 1. Create a link element for download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // 2. Set the filename 
            link.setAttribute('download', `attendance_log_range_${start}_to_${end}.xlsx`);
            
            // 3. Trigger the download
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            showStatusMessage(`Range log exported successfully from ${start} to ${end}.`, false);
            
        } catch (err) {
            console.error("Failed to export range log:", err.response ? err.response.data : err);
            
            let message = "An unexpected error occurred during range export.";
            if (err.response?.status === 404) {
                message = `No logs found between ${start} and ${end} to export.`;
            } else if (err.response?.data) {
                message = `Error exporting: ${err.message}`;
            }

            setError(message);
            showStatusMessage(message, true);
        } finally {
            setLoading(false);
        }
    };


    // --- useEffect Hook: Re-run when selectedDate changes ---
    useEffect(() => {
        if (selectedDate) {
            fetchAttendanceLog(selectedDate);
        }
    }, [selectedDate, token]);


    // --- Handlers ---
    const handleCalendarDateChange = (date) => {
        setSelectedDate(date); // This triggers the useEffect to re-fetch data
    };
    
    // Default empty structure for safe destructuring
    const { logs, summary } = dailyAttendanceData || { logs: [], summary: {} };

    // --- Helper to get status color for display ---
    const getStatusColor = (status) => {
        switch (status) {
            case 'Full Day': return SUCCESS_COLOR;
            case 'Half Day': return WARNING_COLOR;
            case 'LOP': return DANGER_COLOR;
            case 'Checked In': return PRIMARY_COLOR;
            default: return FONT_COLOR;
        }
    };


    // --- JSX Render ---
    return (
        <div style={styles.card(isMobile)}>
            <h3 style={styles.cardTitle(isMobile)}>📅 My Attendance Logs & Export</h3>

            {/* Range Export Section (NEW) */}
            <div style={logStyles.rangeExportBox(isMobile)}>
                <h4 style={{ color: PRIMARY_COLOR, marginBottom: '15px' }}>Export Logs by Date Range</h4>
                <div style={logStyles.rangeInputs(isMobile)}>
                    <div style={logStyles.dateInputGroup(isMobile)}>
                        <label>Start Date:</label>
                        <input 
                            type="date"
                            value={formatDateForApi(startDate)}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                            max={formatDateForApi(today)}
                            style={logStyles.dateInput(isMobile)}
                        />
                    </div>
                    <div style={logStyles.dateInputGroup(isMobile)}>
                        <label>End Date:</label>
                        <input 
                            type="date"
                            value={formatDateForApi(endDate)}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                            max={formatDateForApi(today)}
                            style={logStyles.dateInput(isMobile)}
                        />
                    </div>
                    <button 
                        onClick={handleRangeExport}
                        style={logStyles.rangeExportButton(isMobile)}
                        disabled={loading || startDate > endDate}
                    >
                        ⬇️ Export Range Logs
                    </button>
                </div>
            </div>

            {/* Status Message */}
            <div style={{...logStyles.statusMessage(isMobile), backgroundColor: isToastError ? '#f8d7da' : '#d4edda', color: isToastError ? DANGER_COLOR : SUCCESS_COLOR, border: isToastError ? `1px solid ${DANGER_COLOR}` : `1px solid ${SUCCESS_COLOR}`}}>
                <strong>Status:</strong> {toastMessage}
            </div>

            <div style={logStyles.container(isMobile)}>
                {/* Left Side: Calendar View */}
                <div style={logStyles.calendarWrapper(isMobile)}>
                    <Calendar 
                        onChange={handleCalendarDateChange} 
                        value={selectedDate} 
                        maxDate={new Date()} // Prevent selecting future dates
                    />
                    
                    {/* Daily Export Button (relocated) */}
                    <button 
                        onClick={handleDailyExport}
                        style={{...logStyles.exportButton(isMobile), marginTop: '10px'}}
                        disabled={loading || logs.length === 0}
                    >
                        ⬇️ Export Selected Day Log
                    </button>

                </div>

                {/* Right Side: Log Details */}
                <div style={logStyles.detailsWrapper(isMobile)}>
                    
                    {/* HEADER ROW */}
                    <div style={logStyles.headerRow(isMobile)}> 
                        <h4>Details for: **{formatDateForApi(selectedDate)}**</h4>
                    </div>

                    {loading && <p style={{ color: PRIMARY_COLOR }}>Loading attendance data...</p>}
                    
                    {error && <p style={{ color: DANGER_COLOR }}>Error: {error}</p>}

                    {!loading && !error && (
                        logs.length > 0 ? (
                            <>
                                {/* --- DAILY SUMMARY CARD --- */}
                                <div style={logStyles.summaryBox(isMobile)}>
                                    <p style={{ margin: 0, fontSize: '1.2em' }}>
                                        <strong>Day Status:</strong> <span style={{ color: getStatusColor(summary.day_status), fontWeight: '600', marginLeft: '10px' }}>
                                            {summary.day_status}
                                        </span>
                                    </p>
                                    <p style={logStyles.summaryItem(isMobile)}>
                                        <strong>Overall Status:</strong> <span style={logStyles.timeValue(isMobile)}>{summary.overall_status}</span>
                                    </p>
                                    <p style={logStyles.summaryItem(isMobile)}>
                                        <strong>Total Hours Worked:</strong> <span style={logStyles.timeValue(isMobile)}>{summary.total_hours_sum} hrs</span>
                                    </p>
                                    <p style={logStyles.summaryItem(isMobile)}>
                                        <strong>Net Overtime:</strong> <span style={{ 
                                            ...logStyles.timeValue(isMobile), 
                                            color: summary.total_overtime_sum >= 0 ? SUCCESS_COLOR : DANGER_COLOR 
                                        }}>
                                            {summary.total_overtime_sum} hrs
                                        </span>
                                    </p>
                                </div>
                                
                                {/* --- SEGMENT LOGS LIST --- */}
                                <h5>Check-in/out Segments:</h5>
                                <div style={logStyles.logsList(isMobile)}>
                                    {logs.map((log, index) => (
                                        <div key={log.id} style={logStyles.logDetailBox(isMobile)}>
                                            <p style={{ fontWeight: 'bold' }}>Segment {index + 1} - {log.status}</p>
                                            <p>
                                                <strong>Check In:</strong> <span style={logStyles.timeValue(isMobile)}>
                                                    {log.check_in_time_ist || 'N/A'}
                                                </span>
                                            </p>
                                            <p>
                                                <strong>Check Out:</strong> <span style={logStyles.timeValue(isMobile)}>
                                                    {log.check_out_time_ist || 'N/A'}
                                                </span>
                                            </p>
                                            <p>
                                                <strong>Check-in Office:</strong> <span style={logStyles.officeValue(isMobile)}>
                                                    {log.checkin_office_name || 'N/A'} 
                                                </span>
                                            </p>
                                            <p>
                                                <strong>Check-out Office:</strong> <span style={logStyles.officeValue(isMobile)}>
                                                    {log.check_out_time_ist ? (log.checkout_office_name || 'N/A') : 'In Session'} 
                                                </span>
                                            </p>
                                            <p>
                                                <strong>Segment Duration:</strong> <span style={logStyles.timeValue(isMobile)}>
                                                    {log.total_hours} hrs
                                                </span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={logStyles.noLog(isMobile)}>
                                <p>No attendance log found for this date. ({summary.day_status || 'Absent'})</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------
// --- 3. PROFILE PAGE ---
// ----------------------------------------------------------------------

const EmployeeProfile = () => {
    // Fetches the user object from local storage
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const navigate = useNavigate();

    // --- Responsive Hook ---
    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/"); 
    };

    return (
        <div style={{...styles.card(isMobile), maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={styles.cardTitle(isMobile)}>👤 Employee Profile</h3>
            
            {/* Display Employee Details from the 'user' object */}
            <div style={styles.profileDetail(isMobile)}>
                <p><strong>Name:</strong></p> <p>{user.name || 'N/A'}</p>
            </div>
            <div style={styles.profileDetail(isMobile)}>
                <p><strong>Employee ID:</strong></p> <p>{user.employee_id || 'N/A'}</p>
            </div>
            <div style={styles.profileDetail(isMobile)}>
                <p><strong>Email:</strong></p> <p>{user.email || 'N/A'}</p>
            </div>
            <div style={styles.profileDetail(isMobile)}>
                <p><strong>Role:</strong></p> <p style={{ textTransform: 'capitalize' }}>{user.role || 'employee'}</p>
            </div>
            <div style
={styles.profileDetail(isMobile)}>
                <p><strong>Office Location:</strong></p> <p>{user.office_location || 'Not Assigned'}</p>
            </div>
            
            <button 
                onClick={handleLogout} 
                style={{ ...styles.button(isMobile), backgroundColor: '#6c757d', marginTop: '30px', width: '100%' }}
            >
                Log Out
            </button>
        </div>
    );
};


// ----------------------------------------------------------------------
// --- STYLES OBJECT (NOW AS FUNCTIONS) ---
// ----------------------------------------------------------------------

const styles = {
    // Global Layout
    appContainer: (isMobile) => ({
        fontFamily: 'Arial, sans-serif',
        backgroundColor: BACKGROUND_COLOR,
        minHeight: '100vh',
    }),
    contentArea: (isMobile) => ({
        padding: isMobile ? '15px 10px' : '30px 10px',
        maxWidth: '900px',
        margin: '0 auto',
    }),
    
    // Navigation Bar
    navContainer: (isMobile) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px',
        padding: isMobile ? '10px' : '15px 30px',
        backgroundColor: 'white',
        borderBottom: `3px solid ${PRIMARY_COLOR}`,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        maxWidth: '100%',
        margin: '0 auto',
        overflowX: isMobile ? 'auto' : 'visible', // Allow horizontal scroll on mobile
    }),
    navItemBase: (isMobile) => ({
        padding: isMobile ? '8px 12px' : '10px 15px',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: '500',
        transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
        fontSize: isMobile ? '0.9em' : '1em',
        border: '1px solid transparent',
        color: FONT_COLOR,
        whiteSpace: 'nowrap', // Prevent nav items from breaking line
    }),
    navItemActive: (isMobile) => ({
        backgroundColor: PRIMARY_COLOR,
        color: 'white',
        borderColor: PRIMARY_COLOR,
    }),
    welcomeText: (isMobile) => ({
        marginLeft: 'auto',
        fontWeight: 'normal',
        color: FONT_COLOR,
        padding: '0.75rem 0',
        fontSize: isMobile ? '0.8em' : '0.9em',
        whiteSpace: 'nowrap', // Prevent wrapping
        paddingLeft: '10px',
    }),
    
    // Cards & Content
    card: (isMobile) => ({
        backgroundColor: 'white',
        padding: isMobile ? '15px' : '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        marginBottom: '30px',
    }),
    cardTitle: (isMobile) => ({
        borderBottom: `2px solid ${BACKGROUND_COLOR}`,
        paddingBottom: '10px',
        marginBottom: '20px',
        color: PRIMARY_COLOR,
        fontWeight: '600',
        fontSize: isMobile ? '1.2em' : '1.5em',
    }),
    
    // Map & Status
    mapContainer: (isMobile) => ({
        height: isMobile ? "300px" : "400px", 
        width: "100%", 
        marginBottom: "20px",
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${BACKGROUND_COLOR}`,
    }),
    mapStyle: (isMobile) => ({ 
        height: "100%", 
        width: "100%" 
    }),
    statusBox: (isMobile) => ({
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '20px',
        borderLeft: `5px solid ${PRIMARY_COLOR}`
    }),
    
    // Buttons
    buttonGroup: (isMobile) => ({
        display: "flex", 
        flexDirection: isMobile ? 'column' : 'row', // Stack buttons on mobile
        gap: "15px", 
        marginBottom: "20px"
    }),
    button: (isMobile) => ({
        flex: isMobile ? '1 1 auto' : 1, // Allow buttons to grow/shrink in column
        padding: "12px", 
        fontSize: "1.1em", 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'opacity 0.2s'
    }),
    
    // Profile (Updated for better detail presentation)
    profileDetail: (isMobile) => ({
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '150px 1fr', // Stack on mobile
        gap: isMobile ? '5px 10px' : '0 10px', // Add row gap on mobile
        padding: '12px 0',
        borderBottom: `1px solid #e9ecef`,
        fontSize: '1em',
        color: FONT_COLOR,
        // On mobile, the first <p> (label) will be on row 1, second <p> (value) on row 2
    }),
    
    // Toast (CheckInOutPage only)
    toast: (isMobile) => ({
        position: 'fixed',
        top: '10px', // Closer to top on mobile
        right: '10px',
        left: isMobile ? '10px' : 'auto', // Full width on mobile
        padding: '15px 20px',
        color: 'white',
        borderRadius: '6px',
        zIndex: 1000, 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        opacity: 1,
        textAlign: 'center',
    }),
};

// --- New/Updated Styles for Attendance Page ---
const logStyles = {
    // ⭐ NEW STYLE: Range Export container
    rangeExportBox: (isMobile) => ({
        padding: isMobile ? '15px' : '20px',
        backgroundColor: '#f1f8ff',
        borderRadius: '8px',
        marginBottom: '30px',
        border: `1px solid ${PRIMARY_COLOR}`,
    }),
    // ⭐ NEW STYLE: Date range inputs
    rangeInputs: (isMobile) => ({
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row', // Stack inputs on mobile
        gap: isMobile ? '15px' : '20px',
        alignItems: isMobile ? 'stretch' : 'flex-end', // Stretch inputs full-width on mobile
    }),
    dateInputGroup: (isMobile) => ({
        display: 'flex',
        flexDirection: 'column',
        minWidth: isMobile ? '100%' : '150px',
        flexGrow: 1,
    }),
    dateInput: (isMobile) => ({
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '1em',
        marginTop: '5px',
        width: '100%', // Ensure input takes full width of its container
        boxSizing: 'border-box', // Include padding in width
    }),
    // ⭐ NEW STYLE: Range Export button
    rangeExportButton: (isMobile) => ({
        padding: "10px 20px", 
        fontSize: "1em", 
        color: 'white',
        backgroundColor: PRIMARY_COLOR, // Blue for range export
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'opacity 0.2s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        width: isMobile ? '100%' : 'auto', // Full width on mobile
    }),
    statusMessage: (isMobile) => ({
        padding: '10px 15px',
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '0.95em',
    }),
    container: (isMobile) => ({
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row', // Stack calendar and details on mobile
        gap: '30px',
        alignItems: 'flex-start',
    }),
    calendarWrapper: (isMobile) => ({
        flexShrink: 0, 
        width: isMobile ? '100%' : 'auto', // Calendar takes full width on mobile
        maxWidth: isMobile ? '400px' : 'none', // Limit calendar max width on mobile
        margin: isMobile ? '0 auto' : '0', // Center calendar on mobile
    }),
    detailsWrapper: (isMobile) => ({
        flexGrow: 1,
        minWidth: isMobile ? '100%' : '300px', // Details take full width on mobile
        padding: isMobile ? '0' : '10px',
    }),
    // Daily Export Button (relocated/renamed)
    exportButton: (isMobile) => ({ 
        padding: "10px 15px", 
        fontSize: "1em", 
        color: 'white',
        backgroundColor: SUCCESS_COLOR, 
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'opacity 0.2s',
        whiteSpace: 'nowrap',
        width: '100%',
    }),
    headerRow: (isMobile) => ({ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    }),
    summaryBox: (isMobile) => ({
        border: `1px solid ${PRIMARY_COLOR}`,
        padding: isMobile ? '15px' : '20px',
        borderRadius: '6px',
        backgroundColor: '#eaf4ff', 
        marginBottom: '20px',
    }),
    summaryItem: (isMobile) => ({
        margin: '5px 0',
        fontSize: '1em',
    }),
    logDetailBox: (isMobile) => ({
        border: `1px solid ${BACKGROUND_COLOR}`,
        padding: '15px',
        borderRadius: '6px',
        backgroundColor: '#f8f8ff',
        marginBottom: '10px',
        borderLeft: `3px solid ${WARNING_COLOR}`
    }),
    logsList: (isMobile) => ({
        maxHeight: isMobile ? '300px' : '400px', // Shorter list on mobile
        overflowY: 'auto',
        paddingRight: '10px' 
    }),
    noLog: (isMobile) => ({
        padding: '20px',
        textAlign: 'center',
        color: FONT_COLOR,
        border: `1px dashed ${WARNING_COLOR}`,
        borderRadius: '6px',
    }),
    timeValue: (isMobile) => ({
        fontWeight: 'bold',
        marginLeft: '10px',
        color: PRIMARY_COLOR,
    }),
    officeValue: (isMobile) => ({
        fontWeight: 'bold',
        marginLeft: '10px',
        color: FONT_COLOR,
    })
};

// ----------------------------------------------------------------------
// --- MAIN EMPLOYEE DASHBOARD COMPONENT ---
// ----------------------------------------------------------------------

const EmployeeDashboard = () => {
    // Get user and navigation data
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const location = useLocation();

    // --- Responsive Hook ---
    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;

    // Protection: Redirect if no user data
    if (!user) {
        // Use useEffect to avoid state update during render
        useEffect(() => {
            navigate("/");
        }, [navigate]);
        return null; 
    }
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/"); 
    };

    /**
     * Helper to apply active/inactive styles to nav links
     */
    const getNavItemStyle = (path) => {
        // Check if current URL ends with the path or is the default '/' route
        const isActive = location.pathname.endsWith(path) || (path === 'home' && (location.pathname.endsWith('/employee') || location.pathname.endsWith('/employee/')));
        
        return isActive 
            ? { ...styles.navItemBase(isMobile), ...styles.navItemActive(isMobile) }
            : { ...styles.navItemBase(isMobile), backgroundColor: '#e9ecef', color: FONT_COLOR };
    };


    return (
        <div style={styles.appContainer(isMobile)}>
            {/* 1. Navigation Bar */}
            <nav style={styles.navContainer(isMobile)}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2em', color: PRIMARY_COLOR, marginRight: '15px' }}>
                    ATTENDANCE PORTAL
                </div>

                <Link to="/employee/home" style={getNavItemStyle('home')}>
                    🏠 Home
                </Link>
                <Link to="/employee/attendance" style={getNavItemStyle('attendance')}>
                    📅 My Attendance
                </Link>
                <Link to="/employee/profile" style={getNavItemStyle('profile')}>
                    👤 Profile
                </Link>
                
                <div style={styles.welcomeText(isMobile)}>
                    Welcome, <strong>{user.name}</strong>
                </div>

                <button 
                    onClick={handleLogout} 
                    style={{ ...styles.button(isMobile), backgroundColor: DANGER_COLOR, padding: "8px 15px", flex: 'initial' }}
                >
                    Logout
                </button>
            </nav>

            {/* 2. Content Area - ROUTING */}
            <div style={styles.contentArea(isMobile)}>
                <Routes>
                    
                    {/* 1. Default Route (matches /employee/) - Uses 'index' for priority */}
                    <Route index element={<CheckInOutPage />} /> 
                    
                    {/* 2. Explicit Home Route (matches /employee/home) */}
                    <Route path="home" element={<CheckInOutPage />} /> 
                    
                    {/* 3. My Attendance Route (matches /employee/attendance) */}
                    <Route path="attendance" element={<MyAttendance />} /> 
                    
                    {/* 4. Profile Route (matches /employee/profile) */}
                    <Route path="profile" element={<EmployeeProfile />} /> 
                    
                </Routes>
            </div>
        </div>
    );
};

export default EmployeeDashboard;

