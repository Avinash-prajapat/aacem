// =====================================================
// TEACHER DASHBOARD - COMPLETE FIXED WITH ALL FUNCTIONS
// =====================================================

const API_BASE_URL = 'https://aacem-backend.onrender.com/api';

let currentTeacher = null;
let teacherSections = [];
let notifications = [];
let currentSectionId = null;
let currentSectionStudents = [];

// ==================== CHECK LOGIN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    
    const token = localStorage.getItem('teacherToken');
    const teacherData = localStorage.getItem('teacherData');
    
    if (!token || !teacherData) {
        console.log('No token found, redirecting to login...');
        window.location.href = 'teacher-login.html';
        return;
    }
    
    try {
        currentTeacher = JSON.parse(teacherData);
        console.log('Teacher logged in:', currentTeacher);
        
        // Display teacher info
        displayTeacherInfo();
        
        // Set today's date
        setTodayDates();
        
        // Load initial data
        loadDashboardData();
        loadNotifications();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup sidebar toggle
        setupSidebarToggle();
        
    } catch (error) {
        console.error('Error parsing teacher data:', error);
        localStorage.clear();
        window.location.href = 'teacher-login.html';
    }
});

// ==================== SETUP SIDEBAR TOGGLE ====================
function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const navLinks = document.querySelectorAll('.nav-link-modern');
    const quickActions = document.querySelectorAll('.quick-action-card-modern');
    const mainContentArea = document.getElementById('mainContent');

    if (!menuToggle || !sidebar || !mainContent) return;

    // Toggle sidebar on menu button click
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
        } else {
            icon.className = 'fas fa-bars';
        }
    });

    function closeSidebarOnMobile() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-chevron-right';
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', closeSidebarOnMobile);
    });

    quickActions.forEach(action => {
        action.addEventListener('click', closeSidebarOnMobile);
    });

    mainContentArea.addEventListener('click', function() {
        if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
            closeSidebarOnMobile();
        }
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-chevron-right';
        }
    });

    window.dispatchEvent(new Event('resize'));
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', toggleNotifications);
    }
    
    document.addEventListener('click', (e) => {
        const drop = document.getElementById('notificationDropdown');
        const bell = document.getElementById('notificationBell');
        if (drop && bell && !drop.contains(e.target) && !bell.contains(e.target)) {
            drop.style.display = 'none';
        }
    });
}

// ==================== SET TODAY'S DATES ====================
function setTodayDates() {
    const today = new Date().toISOString().split('T')[0];
    const attDate = document.getElementById('attendanceDate');
    const exDate = document.getElementById('examDate');
    if (attDate) attDate.value = today;
    if (exDate) exDate.value = today;
}

// ==================== DISPLAY TEACHER INFO ====================
function displayTeacherInfo() {
    const teacherName = document.getElementById('teacherName');
    const teacherSubject = document.getElementById('teacherSubject');
    const teacherId = document.getElementById('teacherId');
    const welcomeTeacherName = document.getElementById('welcomeTeacherName');
    
    if (teacherName) teacherName.textContent = currentTeacher?.name || 'Teacher';
    if (teacherSubject) teacherSubject.textContent = `Subject: ${currentTeacher?.subject || 'Not Assigned'}`;
    if (teacherId) teacherId.textContent = `ID: ${currentTeacher?.teacher_id || ''}`;
    if (welcomeTeacherName) welcomeTeacherName.textContent = currentTeacher?.name || 'Teacher';
}

// ==================== TEACHER LOGOUT ====================
function teacherLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    localStorage.clear();
    window.location.href = 'teacher-login.html';
}

// ==================== PERMISSION CHECK ====================
async function checkTeacherPermission(sectionId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher-permission/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_id: currentTeacher.teacher_id,
                section_id: sectionId,
                action: action
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error checking permission:', error);
        return { success: false, permitted: false };
    }
}

// ==================== CHECK ATTENDANCE EXISTS ====================
async function checkAttendanceExists(sectionId, date) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/attendance/check-day?section_id=${sectionId}&date=${date}`
        );
        return await response.json();
    } catch (error) {
        console.error('Error checking attendance:', error);
        return { success: false, exists: false };
    }
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/student-notices`);
        const data = await response.json();
        if (data.success) {
            notifications = data.notices || [];
            updateNotificationBadges();
            displayNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateNotificationBadges() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    const count = document.getElementById('notificationCount');
    if (badge) badge.textContent = unread;
    if (count) count.textContent = unread;
}

function displayNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="text-center py-4"><i class="fas fa-bell-slash fa-3x text-muted mb-3"></i><p>No notifications</p></div>';
        return;
    }
    
    let html = '';
    notifications.slice(0, 5).forEach(n => {
        html += `<div class="notification-item-modern" style="padding:15px;border-bottom:1px solid #eee;display:flex;gap:15px;cursor:pointer">
            <div class="notification-icon" style="width:45px;height:45px;border-radius:12px;background:#e3f2fd;color:#1e90ff;display:flex;align-items:center;justify-content:center">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <h6>${n.title || 'Notification'}</h6>
                <p>${(n.message || '').substring(0,60)}...</p>
                <span style="font-size:0.7rem;color:#999">${getTimeAgo(n.created_at)}</span>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

function getTimeAgo(date) {
    if (!date) return 'recently';
    try {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds/60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds/3600)} hours ago`;
        return `${Math.floor(seconds/86400)} days ago`;
    } catch {
        return 'recently';
    }
}

function toggleNotifications() {
    const drop = document.getElementById('notificationDropdown');
    if (drop) {
        drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
    }
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    updateNotificationBadges();
    displayNotifications();
    showAlert('All notifications marked as read', 'success');
}

// ==================== NAVIGATION ====================
function hideAllContent() {
    const ids = ['dashboardContent','sectionsContent','attendanceContent','marksContent','pdfsContent','studentsContent','notificationsContent'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-link-modern').forEach(l => l.classList.remove('active'));
}

function showDashboard() {
    hideAllContent();
    const el = document.getElementById('dashboardContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[0];
    if (nav) nav.classList.add('active');
    
    loadDashboardData();
}

function showMySections() {
    hideAllContent();
    const el = document.getElementById('sectionsContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[1];
    if (nav) nav.classList.add('active');
    
    displayTeacherSections();
}

function showAttendance() {
    hideAllContent();
    const el = document.getElementById('attendanceContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[2];
    if (nav) nav.classList.add('active');
    
    loadAttendanceRecords();
}

function showMarks() {
    hideAllContent();
    const el = document.getElementById('marksContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[3];
    if (nav) nav.classList.add('active');
    
    loadMarksRecords();
}

function showPdfs() {
    hideAllContent();
    const el = document.getElementById('pdfsContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[4];
    if (nav) nav.classList.add('active');
    
    loadPdfRecords();
}

function showStudents() {
    hideAllContent();
    const el = document.getElementById('studentsContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[5];
    if (nav) nav.classList.add('active');
    
    loadMyStudents();
}

function showAllNotifications() {
    hideAllContent();
    const el = document.getElementById('notificationsContent');
    if (el) el.style.display = 'block';
    
    const nav = document.querySelectorAll('.nav-link-modern')[6];
    if (nav) nav.classList.add('active');
    
    displayAllNotifications();
}

function displayAllNotifications() {
    const list = document.getElementById('allNotificationsList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="text-center py-5"><i class="fas fa-bell-slash fa-4x text-muted mb-3"></i><p>No notifications</p></div>';
        return;
    }
    
    let html = '';
    notifications.forEach(n => {
        html += `<div class="notification-item-modern" style="padding:15px;border-bottom:1px solid #eee;display:flex;gap:15px">
            <div class="notification-icon" style="width:45px;height:45px;border-radius:12px;background:#e3f2fd;color:#1e90ff;display:flex;align-items:center;justify-content:center">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <h6>${n.title}</h6>
                <p>${n.message}</p>
                <span style="font-size:0.7rem;color:#999">${new Date(n.created_at).toLocaleString()}</span>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

// ==================== DASHBOARD DATA ====================
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    await loadTeacherSections();
    await updateDashboardStats();
    await loadSectionsPreview();
    updateWelcomeMessage();
}

async function loadTeacherSections() {
    try {
        console.log('Loading teacher sections...');
        const response = await fetch(`${API_BASE_URL}/teacher-sections/teacher/${currentTeacher.teacher_id}`);
        const data = await response.json();
        console.log('Teacher sections response:', data);
        
        if (data.success) {
            teacherSections = data.sections || [];
            
            const totalSections = document.getElementById('totalSections');
            const sectionCount = document.getElementById('sectionCount');
            
            if (totalSections) totalSections.textContent = teacherSections.length;
            if (sectionCount) sectionCount.textContent = teacherSections.length;
            
            console.log('Teacher sections loaded:', teacherSections.length);
        } else {
            console.error('Failed to load sections:', data.message);
            teacherSections = [];
        }
    } catch (error) {
        console.error('Error loading teacher sections:', error);
        teacherSections = [];
    }
}

async function updateDashboardStats() {
    let totalStudents = 0, totalAttendance = 0, totalMarks = 0;
    
    for (const s of teacherSections) {
        totalStudents += await getSectionStudentsCount(s.section_id);
        totalAttendance += await getSectionAttendanceCount(s.section_id);
        totalMarks += await getSectionMarksCount(s.section_id);
    }
    
    const studentsEl = document.getElementById('totalStudents');
    const attendanceEl = document.getElementById('totalAttendance');
    const marksEl = document.getElementById('totalMarks');
    
    if (studentsEl) studentsEl.textContent = totalStudents;
    if (attendanceEl) attendanceEl.textContent = totalAttendance;
    if (marksEl) marksEl.textContent = totalMarks;
}

async function getSectionStudentsCount(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/students/${id}`);
        const data = await res.json();
        return data.students ? data.students.length : 0;
    } catch { return 0; }
}

async function getSectionAttendanceCount(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/section/${id}`);
        const data = await res.json();
        return data.attendance ? data.attendance.length : 0;
    } catch { return 0; }
}

async function getSectionMarksCount(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/section-marks/all?section=${id}`);
        const data = await res.json();
        return data.marks ? data.marks.length : 0;
    } catch { return 0; }
}

function updateWelcomeMessage() {
    const hour = new Date().getHours();
    let msg = hour < 12 ? 'Good morning! Ready for your classes?' : 
              hour < 17 ? 'Good afternoon! Keep up the great work!' : 
              'Good evening! Hope you had a productive day!';
    
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) welcomeMsg.textContent = msg;
}

// ==================== SECTIONS DISPLAY ====================
async function loadSectionsPreview() {
    const container = document.getElementById('sectionsPreview');
    if (!container) return;
    
    if (teacherSections.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No sections assigned yet</p>';
        return;
    }
    
    let html = '<div class="sections-grid">';
    
    for (const s of teacherSections.slice(0,3)) {
        const det = s.section_details || {};
        const count = await getSectionStudentsCount(s.section_id);
        
        html += `<div class="section-card-modern">
            <div class="section-header-modern">
                <h4>Section ${det.section_name || 'N/A'}</h4>
                <p>${det.course_code || ''}</p>
            </div>
            <div class="section-body-modern">
                <div class="section-stats-modern">
                    <div class="stat-item-modern">
                        <div class="value">${count}</div>
                        <div class="label">Students</div>
                    </div>
                    <div class="stat-item-modern">
                        <div class="value">${s.subject || 'All'}</div>
                        <div class="label">Subject</div>
                    </div>
                </div>
                <div class="action-buttons-modern">
                    <button class="action-btn-modern" onclick="openAttendanceModal('${s.section_id}')">
                        <i class="fas fa-calendar-check"></i>
                        <span>Attendance</span>
                    </button>
                    <button class="action-btn-modern" onclick="openMarksModal('${s.section_id}')">
                        <i class="fas fa-edit"></i>
                        <span>Marks</span>
                    </button>
                    <button class="action-btn-modern" onclick="openPdfModal('${s.section_id}')">
                        <i class="fas fa-file-pdf"></i>
                        <span>PDFs</span>
                    </button>
                </div>
            </div>
        </div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

async function displayTeacherSections() {
    const container = document.getElementById('sectionsContainer');
    if (!container) return;
    
    if (teacherSections.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No sections assigned yet</p>';
        return;
    }
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading sections...</p></div>';
    
    let html = '<div class="sections-grid">';
    
    for (const s of teacherSections) {
        const det = s.section_details || {};
        const count = await getSectionStudentsCount(s.section_id);
        
        html += `<div class="section-card-modern">
            <div class="section-header-modern">
                <h4>Section ${det.section_name || 'N/A'}</h4>
                <p>${det.course_code || ''}</p>
            </div>
            <div class="section-body-modern">
                <div class="section-stats-modern">
                    <div class="stat-item-modern">
                        <div class="value">${count}</div>
                        <div class="label">Students</div>
                    </div>
                    <div class="stat-item-modern">
                        <div class="value">${s.subject || 'All'}</div>
                        <div class="label">Subject</div>
                    </div>
                </div>
                <div class="action-buttons-modern">
                    <button class="action-btn-modern" onclick="openAttendanceModal('${s.section_id}')">
                        <i class="fas fa-calendar-check"></i>
                        <span>Attendance</span>
                    </button>
                    <button class="action-btn-modern" onclick="openMarksModal('${s.section_id}')">
                        <i class="fas fa-edit"></i>
                        <span>Marks</span>
                    </button>
                    <button class="action-btn-modern" onclick="openPdfModal('${s.section_id}')">
                        <i class="fas fa-file-pdf"></i>
                        <span>PDFs</span>
                    </button>
                </div>
            </div>
        </div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== ATTENDANCE ====================
function takeAttendance() { 
    showMySections(); 
    showAlert('Select a section to take attendance', 'info'); 
}

async function openAttendanceModal(sectionId) {
    currentSectionId = sectionId;
    const date = document.getElementById('attendanceDate').value;
    const exists = await checkAttendanceExists(sectionId, date);
    
    if (exists.exists) {
        showAlert(`Attendance already marked for ${date}`, 'error');
        return;
    }
    
    const select = document.getElementById('attendanceSectionSelect');
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}">Section ${section?.section_details?.section_name || ''}</option>`;
    
    await loadStudentsForAttendance(sectionId);
    
    const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
    modal.show();
}

async function loadStudentsForAttendance(id) {
    const container = document.getElementById('attendanceStudentsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading students...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/students/${id}`);
        const data = await res.json();
        
        if (!data.success || !data.students || data.students.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">No students in this section</p>';
            return;
        }
        
        currentSectionStudents = data.students;
        
        let html = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>#</th><th>Name</th><th>ID</th><th>Present</th></tr></thead><tbody>';
        
        data.students.forEach((s,i) => {
            html += `<tr>
                <td>${i+1}</td>
                <td>${s.name}</td>
                <td><small>${s.student_id}</small></td>
                <td class="text-center">
                    <input type="checkbox" class="attendance-checkbox" data-student-id="${s.student_id}" checked>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading students:', error);
        container.innerHTML = '<p class="text-danger text-center">Failed to load students</p>';
    }
}

function markAllPresent() { 
    document.querySelectorAll('.attendance-checkbox').forEach(cb => cb.checked = true); 
}

function markAllAbsent() { 
    document.querySelectorAll('.attendance-checkbox').forEach(cb => cb.checked = false); 
}

async function submitAttendance() {
    const sectionId = currentSectionId;
    const date = document.getElementById('attendanceDate').value;
    const subject = document.getElementById('attendanceSubject').value.trim() || 'General';
    
    const exists = await checkAttendanceExists(sectionId, date);
    if (exists.exists) {
        showAlert('Attendance already marked for this day', 'error');
        return;
    }
    
    const data = {};
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        data[cb.dataset.studentId] = cb.checked ? 'present' : 'absent';
    });
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/mark-restricted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                section_id: sectionId, 
                date, 
                subject, 
                attendance: data, 
                teacher_id: currentTeacher.teacher_id 
            })
        });
        
        const result = await res.json();
        
        if (result.success) {
            showAlert('Attendance saved successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            if (modal) modal.hide();
            
            loadDashboardData();
            loadAttendanceRecords();
        } else {
            showAlert(result.message || 'Failed to save attendance', 'error');
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showAlert('Failed to save attendance', 'error');
    }
}

async function loadAttendanceRecords() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading attendance...</p></td></tr>';
    
    let html = '';
    let hasData = false;
    
    for (const s of teacherSections) {
        try {
            const res = await fetch(`${API_BASE_URL}/section-attendance/section/${s.section_id}`);
            const data = await res.json();
            
            if (data.success && data.attendance && data.attendance.length > 0) {
                hasData = true;
                data.attendance.slice(0,10).forEach(r => {
                    const cls = r.percentage >= 80 ? 'success' : r.percentage >= 60 ? 'warning' : 'danger';
                    html += `<tr>
                        <td>${r.date}</td>
                        <td>Section ${s.section_details?.section_name || ''}</td>
                        <td>${r.subject || 'General'}</td>
                        <td><span class="badge bg-success">${r.present_count}</span></td>
                        <td><span class="badge bg-danger">${r.absent_count}</span></td>
                        <td><span class="badge bg-${cls}">${r.percentage}%</span></td>
                    </tr>`;
                });
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    }
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="text-center py-4">No attendance records found</td></tr>';
}

// ==================== MARKS ====================
function enterMarks() { 
    showMySections(); 
    showAlert('Select a section to enter marks', 'info'); 
}

async function openMarksModal(sectionId) {
    const perm = await checkTeacherPermission(sectionId, 'marks');
    
    if (!perm.permitted) {
        showAlert('Admin permission required to upload marks', 'error');
        return;
    }
    
    currentSectionId = sectionId;
    
    const select = document.getElementById('marksSectionSelect');
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}">Section ${section?.section_details?.section_name || ''}</option>`;
    
    if (perm.permission?.expiry_date) {
        const old = document.getElementById('permissionBadge');
        if (old) old.remove();
        
        const badge = document.createElement('span');
        badge.id = 'permissionBadge';
        badge.className = 'badge bg-success ms-2';
        badge.textContent = `Valid till: ${new Date(perm.permission.expiry_date).toLocaleDateString()}`;
        
        const header = document.querySelector('#marksModal .modal-header');
        if (header) header.appendChild(badge);
    }
    
    await loadStudentsForMarks(sectionId);
    
    const modal = new bootstrap.Modal(document.getElementById('marksModal'));
    modal.show();
}

async function loadStudentsForMarks(id) {
    const container = document.getElementById('marksStudentsList');
    const total = document.getElementById('totalMarks').value;
    
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading students...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/students/${id}`);
        const data = await res.json();
        
        if (!data.success || !data.students || data.students.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">No students in this section</p>';
            return;
        }
        
        let html = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>#</th><th>Name</th><th>ID</th><th>Marks</th></tr></thead><tbody>';
        
        data.students.forEach((s,i) => {
            html += `<tr>
                <td>${i+1}</td>
                <td>${s.name}</td>
                <td><small>${s.student_id}</small></td>
                <td>
                    <input type="number" class="form-control form-control-sm marks-input" 
                           data-student-id="${s.student_id}"
                           data-student-name="${s.name}"
                           min="0" max="${total}" step="0.01" 
                           placeholder="Enter marks">
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading students for marks:', error);
        container.innerHTML = '<p class="text-danger text-center">Failed to load students</p>';
    }
}

async function submitMarks() {
    const sectionId = currentSectionId;
    const examType = document.getElementById('examType').value;
    const examDate = document.getElementById('examDate').value;
    const subject = document.getElementById('marksSubject').value.trim();
    const total = parseInt(document.getElementById('totalMarks').value);
    
    if (!examType || !subject) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    const section = teacherSections.find(s => s.section_id === sectionId);
    const courseCode = section?.section_details?.course_code || '';
    
    const marksData = [];
    document.querySelectorAll('.marks-input').forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val >= 0) {
            marksData.push({
                student_id: inp.dataset.studentId,
                student_name: inp.dataset.studentName,
                marks_obtained: val
            });
        }
    });
    
    if (marksData.length === 0) {
        showAlert('Please enter at least one mark', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-marks/save-bulk-restricted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam_type: examType, 
                exam_date: examDate, 
                course_code: courseCode,
                section_id: sectionId, 
                subject: subject, 
                total_marks: total,
                marks_data: marksData, 
                teacher_id: currentTeacher.teacher_id
            })
        });
        
        const result = await res.json();
        
        if (result.success) {
            showAlert('Marks saved successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('marksModal'));
            if (modal) modal.hide();
            
            loadDashboardData();
        } else {
            showAlert(result.message || 'Failed to save marks', 'error');
        }
    } catch (error) {
        console.error('Error saving marks:', error);
        showAlert('Failed to save marks', 'error');
    }
}

async function loadMarksRecords() {
    const tbody = document.getElementById('marksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading marks...</p></td></tr>';
    
    let html = '';
    let hasData = false;
    
    for (const s of teacherSections) {
        try {
            const res = await fetch(`${API_BASE_URL}/section-marks/all?section=${s.section_id}`);
            const data = await res.json();
            
            if (data.success && data.marks && data.marks.length > 0) {
                hasData = true;
                data.marks.slice(0,20).forEach(m => {
                    html += `<tr>
                        <td>${m.exam_type || 'N/A'}</td>
                        <td>Section ${s.section_details?.section_name || ''}</td>
                        <td>${m.student_name || 'N/A'}</td>
                        <td>${m.subject || 'N/A'}</td>
                        <td>${m.marks_obtained || 0}/${m.total_marks || 100}</td>
                        <td>${m.percentage || 0}%</td>
                        <td>${m.grade || 'N/A'}</td>
                    </tr>`;
                });
            }
        } catch (error) {
            console.error('Error loading marks:', error);
        }
    }
    
    tbody.innerHTML = html || '<tr><td colspan="7" class="text-center py-4">No marks records found</td></tr>';
}

// ==================== PDFs ====================
function uploadPdf() {
    const select = document.getElementById('pdfSectionSelect');
    if (!select) return;
    
    let options = '<option value="">Select section...</option>';
    teacherSections.forEach(s => {
        options += `<option value="${s.section_id}">Section ${s.section_details?.section_name || ''}</option>`;
    });
    select.innerHTML = options;
    
    const modal = new bootstrap.Modal(document.getElementById('pdfModal'));
    modal.show();
}

function openPdfModal() { 
    uploadPdf(); 
}

async function submitPdf() {
    const sectionId = document.getElementById('pdfSectionSelect').value;
    const title = document.getElementById('pdfTitle').value.trim();
    const desc = document.getElementById('pdfDescription').value.trim();
    const file = document.getElementById('pdfFile').files[0];
    
    if (!sectionId || !title || !file) {
        showAlert('Please fill all fields', 'error');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showAlert('Only PDF files are allowed', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showAlert('File size must be less than 10MB', 'error');
        return;
    }
    
    const section = teacherSections.find(s => s.section_id === sectionId);
    
    const formData = new FormData();
    formData.append('course_code', section?.section_details?.course_code || '');
    formData.append('section_id', sectionId);
    formData.append('pdf_title', title);
    formData.append('description', desc);
    formData.append('pdf_file', file);
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-pdfs/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await res.json();
        
        if (result.success) {
            showAlert('PDF uploaded successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('pdfModal'));
            if (modal) modal.hide();
            
            document.getElementById('pdfForm').reset();
            loadPdfRecords();
        } else {
            showAlert(result.message || 'Failed to upload PDF', 'error');
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
        showAlert('Failed to upload PDF', 'error');
    }
}

async function loadPdfRecords() {
    const container = document.getElementById('pdfsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading PDFs...</p></div>';
    
    let html = '';
    let hasData = false;
    
    for (const s of teacherSections) {
        try {
            const res = await fetch(`${API_BASE_URL}/section-pdfs/all?section=${s.section_id}`);
            const data = await res.json();
            
            if (data.success && data.pdfs && data.pdfs.length > 0) {
                hasData = true;
                data.pdfs.forEach(p => {
                    const date = new Date(p.created_at).toLocaleDateString();
                    html += `<div class="pdf-card-modern">
                        <div class="pdf-icon-modern">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <div class="pdf-title-modern">${p.pdf_title}</div>
                        <div class="pdf-meta-modern">${date}</div>
                        <div class="pdf-actions-modern">
                            <button class="pdf-btn-modern view" onclick="viewPdf('${p.pdf_id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="pdf-btn-modern download" onclick="downloadPdf('${p.pdf_id}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>`;
                });
            }
        } catch (error) {
            console.error('Error loading PDFs:', error);
        }
    }
    
    container.innerHTML = html || '<p class="text-center text-muted py-4">No PDFs uploaded yet</p>';
}

function viewPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}`, '_blank'); 
}

function downloadPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}?download=true`, '_blank'); 
}

// ==================== STUDENTS ====================
async function loadMyStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading students...</p></td></tr>';
    
    let html = '', idx = 1;
    let hasData = false;
    
    for (const s of teacherSections) {
        try {
            const res = await fetch(`${API_BASE_URL}/section-attendance/students/${s.section_id}`);
            const data = await res.json();
            
            if (data.success && data.students && data.students.length > 0) {
                hasData = true;
                data.students.forEach(st => {
                    html += `<tr>
                        <td>${idx++}</td>
                        <td>${st.student_id}</td>
                        <td>${st.name}</td>
                        <td>Section ${s.section_details?.section_name || ''}</td>
                    </tr>`;
                });
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }
    
    tbody.innerHTML = html || '<tr><td colspan="4" class="text-center py-4">No students found</td></tr>';
}

// ==================== ALERTS ====================
function showAlert(msg, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert-modern ${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${msg}
    `;
    
    container.appendChild(alert);
    
    setTimeout(() => alert.remove(), 3000);
}

// ==================== OPEN CHANGE PASSWORD MODAL ====================
function openChangePasswordModal() {
    // Reset form
    document.getElementById('changePasswordForm').reset();
    document.getElementById('strengthBar').className = 'strength-bar';
    document.getElementById('matchMessage').innerHTML = '';
    document.getElementById('passwordHelp').innerHTML = 'Password must be at least 6 characters';
    
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

// ==================== TOGGLE PASSWORD FIELD ====================
function togglePasswordField(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(`toggle${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ==================== CHECK PASSWORD STRENGTH ====================
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const helpText = document.getElementById('passwordHelp');
    
    // Remove all classes
    strengthBar.className = 'strength-bar';
    
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        helpText.innerHTML = 'Password must be at least 6 characters';
        return;
    }
    
    // Check strength
    let strength = 0;
    
    // Length check
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) strength += 1;  // lowercase
    if (/[A-Z]/.test(password)) strength += 1;  // uppercase
    if (/[0-9]/.test(password)) strength += 1;  // numbers
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;  // special characters
    
    // Update bar based on strength
    if (strength <= 2) {
        strengthBar.classList.add('weak');
        helpText.innerHTML = 'Weak password';
    } else if (strength <= 4) {
        strengthBar.classList.add('medium');
        helpText.innerHTML = 'Medium password';
    } else {
        strengthBar.classList.add('strong');
        helpText.innerHTML = 'Strong password';
    }
    
    // Check match if confirm password has value
    const confirm = document.getElementById('confirmPassword').value;
    if (confirm) checkPasswordMatch();
}

// ==================== CHECK PASSWORD MATCH ====================
function checkPasswordMatch() {
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const matchMsg = document.getElementById('matchMessage');
    
    if (confirm.length === 0) {
        matchMsg.innerHTML = '';
        return;
    }
    
    if (newPass === confirm) {
        matchMsg.innerHTML = '<i class="fas fa-check-circle me-1"></i> Passwords match';
        matchMsg.className = 'password-match-success';
    } else {
        matchMsg.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Passwords do not match';
        matchMsg.className = 'password-match-error';
    }
}

// ==================== CHANGE PASSWORD ====================
async function changePassword() {
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPass || !newPass || !confirmPass) {
        showAlert('Please fill all fields', 'error');
        return;
    }
    
    if (newPass.length < 6) {
        showAlert('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPass !== confirmPass) {
        showAlert('New passwords do not match', 'error');
        return;
    }
    
    // Disable button
    const btn = document.getElementById('changePasswordBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Updating...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/teacher-change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_id: currentTeacher.teacher_id,
                current_password: currentPass,
                new_password: newPass
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Password changed successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            
            // Clear form
            document.getElementById('changePasswordForm').reset();
            
            // Optional: Logout after password change (security)
            if (confirm('Password changed. Do you want to login again with new password?')) {
                teacherLogout();
            }
        } else {
            showAlert(result.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showAlert('Network error. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
