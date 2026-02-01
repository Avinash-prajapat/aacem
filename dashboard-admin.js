// 🔒 AUTHENTICATION SYSTEM - Add this at the VERY TOP of your file
(function() {
    'use strict';
    
    // Check authentication status
    function checkAuth() {
        const isAuthenticated = sessionStorage.getItem('isAuthenticated');
        const loginTime = sessionStorage.getItem('adminLoginTime');
        const adminUsername = sessionStorage.getItem('adminUsername');
        
        console.log('Auth Check:', { isAuthenticated, loginTime, adminUsername });
        
        // If not authenticated or missing data, redirect to login
        if (!isAuthenticated || !loginTime || !adminUsername) {
            console.log('Not authenticated, redirecting to login');
            redirectToLogin();
            return false;
        }
        
        // Check session timeout (8 hours)
        const currentTime = new Date().getTime();
        const loginDuration = currentTime - parseInt(loginTime);
        const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
        
        if (loginDuration > eightHours) {
            console.log('Session expired, clearing storage');
            sessionStorage.clear();
            showSessionExpired();
            return false;
        }
        
        console.log('Authentication successful');
        return true;
    }
    
    function redirectToLogin() {
        // Store current page to return after login
        sessionStorage.setItem('redirectUrl', window.location.href);
        window.location.href = 'admin-login.html';
    }
    
    function showSessionExpired() {
        const modalHtml = `
            <div class="modal fade" id="sessionExpiredModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">Session Expired</h5>
                        </div>
                        <div class="modal-body">
                            <div class="text-center">
                                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                                <p>Your session has expired due to inactivity.</p>
                                <p>Please login again to continue.</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="redirectToLoginPage()">Login Again</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if not exists
        if (!document.getElementById('sessionExpiredModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        const modal = new bootstrap.Modal(document.getElementById('sessionExpiredModal'));
        modal.show();
    }
    
    // Global function for redirect
    window.redirectToLoginPage = function() {
        sessionStorage.clear();
        window.location.href = 'admin-login.html';
    };
    
    // Enhanced logout function - REPLACE your existing logout function
    window.logout = function() {
        if (confirm("Are you sure you want to log out?")) {
            sessionStorage.clear();
            window.location.href = "index.html";
        }
    };
    
    // Auto logout after inactivity (30 minutes)
    let inactivityTime = function() {
        let time;
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        document.onclick = resetTimer;
        document.onmousedown = resetTimer;
        document.ontouchstart = resetTimer;
        
        function logout() {
            if (sessionStorage.getItem('isAuthenticated') === 'true') {
                showSessionExpired();
            }
        }
        
        function resetTimer() {
            clearTimeout(time);
            time = setTimeout(logout, 30 * 60 * 1000); // 30 minutes
        }
    };
    
    // Initialize auth check when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, checking authentication...');
        
        if (!checkAuth()) {
            return;
        }
        
        // Initialize inactivity timer
        inactivityTime();
        
        // Update UI with admin info
        const adminUsername = sessionStorage.getItem('adminUsername');
        const adminInfoElement = document.getElementById('adminInfo');
        if (adminInfoElement) {
            adminInfoElement.textContent = `Welcome, ${adminUsername}`;
        }
        
        // Update logout button in sidebar if exists
        const logoutBtn = document.querySelector('[onclick="logout()"]');
        if (logoutBtn) {
            logoutBtn.onclick = window.logout;
        }
        
        // Continue with your existing dashboard initialization
        console.log('Dashboard initializing...');
        
        // Your existing initialization code will run here automatically
        // since it's already in DOMContentLoaded
    });
    
    // Protect against browser back button after logout
    window.addEventListener('pageshow', function(event) {
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            // Page was loaded from cache (back/forward button)
            if (!sessionStorage.getItem('isAuthenticated')) {
                redirectToLogin();
            }
        }
    });
    
})();


// Global variables
let studentsData = [];
let teachersData = [];
let coursesData = [];
let feesData = [];
let attendanceData = [];
let marksData = [];
let notificationsData = [];
let currentEditId = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');
    loadDashboardData();
    loadNotifications();
    setupModalListeners();
    setupSearchFunctionality();
});

// Setup modal event listeners
function setupModalListeners() {
    console.log('Setting up modal listeners...');
    const modals = ['studentModal', 'teacherModal', 'feeModal', 'marksModal', 'attendanceModal', 'notificationModal', 'reportModal', 'courseModal', 'settingsModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('hidden.bs.modal', function() {
                const form = this.querySelector('form');
                if (form) {
                    form.reset();
                    resetModalToAddMode(modalId);
                }
            });
        }
    });

    // Populate dropdowns when modals open
    document.getElementById('feeModal').addEventListener('show.bs.modal', function() {
        console.log('Fee modal opened');
        populateStudentDropdown('feeForm');
    });

    document.getElementById('marksModal').addEventListener('show.bs.modal', function() {
        console.log('Marks modal opened');
        populateStudentDropdown('marksForm');
    });

    document.getElementById('studentModal').addEventListener('show.bs.modal', function() {
        console.log('Student modal opened');
        populateCourseDropdown('studentForm', 'course');
    });

    // FIXED: Attendance modal population
    document.getElementById('attendanceModal').addEventListener('show.bs.modal', async function() {
        console.log('Attendance modal opened - ensuring courses are loaded');
        
        // Ensure courses are loaded before populating dropdown
        const coursesLoaded = await ensureCoursesLoaded();
        
        if (coursesLoaded) {
            populateCourseDropdown('attendanceForm', 'class');
        } else {
            const select = document.querySelector('#attendanceForm select[name="class"]');
            if (select) {
                select.innerHTML = '<option value="">No courses available. Please add courses first.</option>';
            }
        }
        
        // Set current date
        const dateInput = this.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Clear previous students list
        const container = document.getElementById('attendanceStudentsList');
        if (container) {
            container.innerHTML = '<p class="text-muted text-center p-3">Select a class and date to load students</p>';
        }
    });

    // Set current date for relevant modals
    document.getElementById('feeModal').addEventListener('show.bs.modal', function() {
        const dateInput = this.querySelector('input[type="date"]');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    });

    document.getElementById('marksModal').addEventListener('show.bs.modal', function() {
        const dateInput = this.querySelector('input[type="date"]');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    });
}

// Enhanced function to handle course loading
async function ensureCoursesLoaded() {
    if (coursesData.length === 0) {
        console.log('No courses in cache, loading courses...');
        try {
            const response = await fetch('https://aacem-backend.onrender.com/api/courses');
            const data = await response.json();
            if (data.success) {
                coursesData = data.courses || [];
                console.log('Courses loaded:', coursesData.length);
                return true;
            } else {
                console.error('Failed to load courses:', data.message);
                return false;
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            return false;
        }
    }
    return coursesData.length > 0;
}

// Setup search functionality
function setupSearchFunctionality() {
    const studentSearch = document.getElementById('studentSearch');
    const teacherSearch = document.getElementById('teacherSearch');
    
    if (studentSearch) {
        studentSearch.addEventListener('input', function(e) {
            filterTable('studentsTableBody', e.target.value.toLowerCase());
        });
    }
    
    if (teacherSearch) {
        teacherSearch.addEventListener('input', function(e) {
            filterTable('teachersTableBody', e.target.value.toLowerCase());
        });
    }
}

// Filter table rows
function filterTable(tableBodyId, searchTerm) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');
    
    for (let row of rows) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    }
}

// Toggle notifications panel
function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('open');
    }
}

// Show dashboard
function showDashboard() {
    const studentsTab = document.getElementById('students-tab');
    if (studentsTab) {
        studentsTab.click();
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        showLoading('dashboardStats');
        console.log('Loading dashboard data...');
        
        const response = await fetch('https://aacem-backend.onrender.com/api/dashboard-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update data arrays
            studentsData = data.students || [];
            teachersData = data.teachers || [];
            coursesData = data.courses || [];
            feesData = data.fees || [];
            attendanceData = data.attendance || [];
            marksData = data.marks || [];
            notificationsData = data.notifications || [];
            
            console.log('Data loaded successfully:');
            console.log(`- Students: ${studentsData.length}`);
            console.log(`- Teachers: ${teachersData.length}`);
            console.log(`- Courses: ${coursesData.length}`);
            console.log(`- Active Courses: ${coursesData.filter(c => c.is_active).length}`);
            
            if (coursesData.length > 0) {
                console.log('Sample course:', coursesData[0]);
            }
            
            // Update UI with data
            updateStudentsTable();
            updateTeachersTable();
            updateCoursesTable();
            updateFeesTable();
            updateAttendanceTable();
            updateMarksTable();
            updateNotifications();
            
            // Update stats
            updateDashboardStats(data.stats);
            
            showSuccess('Dashboard data loaded successfully');
            
        } else {
            console.error('Failed to load dashboard data:', data.message);
            showError('Failed to load dashboard data: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to connect to server: ' + error.message);
    } finally {
        hideLoading('dashboardStats');
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    const totalStudents = document.getElementById('totalStudents');
    const totalTeachers = document.getElementById('totalTeachers');
    const totalCourses = document.getElementById('totalCourses');
    const totalRevenue = document.getElementById('totalRevenue');
    
    if (totalStudents) totalStudents.textContent = stats.total_students || 0;
    if (totalTeachers) totalTeachers.textContent = stats.total_teachers || 0;
    if (totalCourses) totalCourses.textContent = stats.total_courses || 0;
    
    const revenue = stats.total_revenue || 0;
    if (totalRevenue) totalRevenue.textContent = '₹' + revenue.toLocaleString();
    
    updateNotificationBadge();
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
    }
}

// Hide loading state
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
    }
}

// Show error message
function showError(message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.className = 'sync-status bg-danger text-white';
        syncStatus.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i> ${message}`;
        syncStatus.style.display = 'block';
        
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 5000);
    }
    
    // Also show alert for important errors
    console.error('Error:', message);
}

// Show success message
function showSuccess(message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.className = 'sync-status bg-success text-white';
        syncStatus.innerHTML = `<i class="fas fa-check-circle me-2"></i> ${message}`;
        syncStatus.style.display = 'block';
        
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 3000);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const response = await fetch('https://aacem-backend.onrender.com/api/notifications');
        const data = await response.json();
        
        if (data.success) {
            notificationsData = data.notifications || [];
            updateNotifications();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        const unreadCount = notificationsData.length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}


// Update marks student dropdown
function updateMarksStudentDropdown(students, searchTerm = '') {
    const studentSelect = document.getElementById('marksStudentSelect');
    
    if (!studentSelect) return;
    
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    
    if (students.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = searchTerm ? 'No students found matching your search' : 'No students available';
        option.disabled = true;
        studentSelect.appendChild(option);
        return;
    }
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.name} (${student.student_id})`;
        option.setAttribute('data-student-name', student.name);
        studentSelect.appendChild(option);
    });
}


// Update notifications in the panel
function updateNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    if (notificationsData.length === 0) {
        notificationList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    notificationsData.forEach(notification => {
        const priorityClass = notification.priority === 'high' ? 'border-danger' : 
                            notification.priority === 'medium' ? 'border-warning' : 'border-info';
        
        const notificationElement = document.createElement('div');
        notificationElement.className = `card mb-2 ${priorityClass} notification-item`;
        notificationElement.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${notification.title || 'No Title'}</h6>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editNotification(${notification.id})"><i class="fas fa-edit me-2"></i>Edit</a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteNotification(${notification.id})"><i class="fas fa-trash me-2"></i>Delete</a></li>
                        </ul>
                    </div>
                </div>
                <p class="card-text mb-2">${notification.message || 'No message'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${formatDate(notification.created_at)}</small>
                    <div>
                        <span class="badge bg-${notification.audience === 'students' ? 'info' : notification.audience === 'teachers' ? 'warning' : 'primary'} me-1">${notification.audience || 'all'}</span>
                        <span class="badge bg-${notification.priority === 'high' ? 'danger' : notification.priority === 'medium' ? 'warning' : 'info'}">${notification.priority || 'medium'}</span>
                    </div>
                </div>
            </div>
        `;
        notificationList.appendChild(notificationElement);
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return 'Invalid Date';
    }
}

// Populate student dropdown in forms
function populateStudentDropdown(formId) {
    const select = document.querySelector(`#${formId} select[name="studentId"]`);
    if (!select) {
        console.error(`Student dropdown not found for form: ${formId}`);
        return;
    }
    
    console.log(`Populating student dropdown for ${formId} with ${studentsData.length} students`);
    
    select.innerHTML = '<option value="">Select Student</option>';
    
    if (studentsData.length === 0) {
        console.warn('No students data available');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No students available';
        option.disabled = true;
        select.appendChild(option);
        return;
    }
    
    studentsData.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.name || 'Unknown'} (${student.student_id}) - ${student.course || 'No Course'}`;
        select.appendChild(option);
    });
    
    console.log(`Populated ${select.options.length - 1} students`);
}

// FIXED: Populate course dropdown in forms with dynamic field name
function populateCourseDropdown(formId, fieldName = 'course') {
    const select = document.querySelector(`#${formId} select[name="${fieldName}"]`);
    if (!select) {
        console.error(`Course dropdown not found for form: ${formId}, field: ${fieldName}`);
        return;
    }
    
    console.log(`Populating course dropdown for ${formId} with ${coursesData.length} courses`);
    console.log('Available courses:', coursesData);
    
    select.innerHTML = '<option value="">Select Course</option>';
    
    if (coursesData.length === 0) {
        console.warn('No courses data available');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No courses available';
        option.disabled = true;
        select.appendChild(option);
        return;
    }
    
    let activeCoursesCount = 0;
    coursesData.forEach(course => {
        // Check if course is active (default to true if not specified)
        if (course.is_active !== false) {
            const option = document.createElement('option');
            option.value = course.course_code;
            option.textContent = `${course.course_name || 'Unnamed Course'} (${course.course_code})`;
            option.setAttribute('data-fee', course.fee_amount || 0);
            select.appendChild(option);
            activeCoursesCount++;
        }
    });
    
    console.log(`Populated ${activeCoursesCount} active courses out of ${coursesData.length} total courses`);
    
    if (activeCoursesCount === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No active courses available';
        option.disabled = true;
        select.appendChild(option);
    }
}





// =====================================================
// ATTENDANCE MANAGEMENT FUNCTIONS - COMPLETE & FIXED
// =====================================================

// Update attendance table - Class-wise display
function updateAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (attendanceData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                        <p>No attendance records found</p>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#attendanceModal">
                            <i class="fas fa-plus me-1"></i> Mark First Attendance
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group attendance by class
    const attendanceByClass = {};
    attendanceData.forEach(record => {
        if (!attendanceByClass[record.class]) {
            attendanceByClass[record.class] = [];
        }
        attendanceByClass[record.class].push(record);
    });
    
    // Display classes with their records
    Object.entries(attendanceByClass).forEach(([className, records]) => {
        // Sort records by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const latestRecord = records[0];
        const totalRecords = records.length;
        
        // Calculate average attendance
        const avgPercentage = records.reduce((sum, r) => sum + (r.percentage || 0), 0) / records.length;
        
        // Class header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'class-header-row bg-light';
        headerRow.style.cursor = 'pointer';
        headerRow.innerHTML = `
            <td colspan="6" class="py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-users me-2 text-primary"></i>
                            <strong>${className}</strong>
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-calendar-alt me-1"></i> ${totalRecords} Records
                            <span class="mx-2">|</span>
                            <i class="fas fa-chart-line me-1"></i> Avg: ${avgPercentage.toFixed(1)}%
                            <span class="mx-2">|</span>
                            <i class="fas fa-clock me-1"></i> Last: ${formatDate(latestRecord.date)}
                        </small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewClassAttendance('${className}')" title="View All Records">
                            <i class="fas fa-list me-1"></i> View All (${totalRecords})
                        </button>
                        <button class="btn btn-outline-success" onclick="markNewAttendance('${className}')" title="Mark New Attendance">
                            <i class="fas fa-plus me-1"></i> Mark New
                        </button>
                        <button class="btn btn-outline-info" onclick="toggleClassRecords('${className.replace(/\s+/g, '-')}')" title="Toggle Records">
                            <i class="fas fa-chevron-down" id="toggle-icon-${className.replace(/\s+/g, '-')}"></i>
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(headerRow);
        
        // Show latest 3 records for each class
        records.slice(0, 3).forEach((record, index) => {
            const row = document.createElement('tr');
            row.className = `attendance-record-row class-record-${className.replace(/\s+/g, '-')}`;
            row.style.display = 'none'; // Hidden by default
            
            const percentageClass = record.percentage >= 80 ? 'bg-success' : 
                                  record.percentage >= 60 ? 'bg-warning' : 'bg-danger';
            
            row.innerHTML = `
                <td style="padding-left: 40px;">
                    <i class="fas fa-calendar text-muted me-2"></i>
                    ${formatDate(record.date)}
                </td>
                <td>
                    <span class="badge bg-success">${record.present_count || 0}</span>
                </td>
                <td>
                    <span class="badge bg-danger">${record.absent_count || 0}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px; min-width: 100px;">
                            <div class="progress-bar ${percentageClass}" 
                                 style="width: ${record.percentage || 0}%"></div>
                        </div>
                        <strong>${record.percentage || 0}%</strong>
                    </div>
                </td>
                <td>
                    <small class="text-muted">
                        ${record.present_count || 0}/${(record.present_count || 0) + (record.absent_count || 0)} students
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info btn-sm" onclick="viewAttendanceDetails(${record.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="editAttendance(${record.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAttendance(${record.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Show "view more" if more than 3 records
        if (records.length > 3) {
            const moreRow = document.createElement('tr');
            moreRow.className = `attendance-record-row class-record-${className.replace(/\s+/g, '-')}`;
            moreRow.style.display = 'none';
            moreRow.innerHTML = `
                <td colspan="6" class="text-center py-2" style="background: #f8f9fa;">
                    <button class="btn btn-sm btn-link" onclick="viewClassAttendance('${className}')">
                        <i class="fas fa-plus-circle me-1"></i> View ${records.length - 3} more records
                    </button>
                </td>
            `;
            tbody.appendChild(moreRow);
        }
    });
}

// Toggle class records visibility
function toggleClassRecords(className) {
    const records = document.querySelectorAll(`.class-record-${className}`);
    const icon = document.getElementById(`toggle-icon-${className}`);
    const isVisible = records[0] && records[0].style.display !== 'none';
    
    records.forEach(row => {
        row.style.display = isVisible ? 'none' : '';
    });
    
    if (icon) {
        icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}

// Mark new attendance for a class
function markNewAttendance(className) {
    const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
    const form = document.getElementById('attendanceForm');
    
    // Reset form
    form.reset();
    
    // Set class
    const classSelect = form.querySelector('select[name="class"]');
    if (classSelect) {
        classSelect.value = className;
    }
    
    // Set today's date
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Load students
    loadClassStudents(className);
    
    // Show modal
    modal.show();
}

// Load students for attendance marking
async function loadClassStudents(className) {
    const container = document.getElementById('attendanceStudentsList');
    const dateInput = document.querySelector('#attendanceForm input[name="date"]');
    
    if (!container) {
        console.error('Attendance students container not found');
        return;
    }
    
    if (!dateInput || !dateInput.value) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Please select a date first
            </div>
        `;
        return;
    }
    
    if (!className) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Please select a class first
            </div>
        `;
        return;
    }
    
    const selectedDate = dateInput.value;
    
    container.innerHTML = `
        <div class="text-center p-3">
            <div class="loading-spinner mb-2"></div>
            <p class="text-muted mb-0">Loading students...</p>
        </div>
    `;
    
    try {
        // Check if attendance already exists
        const checkResponse = await fetch(
            `https://aacem-backend.onrender.com/api/attendance/check-existing?date=${selectedDate}&class=${encodeURIComponent(className)}`
        );
        const checkResult = await checkResponse.json();
        
        let existingAttendance = null;
        if (checkResult.success && checkResult.exists) {
            existingAttendance = checkResult.attendance;
        }
        
        // Load students
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/attendance/students/${encodeURIComponent(className)}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.students || result.students.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No students found in this class. Please add students first.
                </div>
            `;
            return;
        }
        
        // Show warning if attendance exists
        let html = '';
        if (existingAttendance) {
            html += `
                <div class="alert alert-warning mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Attendance already exists for ${selectedDate}</strong>
                            <div class="mt-1">
                                <small>
                                    Present: ${existingAttendance.present_count} | 
                                    Absent: ${existingAttendance.absent_count} | 
                                    Percentage: ${existingAttendance.percentage}%
                                </small>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-warning" onclick="loadExistingAttendance(${existingAttendance.id})">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Add students list
        html += `
            <div class="mb-3 text-end">
                <button type="button" class="btn btn-success btn-sm me-2" onclick="markAllPresent()">
                    <i class="fas fa-check-double me-1"></i> Mark All Present
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="markAllAbsent()">
                    <i class="fas fa-times me-1"></i> Mark All Absent
                </button>
            </div>
        `;
        
        result.students.forEach(student => {
            let isChecked = true; // Default to present
            let badgeClass = 'bg-success';
            let badgeText = 'Present';
            
            if (existingAttendance && existingAttendance.attendance_data) {
                const status = existingAttendance.attendance_data[student.student_id];
                isChecked = status === 'present';
                badgeClass = isChecked ? 'bg-success' : 'bg-danger';
                badgeText = isChecked ? 'Present' : 'Absent';
            }
            
            html += `
                <div class="form-check mb-3 p-3 border rounded" style="background: ${isChecked ? '#e8f5e9' : '#ffebee'};">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center flex-grow-1">
                            <input class="form-check-input attendance-checkbox" 
                                   type="checkbox" 
                                   data-student-id="${student.student_id}"
                                   data-student-name="${student.name}"
                                   id="attendance_${student.student_id}" 
                                   ${isChecked ? 'checked' : ''}>
                            <label class="form-check-label ms-3 flex-grow-1" for="attendance_${student.student_id}">
                                <div>
                                    <strong class="d-block">${student.name || 'Unknown'}</strong>
                                    <small class="text-muted">
                                        UID: ${student.student_id} | 
                                        Course: ${student.course || 'N/A'}
                                    </small>
                                </div>
                            </label>
                        </div>
                        <span class="badge ${badgeClass} ms-3 attendance-badge" style="min-width: 80px;">
                            ${badgeText}
                        </span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add change event listeners
        document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const parent = this.closest('.form-check');
                const badge = parent.querySelector('.attendance-badge');
                
                if (this.checked) {
                    badge.textContent = 'Present';
                    badge.className = 'badge bg-success ms-3 attendance-badge';
                    parent.style.background = '#e8f5e9';
                } else {
                    badge.textContent = 'Absent';
                    badge.className = 'badge bg-danger ms-3 attendance-badge';
                    parent.style.background = '#ffebee';
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading students:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load students: ${error.message}
            </div>
        `;
    }
}

// Mark all present
function markAllPresent() {
    document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    });
}

// Mark all absent
function markAllAbsent() {
    document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
    });
}

