import supabase from '../supabaseClient.js';
import { isWithinRadius } from '../utils/geoUtils.js';
import ExcelJS from 'exceljs';

// --- TIMEZONE AND STATUS CONSTANTS ---

// Define the hour thresholds for final day status
const HALF_DAY_MIN_HOURS = 4.0;
const FULL_DAY_MIN_HOURS = 8.0; 
const STANDARD_WORK_HOURS = 8.0; // Base for Overtime calculation

// --- TIMEZONE HELPERS ---

/**
 * Calculates the UTC timestamp that corresponds to 00:00:00.000 IST for the provided date (or current day).
 * @param {Date} [date=new Date()] - The reference date.
 */
const getISTDayStartUTC = (date = new Date()) => {
    const IST_OFFSET_MINUTES = 330; // UTC+5:30
    
    const nowUtc = new Date(date.getTime());
    const istDate = new Date(nowUtc.getTime() + IST_OFFSET_MINUTES * 60000);
    
    // Set to 00:00:00.000 IST
    istDate.setUTCHours(0, 0, 0, 0); 
    
    // Convert back to UTC to get the filter start time
    const istDayStartUtc = new Date(istDate.getTime() - IST_OFFSET_MINUTES * 60000);
    
    return istDayStartUtc.toISOString();
};

/**
 * Calculates the UTC start and end ISO strings that correspond to the specified date 
 * interpreted as a full day in IST (00:00:00.000 IST to 23:59:59.999 IST).
 * * @param {Date} date - A Date object representing the desired date.
 * @returns {object} { startUTC, endUTC, formattedDate }
 */
const getISTDayRangeUTC = (date) => {
    const istStartUtcDate = new Date(getISTDayStartUTC(date));
    const startUTC = istStartUtcDate.toISOString();
    
    // End is exactly 24 hours later
    const istEndUtcDate = new Date(istStartUtcDate.getTime() + 24 * 60 * 60 * 1000);
    const endUTC = istEndUtcDate.toISOString();
    
    // Determine the IST date string for the report title
    const formattedDate = istStartUtcDate.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return { startUTC, endUTC, formattedDate };
};

/**
 * Checks if the given Date object represents the current day in IST.
 * * @param {Date} date - The date object to check.
 * @returns {boolean} True if the date matches today in IST.
 */
const isISTToday = (date) => {
    const IST_OFFSET_MINUTES = 330; // UTC+5:30
    
    // Get today's date adjusted to IST timezone
    const nowUtc = new Date();
    const todayIst = new Date(nowUtc.getTime() + IST_OFFSET_MINUTES * 60000);
    
    // Get the target date adjusted to IST timezone and normalized to midnight
    // We normalize the target date by finding its IST midnight, which we can compare with today's IST date.
    const targetIstDayStart = new Date(getISTDayStartUTC(date)).getTime() + IST_OFFSET_MINUTES * 60000;
    const targetIst = new Date(targetIstDayStart);

    return todayIst.getUTCFullYear() === targetIst.getUTCFullYear() &&
           todayIst.getUTCMonth() === targetIst.getUTCMonth() &&
           todayIst.getUTCDate() === targetIst.getUTCDate();
};


// --- CALCULATION HELPERS ---

/**
 * Calculates total hours for a SINGLE segment.
 * @param {string} checkinTimeISO - UTC ISO string
 * @param {string} checkoutTimeISO - UTC ISO string
 * @returns {object} { total_hours }
 */
const calculateHoursForSegment = (checkinTimeISO, checkoutTimeISO) => {
    if (!checkinTimeISO || !checkoutTimeISO) {
        return { total_hours: 0 }; 
    }

    const checkin = new Date(checkinTimeISO);
    const checkout = new Date(checkoutTimeISO);

    const durationMs = checkout.getTime() - checkin.getTime();
    const total_hours = Math.abs(durationMs) / (1000 * 60 * 60);

    return {
        // Rounding to 2 decimal places for storage and display
        total_hours: parseFloat(total_hours.toFixed(2)),
    };
};

