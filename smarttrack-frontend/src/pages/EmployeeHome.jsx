import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet"; 
import L from "leaflet";
import axios from "axios"; 
import 'leaflet/dist/leaflet.css'; 
import officeMarkerImage from '../assets/office.png';
import userMarkerImage from '../assets/user.png';
import Calendar from 'react-calendar'; 
import 'react-calendar/dist/Calendar.css'; 

// ===================================================================
// --- 1. CONFIGURATION, CONSTANTS, AND HELPERS ---
// ===================================================================

const API_BASE_URL = "https://smarttrack-backend-oo3q.onrender.com/api";
const MOBILE_BREAKPOINT = 768;

// UI Constants
const PRIMARY_COLOR = '#007bff';
const SUCCESS_COLOR = '#28a745';
const DANGER_COLOR = '#dc3545';
const WARNING_COLOR = '#ffc107';
const FONT_COLOR = '#343a40';
const BACKGROUND_COLOR = '#f8f9fa';

// --- ⭐ ROBUSTNESS FIX: AXIOS API INSTANCE WITH INTERCEPTOR ---
const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized request. Token may be expired. Logging out.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Force a redirect to the login page (ensure your app handles this route)
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

// --- Leaflet Icons ---
const blueIcon = new L.Icon({
  iconUrl: officeMarkerImage,
  iconSize: [60, 62],
  iconAnchor: [25, 40],
  popupAnchor: [0, -35],
});

const userPinIcon = new L.Icon({
  iconUrl: userMarkerImage,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -35],
});

// --- Mobile Responsiveness Hook ---
const useWindowSize = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
};

// --- Geolocation and Map Helpers ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
      map.flyTo(center, 18); // Zoom in close (18 is good)
    }
  }, [center, map]);
  return null;
};


// ===================================================================
// --- 2. PAGE COMPONENTS ---
// ===================================================================

// -------------------------------------------------------------------
// --- 2A. HOME / CHECK-IN / CHECK-OUT PAGE (FULLY FIXED) ---
// -------------------------------------------------------------------