// Load existing attendance for editing
async function loadExistingAttendance(attendanceId) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/attendance/${attendanceId}`);
        const result = await response.json();
        
        if (result.success) {
            const attendance = result.attendance;
            const form = document.getElementById('attendanceForm');
            
            // Set form values
            form.querySelector('select[name="class"]').value = attendance.class;
            form.querySelector('input[name="date"]').value = attendance.date;
            
            // Store attendance ID for update
            form.setAttribute('data-attendance-id', attendanceId);
            
            // Load students with existing data
            await loadClassStudents(attendance.class);
            
            showSuccess('Loaded existing attendance for editing');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Failed to load attendance: ' + error.message);
    }
}

// Save attendance - FIXED VERSION (Works without update endpoint)
async function saveAttendance() {
    const form = document.getElementById('attendanceForm');
    if (!form) {
        showError('Attendance form not found');
        return;
    }
    
    const formData = new FormData(form);
    const className = formData.get('class');
    const date = formData.get('date');
    const attendanceId = form.getAttribute('data-attendance-id');
    
    if (!className || !date) {
        showError('Please select class and date');
        return;
    }
    
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    if (checkboxes.length === 0) {
        showError('No students found. Please select a class first.');
        return;
    }
    
    // Collect attendance data
    const attendanceStatus = {};
    checkboxes.forEach(checkbox => {
        attendanceStatus[checkbox.dataset.studentId] = checkbox.checked ? 'present' : 'absent';
    });
    
    try {
        const button = document.querySelector('#attendanceModal .btn-primary');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Saving...';
        button.disabled = true;
        
        // STRATEGY: Delete old record and create new one (works without update endpoint)
        if (attendanceId) {
            // First delete the old record
            const deleteResponse = await fetch(
                `https://aacem-backend.onrender.com/api/delete-attendance/${attendanceId}`,
                { method: 'DELETE' }
            );
            
            const deleteResult = await deleteResponse.json();
            
            if (!deleteResult.success) {
                throw new Error('Failed to delete old attendance record');
            }
        }
        
        // Create new attendance record (or create if not editing)
        const response = await fetch('https://aacem-backend.onrender.com/api/mark-attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class: className,
                date: date,
                attendance: attendanceStatus
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadDashboardData();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            if (modal) modal.hide();
            
            form.reset();
            form.removeAttribute('data-attendance-id');
            
            showSuccess(attendanceId ? 'Attendance updated successfully!' : 'Attendance marked successfully!');
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        
        // Restore button state
        const button = document.querySelector('#attendanceModal .btn-primary');
        if (button) {
            button.innerHTML = '<i class="fas fa-save me-1"></i> Save Attendance';
            button.disabled = false;
        }
        
        showError('Failed to save attendance: ' + error.message);
    }
}

// View class attendance history
async function viewClassAttendance(className) {
    try {
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/attendance/class/${encodeURIComponent(className)}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                showInfo(`No attendance records found for ${className}`);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.attendance || result.attendance.length === 0) {
            showInfo(`No attendance records found for ${className}`);
            return;
        }
        
        // Sort by date (newest first)
        const records = result.attendance.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Calculate statistics
        const totalRecords = records.length;
        const avgPercentage = records.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalRecords;
        const highestAttendance = Math.max(...records.map(r => r.percentage || 0));
        const lowestAttendance = Math.min(...records.map(r => r.percentage || 0));
        
        const modalHtml = `
            <div class="modal fade" id="classAttendanceModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-calendar-check me-2"></i>
                                Attendance History - ${className}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Statistics Cards -->
                            <div class="row mb-4">
                                <div class="col-md-3">
                                    <div class="card text-center border-primary">
                                        <div class="card-body">
                                            <h3 class="text-primary mb-0">${totalRecords}</h3>
                                            <small class="text-muted">Total Records</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card text-center border-info">
                                        <div class="card-body">
                                            <h3 class="text-info mb-0">${avgPercentage.toFixed(1)}%</h3>
                                            <small class="text-muted">Average Attendance</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card text-center border-success">
                                        <div class="card-body">
                                            <h3 class="text-success mb-0">${highestAttendance}%</h3>
                                            <small class="text-muted">Highest</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card text-center border-danger">
                                        <div class="card-body">
                                            <h3 class="text-danger mb-0">${lowestAttendance}%</h3>
                                            <small class="text-muted">Lowest</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Records Table -->
                            <div class="table-responsive">
                                <table class="table table-hover table-bordered">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Date</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Total</th>
                                            <th>Percentage</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${records.map(record => {
                                            const total = (record.present_count || 0) + (record.absent_count || 0);
                                            const percentageClass = record.percentage >= 80 ? 'success' : 
                                                                  record.percentage >= 60 ? 'warning' : 'danger';
                                            
                                            return `
                                                <tr>
                                                    <td>
                                                        <i class="fas fa-calendar text-muted me-2"></i>
                                                        ${formatDate(record.date)}
                                                    </td>
                                                    <td>
                                                        <span class="badge bg-success">${record.present_count || 0}</span>
                                                    </td>
                                                    <td>
                                                        <span class="badge bg-danger">${record.absent_count || 0}</span>
                                                    </td>
                                                    <td>
                                                        <strong>${total}</strong>
                                                    </td>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="progress flex-grow-1 me-2" style="height: 8px; min-width: 100px;">
                                                                <div class="progress-bar bg-${percentageClass}" 
                                                                     style="width: ${record.percentage}%"></div>
                                                            </div>
                                                            <strong class="text-${percentageClass}">${record.percentage}%</strong>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div class="btn-group btn-group-sm">
                                                            <button class="btn btn-info" onclick="viewAttendanceDetails(${record.id})" title="View Details">
                                                                <i class="fas fa-eye"></i>
                                                            </button>
                                                            <button class="btn btn-warning" onclick="editAttendance(${record.id})" title="Edit">
                                                                <i class="fas fa-edit"></i>
                                                            </button>
                                                            <button class="btn btn-danger" onclick="deleteAttendance(${record.id})" title="Delete">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-success" onclick="exportClassAttendance('${className}')">
                                <i class="fas fa-download me-1"></i> Export to Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('classAttendanceModal');
        if (existingModal) existingModal.remove();
        
        // Add and show modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('classAttendanceModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing class attendance:', error);
        showError('Failed to load class attendance: ' + error.message);
    }
}

// View detailed attendance for a specific date
async function viewAttendanceDetails(attendanceId) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/attendance/${attendanceId}`);
        const result = await response.json();
        
        if (!result.success) {
            showError('Failed to load attendance details');
            return;
        }
        
        const attendance = result.attendance;
        
        // Prepare students list
        let studentsHtml = '';
        if (attendance.attendance_data) {
            Object.entries(attendance.attendance_data).forEach(([studentId, status]) => {
                const student = studentsData.find(s => s.student_id === studentId);
                const statusClass = status === 'present' ? 'success' : 'danger';
                const statusIcon = status === 'present' ? 'check-circle' : 'times-circle';
                
                studentsHtml += `
                    <tr>
                        <td>${student ? student.name : studentId}</td>
                        <td>${studentId}</td>
                        <td>
                            <span class="badge bg-${statusClass}">
                                <i class="fas fa-${statusIcon} me-1"></i>
                                ${status.toUpperCase()}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }
        
        const modalHtml = `
            <div class="modal fade" id="attendanceDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-clipboard-list me-2"></i>
                                Attendance Details
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Summary -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card border-primary">
                                        <div class="card-body">
                                            <h6 class="text-primary">
                                                <i class="fas fa-info-circle me-2"></i>
                                                Attendance Information
                                            </h6>
                                            <hr>
                                            <p class="mb-2">
                                                <strong>Class:</strong> ${attendance.class}
                                            </p>
                                            <p class="mb-2">
                                                <strong>Date:</strong> ${formatDate(attendance.date)}
                                            </p>
                                            <p class="mb-0">
                                                <strong>Total Students:</strong> 
                                                ${(attendance.present_count || 0) + (attendance.absent_count || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card border-success">
                                        <div class="card-body">
                                            <h6 class="text-success">
                                                <i class="fas fa-chart-pie me-2"></i>
                                                Statistics
                                            </h6>
                                            <hr>
                                            <p class="mb-2">
                                                <span class="badge bg-success me-2">${attendance.present_count || 0}</span>
                                                Present
                                            </p>
                                            <p class="mb-2">
                                                <span class="badge bg-danger me-2">${attendance.absent_count || 0}</span>
                                                Absent
                                            </p>
                                            <p class="mb-0">
                                                <strong>Percentage:</strong> 
                                                <span class="text-${attendance.percentage >= 80 ? 'success' : attendance.percentage >= 60 ? 'warning' : 'danger'}">
                                                    ${attendance.percentage}%
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Students List -->
                            <h6 class="mb-3">
                                <i class="fas fa-users me-2"></i>
                                Student-wise Attendance
                            </h6>
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Student Name</th>
                                            <th>Student ID</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${studentsHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-warning" onclick="editAttendance(${attendanceId})">
                                <i class="fas fa-edit me-1"></i> Edit
                            </button>
                            <button type="button" class="btn btn-success" onclick="exportAttendanceRecord(${attendanceId})">
                                <i class="fas fa-download me-1"></i> Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('attendanceDetailsModal');
        if (existingModal) existingModal.remove();
        
        // Add and show modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('attendanceDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing attendance details:', error);
        showError('Failed to load attendance details: ' + error.message);
    }
}

// Edit attendance
function editAttendance(attendanceId) {
    // Close any open modals
    document.querySelectorAll('.modal.show').forEach(modal => {
        const instance = bootstrap.Modal.getInstance(modal);
        if (instance) instance.hide();
    });
    
    // Load attendance for editing
    setTimeout(() => {
        loadExistingAttendance(attendanceId);
        const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        modal.show();
    }, 300);
}

// Delete attendance
async function deleteAttendance(attendanceId) {
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/delete-attendance/${attendanceId}`,
            { method: 'DELETE' }
        );
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            
            // Close any open detail modals
            ['classAttendanceModal', 'attendanceDetailsModal'].forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    const instance = bootstrap.Modal.getInstance(modal);
                    if (instance) instance.hide();
                }
            });
            
            showSuccess('Attendance record deleted successfully!');
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showError('Failed to delete attendance: ' + error.message);
    }
}

// Export class attendance to Excel
function exportClassAttendance(className) {
    const records = attendanceData.filter(r => r.class === className);
    
    if (records.length === 0) {
        showError('No records to export');
        return;
    }
    
    let csvContent = `Attendance Report - ${className}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Date,Present,Absent,Total,Percentage\n`;
    
    records.forEach(record => {
        const total = (record.present_count || 0) + (record.absent_count || 0);
        csvContent += `${formatDate(record.date)},${record.present_count || 0},${record.absent_count || 0},${total},${record.percentage}%\n`;
    });
    
    // Calculate summary
    const avgPercentage = records.reduce((sum, r) => sum + (r.percentage || 0), 0) / records.length;
    csvContent += `\nSummary\n`;
    csvContent += `Total Records,${records.length}\n`;
    csvContent += `Average Attendance,${avgPercentage.toFixed(2)}%\n`;
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${className}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Attendance exported successfully!');
}

// Export single attendance record
function exportAttendanceRecord(attendanceId) {
    const record = attendanceData.find(r => r.id === attendanceId);
    
    if (!record) {
        showError('Record not found');
        return;
    }
    
    let csvContent = `Attendance Record\n`;
    csvContent += `Class: ${record.class}\n`;
    csvContent += `Date: ${formatDate(record.date)}\n`;
    csvContent += `Present: ${record.present_count}\n`;
    csvContent += `Absent: ${record.absent_count}\n`;
    csvContent += `Percentage: ${record.percentage}%\n\n`;
    csvContent += `Student Name,Student ID,Status\n`;
    
    if (record.attendance_data) {
        Object.entries(record.attendance_data).forEach(([studentId, status]) => {
            const student = studentsData.find(s => s.student_id === studentId);
            csvContent += `${student ? student.name : studentId},${studentId},${status}\n`;
        });
    }
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${record.class}_${record.date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Record exported successfully!');
}

// Initialize attendance when modal opens
document.addEventListener('DOMContentLoaded', function() {
    const attendanceModal = document.getElementById('attendanceModal');
    if (attendanceModal) {
        attendanceModal.addEventListener('show.bs.modal', function() {
            // Reset form
            const form = document.getElementById('attendanceForm');
            form.reset();
            form.removeAttribute('data-attendance-id');
            
            // Set today's date
            const dateInput = form.querySelector('input[name="date"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Clear students list
            const container = document.getElementById('attendanceStudentsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-muted p-3">
                        <i class="fas fa-arrow-up me-2"></i>
                        Select a class and date to load students
                    </div>
                `;
            }
            
            // Populate course dropdown
            populateCourseDropdown('attendanceForm', 'class');
        });
        
        // Handle modal hide
        attendanceModal.addEventListener('hidden.bs.modal', function() {
            const form = document.getElementById('attendanceForm');
            form.reset();
            form.removeAttribute('data-attendance-id');
        });
    }
});

console.log('Attendance functions loaded successfully!');


// =====================================================
// EXAM RESULTS / MARKS MANAGEMENT - COMPLETE & FIXED
// =====================================================

// Update marks table - Course-wise display with proper grouping
function updateMarksTable() {
    const tbody = document.getElementById('marksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (marksData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                        <p>No exam results found</p>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#marksModal">
                            <i class="fas fa-plus me-1"></i> Add First Result
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group by course
    const marksByCourse = {};
    marksData.forEach(mark => {
        const course = mark.course || 'No Course';
        if (!marksByCourse[course]) {
            marksByCourse[course] = [];
        }
        marksByCourse[course].push(mark);
    });
    
    // Display course-wise
    Object.entries(marksByCourse).forEach(([courseName, courseMarks]) => {
        // Sort by date (newest first)
        courseMarks.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
        
        // Calculate course statistics
        const avgPercentage = courseMarks.reduce((sum, m) => {
            const percentage = ((m.marks_obtained || 0) / (m.total_marks || 100)) * 100;
            return sum + percentage;
        }, 0) / courseMarks.length;
        
        const totalRecords = courseMarks.length;
        
        // Course header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'course-header-row bg-light';
        headerRow.style.cursor = 'pointer';
        headerRow.innerHTML = `
            <td colspan="8" class="py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-book me-2 text-info"></i>
                            <strong>${courseName}</strong>
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-clipboard-list me-1"></i> ${totalRecords} Results
                            <span class="mx-2">|</span>
                            <i class="fas fa-chart-bar me-1"></i> Avg Score: ${avgPercentage.toFixed(1)}%
                        </small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info" onclick="viewCourseResults('${courseName}')" title="View All Results">
                            <i class="fas fa-list me-1"></i> View All (${totalRecords})
                        </button>
                        <button class="btn btn-outline-success" onclick="addNewResult('${courseName}')" title="Add New Result">
                            <i class="fas fa-plus me-1"></i> Add New
                        </button>
                        <button class="btn btn-outline-primary" onclick="toggleCourseResults('${courseName.replace(/\s+/g, '-')}')" title="Toggle Results">
                            <i class="fas fa-chevron-down" id="toggle-marks-${courseName.replace(/\s+/g, '-')}"></i>
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(headerRow);
        
        // Show latest 5 results for each course
        courseMarks.slice(0, 5).forEach(mark => {
            const row = document.createElement('tr');
            row.className = `marks-record-row course-marks-${courseName.replace(/\s+/g, '-')}`;
            row.style.display = 'none'; // Hidden by default
            
            const percentage = ((mark.marks_obtained || 0) / (mark.total_marks || 100)) * 100;
            const grade = getGrade(percentage);
            const gradeClass = getGradeClass(grade);
            
            row.innerHTML = `
                <td style="padding-left: 40px;">
                    <span class="badge bg-secondary">${mark.exam_type || 'Unknown'}</span>
                </td>
                <td>
                    <div>
                        <strong>${mark.student_name || 'Unknown'}</strong>
                        <br>
                        <small class="text-muted">ID: ${mark.student_id || 'N/A'}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${mark.course || 'N/A'}</span>
                </td>
                <td>${mark.subject || 'N/A'}</td>
                <td>
                    <strong>${mark.marks_obtained || 0}</strong>
                    <span class="text-muted">/ ${mark.total_marks || 100}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px; min-width: 60px;">
                            <div class="progress-bar ${getPercentageClass(percentage)}" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <strong>${percentage.toFixed(1)}%</strong>
                    </div>
                </td>
                <td>
                    <span class="badge ${gradeClass} px-3">${grade}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewMarkDetails(${mark.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="editMarks(${mark.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteMarks(${mark.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Show "view more" if more than 5 results
        if (courseMarks.length > 5) {
            const moreRow = document.createElement('tr');
            moreRow.className = `marks-record-row course-marks-${courseName.replace(/\s+/g, '-')}`;
            moreRow.style.display = 'none';
            moreRow.innerHTML = `
                <td colspan="8" class="text-center py-2" style="background: #f8f9fa;">
                    <button class="btn btn-sm btn-link" onclick="viewCourseResults('${courseName}')">
                        <i class="fas fa-plus-circle me-1"></i> View ${courseMarks.length - 5} more results
                    </button>
                </td>
            `;
            tbody.appendChild(moreRow);
        }
    });
}

// Toggle course results visibility
function toggleCourseResults(courseName) {
    const records = document.querySelectorAll(`.course-marks-${courseName}`);
    const icon = document.getElementById(`toggle-marks-${courseName}`);
    const isVisible = records[0] && records[0].style.display !== 'none';
    
    records.forEach(row => {
        row.style.display = isVisible ? 'none' : '';
    });
    
    if (icon) {
        icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}

// Get grade based on percentage
function getGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

// Get grade class for badge
function getGradeClass(grade) {
    switch (grade) {
        case 'A+': case 'A': return 'bg-success';
        case 'B': case 'C': return 'bg-info';
        case 'D': case 'E': return 'bg-warning';
        case 'F': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Get percentage class for progress bar
function getPercentageClass(percentage) {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-info';
    if (percentage >= 40) return 'bg-warning';
    return 'bg-danger';
}

// Add new result for specific course
function addNewResult(courseName) {
    const modal = new bootstrap.Modal(document.getElementById('marksModal'));
    const form = document.getElementById('marksForm');
    
    // Reset form
    form.reset();
    form.removeAttribute('data-marks-id');
    
    // Set course
    const courseSelect = form.querySelector('select[name="course"]');
    if (courseSelect) {
        courseSelect.value = courseName;
        courseSelect.dispatchEvent(new Event('change'));
    }
    
    // Set today's date
    const dateInput = form.querySelector('input[name="examDate"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Update modal title
    const modalTitle = document.querySelector('#marksModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-chart-line me-2"></i>Enter Marks - ${courseName}`;
    }
    
    modal.show();
}

// Load students for marks based on course selection
async function loadStudentsForMarks(courseCode) {
    const studentSelect = document.getElementById('marksStudentSelect');
    const searchInput = document.getElementById('studentSearchMarks');
    
    if (!studentSelect) {
        console.error('Marks student select not found');
        return;
    }
    
    if (!courseCode) {
        studentSelect.innerHTML = '<option value="">Select Course First</option>';
        return;
    }
    
    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    
    try {
        // Use API endpoint
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/students/course/${encodeURIComponent(courseCode)}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (result.success && result.students && result.students.length > 0) {
            result.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.student_id;
                option.textContent = `${student.name} (${student.student_id})`;
                option.setAttribute('data-student-name', student.name);
                studentSelect.appendChild(option);
            });
            
            // Clear search
            if (searchInput) {
                searchInput.value = '';
            }
        } else {
            studentSelect.innerHTML = '<option value="">No students found for this course</option>';
        }
        
    } catch (error) {
        console.error('Error loading students:', error);
        
        // Fallback to local data
        const courseStudents = studentsData.filter(s => s.course === courseCode);
        
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (courseStudents.length > 0) {
            courseStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.student_id;
                option.textContent = `${student.name} (${student.student_id})`;
                option.setAttribute('data-student-name', student.name);
                studentSelect.appendChild(option);
            });
        } else {
            studentSelect.innerHTML = '<option value="">No students found</option>';
        }
    }
}

// Search student by UID for marks
function searchStudentForMarks(searchTerm) {
    const studentSelect = document.getElementById('marksStudentSelect');
    const courseSelect = document.querySelector('#marksForm select[name="course"]');
    
    if (!studentSelect || !courseSelect) return;
    
    const currentCourse = courseSelect.value;
    
    if (!searchTerm.trim()) {
        // Reload students for current course
        if (currentCourse) {
            loadStudentsForMarks(currentCourse);
        } else {
            studentSelect.innerHTML = '<option value="">Select Course First</option>';
        }
        return;
    }
    
    // Filter students
    let filteredStudents = studentsData.filter(student => {
        const matchesSearch = student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (currentCourse) {
            return matchesSearch && student.course === currentCourse;
        }
        return matchesSearch;
    });
    
    // Update dropdown
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    
    if (filteredStudents.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No students found';
        option.disabled = true;
        studentSelect.appendChild(option);
        return;
    }
    
    filteredStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.name} (${student.student_id}) - ${student.course}`;
        option.setAttribute('data-student-name', student.name);
        studentSelect.appendChild(option);
    });
}

// Clear student search
function clearStudentSearch() {
    const searchInput = document.getElementById('studentSearchMarks');
    const courseSelect = document.querySelector('#marksForm select[name="course"]');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (courseSelect && courseSelect.value) {
        loadStudentsForMarks(courseSelect.value);
    } else {
        const studentSelect = document.getElementById('marksStudentSelect');
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="">Select Course First</option>';
        }
    }
}

// Save marks - FIXED VERSION (No update endpoint needed)
async function saveMarks() {
    const form = document.getElementById('marksForm');
    if (!form) {
        showError('Marks form not found');
        return;
    }
    
    const formData = new FormData(form);
    const marksId = form.getAttribute('data-marks-id');
    
    // Validation
    const requiredFields = {
        exam: 'Exam Type',
        course: 'Course',
        studentId: 'Student',
        subject: 'Subject',
        marks: 'Marks',
        examDate: 'Exam Date'
    };
    
    for (const [field, label] of Object.entries(requiredFields)) {
        if (!formData.get(field)) {
            showError(`Please select/enter ${label}`);
            return;
        }
    }
    
    const marks = parseFloat(formData.get('marks'));
    const totalMarks = parseFloat(formData.get('totalMarks')) || 100;
    
    if (marks < 0 || marks > totalMarks) {
        showError(`Marks must be between 0 and ${totalMarks}`);
        return;
    }
    
    try {
        const button = document.getElementById('marksSaveBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Saving...';
        button.disabled = true;
        
        // If editing, delete old record first
        if (marksId) {
            const deleteResponse = await fetch(
                `https://aacem-backend.onrender.com/api/delete-marks/${marksId}`,
                { method: 'DELETE' }
            );
            
            const deleteResult = await deleteResponse.json();
            if (!deleteResult.success) {
                throw new Error('Failed to delete old marks record');
            }
        }
        
        // Create new marks record
        const response = await fetch('https://aacem-backend.onrender.com/api/add-marks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam: formData.get('exam'),
                studentId: formData.get('studentId'),
                subject: formData.get('subject'),
                marks: marks,
                totalMarks: totalMarks,
                examDate: formData.get('examDate')
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadDashboardData();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('marksModal'));
            if (modal) modal.hide();
            
            form.reset();
            form.removeAttribute('data-marks-id');
            
            showSuccess(marksId ? 'Marks updated successfully!' : 'Marks saved successfully!');
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving marks:', error);
        
        const button = document.getElementById('marksSaveBtn');
        if (button) {
            button.innerHTML = '<i class="fas fa-save me-1"></i> Save Marks';
            button.disabled = false;
        }
        
        showError('Failed to save marks: ' + error.message);
    }
}

