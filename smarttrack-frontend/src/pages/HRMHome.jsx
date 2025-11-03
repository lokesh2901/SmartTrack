    import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { useNavigate } from 'react-router-dom';
    import axios from "axios";

    // --- Configuration and Constants ---
    const API_BASE_URL = "https://smarttrack-backend-oo3q.onrender.com/api";
    const MOBILE_BREAKPOINT = 768;

    // --- MODERN UI CONSTANTS (Professional Palette) ---
    const PRIMARY = '#34495e'; // Dark Slate Blue - Primary Brand Color
    const SECONDARY = '#f0f4f7'; // Light Gray Background
    const ACCENT = '#e94e77'; // A touch of professional accent color (can be used sparingly)

    const STATUS_SUCCESS = '#077f39ff'; // Green for Checked In
    const STATUS_WARNING = '#f1c40f'; // Yellow for On Leave
    const STATUS_DANGER = '#e74c3c'; // Red for Absent
    const STATUS_DEFAULT = '#003c18ff'; // Gray/Blue for Checked Out / Default

    const FONT_DARK = '#2c3e50'; 
    const BORDER_LIGHT = '#ecf0f1';


    // --- Helper Functions (UNCHANGED) ---

    const useWindowSize = () => {
        const [width, setWidth] = useState(window.innerWidth);
        useEffect(() => {
            const handleResize = () => setWidth(window.innerWidth);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);
        return width;
    };

    const formatDateForApi = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatHours = (decimalHours) => {
        if (typeof decimalHours !== 'number' || isNaN(decimalHours) || decimalHours === null) return '0h 0m';
        if (decimalHours === 0) return '0h 0m';
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours % 1) * 60);
        return `${hours}h ${minutes}m`;
    };


    // --- STYLES DEFINITION ---

    // Base Styles
    const baseButton = (disabled, backgroundColor, isMobile) => ({
        padding: isMobile ? '10px 15px' : '12px 20px',
        borderRadius: '6px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled ? BORDER_LIGHT : backgroundColor,
        color: disabled ? FONT_DARK : '#ffffff',
        fontWeight: '600',
        fontSize: isMobile ? '0.9em' : '1em',
        transition: 'background-color 0.3s, opacity 0.3s',
        opacity: disabled ? 0.7 : 1,
        whiteSpace: 'nowrap',
    });

    const inputBase = {
        padding: '10px',
        borderRadius: '4px',
        border: `1px solid ${BORDER_LIGHT}`,
        backgroundColor: '#ffffff',
        color: FONT_DARK,
        fontSize: '0.95em',
        flexGrow: 1,
    };

    const mainStyles = {
        appContainer: (isMobile) => ({
            padding: isMobile ? '10px' : '20px 40px',
            backgroundColor: SECONDARY,
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif',
        }),
        header: (isMobile) => ({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '10px 0' : '20px 0',
            borderBottom: `2px solid ${BORDER_LIGHT}`,
            marginBottom: '20px',
        }),
        title: (isMobile) => ({
            color: PRIMARY,
            margin: 0,
            fontSize: isMobile ? '1.5em' : '2.5em',
            fontWeight: '700',
        }),
        contentArea: (isMobile) => ({
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '15px' : '25px',
        }),
        card: (isMobile) => ({
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: isMobile ? '15px' : '25px',
            overflowX: 'auto',
        }),
        cardTitle: {
            color: PRIMARY,
            marginBottom: '15px',
            borderBottom: `1px solid ${BORDER_LIGHT}`,
            paddingBottom: '10px',
            fontSize: '1.2em',
        },
        toast: (isError) => ({
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: isError ? STATUS_DANGER : STATUS_SUCCESS,
            color: '#ffffff',
            padding: '15px 20px',
            borderRadius: '6px',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            fontWeight: '600',
        }),
        noData: (isMobile, color) => ({
            textAlign: 'center',
            padding: isMobile ? '20px' : '40px',
            fontSize: isMobile ? '1em' : '1.2em',
            color: color,
            fontWeight: '600',
            backgroundColor: BORDER_LIGHT,
            borderRadius: '4px',
        }),
    };

    const buttonStyles = {
        base: (disabled, color, isMobile) => baseButton(disabled, color, isMobile),
        logout: (isMobile) => ({
            ...baseButton(false, ACCENT, isMobile),
            backgroundColor: ACCENT,
            padding: isMobile ? '8px 12px' : '10px 18px',
            fontSize: isMobile ? '0.85em' : '0.9em',
        }),
        secondary: (disabled, isMobile) => ({
            ...baseButton(disabled, PRIMARY, isMobile),
            backgroundColor: disabled ? BORDER_LIGHT : PRIMARY,
            color: disabled ? FONT_DARK : '#ffffff',
            flexShrink: 0, // Prevent button from shrinking
            marginLeft: '10px',
            padding: isMobile ? '8px 12px' : '10px 15px',
            fontSize: isMobile ? '0.8em' : '0.9em',
        }),
        export: (disabled, isMobile) => ({
            ...baseButton(disabled, STATUS_SUCCESS, isMobile),
            backgroundColor: disabled ? BORDER_LIGHT : STATUS_SUCCESS,
            color: disabled ? FONT_DARK : '#ffffff',
            flexShrink: 0,
            padding: isMobile ? '10px' : '12px 20px',
            fontSize: isMobile ? '0.9em' : '1em',
        }),
    };

    const cardStyles = {
        analyticsContainer: (isMobile) => ({
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? '10px' : '20px',
        }),
        metricCard: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '15px 20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            overflow: 'hidden',
        },
        metricTitle: {
            color: PRIMARY,
            margin: 0,
            fontSize: '1em',
            fontWeight: '500',
        },
    };

    const logStyles = {
        rangeExportBox: (isMobile) => ({
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '15px',
            padding: '10px 0',
        }),
        rangeInputs: (isMobile) => ({
            display: 'flex',
            gap: '15px',
            flexGrow: 1,
            flexDirection: isMobile ? 'column' : 'row',
        }),
        dateInputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            flex: 1,
        },
    };

    const filterStyles = {
        filterArea: (isMobile) => ({
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: `1px dashed ${BORDER_LIGHT}`,
        }),
        dateSelectorGroup: (isMobile) => ({
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'flex-end',
            gap: '15px',
        }),
        dateInputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
        },
        filterControls: (isMobile) => ({
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'flex-end',
            gap: '15px',
        }),
        inputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            flex: 1,
            minWidth: '150px',
        },
    };

    const inputStyles = {
        label: {
            color: FONT_DARK,
            fontWeight: '600',
            fontSize: '0.85em',
            marginBottom: '3px',
        },
        textInput: {
            ...inputBase,
            minWidth: '120px',
        },
        dateInput: {
            ...inputBase,
            padding: '8px',
            minWidth: '130px',
        },
        selectInput: {
            ...inputBase,
            appearance: 'none', // Remove default dropdown arrow
            background: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23${FONT_DARK.substring(1)}'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e") no-repeat right 10px center`,
            backgroundSize: '12px',
            minWidth: '120px',
        },
    };

    const tableStyles = {
        tableWrapper: {
            overflowX: 'auto',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '700px', // Ensures table is readable on smaller screens before going to mobile view
        },
        tableRowHeader: {
            backgroundColor: PRIMARY,
            color: '#ffffff',
            textAlign: 'left',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
        },
        tableHeader: {
            padding: '12px 15px',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            fontSize: '0.9em',
        },
        tableRow: (index) => ({
            backgroundColor: index % 2 === 0 ? '#ffffff' : SECONDARY,
            borderBottom: `1px solid ${BORDER_LIGHT}`,
            transition: 'background-color 0.2s',
            ':hover': {
                backgroundColor: BORDER_LIGHT,
            }
        }),
        tableCell: (isStatus) => ({
            padding: '10px 15px',
            color: FONT_DARK,
            fontWeight: isStatus ? '600' : '400',
            fontSize: '0.95em',
            whiteSpace: 'nowrap',
        }),
    };

    const mobileListStyles = {
        listContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        },
        mobileCard: (statusColor) => ({
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            borderLeft: `5px solid ${statusColor}`, // Color-coded left border
        }),
        headerRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '5px',
            borderBottom: `1px dashed ${BORDER_LIGHT}`,
            paddingBottom: '5px',
        },
        employeeName: {
            margin: 0,
            fontWeight: '700',
            fontSize: '1em',
            color: PRIMARY,
        },
        statusBadge: (statusColor) => ({
            backgroundColor: statusColor,
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: '600',
        }),
        detailRow: {
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            fontSize: '0.85em',
            color: FONT_DARK,
        },
        locationDetails: {
            marginTop: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
        },
        locationText: {
            margin: 0,
            lineHeight: '1.4',
            // Note: Markdown bolding (**) in the original function is purely descriptive here,
            // it would need to be replaced with a <span style={{fontWeight: 'bold'}}> in real JSX.
        }
    };
    

    // --- Component for Analytics Cards ---
    const MetricCard = ({ title, value, icon, color }) => (
        <div style={cardStyles.metricCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <h4 style={cardStyles.metricTitle}>{title}</h4>
                <span style={{ fontSize: '1.4em', color: color }}>{icon}</span>
            </div>
            <div style={{ fontSize: '2.2em', fontWeight: '800', color: FONT_DARK }}>
                {value}
            </div>
            {/* Subtle color bar on the bottom for modern look */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: color, borderRadius: '0 0 8px 8px' }}></div>
        </div>
    );


    // ----------------------------------------------------------------------
    // --- MAIN HR DASHBOARD COMPONENT ---
    // ----------------------------------------------------------------------

    const HrmDashboard = () => {
        const navigate = useNavigate();
        const width = useWindowSize();
        const isMobile = width < MOBILE_BREAKPOINT;

        // --- Date Constants ---
        const today = useMemo(() => new Date(), []);
        const thirtyDaysAgo = useMemo(() => {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            return d;
        }, [today]);

        // --- State Management ---
        const [allEmployees, setAllEmployees] = useState([]);
        const [loading, setLoading] = useState(true);
        const [toast, setToast] = useState({ message: null, isError: false, isVisible: false });
        const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' }); 
        
        // State for filtering
        const [filterText, setFilterText] = useState(''); 
        const [statusFilter, setStatusFilter] = useState('All'); 
        
        // State for Date-Based Status Check
        const [selectedDate, setSelectedDate] = useState(today); 
        const [currentStatusDate, setCurrentStatusDate] = useState(today); 
        
        // Date Range State for Historical Export
        const [startDate, setStartDate] = useState(thirtyDaysAgo);
        const [endDate, setEndDate] = useState(today);

        const token = localStorage.getItem("token");

        // --- Derived Analytics Metrics & Helpers ---
        const metrics = useMemo(() => {
            const totalHeadcount = allEmployees.length;
            let presentCount = 0; let absentCount = 0; let onLeaveCount = 0;

            allEmployees.forEach(employee => {
                const status = employee.overall_status || employee.status;
                if (status === 'Checked In' || status === 'Checked Out') { presentCount++; } 
                else if (status === 'Absent') { absentCount++; } 
                else if (status === 'On Leave') { onLeaveCount++; }
            });

            return { totalHeadcount, present: presentCount, absent: absentCount, onLeave: onLeaveCount, };
        }, [allEmployees]);


        const showToast = useCallback((message, isError = false) => {
            setToast({ message, isVisible: true, isError });
            setTimeout(() => { setToast({ message: null, isVisible: false, isError: false }); }, 3000);
        }, []);

        const getStatusColor = (status) => {
            if (status === 'Checked In') return STATUS_SUCCESS;
            if (status === 'Checked Out') return STATUS_DEFAULT; 
            if (status === 'Absent') return STATUS_DANGER;
            if (status === 'On Leave') return STATUS_WARNING;
            return FONT_DARK;
        };


        // --- Data Fetching (UNCHANGED) ---
        const fetchEmployeeData = useCallback(async (dateToFetch) => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || (user.role !== 'hr' && user.role !== 'admin')) { navigate('/'); return; }

            setLoading(true);
            const formattedDate = formatDateForApi(dateToFetch);
            
            try {
                const res = await axios.get(
                    `${API_BASE_URL}/attendance/status/all?date=${formattedDate}`, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                const incomingData = res.data;
                let employeeArray = [];

                if (Array.isArray(incomingData)) { employeeArray = incomingData; } 
                else if (incomingData && Array.isArray(incomingData.report)) { employeeArray = incomingData.report; } 
                else if (incomingData && Array.isArray(incomingData.data)) { employeeArray = incomingData.data; }
                
                setAllEmployees(employeeArray);
                setCurrentStatusDate(dateToFetch); 
                showToast(`Employee status loaded for: ${formattedDate}`, false);

            } catch (err) {
                let message = `Failed to fetch employee data for ${formattedDate}. Check API path.`;
                if (err.response?.status === 404) { message = `No attendance records found for ${formattedDate}.`; } 
                else if (err.response?.data?.message) { message = `API Error: ${err.response.data.message}`; }
                
                showToast(message, true);
                setAllEmployees([]); 
            } finally {
                setLoading(false);
            }
        }, [token, navigate, showToast]);
        
        // Initial Data Fetch on Mount
        useEffect(() => {
            if (token) {
                fetchEmployeeData(today);
            } else {
                navigate('/login'); // Assuming '/login' is the proper route
            }
        }, [token, navigate, today, fetchEmployeeData]);
        
        const handleDateChangeAndFetch = () => {
            if (formatDateForApi(selectedDate) !== formatDateForApi(currentStatusDate)) {
                fetchEmployeeData(selectedDate);
            }
        };
        
        // --- Sorting and Filtering Logic (UNCHANGED) ---
        const sortedEmployees = useMemo(() => {
            let sortableItems = [...allEmployees]; 
            
            let filteredItems = sortableItems.filter(employee => {
                const employeeId = String(employee.employee_id || '').toLowerCase();
                const employeeName = String(employee.name || '').toLowerCase();
                const checkinOffice = String(employee.checkin_office || '').toLowerCase();
                const checkoutOffice = String(employee.checkout_office || '').toLowerCase();
                const status = String(employee.overall_status || employee.status || 'unknown');
                const searchLower = filterText.toLowerCase();

                const textMatch = searchLower === '' || employeeId.includes(searchLower) || employeeName.includes(searchLower) || checkinOffice.includes(searchLower) || checkoutOffice.includes(searchLower);

                let statusMatch = statusFilter === 'All' || status === statusFilter;

                return textMatch && statusMatch;
            });

            if (sortConfig.key) {
                filteredItems.sort((a, b) => {
                    let aValue = a[sortConfig.key];
                    let bValue = b[sortConfig.key];
                    
                    if (sortConfig.key === 'total_hours_today') {
                        aValue = typeof aValue === 'number' ? aValue : 0;
                        bValue = typeof bValue === 'number' ? bValue : 0;
                        
                        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                        return 0;
                    } else {
                        aValue = String(aValue || '').toLowerCase();
                        bValue = String(bValue || '').toLowerCase();

                        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                        return 0;
                    }
                });
            }
            return filteredItems;
        }, [allEmployees, sortConfig, filterText, statusFilter]); 

        const requestSort = (key) => {
            let direction = 'ascending';
            if (sortConfig.key === key && sortConfig.direction === 'ascending') {
                direction = 'descending';
            }
            setSortConfig({ key, direction });
        };

        const getLocationDisplay = (employee) => {
            const checkinOffice = employee.checkin_office || 'N/A';
            const checkoutOffice = employee.checkout_office || 'N/A';
            const hours = formatHours(employee.total_hours_today);

            if (employee.overall_status === 'Checked In') {
                return (
                    <div style={mobileListStyles.locationDetails}>
                        <p style={mobileListStyles.locationText}>📍 In: <span style={{fontWeight: 'bold'}}>{checkinOffice}</span></p>
                        <p style={mobileListStyles.locationText}>🕒 <span style={{fontWeight: 'bold'}}>{hours}</span></p>
                    </div>
                );
            } 
            
            if (employee.overall_status === 'Checked Out') {
                return (
                    <div style={mobileListStyles.locationDetails}>
                        <p style={mobileListStyles.locationText}>📍 In: {checkinOffice}</p>
                        <p style={mobileListStyles.locationText}>➡️ Out: <span style={{fontWeight: 'bold'}}>{checkoutOffice}</span></p>
                        <p style={mobileListStyles.locationText}>🕒 <span style={{fontWeight: 'bold'}}>{hours}</span></p>
                    </div>
                );
            }
            
            return (
                <div style={mobileListStyles.locationDetails}>
                    <p style={mobileListStyles.locationText}>Locations: N/A</p>
                    <p style={mobileListStyles.locationText}>🕒 <span style={{fontWeight: 'bold'}}>{hours}</span></p>
                </div>
            );
        };


        // --- Export Logic (UNCHANGED) ---
        const handleRangeExport = async () => {
            if (startDate > endDate) { showToast("Start Date cannot be after End Date.", true); return; }

            setLoading(true);
            const start = formatDateForApi(startDate);
            const end = formatDateForApi(endDate);
            
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/attendance/export/all?start=${start}&end=${end}`, 
                    { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob', }
                );

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `all_employee_attendance_log_${start}_to_${end}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url); 
                
                showToast(`All employee logs exported successfully from ${start} to ${end}.`, false);
                
            } catch (err) {
                let message = "An unexpected error occurred during range export.";
                if (err.response?.status === 404) { message = `No logs found for the selected range to export.`; } 
                else if (err.response?.data?.message) { message = `Error exporting: ${err.response.data.message}`; }

                showToast(message, true);
            } finally {
                setLoading(false);
            }
        };
        
        
        const handleFilteredStatusExport = () => {
            if (sortedEmployees.length === 0) { showToast("No data to export based on current filters.", true); return; }

            const headers = [ "Employee Name", "Employee ID", "Status", "Check-In Office", "Check-Out Office", "Hours Worked Today" ];

            const csvRows = sortedEmployees.map(emp => {
                const currentStatus = emp.overall_status || emp.status || 'Unknown';
                const hoursWorked = formatHours(emp.total_hours_today);
                const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

                return [
                    escapeCsv(emp.name), escapeCsv(emp.employee_id), escapeCsv(currentStatus),
                    escapeCsv(emp.checkin_office || 'N/A'),
                    escapeCsv(currentStatus === 'Checked Out' ? (emp.checkout_office || '-') : '-'),
                    escapeCsv(hoursWorked)
                ].join(',');
            });

            const csvContent = [ headers.join(','), ...csvRows ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.setAttribute('download', `filtered_employee_status_${formatDateForApi(currentStatusDate)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(`Successfully exported ${sortedEmployees.length} filtered employee records.`, false);
        };


        // --- JSX Render ---
        return (
            <div style={mainStyles.appContainer(isMobile)}>
                
                {/* Toast Notification */}
                {toast.isVisible && (<div style={mainStyles.toast(toast.isError)}>{toast.message}</div>)}
                
                {/* 1. Header & Logout */}
                <div style={mainStyles.header(isMobile)}>
                    <h1 style={mainStyles.title(isMobile)}>👤 HR Dashboard</h1>
                    <button 
                        onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); }}
                        style={buttonStyles.logout(isMobile)}
                    >
                        Logout
                    </button>
                </div>
                
                
                <div style={mainStyles.contentArea(isMobile)}>
                    
                    {/* 2. Analytics Summary Cards */}
                    <div style={cardStyles.analyticsContainer(isMobile)}>
                        <MetricCard title="Total Headcount" value={loading ? '...' : metrics.totalHeadcount} icon="👥" color={PRIMARY} />
                        <MetricCard title="Present" value={loading ? '...' : metrics.present} icon="✅" color={STATUS_SUCCESS} />
                        <MetricCard title="Absent" value={loading ? '...' : metrics.absent} icon="❌" color={STATUS_DANGER} />
                        <MetricCard title="On Leave" value={loading ? '...' : metrics.onLeave} icon="🏖️" color={STATUS_WARNING} />
                    </div>
                    
                    {/* 3. Export Historical Log Section */}
                    <div style={mainStyles.card(isMobile)}>
                        <h3 style={mainStyles.cardTitle}>📥 Historical Attendance Export (Full Log)</h3>
                        <div style={logStyles.rangeExportBox(isMobile)}>
                            <div style={logStyles.rangeInputs(isMobile)}>
                                <div style={logStyles.dateInputGroup}><label style={inputStyles.label}>Start Date:</label><input type="date" value={formatDateForApi(startDate)} onChange={(e) => setStartDate(new Date(e.target.value))} max={formatDateForApi(today)} style={inputStyles.dateInput} /></div>
                                <div style={logStyles.dateInputGroup}><label style={inputStyles.label}>End Date:</label><input type="date" value={formatDateForApi(endDate)} onChange={(e) => setEndDate(new Date(e.target.value))} max={formatDateForApi(today)} style={inputStyles.dateInput} /></div>
                            </div>
                            <button 
                                onClick={handleRangeExport}
                                style={buttonStyles.base(loading || startDate > endDate, PRIMARY, isMobile)}
                                disabled={loading || startDate > endDate}
                            >
                                {loading ? 'Processing...' : '⬇️ Export Full Log (XLSX)'}
                            </button>
                        </div>
                    </div>

                    {/* 4. Employee Status Table / List */}
                    <div style={mainStyles.card(isMobile)}>
                        <h3 style={mainStyles.cardTitle}>📊 Status for: <span style={{fontWeight: 'bold'}}>{formatDateForApi(currentStatusDate)}</span></h3>
                        
                        {/* --- Date Fetch and Filter Bar --- */}
                        <div style={filterStyles.filterArea(isMobile)}>
                            
                            {/* Date Picker and Fetch Button */}
                            <div style={filterStyles.dateSelectorGroup(isMobile)}>
                                <div style={filterStyles.dateInputGroup}><label style={inputStyles.label}>Status Date:</label><input type="date" value={formatDateForApi(selectedDate)} onChange={(e) => setSelectedDate(new Date(e.target.value))} max={formatDateForApi(today)} style={inputStyles.dateInput} /></div>
                                <button onClick={handleDateChangeAndFetch} style={buttonStyles.secondary(loading, isMobile)} disabled={loading}>
                                    {loading && formatDateForApi(selectedDate) !== formatDateForApi(currentStatusDate) ? 'Fetching...' : '🔄 Fetch Status'}
                                </button>
                            </div>
                            
                            {/* Search, Status Dropdown, and Filtered Export */}
                            <div style={filterStyles.filterControls(isMobile)}>
                                <div style={filterStyles.inputGroup}>
                                    <label style={inputStyles.label}>Search:</label>
                                    <input type="text" placeholder="Name, ID or Office" value={filterText} onChange={(e) => setFilterText(e.target.value)} style={inputStyles.textInput} />
                                </div>
                                <div style={filterStyles.inputGroup}>
                                    <label style={inputStyles.label}>Status:</label>
                                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyles.selectInput}>
                                        <option value="All">All Statuses</option><option value="Checked In">Checked In</option><option value="Checked Out">Checked Out</option><option value="Absent">Absent</option><option value="On Leave">On Leave</option><option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <button onClick={handleFilteredStatusExport} style={buttonStyles.export(sortedEmployees.length === 0, isMobile)} disabled={sortedEmployees.length === 0}>
                                    <span>⬇️ Export Filtered ({sortedEmployees.length})</span>
                                </button>
                            </div>
                        </div>
                        {/* --- End Filter Bar --- */}

                        {/* --- Content Area: Loading, No Data, or List/Table --- */}
                        {loading && formatDateForApi(selectedDate) === formatDateForApi(currentStatusDate) ? (
                            <p style={mainStyles.noData(isMobile, PRIMARY)}>Loading employee data...</p>
                        ) : sortedEmployees.length === 0 ? (
                            <p style={mainStyles.noData(isMobile, STATUS_DANGER)}>No employee data found for <span style={{fontWeight: 'bold'}}>{formatDateForApi(currentStatusDate)}</span> or matches the filter.</p>
                        ) : isMobile ? (
                            // --- Mobile List View (Professional Card Design) ---
                            <div style={mobileListStyles.listContainer}>
                                {sortedEmployees.map((employee) => {
                                    const currentStatus = employee.overall_status || employee.status || 'Unknown';
                                    const statusColor = getStatusColor(currentStatus);
                                    return (
                                        <div key={employee.user_id || employee.employee_id} style={mobileListStyles.mobileCard(statusColor)}>
                                            <div style={mobileListStyles.headerRow}>
                                                <p style={mobileListStyles.employeeName}>{employee.name} <span style={{fontWeight: 'normal', color: FONT_DARK}}>({employee.employee_id})</span></p>
                                                <span style={mobileListStyles.statusBadge(statusColor)}>{currentStatus}</span>
                                            </div>
                                            <div style={mobileListStyles.detailRow}>
                                                {getLocationDisplay(employee)} 
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // --- Desktop Table View (Clean Design) ---
                            <div style={tableStyles.tableWrapper}>
                                <table style={tableStyles.table}>
                                    <thead>
                                        <tr style={tableStyles.tableRowHeader}>
                                            <th onClick={() => requestSort('name')} style={tableStyles.tableHeader}>Name {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                            <th onClick={() => requestSort('employee_id')} style={tableStyles.tableHeader}>ID {sortConfig.key === 'employee_id' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                            <th onClick={() => requestSort('overall_status')} style={tableStyles.tableHeader}>Status {sortConfig.key === 'overall_status' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                            <th style={tableStyles.tableHeader}>Check-In Office</th>
                                            <th style={tableStyles.tableHeader}>Check-Out Office</th>
                                            <th onClick={() => requestSort('total_hours_today')} style={tableStyles.tableHeader}>Hours {sortConfig.key === 'total_hours_today' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedEmployees.map((employee, index) => {
                                            const currentStatus = employee.overall_status || employee.status || 'Unknown';
                                            return (
                                                <tr key={employee.user_id || employee.employee_id} style={tableStyles.tableRow(index)}>
                                                    <td style={tableStyles.tableCell(false)}>{employee.name}</td>
                                                    <td style={tableStyles.tableCell(false)}>{employee.employee_id}</td>
                                                    <td style={tableStyles.tableCell(true)}><span style={{ color: getStatusColor(currentStatus), fontWeight: '600', fontSize: '0.9em' }}>{currentStatus}</span></td>
                                                    <td style={tableStyles.tableCell(false)}>{employee.checkin_office || 'N/A'}</td>
                                                    <td style={tableStyles.tableCell(false)}>{currentStatus === 'Checked Out' && employee.checkout_office ? employee.checkout_office : '-'}</td>
                                                    <td style={tableStyles.tableCell(false)}><span style={{fontWeight: 'bold'}}>{formatHours(employee.total_hours_today)}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                        )}
                    </div>
                </div>
            </div>
        );
    };

    export default HrmDashboard;