const CheckInOutPage = () => {
    const [allOffices, setAllOffices] = useState([]);
    
    // ⭐ FIX: Use separate loading states
    const [pageLoading, setPageLoading] = useState(true); // For initial page load
    const [actionLoading, setActionLoading] = useState(false); // For button clicks

    const [currentLocation, setCurrentLocation] = useState(null);
    const [currentDayStatus, setCurrentDayStatus] = useState("Loading Status...");
    const [statusMessage, setStatusMessage] = useState("Ready for action.");
    const [toast, setToast] = useState({ 
      message: "", 
      isVisible: false, 
      isError: false 
    });

    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;
    const token = localStorage.getItem("token");

    // --- Geolocation Speed Fix Applied ---
    const getLocation = () => { 
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation is not supported by your browser."));
        }
        
        const options = {
          enableHighAccuracy: false, // Faster results
          timeout: 5000,           
          maximumAge: 60000          // Use cached position if recent
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          (error) => {
            reject(new Error(`Geolocation error: ${error.message}`));
          },
          options
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
    
    // --- New Function: Fetch Current Status with Debugging ---
    const fetchCurrentStatus = async () => {
        try {
            const statusRes = await api.get('/attendance/status', {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            const status = statusRes.data.status || 'Absent';
            
            // ⭐ DEBUG LOG: This is key for confirming the backend status
            console.log("API Current Status:", status);
            
            setCurrentDayStatus(status);
            return status;
        } catch (err) {
            console.error("Failed to fetch current status:", err);
            setCurrentDayStatus("Unknown (Error)");
            return "Unknown";
        }
    };
    
    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            fetchUserLocation(); 
            try {
                const officeRes = await api.get('/offices', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (officeRes.data && officeRes.data.length > 0) {
                    setAllOffices(officeRes.data);
                } else {
                    showToast("No offices found in the database.", true);
                }

                await fetchCurrentStatus(); // Fetch initial status

            } catch (err) {
                console.error("Failed to fetch initial data:", err);
                showToast("Failed to fetch initial data. Please try refreshing.", true);
            } finally {
                setPageLoading(false); // End page loading
            }
        };
        fetchData();
    }, [token]);


    // --- Attendance Handling Logic ---
    const handleAttendance = async (type) => {
        if (allOffices.length === 0) return showToast("Office location data is missing.", true);
        
        setStatusMessage(`Getting your location...`); 
        setActionLoading(true); // Start action loading

        try {
            const location = await getLocation();
            const { latitude: userLat, longitude: userLon } = location;
            setCurrentLocation([userLat, userLon]); 
            setStatusMessage(`Location found. Validating...`);

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
                setActionLoading(false);
                return;
            }

            setStatusMessage(`Valid location. Sending ${type} request...`);
            await api.post(
                `/attendance/${type.toLowerCase().replace(' ', '')}`,
                { latitude: userLat, longitude: userLon },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const successMsg = `${type} successful!`;
            showToast(successMsg, false);
            setStatusMessage(`${successMsg} at ${closestValidOffice.name}.`);
            
            // CRITICAL: Rerun the status check to update UI after success
            await fetchCurrentStatus(); 

        } catch (err) {
            console.error(`Failed to ${type}:`, err.response ? err.response.data : err);
            
            let errorMessage = "An error occurred.";
            if (err.message.includes("Geolocation")) {
                errorMessage = err.message;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            showToast(`Error during ${type}: ${errorMessage}`, true);
            setStatusMessage(`Failed to ${type}. Reason: ${errorMessage}`);
        } finally {
            setActionLoading(false); // End action loading
        }
    };


    // --- JSX Render ---
    if (pageLoading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Map and Status...</div>;
    }
    
    if (!pageLoading && allOffices.length === 0) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>No office data available. Please contact admin.</div>;
    }

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
            
            {toast.isVisible && (
                <div style={{
                    ...styles.toast(isMobile),
                    backgroundColor: toast.isError ? DANGER_COLOR : SUCCESS_COLOR, 
                }}>
                    {toast.message}
                </div>
            )}
            
            <h3 style={styles.cardTitle(isMobile)}>📍 Geolocation Check-in/out</h3>

            <div style={styles.mapContainer(isMobile)}>
                <MapContainer
                    key={firstOffice.id} 
                    center={initialCenter}
                    zoom={16}
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
                    <strong>Today's Status:</strong> 
                    <span style={{ color: getStatusColor(currentDayStatus), fontWeight: '600', marginLeft: '10px' }}>
                        {currentDayStatus}
                    </span>
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#6c757d' }}><strong>Action Status:</strong> {statusMessage}</p>
                 
                {/* ⭐ DEBUG/UTILITY: Manual Status Refresh Button */}
                <button 
                    onClick={fetchCurrentStatus}
                    style={{ 
                        backgroundColor: PRIMARY_COLOR, 
                        color: 'white', 
                        border: 'none', 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        marginTop: '10px',
                        cursor: 'pointer',
                        fontSize: '0.85em'
                    }}
                    disabled={actionLoading || pageLoading}
                >
                    {pageLoading || actionLoading ? 'Loading...' : '🔄 Refresh Status'}
                </button>
            </div>

            <div style={styles.buttonGroup(isMobile)}>
                <button 
                    onClick={() => handleAttendance("Check In")}
                    style={{ ...styles.button(isMobile), backgroundColor: SUCCESS_COLOR }}
                    // ⭐ MULTI-SEGMENT FIX: Only disabled if *currently* checked in.
                    disabled={actionLoading || currentDayStatus === 'Checked In'} 
                >
                    {actionLoading ? 'Processing...' : '✅ Check In'}
                </button>
                <button 
                    onClick={() => handleAttendance("Check Out")}
                    style={{ ...styles.button(isMobile), backgroundColor: DANGER_COLOR }}
                    // Only enabled if *currently* checked in.
                    disabled={actionLoading || currentDayStatus !== 'Checked In'} 
                >
                    {actionLoading ? 'Processing...' : '🚪 Check Out'}
                </button>
            </div>
        </div>
    );
};