/**
 * Calculates final status (LOP, Half Day, Full Day) based on aggregated hours.
 */
const calculateFinalDayStatus = (totalHoursWorked) => {
    const totalHours = parseFloat(totalHoursWorked.toFixed(2)); 
    
    if (totalHours === 0) {
        return 'Absent'; 
    } else if (totalHours < HALF_DAY_MIN_HOURS) {
        return 'LOP'; // Loss of Pay: Worked less than 4 hours
    } else if (totalHours >= HALF_DAY_MIN_HOURS && totalHours < FULL_DAY_MIN_HOURS) {
        return 'Half Day';
    } else if (totalHours >= FULL_DAY_MIN_HOURS) {
        return 'Full Day';
    }
    return 'Absent';
};


// --- ATTENDANCE ACTIONS ---

// -------------------------- CHECK-IN --------------------------
export const checkin = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const user_id = req.user?.id;
        
        if (!user_id) return res.status(401).json({ message: 'User not authenticated' });
        if (latitude == null || longitude == null)
            return res.status(400).json({ message: 'Coordinates are required' });

        // Use helper without arguments to get today's IST start
        const IST_TODAY_START = getISTDayStartUTC();

        // Check for an active check-in today (prevents double check-in without check-out)
        const { data: activeAttendance, error: activeError } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', user_id)
            .is('checkout_time', null)
            .gte('checkin_time', IST_TODAY_START)
            .limit(1);

        if (activeError) {
            console.error('Active check-in check error:', activeError);
            return res.status(500).json({ message: 'Database error while checking status.' });
        }

        if (activeAttendance.length > 0) {
            return res.status(400).json({ message: 'You are already checked in. Please check out first.' });
        }

        // Fetch all offices for Geo-fencing
        const { data: offices, error: officesError } = await supabase
            .from('offices')
            .select('*');

        if (officesError) return res.status(404).json({ message: 'No offices found' });

        // Find office within radius
        const office = offices.find(o => 
            isWithinRadius(latitude, longitude, o.latitude, o.longitude, o.radius)
        );

        if (!office) return res.status(400).json({ message: 'You are outside all office areas' });

        // Insert new check-in record
        const { data: attendanceData, error: insertError } = await supabase
            .from('attendance')
            .insert([{
                user_id,
                checkin_office_id: office.id,
                checkin_latitude: latitude,
                checkin_longitude: longitude,
                checkin_time: new Date().toISOString(), // Stored as UTC
                status: 'present'
            }])
            .select();

        if (insertError) {
            console.error('Insert check-in error:', insertError);
            return res.status(500).json({ message: insertError.message });
        }

        res.status(201).json({ message: 'Checked in successfully', attendance: attendanceData[0] });

    } catch (err) {
        console.error('Check-in exception:', err.message);
        const statusCode = err.message.includes('office areas') || err.message.includes('already checked in') ? 400 : 500;
        res.status(statusCode).json({ message: err.message });
    }
};