// Edit marks
async function editMarks(marksId) {
    const mark = marksData.find(m => m.id == marksId);
    if (!mark) {
        showError('Marks record not found!');
        return;
    }
    
    const form = document.getElementById('marksForm');
    if (!form) {
        showError('Marks form not found');
        return;
    }
    
    // Populate form
    form.querySelector('select[name="exam"]').value = mark.exam_type || '';
    form.querySelector('select[name="course"]').value = mark.course || '';
    
    // Load students for course
    if (mark.course) {
        await loadStudentsForMarks(mark.course);
        
        // Wait a bit for students to load
        setTimeout(() => {
            form.querySelector('select[name="studentId"]').value = mark.student_id || '';
        }, 300);
    }
    
    form.querySelector('input[name="subject"]').value = mark.subject || '';
    form.querySelector('input[name="marks"]').value = mark.marks_obtained || '';
    form.querySelector('input[name="totalMarks"]').value = mark.total_marks || 100;
    form.querySelector('input[name="examDate"]').value = mark.exam_date || '';
    
    // Update modal
    const modalTitle = document.querySelector('#marksModal .modal-title');
    const saveBtn = document.getElementById('marksSaveBtn');
    
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Marks';
    }
    
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Marks';
    }
    
    form.setAttribute('data-marks-id', marksId);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('marksModal'));
    modal.show();
}

// View mark details
function viewMarkDetails(marksId) {
    const mark = marksData.find(m => m.id == marksId);
    if (!mark) {
        showError('Marks record not found!');
        return;
    }
    
    const percentage = ((mark.marks_obtained || 0) / (mark.total_marks || 100)) * 100;
    const grade = getGrade(percentage);
    const gradeClass = getGradeClass(grade);
    
    const modalHtml = `
        <div class="modal fade" id="markDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-purple text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-line me-2"></i>
                            Exam Result Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <!-- Left Column -->
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-purple border-bottom pb-2">
                                            <i class="fas fa-user-graduate me-2"></i>Student Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Student Name:</div>
                                            <div class="col-7 fw-bold">${mark.student_name || 'Unknown'}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Student ID:</div>
                                            <div class="col-7">${mark.student_id || 'N/A'}</div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Course:</div>
                                            <div class="col-7">
                                                <span class="badge bg-primary">${mark.course || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-purple border-bottom pb-2">
                                            <i class="fas fa-book me-2"></i>Exam Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Exam Type:</div>
                                            <div class="col-7">
                                                <span class="badge bg-secondary">${mark.exam_type || 'Unknown'}</span>
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Subject:</div>
                                            <div class="col-7 fw-bold">${mark.subject || 'N/A'}</div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Exam Date:</div>
                                            <div class="col-7">${formatDate(mark.exam_date)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right Column -->
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body text-center" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef);">
                                        <h6 class="text-purple mb-3">Performance Summary</h6>
                                        
                                        <div class="mb-4">
                                            <div class="display-1 fw-bold text-purple mb-2">
                                                ${mark.marks_obtained || 0}
                                                <small class="fs-3 text-muted">/ ${mark.total_marks || 100}</small>
                                            </div>
                                            <p class="text-muted mb-0">Marks Obtained</p>
                                        </div>
                                        
                                        <div class="row text-center mb-3">
                                            <div class="col-6">
                                                <div class="p-3 rounded" style="background: white;">
                                                    <h3 class="mb-0 ${percentage >= 40 ? 'text-success' : 'text-danger'}">
                                                        ${percentage.toFixed(1)}%
                                                    </h3>
                                                    <small class="text-muted">Percentage</small>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="p-3 rounded" style="background: white;">
                                                    <h3 class="mb-0">
                                                        <span class="badge ${gradeClass} fs-4">${grade}</span>
                                                    </h3>
                                                    <small class="text-muted">Grade</small>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="progress" style="height: 20px;">
                                            <div class="progress-bar ${getPercentageClass(percentage)}" 
                                                 style="width: ${percentage}%">
                                                ${percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-purple border-bottom pb-2">
                                            <i class="fas fa-trophy me-2"></i>Result Status
                                        </h6>
                                        <div class="text-center py-3">
                                            ${percentage >= 40 ? `
                                                <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                                                <h5 class="text-success">PASSED</h5>
                                                <p class="text-muted mb-0">Congratulations!</p>
                                            ` : `
                                                <i class="fas fa-times-circle fa-3x text-danger mb-3"></i>
                                                <h5 class="text-danger">FAILED</h5>
                                                <p class="text-muted mb-0">Better luck next time</p>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-purple" onclick="editMarks(${marksId})">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                        <button type="button" class="btn btn-success" onclick="printMarkSheet(${marksId})">
                            <i class="fas fa-print me-1"></i> Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('markDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('markDetailsModal'));
    modal.show();
}

// View all results for a course
function viewCourseResults(courseName) {
    const courseResults = marksData.filter(m => m.course === courseName);
    
    if (courseResults.length === 0) {
        showInfo(`No results found for ${courseName}`);
        return;
    }
    
    // Sort by date (newest first)
    courseResults.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    
    // Calculate statistics
    const totalResults = courseResults.length;
    const avgPercentage = courseResults.reduce((sum, m) => {
        return sum + ((m.marks_obtained || 0) / (m.total_marks || 100)) * 100;
    }, 0) / totalResults;
    
    const passCount = courseResults.filter(m => {
        const percentage = ((m.marks_obtained || 0) / (m.total_marks || 100)) * 100;
        return percentage >= 40;
    }).length;
    
    const passPercentage = (passCount / totalResults) * 100;
    
    const modalHtml = `
        <div class="modal fade" id="courseResultsModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-bar me-2"></i>
                            Exam Results - ${courseName}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Statistics -->
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card text-center border-primary">
                                    <div class="card-body">
                                        <h3 class="text-primary mb-0">${totalResults}</h3>
                                        <small class="text-muted">Total Results</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-info">
                                    <div class="card-body">
                                        <h3 class="text-info mb-0">${avgPercentage.toFixed(1)}%</h3>
                                        <small class="text-muted">Average Score</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-success">
                                    <div class="card-body">
                                        <h3 class="text-success mb-0">${passCount}</h3>
                                        <small class="text-muted">Passed</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-warning">
                                    <div class="card-body">
                                        <h3 class="text-warning mb-0">${passPercentage.toFixed(1)}%</h3>
                                        <small class="text-muted">Pass Rate</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Results Table -->
                        <div class="table-responsive">
                            <table class="table table-hover table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Exam</th>
                                        <th>Student</th>
                                        <th>Subject</th>
                                        <th>Marks</th>
                                        <th>Percentage</th>
                                        <th>Grade</th>
                                        <th>Result</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${courseResults.map(mark => {
                                        const percentage = ((mark.marks_obtained || 0) / (mark.total_marks || 100)) * 100;
                                        const grade = getGrade(percentage);
                                        const gradeClass = getGradeClass(grade);
                                        const passed = percentage >= 40;
                                        
                                        return `
                                            <tr>
                                                <td>
                                                    <span class="badge bg-secondary">${mark.exam_type}</span>
                                                    <br>
                                                    <small class="text-muted">${formatDate(mark.exam_date)}</small>
                                                </td>
                                                <td>
                                                    <strong>${mark.student_name}</strong>
                                                    <br>
                                                    <small class="text-muted">${mark.student_id}</small>
                                                </td>
                                                <td>${mark.subject}</td>
                                                <td>
                                                    <strong>${mark.marks_obtained}</strong> / ${mark.total_marks}
                                                </td>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="progress flex-grow-1 me-2" style="height: 8px; min-width: 60px;">
                                                            <div class="progress-bar ${getPercentageClass(percentage)}" 
                                                                 style="width: ${percentage}%"></div>
                                                        </div>
                                                        <strong>${percentage.toFixed(1)}%</strong>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge ${gradeClass}">${grade}</span>
                                                </td>
                                                <td>
                                                    ${passed ? 
                                                        '<span class="badge bg-success">PASS</span>' : 
                                                        '<span class="badge bg-danger">FAIL</span>'
                                                    }
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-info" onclick="viewMarkDetails(${mark.id})">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-warning" onclick="editMarks(${mark.id})">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button class="btn btn-danger" onclick="deleteMarks(${mark.id})">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" onclick="exportCourseResults('${courseName}')">
                            <i class="fas fa-download me-1"></i> Export to Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('courseResultsModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('courseResultsModal'));
    modal.show();
}

// Delete marks
async function deleteMarks(marksId) {
    if (!confirm('Are you sure you want to delete this marks record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/delete-marks/${marksId}`,
            { method: 'DELETE' }
        );
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            
            // Close any open modals
            ['markDetailsModal', 'courseResultsModal'].forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    const instance = bootstrap.Modal.getInstance(modal);
                    if (instance) instance.hide();
                }
            });
            
            showSuccess('Marks record deleted successfully!');
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting marks:', error);
        showError('Failed to delete marks: ' + error.message);
    }
}

// Export course results to CSV
function exportCourseResults(courseName) {
    const results = marksData.filter(m => m.course === courseName);
    
    if (results.length === 0) {
        showError('No results to export');
        return;
    }
    
    let csvContent = `Exam Results Report - ${courseName}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Exam Type,Student Name,Student ID,Subject,Marks Obtained,Total Marks,Percentage,Grade,Result,Exam Date\n`;
    
    results.forEach(mark => {
        const percentage = ((mark.marks_obtained || 0) / (mark.total_marks || 100)) * 100;
        const grade = getGrade(percentage);
        const result = percentage >= 40 ? 'PASS' : 'FAIL';
        
        csvContent += `${mark.exam_type},${mark.student_name},${mark.student_id},${mark.subject},${mark.marks_obtained},${mark.total_marks},${percentage.toFixed(2)}%,${grade},${result},${formatDate(mark.exam_date)}\n`;
    });
    
    // Summary
    const avgPercentage = results.reduce((sum, m) => {
        return sum + ((m.marks_obtained || 0) / (m.total_marks || 100)) * 100;
    }, 0) / results.length;
    
    const passCount = results.filter(m => {
        const percentage = ((m.marks_obtained || 0) / (m.total_marks || 100)) * 100;
        return percentage >= 40;
    }).length;
    
    csvContent += `\nSummary\n`;
    csvContent += `Total Results,${results.length}\n`;
    csvContent += `Average Score,${avgPercentage.toFixed(2)}%\n`;
    csvContent += `Pass Count,${passCount}\n`;
    csvContent += `Pass Rate,${((passCount / results.length) * 100).toFixed(2)}%\n`;
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${courseName}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Results exported successfully!');
}