// -------------------------------------------------------------------
// --- 2B. ATTENDANCE PAGE (LOGS BY DATE) ---
// -------------------------------------------------------------------

const MyAttendance = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [dailyAttendanceData, setDailyAttendanceData] = useState(null); 
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false); 
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState("Ready for export.");
    const [isToastError, setIsToastError] = useState(false);
    
    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;
    const token = localStorage.getItem("token");

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

    const fetchAttendanceLog = async (date) => {
        setLoading(true);
        setError(null);
        setDailyAttendanceData(null); 
        const formattedDate = formatDateForApi(date);

        try {
            const response = await api.get(
                `/attendance/logs?date=${formattedDate}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDailyAttendanceData(response.data); 
        } catch (err) {
            console.error("Failed to fetch attendance log:", err.response?.data || err.message);
            setError(`Failed to fetch log: ${err.response?.data?.message || 'Server error'}`);
            setDailyAttendanceData(null);
        } finally {
            setLoading(false);
        }
    };
    
    // --- Daily Export Function ---
    const handleDailyExport = async () => {
        setExportLoading(true);
        const formattedDate = formatDateForApi(selectedDate);
        
        try {
            const response = await api.get(
                `/attendance/export-daily?date=${formattedDate}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob', 
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_log_daily_${formattedDate}.xlsx`);
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
                message = "Error exporting: Server error";
            }
            setError(message);
            showStatusMessage(message, true);
        } finally {
            setExportLoading(false);
        }
    };

    // --- Range Export Function ---
    const handleRangeExport = async () => {
        if (startDate > endDate) {
            showStatusMessage("Start Date cannot be after End Date.", true);
            return;
        }
        setExportLoading(true);
        const start = formatDateForApi(startDate);
        const end = formatDateForApi(endDate);
        
        try {
            const response = await api.get(
                `/attendance/export/mine?start=${start}&end=${end}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_log_range_${start}_to_${end}.xlsx`);
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
                message = `Error exporting: Server error`;
            }
            setError(message);
            showStatusMessage(message, true);
        } finally {
            setExportLoading(false);
        }
    };

    // Fetch log on initial load and when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchAttendanceLog(selectedDate);
        }
    }, [selectedDate, token]); 

    const handleCalendarDateChange = (date) => {
        setSelectedDate(date);
    };
    
    const { logs, summary } = dailyAttendanceData || { logs: [], summary: {} };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Full Day': return SUCCESS_COLOR;
            case 'Half Day': return WARNING_COLOR;
            case 'LOP': return DANGER_COLOR;
            case 'Checked In': return PRIMARY_COLOR;
            default: return FONT_COLOR;
        }
    };

    return (
        <div style={styles.card(isMobile)}>
            <h3 style={styles.cardTitle(isMobile)}>📅 My Attendance Logs & Export</h3>

            {/* Range Export Section */}
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
                        disabled={exportLoading || loading || startDate > endDate}
                    >
                        {exportLoading ? 'Exporting...' : '⬇️ Export Range Logs'}
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
                        maxDate={new Date()}
                    />
                    
                    <button 
                        onClick={handleDailyExport}
                        style={{...logStyles.exportButton(isMobile), marginTop: '10px'}}
                        disabled={exportLoading || loading || !logs || logs.length === 0}
                    >
                        {exportLoading ? 'Exporting...' : '⬇️ Export Selected Day Log'}
                    </button>
                </div>

                {/* Right Side: Log Details */}
                <div style={logStyles.detailsWrapper(isMobile)}>
                    
                    <div style={logStyles.headerRow(isMobile)}> 
                        <h4>Details for: {formatDateForApi(selectedDate)}</h4>
                    </div>

                    {loading && <p style={{ color: PRIMARY_COLOR }}>Loading attendance data...</p>}
                    
                    {error && <p style={{ color: DANGER_COLOR }}>Error: {error}</p>}

                    {!loading && !error && (
                        logs.length > 0 ? (
                            <>
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


// -------------------------------------------------------------------
// --- 2C. PROFILE PAGE ---
// -------------------------------------------------------------------

const EmployeeProfile = () => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const navigate = useNavigate();
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
            <div style={styles.profileDetail(isMobile)}>
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


// ===================================================================
// --- 3. STYLES OBJECTS ---
// ===================================================================

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
        overflowX: isMobile ? 'auto' : 'visible',
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
        whiteSpace: 'nowrap',
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
        whiteSpace: 'nowrap',
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
        flexDirection: isMobile ? 'column' : 'row',
        gap: "15px", 
        marginBottom: "20px"
    }),
    button: (isMobile) => ({
        flex: isMobile ? '1 1 auto' : 1,
        padding: "12px", 
        fontSize: "1.1em", 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'opacity 0.2s'
    }),
    
    // Profile
    profileDetail: (isMobile) => ({
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '150px 1fr',
        gap: isMobile ? '5px 10px' : '0 10px',
        padding: '12px 0',
        borderBottom: `1px solid #e9ecef`,
        fontSize: '1em',
        color: FONT_COLOR,
    }),
    
    // Toast
    toast: (isMobile) => ({
        position: 'fixed',
        top: '10px',
        right: '10px',
        left: isMobile ? '10px' : 'auto',
        padding: '15px 20px',
        color: 'white',
        borderRadius: '6px',
        zIndex: 1000, 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        opacity: 1,
        textAlign: 'center',
    }),
};