// -------------------------- CHECK-OUT --------------------------
export const checkout = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const user_id = req.user?.id;
        
        if (!user_id) return res.status(401).json({ message: 'User not authenticated' });
        if (latitude == null || longitude == null)
            return res.status(400).json({ message: 'Coordinates are required' });

        // Use helper without arguments to get today's IST start
        const IST_TODAY_START = getISTDayStartUTC();
        const checkoutTime = new Date().toISOString(); // UTC time for checkout

        // 1. Find the LATEST active check-in record for the IST day
        const { data: latestAttendance, error: fetchError } = await supabase
            .from('attendance')
            .select('id, checkin_time')
            .eq('user_id', user_id)
            .is('checkout_time', null)
            .gte('checkin_time', IST_TODAY_START)
            .order('checkin_time', { ascending: false })
            .limit(1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Fetch active attendance error:', fetchError);
            return res.status(500).json({ message: 'Database error while checking status.' });
        }

        if (!latestAttendance) {
            return res.status(400).json({ message: 'No active check-in found to check out from.' });
        }
        
        const activeAttendanceId = latestAttendance.id;
        const checkinTime = latestAttendance.checkin_time;

        // 2. Office validation (Geo-fencing)
        const { data: offices, error: officesError } = await supabase
            .from('offices')
            .select('*');

        if (officesError) return res.status(404).json({ message: 'No offices found' });

        const office = offices.find(o => 
            isWithinRadius(latitude, longitude, o.latitude, o.longitude, o.radius)
        );

        if (!office) return res.status(400).json({ message: 'You are outside all office areas' });


        // 3. Calculate hours for this SEGMENT (only total_hours)
        const { total_hours } = calculateHoursForSegment(checkinTime, checkoutTime);

        // 4. Update the attendance record with checkout time and calculated hours
        const { data: updatedAttendance, error: updateError } = await supabase
            .from('attendance')
            .update({
                checkout_office_id: office.id,
                checkout_latitude: latitude,
                checkout_longitude: longitude,
                checkout_time: checkoutTime,
                status: 'present',
                total_hours: total_hours,
            })
            .eq('id', activeAttendanceId)
            .select();

        if (updateError) {
            console.error('Checkout update error:', updateError);
            return res.status(500).json({ message: updateError.message });
        }

        res.status(200).json({ message: 'Checked out successfully', attendance: updatedAttendance[0] });

    } catch (err) {
        console.error('Check-out exception:', err.message);
        const statusCode = err.message.includes('office areas') || err.message.includes('No active check-in') ? 400 : 500;
        res.status(statusCode).json({ message: err.message });
    }
};

// --- EMPLOYEE STATUS & LOGS ---

