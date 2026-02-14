// =====================================================
// TEACHER DASHBOARD - COMPLETE FIXED WITH ALL FUNCTIONS
// =====================================================

const API_BASE_URL = 'https://aacem-backend.onrender.com/api';

let currentTeacher = null;
let teacherSections = [];
let notifications = [];
let currentSectionId = null;
let currentSectionStudents = [];
let currentSubject = null;

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

// ==================== LOGOUT FUNCTION ====================
function teacherLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login
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

// ==================== FIXED: Check Attendance with Strict Subject Match ====================
async function checkAttendanceExists(sectionId, date, subject) {
    try {
        const url = `${API_BASE_URL}/attendance/check-day?section_id=${sectionId}&date=${date}&subject=${encodeURIComponent(subject)}`;
        console.log(`Checking attendance: ${url}`);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log(`Attendance check for ${subject} on ${date}:`, result);
        
        // ✅ Extra check: agar record mila bhi to verify karo ki subject match karta hai
        if (result.exists && result.attendance) {
            const dbSubject = result.attendance.subject;
            if (dbSubject !== subject) {
                console.warn(`⚠️ Subject mismatch! DB has ${dbSubject}, but checking for ${subject}`);
                // Agar subject match nahi karta to treat as not exists
                return { success: true, exists: false, message: 'Subject mismatch' };
            }
        }
        
        return result;
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

// ==================== FIXED: Load Teacher Sections with ALL Subjects ====================
async function loadTeacherSections() {
    try {
        console.log('Loading teacher sections...');
        const response = await fetch(`${API_BASE_URL}/teacher-sections/teacher/${currentTeacher.teacher_id}`);
        const data = await response.json();
        console.log('Raw API Response:', data);
        
        if (data.success) {
            const rawSections = data.sections || [];
            console.log('Raw sections from API:', rawSections);
            
            const sectionMap = new Map();
            
            rawSections.forEach(item => {
                const sectionId = item.section_id;
                const sectionDetails = item.section_details || {};
                
                // ✅ IMPORTANT: Subjects ko mappings[0].subjects se lo (backend ne yahan rakha hai)
                let subjectList = [];
                
                // Check mappings array for subjects
                if (item.mappings && item.mappings.length > 0 && item.mappings[0].subjects) {
                    subjectList = item.mappings[0].subjects;
                    console.log(`Found subjects in mappings for ${sectionId}:`, subjectList);
                }
                // Fallback to direct subjects array
                else if (item.subjects && Array.isArray(item.subjects)) {
                    subjectList = item.subjects;
                    console.log(`Found subjects directly for ${sectionId}:`, subjectList);
                }
                // Fallback to individual subject
                else if (item.subject) {
                    subjectList = [item.subject];
                    console.log(`Found single subject for ${sectionId}:`, item.subject);
                }
                
                if (!sectionMap.has(sectionId)) {
                    sectionMap.set(sectionId, {
                        section_id: sectionId,
                        section_details: sectionDetails,
                        subjects: [],
                        mappings: [],
                        studentCount: 0
                    });
                }
                
                const sectionData = sectionMap.get(sectionId);
                
                // Add all subjects from the list
                subjectList.forEach(subj => {
                    if (!sectionData.subjects.includes(subj)) {
                        sectionData.subjects.push(subj);
                    }
                });
                
                sectionData.mappings.push(item);
            });
            
            // Convert map to array
            teacherSections = Array.from(sectionMap.values());
            
            console.log('✅ Processed teacher sections with ALL subjects:', teacherSections);
            
            // Update UI
            const totalSections = document.getElementById('totalSections');
            const sectionCount = document.getElementById('sectionCount');
            
            if (totalSections) totalSections.textContent = teacherSections.length;
            if (sectionCount) sectionCount.textContent = teacherSections.length;
            
            // Update student counts
            await updateSectionStudentCounts();
            
            // Refresh displays
            displayTeacherSections();
            loadSectionsPreview();
            
        } else {
            console.error('Failed to load sections:', data.message);
            teacherSections = [];
        }
    } catch (error) {
        console.error('Error loading teacher sections:', error);
        teacherSections = [];
    }
}

// ==================== Update Section Student Counts ====================
async function updateSectionStudentCounts() {
    for (const section of teacherSections) {
        try {
            const count = await getSectionStudentsCount(section.section_id);
            section.studentCount = count;
        } catch {
            section.studentCount = 0;
        }
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

// ==================== FIXED: Load Sections Preview ====================
async function loadSectionsPreview() {
    const container = document.getElementById('sectionsPreview');
    if (!container) return;
    
    if (teacherSections.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No sections assigned yet</p>';
        return;
    }
    
    let html = '<div class="sections-grid">';
    let cardCount = 0;
    let totalSubjects = 0;
    
    // Count total subjects first
    teacherSections.forEach(s => totalSubjects += s.subjects.length);
    
    // Dashboard mein sirf 3 cards dikhao
    for (const section of teacherSections) {
        const det = section.section_details || {};
        const count = section.studentCount || await getSectionStudentsCount(section.section_id);
        
        for (let i = 0; i < section.subjects.length; i++) {
            if (cardCount >= 3) break;
            
            const subject = section.subjects[i];
            
            const colors = [
                { bg: 'linear-gradient(135deg, #4361ee, #4895ef)' },
                { bg: 'linear-gradient(135deg, #06d6a0, #1b9aaa)' },
                { bg: 'linear-gradient(135deg, #ffd166, #f8c630)' }
            ];
            
            html += `<div class="section-card-modern" style="border-top: 4px solid #4361ee;">
                <div class="section-header-modern" style="background: ${colors[cardCount % 3].bg};">
                    <h4 class="mb-0">Section ${det.section_name || 'N/A'}</h4>
                    <small>${subject}</small>
                </div>
                <div class="section-body-modern">
                    <div class="section-stats-modern">
                        <div class="stat-item-modern">
                            <div class="value">${count}</div>
                            <div class="label">Students</div>
                        </div>
                        <div class="stat-item-modern">
                            <div class="value">${section.subjects.length}</div>
                            <div class="label">Subjects</div>
                        </div>
                    </div>
                    
                    <div class="action-buttons-modern">
                        <button class="action-btn-modern" onclick="openAttendanceModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-calendar-check"></i>
                        </button>
                        <button class="action-btn-modern" onclick="openMarksModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-modern" onclick="openPdfModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </div>
                </div>
            </div>`;
            
            cardCount++;
        }
    }
    
    // Agar zyada subjects hain to "View All" card dikhao
    if (totalSubjects > 3) {
        html += `<div class="section-card-modern" style="background: linear-gradient(135deg, #6c757d, #495057);">
            <div class="section-header-modern" style="background: linear-gradient(135deg, #6c757d, #495057);">
                <h4 class="text-center text-white">+${totalSubjects - 3} More Subjects</h4>
            </div>
            <div class="section-body-modern text-center">
                <i class="fas fa-layer-group fa-3x text-white-50 mb-3"></i>
                <button class="btn btn-light btn-sm w-100" onclick="showMySections()">
                    <i class="fas fa-eye me-1"></i> View All Subjects
                </button>
            </div>
        </div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== FIXED: Display Teacher Sections with Correct Student Count ====================
async function displayTeacherSections() {
    const container = document.getElementById('sectionsContainer');
    if (!container) return;
    
    if (teacherSections.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No sections assigned yet</p>';
        return;
    }
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading sections...</p></div>';
    
    let html = '<div class="sections-grid">';
    
    for (const section of teacherSections) {
        const det = section.section_details || {};
        
        // ✅ Har section ke liye alag se student count fetch karo
        const studentCount = await getSectionStudentsCount(section.section_id);
        
        // Subject ke according different colors
        const colors = [
            { bg: 'linear-gradient(135deg, #4361ee, #4895ef)', border: '#4361ee' }, // Blue
            { bg: 'linear-gradient(135deg, #06d6a0, #1b9aaa)', border: '#06d6a0' }, // Green
            { bg: 'linear-gradient(135deg, #ffd166, #f8c630)', border: '#ffd166' }, // Yellow
            { bg: 'linear-gradient(135deg, #ef476f, #d62828)', border: '#ef476f' }, // Red
            { bg: 'linear-gradient(135deg, #9c89b8, #7b6c9c)', border: '#9c89b8' }  // Purple
        ];
        
        section.subjects.forEach((subject, index) => {
            const colorScheme = colors[index % colors.length];
            
            html += `<div class="section-card-modern" style="border-top: 4px solid ${colorScheme.border};">
                <div class="section-header-modern" style="background: ${colorScheme.bg};">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="mb-0">Section ${det.section_name || 'N/A'}</h4>
                            <small>${det.course_code || ''}</small>
                        </div>
                        <span class="badge bg-light text-dark" style="font-size: 0.9rem; padding: 5px 12px;">
                            <i class="fas fa-book me-1"></i> ${subject}
                        </span>
                    </div>
                </div>
                <div class="section-body-modern">
                    <div class="section-stats-modern">
                        <div class="stat-item-modern">
                            <div class="value">${studentCount}</div>
                            <div class="label">Students</div>
                        </div>
                        <div class="stat-item-modern">
                            <div class="value">${section.subjects.length}</div>
                            <div class="label">Subjects</div>
                        </div>
                    </div>
                    
                    <div class="text-center mb-3 p-2 bg-light rounded">
                        <span class="fw-bold text-primary">Currently Teaching:</span>
                        <div class="mt-1">
                            <span class="badge bg-info p-2" style="font-size: 1rem;">
                                ${subject}
                            </span>
                        </div>
                    </div>
                    
                    <div class="action-buttons-modern">
                        <button class="action-btn-modern" onclick="openAttendanceModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-calendar-check"></i>
                            <span>Attendance</span>
                        </button>
                        <button class="action-btn-modern" onclick="openMarksModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-edit"></i>
                            <span>Marks</span>
                        </button>
                        <button class="action-btn-modern" onclick="openPdfModal('${section.section_id}', '${subject}')">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDFs</span>
                        </button>
                    </div>
                </div>
            </div>`;
        });
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== ATTENDANCE ====================
function takeAttendance() { 
    showMySections(); 
    showAlert('Select a section to take attendance', 'info'); 
}

// ==================== FIXED: Sirf Manual Check Use Karo ====================
async function openAttendanceModal(sectionId, subject) {
    currentSectionId = sectionId;
    currentSubject = subject;
    const date = document.getElementById('attendanceDate').value;
    
    // ✅ SIRF manual check use karo, API call nahi
    const exists = await checkAttendanceManually(sectionId, date, subject);
    
    if (exists.exists) {
        showAlert(`Attendance already marked for ${subject} on ${date}`, 'error');
        return;
    }
    
    const select = document.getElementById('attendanceSectionSelect');
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}">Section ${section?.section_details?.section_name || ''}</option>`;
    
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    if (subjectSelect) {
        subjectSelect.innerHTML = `<option value="${subject}" selected>${subject}</option>`;
        subjectSelect.disabled = true;
    }
    
    const modalTitle = document.querySelector('#attendanceModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-calendar-check me-2"></i>Take Attendance - ${subject}`;
    }
    
    await loadStudentsForAttendance(sectionId);
    
    const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
    modal.show();
}

// ==================== IMPROVED Manual Check ====================
async function checkAttendanceManually(sectionId, date, subject) {
    try {
        console.log(`Manual check for ${subject} on ${date}`);
        
        // Saare attendance records fetch karo for this section and date
        const response = await fetch(`${API_BASE_URL}/section-attendance/filter?section=${sectionId}&date=${date}`);
        const data = await response.json();
        
        if (data.success && data.attendance) {
            // Check if any record matches the subject EXACTLY
            const matchingRecord = data.attendance.find(record => record.subject === subject);
            
            if (matchingRecord) {
                console.log(`✅ Found attendance for ${subject}:`, matchingRecord);
                return { success: true, exists: true, attendance: matchingRecord };
            } else {
                console.log(`❌ No attendance for ${subject}`);
                return { success: true, exists: false };
            }
        }
        
        return { success: true, exists: false };
    } catch (error) {
        console.error('Error in manual check:', error);
        return { success: false, exists: false };
    }
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

// ==================== DEBUG: Check Submit Attendance Data ====================
async function submitAttendance() {
    const sectionId = currentSectionId;
    const date = document.getElementById('attendanceDate').value;
    const subject = currentSubject;
    
    if (!subject) {
        showAlert('Subject not selected', 'error');
        return;
    }
    
    // Double-check before saving
    const exists = await checkAttendanceManually(sectionId, date, subject);
    if (exists.exists) {
        showAlert(`Attendance already marked for ${subject} on this day`, 'error');
        return;
    }
    
    const data = {};
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        data[cb.dataset.studentId] = cb.checked ? 'present' : 'absent';
    });
    
    // ✅ DEBUG: Check what we're sending
    const payload = { 
        section_id: sectionId, 
        date, 
        subject, 
        attendance: data, 
        teacher_id: currentTeacher.teacher_id 
    };
    
    console.log('📤 Sending attendance payload:', JSON.stringify(payload, null, 2));
    console.log('Section ID:', sectionId);
    console.log('Date:', date);
    console.log('Subject:', subject);
    console.log('Teacher ID:', currentTeacher.teacher_id);
    console.log('Students count:', Object.keys(data).length);
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/mark-restricted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            showAlert(`${subject} attendance saved successfully!`, 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            if (modal) modal.hide();
            
            loadDashboardData();
            loadAttendanceRecords();
        } else {
            showAlert(result.message || 'Failed to save attendance', 'error');
        }
    } catch (error) {
        console.error('❌ Error saving attendance:', error);
        showAlert('Network error. Please try again.', 'error');
    }
}


// ==================== FIXED: Load Attendance Records with Duplicate Filter ====================
async function loadAttendanceRecords() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading attendance...</p></td></tr>';
    
    try {
        // Map to store unique records (use latest by id)
        const recordsMap = new Map();
        
        for (const section of teacherSections) {
            const response = await fetch(`${API_BASE_URL}/section-attendance/section/${section.section_id}`);
            const data = await response.json();
            
            if (data.success && data.attendance) {
                data.attendance.forEach(record => {
                    const key = `${record.date}_${record.subject}`;
                    
                    // Agar pehle se record hai to compare karo
                    if (recordsMap.has(key)) {
                        const existing = recordsMap.get(key);
                        // Latest ID wala rakho
                        if (record.id > existing.id) {
                            recordsMap.set(key, {
                                ...record,
                                section_name: section.section_details?.section_name || 'N/A'
                            });
                        }
                    } else {
                        recordsMap.set(key, {
                            ...record,
                            section_name: section.section_details?.section_name || 'N/A'
                        });
                    }
                });
            }
        }
        
        // Convert map to array and sort
        const uniqueRecords = Array.from(recordsMap.values());
        uniqueRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (uniqueRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No attendance records found</td></tr>';
            return;
        }
        
        let html = '';
        uniqueRecords.forEach(record => {
            const cls = record.percentage >= 80 ? 'success' : 
                       record.percentage >= 60 ? 'warning' : 'danger';
            
            html += `<tr>
                <td>${record.date}</td>
                <td>Section ${record.section_name || 'C'}</td>
                <td><span class="badge bg-info">${record.subject}</span></td>
                <td><span class="badge bg-success">${record.present_count}</span></td>
                <td><span class="badge bg-danger">${record.absent_count}</span></td>
                <td><span class="badge bg-${cls}">${record.percentage}%</span></td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load attendance</td></tr>';
    }
}

// ==================== Filter Attendance by Subject ====================
function filterAttendanceBySubject() {
    loadAttendanceRecords();
}

// Update the filter dropdown when loading
function updateSubjectFilter() {
    const subjectFilter = document.getElementById('filterSubject');
    if (!subjectFilter) return;
    
    let options = '<option value="">All Subjects</option>';
    const allSubjects = new Set();
    
    teacherSections.forEach(s => {
        s.subjects.forEach(subj => allSubjects.add(subj));
    });
    
    Array.from(allSubjects).sort().forEach(subj => {
        options += `<option value="${subj}">${subj}</option>`;
    });
    
    subjectFilter.innerHTML = options;
}

// Call this after loading teacher sections
// updateSubjectFilter();
// ==================== LOAD TEACHER SUBJECT FOR ATTENDANCE ====================
function loadTeacherSubjectForAttendance() {
    const sectionSelect = document.getElementById('attendanceSectionSelect');
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    const sectionId = sectionSelect.value;
    
    if (!sectionId) {
        subjectSelect.innerHTML = '<option value="">Select section first...</option>';
        return;
    }
    
    // Find the section in teacherSections array
    const section = teacherSections.find(s => s.section_id === sectionId);
    
    if (section && section.subject) {
        // Teacher ka assigned subject hai
        subjectSelect.innerHTML = `<option value="${section.subject}" selected>${section.subject}</option>`;
    } else {
        // Agar subject assign nahi hai to general option
        subjectSelect.innerHTML = `
            <option value="General" selected>General</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
        `;
    }
}

// ==================== LOAD TEACHER SUBJECT FOR MARKS ====================
function loadTeacherSubjectForMarks() {
    const sectionSelect = document.getElementById('marksSectionSelect');
    const subjectSelect = document.getElementById('marksSubjectSelect');
    const sectionId = sectionSelect.value;
    
    if (!sectionId) {
        subjectSelect.innerHTML = '<option value="">Select section first...</option>';
        return;
    }
    
    // Find the section in teacherSections array
    const section = teacherSections.find(s => s.section_id === sectionId);
    
    if (section && section.subject) {
        // Teacher ka assigned subject hai
        subjectSelect.innerHTML = `<option value="${section.subject}" selected>${section.subject}</option>`;
        
        // Permission badge ke liye bhi use karo
        const permissionBadge = document.getElementById('permissionBadge');
        if (permissionBadge) {
            permissionBadge.textContent = `Teaching: ${section.subject}`;
        }
    } else {
        // Agar subject assign nahi hai to general options
        subjectSelect.innerHTML = `
            <option value="General" selected>General</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
        `;
    }
}

// ==================== MARKS ====================
function enterMarks() { 
    showMySections(); 
    showAlert('Select a section to enter marks', 'info'); 
}

// ==================== Open Marks Modal with Subject ====================
async function openMarksModal(sectionId, subject) {
    const perm = await checkTeacherPermission(sectionId, 'marks');
    
    if (!perm.permitted) {
        showAlert('Admin permission required to upload marks', 'error');
        return;
    }
    
    currentSectionId = sectionId;
    currentSubject = subject;
    
    const select = document.getElementById('marksSectionSelect');
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}">Section ${section?.section_details?.section_name || ''}</option>`;
    
    // Subject dropdown - disabled with selected subject
    const subjectSelect = document.getElementById('marksSubjectSelect');
    if (subjectSelect) {
        subjectSelect.innerHTML = `<option value="${subject}" selected>${subject}</option>`;
        subjectSelect.disabled = true;
    }
    
    // Update modal title
    const modalTitle = document.querySelector('#marksModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-edit me-2"></i>Enter Marks - ${subject}`;
    }
    
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

// ==================== FIXED: Submit Marks with Better Validation ====================
async function submitMarks() {
    const sectionId = currentSectionId;
    const examType = document.getElementById('examType').value;
    const examDate = document.getElementById('examDate').value;
    const subject = currentSubject;  // Use stored subject
    let total = document.getElementById('totalMarks').value;
    
    if (!examType || !subject) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
    // ✅ FIX: Ensure total is a valid number
    total = parseInt(total);
    if (isNaN(total) || total <= 0) {
        total = 100;
    }
    
    const section = teacherSections.find(s => s.section_id === sectionId);
    const courseCode = section?.section_details?.course_code || '';
    
    const marksData = [];
    let hasError = false;
    
    document.querySelectorAll('.marks-input').forEach(inp => {
        let val = inp.value.trim();
        
        // ✅ FIX: Handle empty or invalid input
        if (val === '') {
            // Skip empty fields or set to 0 based on requirement
            // For now, we'll skip empty fields
            return;
        }
        
        val = parseFloat(val);
        if (isNaN(val) || val < 0) {
            showAlert(`Invalid marks for ${inp.dataset.studentName}`, 'error');
            hasError = true;
            return;
        }
        
        if (val > total) {
            showAlert(`Marks cannot exceed ${total} for ${inp.dataset.studentName}`, 'error');
            hasError = true;
            return;
        }
        
        marksData.push({
            student_id: inp.dataset.studentId,
            student_name: inp.dataset.studentName,
            marks_obtained: val
        });
    });
    
    if (hasError) return;
    
    if (marksData.length === 0) {
        showAlert('Please enter at least one mark', 'error');
        return;
    }
    
    // Show loading
    const saveBtn = document.querySelector('#marksModal .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    saveBtn.disabled = true;
    
    try {
        console.log('Submitting marks:', {
            exam_type: examType,
            exam_date: examDate,
            course_code: courseCode,
            section_id: sectionId,
            subject: subject,
            total_marks: total,
            marks_count: marksData.length
        });
        
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
        console.log('Marks save response:', result);
        
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
        showAlert('Network error. Please try again.', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
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

// ==================== FIXED: Open PDF Modal with Subject ====================
function openPdfModal(sectionId, subject) {
    currentSubject = subject;
    
    const select = document.getElementById('pdfSectionSelect');
    if (!select) return;
    
    // Sirf is section ke options rakho
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}" selected>
        Section ${section?.section_details?.section_name || ''} - ${subject}
    </option>`;
    
    // Modal title update karo
    const modalTitle = document.querySelector('#pdfModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-upload me-2"></i>Upload PDF - ${subject}`;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('pdfModal'));
    modal.show();
}

// ==================== FIXED: Upload PDF with Subject ====================
async function submitPdf() {
    const sectionId = document.getElementById('pdfSectionSelect').value;
    const title = document.getElementById('pdfTitle').value.trim();
    const desc = document.getElementById('pdfDescription').value.trim();
    const file = document.getElementById('pdfFile').files[0];
    const subject = currentSubject;  // ✅ Current subject se lo
    
    if (!sectionId || !title || !file || !subject) {
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
    formData.append('subject', subject);  // ✅ Subject save karo
    formData.append('pdf_file', file);
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-pdfs/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await res.json();
        
        if (result.success) {
            showAlert(`PDF uploaded for ${subject}!`, 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('pdfModal'));
            if (modal) modal.hide();
            
            document.getElementById('pdfForm').reset();
            loadPdfRecords();  // Refresh with subject filter
        } else {
            showAlert(result.message || 'Failed to upload PDF', 'error');
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
        showAlert('Failed to upload PDF', 'error');
    }
}

// ==================== FIXED: Load PDFs for Specific Subject ====================
async function loadPdfsForSubject(sectionId, subject) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/section-pdfs/by-subject?section_id=${sectionId}&subject=${encodeURIComponent(subject)}`
        );
        const data = await response.json();
        
        if (data.success) {
            return data.pdfs || [];
        }
        return [];
    } catch (error) {
        console.error(`Error loading PDFs for ${subject}:`, error);
        return [];
    }
}

// ==================== FIXED: Load PDF Records with Beautiful UI ====================
async function loadPdfRecords() {
    const container = document.getElementById('pdfsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading PDFs...</p></div>';
    
    try {
        let html = '';
        let hasAnyPdf = false;
        
        // Har section ke liye
        for (const section of teacherSections) {
            const sectionId = section.section_id;
            const sectionName = section.section_details?.section_name || 'N/A';
            
            // Har subject ke liye alag section
            for (const subject of section.subjects) {
                const response = await fetch(
                    `${API_BASE_URL}/section-pdfs/by-subject?section_id=${sectionId}&subject=${encodeURIComponent(subject)}`
                );
                const data = await response.json();
                
                if (data.success && data.pdfs && data.pdfs.length > 0) {
                    hasAnyPdf = true;
                    
                    // Subject Header with gradient
                    html += `<div class="subject-section mb-4">
                        <div class="subject-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                padding: 15px 20px; border-radius: 15px 15px 0 0; color: white;">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">
                                    <i class="fas fa-book-open me-2"></i>
                                    Section ${sectionName} - ${subject}
                                </h4>
                                <span class="badge bg-light text-dark">${data.pdfs.length} PDF${data.pdfs.length > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        
                        <div class="subject-body" style="background: #f8f9fa; padding: 20px; border-radius: 0 0 15px 15px;">
                            <div class="row">`;
                    
                    // PDF Cards
                    data.pdfs.forEach(pdf => {
                        const date = new Date(pdf.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        });
                        
                        html += `<div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100 border-0 shadow-sm" style="border-radius: 15px; overflow: hidden;">
                                <div class="card-header bg-white border-0 pt-3 px-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <i class="fas fa-file-pdf text-danger fa-2x"></i>
                                        </div>
                                        <span class="badge bg-info">${pdf.subject}</span>
                                    </div>
                                </div>
                                <div class="card-body pt-0 px-3">
                                    <h6 class="card-title fw-bold mb-1">${pdf.pdf_title}</h6>
                                    <div class="small text-muted mb-2">
                                        <i class="fas fa-calendar-alt me-1"></i> ${date}
                                    </div>
                                    <p class="small text-muted mb-2">${pdf.description || 'No description'}</p>
                                </div>
                                <div class="card-footer bg-white border-0 pb-3 px-3">
                                    <div class="btn-group w-100" role="group">
                                        <button class="btn btn-sm btn-outline-primary" onclick="viewPdf('${pdf.pdf_id}')">
                                            <i class="fas fa-eye me-1"></i> View
                                        </button>
                                        <button class="btn btn-sm btn-outline-success" onclick="downloadPdf('${pdf.pdf_id}')">
                                            <i class="fas fa-download me-1"></i> Download
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="deletePdf('${pdf.pdf_id}', '${pdf.pdf_title}')">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    });
                    
                    html += `</div></div></div>`;
                }
            }
        }
        
        if (!hasAnyPdf) {
            html = `<div class="text-center py-5">
                <i class="fas fa-file-pdf fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">No PDFs Uploaded Yet</h5>
                <p class="text-muted">Click on a subject card to upload PDFs</p>
            </div>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading PDFs:', error);
        container.innerHTML = `<div class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i> Failed to load PDFs
        </div>`;
    }
}

// ==================== DELETE PDF with Confirmation ====================
async function deletePdf(pdfId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    // Show loading state
    const deleteBtn = event.target;
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    deleteBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/section-pdfs/delete/${pdfId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`PDF "${title}" deleted successfully!`, 'success');
            loadPdfRecords();  // Refresh list
        } else {
            showAlert('Failed to delete PDF', 'error');
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error deleting PDF:', error);
        showAlert('Error deleting PDF', 'error');
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

function viewPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}`, '_blank'); 
}

function downloadPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}?download=true`, '_blank'); 
}

// ==================== FIXED: Load My Students from ALL Sections ====================
async function loadMyStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading students...</p></td></tr>';
    
    try {
        let allStudents = [];
        
        // ✅ Har section ke liye students fetch karo
        for (const section of teacherSections) {
            const response = await fetch(`${API_BASE_URL}/section-attendance/students/${section.section_id}`);
            const data = await response.json();
            
            if (data.success && data.students) {
                console.log(`Section ${section.section_details?.section_name} has ${data.students.length} students`);
                
                data.students.forEach(student => {
                    allStudents.push({
                        ...student,
                        section_name: section.section_details?.section_name || 'N/A',
                        section_id: section.section_id
                    });
                });
            } else {
                console.log(`Section ${section.section_details?.section_name} has 0 students`);
            }
        }
        
        // Sort by name
        allStudents.sort((a, b) => a.name.localeCompare(b.name));
        
        if (allStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No students found in any section</td></tr>';
            return;
        }
        
        let html = '';
        allStudents.forEach((student, index) => {
            html += `<tr>
                <td>${index + 1}</td>
                <td><span class="badge bg-dark">${student.student_id}</span></td>
                <td><strong>${student.name}</strong></td>
                <td>Section ${student.section_name}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading students:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load students</td></tr>';
    }
}
function sortStudents(by = 'name') {
    if (by === 'name') {
        allStudents.sort((a, b) => a.name.localeCompare(b.name));
    } else if (by === 'id') {
        allStudents.sort((a, b) => {
            const numA = parseInt(a.student_id.replace(/\D/g, ''));
            const numB = parseInt(b.student_id.replace(/\D/g, ''));
            return numA - numB;
        });
    }
    
    displayStudents();
}

function searchStudents(query) {
    const searchTerm = query.toLowerCase();
    const filtered = allStudents.filter(student => 
        student.name.toLowerCase().includes(searchTerm) ||
        student.student_id.toLowerCase().includes(searchTerm)
    );
    displayStudents(filtered);
}

function displayStudents(students = allStudents) {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No students found</td></tr>';
        return;
    }
    
    let html = '';
    students.forEach((student, index) => {
        html += `<tr>
            <td>${index + 1}</td>
            <td><span class="badge bg-dark">${student.student_id}</span></td>
            <td><strong>${student.name}</strong></td>
            <td>Section ${student.section_name}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Add search input in HTML
// <input type="text" class="form-control mb-3" placeholder="Search students..." onkeyup="searchStudents(this.value)">

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
