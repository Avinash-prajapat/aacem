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
            window.location.href = "admin-login.html";
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

const API_URL = 'https://aacem-backend.onrender.com';

// Global variables
let sectionsData = [];

let attendanceRecordsData = [];
let sectionPdfsData = [];
let sectionMarksData = [];
let announcementsData = [];
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
// SECTION-WISE MARKS MANAGEMENT - COMPLETE CODE
// =====================================================

// ==================== GLOBAL VARIABLES ====================
let allMarks = [];
let filteredMarks = [];
let currentMarksEditId = null;
let currentViewMarksId = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Marks Modal Events
    const marksModal = document.getElementById('marksModal');
    if (marksModal) {
        marksModal.addEventListener('show.bs.modal', function() {
            if (!currentMarksEditId) {
                document.getElementById('marksForm').reset();
                document.getElementById('editMarksId').value = '';
                
                // Set today's date
                const dateInput = document.getElementById('marksExamDate');
                if (dateInput) {
                    const today = new Date().toISOString().split('T')[0];
                    dateInput.value = today;
                }
                
                loadCoursesForMarks();
                
                const sectionSelect = document.getElementById('marksSection');
                sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
                sectionSelect.disabled = true;
                
                const studentsContainer = document.getElementById('marksStudentsList');
                studentsContainer.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-arrow-up fa-2x mb-2"></i>
                        <p class="mb-0">Select course and section to load students</p>
                    </div>
                `;
            }
        });
        
        marksModal.addEventListener('hidden.bs.modal', function() {
            currentMarksEditId = null;
        });
    }
    
    // Course change for marks filter
    const courseFilter = document.getElementById('marksCourseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', function() {
            const courseCode = this.value;
            const sectionFilter = document.getElementById('marksSectionFilter');
            
            if (courseCode) {
                loadSectionsForMarksFilter(courseCode);
            } else {
                sectionFilter.innerHTML = '<option value="">All Sections</option>';
                sectionFilter.disabled = true;
                filterSectionMarks();
            }
        });
    }
    
    // Load marks when tab is shown
    const marksTab = document.getElementById('marks-tab');
    if (marksTab) {
        marksTab.addEventListener('shown.bs.tab', function() {
            loadSectionMarks();
        });
    }
});

// ==================== LOAD COURSES FOR MARKS ====================
async function loadCoursesForMarks() {
    try {
        const select = document.getElementById('marksCourse');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Course</option>';
        
        if (typeof coursesData !== 'undefined' && coursesData.length > 0) {
            const activeCourses = coursesData.filter(c => c.is_active);
            activeCourses.forEach(course => {
                select.innerHTML += `<option value="${course.course_code}">
                    ${course.course_code} - ${course.course_name}
                </option>`;
            });
        } else {
            const response = await fetch(`${API_URL}/api/courses/all`);
            const data = await response.json();
            
            if (data.success && data.courses) {
                data.courses.filter(c => c.is_active).forEach(course => {
                    select.innerHTML += `<option value="${course.course_code}">
                        ${course.course_code} - ${course.course_name}
                    </option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ==================== LOAD SECTIONS FOR MARKS ====================
async function loadSectionsForMarks() {
    const courseSelect = document.getElementById('marksCourse');
    const sectionSelect = document.getElementById('marksSection');
    
    const courseCode = courseSelect.value;
    
    if (!courseCode) {
        sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        sectionSelect.disabled = true;
        return;
    }
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            const activeSections = data.sections.filter(s => s.is_active);
            
            if (activeSections.length === 0) {
                sectionSelect.innerHTML = '<option value="">No sections found</option>';
                sectionSelect.disabled = true;
                return;
            }
            
            let options = '<option value="">-- Select Section --</option>';
            activeSections.forEach(section => {
                options += `<option value="${section.section_id}">
                    ${section.section_name} (${section.current_students || 0}/${section.max_students || 60} students)
                </option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
        } else {
            sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
            sectionSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
        sectionSelect.disabled = true;
    }
}

// ==================== LOAD STUDENTS FOR MARKS ====================
async function loadStudentsForMarks() {
    const sectionSelect = document.getElementById('marksSection');
    const studentsContainer = document.getElementById('marksStudentsList');
    const editId = document.getElementById('editMarksId');
    
    const sectionId = sectionSelect.value;
    
    if (!sectionId) {
        studentsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-hand-pointer fa-2x mb-2"></i>
                <p class="mb-0">Select section to load students</p>
            </div>
        `;
        return;
    }
    
    studentsContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary mb-2"></div>
            <p class="text-muted">Loading students...</p>
        </div>
    `;
    
    try {
        const studentsResponse = await fetch(`${API_URL}/api/section-attendance/students/${sectionId}`);
        const studentsData = await studentsResponse.json();
        
        if (!studentsData.success || !studentsData.students || studentsData.students.length === 0) {
            studentsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No students found in this section
                </div>
            `;
            return;
        }
        
        const students = studentsData.students;
        const examType = document.getElementById('marksExam').value;
        const subject = document.getElementById('marksSubject').value;
        const totalMarks = document.getElementById('marksTotalMarks').value;
        
        let html = `
            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Marks Obtained</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        students.forEach((student, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm student-marks" 
                               data-student-id="${student.student_id}"
                               data-student-name="${student.name}"
                               min="0" max="${totalMarks}" step="0.01"
                               placeholder="Enter marks" required>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <div class="alert alert-info mt-2">
                <i class="fas fa-info-circle me-2"></i>
                Enter marks for each student (0 to ${totalMarks})
            </div>
        `;
        
        studentsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error loading students: ${error.message}
            </div>
        `;
    }
}

// ==================== LOAD SECTIONS FOR MARKS FILTER ====================
async function loadSectionsForMarksFilter(courseCode) {
    const sectionSelect = document.getElementById('marksSectionFilter');
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            let options = '<option value="">All Sections</option>';
            data.sections.forEach(section => {
                options += `<option value="${section.section_id}">${section.section_name}</option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
        } else {
            sectionSelect.innerHTML = '<option value="">All Sections</option>';
            sectionSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error loading sections for filter:', error);
        sectionSelect.innerHTML = '<option value="">All Sections</option>';
        sectionSelect.disabled = true;
    }
}

// ==================== SAVE SECTION MARKS ====================
async function saveSectionMarks() {
    const examType = document.getElementById('marksExam').value;
    const examDate = document.getElementById('marksExamDate').value;
    const courseCode = document.getElementById('marksCourse').value;
    const sectionId = document.getElementById('marksSection').value;
    const subject = document.getElementById('marksSubject').value.trim();
    const totalMarks = document.getElementById('marksTotalMarks').value;
    const editId = document.getElementById('editMarksId').value;
    
    if (!examType || !examDate || !courseCode || !sectionId || !subject) {
        showError('Please fill all required fields');
        return;
    }
    
    // Collect marks data
    const marksInputs = document.querySelectorAll('.student-marks');
    if (marksInputs.length === 0) {
        showError('No students found');
        return;
    }
    
    const marksData = [];
    let hasError = false;
    
    marksInputs.forEach(input => {
        const marks = parseFloat(input.value);
        const studentId = input.dataset.studentId;
        const studentName = input.dataset.studentName;
        
        if (isNaN(marks) || marks < 0 || marks > totalMarks) {
            showError(`Please enter valid marks for ${studentName} (0-${totalMarks})`);
            hasError = true;
            return;
        }
        
        marksData.push({
            student_id: studentId,
            student_name: studentName,
            marks_obtained: marks
        });
    });
    
    if (hasError) return;
    
    try {
        const saveBtn = document.querySelector('#marksModal .btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
        saveBtn.disabled = true;
        
        let url = `${API_URL}/api/section-marks/save-bulk`;
        let method = 'POST';
        let successMessage = 'Marks saved successfully!';
        
        const payload = {
            exam_type: examType,
            exam_date: examDate,
            course_code: courseCode,
            section_id: sectionId,
            subject: subject,
            total_marks: parseInt(totalMarks),
            marks_data: marksData
        };
        
        // If editing, we need to handle update differently
        // For now, we'll just create new records (backend should handle duplicates)
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        if (result.success) {
            showSuccess(successMessage);
            const modal = bootstrap.Modal.getInstance(document.getElementById('marksModal'));
            modal.hide();
            currentMarksEditId = null;
            await loadSectionMarks();
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving marks:', error);
        showError('Failed to save marks: ' + error.message);
        
        const saveBtn = document.querySelector('#marksModal .btn-primary');
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save Marks';
        saveBtn.disabled = false;
    }
}

// ==================== LOAD SECTION MARKS ====================
async function loadSectionMarks() {
    try {
        const tbody = document.getElementById('marksTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <div class="spinner-border text-primary mb-3"></div>
                    <p class="text-muted">Loading marks...</p>
                </td>
            </tr>
        `;
        
        const response = await fetch(`${API_URL}/api/section-marks/all`);
        const data = await response.json();
        
        if (data.success) {
            allMarks = data.marks || [];
            filteredMarks = allMarks;
            updateMarksStats();
            displaySectionMarks(filteredMarks);
            populateMarksFilters();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4">
                        <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                        <p class="text-muted">Error loading marks</p>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading marks:', error);
        const tbody = document.getElementById('marksTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                    <p class="text-muted">Error loading marks: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// ==================== DISPLAY SECTION MARKS ====================
function displaySectionMarks(marks) {
    const tbody = document.getElementById('marksTableBody');
    const countBadge = document.getElementById('marksCount');
    
    if (!tbody) return;
    
    countBadge.textContent = marks.length;
    
    if (marks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No marks records found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    marks.forEach((mark, index) => {
        const percentage = mark.percentage || 0;
        const grade = mark.grade || calculateGrade(percentage);
        const gradeClass = getGradeClass(grade);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${mark.exam_type || 'N/A'}</td>
                <td>
                    <strong>${mark.student_name || 'Unknown'}</strong>
                    <br>
                    <small class="text-muted">${mark.student_id || ''}</small>
                </td>
                <td>${mark.course || 'N/A'}</td>
                <td>${mark.section_name || mark.section_id || 'N/A'}</td>
                <td>${mark.subject || 'N/A'}</td>
                <td>
                    <strong>${mark.marks_obtained || 0}</strong> / ${mark.total_marks || 100}
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar ${getPercentageClass(percentage)}" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <strong>${percentage}%</strong>
                    </div>
                </td>
                <td>
                    <span class="badge ${gradeClass}">${grade}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewSectionMarks(${mark.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="editSectionMarks(${mark.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteSectionMarks(${mark.id}, '${mark.student_name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ==================== UPDATE MARKS STATS ====================
function updateMarksStats() {
    const totalRecords = allMarks.length;
    const uniqueCourses = new Set(allMarks.map(m => m.course)).size;
    const uniqueSections = new Set(allMarks.map(m => m.section_id)).size;
    
    const avgPercentage = allMarks.reduce((sum, m) => sum + (m.percentage || 0), 0) / (totalRecords || 1);
    
    document.getElementById('totalMarksRecords').textContent = totalRecords;
    document.getElementById('marksCoursesCount').textContent = uniqueCourses;
    document.getElementById('marksSectionsCount').textContent = uniqueSections;
    document.getElementById('avgMarksPercentage').textContent = avgPercentage.toFixed(1) + '%';
}

// ==================== POPULATE MARKS FILTERS ====================
function populateMarksFilters() {
    const courseFilter = document.getElementById('marksCourseFilter');
    const examFilter = document.getElementById('marksExamFilter');
    
    if (courseFilter) {
        const courses = [...new Set(allMarks.map(m => m.course))];
        let options = '<option value="">All Courses</option>';
        courses.forEach(course => {
            if (course) {
                options += `<option value="${course}">${course}</option>`;
            }
        });
        courseFilter.innerHTML = options;
    }
    
    if (examFilter) {
        const exams = [...new Set(allMarks.map(m => m.exam_type))];
        let options = '<option value="">All Exams</option>';
        exams.forEach(exam => {
            if (exam) {
                options += `<option value="${exam}">${exam}</option>`;
            }
        });
        examFilter.innerHTML = options;
    }
}

// ==================== FILTER SECTION MARKS ====================
function filterSectionMarks() {
    const courseFilter = document.getElementById('marksCourseFilter').value;
    const sectionFilter = document.getElementById('marksSectionFilter').value;
    const examFilter = document.getElementById('marksExamFilter').value;
    
    filteredMarks = allMarks.filter(mark => {
        if (courseFilter && mark.course !== courseFilter) return false;
        if (sectionFilter && mark.section_id !== sectionFilter) return false;
        if (examFilter && mark.exam_type !== examFilter) return false;
        return true;
    });
    
    displaySectionMarks(filteredMarks);
}

// ==================== SEARCH SECTION MARKS ====================
function searchSectionMarks() {
    const searchTerm = document.getElementById('marksSearch').value.toLowerCase();
    
    if (!searchTerm) {
        displaySectionMarks(filteredMarks);
        return;
    }
    
    const searched = filteredMarks.filter(mark => 
        (mark.student_name && mark.student_name.toLowerCase().includes(searchTerm)) ||
        (mark.student_id && mark.student_id.toLowerCase().includes(searchTerm)) ||
        (mark.subject && mark.subject.toLowerCase().includes(searchTerm))
    );
    
    displaySectionMarks(searched);
}

// ==================== VIEW SECTION MARKS ====================
async function viewSectionMarks(marksId) {
    try {
        const mark = allMarks.find(m => m.id === marksId);
        if (!mark) {
            showError('Marks record not found');
            return;
        }
        
        currentViewMarksId = marksId;
        
        const percentage = mark.percentage || ((mark.marks_obtained / mark.total_marks) * 100);
        const grade = mark.grade || calculateGrade(percentage);
        const gradeClass = getGradeClass(grade);
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title text-primary border-bottom pb-2">
                                <i class="fas fa-user-graduate me-2"></i>Student Information
                            </h6>
                            <p><strong>Name:</strong> ${mark.student_name}</p>
                            <p><strong>ID:</strong> ${mark.student_id}</p>
                            <p><strong>Course:</strong> ${mark.course}</p>
                            <p><strong>Section:</strong> ${mark.section_name || mark.section_id}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title text-success border-bottom pb-2">
                                <i class="fas fa-chart-line me-2"></i>Exam Information
                            </h6>
                            <p><strong>Exam:</strong> ${mark.exam_type}</p>
                            <p><strong>Subject:</strong> ${mark.subject}</p>
                            <p><strong>Date:</strong> ${formatDate(mark.exam_date)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body text-center">
                    <h3 class="text-primary">${mark.marks_obtained} / ${mark.total_marks}</h3>
                    <div class="progress mb-3" style="height: 25px;">
                        <div class="progress-bar ${getPercentageClass(percentage)}" 
                             style="width: ${percentage}%">
                            ${percentage.toFixed(1)}%
                        </div>
                    </div>
                    <h4><span class="badge ${gradeClass}">Grade: ${grade}</span></h4>
                </div>
            </div>
        `;
        
        document.getElementById('viewMarksContent').innerHTML = content;
        const modal = new bootstrap.Modal(document.getElementById('viewMarksModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing marks:', error);
        showError('Failed to load marks details');
    }
}

// ==================== EDIT SECTION MARKS ====================
async function editSectionMarks(marksId) {
    try {
        const mark = allMarks.find(m => m.id === marksId);
        if (!mark) {
            showError('Marks record not found');
            return;
        }
        
        currentMarksEditId = marksId;
        document.getElementById('editMarksId').value = marksId;
        
        // Set form values
        document.getElementById('marksExam').value = mark.exam_type || '';
        document.getElementById('marksExamDate').value = mark.exam_date || '';
        document.getElementById('marksSubject').value = mark.subject || '';
        document.getElementById('marksTotalMarks').value = mark.total_marks || 100;
        
        // Load courses and set
        await loadCoursesForMarks();
        document.getElementById('marksCourse').value = mark.course || '';
        
        // Load sections
        await loadSectionsForMarks();
        
        // Set section after a delay
        setTimeout(() => {
            document.getElementById('marksSection').value = mark.section_id || '';
            
            // Load students
            loadStudentsForMarks();
            
            // After students load, set marks
            setTimeout(() => {
                const marksInputs = document.querySelectorAll('.student-marks');
                marksInputs.forEach(input => {
                    if (input.dataset.studentId === mark.student_id) {
                        input.value = mark.marks_obtained;
                    }
                });
            }, 500);
            
        }, 500);
        
        const modal = new bootstrap.Modal(document.getElementById('marksModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error editing marks:', error);
        showError('Failed to load marks for editing');
    }
}

// ==================== EDIT FROM VIEW MODAL ====================
function editFromViewModal() {
    if (currentViewMarksId) {
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewMarksModal'));
        viewModal.hide();
        
        setTimeout(() => {
            editSectionMarks(currentViewMarksId);
        }, 300);
    }
}

// ==================== DELETE SECTION MARKS ====================
async function deleteSectionMarks(marksId, studentName) {
    if (!confirm(`Are you sure you want to delete marks for ${studentName}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/api/section-marks/delete/${marksId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Marks deleted successfully');
            await loadSectionMarks();
            
            // Close view modal if open
            const viewModal = document.getElementById('viewMarksModal');
            if (viewModal && viewModal.classList.contains('show')) {
                bootstrap.Modal.getInstance(viewModal).hide();
            }
        } else {
            showError('Failed to delete marks');
        }
    } catch (error) {
        console.error('Error deleting marks:', error);
        showError('Error deleting marks');
    }
}

// ==================== REFRESH SECTION MARKS ====================
function refreshSectionMarks() {
    loadSectionMarks();
    showSuccess('Marks list refreshed');
}

// ==================== EXPORT SECTION MARKS ====================
function exportSectionMarks() {
    showInfo('Export feature coming soon!');
}

// ==================== HELPER FUNCTIONS ====================
function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
}

function getGradeClass(grade) {
    switch (grade) {
        case 'A+': case 'A': return 'bg-success';
        case 'B': case 'C': return 'bg-info';
        case 'D': case 'E': return 'bg-warning';
        case 'F': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getPercentageClass(percentage) {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-info';
    if (percentage >= 40) return 'bg-warning';
    return 'bg-danger';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}


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
// SECTION-WISE FEE RECORDS MANAGEMENT - COMPLETE CODE
// =====================================================

// ==================== GLOBAL VARIABLES ====================
let allFeeRecords = [];
let filteredFeeRecords = [];

let currentFeeCourseFilter = '';
let currentFeeSectionFilter = '';
let currentFeeDateFilter = '';
let currentFeeSearchTerm = '';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Fees Tab click event
    const feesTab = document.getElementById('fees-tab');
    if (feesTab) {
        feesTab.addEventListener('shown.bs.tab', function() {
            console.log('💰 Fees tab activated');
            loadAllSectionsForFees();
            loadSectionFeeRecords();
        });
    }
    
    // Course Filter change event
    const courseFilter = document.getElementById('feeCourseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', handleFeeCourseChange);
    }
    
    // Section Filter change event
    const sectionFilter = document.getElementById('feeSectionFilter');
    if (sectionFilter) {
        sectionFilter.addEventListener('change', function() {
            currentFeeSectionFilter = this.value;
            filterSectionFees();
        });
    }
    
    // Date Filter change event
    const dateFilter = document.getElementById('feeDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            currentFeeDateFilter = this.value;
            filterSectionFees();
        });
    }
    
    // Search input
    const searchInput = document.getElementById('feeSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            currentFeeSearchTerm = this.value.toLowerCase();
            filterSectionFees();
        });
    }
});

// ==================== FEE MODAL FUNCTIONS ====================

// ==================== FEE MODAL INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Fee Modal Events
    const feeModal = document.getElementById('feeModal');
    if (feeModal) {
        feeModal.addEventListener('show.bs.modal', function() {
            console.log('💰 Fee modal opening - loading courses...');
            
            // Reset form
            document.getElementById('feeForm').reset();
            
            // Set today's date
            const dateInput = document.getElementById('paymentDate');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
            
            // Load courses for fee modal
            loadCoursesForFeeModal();
            
            // Reset section dropdown
            const sectionSelect = document.getElementById('feeModalSection');
            sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
            sectionSelect.disabled = true;
            
            // Reset student dropdown
            const studentSelect = document.getElementById('feeModalStudent');
            studentSelect.innerHTML = '<option value="">-- Select Section First --</option>';
            studentSelect.disabled = true;
            
            // Clear fee details
            document.getElementById('totalFee').value = '';
            document.getElementById('paidAmount').value = '';
            document.getElementById('dueAmount').value = '';
            document.getElementById('payingNow').value = '';
        });
    }
    
    // Course change event for fee modal
    const courseSelect = document.getElementById('feeModalCourse');
    if (courseSelect) {
        courseSelect.addEventListener('change', function() {
            console.log('Course changed to:', this.value);
            loadSectionsForFeeModal();
        });
    }
    
    // Section change event for fee modal
    const sectionSelect = document.getElementById('feeModalSection');
    if (sectionSelect) {
        sectionSelect.addEventListener('change', function() {
            console.log('Section changed to:', this.value);
            loadStudentsForFeeModal();
        });
    }
    
    // Student change event for fee modal
    const studentSelect = document.getElementById('feeModalStudent');
    if (studentSelect) {
        studentSelect.addEventListener('change', function() {
            console.log('Student changed to:', this.value);
            updateFeeDetails();
        });
    }
});

// Load courses for fee modal
// ==================== FIXED: Load courses for fee modal ====================
async function loadCoursesForFeeModal() {
    const select = document.getElementById('feeModalCourse');
    if (!select) {
        console.error('❌ feeModalCourse element not found!');
        return;
    }
    
    console.log('🔄 Loading courses for fee modal...');
    
    try {
        select.innerHTML = '<option value="">Loading courses...</option>';
        
        // Pehle global coursesData check karo
        if (typeof coursesData !== 'undefined' && coursesData && coursesData.length > 0) {
            console.log('📦 Using cached courses:', coursesData.length);
            const activeCourses = coursesData.filter(c => c.is_active !== false);
            
            let options = '<option value="">Select Course</option>';
            activeCourses.forEach(course => {
                options += `<option value="${course.course_code}">
                    ${course.course_code} - ${course.course_name}
                </option>`;
            });
            
            select.innerHTML = options;
            select.disabled = false;
            return;
        }
        
        // Nahi toh API se lao
        console.log('🌐 Fetching courses from API...');
        const response = await fetch(`${API_URL}/api/courses/all`);
        const data = await response.json();
        
        if (data.success && data.courses) {
            const activeCourses = data.courses.filter(c => c.is_active !== false);
            
            let options = '<option value="">Select Course</option>';
            activeCourses.forEach(course => {
                options += `<option value="${course.course_code}">
                    ${course.course_code} - ${course.course_name}
                </option>`;
            });
            
            select.innerHTML = options;
            select.disabled = false;
            
            console.log(`✅ Loaded ${activeCourses.length} courses`);
        } else {
            select.innerHTML = '<option value="">Error loading courses</option>';
            showError('Failed to load courses');
        }
    } catch (error) {
        console.error('❌ Error loading courses:', error);
        select.innerHTML = '<option value="">Error loading courses</option>';
        showError('Error loading courses: ' + error.message);
    }
}

// ==================== FIXED: Load sections for fee modal ====================
async function loadSectionsForFeeModal() {
    const courseSelect = document.getElementById('feeModalCourse');
    const sectionSelect = document.getElementById('feeModalSection');
    const studentSelect = document.getElementById('feeModalStudent');
    
    const courseCode = courseSelect.value;
    
    console.log('🔍 Loading sections for course:', courseCode);
    
    if (!courseCode) {
        sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        sectionSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">-- Select Section First --</option>';
        studentSelect.disabled = true;
        return;
    }
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        console.log('📦 Sections response:', data);
        
        if (data.success && data.sections) {
            const activeSections = data.sections.filter(s => s.is_active === true);
            
            if (activeSections.length === 0) {
                sectionSelect.innerHTML = '<option value="">No sections found</option>';
                sectionSelect.disabled = true;
                showError(`No active sections found for course ${courseCode}`);
                return;
            }
            
            let options = '<option value="">-- Select Section --</option>';
            activeSections.forEach(section => {
                const studentCount = section.current_students || 0;
                options += `<option value="${section.section_id}">
                    ${section.section_name} (${studentCount} students)
                </option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
            
            console.log(`✅ Loaded ${activeSections.length} sections`);
            
            // Reset student dropdown
            studentSelect.innerHTML = '<option value="">-- Select Section First --</option>';
            studentSelect.disabled = true;
        } else {
            sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
            sectionSelect.disabled = true;
            showError('Failed to load sections');
        }
    } catch (error) {
        console.error('❌ Error loading sections:', error);
        sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
        sectionSelect.disabled = true;
        showError('Error loading sections: ' + error.message);
    }
}
// ==================== FIXED: Load students for fee modal ====================
async function loadStudentsForFeeModal() {
    const sectionSelect = document.getElementById('feeModalSection');
    const studentSelect = document.getElementById('feeModalStudent');
    
    const sectionId = sectionSelect.value;
    
    console.log('🔍 Loading students for section:', sectionId);
    
    if (!sectionId) {
        studentSelect.innerHTML = '<option value="">-- Select Section First --</option>';
        studentSelect.disabled = true;
        return;
    }
    
    try {
        studentSelect.innerHTML = '<option value="">Loading students...</option>';
        studentSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/section-attendance/students/${sectionId}`);
        const data = await response.json();
        
        console.log('📦 Students response:', data);
        
        if (data.success && data.students) {
            const students = data.students;
            
            if (students.length === 0) {
                studentSelect.innerHTML = '<option value="">No students in this section</option>';
                studentSelect.disabled = true;
                showError('No students found in this section');
                return;
            }
            
            let options = '<option value="">-- Select Student --</option>';
            students.forEach(student => {
                options += `<option value="${student.student_id}">
                    ${student.name} (${student.student_id})
                </option>`;
            });
            
            studentSelect.innerHTML = options;
            studentSelect.disabled = false;
            
            console.log(`✅ Loaded ${students.length} students`);
        } else {
            studentSelect.innerHTML = '<option value="">Error loading students</option>';
            studentSelect.disabled = true;
            showError('Failed to load students');
        }
    } catch (error) {
        console.error('❌ Error loading students:', error);
        studentSelect.innerHTML = '<option value="">Error loading students</option>';
        studentSelect.disabled = true;
        showError('Error loading students: ' + error.message);
    }
}

// Update fee details when student selected
async function updateFeeDetails() {
    const studentSelect = document.getElementById('feeModalStudent');
    const studentId = studentSelect.value;
    
    if (!studentId) {
        document.getElementById('totalFee').value = '';
        document.getElementById('paidAmount').value = '';
        document.getElementById('dueAmount').value = '';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/student-fee-details/${studentId}`);
        const data = await response.json();
        
        if (data.success && data.fee_summary) {
            document.getElementById('totalFee').value = data.fee_summary.fee_amount || 0;
            document.getElementById('paidAmount').value = data.fee_summary.paid_amount || 0;
            document.getElementById('dueAmount').value = data.fee_summary.due_amount || 0;
            
            const payingInput = document.getElementById('payingNow');
            payingInput.max = data.fee_summary.due_amount || 0;
            payingInput.placeholder = `Max: ₹${(data.fee_summary.due_amount || 0).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error fetching fee details:', error);
    }
}

// Record section payment
async function recordSectionPayment() {
    const studentId = document.getElementById('feeModalStudent').value;
    const payingAmount = parseFloat(document.getElementById('payingNow').value);
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMode = document.getElementById('paymentMode').value;
    const dueAmount = parseFloat(document.getElementById('dueAmount').value);
    
    if (!studentId) {
        showError('Please select a student');
        return;
    }
    
    if (!payingAmount || payingAmount <= 0) {
        showError('Please enter a valid payment amount');
        return;
    }
    
    if (payingAmount > dueAmount) {
        showError(`Payment amount cannot exceed due amount (₹${dueAmount.toLocaleString()})`);
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
        const saveBtn = document.querySelector('#feeModal .btn-success');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';
        saveBtn.disabled = true;
        
        const response = await fetch(`${API_URL}/api/record-payment`, {
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
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        if (result.success) {
            showSuccess('Payment recorded successfully!');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('feeModal'));
            modal.hide();
            
            // Refresh fee records
            loadSectionFeeRecords();
            
            // Ask for print
            setTimeout(() => {
                if (confirm('Print receipt?')) {
                    printReceipt(result.receiptNo);
                }
            }, 500);
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showError('Failed to record payment: ' + error.message);
    }
}
// ==================== LOAD ALL SECTIONS FOR FEES ====================
async function loadAllSectionsForFees() {
    try {
        const response = await fetch(`${API_URL}/api/sections/all`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            allSections = data.sections;
            console.log(`📚 Loaded ${allSections.length} sections for fee filtering`);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// ==================== FIXED: Handle Course Change ====================
function handleFeeCourseChange() {
    const courseFilter = document.getElementById('feeCourseFilter');
    currentFeeCourseFilter = courseFilter.value;
    
    console.log('📌 Course filter changed to:', currentFeeCourseFilter);
    
    // Update section filter based on selected course
    updateFeeSectionFilter(currentFeeCourseFilter);
    
    // Apply filters - yeh filteredFeeRecords update karega
    filterSectionFees();
    
    // Update stats automatically filterSectionFees ke andar ho jayega
}

// ==================== UPDATE SECTION FILTER ====================
function updateFeeSectionFilter(courseCode) {
    const sectionFilter = document.getElementById('feeSectionFilter');
    if (!sectionFilter) return;
    
    if (!courseCode) {
        // Agar course select nahi hai to saare sections dikhao
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        sectionFilter.disabled = false;
        return;
    }
    
    // Course ke according sections filter karo
    const courseSections = allSections.filter(s => 
        s.course_code === courseCode && s.is_active === true
    );
    
    if (courseSections.length === 0) {
        sectionFilter.innerHTML = '<option value="">No sections for this course</option>';
        sectionFilter.disabled = true;
    } else {
        let options = '<option value="">All Sections</option>';
        courseSections.forEach(section => {
            options += `<option value="${section.section_id}">${section.section_name}</option>`;
        });
        sectionFilter.innerHTML = options;
        sectionFilter.disabled = false;
    }
    
    // Section filter reset karo
    currentFeeSectionFilter = '';
    sectionFilter.value = '';
}

// ==================== FIXED: Load Section Fee Records ====================
async function loadSectionFeeRecords() {
    try {
        const tbody = document.getElementById('feeRecordsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <div class="spinner-border text-success mb-3"></div>
                    <p class="text-muted">Loading fee records...</p>
                </td>
            </tr>
        `;
        
        // Pehle students load karo (section info ke liye)
        const studentsResponse = await fetch(`${API_URL}/api/students/all`);
        const studentsData = await studentsResponse.json();
        
        // Fees load karo
        const feesResponse = await fetch(`${API_URL}/api/fees`);
        const feesData = await feesResponse.json();
        
        if (feesData.success && feesData.fees) {
            let fees = feesData.fees || [];
            
            // Student section info add karo
            if (studentsData.success && studentsData.students) {
                const students = studentsData.students;
                
                fees = fees.map(fee => {
                    const student = students.find(s => s.student_id === fee.student_id);
                    return {
                        ...fee,
                        course_code: student ? student.course : fee.course,
                        section_id: student ? student.section_id : null,
                        section_name: student ? student.section_name : null
                    };
                });
            }
            
            allFeeRecords = fees;
            
            // Initially filteredRecords bhi saare records
            filteredFeeRecords = [...allFeeRecords];
            
            // Populate course filter
            populateFeeCourseFilter();
            
            // Display records - yeh filteredFeeRecords use karega
            displaySectionFeeRecords(filteredFeeRecords);
            
            // Update stats - yeh filteredFeeRecords use karega
            updateFeeStats();
            
            // Update display counts
            updateDisplayCounts();
            
            console.log(`✅ Loaded ${allFeeRecords.length} fee records`);
        } else {
            throw new Error(feesData.message || 'Failed to load fees');
        }
    } catch (error) {
        console.error('Error loading fee records:', error);
        
        const tbody = document.getElementById('feeRecordsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                    <p>Error loading fee records: ${error.message}</p>
                    <button class="btn btn-sm btn-primary" onclick="loadSectionFeeRecords()">
                        <i class="fas fa-sync-alt me-1"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ==================== FIXED: Populate Fee Course Filter (Bina Total Fee ke) ====================
function populateFeeCourseFilter() {
    const courseFilter = document.getElementById('feeCourseFilter');
    if (!courseFilter) return;
    
    // Unique courses from fee records
    const courses = [...new Set(allFeeRecords.map(f => f.course_code))].filter(c => c);
    
    let options = '<option value="">All Courses</option>';
    courses.sort().forEach(course => {
        const courseFees = allFeeRecords.filter(f => f.course_code === course);
        const count = courseFees.length;
        // Sirf payment count dikhao, total fee nahi
        options += `<option value="${course}">${course} (${count} payments)</option>`;
    });
    
    courseFilter.innerHTML = options;
}

// ==================== FIXED: Filter Section Fees ====================
function filterSectionFees() {
    console.log('🔍 Filtering fee records:', {
        course: currentFeeCourseFilter,
        section: currentFeeSectionFilter,
        date: currentFeeDateFilter,
        search: currentFeeSearchTerm
    });
    
    let filtered = [...allFeeRecords];
    
    // Apply course filter
    if (currentFeeCourseFilter) {
        filtered = filtered.filter(f => f.course_code === currentFeeCourseFilter);
    }
    
    // Apply section filter
    if (currentFeeSectionFilter) {
        filtered = filtered.filter(f => f.section_id === currentFeeSectionFilter);
    }
    
    // Apply date filter
    if (currentFeeDateFilter) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const weekStr = startOfWeek.toISOString().split('T')[0];
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStr = startOfMonth.toISOString().split('T')[0];
        
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const yearStr = startOfYear.toISOString().split('T')[0];
        
        filtered = filtered.filter(f => {
            const feeDate = f.payment_date;
            if (!feeDate) return false;
            
            switch(currentFeeDateFilter) {
                case 'today':
                    return feeDate === todayStr;
                case 'week':
                    return feeDate >= weekStr;
                case 'month':
                    return feeDate >= monthStr;
                case 'year':
                    return feeDate >= yearStr;
                default:
                    return true;
            }
        });
    }
    
    // Apply search filter
    if (currentFeeSearchTerm) {
        filtered = filtered.filter(f => 
            (f.receipt_no && f.receipt_no.toLowerCase().includes(currentFeeSearchTerm)) ||
            (f.student_name && f.student_name.toLowerCase().includes(currentFeeSearchTerm)) ||
            (f.student_id && f.student_id.toLowerCase().includes(currentFeeSearchTerm)) ||
            (f.course_code && f.course_code.toLowerCase().includes(currentFeeSearchTerm)) ||
            (f.section_name && f.section_name.toLowerCase().includes(currentFeeSearchTerm)) ||
            (f.payment_mode && f.payment_mode.toLowerCase().includes(currentFeeSearchTerm))
        );
    }
    
    filteredFeeRecords = filtered;
    
    // Display filtered records
    displaySectionFeeRecords(filteredFeeRecords);
    
    // Update stats with FILTERED data (yeh important hai)
    updateFeeStats();
    
    // Update display counts
    updateDisplayCounts();
}

// ==================== FIXED: Display Section Fee Records ====================
function displaySectionFeeRecords(records) {
    const tbody = document.getElementById('feeRecordsTableBody');
    const countBadge = document.getElementById('feeRecordsCount');
    
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <i class="fas fa-money-bill-wave fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No fee records found for selected filters</p>
                </td>
            </tr>
        `;
        countBadge.textContent = '0';
        document.getElementById('totalAmountDisplay').textContent = `Total: ₹0`;
        document.getElementById('footerTotalAmount').textContent = `₹0`;
        return;
    }
    
    let html = '';
    let totalAmount = 0;
    
    records.forEach((record, index) => {
        totalAmount += record.amount || 0;
        
        const statusClass = getFeeStatusClass(record.status);
        const modeClass = getPaymentModeClass(record.payment_mode);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${record.receipt_no || 'N/A'}</strong>
                </td>
                <td>
                    <div>
                        <strong>${record.student_name || 'Unknown'}</strong>
                        <br>
                        <small class="text-muted">${record.student_id || ''}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${record.course_code || record.course || 'N/A'}</span>
                </td>
                <td>
                    ${record.section_name 
                        ? `<span class="badge bg-info">${record.section_name}</span>`
                        : `<span class="badge bg-secondary">Not Assigned</span>`
                    }
                </td>
                <td>
                    <span class="text-success fw-bold">₹${(record.amount || 0).toLocaleString()}</span>
                </td>
                <td>
                    <small>${formatFeeDate(record.payment_date)}</small>
                </td>
                <td>
                    <span class="badge ${modeClass}">${record.payment_mode || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge ${statusClass}">${record.status || 'Completed'}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewFeeDetails('${record.receipt_no}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success" onclick="printReceipt('${record.receipt_no}')">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    countBadge.textContent = records.length;
    
    // Sirf collected amount ka total dikhao
    document.getElementById('totalAmountDisplay').textContent = `Collected: ₹${totalAmount.toLocaleString()}`;
    document.getElementById('footerTotalAmount').textContent = `₹${totalAmount.toLocaleString()}`;
}

// ==================== FIXED: Update Fee Stats (Sirf Collection) ====================
function updateFeeStats() {
    // Sirf FILTERED records ka total collection dikhao
    const totalCollected = filteredFeeRecords.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalPayments = filteredFeeRecords.length;
    const uniqueSections = new Set(filteredFeeRecords.map(f => f.section_id).filter(s => s)).size;
    
    document.getElementById('totalFeeCollected').textContent = `₹${totalCollected.toLocaleString()}`;
    document.getElementById('totalFeePayments').textContent = totalPayments;
    document.getElementById('feeSectionsCount').textContent = uniqueSections;
}

// ==================== UPDATE DISPLAY COUNTS ====================
function updateDisplayCounts() {
    const showingSpan = document.getElementById('feeShowingCount');
    const totalSpan = document.getElementById('feeTotalCount');
    
    if (showingSpan) showingSpan.textContent = filteredFeeRecords.length;
    if (totalSpan) totalSpan.textContent = allFeeRecords.length;
}

// ==================== SEARCH SECTION FEES ====================
function searchSectionFees() {
    const searchInput = document.getElementById('feeSearch');
    currentFeeSearchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    filterSectionFees();
}

// ==================== FIXED: Reset Fee Filters ====================
function resetFeeFilters() {
    console.log('🔄 Resetting fee filters');
    
    // Reset filter values
    currentFeeCourseFilter = '';
    currentFeeSectionFilter = '';
    currentFeeDateFilter = '';
    currentFeeSearchTerm = '';
    
    // Reset UI elements
    const courseFilter = document.getElementById('feeCourseFilter');
    if (courseFilter) courseFilter.value = '';
    
    const sectionFilter = document.getElementById('feeSectionFilter');
    if (sectionFilter) {
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        sectionFilter.disabled = false;
        sectionFilter.value = '';
    }
    
    const dateFilter = document.getElementById('feeDateFilter');
    if (dateFilter) dateFilter.value = '';
    
    const searchInput = document.getElementById('feeSearch');
    if (searchInput) searchInput.value = '';
    
    // Reset to all records
    filteredFeeRecords = [...allFeeRecords];
    
    // Display all records
    displaySectionFeeRecords(filteredFeeRecords);
    
    // Update stats with ALL records
    updateFeeStats();
    
    // Update display counts
    updateDisplayCounts();
    
    showSuccess('Filters reset successfully');
}

// ==================== FIXED: Refresh Section Fees ====================
function refreshSectionFees() {
    console.log('🔄 Refreshing fee records');
    
    // Reset filters
    resetFeeFilters();
    
    // Reload data
    loadAllSectionsForFees();
    loadSectionFeeRecords();
    
    showSuccess('Fee records refreshed');
}

// ==================== FIXED: Export Section Fees ====================
function exportSectionFees() {
    console.log('📥 Exporting fee records');
    
    if (filteredFeeRecords.length === 0) {
        showError('No data to export');
        return;
    }
    
    // Create CSV content
    let csvContent = "Receipt No,Student ID,Student Name,Course,Section,Amount,Payment Date,Payment Mode,Status\n";
    
    filteredFeeRecords.forEach(record => {
        const row = [
            record.receipt_no || '',
            record.student_id || '',
            record.student_name || '',
            record.course_code || record.course || '',
            record.section_name || 'Not Assigned',
            record.amount || 0,
            record.payment_date || '',
            record.payment_mode || '',
            record.status || 'Completed'
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Sirf collection ka total do, fee amount nahi
    const totalAmount = filteredFeeRecords.reduce((sum, f) => sum + (f.amount || 0), 0);
    csvContent += `\nTotal Records,${filteredFeeRecords.length},Total Collected,₹${totalAmount.toLocaleString()}`;
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_collections_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Exported ${filteredFeeRecords.length} fee records`);
}

// ==================== FIXED: View Fee Details ====================
async function viewFeeDetails(receiptNo) {
    try {
        const record = allFeeRecords.find(f => f.receipt_no === receiptNo);
        if (!record) {
            showError('Fee record not found');
            return;
        }
        
        // Sirf payment details do, total fee mat do
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title text-success border-bottom pb-2">
                                <i class="fas fa-receipt me-2"></i>Payment Information
                            </h6>
                            <p><strong>Receipt No:</strong> ${record.receipt_no}</p>
                            <p><strong>Date:</strong> ${formatFeeDate(record.payment_date)}</p>
                            <p><strong>Amount Paid:</strong> <span class="text-success fw-bold">₹${(record.amount || 0).toLocaleString()}</span></p>
                            <p><strong>Mode:</strong> <span class="badge ${getPaymentModeClass(record.payment_mode)}">${record.payment_mode || 'N/A'}</span></p>
                            <p><strong>Status:</strong> <span class="badge ${getFeeStatusClass(record.status)}">${record.status || 'Completed'}</span></p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title text-primary border-bottom pb-2">
                                <i class="fas fa-user-graduate me-2"></i>Student Information
                            </h6>
                            <p><strong>Name:</strong> ${record.student_name}</p>
                            <p><strong>ID:</strong> ${record.student_id}</p>
                            <p><strong>Course:</strong> ${record.course_code || record.course}</p>
                            <p><strong>Section:</strong> ${record.section_name || 'Not Assigned'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('viewFeeContent').innerHTML = content;
        
        // Store receipt no for printing
        window.currentReceiptNo = receiptNo;
        
        const modal = new bootstrap.Modal(document.getElementById('viewFeeModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing fee details:', error);
        showError('Failed to load fee details');
    }
}

// ==================== FIXED: Print Receipt ====================
function printReceipt(receiptNo) {
    const receipt = allFeeRecords.find(f => f.receipt_no === (receiptNo || window.currentReceiptNo));
    if (!receipt) {
        showError('Receipt not found');
        return;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - ${receipt.receipt_no}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 10px; margin-bottom: 20px; }
                .institute-name { font-size: 24px; font-weight: bold; color: #28a745; }
                .receipt-title { font-size: 18px; margin-top: 10px; }
                .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .info-table td { padding: 8px; border: 1px solid #ddd; }
                .info-table td:first-child { font-weight: bold; width: 30%; background: #f5f5f5; }
                .amount { font-size: 20px; color: #28a745; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="institute-name">AACEM INSTITUTE</div>
                <div class="receipt-title">PAYMENT RECEIPT</div>
            </div>
            
            <table class="info-table">
                <tr><td>Receipt Number</td><td><strong>${receipt.receipt_no}</strong></td></tr>
                <tr><td>Date</td><td>${formatFeeDate(receipt.payment_date)}</td></tr>
                <tr><td>Student Name</td><td>${receipt.student_name}</td></tr>
                <tr><td>Student ID</td><td>${receipt.student_id}</td></tr>
                <tr><td>Course</td><td>${receipt.course_code || receipt.course}</td></tr>
                <tr><td>Section</td><td>${receipt.section_name || 'Not Assigned'}</td></tr>
                <tr><td>Amount Paid</td><td class="amount">₹${(receipt.amount || 0).toLocaleString()}</td></tr>
                <tr><td>Payment Mode</td><td>${receipt.payment_mode}</td></tr>
                <tr><td>Status</td><td>${receipt.status || 'Completed'}</td></tr>
            </table>
            
            <div class="footer">
                <p>This is a computer generated receipt. No signature required.</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// ==================== HELPER FUNCTIONS ====================
function getFeeStatusClass(status) {
    switch((status || '').toLowerCase()) {
        case 'paid': case 'completed': return 'bg-success';
        case 'pending': return 'bg-warning text-dark';
        case 'partial': return 'bg-info';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getPaymentModeClass(mode) {
    switch((mode || '').toLowerCase()) {
        case 'cash': return 'bg-success';
        case 'online': return 'bg-primary';
        case 'bank': return 'bg-info';
        case 'cheque': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
}

function formatFeeDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}







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
            saveBtn.onclick = saveSectionMarks;
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




// =====================================================
// SECTION-WISE ATTENDANCE MANAGEMENT - COMPLETE CODE
// =====================================================

// Attendance Modal Events - ADD THIS
const attendanceModal = document.getElementById('attendanceModal');
if (attendanceModal) {
    attendanceModal.addEventListener('show.bs.modal', function() {
        // Reset form
        document.getElementById('attendanceForm').reset();
        document.getElementById('editAttendanceId').value = '';
        
        // Set today's date
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        
        // Load courses
        loadCoursesForAttendance();
        
        // Reset section
        const sectionSelect = document.getElementById('attendanceSection');
        sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        sectionSelect.disabled = true;
        
        // Reset students container
        const studentsContainer = document.getElementById('attendanceStudentsList');
        studentsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-arrow-up fa-2x mb-2"></i>
                <p class="mb-0">Select course and section to load students</p>
            </div>
        `;
    });
}

// Course change event - ADD THIS
const courseSelect = document.getElementById('attendanceCourse');
if (courseSelect) {
    courseSelect.addEventListener('change', loadSectionsForAttendance);
}

// Section change event - ADD THIS
const sectionSelect = document.getElementById('attendanceSection');
if (sectionSelect) {
    sectionSelect.addEventListener('change', loadStudentsForAttendance);
}

// Date change event - ADD THIS
const dateInput = document.getElementById('attendanceDate');
if (dateInput) {
    dateInput.addEventListener('change', function() {
        const sectionId = document.getElementById('attendanceSection').value;
        if (sectionId) {
            loadStudentsForAttendance();
        }
    });
}

// Load attendance records when tab is shown - ADD THIS
const attendanceTab = document.getElementById('attendance-tab');
if (attendanceTab) {
    attendanceTab.addEventListener('shown.bs.tab', function() {
        loadSectionAttendanceRecords();
    });
}

// 1. Load courses for attendance dropdown
async function loadCoursesForAttendance() {
    try {
        const select = document.getElementById('attendanceCourse');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Choose Course --</option>';
        
        // Agar courses already loaded hain toh use karo
        if (typeof coursesData !== 'undefined' && coursesData.length > 0) {
            const activeCourses = coursesData.filter(c => c.is_active);
            activeCourses.forEach(course => {
                select.innerHTML += `<option value="${course.course_code}">
                    ${course.course_code} - ${course.course_name}
                </option>`;
            });
        } else {
            // Nahi toh API se load karo
            const response = await fetch(`${API_URL}/api/courses/all`);
            const data = await response.json();
            
            if (data.success && data.courses) {
                data.courses.filter(c => c.is_active).forEach(course => {
                    select.innerHTML += `<option value="${course.course_code}">
                        ${course.course_code} - ${course.course_name}
                    </option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// 2. Load sections when course changes
async function loadSectionsForAttendance() {
    const courseSelect = document.getElementById('attendanceCourse');
    const sectionSelect = document.getElementById('attendanceSection');
    const studentsContainer = document.getElementById('attendanceStudentsList');
    
    const courseCode = courseSelect.value;
    
    if (!courseCode) {
        sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        sectionSelect.disabled = true;
        studentsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-arrow-up fa-2x mb-2"></i>
                <p class="mb-0">Select course and section to load students</p>
            </div>
        `;
        return;
    }
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        console.log('Loading sections for course:', courseCode);
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        console.log('Sections response:', data);
        
        if (data.success && data.sections) {
            const activeSections = data.sections.filter(s => s.is_active);
            
            if (activeSections.length === 0) {
                sectionSelect.innerHTML = '<option value="">No sections found</option>';
                sectionSelect.disabled = true;
                studentsContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        No sections found for this course. Please create sections first.
                    </div>
                `;
                return;
            }
            
            let options = '<option value="">-- Select Section --</option>';
            activeSections.forEach(section => {
                const current = section.current_students || 0;
                const max = section.max_students || 60;
                options += `<option value="${section.section_id}">
                    ${section.section_name} (${current}/${max} students)
                </option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
            
            // Clear students container
            studentsContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-hand-pointer fa-2x mb-2"></i>
                    <p class="mb-0">Select section to load students</p>
                </div>
            `;
        } else {
            sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
            sectionSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
        sectionSelect.disabled = true;
    }
}

// 3. Load students when section changes
async function loadStudentsForAttendance() {
    const sectionSelect = document.getElementById('attendanceSection');
    const dateInput = document.getElementById('attendanceDate');
    const studentsContainer = document.getElementById('attendanceStudentsList');
    const editId = document.getElementById('editAttendanceId');
    
    const sectionId = sectionSelect.value;
    const selectedDate = dateInput.value;
    
    if (!sectionId) {
        studentsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-hand-pointer fa-2x mb-2"></i>
                <p class="mb-0">Select section to load students</p>
            </div>
        `;
        return;
    }
    
    if (!selectedDate) {
        studentsContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Please select date first
            </div>
        `;
        return;
    }
    
    studentsContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary mb-2"></div>
            <p class="text-muted">Loading students...</p>
        </div>
    `;
    
    try {
        // Check if attendance already exists
        const checkResponse = await fetch(
            `${API_URL}/api/section-attendance/check-existing?date=${selectedDate}&section_id=${sectionId}`
        );
        const checkData = await checkResponse.json();
        
        // Get students in section
        const studentsResponse = await fetch(`${API_URL}/api/section-attendance/students/${sectionId}`);
        const studentsData = await studentsResponse.json();
        
        if (!studentsData.success || !studentsData.students || studentsData.students.length === 0) {
            studentsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No students found in this section
                </div>
            `;
            return;
        }
        
        const students = studentsData.students;
        let html = '';
        
        // Show existing attendance warning
        if (checkData.success && checkData.exists) {
            const attendance = checkData.attendance;
            editId.value = attendance.id;
            
            html += `
                <div class="alert alert-warning mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Attendance already exists for ${selectedDate}</strong><br>
                            Present: ${attendance.present_count} | 
                            Absent: ${attendance.absent_count} | 
                            Percentage: ${attendance.percentage}%
                        </div>
                        <span class="badge bg-warning">Editing Mode</span>
                    </div>
                </div>
            `;
        } else {
            editId.value = '';
        }
        
        // Quick action buttons
        html += `
            <div class="mb-3 d-flex gap-2">
                <button type="button" class="btn btn-success btn-sm" onclick="markAllPresent()">
                    <i class="fas fa-check-double me-1"></i> All Present
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="markAllAbsent()">
                    <i class="fas fa-times me-1"></i> All Absent
                </button>
            </div>
        `;
        
        // Students list
        students.forEach((student, index) => {
            let isChecked = true; // Default present
            let statusClass = 'bg-success';
            let statusText = 'Present';
            
            // If editing, get saved status
            if (checkData.success && checkData.exists && checkData.attendance.attendance_data) {
                const savedStatus = checkData.attendance.attendance_data[student.student_id];
                isChecked = savedStatus === 'present';
                statusClass = isChecked ? 'bg-success' : 'bg-danger';
                statusText = isChecked ? 'Present' : 'Absent';
            }
            
            html += `
                <div class="form-check mb-2 p-2 border rounded student-row" 
                     style="background: ${isChecked ? '#e8f5e9' : '#ffebee'};">
                    <div class="d-flex align-items-center">
                        <input class="form-check-input attendance-checkbox me-3" 
                               type="checkbox" 
                               data-student-id="${student.student_id}"
                               data-student-name="${student.name}"
                               id="stu_${student.student_id}"
                               ${isChecked ? 'checked' : ''}
                               onchange="updateStudentStatus(this)">
                        <label class="form-check-label flex-grow-1" for="stu_${student.student_id}">
                            <strong>${index + 1}. ${student.name}</strong>
                            <br>
                            <small class="text-muted">${student.student_id}</small>
                        </label>
                        <span class="badge ${statusClass} status-badge" style="min-width: 80px;">
                            ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        
        studentsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error loading students: ${error.message}
            </div>
        `;
    }
}

// 4. Update student status when checkbox changes
function updateStudentStatus(checkbox) {
    const row = checkbox.closest('.student-row');
    const badge = row.querySelector('.status-badge');
    
    if (checkbox.checked) {
        badge.textContent = 'Present';
        badge.className = 'badge bg-success status-badge';
        row.style.background = '#e8f5e9';
    } else {
        badge.textContent = 'Absent';
        badge.className = 'badge bg-danger status-badge';
        row.style.background = '#ffebee';
    }
}

// 5. Mark all present
function markAllPresent() {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = true;
        updateStudentStatus(cb);
    });
}

// 6. Mark all absent
function markAllAbsent() {
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        cb.checked = false;
        updateStudentStatus(cb);
    });
}

// 7. Save attendance
async function saveSectionAttendance() {
    const courseSelect = document.getElementById('attendanceCourse');
    const sectionSelect = document.getElementById('attendanceSection');
    const dateInput = document.getElementById('attendanceDate');
    const subjectInput = document.getElementById('attendanceSubject');
    const editId = document.getElementById('editAttendanceId');
    
    const courseCode = courseSelect.value;
    const sectionId = sectionSelect.value;
    const date = dateInput.value;
    const subject = subjectInput.value.trim() || 'General';
    
    if (!courseCode || !sectionId || !date) {
        showError('Please select course, section and date');
        return;
    }
    
    // Collect attendance data
    const attendanceData = {};
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        attendanceData[cb.dataset.studentId] = cb.checked ? 'present' : 'absent';
    });
    
    if (Object.keys(attendanceData).length === 0) {
        showError('No students found to mark attendance');
        return;
    }
    
    try {
        const saveBtn = document.querySelector('#attendanceModal .btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
        saveBtn.disabled = true;
        
        let url = `${API_URL}/api/section-attendance/mark`;
        let method = 'POST';
        
        // If editing, use update endpoint
        if (editId.value) {
            url = `${API_URL}/api/section-attendance/update/${editId.value}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                course_code: courseCode,
                section_id: sectionId,
                date: date,
                subject: subject,
                attendance: attendanceData
            })
        });
        
        const result = await response.json();
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        if (result.success) {
            showSuccess('Attendance saved successfully!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            modal.hide();
            
            // Refresh attendance display
            loadSectionAttendanceRecords();
        } else {
            showError('Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance: ' + error.message);
        
        const saveBtn = document.querySelector('#attendanceModal .btn-primary');
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save Attendance';
        saveBtn.disabled = false;
    }
}

// 8. Load attendance records table
async function loadSectionAttendanceRecords() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    try {
        const response = await fetch(`${API_URL}/api/section-attendance/all`);
        const data = await response.json();
        
        if (!data.success) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                        <p>Error loading attendance records</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const records = data.attendance || [];
        
        if (records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <p>No attendance records found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate filter dropdowns
        populateAttendanceFilters(records);
        
        let html = '';
        records.forEach((record, index) => {
            const statusClass = record.percentage >= 80 ? 'success' : 
                               record.percentage >= 60 ? 'warning' : 'danger';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${record.course_code || 'N/A'}</td>
                    <td>${record.section_name || record.section_id || 'N/A'}</td>
                    <td>${formatAttendanceDate(record.date)}</td>
                    <td>${record.subject || 'General'}</td>
                    <td>
                        <span class="badge bg-success">${record.present_count || 0}</span> / 
                        <span class="badge bg-danger">${record.absent_count || 0}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 8px;">
                                <div class="progress-bar bg-${statusClass}" 
                                     style="width: ${record.percentage || 0}%"></div>
                            </div>
                            <strong>${record.percentage || 0}%</strong>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-info" onclick="viewAttendanceDetails(${record.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-warning" onclick="editAttendance(${record.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteAttendance(${record.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                    <p>Error loading attendance records: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// 9. Populate filter dropdowns
function populateAttendanceFilters(records) {
    const courseFilter = document.getElementById('filterCourse');
    const sectionFilter = document.getElementById('filterSection');
    
    if (!courseFilter || !sectionFilter) return;
    
    // Get unique courses
    const courses = [...new Set(records.map(r => r.course_code))];
    courseFilter.innerHTML = '<option value="">All Courses</option>';
    courses.forEach(course => {
        if (course) {
            courseFilter.innerHTML += `<option value="${course}">${course}</option>`;
        }
    });
    
    // Get unique sections
    const sections = [...new Set(records.map(r => r.section_id))];
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    sections.forEach(section => {
        if (section) {
            const record = records.find(r => r.section_id === section);
            sectionFilter.innerHTML += `<option value="${section}">${record?.section_name || section}</option>`;
        }
    });
}

// 10. Filter functions
function filterAttendanceByCourse() {
    const course = document.getElementById('filterCourse').value;
    filterAttendanceRecords();
}

function filterAttendanceBySection() {
    const section = document.getElementById('filterSection').value;
    filterAttendanceRecords();
}

function filterAttendanceByDate() {
    const date = document.getElementById('filterDate').value;
    filterAttendanceRecords();
}

async function filterAttendanceRecords() {
    const course = document.getElementById('filterCourse').value;
    const section = document.getElementById('filterSection').value;
    const date = document.getElementById('filterDate').value;
    
    let url = `${API_URL}/api/section-attendance/filter?`;
    if (course) url += `&course=${course}`;
    if (section) url += `&section=${section}`;
    if (date) url += `&date=${date}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayFilteredAttendance(data.attendance || []);
        }
    } catch (error) {
        console.error('Error filtering attendance:', error);
    }
}

function displayFilteredAttendance(records) {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <p>No matching attendance records found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    records.forEach((record, index) => {
        const statusClass = record.percentage >= 80 ? 'success' : 
                           record.percentage >= 60 ? 'warning' : 'danger';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${record.course_code || 'N/A'}</td>
                <td>${record.section_name || record.section_id || 'N/A'}</td>
                <td>${formatAttendanceDate(record.date)}</td>
                <td>${record.subject || 'General'}</td>
                <td>
                    <span class="badge bg-success">${record.present_count || 0}</span> / 
                    <span class="badge bg-danger">${record.absent_count || 0}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 8px;">
                            <div class="progress-bar bg-${statusClass}" 
                                 style="width: ${record.percentage || 0}%"></div>
                        </div>
                        <strong>${record.percentage || 0}%</strong>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewAttendanceDetails(${record.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="editAttendance(${record.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteAttendance(${record.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// 11. Edit attendance
async function editAttendance(attendanceId) {
    try {
        const response = await fetch(`${API_URL}/api/section-attendance/${attendanceId}`);
        const data = await response.json();
        
        if (data.success && data.attendance) {
            const attendance = data.attendance;
            
            // Set form values
            const courseSelect = document.getElementById('attendanceCourse');
            const sectionSelect = document.getElementById('attendanceSection');
            const dateInput = document.getElementById('attendanceDate');
            const subjectInput = document.getElementById('attendanceSubject');
            const editId = document.getElementById('editAttendanceId');
            
            // Load courses first
            await loadCoursesForAttendance();
            
            // Set course
            courseSelect.value = attendance.course_code;
            
            // Load sections
            await loadSectionsForAttendance();
            
            // Set section after a delay
            setTimeout(() => {
                sectionSelect.value = attendance.section_id;
                dateInput.value = attendance.date;
                subjectInput.value = attendance.subject || '';
                editId.value = attendance.id;
                
                // Load students
                loadStudentsForAttendance();
            }, 500);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading attendance for edit:', error);
        showError('Failed to load attendance details');
    }
}

// 12. Delete attendance
async function deleteAttendance(attendanceId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/section-attendance/delete/${attendanceId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Attendance deleted successfully');
            loadSectionAttendanceRecords();
        } else {
            showError('Failed to delete attendance');
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showError('Error deleting attendance');
    }
}

// 13. View attendance details
async function viewAttendanceDetails(attendanceId) {
    try {
        const response = await fetch(`${API_URL}/api/section-attendance/${attendanceId}`);
        const data = await response.json();
        
        if (data.success && data.attendance) {
            const attendance = data.attendance;
            
            let studentsHtml = '';
            if (attendance.attendance_data) {
                Object.entries(attendance.attendance_data).forEach(([studentId, status]) => {
                    studentsHtml += `
                        <tr>
                            <td>${studentId}</td>
                            <td>
                                <span class="badge bg-${status === 'present' ? 'success' : 'danger'}">
                                    ${status.toUpperCase()}
                                </span>
                            </td>
                        </tr>
                    `;
                });
            }
            
            const detailsHtml = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Attendance Details</h5>
                        <table class="table table-sm">
                            <tr><th>Course:</th><td>${attendance.course_code}</td></tr>
                            <tr><th>Section:</th><td>${attendance.section_name || attendance.section_id}</td></tr>
                            <tr><th>Date:</th><td>${attendance.date}</td></tr>
                            <tr><th>Subject:</th><td>${attendance.subject || 'General'}</td></tr>
                            <tr><th>Present:</th><td>${attendance.present_count}</td></tr>
                            <tr><th>Absent:</th><td>${attendance.absent_count}</td></tr>
                            <tr><th>Percentage:</th><td>${attendance.percentage}%</td></tr>
                        </table>
                        
                        <h6 class="mt-3">Student-wise Attendance</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${studentsHtml || '<tr><td colspan="2" class="text-center">No data</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Show in a modal
            showInfoModal(detailsHtml, 'Attendance Details');
        }
    } catch (error) {
        console.error('Error viewing attendance:', error);
        showError('Failed to load attendance details');
    }
}

// 14. Show info modal
function showInfoModal(content, title = 'Information') {
    const modalHtml = `
        <div class="modal fade" id="infoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('infoModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('infoModal'));
    modal.show();
}

// 15. Export attendance
function exportSectionAttendance() {
    const course = document.getElementById('filterCourse').value;
    const section = document.getElementById('filterSection').value;
    const date = document.getElementById('filterDate').value;
    
    let url = `${API_URL}/api/section-attendance/export?`;
    if (course) url += `&course=${course}`;
    if (section) url += `&section=${section}`;
    if (date) url += `&date=${date}`;
    
    window.open(url, '_blank');
    showSuccess('Exporting attendance...');
}

// 16. Format date helper
function formatAttendanceDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// 17. Show error
function showError(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            confirmButtonText: 'OK'
        });
    } else {
        alert('❌ Error: ' + message);
    }
}

// 18. Show success
function showSuccess(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        alert('✅ ' + message);
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

// =====================================================
// SECTION-WISE PDF MANAGEMENT - COMPLETE CODE
// =====================================================

// ==================== GLOBAL VARIABLES ====================
let allPdfs = [];
let filteredPdfs = [];
let currentPdfEditId = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // PDF Modal Events
    const pdfModal = document.getElementById('uploadPdfModal');
    if (pdfModal) {
        pdfModal.addEventListener('show.bs.modal', function() {
            if (!currentPdfEditId) {
                document.getElementById('uploadPdfForm').reset();
                document.getElementById('editPdfId').value = '';
                document.getElementById('filePreview').style.display = 'none';
                loadCoursesForPdf();
                
                const sectionSelect = document.getElementById('pdfSectionSelect');
                sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
                sectionSelect.disabled = true;
            }
        });
    }
    
    // PDF file input preview
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
    
    // Course change for filter
    const courseFilter = document.getElementById('pdfCourseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', function() {
            const courseCode = this.value;
            const sectionFilter = document.getElementById('pdfSectionFilter');
            
            if (courseCode) {
                loadSectionsForPdfFilter(courseCode);
            } else {
                sectionFilter.innerHTML = '<option value="">All Sections</option>';
                sectionFilter.disabled = true;
                filterSectionPdfs();
            }
        });
    }
    
    // Load PDFs when tab is shown
    const pdfsTab = document.getElementById('pdfs-tab');
    if (pdfsTab) {
        pdfsTab.addEventListener('shown.bs.tab', function() {
            loadSectionPdfs();
        });
    }
});

// ==================== LOAD COURSES FOR PDF ====================
async function loadCoursesForPdf() {
    try {
        const select = document.getElementById('pdfCourseSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Choose Course --</option>';
        
        if (typeof coursesData !== 'undefined' && coursesData.length > 0) {
            const activeCourses = coursesData.filter(c => c.is_active);
            activeCourses.forEach(course => {
                select.innerHTML += `<option value="${course.course_code}">
                    ${course.course_code} - ${course.course_name}
                </option>`;
            });
        } else {
            const response = await fetch(`${API_URL}/api/courses/all`);
            const data = await response.json();
            
            if (data.success && data.courses) {
                data.courses.filter(c => c.is_active).forEach(course => {
                    select.innerHTML += `<option value="${course.course_code}">
                        ${course.course_code} - ${course.course_name}
                    </option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ==================== LOAD SECTIONS FOR PDF ====================
async function loadSectionsForPdf() {
    const courseSelect = document.getElementById('pdfCourseSelect');
    const sectionSelect = document.getElementById('pdfSectionSelect');
    
    const courseCode = courseSelect.value;
    
    if (!courseCode) {
        sectionSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        sectionSelect.disabled = true;
        return;
    }
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            const activeSections = data.sections.filter(s => s.is_active);
            
            if (activeSections.length === 0) {
                sectionSelect.innerHTML = '<option value="">No sections found</option>';
                sectionSelect.disabled = true;
                return;
            }
            
            let options = '<option value="">-- Select Section --</option>';
            activeSections.forEach(section => {
                options += `<option value="${section.section_id}">
                    ${section.section_name} (${section.current_students || 0}/${section.max_students || 60} students)
                </option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
        } else {
            sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
            sectionSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
        sectionSelect.disabled = true;
    }
}

// ==================== LOAD SECTIONS FOR FILTER ====================
async function loadSectionsForPdfFilter(courseCode) {
    const sectionSelect = document.getElementById('pdfSectionFilter');
    
    try {
        sectionSelect.innerHTML = '<option value="">Loading sections...</option>';
        sectionSelect.disabled = true;
        
        const response = await fetch(`${API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            let options = '<option value="">All Sections</option>';
            data.sections.forEach(section => {
                options += `<option value="${section.section_id}">${section.section_name}</option>`;
            });
            
            sectionSelect.innerHTML = options;
            sectionSelect.disabled = false;
        } else {
            sectionSelect.innerHTML = '<option value="">All Sections</option>';
            sectionSelect.disabled = true;
        }
    } catch (error) {
        console.error('Error loading sections for filter:', error);
        sectionSelect.innerHTML = '<option value="">All Sections</option>';
        sectionSelect.disabled = true;
    }
}

// ==================== FIXED: Save Section PDF ====================
async function saveSectionPdf() {
    const form = document.getElementById('uploadPdfForm');
    
    // Get values
    const courseCode = document.getElementById('pdfCourseSelect').value;
    const sectionId = document.getElementById('pdfSectionSelect').value;
    const pdfTitle = document.querySelector('input[name="pdf_title"]').value.trim();
    const description = document.querySelector('textarea[name="description"]').value.trim();
    const pdfFile = document.getElementById('pdfFileInput').files[0];
    
    console.log('=== PDF UPLOAD DEBUG ===');
    console.log('Course Code:', courseCode);
    console.log('Section ID:', sectionId);
    console.log('PDF Title:', pdfTitle);
    console.log('File:', pdfFile ? pdfFile.name : 'No file');
    console.log('========================');
    
    // Validation
    if (!courseCode) {
        showError('Please select a course');
        return;
    }
    
    if (!sectionId) {
        showError('Please select a section');
        return;
    }
    
    if (!pdfTitle) {
        showError('Please enter PDF title');
        return;
    }
    
    if (!pdfFile) {
        showError('Please select a PDF file');
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
        
        // Create FormData
        const formData = new FormData();
        formData.append('course_code', courseCode);
        formData.append('section_id', sectionId);
        formData.append('pdf_title', pdfTitle);
        formData.append('description', description);
        formData.append('pdf_file', pdfFile);
        
        // Debug: Check FormData
        for (let pair of formData.entries()) {
            console.log(pair[0] + ':', pair[1]);
        }
        
        const response = await fetch(`${API_URL}/api/section-pdfs/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('Upload response:', result);
        
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
        
        if (result.success) {
            showSuccess('PDF uploaded successfully!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadPdfModal'));
            modal.hide();
            
            // Reset form
            form.reset();
            document.getElementById('filePreview').style.display = 'none';
            
            // Reload PDFs
            await loadSectionPdfs();
        } else {
            showError('Upload failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
        showError('Failed to upload PDF: ' + error.message);
        
        const uploadBtn = document.querySelector('#uploadPdfModal .btn-primary');
        uploadBtn.innerHTML = '<i class="fas fa-upload me-1"></i> Upload PDF';
        uploadBtn.disabled = false;
    }
}
// ==================== FIXED: Load Section PDFs ====================
async function loadSectionPdfs() {
    try {
        const container = document.getElementById('pdfListContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary mb-3"></div>
                <p class="text-muted">Loading PDFs...</p>
            </div>
        `;
        
        console.log('Fetching PDFs from:', `${API_URL}/api/section-pdfs/all`);
        
        const response = await fetch(`${API_URL}/api/section-pdfs/all`);
        const data = await response.json();
        
        console.log('PDFs response:', data);
        
        if (data.success) {
            allPdfs = data.pdfs || [];
            filteredPdfs = allPdfs;
            
            console.log(`Loaded ${allPdfs.length} PDFs`);
            
            updatePdfStats();
            displaySectionPdfs(filteredPdfs);
            populatePdfFilters();
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-circle fa-4x text-danger mb-3"></i>
                    <p class="text-muted">Error loading PDFs: ${data.message || 'Unknown error'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading PDFs:', error);
        const container = document.getElementById('pdfListContainer');
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-circle fa-4x text-danger mb-3"></i>
                <p class="text-muted">Error loading PDFs: ${error.message}</p>
            </div>
        `;
    }
}

// ==================== DISPLAY SECTION PDFS ====================
function displaySectionPdfs(pdfs) {
    const container = document.getElementById('pdfListContainer');
    const countBadge = document.getElementById('pdfListCount');
    
    if (!container) return;
    
    countBadge.textContent = pdfs.length;
    
    if (pdfs.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-file-pdf fa-4x text-muted mb-3"></i>
                <p class="text-muted">No PDFs found</p>
            </div>
        `;
        return;
    }
    
    // Group by course and section
    const groupedPdfs = {};
    pdfs.forEach(pdf => {
        const key = `${pdf.course_code}|${pdf.course_name}|${pdf.section_id}|${pdf.section_name}`;
        if (!groupedPdfs[key]) {
            groupedPdfs[key] = {
                course_code: pdf.course_code,
                course_name: pdf.course_name,
                section_id: pdf.section_id,
                section_name: pdf.section_name,
                pdfs: []
            };
        }
        groupedPdfs[key].pdfs.push(pdf);
    });
    
    let html = '';
    
    Object.values(groupedPdfs).forEach(group => {
        html += `
            <div class="col-12 mb-4">
                <div class="card border-primary">
                    <div class="card-header bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">
                                    <i class="fas fa-book me-2 text-primary"></i>
                                    ${group.course_code} - ${group.course_name}
                                    <span class="badge bg-info ms-2">${group.section_name}</span>
                                </h6>
                            </div>
                            <span class="badge bg-primary">${group.pdfs.length} PDFs</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
        `;
        
        group.pdfs.forEach(pdf => {
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
                                <button class="btn btn-success btn-sm" onclick="viewSectionPdf('${pdf.pdf_id}')">
                                    <i class="fas fa-eye me-1"></i> View
                                </button>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info" onclick="downloadSectionPdf('${pdf.pdf_id}')">
                                        <i class="fas fa-download"></i> Download
                                    </button>
                                    <button class="btn btn-warning" onclick="editSectionPdf('${pdf.pdf_id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteSectionPdf('${pdf.pdf_id}', '${pdf.pdf_title}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== UPDATE PDF STATS ====================
function updatePdfStats() {
    const totalPdfs = allPdfs.length;
    const uniqueCourses = new Set(allPdfs.map(p => p.course_code)).size;
    const uniqueSections = new Set(allPdfs.map(p => p.section_id)).size;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentPdfs = allPdfs.filter(p => new Date(p.created_at) > weekAgo).length;
    
    document.getElementById('totalPdfsCount').textContent = totalPdfs;
    document.getElementById('coursesWithPdfsCount').textContent = uniqueCourses;
    document.getElementById('sectionsWithPdfsCount').textContent = uniqueSections;
    document.getElementById('recentPdfsCount').textContent = recentPdfs;
}

// ==================== POPULATE PDF FILTERS ====================
function populatePdfFilters() {
    const courseFilter = document.getElementById('pdfCourseFilter');
    if (!courseFilter) return;
    
    const courses = [...new Set(allPdfs.map(p => p.course_code))];
    
    let options = '<option value="">All Courses</option>';
    courses.forEach(course => {
        if (course) {
            options += `<option value="${course}">${course}</option>`;
        }
    });
    
    courseFilter.innerHTML = options;
}

// ==================== FILTER SECTION PDFS ====================
function filterSectionPdfs() {
    const courseFilter = document.getElementById('pdfCourseFilter').value;
    const sectionFilter = document.getElementById('pdfSectionFilter').value;
    const searchTerm = document.getElementById('pdfSearch').value.toLowerCase();
    
    filteredPdfs = allPdfs.filter(pdf => {
        if (courseFilter && pdf.course_code !== courseFilter) return false;
        if (sectionFilter && pdf.section_id !== sectionFilter) return false;
        if (searchTerm && !pdf.pdf_title.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    displaySectionPdfs(filteredPdfs);
}

// ==================== SEARCH SECTION PDFS ====================
function searchSectionPdfs() {
    filterSectionPdfs();
}

// ==================== VIEW SECTION PDF ====================
function viewSectionPdf(pdfId) {
    window.open(`${API_URL}/api/section-pdfs/view/${pdfId}`, '_blank');
}

// ==================== DOWNLOAD SECTION PDF ====================
function downloadSectionPdf(pdfId) {
    window.open(`${API_URL}/api/section-pdfs/view/${pdfId}?download=true`, '_blank');
}

// ==================== FIXED: Edit Section PDF ====================
async function editSectionPdf(pdfId) {
    try {
        console.log('Editing PDF ID:', pdfId);
        
        // Pehle local data mein dhundho
        let pdf = allPdfs.find(p => p.pdf_id === pdfId);
        
        if (!pdf) {
            // Nahi mila to API se lao
            console.log('PDF not in local data, fetching from API...');
            const response = await fetch(`${API_URL}/api/section-pdfs/${pdfId}`);
            const result = await response.json();
            
            if (result.success && result.pdf) {
                pdf = result.pdf;
            } else {
                showError('Failed to load PDF details');
                return;
            }
        }
        
        console.log('PDF data for edit:', pdf);
        
        currentPdfEditId = pdfId;
        
        document.getElementById('editPdfId').value = pdf.pdf_id;
        document.getElementById('editPdfTitle').value = pdf.pdf_title;
        document.getElementById('editPdfDescription').value = pdf.description || '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editPdfModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading PDF for edit:', error);
        showError('Error loading PDF details: ' + error.message);
    }
}

// ==================== FIXED: Update Section PDF ====================
async function updateSectionPdf() {
    const pdfId = document.getElementById('editPdfId').value;
    const pdfTitle = document.getElementById('editPdfTitle').value.trim();
    const description = document.getElementById('editPdfDescription').value.trim();
    
    if (!pdfId) {
        showError('PDF ID not found');
        return;
    }
    
    if (!pdfTitle) {
        showError('PDF title is required');
        return;
    }
    
    try {
        const updateBtn = document.querySelector('#editPdfModal .btn-warning');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Updating...';
        updateBtn.disabled = true;
        
        // FIXED: Pehle se existing PDF ka data le lo
        const existingPdf = allPdfs.find(p => p.pdf_id === pdfId);
        
        if (!existingPdf) {
            showError('PDF not found in local data');
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
            return;
        }
        
        console.log('Existing PDF data:', existingPdf);
        
        // FIXED: Saare required fields bhejo
        const response = await fetch(`${API_URL}/api/section-pdfs/update/${pdfId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pdf_title: pdfTitle, 
                description: description,
                course_code: existingPdf.course_code,  // IMPORTANT: course_code bhejo
                section_id: existingPdf.section_id      // section_id bhi bhejo
            })
        });
        
        const result = await response.json();
        console.log('Update response:', result);
        
        updateBtn.innerHTML = originalText;
        updateBtn.disabled = false;
        
        if (result.success) {
            showSuccess('PDF updated successfully!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPdfModal'));
            modal.hide();
            
            currentPdfEditId = null;
            
            // Reload PDFs
            await loadSectionPdfs();
        } else {
            showError('Update failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating PDF:', error);
        showError('Failed to update PDF: ' + error.message);
        
        const updateBtn = document.querySelector('#editPdfModal .btn-warning');
        updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update';
        updateBtn.disabled = false;
    }
}

// ==================== DELETE SECTION PDF ====================
async function deleteSectionPdf(pdfId, pdfTitle) {
    if (!confirm(`Are you sure you want to delete "${pdfTitle}"?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/api/section-pdfs/delete/${pdfId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('PDF deleted successfully!');
            await loadSectionPdfs();
        } else {
            showError('Delete failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting PDF:', error);
        showError('Failed to delete PDF');
    }
}

// ==================== REFRESH SECTION PDFS ====================
function refreshSectionPdfs() {
    loadSectionPdfs();
    showSuccess('PDF list refreshed');
}

// ==================== FORMAT FILE SIZE ====================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}



// ==================== SYLLABUS MANAGEMENT ====================

let allSyllabus = [];
let filteredSyllabus = [];
let currentExpandedSyllabusCourse = null;

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
    
    if (typeof coursesData !== 'undefined' && coursesData.length > 0) {
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
            allSyllabus = [];
            renderSyllabusTable([]);
        }
    } catch (error) {
        hideLoading();
        showError('Network error');
        allSyllabus = [];
        renderSyllabusTable([]);
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
    
    const totalSyllabusEl = document.getElementById('totalSyllabus');
    const coursesWithSyllabusEl = document.getElementById('coursesWithSyllabus');
    const totalSubjectsEl = document.getElementById('totalSubjects');
    const totalHoursEl = document.getElementById('totalHours');
    
    if (totalSyllabusEl) totalSyllabusEl.textContent = totalSyllabus;
    if (coursesWithSyllabusEl) coursesWithSyllabusEl.textContent = uniqueCourses;
    if (totalSubjectsEl) totalSubjectsEl.textContent = totalSubjects;
    if (totalHoursEl) totalHoursEl.textContent = totalHours;
}

// Filter syllabus
function filterSyllabus() {
    const courseFilter = document.getElementById('syllabusCourseFilter')?.value || '';
    const searchText = document.getElementById('searchSyllabus')?.value.toLowerCase() || '';
    const showActiveOnly = document.getElementById('showActiveOnly')?.checked || false;
    
    filteredSyllabus = allSyllabus.filter(syllabus => {
        if (courseFilter && syllabus.course_code !== courseFilter) return false;
        if (showActiveOnly && !syllabus.is_active) return false;
        if (searchText) {
            const searchIn = (
                syllabus.syllabus_title + ' ' + 
                (syllabus.description || '') + ' ' + 
                (syllabus.course_name || '')
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

// ============ RENDER SYLLABUS WITH COURSE-WISE GROUPING AND TOGGLE ============
function renderSyllabusTable() {
    const tbody = document.getElementById('syllabusTableBody');
    const countBadge = document.getElementById('syllabusCount');
    
    if (!tbody) return;
    
    if (countBadge) countBadge.textContent = filteredSyllabus.length;
    
    if (filteredSyllabus.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No syllabus found.</p>
                    <button class="btn btn-primary btn-sm" onclick="showAddSyllabusModal()">
                        <i class="fas fa-plus me-1"></i> Add First Syllabus
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group syllabus by course
    const syllabusByCourse = {};
    filteredSyllabus.forEach(syllabus => {
        const courseKey = `${syllabus.course_code}|${syllabus.course_name || syllabus.course_code}`;
        if (!syllabusByCourse[courseKey]) {
            syllabusByCourse[courseKey] = [];
        }
        syllabusByCourse[courseKey].push(syllabus);
    });
    
    let html = '';
    
    // Sort courses alphabetically
    const sortedCourses = Object.keys(syllabusByCourse).sort();
    
    sortedCourses.forEach(courseKey => {
        const entries = syllabusByCourse[courseKey];
        const [courseCode, courseName] = courseKey.split('|');
        const totalSyllabus = entries.length;
        
        // Count active syllabus
        const activeSyllabus = entries.filter(e => e.is_active === true).length;
        const inactiveSyllabus = totalSyllabus - activeSyllabus;
        
        // Calculate total subjects and hours for this course
        let courseSubjects = 0;
        let courseHours = 0;
        entries.forEach(s => {
            courseSubjects += s.subjects_count || 0;
            courseHours += s.total_duration || 0;
        });
        
        // Create unique course ID for toggle
        const courseId = 'syllabus-course-' + courseCode.replace(/[^a-zA-Z0-9]/g, '-');
        
        // ============ COURSE HEADER ROW ============
        html += `
            <tr class="syllabus-course-header-row bg-light" style="cursor: pointer;" onclick="toggleSyllabusCourseDetails('${courseId}', event)">
                <td colspan="8" class="py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                <i class="fas fa-book me-2 text-primary"></i>
                                <strong>${escapeHtml(courseCode)}</strong> - ${escapeHtml(courseName || courseCode)}
                                <span class="badge bg-primary ms-2">${totalSyllabus} Syllabus</span>
                            </h6>
                            <small class="text-muted">
                                <i class="fas fa-check-circle text-success me-1"></i> Active: ${activeSyllabus}
                                <span class="mx-2">|</span>
                                <i class="fas fa-ban text-danger me-1"></i> Inactive: ${inactiveSyllabus}
                                <span class="mx-2">|</span>
                                <i class="fas fa-book-open me-1"></i> Subjects: ${courseSubjects}
                                <span class="mx-2">|</span>
                                <i class="fas fa-clock me-1"></i> Hours: ${courseHours}
                            </small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success" onclick="addSyllabusForCourse('${escapeHtml(courseCode)}', event)" title="Add New Syllabus">
                                <i class="fas fa-plus me-1"></i> Add Syllabus
                            </button>
                            <button class="btn btn-outline-info" onclick="toggleSyllabusCourseDetails('${courseId}', event)" title="Toggle Syllabus">
                                <i class="fas fa-chevron-down" id="toggle-syllabus-course-icon-${courseId}"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        
        // ============ COURSE DETAILS ROW (Initially Hidden) ============
        html += `<tr class="syllabus-course-details-row ${courseId}" style="display: none;">`;
        html += `<td colspan="8" class="p-0" style="background: #f8f9fa;">`;
        html += `<div class="syllabus-course-details-container p-3">`;
        
        // ============ SYLLABUS ENTRIES FOR THIS COURSE ============
        if (entries.length === 0) {
            html += `
                <div class="alert alert-info mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    No syllabus found for this course.
                    <button class="btn btn-sm btn-primary ms-3" onclick="addSyllabusForCourse('${escapeHtml(courseCode)}', event)">
                        <i class="fas fa-plus me-1"></i> Add Syllabus
                    </button>
                </div>
            `;
        } else {
            html += `
                <div class="table-responsive">
                    <table class="table table-sm table-bordered table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th width="50">#</th>
                                <th>Syllabus Title</th>
                                <th>Description</th>
                                <th>Duration</th>
                                <th>Subjects</th>
                                <th>Status</th>
                                <th width="150">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            entries.forEach((syllabus, index) => {
                const isActive = syllabus.is_active === true;
                const statusClass = isActive ? 'success' : 'danger';
                const statusText = isActive ? 'Active' : 'Inactive';
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <strong>${escapeHtml(syllabus.syllabus_title)}</strong><br>
                            <small class="text-muted">ID: ${syllabus.syllabus_id}</small>
                        </td>
                        <td>${escapeHtml(syllabus.description ? (syllabus.description.substring(0, 50) + (syllabus.description.length > 50 ? '...' : '')) : '-')}</td>
                        <td><span class="badge bg-info">${syllabus.total_duration || 0} hrs</span></td>
                        <td><span class="badge bg-secondary">${syllabus.subjects_count || 0}</span></td>
                        <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-info" onclick="viewSyllabus('${syllabus.syllabus_id}', event)" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-warning" onclick="editSyllabus('${syllabus.syllabus_id}', event)" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-${isActive ? 'secondary' : 'success'}" 
                                        onclick="toggleSyllabusStatus('${syllabus.syllabus_id}', event)" title="Toggle Status">
                                    <i class="fas fa-power-off"></i>
                                </button>
                                <button class="btn btn-danger" onclick="deleteSyllabus('${syllabus.syllabus_id}', event)" title="Delete">
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
        }
        
        html += `</div>`; // Close syllabus-course-details-container
        html += `</td>`;
        html += `</tr>`; // Close syllabus-course-details-row
    });
    
    tbody.innerHTML = html;
}

// ============ SYLLABUS TOGGLE FUNCTIONS ============

// Toggle course details (show/hide entire course section)
function toggleSyllabusCourseDetails(courseId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const courseDetailsRow = document.querySelector(`tr.syllabus-course-details-row.${courseId}`);
    const toggleIcon = document.getElementById(`toggle-syllabus-course-icon-${courseId}`);
    
    if (courseDetailsRow) {
        const isHidden = courseDetailsRow.style.display === 'none';
        
        // Hide all other expanded courses first
        if (isHidden) {
            // Close all other course details
            document.querySelectorAll('tr.syllabus-course-details-row').forEach(row => {
                row.style.display = 'none';
            });
            
            // Reset all toggle icons
            document.querySelectorAll('[id^="toggle-syllabus-course-icon-"]').forEach(icon => {
                icon.className = 'fas fa-chevron-down';
            });
        }
        
        // Toggle current course
        courseDetailsRow.style.display = isHidden ? '' : 'none';
        
        if (toggleIcon) {
            toggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
        
        // Set current expanded course
        currentExpandedSyllabusCourse = isHidden ? courseId : null;
    }
}

// ============ COURSE CLICK HANDLER - FILTER BY COURSE AND EXPAND ============
function filterSyllabusByCourse(courseCode) {
    if (!allSyllabus || allSyllabus.length === 0) {
        showError('No syllabus data available');
        return;
    }
    
    // Filter entries for selected course
    const filtered = allSyllabus.filter(entry => 
        entry.course_code && entry.course_code.toString() === courseCode.toString()
    );
    
    // Set filter dropdown
    const courseFilter = document.getElementById('syllabusCourseFilter');
    if (courseFilter) {
        courseFilter.value = courseCode;
    }
    
    // Render filtered syllabus
    filteredSyllabus = filtered;
    renderSyllabusTable();
    
    // Auto-expand this course
    setTimeout(() => {
        const courseId = 'syllabus-course-' + courseCode.replace(/[^a-zA-Z0-9]/g, '-');
        toggleSyllabusCourseDetails(courseId);
    }, 100);
}

// ============ SYLLABUS CRUD OPERATIONS ============

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

// Add syllabus for specific course
function addSyllabusForCourse(courseCode, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Check if modal exists
    const modalElement = document.getElementById('syllabusModal');
    if (!modalElement) {
        showError('Syllabus modal not found');
        return;
    }
    
    // Reset form
    resetSyllabusForm();
    document.getElementById('editSyllabusId').value = '';
    
    // Set course in modal
    const courseSelect = document.getElementById('syllabusCourse');
    if (courseSelect) {
        Array.from(courseSelect.options).forEach(option => {
            if (option.value === courseCode || option.text.includes(courseCode)) {
                option.selected = true;
            }
        });
    }
    
    // Set modal title
    const modalTitle = document.querySelector('#syllabusModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-plus me-2"></i>Add Syllabus - ${escapeHtml(courseCode)}`;
    }
    
    const modalHeader = document.getElementById('syllabusModalHeader');
    if (modalHeader) {
        modalHeader.className = 'modal-header bg-success text-white';
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Reset syllabus form
function resetSyllabusForm() {
    const form = document.getElementById('syllabusForm');
    if (form) {
        form.reset();
    }
    
    const statusSelect = document.getElementById('syllabusStatus');
    if (statusSelect) statusSelect.value = 'active';
    
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
async function viewSyllabus(syllabusId, event) {
    if (event) event.stopPropagation();
    
    try {
        showLoading('Loading...');
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/${syllabusId}`);
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            const syllabus = result.syllabus;
            showSyllabusDetailsModal(syllabus);
        } else {
            showError('Failed to load syllabus details');
        }
    } catch (error) {
        hideLoading();
        showError('Error loading details');
    }
}

// Show syllabus details modal
function showSyllabusDetailsModal(syllabus) {
    // Create modal if not exists
    let modalEl = document.getElementById('syllabusDetailsModal');
    
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'syllabusDetailsModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        document.body.appendChild(modalEl);
    }
    
    const isActive = syllabus.is_active === true;
    const statusClass = isActive ? 'success' : 'danger';
    const statusText = isActive ? 'Active' : 'Inactive';
    
    let subjectsHtml = '';
    if (syllabus.subjects && syllabus.subjects.length > 0) {
        syllabus.subjects.forEach((subject, index) => {
            subjectsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${escapeHtml(subject.subject_name)}</strong></td>
                    <td><span class="badge bg-info">${subject.duration_hours || 0} hrs</span></td>
                    <td>${escapeHtml(subject.topics || '-')}</td>
                </tr>
            `;
        });
    } else {
        subjectsHtml = `
            <tr>
                <td colspan="4" class="text-center py-3">
                    <i class="fas fa-info-circle text-muted me-2"></i>
                    No subjects added
                </td>
            </tr>
        `;
    }
    
    modalEl.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-book-open me-2"></i>
                        Syllabus Details
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0">Syllabus Information</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Course:</strong><br> ${escapeHtml(syllabus.course_name)} (${escapeHtml(syllabus.course_code)})</p>
                                    <p><strong>Title:</strong><br> ${escapeHtml(syllabus.syllabus_title)}</p>
                                    <p><strong>Syllabus ID:</strong><br> ${escapeHtml(syllabus.syllabus_id)}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Duration:</strong><br> <span class="badge bg-info fs-6">${syllabus.total_duration || 0} hours</span></p>
                                    <p><strong>Total Subjects:</strong><br> <span class="badge bg-secondary fs-6">${syllabus.subjects_count || 0}</span></p>
                                    <p><strong>Status:</strong><br> <span class="badge bg-${statusClass} fs-6">${statusText}</span></p>
                                </div>
                            </div>
                            ${syllabus.description ? `
                            <div class="mt-2">
                                <p><strong>Description:</strong></p>
                                <p class="text-muted">${escapeHtml(syllabus.description)}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header bg-light d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">Subjects</h6>
                            <span class="badge bg-primary">${syllabus.subjects_count || 0} Subjects</span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="50">#</th>
                                            <th>Subject Name</th>
                                            <th>Duration</th>
                                            <th>Topics</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${subjectsHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-warning" onclick="editSyllabus('${syllabus.syllabus_id}')" data-bs-dismiss="modal">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Edit syllabus
async function editSyllabus(syllabusId, event) {
    if (event) event.stopPropagation();
    
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
            document.getElementById('syllabusDuration').value = syllabus.total_duration || 40;
            document.getElementById('syllabusStatus').value = syllabus.is_active ? 'active' : 'inactive';
            
            // Update modal
            const modalHeader = document.getElementById('syllabusModalHeader');
            if (modalHeader) {
                modalHeader.className = 'modal-header bg-warning text-dark';
            }
            
            const modalTitle = document.querySelector('#syllabusModal .modal-title');
            if (modalTitle) {
                modalTitle.innerHTML = `<i class="fas fa-edit me-2"></i>Edit Syllabus - ${escapeHtml(syllabus.course_code)}`;
            }
            
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
                                   value="${escapeHtml(subject.subject_name)}" required>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm subject-duration" 
                                   value="${subject.duration_hours || 4}" min="1" max="100">
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm subject-topics" 
                                   value="${escapeHtml(subject.topics || '')}">
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
        status: status === 'active',
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
            showSuccess('Syllabus saved successfully!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('syllabusModal'));
            if (modal) modal.hide();
            await loadSyllabusData();
        } else {
            showError('Save failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Save error:', error);
        showError('Network error');
    }
}

// Toggle syllabus status
async function toggleSyllabusStatus(syllabusId, event) {
    if (event) event.stopPropagation();
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/toggle-status/${syllabusId}`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Status updated successfully');
            await loadSyllabusData();
        } else {
            showError('Update failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        showError('Error updating status');
    }
}

// Delete syllabus
async function deleteSyllabus(syllabusId, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this syllabus?')) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/syllabus/delete/${syllabusId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Syllabus deleted successfully');
            await loadSyllabusData();
        } else {
            showError('Delete failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        showError('Error deleting syllabus');
    }
}

// ============ UTILITY FUNCTIONS ============

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export syllabus
function exportSyllabus() {
    const data = filteredSyllabus.length > 0 ? filteredSyllabus : allSyllabus;
    
    if (data.length === 0) {
        showError('No data to export');
        return;
    }
    
    let csv = 'Course Code,Course Name,Syllabus Title,Description,Duration (hrs),Subjects Count,Status\n';
    
    data.forEach(s => {
        csv += `"${s.course_code || ''}","${s.course_name || ''}","${s.syllabus_title || ''}",`;
        csv += `"${s.description || ''}",${s.total_duration || 0},${s.subjects_count || 0},"${s.is_active ? 'Active' : 'Inactive'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syllabus_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess('Syllabus exported successfully');
}

// Refresh
function refreshSyllabus() {
    loadSyllabusData();
}

// Helper functions
function showLoading(msg) {
    console.log('Loading:', msg);
}

function hideLoading() {
    console.log('Loading hidden');
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

console.log('✅ Syllabus Management loaded with Course-wise grouping and Toggle!');



// ==================== TIME TABLE MANAGEMENT ====================

let allTimetable = [];
let filteredTimetableData = [];
let currentExpandedCourse = null;
let currentExpandedDay = null;

// Add to your DOMContentLoaded event
document.getElementById('timetable-tab')?.addEventListener('shown.bs.tab', function() {
    initTimetableTab();
    loadTeachersForTimetable(); // Pre-load teachers
});

function initTimetableTab() {
    populateTimetableCourseDropdown();
    loadTimetableData();
    loadTeachersForTimetable(); // Load teachers when tab opens
}

function initTimetableTab() {
    populateTimetableCourseDropdowns();
    loadTimetableData();
}



// Load timetable data
async function loadTimetableData() {
    try {
        showLoading('Loading timetable...');
        
        const response = await fetch('https://aacem-backend.onrender.com/api/timetable/all');
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            allTimetable = result.timetable || [];
            filterTimetable();
        } else {
            showError('Failed to load timetable');
            allTimetable = [];
            renderTimetableTable([]);
        }
    } catch (error) {
        hideLoading();
        showError('Network error');
        allTimetable = [];
        renderTimetableTable([]);
    }
}

// Filter timetable
function filterTimetable() {
    const courseFilter = document.getElementById('timetableCourseFilter')?.value || '';
    const dayFilter = document.getElementById('timetableDayFilter')?.value || '';
    const showActiveOnly = document.getElementById('showActiveTimetableOnly')?.checked || false;
    
    let filtered = allTimetable.filter(entry => {
        if (courseFilter && entry.course_code !== courseFilter) return false;
        if (dayFilter && entry.day_of_week !== dayFilter) return false;
        if (showActiveOnly && !entry.is_active) return false;
        return true;
    });
    
    filteredTimetableData = filtered;
    renderTimetableTable(filtered);
}

// ============ MAIN RENDER FUNCTION WITH DAY-WISE TOGGLE INSIDE COURSE ============
function renderTimetableTable(timetableList) {
    const tbody = document.getElementById('timetableTableBody');
    const countBadge = document.getElementById('timetableCount');
    
    if (!tbody) return;
    
    countBadge.textContent = timetableList.length;
    
    if (timetableList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No timetable entries found.</p>
                    <button class="btn btn-primary btn-sm" onclick="showAddTimetableModal()">
                        <i class="fas fa-plus me-1"></i> Add First Timetable
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Group timetable by course
    const timetableByCourse = {};
    timetableList.forEach(entry => {
        const courseKey = `${entry.course_code}|${entry.course_name || entry.course_code}`;
        if (!timetableByCourse[courseKey]) {
            timetableByCourse[courseKey] = [];
        }
        timetableByCourse[courseKey].push(entry);
    });
    
    // Day order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let html = '';
    
    // Sort courses alphabetically
    const sortedCourses = Object.keys(timetableByCourse).sort();
    
    sortedCourses.forEach(courseKey => {
        const entries = timetableByCourse[courseKey];
        const [courseCode, courseName] = courseKey.split('|');
        const totalClasses = entries.length;
        
        // Count active classes
        const activeClasses = entries.filter(e => 
            e.is_active === true || e.is_active === 1 || e.is_active === '1' || e.is_active === 'true'
        ).length;
        
        const inactiveClasses = totalClasses - activeClasses;
        
        // Group entries by day for this course
        const entriesByDay = {};
        dayOrder.forEach(day => {
            entriesByDay[day] = entries.filter(e => e.day_of_week === day);
        });
        
        // Sort each day's entries by time
        dayOrder.forEach(day => {
            entriesByDay[day].sort((a, b) => {
                return (a.start_time || '').localeCompare(b.start_time || '');
            });
        });
        
        // Create unique course ID
        const courseId = 'course-' + courseCode.replace(/[^a-zA-Z0-9]/g, '-');
        
        // ============ COURSE HEADER ROW ============
        html += `
            <tr class="course-header-row bg-light" style="cursor: pointer;" onclick="toggleCourseDetails('${courseId}', event)">
                <td colspan="9" class="py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                <i class="fas fa-book me-2 text-primary"></i>
                                <strong>${escapeHtml(courseCode)}</strong> - ${escapeHtml(courseName || courseCode)}
                                <span class="badge bg-primary ms-2">${totalClasses} Classes</span>
                            </h6>
                            <small class="text-muted">
                                <i class="fas fa-check-circle text-success me-1"></i> Active: ${activeClasses}
                                <span class="mx-2">|</span>
                                <i class="fas fa-ban text-danger me-1"></i> Inactive: ${inactiveClasses}
                            </small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success" onclick="addTimetableForCourse('${escapeHtml(courseCode)}', event)" title="Add New Class">
                                <i class="fas fa-plus me-1"></i> Add Class
                            </button>
                            <button class="btn btn-outline-info" onclick="toggleCourseDetails('${courseId}', event)" title="Toggle Course Details">
                                <i class="fas fa-chevron-down" id="toggle-course-icon-${courseId}"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        
        // ============ COURSE DETAILS ROW (Initially Hidden) ============
        html += `<tr class="course-details-row ${courseId}" style="display: none;">`;
        html += `<td colspan="9" class="p-0" style="background: #f8f9fa;">`;
        html += `<div class="course-details-container p-3">`;
        
        // ============ DAY BUTTONS FOR THIS COURSE ============
        html += `<div class="day-buttons-container mb-3">`;
        html += `<div class="btn-group w-100" role="group">`;
        
        dayOrder.forEach(day => {
            const dayEntries = entriesByDay[day];
            const classCount = dayEntries.length;
            const dayId = `${courseId}-${day}`;
            const isActive = currentExpandedCourse === courseId && currentExpandedDay === day;
            
            html += `
                <button type="button" 
                        class="btn ${classCount > 0 ? 'btn-outline-primary' : 'btn-outline-secondary'} day-toggle-btn 
                               ${isActive ? 'active' : ''}"
                        onclick="toggleDayTimetable('${courseId}', '${day}', event)"
                        id="day-btn-${dayId}">
                    <i class="fas fa-calendar-day me-1"></i> ${day}
                    ${classCount > 0 ? `<span class="badge bg-primary ms-1">${classCount}</span>` : ''}
                </button>
            `;
        });
        
        html += `</div>`;
        html += `</div>`;
        
        // ============ DAY WISE TIMETABLE TABLES (Initially Hidden) ============
        dayOrder.forEach(day => {
            const dayEntries = entriesByDay[day];
            const dayId = `${courseId}-${day}`;
            const displayStyle = (currentExpandedCourse === courseId && currentExpandedDay === day) ? 'block' : 'none';
            
            html += `<div id="day-timetable-${dayId}" class="day-timetable-container" style="display: ${displayStyle};">`;
            
            if (dayEntries.length === 0) {
                html += `
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        No classes scheduled on ${day} for this course.
                        <button class="btn btn-sm btn-primary ms-3" onclick="addTimetableForCourse('${escapeHtml(courseCode)}', '${day}', event)">
                            <i class="fas fa-plus me-1"></i> Add Class
                        </button>
                    </div>
                `;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th width="50">#</th>
                                    <th>Time</th>
                                    <th>Subject</th>
                                    <th>Teacher</th>
                                    <th>Room</th>
                                    <th>Status</th>
                                    <th width="120">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                dayEntries.forEach((entry, index) => {
                    const isActive = entry.is_active === true || entry.is_active === 1 || entry.is_active === '1' || entry.is_active === 'true';
                    const statusClass = isActive ? 'success' : 'danger';
                    const statusText = isActive ? 'Active' : 'Inactive';
                    
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>
                                <span class="badge bg-info">${formatTime(entry.start_time)}</span>
                                -
                                <span class="badge bg-info">${formatTime(entry.end_time)}</span>
                            </td>
                            <td>${escapeHtml(entry.subject || '-')}</td>
                            <td>${escapeHtml(entry.teacher_name || '-')}</td>
                            <td>${escapeHtml(entry.room_number || '-')}</td>
                            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-warning" onclick="editTimetable('${entry.timetable_id || ''}', event)">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${isActive ? 'secondary' : 'success'}" 
                                            onclick="toggleTimetableStatus('${entry.timetable_id || ''}', event)">
                                        <i class="fas fa-power-off"></i>
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteTimetable('${entry.timetable_id || ''}', event)">
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
            }
            
            html += `</div>`; // Close day-timetable-container
        });
        
        html += `</div>`; // Close course-details-container
        html += `</td>`;
        html += `</tr>`; // Close course-details-row
    });
    
    tbody.innerHTML = html;
}

// ============ TOGGLE FUNCTIONS ============

// Toggle course details (show/hide entire course section)
function toggleCourseDetails(courseId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const courseDetailsRow = document.querySelector(`tr.course-details-row.${courseId}`);
    const toggleIcon = document.getElementById(`toggle-course-icon-${courseId}`);
    
    if (courseDetailsRow) {
        const isHidden = courseDetailsRow.style.display === 'none';
        
        // Hide all other expanded courses first
        if (isHidden) {
            // Close all other course details
            document.querySelectorAll('tr.course-details-row').forEach(row => {
                row.style.display = 'none';
            });
            
            // Reset all toggle icons
            document.querySelectorAll('[id^="toggle-course-icon-"]').forEach(icon => {
                icon.className = 'fas fa-chevron-down';
            });
        }
        
        // Toggle current course
        courseDetailsRow.style.display = isHidden ? '' : 'none';
        
        if (toggleIcon) {
            toggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
        
        // Reset expanded day when toggling course
        if (isHidden) {
            currentExpandedCourse = courseId;
            currentExpandedDay = null;
        } else {
            currentExpandedCourse = null;
            currentExpandedDay = null;
        }
    }
}

// Toggle day timetable (show/hide specific day's timetable)
function toggleDayTimetable(courseId, day, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const dayTimetableDiv = document.getElementById(`day-timetable-${courseId}-${day}`);
    const dayBtn = document.getElementById(`day-btn-${courseId}-${day}`);
    
    if (dayTimetableDiv) {
        const isHidden = dayTimetableDiv.style.display === 'none' || dayTimetableDiv.style.display === '';
        
        // Hide all other day timetables for this course
        const allDayDivs = document.querySelectorAll(`[id^="day-timetable-${courseId}-"]`);
        allDayDivs.forEach(div => {
            div.style.display = 'none';
        });
        
        // Remove active class from all day buttons
        const allDayBtns = document.querySelectorAll(`[id^="day-btn-${courseId}-"]`);
        allDayBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected day
        if (isHidden) {
            dayTimetableDiv.style.display = 'block';
            if (dayBtn) {
                dayBtn.classList.add('active');
            }
            currentExpandedDay = day;
        } else {
            dayTimetableDiv.style.display = 'none';
            currentExpandedDay = null;
        }
    }
}

// ============ COURSE CLICK HANDLER - FILTER BY COURSE AND EXPAND ============
function filterTimetableByCourse(courseCode) {
    if (!allTimetable || allTimetable.length === 0) {
        showError('No timetable data available');
        return;
    }
    
    // Filter entries for selected course
    const filtered = allTimetable.filter(entry => 
        entry.course_code && entry.course_code.toString() === courseCode.toString()
    );
    
    // Set filter dropdown
    const courseFilter = document.getElementById('timetableCourseFilter');
    if (courseFilter) {
        courseFilter.value = courseCode;
    }
    
    // Render filtered timetable
    filteredTimetableData = filtered;
    renderTimetableTable(filtered);
    
    // Auto-expand this course
    setTimeout(() => {
        const courseId = 'course-' + courseCode.replace(/[^a-zA-Z0-9]/g, '-');
        toggleCourseDetails(courseId);
    }, 100);
}

// ============ VIEW COURSE TIMETABLE IN MODAL ============
function viewCourseTimetableDetails(courseCode, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!allTimetable || allTimetable.length === 0) {
        showError('No timetable data available');
        return;
    }
    
    // Filter timetable for this course
    const courseTimetable = allTimetable.filter(entry => 
        entry.course_code && entry.course_code.toString() === courseCode.toString()
    );
    
    if (courseTimetable.length === 0) {
        showError(`No timetable found for course: ${courseCode}`);
        return;
    }
    
    // Group by day
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groupedByDay = {};
    
    dayOrder.forEach(day => {
        groupedByDay[day] = courseTimetable.filter(e => e.day_of_week === day);
    });
    
    // Show in modal
    showCourseTimetableModal(courseCode, groupedByDay);
}

// ============ SHOW COURSE TIMETABLE MODAL WITH DAY WISE TABS ============
function showCourseTimetableModal(courseCode, groupedByDay) {
    // Create modal if not exists
    let modalEl = document.getElementById('courseTimetableModal');
    
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'courseTimetableModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        document.body.appendChild(modalEl);
    }
    
    // Create tabs
    let tabsNav = '';
    let tabsContent = '';
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayOrder.forEach((day, index) => {
        const dayEntries = groupedByDay[day] || [];
        const activeClass = index === 0 ? 'active' : '';
        const showClass = index === 0 ? 'show active' : '';
        
        tabsNav += `
            <li class="nav-item" role="presentation">
                <button class="nav-link ${activeClass}" 
                        id="${day}-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#${day}" 
                        type="button" 
                        role="tab">
                    <i class="fas fa-calendar-day me-1"></i> ${day}
                    <span class="badge bg-primary ms-1">${dayEntries.length}</span>
                </button>
            </li>
        `;
        
        let tableRows = '';
        if (dayEntries.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-info-circle text-muted me-2"></i>
                        No classes scheduled on ${day}
                    </td>
                </tr>
            `;
        } else {
            dayEntries.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
            
            dayEntries.forEach((entry, idx) => {
                const isActive = entry.is_active === true || entry.is_active === 1 || entry.is_active === '1';
                const statusClass = isActive ? 'success' : 'danger';
                const statusText = isActive ? 'Active' : 'Inactive';
                
                tableRows += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${formatTime(entry.start_time)} - ${formatTime(entry.end_time)}</td>
                        <td>${escapeHtml(entry.subject || '-')}</td>
                        <td>${escapeHtml(entry.teacher_name || '-')}</td>
                        <td>${escapeHtml(entry.room_number || '-')}</td>
                        <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                    </tr>
                `;
            });
        }
        
        tabsContent += `
            <div class="tab-pane fade ${showClass}" id="${day}" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>#</th>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Teacher</th>
                                <th>Room</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    modalEl.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-calendar-alt me-2"></i>
                        Complete Timetable: ${escapeHtml(courseCode)}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs mb-3" role="tablist">
                        ${tabsNav}
                    </ul>
                    <div class="tab-content">
                        ${tabsContent}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="addTimetableForCourse('${escapeHtml(courseCode)}')">
                        <i class="fas fa-plus me-1"></i> Add New Class
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// ============ ADD TIMETABLE FOR SPECIFIC COURSE/DAY ============
function addTimetableForCourse(courseCode, day = null, event) {
    if (event) {
        event.stopPropagation();
    }
    
    resetTimetableForm();
    document.getElementById('editTimetableId').value = '';
    
    // Set course in modal
    const courseSelect = document.getElementById('timetableCourse');
    if (courseSelect) {
        Array.from(courseSelect.options).forEach(option => {
            if (option.value === courseCode || option.text.includes(courseCode)) {
                option.selected = true;
            }
        });
    }
    
    // Set day if provided
    if (day) {
        const daySelect = document.getElementById('timetableDay');
        if (daySelect) {
            daySelect.value = day;
        }
    }
    
    document.querySelector('#timetableModal .modal-title').innerHTML = 
        `<i class="fas fa-plus me-2"></i>Add Timetable Entry - ${escapeHtml(courseCode)}${day ? ` (${day})` : ''}`;
    
    const modal = new bootstrap.Modal(document.getElementById('timetableModal'));
    modal.show();
}

// ============ CRUD OPERATIONS ============



// Reset form
function resetTimetableForm() {
    const form = document.getElementById('timetableForm');
    if (form) form.reset();
    
    const statusCheck = document.getElementById('timetableStatus');
    if (statusCheck) statusCheck.checked = true;
}

// ==================== GLOBAL VARIABLES ====================
let teacherSubjectsCache = {}; // Cache for teacher subjects

// ==================== LOAD TEACHERS FOR TIMETABLE ====================
async function loadTeachersForTimetable() {
    try {
        const response = await fetch(`${API_URL}/api/teachers/all`);
        const data = await response.json();
        
        if (data.success) {
            teachersData = data.teachers || [];
            
            const teacherSelect = document.getElementById('timetableTeacher');
            let options = '<option value="">Choose teacher...</option>';
            
            teachersData.forEach(teacher => {
                options += `<option value="${teacher.teacher_id}">${teacher.name} (${teacher.teacher_id})</option>`;
            });
            
            teacherSelect.innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        showError('Failed to load teachers');
    }
}

// ==================== LOAD TEACHER SUBJECTS FOR TIMETABLE ====================
async function loadTeacherSubjectsForTimetable() {
    const teacherSelect = document.getElementById('timetableTeacher');
    const subjectSelect = document.getElementById('timetableSubject');
    const teacherId = teacherSelect.value;
    
    if (!teacherId) {
        subjectSelect.innerHTML = '<option value="">Select teacher first...</option>';
        return;
    }
    
    // Show loading
    subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';
    subjectSelect.disabled = true;
    
    try {
        // Check cache first
        if (teacherSubjectsCache[teacherId]) {
            populateSubjectDropdown(teacherSubjectsCache[teacherId], subjectSelect);
            subjectSelect.disabled = false;
            return;
        }
        
        // Fetch from API
        const response = await fetch(`${API_URL}/api/teacher-subjects/${teacherId}`);
        const data = await response.json();
        
        if (data.success) {
            // Store in cache
            teacherSubjectsCache[teacherId] = data.subjects;
            populateSubjectDropdown(data.subjects, subjectSelect);
        } else {
            subjectSelect.innerHTML = '<option value="">No subjects found</option>';
        }
    } catch (error) {
        console.error('Error loading teacher subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    } finally {
        subjectSelect.disabled = false;
    }
}

// ==================== POPULATE SUBJECT DROPDOWN ====================
function populateSubjectDropdown(subjects, subjectSelect) {
    if (!subjects || subjects.length === 0) {
        subjectSelect.innerHTML = '<option value="">No subjects assigned</option>';
        return;
    }
    
    let options = '<option value="">Select subject...</option>';
    
    // Show all subjects
    subjects.forEach(item => {
        options += `<option value="${item.subject}">${item.subject} (${item.course_code} - ${item.section_name})</option>`;
    });
    
    // Also add option to show all subjects without section (if needed)
    const uniqueSubjects = [...new Set(subjects.map(s => s.subject))];
    if (uniqueSubjects.length > 0) {
        options += '<option value="" disabled>━━━━━━━━━━━━━━━━━━</option>';
        uniqueSubjects.forEach(subj => {
            options += `<option value="${subj}">${subj} (All Sections)</option>`;
        });
    }
    
    subjectSelect.innerHTML = options;
}

// ==================== UPDATED: Show Add Timetable Modal ====================
function showAddTimetableModal() {
    resetTimetableForm();
    document.getElementById('editTimetableId').value = '';
    
    // Load courses
    populateTimetableCourseDropdown();
    
    // Load teachers
    loadTeachersForTimetable();
    
    // Reset subject dropdown
    document.getElementById('timetableSubject').innerHTML = '<option value="">Select teacher first...</option>';
    
    document.querySelector('#timetableModal .modal-title').innerHTML = 
        '<i class="fas fa-plus me-2"></i>Add Timetable Entry';
    
    const modal = new bootstrap.Modal(document.getElementById('timetableModal'));
    modal.show();
}

// ==================== UPDATED: Edit Timetable ====================
async function editTimetable(timetableId, event) {
    if (event) event.stopPropagation();
    
    try {
        const entry = allTimetable.find(t => t.timetable_id === timetableId);
        if (!entry) {
            showError('Entry not found');
            return;
        }
        
        // Set form values
        document.getElementById('editTimetableId').value = entry.timetable_id;
        document.getElementById('timetableCourse').value = entry.course_code;
        document.getElementById('timetableDay').value = entry.day_of_week;
        document.getElementById('timetableStartTime').value = entry.start_time;
        document.getElementById('timetableEndTime').value = entry.end_time;
        document.getElementById('timetableRoom').value = entry.room_number || '';
        document.getElementById('timetableStatus').checked = entry.is_active === true || entry.is_active === 1 || entry.is_active === '1';
        
        // Load teachers first
        await loadTeachersForTimetable();
        
        // Set teacher
        const teacherSelect = document.getElementById('timetableTeacher');
        if (entry.teacher_name) {
            // Find teacher by name (approximate)
            const teacher = teachersData.find(t => t.name === entry.teacher_name);
            if (teacher) {
                teacherSelect.value = teacher.teacher_id;
                
                // Load subjects for this teacher
                await loadTeacherSubjectsForTimetable();
                
                // Set subject after a delay
                setTimeout(() => {
                    document.getElementById('timetableSubject').value = entry.subject || '';
                }, 500);
            }
        }
        
        document.querySelector('#timetableModal .modal-title').innerHTML = 
            '<i class="fas fa-edit me-2"></i>Edit Timetable Entry';
        
        const modal = new bootstrap.Modal(document.getElementById('timetableModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading entry for edit:', error);
        showError('Error loading entry');
    }
}

// ==================== POPULATE TIMETABLE COURSE DROPDOWN ====================
function populateTimetableCourseDropdown() {
    const select = document.getElementById('timetableCourse');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select course...</option>';
    
    if (typeof coursesData !== 'undefined' && coursesData.length > 0) {
        coursesData.filter(c => c.is_active).forEach(course => {
            select.innerHTML += `<option value="${course.course_code}">${course.course_name} (${course.course_code})</option>`;
        });
    }
}

// ==================== UPDATED: Save Timetable ====================
async function saveTimetable() {
    const timetableId = document.getElementById('editTimetableId').value;
    const courseCode = document.getElementById('timetableCourse').value;
    const dayOfWeek = document.getElementById('timetableDay').value;
    const startTime = document.getElementById('timetableStartTime').value;
    const endTime = document.getElementById('timetableEndTime').value;
    const teacherId = document.getElementById('timetableTeacher').value;
    const subject = document.getElementById('timetableSubject').value;
    const roomNumber = document.getElementById('timetableRoom').value.trim();
    const isActive = document.getElementById('timetableStatus').checked;
    
    // Validation
    if (!courseCode || !dayOfWeek || !startTime || !endTime || !teacherId || !subject) {
        showError('Please fill all required fields');
        return;
    }
    
    // Get teacher name
    const teacher = teachersData.find(t => t.teacher_id === teacherId);
    const teacherName = teacher ? teacher.name : '';
    
    const data = {
        timetable_id: timetableId || null,
        course_code: courseCode,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        subject: subject,
        teacher_id: teacherId,
        teacher_name: teacherName,
        room_number: roomNumber,
        is_active: isActive
    };
    
    try {
        const btn = document.querySelector('#timetableModal .btn-success');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
        btn.disabled = true;
        
        const response = await fetch(`${API_URL}/api/timetable/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        if (result.success) {
            showSuccess('Timetable entry saved!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('timetableModal'));
            modal.hide();
            await loadTimetableData();
        } else {
            showError('Save failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving timetable:', error);
        showError('Network error');
        
        const btn = document.querySelector('#timetableModal .btn-success');
        btn.innerHTML = '<i class="fas fa-save me-1"></i> Save Entry';
        btn.disabled = false;
    }
}


// Delete timetable
async function deleteTimetable(timetableId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/timetable/delete/${timetableId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Entry deleted successfully');
            await loadTimetableData();
        } else {
            showError('Delete failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        showError('Error deleting entry');
    }
}

// Toggle status
async function toggleTimetableStatus(timetableId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        const response = await fetch(`https://aacem-backend.onrender.com/api/timetable/toggle-status/${timetableId}`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Status updated successfully');
            await loadTimetableData();
        } else {
            showError('Update failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        showError('Error updating status');
    }
}

// ============ UTILITY FUNCTIONS ============

// Format time
function formatTime(timeString) {
    if (!timeString) return '-';
    try {
        if (timeString.includes(':')) {
            const parts = timeString.split(':');
            return `${parts[0]}:${parts[1]}`;
        }
        return timeString;
    } catch {
        return timeString;
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export timetable
function exportTimetable() {
    const data = filteredTimetableData.length > 0 ? filteredTimetableData : allTimetable;
    
    if (data.length === 0) {
        showError('No data to export');
        return;
    }
    
    let csv = 'Course,Day,Start Time,End Time,Subject,Teacher,Room,Status\n';
    
    data.forEach(t => {
        csv += `"${t.course_code || ''}","${t.day_of_week || ''}","${t.start_time || ''}","${t.end_time || ''}",`;
        csv += `"${t.subject || ''}","${t.teacher_name || ''}","${t.room_number || ''}","${t.is_active ? 'Active' : 'Inactive'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess('Timetable exported successfully');
}

// Refresh
function refreshTimetable() {
    loadTimetableData();
}

// Loading/Error/Success UI functions
function showLoading(message) {
    console.log(message);
}

function hideLoading() {
    console.log('Loading hidden');
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

console.log('✅ Time Table Management loaded with Course + Day-wise Toggle!');



// =====================================================
// SECTION MANAGEMENT - MODIFIED VERSION (NO TOAST)
// =====================================================

// ==================== GLOBAL VARIABLES ====================
const SECTION_API_URL = 'https://aacem-backend.onrender.com';

// ==================== SECTION MANAGEMENT FUNCTIONS ====================

// 1. Load Sections Data
async function loadSections() {
    try {
        showLoading('sectionsTableBody');
        const response = await fetch(`${SECTION_API_URL}/api/sections/all`);
        const data = await response.json();
        
        hideLoading('sectionsTableBody');
        
        if (data.success) {
            displaySections(data.sections);
            updateSectionStats(data.sections);
            populateSectionCourseFilter(data.sections);
        } else {
            showError('Failed to load sections: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        hideLoading('sectionsTableBody');
        showError('Error loading sections');
    }
}

// ==================== LOAD TEACHER MAPPINGS ====================
async function loadTeacherMappings() {
    try {
        showLoading('teacherMappingsTableBody');
        
        const response = await fetch(`${API_URL}/api/teacher-sections/all`);
        const data = await response.json();
        
        hideLoading('teacherMappingsTableBody');
        
        if (data.success) {
            allMappings = data.mappings || [];
            displayTeacherMappings(allMappings);
            document.getElementById('mappingsCount').textContent = allMappings.length;
        } else {
            showError('Failed to load teacher assignments: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading teacher mappings:', error);
        hideLoading('teacherMappingsTableBody');
        showError('Error loading teacher assignments');
    }
}

// 3. Show Add Section Modal
function showAddSectionModal() {
    document.getElementById('sectionModalHeader').innerHTML = `
        <h5 class="modal-title">
            <i class="fas fa-plus me-2"></i>Add New Section
        </h5>
    `;
    document.getElementById('editSectionId').value = '';
    document.getElementById('sectionForm').reset();
    document.getElementById('sectionStatus').value = 'true';
    
    // Load courses for dropdown
    loadCoursesForSection();
    
    const modal = new bootstrap.Modal(document.getElementById('sectionModal'));
    modal.show();
}

// 4. Show Edit Section Modal
async function showEditSectionModal(sectionId) {
    try {
        showLoading('sectionModal');
        const response = await fetch(`${SECTION_API_URL}/api/sections/all`);
        const data = await response.json();
        
        hideLoading('sectionModal');
        
        if (data.success) {
            const section = data.sections.find(s => s.section_id === sectionId);
            if (section) {
                document.getElementById('sectionModalHeader').innerHTML = `
                    <h5 class="modal-title">
                        <i class="fas fa-edit me-2"></i>Edit Section ${section.section_name}
                    </h5>
                `;
                document.getElementById('editSectionId').value = section.section_id;
                document.getElementById('sectionName').value = section.section_name;
                document.getElementById('maxStudents').value = section.max_students;
                document.getElementById('sectionStatus').value = section.is_active.toString();
                
                // Load courses and set selected
                await loadCoursesForSection();
                document.getElementById('sectionCourse').value = section.course_code;
                
                const modal = new bootstrap.Modal(document.getElementById('sectionModal'));
                modal.show();
            } else {
                showError('Section not found');
            }
        }
    } catch (error) {
        console.error('Error fetching section:', error);
        hideLoading('sectionModal');
        showError('Error loading section details');
    }
}

// 5. Show Assign Teacher Modal
function showAssignTeacherModal() {
    document.getElementById('assignTeacherForm').reset();
    document.getElementById('assignSectionId').innerHTML = '<option value="">Select course first...</option>';
    
    // Load teachers and courses for dropdowns
    loadTeachersForAssignment();
    loadCoursesForAssignment();
    
    const modal = new bootstrap.Modal(document.getElementById('assignTeacherModal'));
    modal.show();
}

// 6. Load Courses for Section Dropdown
async function loadCoursesForSection() {
    try {
        const response = await fetch(`${SECTION_API_URL}/api/courses`);
        const data = await response.json();
        
        const select = document.getElementById('sectionCourse');
        if (select && data.courses) {
            const activeCourses = data.courses.filter(c => c.is_active !== false);
            select.innerHTML = '<option value="">Select course...</option>' +
                activeCourses.map(c => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses');
    }
}

// 7. Load Teachers for Assignment Dropdown
async function loadTeachersForAssignment() {
    try {
        const response = await fetch(`${SECTION_API_URL}/api/teachers`);
        const data = await response.json();
        
        const select = document.getElementById('assignTeacherId');
        if (select && data.teachers) {
            select.innerHTML = '<option value="">Choose teacher...</option>' +
                data.teachers.map(t => `<option value="${t.teacher_id}">${t.name} (${t.teacher_id})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        showError('Failed to load teachers');
    }
}

// 8. Load Courses for Assignment Dropdown
async function loadCoursesForAssignment() {
    try {
        const response = await fetch(`${SECTION_API_URL}/api/courses`);
        const data = await response.json();
        
        const select = document.getElementById('assignCourse');
        if (select && data.courses) {
            const activeCourses = data.courses.filter(c => c.is_active !== false);
            select.innerHTML = '<option value="">Choose course...</option>' +
                activeCourses.map(c => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses');
    }
}

// 9. Load Sections for Assignment Dropdown
async function loadSectionsForAssignment() {
    try {
        const courseCode = document.getElementById('assignCourse').value;
        
        if (!courseCode) {
            document.getElementById('assignSectionId').innerHTML = '<option value="">Select course first...</option>';
            return;
        }
        
        showLoading('assignSectionId');
        
        const response = await fetch(`${SECTION_API_URL}/api/sections/course/${courseCode}`);
        const data = await response.json();
        
        hideLoading('assignSectionId');
        
        const select = document.getElementById('assignSectionId');
        if (select && data.sections) {
            const activeSections = data.sections.filter(s => s.is_active !== false);
            if (activeSections.length === 0) {
                select.innerHTML = '<option value="">No active sections for this course</option>';
            } else {
                select.innerHTML = '<option value="">Select section...</option>' +
                    activeSections.map(s => `<option value="${s.section_id}">${s.section_name} (${s.current_students}/${s.max_students})</option>`).join('');
            }
        } else {
            select.innerHTML = '<option value="">No sections available</option>';
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        hideLoading('assignSectionId');
        showError('Failed to load sections');
    }
}

// 10. Save Section
async function saveSection() {
    try {
        const sectionId = document.getElementById('editSectionId').value;
        const courseCode = document.getElementById('sectionCourse').value;
        const sectionName = document.getElementById('sectionName').value.trim().toUpperCase();
        const maxStudents = document.getElementById('maxStudents').value;
        const isActive = document.getElementById('sectionStatus').value === 'true';
        
        // Validation
        if (!courseCode) {
            showError('Please select a course');
            return;
        }
        if (!sectionName) {
            showError('Please enter section name');
            return;
        }
        if (!maxStudents || maxStudents < 1 || maxStudents > 100) {
            showError('Please enter a valid maximum students (1-100)');
            return;
        }
        
        const isEditMode = !!sectionId;
        const url = isEditMode ? 
            `${SECTION_API_URL}/api/sections/update/${sectionId}` : 
            `${SECTION_API_URL}/api/sections/create`;
        
        const method = isEditMode ? 'PUT' : 'POST';
        
        const payload = {
            course_code: courseCode,
            section_name: sectionName,
            max_students: parseInt(maxStudents),
            is_active: isActive
        };
        
        // Show loading on save button
        const saveBtn = document.querySelector('#sectionModal .modal-footer .btn-success');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';
        saveBtn.disabled = true;
        
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        // Reset button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        if (data.success) {
            showSuccess(data.message);
            bootstrap.Modal.getInstance(document.getElementById('sectionModal')).hide();
            loadSections();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving section:', error);
        
        // Reset button
        const saveBtn = document.querySelector('#sectionModal .modal-footer .btn-success');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Section';
            saveBtn.disabled = false;
        }
        
        showError('Error saving section: ' + error.message);
    }
}

// 11. Assign Teacher to Section
async function assignTeacherToSection() {
    try {
        const teacherId = document.getElementById('assignTeacherId').value;
        const sectionId = document.getElementById('assignSectionId').value;
        const subject = document.getElementById('assignSubject').value.trim();
        
        // Validation
        if (!teacherId) {
            showError('Please select a teacher');
            return;
        }
        if (!sectionId) {
            showError('Please select a section');
            return;
        }
        
        const payload = {
            teacher_id: teacherId,
            section_id: sectionId,
            subject: subject || 'General'
        };
        
        // Show loading on assign button
        const assignBtn = document.querySelector('#assignTeacherModal .modal-footer .btn-success');
        const originalText = assignBtn.innerHTML;
        assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Assigning...';
        assignBtn.disabled = true;
        
        const response = await fetch(`${SECTION_API_URL}/api/teacher-sections/assign`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        // Reset button
        assignBtn.innerHTML = originalText;
        assignBtn.disabled = false;
        
        if (data.success) {
            showSuccess(data.message);
            bootstrap.Modal.getInstance(document.getElementById('assignTeacherModal')).hide();
            loadTeacherMappings();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error assigning teacher:', error);
        
        // Reset button
        const assignBtn = document.querySelector('#assignTeacherModal .modal-footer .btn-success');
        if (assignBtn) {
            assignBtn.innerHTML = '<i class="fas fa-check me-1"></i>Assign Teacher';
            assignBtn.disabled = false;
        }
        
        showError('Error assigning teacher: ' + error.message);
    }
}

// 12. Delete Section
async function deleteSection(sectionId, sectionName) {
    if (!confirm(`Are you sure you want to delete section "${sectionName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        showLoading('sectionsTableBody');
        
        const response = await fetch(`${SECTION_API_URL}/api/sections/delete/${sectionId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        hideLoading('sectionsTableBody');
        
        if (data.success) {
            showSuccess(data.message);
            loadSections();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error deleting section:', error);
        hideLoading('sectionsTableBody');
        showError('Error deleting section: ' + error.message);
    }
}

// 13. Remove Teacher Assignment
async function removeTeacherAssignment(mappingId, teacherName) {
    if (!confirm(`Are you sure you want to remove teacher "${teacherName}" from this section?`)) {
        return;
    }
    
    try {
        showLoading('teacherMappingsTableBody');
        
        const response = await fetch(`${SECTION_API_URL}/api/teacher-sections/remove/${mappingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        hideLoading('teacherMappingsTableBody');
        
        if (data.success) {
            showSuccess(data.message);
            loadTeacherMappings();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error removing teacher assignment:', error);
        hideLoading('teacherMappingsTableBody');
        showError('Error removing teacher assignment: ' + error.message);
    }
}

// 14. Display Sections in Table
function displaySections(sections) {
    const tbody = document.getElementById('sectionsTableBody');
    
    if (!sections || sections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-layer-group fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No sections found</p>
                    <button class="btn btn-sm btn-primary" onclick="showAddSectionModal()">
                        <i class="fas fa-plus me-1"></i>Add First Section
                    </button>
                </td>
            </tr>
        `;
        document.getElementById('sectionsCount').textContent = '0';
        return;
    }
    
    let html = '';
    sections.forEach((section, index) => {
        const utilization = section.max_students > 0 ? 
            Math.round((section.current_students / section.max_students) * 100) : 0;
        
        let utilizationClass = 'bg-success';
        if (utilization >= 90) utilizationClass = 'bg-danger';
        else if (utilization >= 70) utilizationClass = 'bg-warning';
        else if (utilization >= 50) utilizationClass = 'bg-info';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${section.course_code}</strong>
                    <div class="small text-muted">${section.course_name || ''}</div>
                </td>
                <td>
                    <span class="badge bg-primary">${section.section_name}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-users me-2 text-muted"></i>
                        <div>
                            <div class="small">Capacity: ${section.max_students}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-user-graduate me-2 text-muted"></i>
                        <div>
                            <div class="small">Students: ${section.current_students}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 10px;">
                            <div class="progress-bar ${utilizationClass}" role="progressbar" 
                                style="width: ${utilization}%" aria-valuenow="${utilization}" 
                                aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <span class="small fw-bold">${utilization}%</span>
                    </div>
                </td>
                <td>
                    <span class="badge ${section.is_active ? 'bg-success' : 'bg-secondary'}">
                        <i class="fas fa-${section.is_active ? 'check-circle' : 'times-circle'} me-1"></i>
                        ${section.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="showEditSectionModal('${section.section_id}')" 
                            title="Edit Section">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteSection('${section.section_id}', '${section.section_name}')" 
                            title="Delete Section">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    document.getElementById('sectionsCount').textContent = sections.length;
}

// ==================== UPDATED: Display Teacher Mappings with Multiple Subjects ====================
function displayTeacherMappings(mappings) {
    const tbody = document.getElementById('teacherMappingsTableBody');
    
    if (!mappings || mappings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-chalkboard-user fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No teacher assignments found</p>
                    <button class="btn btn-sm btn-primary" onclick="showAssignTeacherModal()">
                        <i class="fas fa-plus me-1"></i>Assign First Teacher
                    </button>
                </td>
            </tr>
        `;
        document.getElementById('mappingsCount').textContent = '0';
        return;
    }
    
    // Group by teacher and section to show multiple subjects
    const groupedMappings = {};
    
    mappings.forEach(mapping => {
        const key = `${mapping.teacher_id}|${mapping.section_id}`;
        
        if (!groupedMappings[key]) {
            groupedMappings[key] = {
                teacher_id: mapping.teacher_id,
                teacher_name: mapping.teacher_name || 'Unknown',
                section_id: mapping.section_id,
                section_name: mapping.section_name || 'N/A',
                course_code: mapping.course_code || 'N/A',
                subjects: [],
                mapping_ids: [],
                first_assigned: mapping.assigned_at
            };
        }
        
        groupedMappings[key].subjects.push(mapping.subject || 'General');
        groupedMappings[key].mapping_ids.push(mapping.mapping_id);
    });
    
    let html = '';
    let index = 1;
    
    Object.values(groupedMappings).forEach(group => {
        // Sort subjects alphabetically
        group.subjects.sort();
        
        // Create subject badges
        const subjectsHtml = group.subjects.map(subj => 
            `<span class="badge bg-info me-1 mb-1" style="font-size: 0.85rem; padding: 5px 10px;">
                ${subj}
            </span>`
        ).join('');
        
        const assignedDate = group.first_assigned ? 
            new Date(group.first_assigned).toLocaleDateString('en-IN') : 'N/A';
        
        html += `
            <tr>
                <td>${index++}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-user-tie text-primary me-2 fa-lg"></i>
                        <div>
                            <strong>${group.teacher_name}</strong>
                            <div class="small text-muted">${group.teacher_id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary" style="font-size: 0.9rem;">${group.course_code}</span>
                </td>
                <td>
                    <span class="badge bg-success" style="font-size: 0.9rem;">${group.section_name}</span>
                </td>
                <td>
                    <div style="max-width: 300px;">
                        ${subjectsHtml}
                        <span class="badge bg-secondary ms-1" title="Total Subjects">${group.subjects.length}</span>
                    </div>
                </td>
                <td>${assignedDate}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-info" onclick="viewTeacherSubjects('${group.teacher_id}', '${group.section_id}')" 
                                title="View All Subjects">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="addMoreSubject('${group.teacher_id}', '${group.section_id}')" 
                                title="Add Another Subject">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-danger" onclick="removeTeacherFromSection('${group.teacher_id}', '${group.section_id}')" 
                                title="Remove All Subjects">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    document.getElementById('mappingsCount').textContent = mappings.length;
}
// ==================== VIEW TEACHER SUBJECTS ====================
function viewTeacherSubjects(teacherId, sectionId) {
    // Filter mappings for this teacher and section
    const teacherMappings = allMappings.filter(m => 
        m.teacher_id === teacherId && m.section_id === sectionId
    );
    
    if (teacherMappings.length === 0) {
        showInfo('No subjects found for this teacher in this section');
        return;
    }
    
    const teacherName = teacherMappings[0].teacher_name || teacherId;
    const sectionName = teacherMappings[0].section_name || sectionId;
    
    let subjectsList = '<ul class="list-group" style="max-height: 300px; overflow-y: auto;">';
    
    teacherMappings.forEach((m, idx) => {
        const statusClass = m.is_active ? 'success' : 'secondary';
        const statusText = m.is_active ? 'Active' : 'Inactive';
        const assignedDate = m.assigned_at ? new Date(m.assigned_at).toLocaleDateString() : 'N/A';
        
        subjectsList += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${idx + 1}.</strong> ${m.subject || 'General'}
                    <br>
                    <small class="text-muted">Assigned: ${assignedDate}</small>
                </div>
                <div>
                    <span class="badge bg-${statusClass} me-2">${statusText}</span>
                    <button class="btn btn-sm btn-danger" onclick="removeSubject('${m.mapping_id}', '${m.subject}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </li>
        `;
    });
    
    subjectsList += '</ul>';
    
    // Show in modal
    const modalHtml = `
        <div class="modal fade" id="viewSubjectsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-book-open me-2"></i>
                            Subjects for ${teacherName}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Section:</strong> ${sectionName}</p>
                        <p><strong>Total Subjects:</strong> ${teacherMappings.length}</p>
                        <hr>
                        ${subjectsList}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-warning" onclick="addMoreSubject('${teacherId}', '${sectionId}')">
                            <i class="fas fa-plus me-1"></i> Add Subject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('viewSubjectsModal');
    if (existingModal) existingModal.remove();
    
    // Add and show modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('viewSubjectsModal'));
    modal.show();
}

// ==================== REMOVE TEACHER FROM SECTION (ALL SUBJECTS) ====================
async function removeTeacherFromSection(teacherId, sectionId) {
    if (!confirm(`Remove ALL subjects for this teacher from this section?`)) return;
    
    try {
        // Get all mappings for this teacher and section
        const mappings = allMappings.filter(m => 
            m.teacher_id === teacherId && m.section_id === sectionId
        );
        
        if (mappings.length === 0) {
            showInfo('No assignments found');
            return;
        }
        
        let deletedCount = 0;
        let failedCount = 0;
        
        for (const mapping of mappings) {
            try {
                const response = await fetch(`${API_URL}/api/teacher-sections/remove/${mapping.mapping_id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    deletedCount++;
                } else {
                    failedCount++;
                }
            } catch {
                failedCount++;
            }
        }
        
        if (deletedCount > 0) {
            showSuccess(`Removed ${deletedCount} subject(s) successfully` + 
                       (failedCount > 0 ? `, ${failedCount} failed` : ''));
            loadTeacherMappings();
        } else {
            showError('Failed to remove assignments');
        }
        
    } catch (error) {
        console.error('Error removing teacher:', error);
        showError('Failed to remove teacher assignments');
    }
}
// ==================== REMOVE SINGLE SUBJECT ====================
async function removeSubject(mappingId, subject) {
    if (!confirm(`Are you sure you want to remove subject "${subject}"?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/api/teacher-sections/remove-subject/${mappingId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Subject "${subject}" removed successfully`);
            
            // Close current modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewSubjectsModal'));
            if (modal) modal.hide();
            
            // Reload mappings
            loadTeacherMappings();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error removing subject:', error);
        showError('Failed to remove subject');
    }
}

// ==================== ADD MORE SUBJECT ====================
function addMoreSubject(teacherId, sectionId) {
    // Get teacher details
    const teacher = teachersData.find(t => t.teacher_id === teacherId);
    if (teacher) {
        const teacherSelect = document.getElementById('assignTeacherId');
        teacherSelect.innerHTML = `<option value="${teacherId}" selected>${teacher.name} (${teacherId})</option>`;
    }
    
    // Get section details
    const section = allSections.find(s => s.section_id === sectionId);
    if (section) {
        const courseSelect = document.getElementById('assignCourse');
        courseSelect.innerHTML = `<option value="${section.course_code}" selected>${section.course_code}</option>`;
        
        // Load sections and select
        setTimeout(() => {
            const sectionSelect = document.getElementById('assignSectionId');
            sectionSelect.innerHTML = `<option value="${sectionId}" selected>${section.section_name}</option>`;
        }, 300);
    }
    
    // Clear subject field
    document.getElementById('assignSubject').value = '';
    
    // Update modal title
    document.querySelector('#assignTeacherModal .modal-title').innerHTML = 
        '<i class="fas fa-plus-circle me-2"></i>Add Another Subject';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('assignTeacherModal'));
    modal.show();
}

// 16. Update Section Statistics
function updateSectionStats(sections) {
    const totalSections = sections.length;
    const totalStudents = sections.reduce((sum, section) => sum + (section.current_students || 0), 0);
    const coursesWithSections = [...new Set(sections.map(s => s.course_code))].length;
    const avgCapacity = sections.length > 0 ? 
        Math.round(sections.reduce((sum, section) => {
            const capacity = section.max_students > 0 ? 
                ((section.current_students || 0) / section.max_students * 100) : 0;
            return sum + capacity;
        }, 0) / sections.length) : 0;
    
    document.getElementById('totalSections').textContent = totalSections.toLocaleString();
    document.getElementById('studentsInSections').textContent = totalStudents.toLocaleString();
    document.getElementById('coursesWithSections').textContent = coursesWithSections.toLocaleString();
    document.getElementById('avgCapacity').textContent = `${avgCapacity}%`;
}

// 17. Populate Section Course Filter
function populateSectionCourseFilter(sections) {
    const select = document.getElementById('sectionCourseFilter');
    const courses = [...new Set(sections.map(s => s.course_code))];
    
    let html = '<option value="">All Courses</option>';
    courses.forEach(course => {
        const section = sections.find(s => s.course_code === course);
        const courseName = section?.course_name || course;
        html += `<option value="${course}">${course} - ${courseName}</option>`;
    });
    
    select.innerHTML = html;
}

// 18. Filter Sections
function filterSections() {
    const courseFilter = document.getElementById('sectionCourseFilter').value;
    const searchText = document.getElementById('searchSection').value.toLowerCase();
    const showActiveOnly = document.getElementById('showActiveOnlySections').checked;
    
    showLoading('sectionsTableBody');
    
    fetch(`${SECTION_API_URL}/api/sections/all`)
        .then(res => res.json())
        .then(data => {
            hideLoading('sectionsTableBody');
            
            if (data.success) {
                let filtered = data.sections;
                
                // Apply course filter
                if (courseFilter) {
                    filtered = filtered.filter(s => s.course_code === courseFilter);
                }
                
                // Apply active filter
                if (showActiveOnly) {
                    filtered = filtered.filter(s => s.is_active);
                }
                
                // Apply search filter
                if (searchText) {
                    filtered = filtered.filter(s => 
                        s.section_name.toLowerCase().includes(searchText) ||
                        s.course_code.toLowerCase().includes(searchText) ||
                        (s.course_name && s.course_name.toLowerCase().includes(searchText))
                    );
                }
                
                displaySections(filtered);
            }
        })
        .catch(error => {
            console.error('Error filtering sections:', error);
            hideLoading('sectionsTableBody');
            showError('Error filtering sections');
        });
}

// 19. Search Sections
function searchSections() {
    filterSections();
}

// 20. Refresh Sections
function refreshSections() {
    loadSections();
    showSuccess('Sections refreshed');
}

// 21. Refresh Teacher Mappings
function refreshTeacherMappings() {
    loadTeacherMappings();
    showSuccess('Teacher assignments refreshed');
}

// 22. Export Sections (CSV)
function exportSections() {
    showSuccess('Export feature coming soon!');
}

// ==================== INITIALIZATION ====================

// Initialize Section Management
function initSectionManagement() {
    console.log('Initializing Section Management...');
    
    // Load sections when the tab is shown
    const sectionsTab = document.getElementById('sections-tab');
    if (sectionsTab) {
        sectionsTab.addEventListener('shown.bs.tab', function() {
            console.log('Sections tab shown, loading data...');
            loadSections();
        });
    }
    
    // Load teacher mappings when the tab is shown
    const teacherSectionsTab = document.getElementById('teacher-sections-tab');
    if (teacherSectionsTab) {
        teacherSectionsTab.addEventListener('shown.bs.tab', function() {
            console.log('Teacher Sections tab shown, loading data...');
            loadTeacherMappings();
        });
    }
    
    // Add event listener for course selection in assign teacher modal
    const assignCourseSelect = document.getElementById('assignCourse');
    if (assignCourseSelect) {
        assignCourseSelect.addEventListener('change', loadSectionsForAssignment);
    }
    
    console.log('✅ Section Management initialized successfully');
}

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize section management
    setTimeout(() => {
        initSectionManagement();
    }, 1000); // Delay to ensure other components are loaded
});

// ==================== EXPORT FUNCTIONS FOR HTML ONCLICK ====================
// Make functions globally available for HTML onclick attributes
window.showAddSectionModal = showAddSectionModal;
window.showAssignTeacherModal = showAssignTeacherModal;
window.refreshSections = refreshSections;
window.refreshTeacherMappings = refreshTeacherMappings;
window.exportSections = exportSections;
window.filterSections = filterSections;
window.searchSections = searchSections;
window.loadSectionsForAssignment = loadSectionsForAssignment;
window.saveSection = saveSection;
window.assignTeacherToSection = assignTeacherToSection;

console.log('✅ Section Management JavaScript loaded successfully!');



// announcements section
function formatDateDisplay(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}
function hideLoadingSpinner(elementId) {
    // Loading will be replaced by actual content
}
// ==================== ANNOUNCEMENTS MANAGEMENT ====================

// Tab initialization
document.getElementById('announcements-tab')?.addEventListener('shown.bs.tab', function() {
    console.log('📢 Announcements tab shown');
    loadAnnouncements();
});

// Load all announcements
async function loadAnnouncements() {
    try {
        showLoadingSpinner('announcementsTableBody');
        
        const response = await fetch(`${API_URL}/api/announcements/all`);
        const data = await response.json();
        
        hideLoadingSpinner('announcementsTableBody');
        
        if (data.success) {
            announcementsData = data.announcements || [];
            displayAnnouncements(announcementsData);
            updateAnnouncementStats(announcementsData);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        hideLoadingSpinner('announcementsTableBody');
        showError('Failed to load announcements');
    }
}

// Display announcements
function displayAnnouncements(announcements) {
    const tbody = document.getElementById('announcementsTableBody');
    
    if (!tbody) {
        console.error('announcementsTableBody not found!');
        return;
    }
    
    if (!announcements || announcements.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No announcements found</p>
                    <button class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#createAnnouncementModal">
                        <i class="fas fa-plus me-1"></i>Create First Announcement
                    </button>
                </td>
            </tr>
        `;
        const countEl = document.getElementById('announcementsCount');
        if (countEl) countEl.textContent = '0';
        return;
    }

    let html = '';
    announcements.forEach((ann, index) => {
        const priorityClass = getPriorityBadgeClass(ann.priority);
        const targetBadge = getTargetBadge(ann.target_audience, ann.course_code, ann.section_id);
        const statusBadge = ann.is_active 
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-secondary">Inactive</span>';
        
        const dateRange = ann.start_date && ann.end_date 
            ? `${formatDateDisplay(ann.start_date)} - ${formatDateDisplay(ann.end_date)}`
            : 'No limit';
        
        const messagePreview = ann.message.length > 50 
            ? ann.message.substring(0, 50) + '...' 
            : ann.message;
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${ann.title}</strong></td>
                <td>${messagePreview}</td>
                <td>${targetBadge}</td>
                <td><span class="badge ${priorityClass}">${ann.priority.toUpperCase()}</span></td>
                <td><small>${dateRange}</small></td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info" onclick="viewAnnouncementDetails('${ann.announcement_id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning" onclick="editAnnouncement('${ann.announcement_id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn ${ann.is_active ? 'btn-secondary' : 'btn-success'}" 
                            onclick="toggleAnnouncementStatus('${ann.announcement_id}')" 
                            title="${ann.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${ann.is_active ? 'times' : 'check'}"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteAnnouncement('${ann.announcement_id}', '${ann.title}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    const countEl = document.getElementById('announcementsCount');
    if (countEl) countEl.textContent = announcements.length;
}

// Update announcement stats
function updateAnnouncementStats(announcements) {
    const total = announcements.length;
    const active = announcements.filter(a => a.is_active).length;
    const urgent = announcements.filter(a => a.priority === 'urgent').length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recent = announcements.filter(a => new Date(a.created_at) > oneWeekAgo).length;
    
    const totalEl = document.getElementById('totalAnnouncements');
    const activeEl = document.getElementById('activeAnnouncements');
    const urgentEl = document.getElementById('urgentAnnouncements');
    const recentEl = document.getElementById('recentAnnouncements');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (urgentEl) urgentEl.textContent = urgent;
    if (recentEl) recentEl.textContent = recent;
}

// Handle target audience selection
function handleAnnouncementTarget() {
    const target = document.getElementById('announcementTarget').value;
    const detailsDiv = document.getElementById('announcementTargetDetails');
    const sectionDiv = document.getElementById('announcementSectionDiv');
    
    if (target === 'all') {
        detailsDiv.style.display = 'none';
    } else if (target === 'course') {
        detailsDiv.style.display = 'block';
        sectionDiv.style.display = 'none';
    } else if (target === 'section') {
        detailsDiv.style.display = 'block';
        sectionDiv.style.display = 'block';
    }
}

// Load sections for announcement
async function loadSectionsForAnnouncement(courseCode) {
    const sectionSelect = document.getElementById('announcementSection');
    
    if (!courseCode) {
        sectionSelect.innerHTML = '<option value="">Choose section...</option>';
        return;
    }
    
    try {
        const response = await fetch(`${SECTION_API_URL}/api/sections/by-course/${courseCode}`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            let options = '<option value="">Choose section...</option>';
            data.sections.forEach(section => {
                options += `<option value="${section.section_id}">${section.section_name}</option>`;
            });
            sectionSelect.innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// Create announcement
async function createAnnouncement() {
    try {
        const title = document.getElementById('announcementTitle').value;
        const message = document.getElementById('announcementMessage').value;
        const target = document.getElementById('announcementTarget').value;
        const priority = document.getElementById('announcementPriority').value;
        const courseCode = document.getElementById('announcementCourse').value;
        const sectionId = document.getElementById('announcementSection').value;
        const startDate = document.getElementById('announcementStartDate').value;
        const endDate = document.getElementById('announcementEndDate').value;
        
        if (!title || !message) {
            showError('Please fill title and message');
            return;
        }
        
        const payload = {
            title: title,
            message: message,
            target_audience: target,
            priority: priority,
            course_code: target !== 'all' ? courseCode : null,
            section_id: target === 'section' ? sectionId : null,
            start_date: startDate || null,
            end_date: endDate || null
        };
        
        const createBtn = document.querySelector('#createAnnouncementModal .btn-success');
        const originalText = createBtn.innerHTML;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Creating...';
        createBtn.disabled = true;
        
        const response = await fetch(`${API_URL}/api/announcements/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
        
        if (result.success) {
            showSuccess(result.message);
            bootstrap.Modal.getInstance(document.getElementById('createAnnouncementModal')).hide();
            document.getElementById('createAnnouncementForm').reset();
            document.getElementById('announcementTargetDetails').style.display = 'none';
            loadAnnouncements();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error creating announcement:', error);
        showError('Failed to create announcement');
    }
}

// View announcement details
async function viewAnnouncementDetails(announcementId) {
    try {
        const response = await fetch(`${API_URL}/api/announcements/${announcementId}`);
        const data = await response.json();
        
        if (data.success && data.announcement) {
            const ann = data.announcement;
            
            const detailsHTML = `
                <div class="row mb-3">
                    <div class="col-md-12">
                        <h5><i class="fas fa-bullhorn me-2"></i>${ann.title}</h5>
                        <hr>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr><th>Priority:</th><td><span class="badge ${getPriorityBadgeClass(ann.priority)}">${ann.priority.toUpperCase()}</span></td></tr>
                            <tr><th>Target:</th><td>${getTargetBadge(ann.target_audience, ann.course_code, ann.section_id)}</td></tr>
                            <tr><th>Status:</th><td>${ann.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm">
                            <tr><th>Start Date:</th><td>${ann.start_date ? formatDateDisplay(ann.start_date) : 'Not set'}</td></tr>
                            <tr><th>End Date:</th><td>${ann.end_date ? formatDateDisplay(ann.end_date) : 'Not set'}</td></tr>
                            <tr><th>Created:</th><td>${formatDateDisplay(ann.created_at)}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <h6>Message:</h6>
                        <div class="alert alert-info">
                            ${ann.message}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('announcementDetailsContent').innerHTML = detailsHTML;
            const modal = new bootstrap.Modal(document.getElementById('viewAnnouncementModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error viewing announcement:', error);
        showError('Failed to load announcement details');
    }
}

// Edit announcement
async function editAnnouncement(announcementId) {
    try {
        const response = await fetch(`${API_URL}/api/announcements/${announcementId}`);
        const data = await response.json();
        
        if (data.success && data.announcement) {
            const ann = data.announcement;
            
            document.getElementById('editAnnouncementId').value = ann.announcement_id;
            document.getElementById('editAnnouncementTitle').value = ann.title;
            document.getElementById('editAnnouncementMessage').value = ann.message;
            document.getElementById('editAnnouncementTarget').value = ann.target_audience;
            document.getElementById('editAnnouncementPriority').value = ann.priority;
            document.getElementById('editAnnouncementStartDate').value = ann.start_date || '';
            document.getElementById('editAnnouncementEndDate').value = ann.end_date || '';
            
            const modal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading announcement:', error);
        showError('Failed to load announcement');
    }
}

// Update announcement
async function updateAnnouncement() {
    try {
        const announcementId = document.getElementById('editAnnouncementId').value;
        const title = document.getElementById('editAnnouncementTitle').value;
        const message = document.getElementById('editAnnouncementMessage').value;
        const target = document.getElementById('editAnnouncementTarget').value;
        const priority = document.getElementById('editAnnouncementPriority').value;
        const startDate = document.getElementById('editAnnouncementStartDate').value;
        const endDate = document.getElementById('editAnnouncementEndDate').value;
        
        const payload = {
            title: title,
            message: message,
            target_audience: target,
            priority: priority,
            start_date: startDate || null,
            end_date: endDate || null
        };
        
        const response = await fetch(`${API_URL}/api/announcements/update/${announcementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal')).hide();
            loadAnnouncements();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error updating announcement:', error);
        showError('Failed to update announcement');
    }
}

// Toggle announcement status
async function toggleAnnouncementStatus(announcementId) {
    try {
        const response = await fetch(`${API_URL}/api/announcements/toggle-status/${announcementId}`, {
            method: 'PUT'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            loadAnnouncements();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error toggling status:', error);
        showError('Failed to toggle status');
    }
}

// Delete announcement
async function deleteAnnouncement(announcementId, title) {
    if (!confirm(`Delete announcement "${title}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/announcements/delete/${announcementId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            loadAnnouncements();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showError('Failed to delete announcement');
    }
}

// Filter announcements
function filterAnnouncements() {
    const targetFilter = document.getElementById('announcementTargetFilter').value;
    const priorityFilter = document.getElementById('announcementPriorityFilter').value;
    const statusFilter = document.getElementById('announcementStatusFilter').value;
    
    let filtered = announcementsData;
    
    if (targetFilter) {
        filtered = filtered.filter(a => a.target_audience === targetFilter);
    }
    
    if (priorityFilter) {
        filtered = filtered.filter(a => a.priority === priorityFilter);
    }
    
    if (statusFilter === 'active') {
        filtered = filtered.filter(a => a.is_active === true);
    } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(a => a.is_active === false);
    }
    
    displayAnnouncements(filtered);
}

// Search announcements
function searchAnnouncements() {
    const searchTerm = document.getElementById('searchAnnouncement').value.toLowerCase();
    
    if (!searchTerm) {
        displayAnnouncements(announcementsData);
        return;
    }
    
    const filtered = announcementsData.filter(ann => 
        ann.title.toLowerCase().includes(searchTerm) ||
        ann.message.toLowerCase().includes(searchTerm)
    );
    
    displayAnnouncements(filtered);
}

// Refresh announcements
function refreshAnnouncements() {
    loadAnnouncements();
    showSuccess('Announcements refreshed');
}

function showLoadingSpinner(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="20" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading data...</p>
                </td>
            </tr>
        `;
    }
}
// Export announcements
function exportAnnouncements() {
    showInfo('Export functionality - Coming soon!');
}

// Helper functions
function getPriorityBadgeClass(priority) {
    switch(priority) {
        case 'urgent': return 'bg-danger';
        case 'high': return 'bg-warning';
        case 'normal': return 'bg-primary';
        case 'low': return 'bg-secondary';
        default: return 'bg-secondary';
    }
}

function getTargetBadge(target, courseCode, sectionId) {
    if (target === 'all') {
        return '<span class="badge bg-success">All Students</span>';
    } else if (target === 'course') {
        return `<span class="badge bg-info">Course: ${courseCode || 'N/A'}</span>`;
    } else if (target === 'section') {
        return `<span class="badge bg-warning">Section: ${sectionId || 'N/A'}</span>`;
    }
    return '<span class="badge bg-secondary">Unknown</span>';
}

console.log('✅ Announcements Management loaded!');




// =====================================================
// STUDENT SECTION ASSIGNMENT - FILTER WITH COURSE & SECTION
// COMPLETE FIXED CODE
// =====================================================

// ==================== GLOBAL VARIABLES ====================
let allStudents = [];
let filteredStudents = [];
let allSections = []; // Store all sections for filtering

let currentCourseFilter = '';
let currentSectionFilter = '';
let currentStatusFilter = '';
let currentSearchTerm = '';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Student Sections Tab click event
    const studentSectionsTab = document.getElementById('student-sections-tab');
    if (studentSectionsTab) {
        studentSectionsTab.addEventListener('shown.bs.tab', function() {
            console.log('👥 Student Sections tab activated');
            loadStudentSectionsData();
            loadAllSections(); // Load sections for filter
        });
    }
    
    // Course Filter change event
    const courseFilter = document.getElementById('studentSectionCourseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', function() {
            currentCourseFilter = this.value;
            // Jab course change ho to section filter update karo
            updateSectionFilterForCourse(currentCourseFilter);
            filterStudentSectionsData();
        });
    }
    
    // Section Filter change event
    const sectionFilter = document.getElementById('studentSectionSectionFilter');
    if (sectionFilter) {
        sectionFilter.addEventListener('change', function() {
            currentSectionFilter = this.value;
            filterStudentSectionsData();
        });
    }
    
    // Status Filter change event
    const statusFilter = document.getElementById('studentSectionStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            filterStudentSectionsData();
        });
    }
    
    // Search input
    const searchInput = document.getElementById('searchStudentSections');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            currentSearchTerm = this.value.toLowerCase();
            filterStudentSectionsData();
        });
    }
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetAllFilters);
    }
});

// ==================== LOAD ALL SECTIONS ====================
async function loadAllSections() {
    try {
        const response = await fetch(`${API_URL}/api/sections/all`);
        const data = await response.json();
        
        if (data.success && data.sections) {
            allSections = data.sections;
            console.log(`📚 Loaded ${allSections.length} sections for filtering`);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// ==================== UPDATE SECTION FILTER BASED ON COURSE ====================
function updateSectionFilterForCourse(courseCode) {
    const sectionFilter = document.getElementById('studentSectionSectionFilter');
    if (!sectionFilter) return;
    
    if (!courseCode) {
        // Agar course select nahi hai to saare sections dikhao
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        sectionFilter.disabled = false;
        return;
    }
    
    // Course ke according sections filter karo
    const courseSections = allSections.filter(s => 
        s.course_code === courseCode && s.is_active === true
    );
    
    if (courseSections.length === 0) {
        sectionFilter.innerHTML = '<option value="">No sections for this course</option>';
        sectionFilter.disabled = true;
    } else {
        let options = '<option value="">All Sections</option>';
        courseSections.forEach(section => {
            options += `<option value="${section.section_id}">${section.section_name}</option>`;
        });
        sectionFilter.innerHTML = options;
        sectionFilter.disabled = false;
    }
    
    // Section filter reset karo
    currentSectionFilter = '';
    sectionFilter.value = '';
}

// ==================== LOAD STUDENT SECTIONS DATA ====================
async function loadStudentSectionsData() {
    try {
        const tbody = document.getElementById('studentSectionsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <div class="spinner-border text-primary mb-3" role="status"></div>
                        <p class="text-muted">Loading students...</p>
                    </td>
                </tr>
            `;
        }
        
        console.log('🔄 Fetching students from:', `${API_URL}/api/students/all`);
        
        const response = await fetch(`${API_URL}/api/students/all`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Received data:', data);
        
        if (data.success && data.students) {
            allStudents = data.students;
            
            // Course dropdown populate karo
            populateCourseFilter();
            
            // Students display karo
            filteredStudents = [...allStudents];
            displayStudentSections(filteredStudents);
            updateStudentSectionsStats(filteredStudents);
            loadCourseBreakdown(filteredStudents);
            
            console.log(`✅ Loaded ${allStudents.length} students`);
        } else {
            throw new Error(data.message || 'Failed to load students');
        }
    } catch (error) {
        console.error('❌ Error loading students:', error);
        
        const tbody = document.getElementById('studentSectionsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                        <h5 class="text-danger">Error Loading Students</h5>
                        <p class="text-muted">${error.message}</p>
                        <button class="btn btn-primary" onclick="loadStudentSectionsData()">
                            <i class="fas fa-sync-alt me-1"></i>Retry
                        </button>
                    </td>
                </tr>
            `;
        }
        
        showError('Failed to load students: ' + error.message);
    }
}

// ==================== POPULATE COURSE FILTER ====================
function populateCourseFilter() {
    const courseFilter = document.getElementById('studentSectionCourseFilter');
    if (!courseFilter) return;
    
    // Unique courses nikaalo
    const courses = [...new Set(allStudents.map(s => s.course))].filter(c => c);
    
    let options = '<option value="">All Courses</option>';
    courses.sort().forEach(course => {
        const count = allStudents.filter(s => s.course === course).length;
        options += `<option value="${course}">${course} (${count} students)</option>`;
    });
    
    courseFilter.innerHTML = options;
    console.log('📊 Course filter populated with', courses.length, 'courses');
}

// ==================== FILTER STUDENT SECTIONS DATA ====================
function filterStudentSectionsData() {
    console.log('🔍 Filtering students with:', {
        course: currentCourseFilter,
        section: currentSectionFilter,
        status: currentStatusFilter,
        search: currentSearchTerm
    });
    
    // Start with all students
    let filtered = [...allStudents];
    
    // Apply course filter
    if (currentCourseFilter) {
        filtered = filtered.filter(s => s.course === currentCourseFilter);
        console.log(`📌 After course filter: ${filtered.length} students`);
    }
    
    // Apply section filter
    if (currentSectionFilter) {
        filtered = filtered.filter(s => s.section_id === currentSectionFilter);
        console.log(`📌 After section filter: ${filtered.length} students`);
    }
    
    // Apply status filter
    if (currentStatusFilter === 'assigned') {
        filtered = filtered.filter(s => s.section_id);
        console.log(`📌 After assigned filter: ${filtered.length} students`);
    } else if (currentStatusFilter === 'unassigned') {
        filtered = filtered.filter(s => !s.section_id);
        console.log(`📌 After unassigned filter: ${filtered.length} students`);
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filtered = filtered.filter(s => 
            (s.name && s.name.toLowerCase().includes(currentSearchTerm)) ||
            (s.student_id && s.student_id.toLowerCase().includes(currentSearchTerm)) ||
            (s.email && s.email.toLowerCase().includes(currentSearchTerm)) ||
            (s.course && s.course.toLowerCase().includes(currentSearchTerm)) ||
            (s.section_name && s.section_name.toLowerCase().includes(currentSearchTerm))
        );
        console.log(`📌 After search filter: ${filtered.length} students`);
    }
    
    filteredStudents = filtered;
    displayStudentSections(filteredStudents);
    updateDisplayCounts(filteredStudents.length, allStudents.length);
}

// ==================== DISPLAY STUDENT SECTIONS ====================
function displayStudentSections(students) {
    const tbody = document.getElementById('studentSectionsTableBody');
    
    if (!tbody) {
        console.error('❌ studentSectionsTableBody not found!');
        return;
    }
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <i class="fas fa-users fa-4x text-muted mb-3 opacity-50"></i>
                    <h5 class="text-muted">No Students Found</h5>
                    <p class="text-muted mb-0">No students match your current filters</p>
                    <button class="btn btn-sm btn-primary mt-3" onclick="resetAllFilters()">
                        <i class="fas fa-undo me-1"></i> Reset Filters
                    </button>
                </td>
            </tr>
        `;
        updateDisplayCounts(0, allStudents.length);
        return;
    }

    let html = '';
    let assignedCount = 0;
    let unassignedCount = 0;
    
    students.forEach((student, index) => {
        const hasSection = student.section_id;
        if (hasSection) assignedCount++;
        else unassignedCount++;
        
        const sectionBadge = hasSection
            ? `<span class="badge bg-success">
                <i class="fas fa-check-circle me-1"></i>${student.section_name || student.section_id}
               </span>`
            : `<span class="badge bg-warning text-dark">
                <i class="fas fa-exclamation-triangle me-1"></i>Not Assigned
               </span>`;
        
        const rowClass = !hasSection ? 'table-warning bg-opacity-10' : '';
        
        html += `
            <tr class="${rowClass}">
                <td><strong>${index + 1}</strong></td>
                <td>
                    <span class="badge bg-dark">${student.student_id}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2">
                            <i class="fas fa-user-circle fa-lg text-primary"></i>
                        </div>
                        <div>
                            <strong>${student.name}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <small class="text-muted">
                        <i class="fas fa-envelope me-1"></i>${student.email || 'N/A'}
                    </small>
                </td>
                <td>
                    <small class="text-muted">
                        <i class="fas fa-phone me-1"></i>${student.phone || 'N/A'}
                    </small>
                </td>
                <td>
                    <span class="badge bg-primary">${student.course}</span>
                </td>
                <td>${sectionBadge}</td>
                <td class="text-center">
                    ${hasSection ? `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" 
                                onclick="viewStudentDetails('${student.student_id}')" 
                                title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" 
                                onclick="reassignStudent('${student.student_id}', '${student.name.replace(/'/g, "\\'")}', '${student.section_id}', '${(student.section_name || '').replace(/'/g, "\\'")}', '${student.course}')" 
                                title="Change Section">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            <button class="btn btn-outline-danger" 
                                onclick="openRemoveModal('${student.student_id}', '${student.name.replace(/'/g, "\\'")}')" 
                                title="Remove from Section">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <button class="btn btn-success btn-sm" 
                            onclick="assignStudentToSection('${student.student_id}', '${student.name.replace(/'/g, "\\'")}', '${student.course}')" 
                            title="Assign to Section">
                            <i class="fas fa-plus me-1"></i>Assign
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Update stats
    document.getElementById('displayedAssigned').textContent = assignedCount;
    document.getElementById('displayedUnassigned').textContent = unassignedCount;
}

// ==================== UPDATE STUDENT SECTIONS STATS ====================
function updateStudentSectionsStats(students) {
    const totalStudents = students.length;
    const assignedStudents = students.filter(s => s.section_id).length;
    const unassignedStudents = totalStudents - assignedStudents;
    const assignmentPercentage = totalStudents > 0 ? (assignedStudents / totalStudents) * 100 : 0;
    
    document.getElementById('totalStudentsForSections').textContent = totalStudents;
    document.getElementById('assignedStudents').textContent = assignedStudents;
    document.getElementById('unassignedStudents').textContent = unassignedStudents;
    document.getElementById('assignmentPercentage').textContent = assignmentPercentage.toFixed(1) + '%';
    
    const progressBar = document.getElementById('assignmentProgressBar');
    if (progressBar) {
        progressBar.style.width = assignmentPercentage + '%';
    }
}

// ==================== UPDATE DISPLAY COUNTS ====================
function updateDisplayCounts(showing, total) {
    const showingSpan = document.getElementById('showingCount');
    const totalSpan = document.getElementById('totalCount');
    const studentCountSpan = document.getElementById('studentSectionsCount');
    
    if (showingSpan) showingSpan.textContent = showing;
    if (totalSpan) totalSpan.textContent = total;
    if (studentCountSpan) studentCountSpan.textContent = showing;
}

// ==================== RESET ALL FILTERS ====================
function resetAllFilters() {
    console.log('🔄 Resetting all filters');
    
    // Reset filter values
    currentCourseFilter = '';
    currentSectionFilter = '';
    currentStatusFilter = '';
    currentSearchTerm = '';
    
    // Reset UI elements
    const courseFilter = document.getElementById('studentSectionCourseFilter');
    if (courseFilter) courseFilter.value = '';
    
    const sectionFilter = document.getElementById('studentSectionSectionFilter');
    if (sectionFilter) {
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        sectionFilter.disabled = false;
        sectionFilter.value = '';
    }
    
    const statusFilter = document.getElementById('studentSectionStatusFilter');
    if (statusFilter) statusFilter.value = '';
    
    const searchInput = document.getElementById('searchStudentSections');
    if (searchInput) searchInput.value = '';
    
    // Reset to all students
    filteredStudents = [...allStudents];
    displayStudentSections(filteredStudents);
    updateDisplayCounts(filteredStudents.length, allStudents.length);
    
    showSuccess('Filters reset successfully');
}

// ==================== SHOW UNASSIGNED ONLY ====================
function showUnassignedOnly() {
    console.log('🔍 Showing unassigned only');
    
    // Set filter values
    currentStatusFilter = 'unassigned';
    
    // Update UI
    const statusFilter = document.getElementById('studentSectionStatusFilter');
    if (statusFilter) statusFilter.value = 'unassigned';
    
    // Apply filter
    filterStudentSectionsData();
    
    const unassignedCount = allStudents.filter(s => !s.section_id).length;
    showInfo(`Showing ${unassignedCount} unassigned student${unassignedCount !== 1 ? 's' : ''}`);
}

// ==================== FILTER FUNCTIONS (for onclick) ====================
function filterStudentSections() {
    // Get values from UI
    const courseFilter = document.getElementById('studentSectionCourseFilter');
    const sectionFilter = document.getElementById('studentSectionSectionFilter');
    const statusFilter = document.getElementById('studentSectionStatusFilter');
    
    currentCourseFilter = courseFilter ? courseFilter.value : '';
    currentSectionFilter = sectionFilter ? sectionFilter.value : '';
    currentStatusFilter = statusFilter ? statusFilter.value : '';
    
    filterStudentSectionsData();
}

function searchStudentSections() {
    const searchInput = document.getElementById('searchStudentSections');
    currentSearchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filterStudentSectionsData();
}

// ==================== LOAD COURSE BREAKDOWN ====================
function loadCourseBreakdown(students) {
    const container = document.getElementById('courseBreakdownContainer');
    if (!container) return;
    
    const courseStats = {};
    
    students.forEach(student => {
        const course = student.course || 'Unknown';
        if (!courseStats[course]) {
            courseStats[course] = { total: 0, assigned: 0, unassigned: 0 };
        }
        courseStats[course].total++;
        if (student.section_id) {
            courseStats[course].assigned++;
        } else {
            courseStats[course].unassigned++;
        }
    });
    
    let html = '<div class="row g-3">';
    
    if (Object.keys(courseStats).length === 0) {
        html = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-chart-bar fa-2x mb-2 opacity-50"></i>
                <p class="mb-0">No course data available</p>
            </div>
        `;
    } else {
        for (const [course, stats] of Object.entries(courseStats)) {
            const percentage = stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0;
            const progressColor = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger';
            
            html += `
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="card-title text-primary mb-3">
                                <i class="fas fa-book me-2"></i>${course}
                            </h6>
                            <div class="d-flex justify-content-between mb-2 small">
                                <span class="text-success">
                                    <i class="fas fa-check-circle me-1"></i>
                                    Assigned: ${stats.assigned}
                                </span>
                                <span class="text-warning">
                                    <i class="fas fa-exclamation-circle me-1"></i>
                                    Pending: ${stats.unassigned}
                                </span>
                            </div>
                            <div class="progress mb-2" style="height: 8px;">
                                <div class="progress-bar bg-${progressColor}" 
                                    style="width: ${percentage}%" 
                                    role="progressbar">
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${percentage.toFixed(1)}% Complete</small>
                                <span class="badge bg-secondary">${stats.total} Total</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== VIEW STUDENT DETAILS ====================
function viewStudentDetails(studentId) {
    const student = allStudents.find(s => s.student_id === studentId);
    
    if (!student) {
        showError('Student not found');
        return;
    }
    
    const detailsHTML = `
        <div class="card border-0">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="border-bottom pb-2 mb-3">
                            <i class="fas fa-user me-2"></i>Personal Information
                        </h6>
                        <table class="table table-sm table-borderless">
                            <tr>
                                <th width="40%">Student ID:</th>
                                <td><span class="badge bg-dark">${student.student_id}</span></td>
                            </tr>
                            <tr>
                                <th>Name:</th>
                                <td><strong>${student.name}</strong></td>
                            </tr>
                            <tr>
                                <th>Email:</th>
                                <td><small>${student.email || 'N/A'}</small></td>
                            </tr>
                            <tr>
                                <th>Phone:</th>
                                <td><small>${student.phone || 'N/A'}</small></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="border-bottom pb-2 mb-3">
                            <i class="fas fa-graduation-cap me-2"></i>Academic Information
                        </h6>
                        <table class="table table-sm table-borderless">
                            <tr>
                                <th width="40%">Course:</th>
                                <td><span class="badge bg-primary">${student.course}</span></td>
                            </tr>
                            <tr>
                                <th>Section:</th>
                                <td>
                                    ${student.section_id 
                                        ? `<span class="badge bg-success">${student.section_name || student.section_id}</span>`
                                        : `<span class="badge bg-warning text-dark">Not Assigned</span>`
                                    }
                                </td>
                            </tr>
                            <tr>
                                <th>Enrollment:</th>
                                <td><small>${formatDate(student.created_at)}</small></td>
                            </tr>
                            <tr>
                                <th>Status:</th>
                                <td>
                                    ${student.is_active 
                                        ? `<span class="badge bg-success">Active</span>` 
                                        : `<span class="badge bg-danger">Inactive</span>`
                                    }
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showInfoModal(detailsHTML, 'Student Details');
}

// ==================== SHOW INFO MODAL ====================
function showInfoModal(content, title = 'Information') {
    // Check if modal already exists
    let modalEl = document.getElementById('infoModal');
    
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'infoModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        document.body.appendChild(modalEl);
    }
    
    modalEl.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// ==================== REFRESH STUDENT SECTIONS ====================
function refreshStudentSections() {
    console.log('🔄 Refreshing student sections');
    
    // Reset filters
    resetAllFilters();
    
    // Reload data
    loadStudentSectionsData();
    loadAllSections();
    
    showSuccess('Student sections refreshed');
}

// ==================== EXPORT STUDENT SECTIONS ====================
function exportStudentSections() {
    console.log('📥 Exporting student sections');
    
    if (filteredStudents.length === 0) {
        showError('No data to export');
        return;
    }
    
    // Create CSV content
    let csvContent = "Student ID,Name,Email,Phone,Course,Section,Status\n";
    
    filteredStudents.forEach(student => {
        const row = [
            student.student_id || '',
            student.name || '',
            student.email || '',
            student.phone || '',
            student.course || '',
            student.section_name || student.section_id || 'Not Assigned',
            student.section_id ? 'Assigned' : 'Unassigned'
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_sections_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Exported ${filteredStudents.length} students`);
}

// ==================== FORMAT DATE ====================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// ==================== SHOW ERROR ====================
function showError(message) {
    console.error('Error:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            confirmButtonText: 'OK'
        });
    } else {
        alert('❌ Error: ' + message);
    }
}

// ==================== SHOW SUCCESS ====================
function showSuccess(message) {
    console.log('Success:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        alert('✅ ' + message);
    }
}

// ==================== SHOW INFO ====================
function showInfo(message) {
    console.log('Info:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'Information',
            text: message,
            confirmButtonText: 'OK'
        });
    } else {
        alert('ℹ️ ' + message);
    }
}












// =====================================================
// TEACHER PERMISSIONS MANAGEMENT
// =====================================================

let allPermissions = [];
let filteredPermissions = [];

// Load permissions when tab is shown
document.addEventListener('DOMContentLoaded', function() {
    const permTab = document.getElementById('teacher-permissions-tab');
    if (permTab) {
        permTab.addEventListener('shown.bs.tab', function() {
            loadTeacherPermissions();
        });
    }
});

async function loadTeacherPermissions() {
    try {
        const tbody = document.getElementById('permissionsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="spinner-border text-primary"></div>
                    <p class="mt-2">Loading permissions...</p>
                </td>
            </tr>
        `;
        
        const response = await fetch(`${API_URL}/api/teacher-permissions/all`);
        const data = await response.json();
        
        if (data.success) {
            allPermissions = data.permissions || [];
            filteredPermissions = allPermissions;
            displayPermissions(allPermissions);
            updatePermissionStats();
        }
    } catch (error) {
        console.error('Error loading permissions:', error);
        showError('Failed to load permissions');
    }
}

function displayPermissions(permissions) {
    const tbody = document.getElementById('permissionsTableBody');
    const countSpan = document.getElementById('permissionsCount');
    
    countSpan.textContent = permissions.length;
    
    if (permissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-user-shield fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No permissions found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    const today = new Date();
    
    permissions.forEach((perm, index) => {
        const expiryDate = new Date(perm.expiry_date);
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        let statusClass = 'success';
        let statusText = 'Active';
        
        if (daysLeft < 0) {
            statusClass = 'danger';
            statusText = 'Expired';
        } else if (daysLeft <= 7) {
            statusClass = 'warning';
            statusText = `Expiring in ${daysLeft} days`;
        }
        
        const marksBadge = perm.can_upload_marks ? 
            '<span class="badge bg-success me-1">Marks</span>' : 
            '<span class="badge bg-secondary me-1">Marks</span>';
            
        const pdfBadge = perm.can_upload_pdfs ? 
            '<span class="badge bg-success me-1">PDFs</span>' : 
            '<span class="badge bg-secondary me-1">PDFs</span>';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${perm.teacher_name || 'N/A'}</strong>
                    <br>
                    <small class="text-muted">${perm.teacher_id}</small>
                </td>
                <td>${perm.section_name || 'N/A'}</td>
                <td>${perm.course_code || 'N/A'}</td>
                <td>
                    <span class="badge bg-success me-1">Attendance</span>
                    ${marksBadge}
                    ${pdfBadge}
                </td>
                <td>
                    ${new Date(perm.expiry_date).toLocaleDateString()}
                    ${daysLeft > 0 ? `<br><small class="text-${statusClass}">${daysLeft} days left</small>` : ''}
                </td>
                <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="revokePermission(${perm.id})">
                        <i class="fas fa-ban"></i> Revoke
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updatePermissionStats() {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    
    const active = allPermissions.filter(p => new Date(p.expiry_date) >= today);
    const expiringSoon = allPermissions.filter(p => {
        const expiry = new Date(p.expiry_date);
        return expiry >= today && expiry <= sevenDaysLater;
    });
    const expired = allPermissions.filter(p => new Date(p.expiry_date) < today);
    
    document.getElementById('totalTeachersWithPerm').textContent = 
        [...new Set(allPermissions.map(p => p.teacher_id))].length;
    document.getElementById('activePermissions').textContent = active.length;
    document.getElementById('expiringSoon').textContent = expiringSoon.length;
    document.getElementById('expiredPermissions').textContent = expired.length;
}

async function openGrantPermissionModal() {
    await loadTeachersForPermission();
    await loadSectionsForPermission();
    
    const modal = new bootstrap.Modal(document.getElementById('grantPermissionModal'));
    modal.show();
}

async function loadTeachersForPermission() {
    try {
        const response = await fetch(`${API_URL}/api/teachers/all`);
        const data = await response.json();
        
        const select = document.getElementById('permissionTeacher');
        if (data.success && data.teachers) {
            let options = '<option value="">Choose teacher...</option>';
            data.teachers.forEach(teacher => {
                options += `<option value="${teacher.teacher_id}">${teacher.name} (${teacher.teacher_id})</option>`;
            });
            select.innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

async function loadSectionsForPermission() {
    try {
        const response = await fetch(`${API_URL}/api/sections/all`);
        const data = await response.json();
        
        const select = document.getElementById('permissionSection');
        if (data.success && data.sections) {
            let options = '<option value="">Choose section...</option>';
            data.sections.forEach(section => {
                options += `<option value="${section.section_id}">${section.section_name} (${section.course_code})</option>`;
            });
            select.innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

async function grantMarksPermission() {
    const teacherId = document.getElementById('permissionTeacher').value;
    const sectionId = document.getElementById('permissionSection').value;
    const canUploadMarks = document.getElementById('canUploadMarks').checked;
    const canUploadPdfs = document.getElementById('canUploadPdfs').checked;
    const days = document.getElementById('permissionDays').value;
    
    if (!teacherId || !sectionId || !days) {
        showError('Please fill all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/grant-marks-permission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_id: teacherId,
                section_id: sectionId,
                can_upload_marks: canUploadMarks,
                can_upload_pdfs: canUploadPdfs,
                granted_by: 'admin',
                expiry_days: parseInt(days)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('grantPermissionModal'));
            modal.hide();
            
            loadTeacherPermissions();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error granting permission:', error);
        showError('Failed to grant permission');
    }
}

async function revokePermission(permissionId) {
    if (!confirm('Are you sure you want to revoke this permission?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/revoke-permission/${permissionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Permission revoked successfully');
            loadTeacherPermissions();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error revoking permission:', error);
        showError('Failed to revoke permission');
    }
}







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