// -------------------------- GET TODAY'S STATUS (for the Check In/Out button) --------------------------
export const getCurrentAttendanceStatus = async (req, res) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) return res.status(401).json({ message: 'User not authenticated' });

        // Use helper without arguments to get today's IST start
        const IST_TODAY_START = getISTDayStartUTC();

        // Check for the LATEST active attendance record today
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('checkout_time')
            .eq('user_id', user_id)
            .is('checkout_time', null) // Only looking for an open session
            .gte('checkin_time', IST_TODAY_START)
            .order('checkin_time', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Status fetch error:', error);
            return res.status(500).json({ message: 'Database error while fetching status.' });
        }

        let status = 'Absent';

        if (attendance.length > 0) {
            // An open session exists
            status = 'Checked In';
        } else {
            // No open session, check if any sessions were completed today
             const { data: anyLog, error: anyLogError } = await supabase
                 .from('attendance')
                 .select('id')
                 .eq('user_id', user_id)
                 .gte('checkin_time', IST_TODAY_START)
                 .limit(1);
             
             if (anyLogError) console.error('Any log check error:', anyLogError);

             if (anyLog.length > 0) {
                 status = 'Checked Out';
             } else {
                 status = 'Absent';
             }
        }

        res.status(200).json({ status });

    } catch (err) {
        console.error('Get Status exception:', err.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
};


// -------------------------- GET ATTENDANCE LOGS BY DATE (AGGREGATING MULTIPLE SEGMENTS) --------------------------
export const getAttendanceLogs = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { date } = req.query; // Date in YYYY-MM-DD format from frontend

        if (!user_id) return res.status(401).json({ message: 'User not authenticated' });
        if (!date) return res.status(400).json({ message: 'Date query parameter is required' });

        // Calculate UTC boundaries for the specified IST date (00:00:00.000 IST)
        const istStart = new Date(`${date}T00:00:00.000+05:30`).toISOString();
        const istEnd = new Date(`${date}T23:59:59.999+05:30`).toISOString();
        
        // Fetch all attendance records (segments) for the specific IST date
        const { data: attendanceLog, error } = await supabase
            .from('attendance')
            // ⭐ CORRECTED QUERY: Fetch both checkin_office and checkout_office names
            .select(`
                id,
                checkin_time,
                checkout_time,
                status,
                total_hours, 
                checkin_office:checkin_office_id (name),
                checkout_office:checkout_office_id (name)
            `)
            .eq('user_id', user_id)
            .gte('checkin_time', istStart) // Filter using calculated UTC start
            .lte('checkin_time', istEnd) // Filter using calculated UTC end
            .order('checkin_time', { ascending: true }); // Order by check-in time

        if (error) {
            console.error('Attendance Log fetch error:', error);
            return res.status(500).json({ message: 'Database error while fetching log.' });
        }

        if (attendanceLog.length === 0) {
            return res.status(200).json({ logs: [], summary: { total_hours_sum: 0, total_overtime_sum: 0, day_status: 'Absent', overall_status: 'Absent', date: date } });
        }
        
        // 1. Sum hours from all segments completed so far
        let totalHoursSum = attendanceLog.reduce((sum, log) => sum + (log.total_hours || 0), 0);
        
        // 2. Handle active session time for the current summary view
        let hasActiveSession = false;
        
        const processedLogs = attendanceLog.map(log => {
            if (log.checkout_time === null) {
                hasActiveSession = true;
                
                // Calculate time worked so far in the active session
                const currentlyWorkedMs = new Date().getTime() - new Date(log.checkin_time).getTime();
                const currentlyWorkedHours = currentlyWorkedMs / (1000 * 60 * 60);

                // Add active session time to total sum
                totalHoursSum += currentlyWorkedHours;
            }
            return log;
        });

        // 3. Calculate the final total overtime *after* summing all hours.
        // Ensure overtime is not negative
        let totalOvertimeSum = Math.max(0, totalHoursSum - STANDARD_WORK_HOURS);
        
        // 4. Determine the FINAL Day Status based on the aggregated total hours
        const finalDayStatus = calculateFinalDayStatus(totalHoursSum);
        
        // 5. Determine the overall operational status
        const overallStatus = hasActiveSession ? 'Checked In' : (totalHoursSum > 0 ? 'Checked Out' : 'Absent');


        // Helper to convert UTC ISO string to readable IST for FRONTEND DISPLAY
        const toIST = (isoString) => {
            if (!isoString) return null;
            return new Date(isoString).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        };

        const responseLogs = processedLogs.map(log => ({
            id: log.id,
            check_in_time_ist: toIST(log.checkin_time),
            check_out_time_ist: toIST(log.checkout_time),
            status: log.checkout_time ? 'Completed' : 'Checked In',
            total_hours: log.total_hours, // Segment-specific hours
            checkin_office_name: log.checkin_office?.name || 'Unknown',
            checkout_office_name: log.checkout_office?.name || (log.checkout_time ? 'Unknown' : 'In Session'),
        }));

        res.status(200).json({ 
            logs: responseLogs, 
            summary: {
                total_hours_sum: parseFloat(totalHoursSum.toFixed(2)),
                total_overtime_sum: parseFloat(totalOvertimeSum.toFixed(2)),
                date: date,
                day_status: finalDayStatus, // LOP, Half Day, Full Day
                overall_status: overallStatus // Checked In, Checked Out, Absent
            }
        });

    } catch (err) {
        console.error('Get Attendance Logs exception:', err.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
};


export const getEmployeesStatusByDate = async (req, res) => {
    // 1. Authorization Check
    if (!['hr', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Forbidden: Only HR or Admin can view all employee statuses.' });
    }

    try {
        // 2. Get and Validate Date Parameter 
        const targetDateString = req.query.date; 
        let targetDate = new Date(); // Default to today

        if (targetDateString) {
            const parsedDate = new Date(targetDateString);
            
            if (isNaN(parsedDate)) {
                 return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
            }
            
            // 1. Create the date object from the string.
            targetDate = new Date(targetDateString); 
            
            // 2. IMPORTANT: Explicitly set time to midnight (00:00:00) in the server's local time zone.
            targetDate.setHours(0, 0, 0, 0); 
        }

        // Calculate the UTC range for the target IST day
        const { startUTC, endUTC, formattedDate } = getISTDayRangeUTC(targetDate); 
        const isToday = isISTToday(targetDate);
        
        // 3. Fetch Users
        const { data: allUsers, error: userError } = await supabase
            .from('users')
            .select('id, employee_id, name, email')
            .eq('role', 'employee');

        if (userError) {
             console.error('Fetch all users error:', userError);
             return res.status(500).json({ message: 'Database error while fetching user list.' });
        }

        // 4. Fetch Attendance Segments for the specified date
        const { data: attendanceSegments, error: attendanceError } = await supabase
            .from('attendance')
            .select(`
                user_id, 
                checkin_time, 
                checkout_time, 
                total_hours, 
                checkin_office_id (name), 
                checkout_office_id (name) 
            `) 
            // Query within the calculated UTC range
            .gte('checkin_time', startUTC)
            .lt('checkin_time', endUTC) 
            .order('checkin_time', { ascending: false }); 

        if (attendanceError) {
            console.error('Fetch all attendance error:', JSON.stringify(attendanceError, null, 2));
            return res.status(500).json({ message: 'Database error while fetching attendance logs.' });
        }
        
        // 5. Process data
        const attendanceMap = {};
        const totalHoursMap = {};

        attendanceSegments.forEach(segment => {
            const userId = segment.user_id;
            const hours = segment.total_hours || 0;
            
            // Sum up total hours for the day for the final status calculation
            totalHoursMap[userId] = (totalHoursMap[userId] || 0) + hours;
            
            const checkinOfficeName = segment.checkin_office_id ? segment.checkin_office_id.name : null;
            const checkoutOfficeName = segment.checkout_office_id ? segment.checkout_office_id.name : null;

            // Only consider the *latest* segment for live status/latest office location
            if (!attendanceMap[userId] || new Date(segment.checkin_time) > new Date(attendanceMap[userId].latestCheckinTime || 0)) {
                const status = segment.checkout_time === null ? 'Checked In' : 'Checked Out';
                
                attendanceMap[userId] = { 
                    status,
                    latestCheckinTime: segment.checkin_time,
                    latestCheckinOffice: checkinOfficeName, 
                    latestCheckoutOffice: checkoutOfficeName, 
                };
            }
        });

        // 6. Combine results and format the response
        const report = allUsers.map(user => {
            const attendanceInfo = attendanceMap[user.id];
            let totalHours = totalHoursMap[user.id] || 0;
            
            let status = 'Absent';
            let dayStatus = 'Absent';
            let latestCheckinOffice = null; 
            let latestCheckoutOffice = null; 
            
            if (attendanceInfo) {
                status = attendanceInfo.status;
                latestCheckinOffice = attendanceInfo.latestCheckinOffice; 
                latestCheckoutOffice = attendanceInfo.latestCheckoutOffice; 
                
                // Active session calculation ONLY for the current day
                if (status === 'Checked In' && attendanceInfo.latestCheckinTime && isToday) {
                     const currentlyWorkedMs = new Date().getTime() - new Date(attendanceInfo.latestCheckinTime).getTime();
                     const currentlyWorkedHours = currentlyWorkedMs / (1000 * 60 * 60);
                     totalHours = totalHours + currentlyWorkedHours;
                }
                
                dayStatus = calculateFinalDayStatus(totalHours);
            }
            
            return {
                user_id: user.id,
                employee_id: user.employee_id,
                name: user.name,
                email: user.email,
                total_hours_today: parseFloat(totalHours.toFixed(2)),
                overall_status: status,
                day_status: dayStatus,
                checkin_office: latestCheckinOffice,
                checkout_office: latestCheckoutOffice,
            };
        });

        // Sort by name
        report.sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json({ 
            date: formattedDate, 
            report 
        });

    } catch (err) {
        console.error('Get All Employees Status By Date Exception:', err.message);
        res.status(500).json({ message: 'Internal server error while fetching employee statuses.' });
    }
};

// --- EXPORT LOGIC ---

// -------------------------- EXPORT DAILY ATTENDANCE (SINGLE DAY EXPORT) --------------------------
/**
 * Fetches attendance logs for a SPECIFIC DATE and exports to Excel.
 * This is used by the employee's My Attendance tab for a single day.
 */
export const exportDailyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.query; // Date in YYYY-MM-DD format from frontend

        if (!userId) return res.status(401).json({ message: 'User not authenticated' });
        if (!date) return res.status(400).json({ message: 'Date query parameter is required' });

        // Calculate UTC boundaries for the specified IST date
        const istStart = new Date(`${date}T00:00:00.000+05:30`).toISOString();
        const istEnd = new Date(`${date}T23:59:59.999+05:30`).toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .select(`
                id,
                checkin_time,
                checkout_time,
                status,
                total_hours,
                users:user_id (id, employee_id, name),
                checkin_office:checkin_office_id (name),
                checkout_office:checkout_office_id (name)
            `)
            .eq('user_id', userId)
            .gte('checkin_time', istStart) // Filter using calculated UTC start
            .lte('checkin_time', istEnd) // Filter using calculated UTC end
            .order('checkin_time', { ascending: true }); // Order by check-in time

        if (error) {
            console.error(`Export Daily Attendance Error for ${date}:`, error);
            return res.status(500).json({ message: `Failed to fetch daily attendance logs for ${date}` });
        }
        
        if (!data || data.length === 0) {
             // Return a 404/400 that the client can handle, but send no data
             return res.status(404).json({ message: `No attendance records found for ${date}.` });
        }


        // Helper to convert UTC ISO string to readable IST for Excel
        const formatTimeIST = (isoString) => {
            if (!isoString) return "";
            return new Date(isoString).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata', 
                dateStyle: 'short', 
                timeStyle: 'medium' 
            });
        };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Attendance Log - ${date}`);

        worksheet.columns = [
            { header: 'Employee ID', key: 'employee_id', width: 20 },
            { header: 'Employee Name', key: 'name', width: 30 },
            { header: 'Check-in Office', key: 'checkin_office', width: 25 },
            { header: 'Check-out Office', key: 'checkout_office', width: 25 },
            { header: 'Check-in Time (IST)', key: 'checkin_time_ist', width: 28 },
            { header: 'Check-out Time (IST)', key: 'checkout_time_ist', width: 28 },
            { header: 'Total Hours (Segment)', key: 'total_hours', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        data.forEach(row => {
            worksheet.addRow({
                employee_id: row.users?.employee_id || '',
                name: row.users?.name || '',
                checkin_office: row.checkin_office?.name || 'N/A', 
                // Handle 'In Session' if checkout_time is null
                checkout_office: row.checkout_office?.name || (row.checkout_time ? 'N/A' : 'In Session'), 
                checkin_time_ist: formatTimeIST(row.checkin_time),
                checkout_time_ist: formatTimeIST(row.checkout_time),
                total_hours: row.total_hours || '',
                status: row.checkout_time ? 'Completed' : 'Checked In',
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=my_attendance_log_${date}.xlsx`);
        await workbook.xlsx.write(res);
        res.status(200).end();

    } catch (err) {
        console.error('Export Daily Attendance Exception:', err.message);
        res.status(500).json({ message: 'Failed to export daily attendance logs.' });
    }
};