// --- Styles for Attendance Page ---
const logStyles = {
    rangeExportBox: (isMobile) => ({
        padding: isMobile ? '15px' : '20px',
        backgroundColor: '#f1f8ff',
        borderRadius: '8px',
        marginBottom: '30px',
        border: `1px solid ${PRIMARY_COLOR}`,
    }),
    rangeInputs: (isMobile) => ({
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '20px',
        alignItems: isMobile ? 'stretch' : 'flex-end',
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
        width: '100%',
        boxSizing: 'border-box',
    }),
    rangeExportButton: (isMobile) => ({
        padding: "10px 20px", 
        fontSize: "1em", 
        color: 'white',
        backgroundColor: PRIMARY_COLOR,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'opacity 0.2s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        width: isMobile ? '100%' : 'auto',
    }),
    statusMessage: (isMobile) => ({
        padding: '10px 15px',
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '0.95em',
    }),
    container: (isMobile) => ({
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '30px',
        alignItems: 'flex-start',
    }),
    calendarWrapper: (isMobile) => ({
        flexShrink: 0, 
        width: isMobile ? '100%' : 'auto',
        maxWidth: isMobile ? '400px' : 'none',
        margin: isMobile ? '0 auto' : '0',
    }),
    detailsWrapper: (isMobile) => ({
        flexGrow: 1,
        minWidth: isMobile ? '100%' : '300px',
        padding: isMobile ? '0' : '10px',
    }),
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
        maxHeight: isMobile ? '300px' : '400px',
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


// ===================================================================
// --- 4. MAIN EMPLOYEE DASHBOARD COMPONENT (WRAPPER & ROUTER) ---
// ===================================================================

const EmployeeDashboard = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const location = useLocation();
    
    const width = useWindowSize();
    const isMobile = width < MOBILE_BREAKPOINT;

    // Protection: Redirect if no user data
    useEffect(() => {
        if (!user) {
            console.log("No user found, redirecting to login.");
            navigate("/");
        }
    }, [user, navigate]); 

    if (!user) {
        return null; 
    }
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/"); 
    };

    const getNavItemStyle = (path) => {
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
                    <Route index element={<CheckInOutPage />} /> 
                    <Route path="home" element={<CheckInOutPage />} /> 
                    <Route path="attendance" element={<MyAttendance />} /> 
                    <Route path="profile" element={<EmployeeProfile />} /> 
                </Routes>
            </div>
        </div>
    );
};

export default EmployeeDashboard;