// Print mark sheet
function printMarkSheet(marksId) {
    const mark = marksData.find(m => m.id == marksId);
    if (!mark) {
        showError('Mark record not found');
        return;
    }
    
    const percentage = ((mark.marks_obtained || 0) / (mark.total_marks || 100)) * 100;
    const grade = getGrade(percentage);
    const passed = percentage >= 40;
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mark Sheet - ${mark.student_name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .info-table td { padding: 10px; border: 1px solid #ddd; }
                .info-table td:first-child { font-weight: bold; width: 30%; background: #f5f5f5; }
                .result { text-align: center; margin: 20px 0; padding: 20px; border: 2px solid ${passed ? '#28a745' : '#dc3545'}; }
                .result h2 { color: ${passed ? '#28a745' : '#dc3545'}; margin: 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>AACEM INSTITUTE</h1>
                <h2>MARK SHEET</h2>
            </div>
            
            <table class="info-table">
                <tr><td>Student Name</td><td>${mark.student_name}</td></tr>
                <tr><td>Student ID</td><td>${mark.student_id}</td></tr>
                <tr><td>Course</td><td>${mark.course}</td></tr>
                <tr><td>Exam Type</td><td>${mark.exam_type}</td></tr>
                <tr><td>Subject</td><td>${mark.subject}</td></tr>
                <tr><td>Exam Date</td><td>${formatDate(mark.exam_date)}</td></tr>
                <tr><td>Marks Obtained</td><td>${mark.marks_obtained} / ${mark.total_marks}</td></tr>
                <tr><td>Percentage</td><td><strong>${percentage.toFixed(2)}%</strong></td></tr>
                <tr><td>Grade</td><td><strong>${grade}</strong></td></tr>
            </table>
            
            <div class="result">
                <h2>${passed ? 'PASSED' : 'FAILED'}</h2>
            </div>
            
            <p style="text-align: center; margin-top: 40px;">
                Generated on: ${new Date().toLocaleString()}
            </p>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Initialize marks modal
document.addEventListener('DOMContentLoaded', function() {
    const marksModal = document.getElementById('marksModal');
    if (marksModal) {
        marksModal.addEventListener('show.bs.modal', function() {
            const form = document.getElementById('marksForm');
            
            // Reset if not editing
            if (!form.getAttribute('data-marks-id')) {
                form.reset();
                
                // Set today's date
                const dateInput = form.querySelector('input[name="examDate"]');
                if (dateInput) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                
                // Reset modal title
                const modalTitle = document.querySelector('#marksModal .modal-title');
                if (modalTitle) {
                    modalTitle.innerHTML = '<i class="fas fa-chart-line me-2"></i>Enter Student Marks';
                }
                
                const saveBtn = document.getElementById('marksSaveBtn');
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save Marks';
                }
            }
            
            // Populate course dropdown
            populateCourseDropdown('marksForm', 'course');
        });
        
        marksModal.addEventListener('hidden.bs.modal', function() {
            const form = document.getElementById('marksForm');
            form.reset();
            form.removeAttribute('data-marks-id');
        });
    }
    
    // Course change listener
    const courseSelect = document.querySelector('#marksForm select[name="course"]');
    if (courseSelect) {
        courseSelect.addEventListener('change', function() {
            loadStudentsForMarks(this.value);
        });
    }
});

console.log('Marks/Exam Results functions loaded successfully!');


// Update students table - MODIFIED VERSION with COLLAPSED groups by default
function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (studentsData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <p>No students found</p>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#studentModal">
                            <i class="fas fa-plus me-1"></i> Add First Student
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group students by class
    const studentsByClass = {};
    studentsData.forEach(student => {
        const className = student.course || 'No Class';
        if (!studentsByClass[className]) {
            studentsByClass[className] = [];
        }
        studentsByClass[className].push(student);
    });
    
    // Display students grouped by class
    Object.entries(studentsByClass).forEach(([className, classStudents]) => {
        // Add class header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'class-header-row bg-light';
        headerRow.innerHTML = `
            <td colspan="8" class="py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong><i class="fas fa-users me-2"></i>${className}</strong>
                        <span class="badge bg-primary ms-2">${classStudents.length} students</span>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="toggleClassStudents('${className}')">
                        <i class="fas fa-chevron-down"></i> Show Students
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(headerRow);
        
        // Add students for this class - HIDDEN BY DEFAULT
        classStudents.forEach(student => {
            const row = document.createElement('tr');
            row.className = `class-student-row class-${className.replace(/\s+/g, '-')}`;
            row.style.display = 'none'; // यह line ADD करें - Students hidden by default
            row.innerHTML = `
                <td>${student.student_id || 'N/A'}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="student-avatar me-2">
                            <i class="fas fa-user-circle text-primary"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${student.name || 'Unknown'}</div>
                            <small class="text-muted">Class: ${student.course || 'No Course'}</small>
                        </div>
                    </div>
                </td>
                <td>${student.course || 'No Course'}</td>
                <td>${formatDate(student.join_date)}</td>
                <td>${student.phone || 'N/A'}</td>
                <td>
                    <span class="status-badge ${getFeeStatusClass(student.fee_status)}">
                        ${student.fee_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-action" onclick="viewStudent('${student.student_id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-action" onclick="editStudent('${student.student_id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-action" onclick="deleteStudent('${student.student_id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

// Toggle class students visibility - MODIFIED VERSION
function toggleClassStudents(className) {
    const rows = document.querySelectorAll(`.class-${className.replace(/\s+/g, '-')}`);
    const button = event.target.closest('button');
    const icon = button.querySelector('i');
    
    // Check if any row is currently visible
    let isVisible = false;
    if (rows.length > 0) {
        isVisible = rows[0].style.display !== 'none';
    }
    
    // Toggle visibility
    rows.forEach(row => {
        row.style.display = isVisible ? 'none' : '';
    });
    
    // Update button text and icon
    if (button) {
        if (isVisible) {
            button.innerHTML = '<i class="fas fa-chevron-down"></i> Show Students';
            button.title = "Show students";
        } else {
            button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Students';
            button.title = "Hide students";
        }
    }
}
// Filter students by class when class is clicked
function filterStudentsByClass(className) {
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        // Set search input value to the class name
        searchInput.value = className;
        
        // Trigger the search
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        searchInput.dispatchEvent(event);
    }
}
// Setup search functionality - UPDATED VERSION
function setupSearchFunctionality() {
    const studentSearch = document.getElementById('studentSearch');
    const teacherSearch = document.getElementById('teacherSearch');
    
    if (studentSearch) {
        studentSearch.addEventListener('input', function(e) {
            filterStudentsTable(e.target.value.toLowerCase());
        });
    }
    
    if (teacherSearch) {
        teacherSearch.addEventListener('input', function(e) {
            filterTable('teachersTableBody', e.target.value.toLowerCase());
        });
    }
}

// Enhanced student table filter with class support
function filterStudentsTable(searchTerm) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');
    let visibleRowCount = 0;
    
    for (let row of rows) {
        // Skip header rows
        if (row.classList.contains('class-header-row')) {
            continue;
        }
        
        const text = row.textContent.toLowerCase();
        const shouldShow = text.includes(searchTerm) || searchTerm === '';
        
        row.style.display = shouldShow ? '' : 'none';
        
        if (shouldShow) {
            visibleRowCount++;
            
            // Highlight search term in student name
            if (searchTerm && row.querySelector('.fw-bold')) {
                const nameElement = row.querySelector('.fw-bold');
                const nameText = nameElement.textContent;
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                nameElement.innerHTML = nameText.replace(regex, '<span class="bg-warning px-1 rounded">$1</span>');
            }
        }
    }
    
    // Show/hide class headers based on visible students
    updateClassHeadersVisibility();
}

// Update class headers based on visible students
function updateClassHeadersVisibility() {
    const classHeaders = document.querySelectorAll('.class-header-row');
    
    classHeaders.forEach(header => {
        const className = header.querySelector('strong').textContent;
        const sanitizedClassName = className.replace(/\s+/g, '-');
        const studentRows = document.querySelectorAll(`.class-${sanitizedClassName}`);
        
        let visibleCount = 0;
        studentRows.forEach(row => {
            if (row.style.display !== 'none') {
                visibleCount++;
            }
        });
        
        // Show/hide header based on visible students
        header.style.display = visibleCount > 0 ? '' : 'none';
        
        // Update student count badge
        const badge = header.querySelector('.badge');
        if (badge) {
            badge.textContent = `${visibleCount} students`;
        }
    });
}
// Get fee status class
function getFeeStatusClass(status) {
    if (!status) return 'bg-secondary';
    
    switch (status.toLowerCase()) {
        case 'paid': return 'bg-success';
        case 'partial': return 'bg-warning';
        case 'pending': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Update teachers table
function updateTeachersTable() {
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (teachersData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <p>No teachers found</p>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#teacherModal">
                            <i class="fas fa-plus me-1"></i> Add First Teacher
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    teachersData.forEach(teacher => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${teacher.teacher_id || 'N/A'}</td>
            <td>${teacher.name || 'Unknown'}</td>
            <td>${teacher.subject || 'No Subject'}</td>
            <td>${formatDate(teacher.joining_date)}</td>
            <td>${teacher.phone || 'N/A'}</td>
            <td>₹${(teacher.salary || 0).toLocaleString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-action" onclick="viewTeacher('${teacher.teacher_id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-action" onclick="editTeacher('${teacher.teacher_id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-action" onclick="deleteTeacher('${teacher.teacher_id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update courses table
function updateCoursesTable() {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (coursesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <p>No courses found</p>
                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#courseModal">
                            <i class="fas fa-plus me-1"></i> Add First Course
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    coursesData.forEach(course => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${course.course_code || 'N/A'}</td>
            <td>${course.course_name || 'Unnamed Course'}</td>
            <td>${course.duration || 0} months</td>
            <td>₹${(course.fee_amount || 0).toLocaleString()}</td>
            <td><span class="badge bg-info">${course.category || 'general'}</span></td>
            <td>${course.student_count || 0}</td>
            <td>
                <span class="status-badge ${course.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${course.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-action" onclick="viewCourse('${course.course_code}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-action" onclick="editCourse('${course.course_code}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-action" onclick="deleteCourse('${course.course_code}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}





// =====================================================
// FEE MANAGEMENT SYSTEM - COMPLETE & FIXED
// =====================================================

// Update fees table - Class-wise display with beautiful UI
function updateFeesTable() {
    const tbody = document.getElementById('feesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (feesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-money-bill-wave fa-3x text-muted mb-3"></i>
                        <p>No fee records found</p>
                        <button class="btn btn-success btn-sm" data-bs-toggle="modal" data-bs-target="#feeModal">
                            <i class="fas fa-plus me-1"></i> Record First Payment
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group by class
    const feesByClass = {};
    let grandTotal = 0;
    
    feesData.forEach(fee => {
        const student = studentsData.find(s => s.student_id === fee.student_id);
        const className = student ? student.course : 'No Class';
        
        if (!feesByClass[className]) {
            feesByClass[className] = {
                fees: [],
                total: 0
            };
        }
        
        feesByClass[className].fees.push(fee);
        feesByClass[className].total += fee.amount || 0;
        grandTotal += fee.amount || 0;
    });
    
    // Display class-wise
    Object.entries(feesByClass).forEach(([className, classData]) => {
        const classFees = classData.fees;
        
        // Sort by date (newest first)
        classFees.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
        
        // Class header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'class-header-row bg-light';
        headerRow.style.cursor = 'pointer';
        headerRow.innerHTML = `
            <td colspan="8" class="py-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-graduation-cap me-2 text-success"></i>
                            <strong>${className}</strong>
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-receipt me-1"></i> ${classFees.length} Payments
                            <span class="mx-2">|</span>
                            <i class="fas fa-rupee-sign me-1"></i> Total: ₹${classData.total.toLocaleString()}
                        </small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success" onclick="viewClassFeeReport('${className}')" title="View Report">
                            <i class="fas fa-chart-pie me-1"></i> Report
                        </button>
                        <button class="btn btn-outline-info" onclick="printClassReceipts('${className}')" title="Print All">
                            <i class="fas fa-print me-1"></i> Print All
                        </button>
                        <button class="btn btn-outline-primary" onclick="toggleClassFees('${className.replace(/\s+/g, '-')}')" title="Toggle">
                            <i class="fas fa-chevron-down" id="toggle-fee-${className.replace(/\s+/g, '-')}"></i>
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(headerRow);
        
        // Show latest 5 payments for each class
        classFees.slice(0, 5).forEach(fee => {
            const student = studentsData.find(s => s.student_id === fee.student_id);
            const row = document.createElement('tr');
            row.className = `fee-record-row class-fee-${className.replace(/\s+/g, '-')}`;
            row.style.display = 'none'; // Hidden by default
            
            row.innerHTML = `
                <td style="padding-left: 40px;">
                    <strong class="text-primary">${fee.receipt_no || 'N/A'}</strong>
                </td>
                <td>
                    <div>
                        <strong>${fee.student_name || 'Unknown'}</strong>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-id-card me-1"></i>UID: ${fee.student_id}
                        </small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-info">${student ? student.course : 'N/A'}</span>
                </td>
                <td>
                    <div class="text-success fw-bold fs-6">₹${(fee.amount || 0).toLocaleString()}</div>
                </td>
                <td>
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>
                        ${formatDate(fee.payment_date)}
                    </small>
                </td>
                <td>
                    <span class="badge ${getPaymentModeBadge(fee.payment_mode)}">
                        <i class="fas ${getPaymentModeIcon(fee.payment_mode)} me-1"></i>
                        ${(fee.payment_mode || 'Unknown').toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="badge ${getFeeStatusBadge(fee.status)}">
                        ${(fee.status || 'Paid').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" onclick="printReceipt('${fee.receipt_no}')" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn btn-info" onclick="viewFeeDetails('${fee.receipt_no}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="viewStudentDetails('${fee.student_id}')" title="Student">
                            <i class="fas fa-user"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteFeeRecord('${fee.receipt_no}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Show "view more" if more than 5 payments
        if (classFees.length > 5) {
            const moreRow = document.createElement('tr');
            moreRow.className = `fee-record-row class-fee-${className.replace(/\s+/g, '-')}`;
            moreRow.style.display = 'none';
            moreRow.innerHTML = `
                <td colspan="8" class="text-center py-2" style="background: #f8f9fa;">
                    <button class="btn btn-sm btn-link" onclick="viewClassFeeReport('${className}')">
                        <i class="fas fa-plus-circle me-1"></i> View ${classFees.length - 5} more payments
                    </button>
                </td>
            `;
            tbody.appendChild(moreRow);
        }
    });
    
    // Grand total row
    const totalRow = document.createElement('tr');
    totalRow.className = 'grand-total-row';
    totalRow.innerHTML = `
        <td colspan="8" class="py-3" style="background: linear-gradient(135deg, #2d6b6b, #3a9d9d); color: white;">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">
                        <i class="fas fa-chart-line me-2"></i>
                        <strong>GRAND TOTAL</strong>
                    </h6>
                </div>
                <div>
                    <span class="badge bg-light text-dark me-3" style="font-size: 1rem;">
                        <i class="fas fa-receipt me-1"></i>
                        ${feesData.length} Payments
                    </span>
                    <span class="fs-4 fw-bold">
                        <i class="fas fa-rupee-sign me-1"></i>
                        ${grandTotal.toLocaleString()}
                    </span>
                </div>
            </div>
        </td>
    `;
    tbody.appendChild(totalRow);
}

// Toggle class fees visibility
function toggleClassFees(className) {
    const records = document.querySelectorAll(`.class-fee-${className}`);
    const icon = document.getElementById(`toggle-fee-${className}`);
    const isVisible = records[0] && records[0].style.display !== 'none';
    
    records.forEach(row => {
        row.style.display = isVisible ? 'none' : '';
    });
    
    if (icon) {
        icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
}

// Helper functions for payment mode badges
function getPaymentModeBadge(mode) {
    switch((mode || '').toLowerCase()) {
        case 'cash': return 'bg-success';
        case 'online': return 'bg-primary';
        case 'bank': return 'bg-info';
        case 'cheque': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
}

function getPaymentModeIcon(mode) {
    switch((mode || '').toLowerCase()) {
        case 'cash': return 'fa-money-bill-wave';
        case 'online': return 'fa-globe';
        case 'bank': return 'fa-university';
        case 'cheque': return 'fa-file-invoice-dollar';
        default: return 'fa-credit-card';
    }
}

function getFeeStatusBadge(status) {
    switch((status || '').toLowerCase()) {
        case 'paid': return 'bg-success';
        case 'pending': return 'bg-warning text-dark';
        case 'partial': return 'bg-info';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Update fee details when student is selected
function updateFeeDetails(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        console.error('Student not found:', studentId);
        return;
    }
    
    const totalFeeInput = document.querySelector('#feeForm input[name="totalFee"]');
    const paidAmountInput = document.querySelector('#feeForm input[name="paidAmount"]');
    const dueAmountInput = document.querySelector('#feeForm input[name="dueAmount"]');
    const payingInput = document.querySelector('#feeForm input[name="payingNow"]');
    
    if (totalFeeInput) totalFeeInput.value = student.fee_amount || 0;
    if (paidAmountInput) paidAmountInput.value = student.paid_amount || 0;
    if (dueAmountInput) dueAmountInput.value = student.due_amount || 0;
    
    if (payingInput) {
        payingInput.max = student.due_amount || 0;
        payingInput.placeholder = `Max: ₹${(student.due_amount || 0).toLocaleString()}`;
        payingInput.value = ''; // Clear previous value
    }
}

// Record payment - FIXED VERSION with working print
async function recordPayment() {
    const form = document.getElementById('feeForm');
    if (!form) {
        showError('Fee form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    // Validation
    const studentId = formData.get('studentId');
    const payingAmount = parseFloat(formData.get('payingNow'));
    const paymentDate = formData.get('paymentDate');
    const paymentMode = formData.get('paymentMode');
    const dueAmount = parseFloat(formData.get('dueAmount'));
    
    if (!studentId) {
        showError('Please select a student');
        return;
    }
    
    if (!payingAmount || payingAmount <= 0) {
        showError('Please enter a valid payment amount');
        return;
    }
    
    if (payingAmount > dueAmount) {
        showError(`Payment amount (₹${payingAmount.toLocaleString()}) cannot exceed due amount (₹${dueAmount.toLocaleString()})`);
        return;
    }
    
    if (!paymentDate) {
        showError('Please select payment date');
        return;
    }
    
    if (!paymentMode) {
        showError('Please select payment mode');
        return;
    }
    
    try {
        const button = document.querySelector('#feeModal .btn-primary');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Processing...';
        button.disabled = true;
        
        const response = await fetch('https://aacem-backend.onrender.com/api/record-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: studentId,
                amount: payingAmount,
                paymentDate: paymentDate,
                paymentMode: paymentMode
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            // Close modal first
            const modal = bootstrap.Modal.getInstance(document.getElementById('feeModal'));
            if (modal) modal.hide();
            
            // Reset form
            form.reset();
            
            showSuccess('Payment recorded successfully!');
            
            // Reload data
            await loadDashboardData();
            
            // Ask for print AFTER modal is closed and data is loaded
            setTimeout(() => {
                if (confirm('Payment recorded successfully! Do you want to print the receipt?')) {
                    // Get the latest receipt number from result or find it
                    let receiptNo = result.receipt_no;
                    
                    // If receipt_no not in result, find the latest receipt for this student
                    if (!receiptNo) {
                        const studentFees = feesData.filter(f => f.student_id === studentId);
                        if (studentFees.length > 0) {
                            // Sort by date to get latest
                            studentFees.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
                            receiptNo = studentFees[0].receipt_no;
                        }
                    }
                    
                    if (receiptNo) {
                        console.log('Printing receipt:', receiptNo);
                        printReceipt(receiptNo);
                    } else {
                        showError('Receipt number not found. Please print from fee records.');
                    }
                }
            }, 500); // Wait for data to load
            
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error recording payment:', error);
        
        const button = document.querySelector('#feeModal .btn-primary');
        if (button) {
            button.innerHTML = '<i class="fas fa-receipt me-1"></i> Record Payment';
            button.disabled = false;
        }
        
        showError('Failed to record payment: ' + error.message);
    }
}

// View fee details
function viewFeeDetails(receiptNo) {
    const fee = feesData.find(f => f.receipt_no === receiptNo);
    if (!fee) {
        showError('Fee record not found!');
        return;
    }
    
    const student = studentsData.find(s => s.student_id === fee.student_id);
    
    const modalHtml = `
        <div class="modal fade" id="feeDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-file-invoice-dollar me-2"></i>
                            Payment Receipt - ${receiptNo}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <!-- Receipt Information -->
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-success border-bottom pb-2">
                                            <i class="fas fa-receipt me-2"></i>Receipt Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Receipt No:</div>
                                            <div class="col-7 fw-bold">${receiptNo}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Payment Date:</div>
                                            <div class="col-7">${formatDate(fee.payment_date)}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Amount:</div>
                                            <div class="col-7">
                                                <span class="text-success fw-bold fs-4">₹${(fee.amount || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Payment Mode:</div>
                                            <div class="col-7">
                                                <span class="badge ${getPaymentModeBadge(fee.payment_mode)}">
                                                    <i class="fas ${getPaymentModeIcon(fee.payment_mode)} me-1"></i>
                                                    ${(fee.payment_mode || 'Unknown').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Status:</div>
                                            <div class="col-7">
                                                <span class="badge bg-success">${(fee.status || 'Paid').toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Student Information -->
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-success border-bottom pb-2">
                                            <i class="fas fa-user-graduate me-2"></i>Student Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Student Name:</div>
                                            <div class="col-7 fw-bold">${fee.student_name || 'Unknown'}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Student ID:</div>
                                            <div class="col-7">${fee.student_id}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Course:</div>
                                            <div class="col-7">
                                                <span class="badge bg-primary">${student ? student.course : 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Total Fee:</div>
                                            <div class="col-7">₹${(student ? student.fee_amount : 0).toLocaleString()}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Total Paid:</div>
                                            <div class="col-7 text-success fw-bold">₹${(student ? student.paid_amount : 0).toLocaleString()}</div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Due Amount:</div>
                                            <div class="col-7 ${(student && student.due_amount > 0) ? 'text-danger' : 'text-success'} fw-bold">
                                                ₹${(student ? student.due_amount : 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Progress -->
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title text-success border-bottom pb-2">
                                    <i class="fas fa-chart-line me-2"></i>Payment Progress
                                </h6>
                                <div class="d-flex justify-content-between mb-2">
                                    <small>Fee Completion</small>
                                    <small>${student ? Math.round((student.paid_amount / student.fee_amount) * 100) : 0}%</small>
                                </div>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar bg-success" 
                                         style="width: ${student ? (student.paid_amount / student.fee_amount) * 100 : 0}%">
                                        ₹${(student ? student.paid_amount : 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-info" onclick="viewStudentFeeHistory('${fee.student_id}')">
                            <i class="fas fa-history me-1"></i> Payment History
                        </button>
                        <button type="button" class="btn btn-success" onclick="printReceipt('${receiptNo}')">
                            <i class="fas fa-print me-1"></i> Print Receipt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('feeDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('feeDetailsModal'));
    modal.show();
}

// View student details with fee summary
function viewStudentDetails(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        showError('Student not found!');
        return;
    }

    const studentFees = feesData.filter(f => f.student_id === studentId);
    const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const dueAmount = (student.fee_amount || 0) - totalPaid;
    
    const modalHTML = `
        <div class="modal fade" id="studentFeeDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-user-graduate me-2"></i>
                            ${student.name} - Complete Fee Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Student Info & Fee Summary -->
                        <div class="row mb-4">
                            <!-- Basic Info -->
                            <div class="col-md-4">
                                <div class="card border-primary">
                                    <div class="card-body">
                                        <h6 class="text-primary border-bottom pb-2">
                                            <i class="fas fa-info-circle me-2"></i>Student Information
                                        </h6>
                                        <p class="mb-2"><strong>Name:</strong> ${student.name}</p>
                                        <p class="mb-2"><strong>UID:</strong> <span class="badge bg-primary">${student.student_id}</span></p>
                                        <p class="mb-2"><strong>Course:</strong> <span class="badge bg-info">${student.course || 'N/A'}</span></p>
                                        <p class="mb-2"><strong>Parent:</strong> ${student.parent_name || 'N/A'}</p>
                                        <p class="mb-2"><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                                        <p class="mb-0"><strong>Join Date:</strong> ${formatDate(student.join_date)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Fee Summary -->
                            <div class="col-md-8">
                                <div class="card border-success">
                                    <div class="card-body">
                                        <h6 class="text-success border-bottom pb-2">
                                            <i class="fas fa-money-bill-wave me-2"></i>Fee Summary
                                        </h6>
                                        <div class="row text-center">
                                            <div class="col-md-3">
                                                <div class="p-3 rounded" style="background: #e8f5e9;">
                                                    <h4 class="text-success mb-0">₹${(student.fee_amount || 0).toLocaleString()}</h4>
                                                    <small class="text-muted">Total Fee</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="p-3 rounded" style="background: #e3f2fd;">
                                                    <h4 class="text-primary mb-0">₹${totalPaid.toLocaleString()}</h4>
                                                    <small class="text-muted">Total Paid</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="p-3 rounded" style="background: ${dueAmount > 0 ? '#ffebee' : '#f3e5f5'};">
                                                    <h4 class="${dueAmount > 0 ? 'text-danger' : 'text-success'} mb-0">
                                                        ₹${dueAmount.toLocaleString()}
                                                    </h4>
                                                    <small class="text-muted">Due Amount</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="p-3 rounded" style="background: #fff8e1;">
                                                    <h4 class="mb-0">
                                                        <span class="badge ${getFeeStatusClass(student.fee_status)}">
                                                            ${student.fee_status || 'Unknown'}
                                                        </span>
                                                    </h4>
                                                    <small class="text-muted">Status</small>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Progress Bar -->
                                        <div class="mt-3">
                                            <div class="d-flex justify-content-between mb-1">
                                                <small>Payment Progress</small>
                                                <small>${Math.round((totalPaid / (student.fee_amount || 1)) * 100)}%</small>
                                            </div>
                                            <div class="progress" style="height: 15px;">
                                                <div class="progress-bar bg-success" 
                                                     style="width: ${(totalPaid / (student.fee_amount || 1)) * 100}%">
                                                    ₹${totalPaid.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment History -->
                        <div class="card">
                            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                <h6 class="mb-0">
                                    <i class="fas fa-history me-2"></i>Payment History
                                    <span class="badge bg-primary ms-2">${studentFees.length} Payments</span>
                                </h6>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-success" onclick="printAllReceipts('${studentId}')">
                                        <i class="fas fa-print me-1"></i> Print All
                                    </button>
                                    <button class="btn btn-info" onclick="exportStudentFeeHistory('${studentId}')">
                                        <i class="fas fa-download me-1"></i> Export
                                    </button>
                                </div>
                            </div>
                            <div class="card-body">
                                ${studentFees.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead class="table-dark">
                                                <tr>
                                                    <th>Receipt No</th>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Mode</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${studentFees.map(fee => `
                                                    <tr>
                                                        <td><strong>${fee.receipt_no}</strong></td>
                                                        <td>${formatDate(fee.payment_date)}</td>
                                                        <td class="text-success fw-bold">₹${(fee.amount || 0).toLocaleString()}</td>
                                                        <td>
                                                            <span class="badge ${getPaymentModeBadge(fee.payment_mode)}">
                                                                ${fee.payment_mode || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span class="badge ${getFeeStatusBadge(fee.status)}">
                                                                ${fee.status || 'Paid'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div class="btn-group btn-group-sm">
                                                                <button class="btn btn-success" onclick="printReceipt('${fee.receipt_no}')">
                                                                    <i class="fas fa-print"></i>
                                                                </button>
                                                                <button class="btn btn-info" onclick="viewFeeDetails('${fee.receipt_no}')">
                                                                    <i class="fas fa-eye"></i>
                                                                </button>
                                                                <button class="btn btn-danger" onclick="deleteFeeRecord('${fee.receipt_no}')">
                                                                    <i class="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : `
                                    <div class="text-center py-4">
                                        <i class="fas fa-money-bill-wave fa-3x text-muted mb-3"></i>
                                        <p class="text-muted">No payment records found</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="editStudent('${studentId}')">
                            <i class="fas fa-edit me-1"></i> Edit Student
                        </button>
                        ${dueAmount > 0 ? `
                            <button type="button" class="btn btn-success" onclick="addNewPayment('${studentId}')">
                                <i class="fas fa-plus me-1"></i> Add Payment
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('studentFeeDetailsModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('studentFeeDetailsModal'));
    modal.show();
}

// Add new payment (shortcut from student details)
function addNewPayment(studentId) {
    // Close student details modal
    const studentModal = bootstrap.Modal.getInstance(document.getElementById('studentFeeDetailsModal'));
    if (studentModal) studentModal.hide();
    
    // Open fee modal with student pre-selected
    setTimeout(() => {
        const feeModal = new bootstrap.Modal(document.getElementById('feeModal'));
        const studentSelect = document.querySelector('#feeForm select[name="studentId"]');
        
        if (studentSelect) {
            studentSelect.value = studentId;
            updateFeeDetails(studentId);
        }
        
        feeModal.show();
    }, 300);
}

// View class fee report
function viewClassFeeReport(className) {
    const classFees = feesData.filter(fee => {
        const student = studentsData.find(s => s.student_id === fee.student_id);
        return student && student.course === className;
    });
    
    if (classFees.length === 0) {
        showInfo(`No fee records found for ${className}`);
        return;
    }
    
    // Sort by date (newest first)
    classFees.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    
    // Calculate statistics
    const totalCollected = classFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const totalPayments = classFees.length;
    
    // Get unique students
    const uniqueStudents = [...new Set(classFees.map(f => f.student_id))];
    const totalStudents = uniqueStudents.length;
    
    // Calculate pending fees
    const classStudents = studentsData.filter(s => s.course === className);
    const totalExpected = classStudents.reduce((sum, s) => sum + (s.fee_amount || 0), 0);
    const totalPending = totalExpected - totalCollected;
    
    const modalHtml = `
        <div class="modal fade" id="classFeeReportModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-pie me-2"></i>
                            Fee Report - ${className}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Statistics -->
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card text-center border-success">
                                    <div class="card-body">
                                        <h3 class="text-success mb-0">₹${totalCollected.toLocaleString()}</h3>
                                        <small class="text-muted">Total Collected</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-primary">
                                    <div class="card-body">
                                        <h3 class="text-primary mb-0">${totalPayments}</h3>
                                        <small class="text-muted">Total Payments</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-info">
                                    <div class="card-body">
                                        <h3 class="text-info mb-0">${totalStudents}</h3>
                                        <small class="text-muted">Students Paid</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center border-danger">
                                    <div class="card-body">
                                        <h3 class="text-danger mb-0">₹${totalPending.toLocaleString()}</h3>
                                        <small class="text-muted">Total Pending</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment History -->
                        <div class="table-responsive">
                            <table class="table table-hover table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Receipt No</th>
                                        <th>Student</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Mode</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${classFees.map(fee => `
                                        <tr>
                                            <td><strong>${fee.receipt_no}</strong></td>
                                            <td>
                                                <strong>${fee.student_name}</strong>
                                                <br>
                                                <small class="text-muted">${fee.student_id}</small>
                                            </td>
                                            <td>${formatDate(fee.payment_date)}</td>
                                            <td class="text-success fw-bold">₹${(fee.amount || 0).toLocaleString()}</td>
                                            <td>
                                                <span class="badge ${getPaymentModeBadge(fee.payment_mode)}">
                                                    ${fee.payment_mode || 'N/A'}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button class="btn btn-success" onclick="printReceipt('${fee.receipt_no}')">
                                                        <i class="fas fa-print"></i>
                                                    </button>
                                                    <button class="btn btn-info" onclick="viewFeeDetails('${fee.receipt_no}')">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" onclick="exportClassFeeReport('${className}')">
                            <i class="fas fa-download me-1"></i> Export Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('classFeeReportModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('classFeeReportModal'));
    modal.show();
}

// Print receipt (A4 format)
async function printReceipt(receiptNo) {
    try {
        const feeRecord = feesData.find(f => f.receipt_no === receiptNo);
        if (!feeRecord) {
            showError('Fee record not found!');
            return;
        }

        const student = studentsData.find(s => s.student_id === feeRecord.student_id);
        if (!student) {
            showError('Student details not found!');
            return;
        }

        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Fee Receipt - ${receiptNo}</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
                    .container { max-width: 100%; padding: 10px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
                    .institute-name { font-size: 20px; font-weight: bold; color: #2d6b6b; margin-bottom: 3px; }
                    .institute-address { font-size: 10px; color: #666; margin-bottom: 5px; }
                    .receipt-title { font-size: 16px; font-weight: bold; color: #333; margin-top: 8px; }
                    .info-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
                    .info-table td { padding: 4px 8px; border: 1px solid #ddd; font-size: 11px; }
                    .info-table td:first-child { font-weight: bold; background: #f5f5f5; width: 35%; }
                    .amount-table { width: 100%; margin: 12px 0; border-collapse: collapse; }
                    .amount-table th { background: #2d6b6b; color: white; padding: 6px; text-align: left; font-size: 11px; border: 1px solid #2d6b6b; }
                    .amount-table td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
                    .amount-table .text-right { text-align: right; }
                    .amount-table .highlight { background: #fff3cd; font-weight: bold; }
                    .signature-section { display: flex; justify-content: space-between; margin-top: 30px; }
                    .signature { text-align: center; width: 40%; }
                    .signature-line { border-top: 1px solid #333; margin-top: 35px; margin-bottom: 5px; }
                    .signature-label { font-size: 10px; color: #666; }
                    .footer { text-align: center; margin-top: 15px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #666; }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="institute-name">AACEM INSTITUTE</div>
                        <div class="institute-address">
                            Ludhiana, Punjab, India | Phone: +91-XXXXXXXXXX | Email: info@aacem.edu.in
                        </div>
                        <div class="receipt-title">FEE PAYMENT RECEIPT</div>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td>Receipt Number</td>
                            <td><strong>${receiptNo}</strong></td>
                            <td>Student ID</td>
                            <td><strong>${student.student_id}</strong></td>
                        </tr>
                        <tr>
                            <td>Payment Date</td>
                            <td>${formatDate(feeRecord.payment_date)}</td>
                            <td>Student Name</td>
                            <td>${student.name}</td>
                        </tr>
                        <tr>
                            <td>Payment Mode</td>
                            <td>${feeRecord.payment_mode.toUpperCase()}</td>
                            <td>Course</td>
                            <td>${student.course}</td>
                        </tr>
                    </table>

                    <table class="amount-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Course Fee</td>
                                <td class="text-right">${(student.fee_amount || 0).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td>Previously Paid</td>
                                <td class="text-right">${((student.paid_amount || 0) - (feeRecord.amount || 0)).toLocaleString()}</td>
                            </tr>
                            <tr class="highlight">
                                <td><strong>Current Payment</strong></td>
                                <td class="text-right"><strong>${(feeRecord.amount || 0).toLocaleString()}</strong></td>
                            </tr>
                            <tr style="background: #e8f5e9;">
                                <td><strong>Total Paid Amount</strong></td>
                                <td class="text-right"><strong>${(student.paid_amount || 0).toLocaleString()}</strong></td>
                            </tr>
                            <tr style="background: ${(student.due_amount || 0) > 0 ? '#ffebee' : '#f3e5f5'};">
                                <td><strong>Remaining Due Amount</strong></td>
                                <td class="text-right" style="color: ${(student.due_amount || 0) > 0 ? '#dc3545' : '#28a745'};">
                                    <strong>${(student.due_amount || 0).toLocaleString()}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <div class="signature">
                            <div class="signature-line"></div>
                            <div class="signature-label">Student/Parent Signature</div>
                        </div>
                        <div class="signature">
                            <div class="signature-line"></div>
                            <div class="signature-label">Authorized Signature</div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>This is a computer generated receipt. No signature required.</p>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>

                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()" style="background: #2d6b6b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                            🖨️ Print Receipt
                        </button>
                        <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">
                            ❌ Close
                        </button>
                    </div>
                </div>
            </body>
            </html>
        `;

        const receiptWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
        receiptWindow.document.write(receiptHtml);
        receiptWindow.document.close();
        receiptWindow.focus();

    } catch (error) {
        console.error('Error generating receipt:', error);
        showError('Failed to generate receipt: ' + error.message);
    }
}

// Print all receipts for a class
function printClassReceipts(className) {
    const classFees = feesData.filter(fee => {
        const student = studentsData.find(s => s.student_id === fee.student_id);
        return student && student.course === className;
    });
    
    if (classFees.length === 0) {
        showError(`No fee records found for ${className}`);
        return;
    }
    
    if (confirm(`Do you want to print all ${classFees.length} receipts for ${className}?`)) {
        classFees.forEach((fee, index) => {
            setTimeout(() => {
                printReceipt(fee.receipt_no);
            }, index * 500);
        });
    }
}

// Print all receipts for a student
function printAllReceipts(studentId) {
    const studentFees = feesData.filter(f => f.student_id === studentId);
    
    if (studentFees.length === 0) {
        showError('No fee records found');
        return;
    }
    
    if (confirm(`Print all ${studentFees.length} receipts?`)) {
        studentFees.forEach((fee, index) => {
            setTimeout(() => {
                printReceipt(fee.receipt_no);
            }, index * 500);
        });
    }
}

// Export student fee history
function exportStudentFeeHistory(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    const studentFees = feesData.filter(f => f.student_id === studentId);
    
    if (studentFees.length === 0) {
        showError('No fee records to export');
        return;
    }
    
    let csvContent = `Fee History - ${student ? student.name : studentId}\n`;
    csvContent += `Student ID: ${studentId}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Receipt No,Payment Date,Amount,Payment Mode,Status\n`;
    
    studentFees.forEach(fee => {
        csvContent += `${fee.receipt_no},${formatDate(fee.payment_date)},${fee.amount},${fee.payment_mode},${fee.status}\n`;
    });
    
    const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    csvContent += `\nSummary\n`;
    csvContent += `Total Fee,${student ? student.fee_amount : 'N/A'}\n`;
    csvContent += `Total Paid,${totalPaid}\n`;
    csvContent += `Due Amount,${student ? student.due_amount : 'N/A'}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_history_${studentId}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Fee history exported successfully!');
}

// Export class fee report
function exportClassFeeReport(className) {
    const classFees = feesData.filter(fee => {
        const student = studentsData.find(s => s.student_id === fee.student_id);
        return student && student.course === className;
    });
    
    if (classFees.length === 0) {
        showError('No records to export');
        return;
    }
    
    let csvContent = `Fee Report - ${className}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Receipt No,Student Name,Student ID,Date,Amount,Mode,Status\n`;
    
    classFees.forEach(fee => {
        csvContent += `${fee.receipt_no},${fee.student_name},${fee.student_id},${formatDate(fee.payment_date)},${fee.amount},${fee.payment_mode},${fee.status}\n`;
    });
    
    const total = classFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    csvContent += `\nTotal Collected,${total}\n`;
    csvContent += `Total Payments,${classFees.length}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_report_${className}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Fee report exported successfully!');
}

// Delete fee record
async function deleteFeeRecord(receiptNo) {
    if (!confirm('Are you sure you want to delete this fee record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/delete-fee/${receiptNo}`,
            { method: 'DELETE' }
        );
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            
            // Close any open modals
            ['feeDetailsModal', 'studentFeeDetailsModal', 'classFeeReportModal'].forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    const instance = bootstrap.Modal.getInstance(modal);
                    if (instance) instance.hide();
                }
            });
            
            showSuccess('Fee record deleted successfully!');
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting fee record:', error);
        showError('Failed to delete fee record: ' + error.message);
    }
}

// Helper function for fee status class
function getFeeStatusClass(status) {
    if (!status) return 'bg-secondary';
    
    switch (status.toLowerCase()) {
        case 'paid': return 'bg-success';
        case 'partial': return 'bg-warning';
        case 'pending': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Load students for fee based on course selection
async function loadStudentsForFee(courseCode) {
    const studentSelect = document.querySelector('#feeForm select[name="studentId"]');
    
    if (!studentSelect) {
        console.error('Student select not found in fee form');
        return;
    }
    
    if (!courseCode) {
        studentSelect.innerHTML = '<option value="">Select Course First</option>';
        
        // Clear fee details
        const totalFeeInput = document.querySelector('#feeForm input[name="totalFee"]');
        const paidAmountInput = document.querySelector('#feeForm input[name="paidAmount"]');
        const dueAmountInput = document.querySelector('#feeForm input[name="dueAmount"]');
        const payingInput = document.querySelector('#feeForm input[name="payingNow"]');
        
        if (totalFeeInput) totalFeeInput.value = '';
        if (paidAmountInput) paidAmountInput.value = '';
        if (dueAmountInput) dueAmountInput.value = '';
        if (payingInput) payingInput.value = '';
        
        return;
    }
    
    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    
    try {
        console.log(`Loading students for course: ${courseCode}`);
        
        // API call to get students by course
        const response = await fetch(
            `https://aacem-backend.onrender.com/api/students/course/${encodeURIComponent(courseCode)}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (result.success && result.students && result.students.length > 0) {
            console.log(`Loaded ${result.students.length} students for fee payment`);
            
            result.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.student_id;
                
                // Show name, UID, and due amount
                const dueAmount = (student.fee_amount || 0) - (student.paid_amount || 0);
                option.textContent = `${student.name} (${student.student_id}) - Due: ₹${dueAmount.toLocaleString()}`;
                
                option.setAttribute('data-student-name', student.name);
                option.setAttribute('data-due-amount', dueAmount);
                
                studentSelect.appendChild(option);
            });
            
        } else {
            console.log(`No students found for course: ${courseCode}`);
            studentSelect.innerHTML = '<option value="">No students found in this course</option>';
        }
        
    } catch (error) {
        console.error('Error loading students for fee:', error);
        
        // Fallback: Use local data
        console.log('Trying fallback with local data...');
        const courseStudents = studentsData.filter(s => s.course === courseCode);
        
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        if (courseStudents.length > 0) {
            console.log(`Fallback: Loaded ${courseStudents.length} students from local data`);
            
            courseStudents.forEach(student => {
                const option = document.createElement('option');
                option.value = student.student_id;
                
                const dueAmount = (student.fee_amount || 0) - (student.paid_amount || 0);
                option.textContent = `${student.name} (${student.student_id}) - Due: ₹${dueAmount.toLocaleString()}`;
                
                option.setAttribute('data-student-name', student.name);
                option.setAttribute('data-due-amount', dueAmount);
                
                studentSelect.appendChild(option);
            });
        } else {
            studentSelect.innerHTML = '<option value="">No students found in this course</option>';
        }
    }
}

// Initialize fee modal - UPDATED VERSION
document.addEventListener('DOMContentLoaded', function() {
    const feeModal = document.getElementById('feeModal');
    if (feeModal) {
        feeModal.addEventListener('show.bs.modal', function() {
            const form = document.getElementById('feeForm');
            form.reset();
            
            // Set today's date
            const dateInput = form.querySelector('input[name="paymentDate"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Populate COURSE dropdown (NEW - not student)
            populateCourseDropdown('feeForm', 'course');
            
            // Clear student dropdown
            const studentSelect = form.querySelector('select[name="studentId"]');
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select Course First</option>';
            }
            
            // Clear fee details
            const inputs = ['totalFee', 'paidAmount', 'dueAmount', 'payingNow'];
            inputs.forEach(name => {
                const input = form.querySelector(`input[name="${name}"]`);
                if (input) input.value = '';
            });
        });
    }
    
    // Student change listener
    const studentSelect = document.querySelector('#feeForm select[name="studentId"]');
    if (studentSelect) {
        studentSelect.addEventListener('change', function() {
            if (this.value) {
                updateFeeDetails(this.value);
            }
        });
    }
});

console.log('Fee Management functions loaded successfully!');








// Get grade class
function getGradeClass(grade) {
    switch (grade) {
        case 'A+': case 'A': return 'bg-success';
        case 'B': case 'C': return 'bg-info';
        case 'D': case 'E': return 'bg-warning';
        case 'F': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Reset modal to add mode
function resetModalToAddMode(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const title = modal.querySelector('.modal-title');
    const saveBtn = modal.querySelector('.btn-primary');
    
    if (!title || !saveBtn) return;
    
    switch (modalId) {
        case 'studentModal':
            title.textContent = 'New Student Admission';
            saveBtn.textContent = 'Save Student';
            saveBtn.onclick = saveStudent;
            break;
        case 'teacherModal':
            title.textContent = 'Add New Teacher';
            saveBtn.textContent = 'Save Teacher';
            saveBtn.onclick = saveTeacher;
            break;
        case 'courseModal':
            title.textContent = 'Add New Course';
            saveBtn.textContent = 'Save Course';
            saveBtn.onclick = saveCourse;
            break;
        case 'marksModal':
            title.textContent = 'Enter Student Marks';
            saveBtn.textContent = 'Save Marks';
            saveBtn.onclick = saveMarks;
            break;
        case 'notificationModal':
            title.textContent = 'Send Notification';
            saveBtn.textContent = 'Send Notification';
            saveBtn.onclick = sendNotification;
            break;
    }
    
    currentEditId = null;
}

// Save student function
async function saveStudent() {
    const form = document.getElementById('studentForm');
    if (!form) {
        alert('Student form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    const requiredFields = ['fullName', 'parentName', 'phone', 'course', 'fee'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
        alert('Please fill all required fields: ' + missingFields.join(', '));
        return;
    }
    
    try {
        const button = document.getElementById('studentSaveBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Saving...';
        button.disabled = true;
        
        const url = currentEditId ? 
            `https://aacem-backend.onrender.com/api/update-student/${currentEditId}` :
            'https://aacem-backend.onrender.com/api/add-student';
        
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: formData.get('fullName'),
                parentName: formData.get('parentName'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                course: formData.get('course'),
                fee: formData.get('fee'),
                address: formData.get('address')
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadDashboardData();
            const modal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
            if (modal) modal.hide();
            showSuccess(currentEditId ? 'Student updated successfully!' : 'Student added successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving student:', error);
        const button = document.getElementById('studentSaveBtn');
        if (button) {
            button.innerHTML = 'Save Student';
            button.disabled = false;
        }
        alert('Failed to save student. Please try again. Error: ' + error.message);
    }
}

// Save teacher function
async function saveTeacher() {
    const form = document.getElementById('teacherForm');
    if (!form) {
        alert('Teacher form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    const requiredFields = ['fullName', 'subject', 'phone', 'salary', 'joiningDate'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
        alert('Please fill all required fields: ' + missingFields.join(', '));
        return;
    }
    
    try {
        const button = document.getElementById('teacherSaveBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Saving...';
        button.disabled = true;
        
        const url = currentEditId ? 
            `https://aacem-backend.onrender.com/api/update-teacher/${currentEditId}` :
            'https://aacem-backend.onrender.com/api/add-teacher';
        
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: formData.get('fullName'),
                subject: formData.get('subject'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                salary: formData.get('salary'),
                joiningDate: formData.get('joiningDate'),
                address: formData.get('address')
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadDashboardData();
            const modal = bootstrap.Modal.getInstance(document.getElementById('teacherModal'));
            if (modal) modal.hide();
            showSuccess(currentEditId ? 'Teacher updated successfully!' : 'Teacher added successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving teacher:', error);
        const button = document.getElementById('teacherSaveBtn');
        if (button) {
            button.innerHTML = 'Save Teacher';
            button.disabled = false;
        }
        alert('Failed to save teacher. Please try again. Error: ' + error.message);
    }
}

// Save course function
async function saveCourse() {
    const form = document.getElementById('courseForm');
    if (!form) {
        alert('Course form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    const requiredFields = ['courseName', 'courseCode', 'duration', 'feeAmount'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
        alert('Please fill all required fields: ' + missingFields.join(', '));
        return;
    }
    
    try {
        const button = document.getElementById('courseSaveBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Saving...';
        button.disabled = true;
        
        const url = currentEditId ? 
            `https://aacem-backend.onrender.com/api/update-course/${currentEditId}` :
            'https://aacem-backend.onrender.com/api/add-course';
        
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courseName: formData.get('courseName'),
                courseCode: formData.get('courseCode'),
                duration: formData.get('duration'),
                feeAmount: formData.get('feeAmount'),
                description: formData.get('description'),
                category: formData.get('category'),
                isActive: formData.get('isActive') === 'on'
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadDashboardData();
            const modal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
            if (modal) modal.hide();
            showSuccess(currentEditId ? 'Course updated successfully!' : 'Course added successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving course:', error);
        const button = document.getElementById('courseSaveBtn');
        if (button) {
            button.innerHTML = 'Save Course';
            button.disabled = false;
        }
        alert('Failed to save course. Please try again. Error: ' + error.message);
    }
}





// Send notification function
async function sendNotification() {
    const form = document.getElementById('notificationForm');
    if (!form) {
        alert('Notification form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    const title = formData.get('title');
    const message = formData.get('message');
    const audience = formData.get('audience');
    
    if (!title || !message || !audience) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const button = document.querySelector('#notificationModal .btn-primary');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Sending...';
        button.disabled = true;
        
        const url = currentEditId ? 
            `https://aacem-backend.onrender.com/api/update-notification/${currentEditId}` :
            'https://aacem-backend.onrender.com/api/send-notification';
        
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                message: message,
                audience: audience,
                priority: formData.get('priority') || 'medium'
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            await loadNotifications();
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
            if (modal) modal.hide();
            showSuccess(currentEditId ? 'Notification updated successfully!' : 'Notification sent successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error sending notification:', error);
        const button = document.querySelector('#notificationModal .btn-primary');
        if (button) {
            button.innerHTML = 'Send Notification';
            button.disabled = false;
        }
        alert('Failed to send notification. Please try again. Error: ' + error.message);
    }
}

// Generate report function
async function generateReport() {
    const form = document.getElementById('reportForm');
    if (!form) {
        alert('Report form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    if (!formData.get('reportType') || !formData.get('format')) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const button = document.querySelector('#reportModal .btn-primary');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> Generating...';
        button.disabled = true;
        
        const response = await fetch('https://aacem-backend.onrender.com/api/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportType: formData.get('reportType'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                format: formData.get('format')
            })
        });
        
        const result = await response.json();
        
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (result.success) {
            if (result.data) {
                // Create and download file
                const blob = new Blob([result.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename || `report_${new Date().getTime()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
            if (modal) modal.hide();
            showSuccess('Report generated successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        const button = document.querySelector('#reportModal .btn-primary');
        if (button) {
            button.innerHTML = 'Generate Report';
            button.disabled = false;
        }
        alert('Failed to generate report. Please try again. Error: ' + error.message);
    }
}

// Save settings function
async function saveSettings() {
    const form = document.getElementById('settingsForm');
    if (!form) {
        alert('Settings form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    try {
        const response = await fetch('https://aacem-backend.onrender.com/api/update-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instituteName: formData.get('instituteName'),
                address: formData.get('address'),
                contactNumber: formData.get('contactNumber'),
                email: formData.get('email'),
                website: formData.get('website')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            if (modal) modal.hide();
            showSuccess('Settings saved successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again. Error: ' + error.message);
    }
}

// Sync with Supabase
async function syncWithSupabase() {
    try {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.className = 'sync-status bg-info text-white';
            syncStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin me-2"></i> Syncing with Supabase...';
            syncStatus.style.display = 'block';
        }
        
        const response = await fetch('https://aacem-backend.onrender.com/api/sync-supabase');
        const result = await response.json();
        
        if (result.success) {
            if (syncStatus) {
                syncStatus.className = 'sync-status bg-success text-white';
                syncStatus.innerHTML = '<i class="fas fa-check-circle me-2"></i> Data synced with Supabase';
            }
            
            await loadDashboardData();
        } else {
            throw new Error(result.message);
        }
        
        setTimeout(() => {
            if (syncStatus) {
                syncStatus.style.display = 'none';
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error syncing with Supabase:', error);
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.className = 'sync-status bg-danger text-white';
            syncStatus.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Sync failed';
            syncStatus.style.display = 'block';
        }
        
        setTimeout(() => {
            if (syncStatus) {
                syncStatus.style.display = 'none';
            }
        }, 3000);
        
        alert('Failed to sync with Supabase. Please check your connection and try again. Error: ' + error.message);
    }
}

// Export data function
async function exportData(type) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/export-data?type=${type}`);
        const result = await response.json();
        
        if (result.success) {
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showSuccess(`${type} data exported successfully!`);
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data. Please try again. Error: ' + error.message);
    }
}

// Logout function - UPDATED for authentication
function logout() {
    if (confirm("Are you sure you want to log out?")) {
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}

// Edit Student Function
async function editStudent(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        alert('Student not found!');
        return;
    }

    const form = document.getElementById('studentForm');
    if (!form) {
        alert('Student form not found');
        return;
    }

    form.querySelector('input[name="fullName"]').value = student.name || '';
    form.querySelector('input[name="parentName"]').value = student.parent_name || '';
    form.querySelector('input[name="phone"]').value = student.phone || '';
    form.querySelector('input[name="email"]').value = student.email || '';
    form.querySelector('select[name="course"]').value = student.course || '';
    form.querySelector('input[name="fee"]').value = student.fee_amount || '';
    form.querySelector('textarea[name="address"]').value = student.address || '';

    const modal = document.getElementById('studentModal');
    const title = modal.querySelector('.modal-title');
    const saveBtn = modal.querySelector('.btn-primary');
    
    if (title) title.textContent = 'Edit Student';
    if (saveBtn) {
        saveBtn.textContent = 'Update Student';
        saveBtn.onclick = function() { saveStudent(); };
    }

    currentEditId = studentId;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Edit Teacher Function
async function editTeacher(teacherId) {
    const teacher = teachersData.find(t => t.teacher_id === teacherId);
    if (!teacher) {
        alert('Teacher not found!');
        return;
    }

    const form = document.getElementById('teacherForm');
    if (!form) {
        alert('Teacher form not found');
        return;
    }

    form.querySelector('input[name="fullName"]').value = teacher.name || '';
    form.querySelector('input[name="subject"]').value = teacher.subject || '';
    form.querySelector('input[name="phone"]').value = teacher.phone || '';
    form.querySelector('input[name="email"]').value = teacher.email || '';
    form.querySelector('input[name="salary"]').value = teacher.salary || '';
    form.querySelector('input[name="joiningDate"]').value = teacher.joining_date || '';
    form.querySelector('textarea[name="address"]').value = teacher.address || '';

    const modal = document.getElementById('teacherModal');
    const title = modal.querySelector('.modal-title');
    const saveBtn = modal.querySelector('.btn-primary');
    
    if (title) title.textContent = 'Edit Teacher';
    if (saveBtn) {
        saveBtn.textContent = 'Update Teacher';
        saveBtn.onclick = function() { saveTeacher(); };
    }

    currentEditId = teacherId;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Edit Course Function
async function editCourse(courseCode) {
    const course = coursesData.find(c => c.course_code === courseCode);
    if (!course) {
        alert('Course not found!');
        return;
    }

    const form = document.getElementById('courseForm');
    if (!form) {
        alert('Course form not found');
        return;
    }

    form.querySelector('input[name="courseName"]').value = course.course_name || '';
    form.querySelector('input[name="courseCode"]').value = course.course_code || '';
    form.querySelector('input[name="duration"]').value = course.duration || '';
    form.querySelector('input[name="feeAmount"]').value = course.fee_amount || '';
    form.querySelector('textarea[name="description"]').value = course.description || '';
    form.querySelector('select[name="category"]').value = course.category || 'computer';
    form.querySelector('input[name="isActive"]').checked = course.is_active || false;

    const modal = document.getElementById('courseModal');
    const title = modal.querySelector('.modal-title');
    const saveBtn = modal.querySelector('.btn-primary');
    
    if (title) title.textContent = 'Edit Course';
    if (saveBtn) {
        saveBtn.textContent = 'Update Course';
        saveBtn.onclick = function() { saveCourse(); };
    }

    currentEditId = courseCode;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}



// Edit Notification Function
async function editNotification(notificationId) {
    const notification = notificationsData.find(n => n.id == notificationId);
    if (!notification) {
        alert('Notification not found!');
        return;
    }

    const form = document.getElementById('notificationForm');
    if (!form) {
        alert('Notification form not found');
        return;
    }

    form.querySelector('input[name="title"]').value = notification.title || '';
    form.querySelector('textarea[name="message"]').value = notification.message || '';
    form.querySelector('select[name="audience"]').value = notification.audience || 'all';
    form.querySelector('select[name="priority"]').value = notification.priority || 'medium';

    const modal = document.getElementById('notificationModal');
    const title = modal.querySelector('.modal-title');
    const saveBtn = modal.querySelector('.btn-primary');
    
    if (title) title.textContent = 'Edit Notification';
    if (saveBtn) {
        saveBtn.textContent = 'Update Notification';
        saveBtn.onclick = function() { sendNotification(); };
    }

    currentEditId = notificationId;
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}
// Delete functions
async function deleteStudent(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        alert('Student not found!');
        return;
    }

    let message = `Are you sure you want to delete student ${student.name} (${student.student_id})?\n\n`;
    
    // Check if student has fee records
    const hasFeeRecords = feesData.some(f => f.student_id === studentId);
    const hasMarksRecords = marksData.some(m => m.student_id === studentId);
    
    if (hasFeeRecords || hasMarksRecords) {
        message += "⚠️ Warning: This student has associated records:\n";
        if (hasFeeRecords) message += "• Fee payment records\n";
        if (hasMarksRecords) message += "• Exam marks records\n";
        message += "\nDeleting will remove all associated records. This action cannot be undone!";
        
        if (!confirm(message)) return;
        
        // Use force delete
        try {
            const response = await fetch(`https://aacem-backend.onrender.com/api/delete-student-force/${studentId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                await loadDashboardData();
                showSuccess('Student and all related records deleted successfully!');
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error force deleting student:', error);
            alert('Failed to delete student. Please try again. Error: ' + error.message);
        }
    } else {
        // Regular delete for students without records
        if (!confirm(message + "This action cannot be undone.")) return;
        
        try {
            const response = await fetch(`https://aacem-backend.onrender.com/api/delete-student/${studentId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                await loadDashboardData();
                showSuccess('Student deleted successfully!');
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Failed to delete student. Please try again. Error: ' + error.message);
        }
    }
}
// REPLACE ये सारे functions:

// 1. Student View
function viewStudent(studentId) {
    const student = studentsData.find(s => s.student_id === studentId);
    if (!student) {
        showError('Student not found!');
        return;
    }

    const studentFees = feesData.filter(f => f.student_id === studentId);
    const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const dueAmount = (student.fee_amount || 0) - totalPaid;
    
    const modalHTML = `
        <div class="modal fade" id="viewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-user-graduate me-2"></i>
                            ${student.name} - Student Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-primary border-bottom pb-2">
                                            <i class="fas fa-info-circle me-2"></i>Basic Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Student ID:</div>
                                            <div class="col-7 fw-bold">${student.student_id}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Full Name:</div>
                                            <div class="col-7">${student.name}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Parent Name:</div>
                                            <div class="col-7">${student.parent_name || 'N/A'}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Class:</div>
                                            <div class="col-7">
                                                <span class="badge bg-primary">${student.course || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Join Date:</div>
                                            <div class="col-7">${formatDate(student.join_date)}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-primary border-bottom pb-2">
                                            <i class="fas fa-address-card me-2"></i>Contact Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Phone:</div>
                                            <div class="col-7">
                                                <i class="fas fa-phone text-success me-1"></i>
                                                ${student.phone || 'N/A'}
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Email:</div>
                                            <div class="col-7">
                                                <i class="fas fa-envelope text-primary me-1"></i>
                                                ${student.email || 'N/A'}
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Address:</div>
                                            <div class="col-7">${student.address || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-primary border-bottom pb-2">
                                            <i class="fas fa-money-bill-wave me-2"></i>Fee Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Total Fee:</div>
                                            <div class="col-6 text-end fw-bold">₹${(student.fee_amount || 0).toLocaleString()}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Paid Amount:</div>
                                            <div class="col-6 text-end text-success fw-bold">
                                                ₹${totalPaid.toLocaleString()}
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-6 text-muted">Due Amount:</div>
                                            <div class="col-6 text-end">
                                                <span class="fw-bold ${dueAmount > 0 ? 'text-danger' : 'text-success'}">
                                                    ₹${dueAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-6 text-muted">Status:</div>
                                            <div class="col-6 text-end">
                                                <span class="badge ${getFeeStatusClass(student.fee_status)}">
                                                    ${student.fee_status || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-primary border-bottom pb-2">
                                            <i class="fas fa-chart-line me-2"></i>Quick Stats
                                        </h6>
                                        <div class="row text-center">
                                            <div class="col-4">
                                                <div class="text-primary fw-bold fs-5">${studentFees.length}</div>
                                                <small class="text-muted">Payments</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="text-success fw-bold fs-5">₹${totalPaid.toLocaleString()}</div>
                                                <small class="text-muted">Total Paid</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="${dueAmount > 0 ? 'text-danger' : 'text-success'} fw-bold fs-5">
                                                    ₹${dueAmount.toLocaleString()}
                                                </div>
                                                <small class="text-muted">Pending</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="editStudent('${studentId}')">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                        <button type="button" class="btn btn-success" onclick="viewStudentFeeHistory('${studentId}')">
                            <i class="fas fa-history me-1"></i> Fee History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalHTML);
}

// 2. Teacher View
function viewTeacher(teacherId) {
    const teacher = teachersData.find(t => t.teacher_id === teacherId);
    if (!teacher) {
        showError('Teacher not found!');
        return;
    }

    const modalHTML = `
        <div class="modal fade" id="viewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-chalkboard-teacher me-2"></i>
                            ${teacher.name} - Teacher Details
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-warning border-bottom pb-2">
                                            <i class="fas fa-user-tie me-2"></i>Basic Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Teacher ID:</div>
                                            <div class="col-7 fw-bold">${teacher.teacher_id}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Full Name:</div>
                                            <div class="col-7">${teacher.name}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Subject:</div>
                                            <div class="col-7">
                                                <span class="badge bg-info">${teacher.subject || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Joining Date:</div>
                                            <div class="col-7">${formatDate(teacher.joining_date)}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-warning border-bottom pb-2">
                                            <i class="fas fa-money-check-alt me-2"></i>Salary Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Monthly Salary:</div>
                                            <div class="col-6 text-end fw-bold text-success">
                                                ₹${(teacher.salary || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Annual Salary:</div>
                                            <div class="col-6 text-end fw-bold">
                                                ₹${((teacher.salary || 0) * 12).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-warning border-bottom pb-2">
                                            <i class="fas fa-address-card me-2"></i>Contact Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Phone:</div>
                                            <div class="col-7">
                                                <i class="fas fa-phone text-success me-1"></i>
                                                ${teacher.phone || 'N/A'}
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Email:</div>
                                            <div class="col-7">
                                                <i class="fas fa-envelope text-primary me-1"></i>
                                                ${teacher.email || 'N/A'}
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Address:</div>
                                            <div class="col-7">${teacher.address || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-warning border-bottom pb-2">
                                            <i class="fas fa-chart-pie me-2"></i>Employment Details
                                        </h6>
                                        <div class="row text-center">
                                            <div class="col-4">
                                                <div class="text-warning fw-bold fs-5">
                                                    ${calculateExperience(teacher.joining_date)}
                                                </div>
                                                <small class="text-muted">Experience</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="text-success fw-bold fs-5">
                                                    ₹${(teacher.salary || 0).toLocaleString()}
                                                </div>
                                                <small class="text-muted">Monthly</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="text-primary fw-bold fs-5">
                                                    ₹${((teacher.salary || 0) * 12).toLocaleString()}
                                                </div>
                                                <small class="text-muted">Annual</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-warning" onclick="editTeacher('${teacherId}')">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalHTML);
}

// 3. Course View
function viewCourse(courseCode) {
    const course = coursesData.find(c => c.course_code === courseCode);
    if (!course) {
        showError('Course not found!');
        return;
    }

    const courseStudents = studentsData.filter(s => s.course === courseCode);
    const courseFees = feesData.filter(f => {
        const student = studentsData.find(s => s.student_id === f.student_id);
        return student && student.course === courseCode;
    });
    const totalRevenue = courseFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    
    const modalHTML = `
        <div class="modal fade" id="viewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-book me-2"></i>
                            ${course.course_name} - Course Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-info border-bottom pb-2">
                                            <i class="fas fa-info-circle me-2"></i>Course Information
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Course Code:</div>
                                            <div class="col-7 fw-bold">${course.course_code}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Course Name:</div>
                                            <div class="col-7">${course.course_name}</div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Duration:</div>
                                            <div class="col-7">
                                                <span class="badge bg-primary">${course.duration} months</span>
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-5 text-muted">Category:</div>
                                            <div class="col-7">
                                                <span class="badge bg-secondary">${course.category || 'General'}</span>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-5 text-muted">Status:</div>
                                            <div class="col-7">
                                                <span class="badge ${course.is_active ? 'bg-success' : 'bg-danger'}">
                                                    ${course.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-info border-bottom pb-2">
                                            <i class="fas fa-money-bill-wave me-2"></i>Fee Structure
                                        </h6>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Course Fee:</div>
                                            <div class="col-6 text-end fw-bold text-success">
                                                ₹${(course.fee_amount || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div class="row mb-2">
                                            <div class="col-6 text-muted">Total Revenue:</div>
                                            <div class="col-6 text-end fw-bold">
                                                ₹${totalRevenue.toLocaleString()}
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-6 text-muted">Potential Revenue:</div>
                                            <div class="col-6 text-end text-muted">
                                                ₹${((course.fee_amount || 0) * courseStudents.length).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-info border-bottom pb-2">
                                            <i class="fas fa-chart-bar me-2"></i>Course Statistics
                                        </h6>
                                        <div class="row text-center mb-3">
                                            <div class="col-6">
                                                <div class="text-primary fw-bold fs-4">${courseStudents.length}</div>
                                                <small class="text-muted">Total Students</small>
                                            </div>
                                            <div class="col-6">
                                                <div class="text-success fw-bold fs-4">${courseFees.length}</div>
                                                <small class="text-muted">Fee Payments</small>
                                            </div>
                                        </div>
                                        <div class="progress mb-2" style="height: 10px;">
                                            <div class="progress-bar bg-success" style="width: ${(courseFees.length / Math.max(courseStudents.length, 1)) * 100}%"></div>
                                        </div>
                                        <small class="text-muted">Payment Completion Rate</small>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title text-info border-bottom pb-2">
                                            <i class="fas fa-file-alt me-2"></i>Description
                                        </h6>
                                        <div class="bg-light p-3 rounded">
                                            ${course.description || 'No description available.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-info" onclick="editCourse('${courseCode}')">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                        <button type="button" class="btn btn-success" onclick="viewCourseStudents('${courseCode}')">
                            <i class="fas fa-users me-1"></i> View Students
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalHTML);
}

// 4. Receipt View
function viewReceipt(receiptNo) {
    const fee = feesData.find(f => f.receipt_no === receiptNo);
    if (!fee) {
        showError('Receipt not found!');
        return;
    }

    const student = studentsData.find(s => s.student_id === fee.student_id);
    const modalHTML = `
        <div class="modal fade" id="viewModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-file-invoice-dollar me-2"></i>
                            Fee Receipt - ${receiptNo}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title text-success border-bottom pb-2">
                                    <i class="fas fa-receipt me-2"></i>Receipt Details
                                </h6>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Receipt No:</div>
                                    <div class="col-7 fw-bold">${receiptNo}</div>
                                </div>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Payment Date:</div>
                                    <div class="col-7">${formatDate(fee.payment_date)}</div>
                                </div>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Amount:</div>
                                    <div class="col-7 fw-bold text-success fs-5">
                                        ₹${(fee.amount || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Payment Mode:</div>
                                    <div class="col-7">
                                        <span class="badge ${getPaymentModeBadge(fee.payment_mode)}">
                                            ${fee.payment_mode || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-5 text-muted">Status:</div>
                                    <div class="col-7">
                                        <span class="badge bg-success">${fee.status || 'Paid'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title text-success border-bottom pb-2">
                                    <i class="fas fa-user-graduate me-2"></i>Student Information
                                </h6>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Student Name:</div>
                                    <div class="col-7 fw-bold">${fee.student_name}</div>
                                </div>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Student ID:</div>
                                    <div class="col-7">${fee.student_id}</div>
                                </div>
                                <div class="row mb-2">
                                    <div class="col-5 text-muted">Class:</div>
                                    <div class="col-7">
                                        <span class="badge bg-primary">${student ? student.course : 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-5 text-muted">Course Fee:</div>
                                    <div class="col-7">
                                        ₹${(student ? student.fee_amount : 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" onclick="printReceipt('${receiptNo}')">
                            <i class="fas fa-print me-1"></i> Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalHTML);
}



// ADD ये functions अगर नहीं हैं तो:
// ADD ये helper functions file के अंत में:

// Show modal function
function showModal(modalHTML) {
    // Remove existing modal if any
    const existingModal = document.getElementById('viewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewModal'));
    modal.show();
}

// Calculate experience in years
function calculateExperience(joiningDate) {
    if (!joiningDate) return 'N/A';
    
    try {
        const joinDate = new Date(joiningDate);
        const today = new Date();
        const months = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                      (today.getMonth() - joinDate.getMonth());
        
        if (months < 12) {
            return `${months} months`;
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            return remainingMonths > 0 ? 
                `${years}.${remainingMonths} years` : 
                `${years} years`;
        }
    } catch (e) {
        return 'N/A';
    }
}

// Payment mode badge
function getPaymentModeBadge(mode) {
    switch((mode || '').toLowerCase()) {
        case 'cash': return 'bg-success';
        case 'online': return 'bg-primary';
        case 'bank': return 'bg-info';
        case 'cheque': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

// View course students
function viewCourseStudents(courseCode) {
    const courseStudents = studentsData.filter(s => s.course === courseCode);
    const course = coursesData.find(c => c.course_code === courseCode);
    
    if (courseStudents.length === 0) {
        showInfo(`No students found in ${course ? course.course_name : 'this course'}`);
        return;
    }
    
    let studentsHTML = '<div class="table-responsive"><table class="table table-sm">';
    studentsHTML += '<thead><tr><th>Student ID</th><th>Name</th><th>Phone</th><th>Fee Status</th><th>Actions</th></tr></thead><tbody>';
    
    courseStudents.forEach(student => {
        studentsHTML += `
            <tr>
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>${student.phone || 'N/A'}</td>
                <td>
                    <span class="badge ${getFeeStatusClass(student.fee_status)}">
                        ${student.fee_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewStudent('${student.student_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    studentsHTML += '</tbody></table></div>';
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewModal'));
    if (modal) modal.hide();
    
    setTimeout(() => {
        const modalHTML = `
            <div class="modal fade" id="viewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-users me-2"></i>
                                ${course ? course.course_name : 'Course'} - Students List
                                <span class="badge bg-light text-dark ms-2">${courseStudents.length} students</span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${studentsHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        showModal(modalHTML);
    }, 300);
}

// Show modal function
function showModal(modalHTML) {
    // Remove existing modal if any
    const existingModal = document.getElementById('viewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewModal'));
    modal.show();
}

// Calculate experience in years
function calculateExperience(joiningDate) {
    if (!joiningDate) return 'N/A';
    
    try {
        const joinDate = new Date(joiningDate);
        const today = new Date();
        const months = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                      (today.getMonth() - joinDate.getMonth());
        
        if (months < 12) {
            return `${months} months`;
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            return remainingMonths > 0 ? 
                `${years}.${remainingMonths} years` : 
                `${years} years`;
        }
    } catch (e) {
        return 'N/A';
    }
}

// Payment mode badge
function getPaymentModeBadge(mode) {
    switch((mode || '').toLowerCase()) {
        case 'cash': return 'bg-success';
        case 'online': return 'bg-primary';
        case 'bank': return 'bg-info';
        case 'cheque': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

// View course students
function viewCourseStudents(courseCode) {
    const courseStudents = studentsData.filter(s => s.course === courseCode);
    const course = coursesData.find(c => c.course_code === courseCode);
    
    if (courseStudents.length === 0) {
        showInfo(`No students found in ${course ? course.course_name : 'this course'}`);
        return;
    }
    
    let studentsHTML = '<div class="table-responsive"><table class="table table-sm">';
    studentsHTML += '<thead><tr><th>Student ID</th><th>Name</th><th>Phone</th><th>Fee Status</th><th>Actions</th></tr></thead><tbody>';
    
    courseStudents.forEach(student => {
        studentsHTML += `
            <tr>
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>${student.phone || 'N/A'}</td>
                <td>
                    <span class="badge ${getFeeStatusClass(student.fee_status)}">
                        ${student.fee_status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewStudent('${student.student_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    studentsHTML += '</tbody></table></div>';
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewModal'));
    if (modal) modal.hide();
    
    setTimeout(() => {
        const modalHTML = `
            <div class="modal fade" id="viewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-users me-2"></i>
                                ${course ? course.course_name : 'Course'} - Students List
                                <span class="badge bg-light text-dark ms-2">${courseStudents.length} students</span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${studentsHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        showModal(modalHTML);
    }, 300);
}

// Delete functions
async function deleteStudent(studentId) {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-student/${studentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            showSuccess('Student deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student. Please try again. Error: ' + error.message);
    }
}

async function deleteTeacher(teacherId) {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-teacher/${teacherId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            showSuccess('Teacher deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Failed to delete teacher. Please try again. Error: ' + error.message);
    }
}

async function deleteCourse(courseCode) {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-course/${courseCode}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            showSuccess('Course deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course. Please try again. Error: ' + error.message);
    }
}



async function deleteAttendance(attendanceId) {
    if (!confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-attendance/${attendanceId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadDashboardData();
            showSuccess('Attendance record deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        alert('Failed to delete attendance record. Please try again. Error: ' + error.message);
    }
}



async function deleteNotification(notificationId) {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-notification/${notificationId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadNotifications();
            showSuccess('Notification deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        alert('Failed to delete notification. Please try again. Error: ' + error.message);
    }
}

// Mark all notifications as read
function markAllNotificationsRead() {
    const notifications = document.querySelectorAll('.notification-item');
    notifications.forEach(notification => {
        notification.style.opacity = '0.7';
    });
    const badge = document.getElementById('notificationCount');
    if (badge) badge.textContent = '0';
    showSuccess('All notifications marked as read!');
}

// Mobile menu functionality
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Debug function to check courses
function debugCourses() {
    console.log('=== COURSES DEBUG INFO ===');
    console.log('Courses data array:', coursesData);
    console.log('Courses data length:', coursesData.length);
    
    const attendanceSelect = document.querySelector('#attendanceForm select[name="class"]');
    console.log('Attendance dropdown:', attendanceSelect);
    console.log('Attendance dropdown options:', attendanceSelect ? attendanceSelect.options.length : 'No dropdown found');
    
    if (attendanceSelect) {
        for (let i = 0; i < attendanceSelect.options.length; i++) {
            console.log(`Option ${i}: ${attendanceSelect.options[i].text} - ${attendanceSelect.options[i].value}`);
        }
    }
    console.log('=== END DEBUG ===');
}












// View individual class attendance
async function viewClassAttendance(className) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/attendance/class/${className}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                // Show message when no attendance records found
                showInfo(`No attendance records found for ${className}`);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Check if there are any attendance records
            if (!result.attendance || result.attendance.length === 0) {
                showInfo(`No attendance records found for ${className}`);
                return;
            }
            
            // Create a modal to show class attendance
            const modalHtml = `
                <div class="modal fade" id="classAttendanceModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-calendar-check me-2"></i>
                                    Attendance for ${className}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead class="table-dark">
                                            <tr>
                                                <th>Date</th>
                                                <th>Present</th>
                                                <th>Absent</th>
                                                <th>Percentage</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${result.attendance.map(record => `
                                                <tr>
                                                    <td>${formatDate(record.date)}</td>
                                                    <td><span class="badge bg-success">${record.present_count}</span></td>
                                                    <td><span class="badge bg-danger">${record.absent_count}</span></td>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="progress flex-grow-1 me-2" style="height: 8px;">
                                                                <div class="progress-bar ${(record.percentage || 0) >= 80 ? 'bg-success' : (record.percentage || 0) >= 60 ? 'bg-warning' : 'bg-danger'}" 
                                                                     style="width: ${record.percentage}%"></div>
                                                            </div>
                                                            <span>${record.percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div class="btn-group btn-group-sm">
                                                            <button class="btn btn-info" onclick="viewAttendanceDetails(${record.id})" title="View Details">
                                                                <i class="fas fa-eye"></i>
                                                            </button>
                                                            <button class="btn btn-danger" onclick="deleteAttendance(${record.id})" title="Delete">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('classAttendanceModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('classAttendanceModal'));
            modal.show();
        } else {
            showError('Failed to load class attendance: ' + result.message);
        }
    } catch (error) {
        console.error('Error viewing class attendance:', error);
        showError('Failed to load class attendance: ' + error.message);
    }
}
// Global variables for contact messages
let contactMessagesData = [];
let currentContactMessageId = null;

// Load contact messages
async function loadContactMessages() {
    try {
        showLoading('contactMessagesContainer');
        
        const response = await fetch('https://aacem-backend.onrender.com/api/contact-messages');
        const result = await response.json();
        
        if (result.success) {
            contactMessagesData = result.messages || [];
            updateContactMessagesTable();
            updateContactMessageCounts();
            showSuccess('Contact messages loaded successfully');
        } else {
            showError('Failed to load contact messages: ' + result.message);
        }
    } catch (error) {
        console.error('Error loading contact messages:', error);
        showError('Failed to load contact messages: ' + error.message);
    } finally {
        hideLoading('contactMessagesContainer');
    }
}

// Update contact messages table
function updateContactMessagesTable() {
    const container = document.getElementById('contactMessagesContainer');
    if (!container) return;
    
    if (contactMessagesData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-envelope-open fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No Contact Messages</h5>
                <p class="text-muted">No contact messages have been received yet.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Contact Info</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    contactMessagesData.forEach(message => {
        const statusClass = getMessageStatusClass(message.status);
        const messagePreview = message.message.length > 50 ? 
            message.message.substring(0, 50) + '...' : message.message;
        const date = new Date(message.created_at).toLocaleDateString('en-IN');
        
        html += `
            <tr class="${message.status === 'new' ? 'table-warning' : ''}">
                <td><strong>${message.contact_id}</strong></td>
                <td>
                    <strong>${message.full_name}</strong>
                    ${message.status === 'new' ? '<span class="badge bg-danger ms-1">NEW</span>' : ''}
                </td>
                <td>
                    <div><i class="fas fa-envelope me-1 text-primary"></i> ${message.email}</div>
                    <div><i class="fas fa-phone me-1 text-success"></i> ${message.phone}</div>
                </td>
                <td>${message.subject}</td>
                <td title="${message.message}">${messagePreview}</td>
                <td>
                    <span class="badge ${statusClass}">${message.status.toUpperCase()}</span>
                </td>
                <td>${date}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewContactMessage('${message.contact_id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success" onclick="updateMessageStatus('${message.contact_id}', 'replied')" title="Mark as Replied">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteContactMessage('${message.contact_id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Get message status class
function getMessageStatusClass(status) {
    switch (status) {
        case 'new': return 'bg-danger';
        case 'read': return 'bg-warning';
        case 'replied': return 'bg-info';
        case 'resolved': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Update message counts
function updateContactMessageCounts() {
    const totalCount = contactMessagesData.length;
    const newCount = contactMessagesData.filter(msg => msg.status === 'new').length;
    
    // Update badge counts
    const contactMessageCount = document.getElementById('contactMessageCount');
    const newCountBadge = document.getElementById('newCount');
    
    if (contactMessageCount) {
        contactMessageCount.textContent = totalCount;
        contactMessageCount.style.display = totalCount > 0 ? 'inline' : 'none';
    }
    
    if (newCountBadge) {
        newCountBadge.textContent = newCount;
    }
}

// View contact message details
async function viewContactMessage(contactId) {
    try {
        const message = contactMessagesData.find(msg => msg.contact_id === contactId);
        if (!message) {
            showError('Message not found');
            return;
        }
        
        currentContactMessageId = contactId;
        
        const date = new Date(message.created_at).toLocaleString('en-IN');
        const statusClass = getMessageStatusClass(message.status);
        
        const detailsHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="fas fa-user me-2"></i>Contact Information</h6>
                        </div>
                        <div class="card-body">
                            <p><strong>Name:</strong> ${message.full_name}</p>
                            <p><strong>Email:</strong> ${message.email}</p>
                            <p><strong>Phone:</strong> ${message.phone}</p>
                            <p><strong>Contact ID:</strong> ${message.contact_id}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Message Details</h6>
                        </div>
                        <div class="card-body">
                            <p><strong>Subject:</strong> ${message.subject}</p>
                            <p><strong>Status:</strong> <span class="badge ${statusClass}">${message.status.toUpperCase()}</span></p>
                            <p><strong>Date:</strong> ${date}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="fas fa-envelope me-2"></i>Message Content</h6>
                </div>
                <div class="card-body">
                    <div class="bg-light p-3 rounded">
                        ${message.message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('contactMessageDetails').innerHTML = detailsHtml;
        
        // Mark as read if it's new
        if (message.status === 'new') {
            await updateMessageStatus(contactId, 'read');
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('viewContactModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing message:', error);
        showError('Failed to load message details');
    }
}

// Update message status
async function updateMessageStatus(contactId, status) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/contact-messages/${contactId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Message marked as ${status}`);
            await loadContactMessages(); // Reload messages
        } else {
            showError('Failed to update status: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to update status');
    }
}

// Delete contact message
async function deleteContactMessage(contactId) {
    if (!confirm('Are you sure you want to delete this contact message? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/contact-messages/${contactId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Message deleted successfully');
            await loadContactMessages(); // Reload messages
        } else {
            showError('Failed to delete message: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showError('Failed to delete message');
    }
}

// Delete all read messages
async function deleteAllReadMessages() {
    const readMessages = contactMessagesData.filter(msg => 
        msg.status === 'read' || msg.status === 'replied' || msg.status === 'resolved'
    );
    
    if (readMessages.length === 0) {
        showInfo('No read messages to delete');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${readMessages.length} read messages? This action cannot be undone.`)) {
        return;
    }
    
    try {
        let deletedCount = 0;
        
        for (const message of readMessages) {
            const response = await fetch(`https://aacem-backend.onrender.com/api/contact-messages/${message.contact_id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            if (result.success) {
                deletedCount++;
            }
        }
        
        showSuccess(`Successfully deleted ${deletedCount} messages`);
        await loadContactMessages(); // Reload messages
        
    } catch (error) {
        console.error('Error deleting messages:', error);
        showError('Failed to delete some messages');
    }
}

// Filter messages
function filterMessages(status) {
    let filteredMessages = contactMessagesData;
    
    if (status !== 'all') {
        filteredMessages = contactMessagesData.filter(msg => msg.status === status);
    }
    
    // Update active filter button
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update table with filtered data
    updateFilteredMessagesTable(filteredMessages);
}

// Update filtered messages table
function updateFilteredMessagesTable(messages) {
    const container = document.getElementById('contactMessagesContainer');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No Messages Found</h5>
                <p class="text-muted">No messages match the selected filter.</p>
            </div>
        `;
        return;
    }
    
    // Same table generation code as updateContactMessagesTable but with filtered data
    let html = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Contact Info</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    messages.forEach(message => {
        const statusClass = getMessageStatusClass(message.status);
        const messagePreview = message.message.length > 50 ? 
            message.message.substring(0, 50) + '...' : message.message;
        const date = new Date(message.created_at).toLocaleDateString('en-IN');
        
        html += `
            <tr class="${message.status === 'new' ? 'table-warning' : ''}">
                <td><strong>${message.contact_id}</strong></td>
                <td>
                    <strong>${message.full_name}</strong>
                    ${message.status === 'new' ? '<span class="badge bg-danger ms-1">NEW</span>' : ''}
                </td>
                <td>
                    <div><i class="fas fa-envelope me-1 text-primary"></i> ${message.email}</div>
                    <div><i class="fas fa-phone me-1 text-success"></i> ${message.phone}</div>
                </td>
                <td>${message.subject}</td>
                <td title="${message.message}">${messagePreview}</td>
                <td>
                    <span class="badge ${statusClass}">${message.status.toUpperCase()}</span>
                </td>
                <td>${date}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewContactMessage('${message.contact_id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success" onclick="updateMessageStatus('${message.contact_id}', 'replied')" title="Mark as Replied">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteContactMessage('${message.contact_id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Modal action functions
function markAsReplied() {
    if (currentContactMessageId) {
        updateMessageStatus(currentContactMessageId, 'replied');
        const modal = bootstrap.Modal.getInstance(document.getElementById('viewContactModal'));
        modal.hide();
    }
}

function deleteCurrentMessage() {
    if (currentContactMessageId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('viewContactModal'));
        modal.hide();
        
        setTimeout(() => {
            deleteContactMessage(currentContactMessageId);
        }, 300);
    }
}


// ==================== PDF MANAGEMENT ====================
let pdfData = [];
let currentPdfFilter = '';

async function loadPdfData() {
    try {
        const url = currentPdfFilter 
            ? `https://aacem-backend.onrender.com/api/course-pdfs?course=${currentPdfFilter}`
            : 'https://aacem-backend.onrender.com/api/course-pdfs';
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            pdfData = result.pdfs || [];
            updatePdfDisplay();
            updatePdfStats();
        }
    } catch (error) {
        console.error('Error loading PDFs:', error);
    }
}

function updatePdfDisplay() {
    const container = document.getElementById('pdfListContainer');
    const countBadge = document.getElementById('pdfListCount');
    
    if (!container) return;
    
    countBadge.textContent = pdfData.length;
    
    if (pdfData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-file-pdf fa-4x text-muted mb-3"></i>
                <p class="text-muted">No PDFs uploaded yet</p>
            </div>
        `;
        return;
    }
    
    const pdfsByCourse = {};
    pdfData.forEach(pdf => {
        const course = pdf.course_code || 'Unknown';
        if (!pdfsByCourse[course]) {
            pdfsByCourse[course] = {
                course_name: pdf.course_name || 'Unknown',
                pdfs: []
            };
        }
        pdfsByCourse[course].pdfs.push(pdf);
    });
    
    let html = '';
    Object.entries(pdfsByCourse).forEach(([courseCode, data]) => {
        html += `
            <div class="mb-4">
                <h6 class="mb-3">
                    <i class="fas fa-book me-2 text-primary"></i>
                    ${data.course_name}
                    <span class="badge bg-primary ms-2">${data.pdfs.length}</span>
                </h6>
                <div class="row">
        `;
        
        data.pdfs.forEach(pdf => {
            const uploadDate = new Date(pdf.created_at).toLocaleDateString();
            const fileSize = formatFileSize(pdf.file_size);
            
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100 border-danger">
                        <div class="card-body">
                            <div class="d-flex align-items-start mb-3">
                                <i class="fas fa-file-pdf fa-2x text-danger me-3"></i>
                                <div class="flex-grow-1">
                                    <h6 class="card-title mb-1">${pdf.pdf_title}</h6>
                                    <small class="text-muted d-block">
                                        <i class="fas fa-calendar me-1"></i>${uploadDate}
                                    </small>
                                    <small class="text-muted d-block">
                                        <i class="fas fa-database me-1"></i>${fileSize}
                                    </small>
                                </div>
                            </div>
                            ${pdf.description ? `<p class="card-text small text-muted mb-3">${pdf.description.substring(0, 80)}...</p>` : ''}
                            <div class="d-grid gap-2">
                                <button class="btn btn-success btn-sm" onclick="viewPdf('${pdf.pdf_id}')">
                                    <i class="fas fa-eye me-1"></i> View
                                </button>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info" onclick="downloadPdf('${pdf.pdf_id}')">
                                        <i class="fas fa-download"></i> Download
                                    </button>
                                    <button class="btn btn-warning" onclick="editPdf('${pdf.pdf_id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-danger" onclick="deletePdf('${pdf.pdf_id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

function updatePdfStats() {
    const totalPdfs = pdfData.length;
    const uniqueCourses = new Set(pdfData.map(pdf => pdf.course_code)).size;
    const totalBytes = pdfData.reduce((sum, pdf) => sum + (pdf.file_size || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentUploads = pdfData.filter(pdf => new Date(pdf.created_at) > weekAgo).length;
    
    document.getElementById('totalPdfsCount').textContent = totalPdfs;
    document.getElementById('coursesWithPdfsCount').textContent = uniqueCourses;
    document.getElementById('totalStorageSize').textContent = totalMB + ' MB';
    document.getElementById('recentUploadsCount').textContent = recentUploads;
}

function populatePdfCourseDropdowns() {
    const uploadSelect = document.getElementById('uploadCourseSelect');
    const filterSelect = document.getElementById('pdfCourseFilter');
    
    if (!uploadSelect || !filterSelect) return;
    
    uploadSelect.innerHTML = '<option value="">Choose a course...</option>';
    filterSelect.innerHTML = '<option value="">All Courses</option>';
    
    coursesData.filter(c => c.is_active).forEach(course => {
        const option1 = document.createElement('option');
        option1.value = course.course_code;
        option1.textContent = `${course.course_name} (${course.course_code})`;
        uploadSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = course.course_code;
        option2.textContent = `${course.course_name} (${course.course_code})`;
        filterSelect.appendChild(option2);
    });
}

async function uploadCoursePdf() {
    const form = document.getElementById('uploadPdfForm');
    const formData = new FormData(form);
    
    const courseCode = formData.get('course_code');
    const pdfTitle = formData.get('pdf_title');
    const pdfFile = formData.get('pdf_file');
    
    if (!courseCode || !pdfTitle || !pdfFile || pdfFile.size === 0) {
        showError('Please fill all required fields');
        return;
    }
    
    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
        showError('Only PDF files are allowed');
        return;
    }
    
    if (pdfFile.size > 10 * 1024 * 1024) {
        showError('File must be less than 10MB');
        return;
    }
    
    try {
        const uploadBtn = document.querySelector('#uploadPdfModal .btn-primary');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading...';
        uploadBtn.disabled = true;
        
        const response = await fetch('https://aacem-backend.onrender.com/api/upload-course-pdf', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
        
        if (result.success) {
            showSuccess('PDF uploaded successfully!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadPdfModal'));
            modal.hide();
            form.reset();
            document.getElementById('filePreview').style.display = 'none';
            await loadPdfData();
        } else {
            showError('Upload failed: ' + result.message);
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
        showError('Failed to upload PDF');
    }
}

function viewPdf(pdfId) {
    window.open(`https://aacem-backend.onrender.com/api/view-course-pdf/${pdfId}`, '_blank');
}

function downloadPdf(pdfId) {
    window.open(`https://aacem-backend.onrender.com/api/view-course-pdf/${pdfId}?download=true`, '_blank');
}

async function editPdf(pdfId) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/course-pdf/${pdfId}`);
        const result = await response.json();
        
        if (result.success) {
            const pdf = result.pdf;
            document.getElementById('editPdfId').value = pdf.pdf_id;
            document.getElementById('editPdfTitle').value = pdf.pdf_title;
            document.getElementById('editPdfDescription').value = pdf.description || '';
            
            const modal = new bootstrap.Modal(document.getElementById('editPdfModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

async function saveEditedPdf() {
    const pdfId = document.getElementById('editPdfId').value;
    const pdfTitle = document.getElementById('editPdfTitle').value.trim();
    const description = document.getElementById('editPdfDescription').value.trim();
    
    if (!pdfTitle) {
        showError('PDF title is required');
        return;
    }
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/update-course-pdf/${pdfId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf_title: pdfTitle, description: description })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('PDF updated successfully!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPdfModal'));
            modal.hide();
            await loadPdfData();
        }
    } catch (error) {
        console.error('Error updating PDF:', error);
    }
}

async function deletePdf(pdfId) {
    if (!confirm('Delete this PDF?')) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/delete-course-pdf/${pdfId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('PDF deleted successfully!');
            await loadPdfData();
        }
    } catch (error) {
        console.error('Error deleting PDF:', error);
    }
}

function filterPdfsByCourse(courseCode = null) {
    const filterSelect = document.getElementById('pdfCourseFilter');
    currentPdfFilter = courseCode || filterSelect.value;
    loadPdfData();
}

function refreshPdfList() {
    currentPdfFilter = '';
    document.getElementById('pdfCourseFilter').value = '';
    loadPdfData();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

document.addEventListener('DOMContentLoaded', function() {
    const pdfsTab = document.getElementById('pdfs-tab');
    if (pdfsTab) {
        pdfsTab.addEventListener('shown.bs.tab', function() {
            populatePdfCourseDropdowns();
            loadPdfData();
        });
    }
    
    const uploadModal = document.getElementById('uploadPdfModal');
    if (uploadModal) {
        uploadModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('uploadPdfForm').reset();
            document.getElementById('filePreview').style.display = 'none';
        });
    }
    
    const pdfFileInput = document.getElementById('pdfFileInput');
    if (pdfFileInput) {
        pdfFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedFileName').textContent = file.name;
                document.getElementById('selectedFileSize').textContent = formatFileSize(file.size);
                document.getElementById('filePreview').style.display = 'block';
            }
        });
    }
});

// ==================== SYLLABUS MANAGEMENT ====================

let allSyllabus = [];
let filteredSyllabus = [];

// Initialize when syllabus tab is clicked
document.getElementById('syllabus-tab')?.addEventListener('shown.bs.tab', function() {
    initSyllabusTab();
});

function initSyllabusTab() {
    populateCourseDropdowns();
    loadSyllabusData();
}

// Populate course dropdowns
function populateCourseDropdowns() {
    const filterSelect = document.getElementById('syllabusCourseFilter');
    const modalSelect = document.getElementById('syllabusCourse');
    
    if (!filterSelect || !modalSelect) return;
    
    filterSelect.innerHTML = '<option value="">All Courses</option>';
    modalSelect.innerHTML = '<option value="">Select course...</option>';
    
    coursesData.filter(c => c.is_active).forEach(course => {
        const option1 = document.createElement('option');
        option1.value = course.course_code;
        option1.textContent = `${course.course_name} (${course.course_code})`;
        filterSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = course.course_code;
        option2.textContent = `${course.course_name} (${course.course_code})`;
        modalSelect.appendChild(option2);
    });
}

// Load syllabus data
async function loadSyllabusData() {
    try {
        showLoading('Loading syllabus...');
        
        const response = await fetch('https://aacem-backend.onrender.com/api/syllabus/all');
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            allSyllabus = result.syllabus || [];
            updateStatistics(allSyllabus);
            filterSyllabus();
        } else {
            showError('Failed to load syllabus');
        }
    } catch (error) {
        hideLoading();
        showError('Network error');
    }
}

// Update statistics
function updateStatistics(syllabusList) {
    const totalSyllabus = syllabusList.length;
    const uniqueCourses = new Set(syllabusList.map(s => s.course_code)).size;
    
    let totalSubjects = 0;
    let totalHours = 0;
    
    syllabusList.forEach(s => {
        totalSubjects += s.subjects_count || 0;
        totalHours += s.total_duration || 0;
    });
    
    document.getElementById('totalSyllabus').textContent = totalSyllabus;
    document.getElementById('coursesWithSyllabus').textContent = uniqueCourses;
    document.getElementById('totalSubjects').textContent = totalSubjects;
    document.getElementById('totalHours').textContent = totalHours;
}

// Filter syllabus
function filterSyllabus() {
    const courseFilter = document.getElementById('syllabusCourseFilter').value;
    const searchText = document.getElementById('searchSyllabus').value.toLowerCase();
    const showActiveOnly = document.getElementById('showActiveOnly').checked;
    
    filteredSyllabus = allSyllabus.filter(syllabus => {
        if (courseFilter && syllabus.course_code !== courseFilter) return false;
        if (showActiveOnly && !syllabus.is_active) return false;
        if (searchText) {
            const searchIn = (
                syllabus.syllabus_title + ' ' + 
                syllabus.description + ' ' + 
                syllabus.course_name
            ).toLowerCase();
            if (!searchIn.includes(searchText)) return false;
        }
        return true;
    });
    
    renderSyllabusTable();
}

// Search syllabus
function searchSyllabus() {
    filterSyllabus();
}

// Render syllabus table
function renderSyllabusTable() {
    const tbody = document.getElementById('syllabusTableBody');
    const countBadge = document.getElementById('syllabusCount');
    
    if (!tbody) return;
    
    countBadge.textContent = filteredSyllabus.length;
    
    if (filteredSyllabus.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No syllabus found.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredSyllabus.forEach((syllabus, index) => {
        const statusClass = syllabus.is_active ? 'success' : 'danger';
        const statusText = syllabus.is_active ? 'Active' : 'Inactive';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${syllabus.course_code}</strong><br>
                    <small>${syllabus.course_name}</small>
                </td>
                <td>
                    <strong>${syllabus.syllabus_title}</strong><br>
                    <small>ID: ${syllabus.syllabus_id}</small>
                </td>
                <td>${syllabus.description ? syllabus.description.substring(0, 50) + '...' : '-'}</td>
                <td><span class="badge bg-info">${syllabus.total_duration} hrs</span></td>
                <td><span class="badge bg-secondary">${syllabus.subjects_count || 0}</span></td>
                <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewSyllabus('${syllabus.syllabus_id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="editSyllabus('${syllabus.syllabus_id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-${syllabus.is_active ? 'secondary' : 'success'}" 
                                onclick="toggleStatus('${syllabus.syllabus_id}')">
                            <i class="fas fa-power-off"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteSyllabus('${syllabus.syllabus_id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Show add syllabus modal
function showAddSyllabusModal() {
    console.log("showAddSyllabusModal called");
    
    // Check if modal exists
    const modalElement = document.getElementById('syllabusModal');
    if (!modalElement) {
        console.error("❌ syllabusModal element not found in HTML!");
        showError('Syllabus modal not found. Please refresh page.');
        return;
    }
    
    // Reset form
    resetSyllabusForm();
    
    // Set modal title and header
    const modalHeader = document.getElementById('syllabusModalHeader');
    const modalTitle = document.querySelector('#syllabusModal .modal-title');
    
    if (modalHeader) {
        modalHeader.className = 'modal-header bg-success text-white';
    }
    
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Add New Syllabus';
    }
    
    document.getElementById('editSyllabusId').value = '';
    
    // Show modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Reset syllabus form
function resetSyllabusForm() {
    const form = document.getElementById('syllabusForm');
    if (form) {
        form.reset();
    }
    
    document.getElementById('syllabusStatus').value = 'active';
    
    // Reset subjects table
    const tbody = document.getElementById('subjectsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr class="subject-row">
                <td>1</td>
                <td>
                    <input type="text" class="form-control form-control-sm subject-name" 
                           placeholder="Enter subject name" required>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm subject-duration" 
                           min="1" max="100" value="4">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm subject-topics" 
                           placeholder="e.g., Basics, Theory, Practical">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeSubjectRow(this)" disabled>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
}

// Reset form
function resetSyllabusForm() {
    document.getElementById('syllabusForm').reset();
    document.getElementById('syllabusStatus').value = 'active';
    
    // Reset subjects table
    const tbody = document.getElementById('subjectsTableBody');
    tbody.innerHTML = `
        <tr class="subject-row">
            <td>1</td>
            <td>
                <input type="text" class="form-control form-control-sm subject-name" 
                       placeholder="Enter subject name" required>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm subject-duration" 
                       min="1" max="100" value="4">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm subject-topics" 
                       placeholder="e.g., Basics, Theory, Practical">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeSubjectRow(this)" disabled>
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

// Add subject row
function addSubjectRow() {
    const tbody = document.getElementById('subjectsTableBody');
    const rowCount = tbody.children.length + 1;
    
    const newRow = document.createElement('tr');
    newRow.className = 'subject-row';
    newRow.innerHTML = `
        <td>${rowCount}</td>
        <td>
            <input type="text" class="form-control form-control-sm subject-name" 
                   placeholder="Enter subject name" required>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm subject-duration" 
                   min="1" max="100" value="4">
        </td>
        <td>
            <input type="text" class="form-control form-control-sm subject-topics" 
                   placeholder="e.g., Basics, Theory, Practical">
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeSubjectRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    
    // Enable delete on first row if multiple rows
    if (tbody.children.length > 1) {
        const firstBtn = tbody.children[0].querySelector('button');
        if (firstBtn) firstBtn.disabled = false;
    }
}

// Remove subject row
function removeSubjectRow(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('subjectsTableBody');
    
    if (tbody.children.length > 1) {
        row.remove();
        
        // Update row numbers
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });
        
        // Disable delete on first row if only one left
        if (tbody.children.length === 1) {
            const firstBtn = tbody.children[0].querySelector('button');
            if (firstBtn) firstBtn.disabled = true;
        }
    }
}

// View syllabus
async function viewSyllabus(syllabusId) {
    try {
        showLoading('Loading...');
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/${syllabusId}`);
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            const syllabus = result.syllabus;
            let content = `
                <div class="alert alert-info">
                    <h4>${syllabus.syllabus_title}</h4>
                    <p><strong>Course:</strong> ${syllabus.course_name} (${syllabus.course_code})</p>
                    <p><strong>Duration:</strong> ${syllabus.total_duration} hours</p>
                    <p><strong>Status:</strong> <span class="badge bg-${syllabus.is_active ? 'success' : 'danger'}">${syllabus.is_active ? 'Active' : 'Inactive'}</span></p>
                    ${syllabus.description ? `<p>${syllabus.description}</p>` : ''}
                </div>
                <h5>Subjects:</h5>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Subject</th>
                            <th>Duration</th>
                            <th>Topics</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (syllabus.subjects && syllabus.subjects.length > 0) {
                syllabus.subjects.forEach((subject, index) => {
                    content += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${subject.subject_name}</td>
                            <td>${subject.duration_hours} hrs</td>
                            <td>${subject.topics || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                content += `<tr><td colspan="4" class="text-center">No subjects</td></tr>`;
            }
            
            content += `</tbody></table>`;
            
            // Create a simple modal to show
            const modalHtml = `
                <div class="modal fade" id="viewModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">Syllabus Details</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            let modalDiv = document.getElementById('viewModalTemp');
            if (modalDiv) modalDiv.remove();
            
            modalDiv = document.createElement('div');
            modalDiv.id = 'viewModalTemp';
            modalDiv.innerHTML = modalHtml;
            document.body.appendChild(modalDiv);
            
            const modal = new bootstrap.Modal(document.getElementById('viewModal'));
            modal.show();
        }
    } catch (error) {
        hideLoading();
        showError('Error loading details');
    }
}

// Edit syllabus
async function editSyllabus(syllabusId) {
    try {
        showLoading('Loading...');
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/${syllabusId}`);
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            const syllabus = result.syllabus;
            
            // Fill form
            document.getElementById('editSyllabusId').value = syllabus.syllabus_id;
            document.getElementById('syllabusCourse').value = syllabus.course_code;
            document.getElementById('syllabusTitle').value = syllabus.syllabus_title;
            document.getElementById('syllabusDescription').value = syllabus.description || '';
            document.getElementById('syllabusDuration').value = syllabus.total_duration;
            document.getElementById('syllabusStatus').value = syllabus.is_active ? 'active' : 'inactive';
            
            // Update modal
            document.getElementById('syllabusModalHeader').className = 'modal-header bg-warning text-dark';
            document.querySelector('#syllabusModal .modal-title').innerHTML = `
                <i class="fas fa-edit me-2"></i>Edit Syllabus
            `;
            
            // Fill subjects
            const tbody = document.getElementById('subjectsTableBody');
            tbody.innerHTML = '';
            
            if (syllabus.subjects && syllabus.subjects.length > 0) {
                syllabus.subjects.forEach((subject, index) => {
                    const row = document.createElement('tr');
                    row.className = 'subject-row';
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>
                            <input type="text" class="form-control form-control-sm subject-name" 
                                   value="${subject.subject_name}" required>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm subject-duration" 
                                   value="${subject.duration_hours}" min="1" max="100">
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm subject-topics" 
                                   value="${subject.topics || ''}">
                        </td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-danger" onclick="removeSubjectRow(this)"
                                    ${syllabus.subjects.length === 1 ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                addSubjectRow();
            }
            
            const modal = new bootstrap.Modal(document.getElementById('syllabusModal'));
            modal.show();
        }
    } catch (error) {
        hideLoading();
        showError('Error loading for edit');
    }
}

// Save syllabus
async function saveSyllabus() {
    const syllabusId = document.getElementById('editSyllabusId').value;
    const courseCode = document.getElementById('syllabusCourse').value;
    const syllabusTitle = document.getElementById('syllabusTitle').value.trim();
    const description = document.getElementById('syllabusDescription').value.trim();
    const duration = parseInt(document.getElementById('syllabusDuration').value) || 40;
    const status = document.getElementById('syllabusStatus').value;
    
    if (!courseCode || !syllabusTitle) {
        showError('Please fill required fields');
        return;
    }
    
    // Collect subjects
    const subjects = [];
    document.querySelectorAll('.subject-row').forEach(row => {
        const name = row.querySelector('.subject-name').value.trim();
        if (name) {
            subjects.push({
                name: name,
                duration: parseInt(row.querySelector('.subject-duration').value) || 4,
                topics: row.querySelector('.subject-topics').value.trim()
            });
        }
    });
    
    if (subjects.length === 0) {
        if (!confirm('No subjects added. Save without subjects?')) return;
    }
    
    const data = {
        syllabus_id: syllabusId || null,
        course_code: courseCode,
        syllabus_title: syllabusTitle,
        description: description,
        total_duration: duration,
        status: status,
        created_by: 'admin',
        subjects: subjects
    };
    
    try {
        const btn = document.querySelector('#syllabusModal .btn-success');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
        btn.disabled = true;
        
        const response = await fetch('https://aacem-backend.onrender.com/api/syllabus/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        if (result.success) {
            showSuccess('Syllabus saved!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('syllabusModal'));
            modal.hide();
            await loadSyllabusData();
        } else {
            showError('Save failed: ' + result.message);
        }
    } catch (error) {
        showError('Network error');
    }
}

// Toggle status
async function toggleStatus(syllabusId) {
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/toggle-status/${syllabusId}`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Status updated');
            await loadSyllabusData();
        }
    } catch (error) {
        showError('Error updating status');
    }
}

// Delete syllabus
async function deleteSyllabus(syllabusId) {
    if (!confirm('Delete this syllabus?')) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/delete/${syllabusId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Syllabus deleted');
            await loadSyllabusData();
        }
    } catch (error) {
        showError('Error deleting');
    }
}

// Export
function exportSyllabus() {
    let csv = 'Course,Syllabus Title,Description,Duration,Subjects,Status\n';
    
    filteredSyllabus.forEach(s => {
        csv += `"${s.course_name}","${s.syllabus_title}","${s.description || ''}",${s.total_duration},${s.subjects_count || 0},"${s.is_active ? 'Active' : 'Inactive'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'syllabus.csv';
    a.click();
}

// Refresh
function refreshSyllabus() {
    loadSyllabusData();
}

// Helper functions
function showLoading(msg) {
    // You can implement a loading spinner
    console.log('Loading:', msg);
}

function hideLoading() {
    // Hide loading
}

console.log('Syllabus Management loaded!');

console.log('PDF Management loaded!');


// Initialize contact messages when tab is shown
document.addEventListener('DOMContentLoaded', function() {
    const contactTab = document.getElementById('contact-tab');
    if (contactTab) {
        contactTab.addEventListener('shown.bs.tab', function() {
            loadContactMessages();
        });
    }
});
// Add this helper function for info messages
function showInfo(message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.className = 'sync-status bg-info text-white';
        syncStatus.innerHTML = `<i class="fas fa-info-circle me-2"></i> ${message}`;
        syncStatus.style.display = 'block';
        
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 3000);
    }
}

console.log('Dashboard JavaScript loaded successfully');