// -------------------------- EXPORT MY ATTENDANCE (MODIFIED FOR DATE RANGE) --------------------------
/**
 * Exports all attendance logs for the employee, optionally filtered by a date range (start/end).
 */
export const exportMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        // ⭐ MODIFIED: Read start and end dates from query parameters
        const { start, end } = req.query; 

        if (!userId) return res.status(401).json({ message: 'User not authenticated' });
        
        let query = supabase
            .from('attendance')
            .select(`
                id,
                checkin_time,
                checkout_time,
                status,
                total_hours,
                users: user_id (id, employee_id, name),
                checkin_office:checkin_office_id (name), 
                checkout_office:checkout_office_id (name)
            `)
            .eq('user_id', userId)
            .order('checkin_time', { ascending: false }); // Sort descending by default

        // 🗓️ Apply Date Range Filters based on IST
        if (start) {
            // Interpret start as 00:00:00.000 IST on that day (convert to UTC)
            const istStartUtc = new Date(`${start}T00:00:00.000+05:30`).toISOString();
            query = query.gte("checkin_time", istStartUtc);
        }
        if (end) {
            // Interpret end as 23:59:59.999 IST on that day (convert to UTC)
            const istEndUtc = new Date(`${end}T23:59:59.999+05:30`).toISOString();
            query = query.lte("checkin_time", istEndUtc);
        }
        
        const { data, error } = await query;

        if (error) {
            console.error('Export My Attendance Error:', error);
            return res.status(500).json({ message: 'Failed to export your attendance logs' });
        }

        if (!data || data.length === 0) {
            const dateRange = start && end ? `from ${start} to ${end}` : 'for the selected period';
            return res.status(404).json({ message: `No attendance records found ${dateRange}.` });
        }
        
        // Helper to convert UTC ISO string to readable IST for Excel
        const formatTimeIST = (isoString) => {
            if (!isoString) return "";
            return new Date(isoString).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata', 
                dateStyle: 'short', 
                timeStyle: 'medium' 
            });
        };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Attendance Logs');

        worksheet.columns = [
            { header: 'Employee ID', key: 'employee_id', width: 20 },
            { header: 'Employee Name', key: 'name', width: 30 },
            { header: 'Check-in Office', key: 'checkin_office', width: 25 },
            { header: 'Check-out Office', key: 'checkout_office', width: 25 },
            { header: 'Check-in Time (IST)', key: 'checkin_time_ist', width: 28 },
            { header: 'Check-out Time (IST)', key: 'checkout_time_ist', width: 28 },
            { header: 'Total Hours (Segment)', key: 'total_hours', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        data.forEach(row => {
            worksheet.addRow({
                employee_id: row.users?.employee_id || '',
                name: row.users?.name || '',
                checkin_office: row.checkin_office?.name || 'N/A', 
                checkout_office: row.checkout_office?.name || (row.checkout_time ? 'N/A' : 'In Session'), 
                checkin_time_ist: formatTimeIST(row.checkin_time),
                checkout_time_ist: formatTimeIST(row.checkout_time),
                total_hours: row.total_hours || '',
                status: row.status,
            });
        });

        // Use the date range in the filename for clarity
        const filename = `my_attendance_range_${start || 'all'}_to_${end || 'all'}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        await workbook.xlsx.write(res);
        res.status(200).end();

    } catch (err) {
        console.error('Export My Attendance Range Exception:', err.message);
        res.status(500).json({ message: 'Failed to export your attendance logs' });
    }
};


// -------------------------- EXPORT ALL ATTENDANCE (HR/ADMIN LOGIC) --------------------------

export const exportAllAttendance = async (req, res) => {
    // 1. Basic Authorization Check
    if (!['hr', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access this report.' });
    }

    try {
        const { start, end, employee_id } = req.query;
        let userIdToFilter = null; 
        
        // --- Step 1: Robustly find user_id using employee_id ---
        if (employee_id) {
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("employee_id", employee_id)
                .single(); 

            if (userError && userError.code !== 'PGRST116') {
                console.error("Supabase user lookup failed:", userError);
                return res.status(500).json({ message: "Failed to resolve employee ID during lookup." });
            }

            if (!userData) {
                return res.status(404).json({ message: `Employee ID "${employee_id}" not found.` });
            }
            userIdToFilter = userData.id;
        }

        // --- 2. Build Dynamic Query for Attendance (JOINS RESTORED) ---
        let query = supabase
             .from("attendance")
             .select(`
                 id,
                 checkin_time,
                 checkout_time,
                 status,
                 total_hours,
                 users:user_id (id, employee_id, name, email, role), 
                 checkin_office:checkin_office_id (name),
                 checkout_office:checkout_office_id (name)
             `)
             .order('checkin_time', { ascending: false }); // Always sort by time

        if (userIdToFilter) {
            query = query.eq('user_id', userIdToFilter);
        }

        // 🗓️ Apply Date Range Filters based on IST
        if (start) {
            const istStartUtc = new Date(`${start}T00:00:00.000+05:30`).toISOString();
            query = query.gte("checkin_time", istStartUtc);
        }
        if (end) {
            const istEndUtc = new Date(`${end}T23:59:59.999+05:30`).toISOString();
            query = query.lte("checkin_time", istEndUtc);
        }
        
        const { data, error } = await query;

        if (error) {
            // Check your Supabase logs for the specific reason for this failure!
            console.error('Export All Attendance Supabase Query Error:', error);
            return res.status(500).json({ 
                message: 'Failed to retrieve attendance data for the report.',
                details: error.message 
            });
        }

        if (!data || data.length === 0) {
            const filters = employee_id ? `for Employee ID ${employee_id}` : 'for the organization';
            const dateRange = start && end ? `from ${start} to ${end}` : 'for the selected period';
            return res.status(404).json({ message: `No attendance records found ${filters} ${dateRange}.` });
        }

        // Helper to convert UTC ISO string to readable IST for Excel
        const formatTimeIST = (isoString) => {
            if (!isoString) return "";
            return new Date(isoString).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata', 
                dateStyle: 'short', 
                timeStyle: 'medium' 
            });
        };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('All Attendance Report');

        // Define columns
        worksheet.columns = [
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Employee Name', key: 'name', width: 30 },
            { header: 'Employee Email', key: 'email', width: 30 },
            { header: 'Employee Role', key: 'role', width: 15 }, // ADDED ROLE COLUMN
            { header: 'Check-in Office', key: 'checkin_office', width: 25 },
            { header: 'Check-out Office', key: 'checkout_office', width: 25 },
            { header: 'Check-in Time (IST)', key: 'checkin_time_ist', width: 28 },
            { header: 'Check-out Time (IST)', key: 'checkout_time_ist', width: 28 },
            { header: 'Total Hours (Segment)', key: 'total_hours', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        data.forEach(row => {
            worksheet.addRow({
                employee_id: row.users?.employee_id || 'N/A',
                name: row.users?.name || 'Unknown User',
                email: row.users?.email || 'N/A',
                role: row.users?.role || 'N/A', // MAPPED ROLE DATA
                checkin_office: row.checkin_office?.name || 'N/A', 
                // Handle 'In Session' if checkout_time is null
                checkout_office: row.checkout_office?.name || (row.checkout_time ? 'N/A' : 'In Session'), 
                checkin_time_ist: formatTimeIST(row.checkin_time),
                checkout_time_ist: row.checkout_time ? formatTimeIST(row.checkout_time) : 'N/A', // Display N/A for null checkout
                total_hours: row.total_hours || '0.00',
                status: row.checkout_time ? 'Completed' : 'Checked In', 
            });
        });

        // Use the filters in the filename
        const filename = `all_attendance_report_${start || 'all'}_to_${end || 'all'}.xlsx`;

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        // Write the workbook to the response stream
        await workbook.xlsx.write(res);
        res.status(200).end();
        
    } catch (err) {
        // Log the specific technical error message
        console.error('Export All Attendance Exception:', err.message); 
        
        // Return a generic error to the client
        res.status(500).json({ message: 'Failed to export the comprehensive attendance report.' });
    }
};
