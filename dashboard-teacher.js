// =====================================================
// TEACHER DASHBOARD - COMPLETE WITH ALL SECTIONS
// =====================================================

const API_BASE_URL = 'https://aacem-backend.onrender.com/api';

// ==================== GLOBAL VARIABLES ====================
let currentTeacher = null;
let teacherSections = [];
let notifications = [];
let currentSectionId = null;
let currentSectionStudents = [];
let currentSubject = null;

// Common Filter Variables
let allAttendanceRecords = [];
let filteredAttendanceRecords = [];
let allMarksRecords = [];
let filteredMarksRecords = [];
let allPdfsRecords = [];
let filteredPdfsRecords = [];
let allStudentsList = [];
let filteredStudentsList = [];

// ==================== COMMON FILTER FUNCTIONS ====================

// Generic Filter Function - Har jagah kaam karega
function filterRecords(records, filters) {
    return records.filter(record => {
        for (let key in filters) {
            if (filters[key] && record[key] !== filters[key]) {
                return false;
            }
        }
        return true;
    });
}

// Generic Sort Function
function sortRecords(records, field, order = 'desc') {
    return records.sort((a, b) => {
        let valA = a[field] || '';
        let valB = b[field] || '';
        
        if (field.includes('date') || field === 'date' || field === 'exam_date') {
            return order === 'desc' ? 
                new Date(valB) - new Date(valA) : 
                new Date(valA) - new Date(valB);
        }
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return order === 'desc' ? valB - valA : valA - valB;
        }
        
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        return order === 'desc' ? 
            valB.localeCompare(valA) : 
            valA.localeCompare(valB);
    });
}

// Generic Search Function
function searchRecords(records, searchTerm, fields) {
    if (!searchTerm) return records;
    
    searchTerm = searchTerm.toLowerCase();
    return records.filter(record => {
        return fields.some(field => {
            const value = record[field] || '';
            return String(value).toLowerCase().includes(searchTerm);
        });
    });
}

// Generic Update Dropdown Function
function updateDropdown(selectId, options, defaultOption = 'All') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    let html = `<option value="">${defaultOption}</option>`;
    options.sort().forEach(opt => {
        html += `<option value="${opt}">${opt}</option>`;
    });
    select.innerHTML = html;
}

// Generic Get Unique Values
function getUniqueValues(records, field) {
    const values = new Set();
    records.forEach(record => {
        if (record[field]) values.add(record[field]);
    });
    return Array.from(values);
}

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
        
        displayTeacherInfo();
        setTodayDates();
        loadDashboardData();
        loadNotifications();
        setupEventListeners();
        setupSidebarToggle();
        
    } catch (error) {
        console.error('Error parsing teacher data:', error);
        localStorage.clear();
        window.location.href = 'teacher-login.html';
    }
});

// ==================== SETUP SIDEBAR TOGGLE ====================
function setupSidebarToggle() {
    console.log('Setting up sidebar toggle...');
    
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (!menuToggle || !sidebar || !mainContent) return;

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (window.innerWidth <= 991) {
            sidebar.classList.toggle('show-mobile');
            overlay.classList.toggle('show');
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = sidebar.classList.contains('show-mobile') ? 
                    'fas fa-times' : 'fas fa-bars';
            }
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = sidebar.classList.contains('collapsed') ? 
                    'fas fa-chevron-right' : 'fas fa-bars';
            }
        }
    });

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('show-mobile');
        overlay.classList.remove('show');
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
    });

    document.querySelectorAll('.nav-link-modern').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('show-mobile');
                overlay.classList.remove('show');
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 991) {
            sidebar.classList.remove('show-mobile', 'collapsed');
            overlay.classList.remove('show');
            mainContent.classList.remove('expanded');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        }
    });

    if (window.innerWidth <= 991) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    console.log('Sidebar toggle setup complete');
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
    
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'teacher-login.html';
}

// ==================== LOAD TEACHER SECTIONS ====================
async function loadTeacherSections() {
    try {
        console.log('Loading teacher sections...');
        const response = await fetch(`${API_BASE_URL}/teacher-sections/teacher/${currentTeacher.teacher_id}`);
        const data = await response.json();
        console.log('Raw API Response:', data);
        
        if (data.success) {
            const rawSections = data.sections || [];
            
            const sectionMap = new Map();
            
            rawSections.forEach(item => {
                const sectionId = item.section_id;
                const sectionDetails = item.section_details || {};
                
                let subjectList = [];
                
                if (item.mappings && item.mappings.length > 0 && item.mappings[0].subjects) {
                    subjectList = item.mappings[0].subjects;
                } else if (item.subjects && Array.isArray(item.subjects)) {
                    subjectList = item.subjects;
                } else if (item.subject) {
                    subjectList = [item.subject];
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
                
                subjectList.forEach(subj => {
                    if (!sectionData.subjects.includes(subj)) {
                        sectionData.subjects.push(subj);
                    }
                });
                
                sectionData.mappings.push(item);
            });
            
            teacherSections = Array.from(sectionMap.values());
            
            console.log('✅ Processed teacher sections:', teacherSections);
            
            const totalSections = document.getElementById('totalSections');
            const sectionCount = document.getElementById('sectionCount');
            
            if (totalSections) totalSections.textContent = teacherSections.length;
            if (sectionCount) sectionCount.textContent = teacherSections.length;
            
            await updateSectionStudentCounts();
            
            displayTeacherSections();
            loadSectionsPreview();
            
            // Refresh data based on visible content
            refreshCurrentView();
            
        } else {
            console.error('Failed to load sections:', data.message);
            teacherSections = [];
        }
    } catch (error) {
        console.error('Error loading teacher sections:', error);
        teacherSections = [];
    }
}

// ==================== REFRESH CURRENT VIEW ====================
function refreshCurrentView() {
    const visibleContent = document.querySelector('.main-content > div[style*="display: block"]');
    if (!visibleContent) return;
    
    const id = visibleContent.id;
    
    switch(id) {
        case 'dashboardContent':
            loadDashboardData();
            break;
        case 'attendanceContent':
            loadAttendanceRecords();
            break;
        case 'marksContent':
            loadMarksRecords();
            break;
        case 'pdfsContent':
            loadPdfRecords();
            break;
        case 'studentsContent':
            loadMyStudents();
            break;
        case 'notificationsContent':
            displayAllNotifications();
            break;
        case 'timetableContent':
            loadTeacherTimetable();
            break;
    }
}

// ==================== UPDATE SECTION STUDENT COUNTS ====================
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

async function getSectionStudentsCount(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/students/${id}`);
        const data = await res.json();
        return data.students ? data.students.length : 0;
    } catch { return 0; }
}

// ==================== DASHBOARD DATA ====================
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    await loadTeacherSections();
    await updateDashboardStats();
    await loadSectionsPreview();
    updateWelcomeMessage();
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

// ==================== LOAD SECTIONS PREVIEW ====================
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
    
    teacherSections.forEach(s => totalSubjects += s.subjects.length);
    
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

// ==================== DISPLAY TEACHER SECTIONS ====================
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
        const studentCount = await getSectionStudentsCount(section.section_id);
        
        const colors = [
            { bg: 'linear-gradient(135deg, #4361ee, #4895ef)', border: '#4361ee' },
            { bg: 'linear-gradient(135deg, #06d6a0, #1b9aaa)', border: '#06d6a0' },
            { bg: 'linear-gradient(135deg, #ffd166, #f8c630)', border: '#ffd166' },
            { bg: 'linear-gradient(135deg, #ef476f, #d62828)', border: '#ef476f' },
            { bg: 'linear-gradient(135deg, #9c89b8, #7b6c9c)', border: '#9c89b8' }
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

// ==================== NAVIGATION FUNCTIONS ====================
function hideAllContent() {
    const ids = ['dashboardContent','sectionsContent','attendanceContent',
                 'marksContent','pdfsContent','studentsContent',
                 'notificationsContent', 'timetableContent'];
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

function showTimetable() {
    hideAllContent();
    const el = document.getElementById('timetableContent');
    if (el) el.style.display = 'block';
    
    const navLinks = document.querySelectorAll('.nav-link-modern');
    for (let i = 0; i < navLinks.length; i++) {
        if (navLinks[i].innerText.includes('Timetable')) {
            navLinks[i].classList.add('active');
            break;
        }
    }
    
    loadTeacherTimetable();
}

// ==================== ATTENDANCE SECTION ====================

// Load Attendance Records
async function loadAttendanceRecords() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading attendance...</p></td></tr>';
    
    try {
        allAttendanceRecords = [];
        const recordsMap = new Map();
        
        for (const section of teacherSections) {
            const response = await fetch(`${API_BASE_URL}/section-attendance/section/${section.section_id}`);
            const data = await response.json();
            
            if (data.success && data.attendance) {
                data.attendance.forEach(record => {
                    const key = `${record.date}_${record.subject}`;
                    
                    if (recordsMap.has(key)) {
                        const existing = recordsMap.get(key);
                        if (record.id > existing.id) {
                            recordsMap.set(key, {
                                ...record,
                                section_name: section.section_details?.section_name || 'N/A',
                                section_id: section.section_id
                            });
                        }
                    } else {
                        recordsMap.set(key, {
                            ...record,
                            section_name: section.section_details?.section_name || 'N/A',
                            section_id: section.section_id
                        });
                    }
                });
            }
        }
        
        allAttendanceRecords = Array.from(recordsMap.values());
        allAttendanceRecords = sortRecords(allAttendanceRecords, 'date', 'desc');
        
        // Update filter dropdowns
        updateAttendanceFilters();
        
        // Display records
        applyAttendanceFilters();
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load attendance</td></tr>';
    }
}

// Update Attendance Filter Dropdowns
function updateAttendanceFilters() {
    // Update section filter
    const sections = getUniqueValues(allAttendanceRecords, 'section_name');
    updateDropdown('filterSection', sections, 'All Sections');
    
    // Update subject filter
    const subjects = getUniqueValues(allAttendanceRecords, 'subject');
    updateDropdown('filterSubject', subjects, 'All Subjects');
}

// Apply Attendance Filters
function applyAttendanceFilters() {
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const sectionFilter = document.getElementById('filterSection')?.value || '';
    const subjectFilter = document.getElementById('filterSubject')?.value || '';
    
    filteredAttendanceRecords = filterRecords(allAttendanceRecords, {
        date: dateFilter,
        section_name: sectionFilter,
        subject: subjectFilter
    });
    
    displayAttendanceRecords(filteredAttendanceRecords);
    updateFilterStats('attendance');
}

// Display Attendance Records
function displayAttendanceRecords(records) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No attendance records found</td></tr>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const present = record.present_count || 0;
        const absent = record.absent_count || 0;
        const total = present + absent;
        const percentage = record.percentage || (total > 0 ? ((present / total) * 100).toFixed(1) : 0);
        
        const cls = percentage >= 80 ? 'success' : 
                   percentage >= 60 ? 'warning' : 'danger';
        
        html += `<tr>
            <td><span class="fw-bold">${record.date}</span></td>
            <td>Section ${record.section_name || 'N/A'}</td>
            <td><span class="badge bg-info">${record.subject || 'N/A'}</span></td>
            <td><span class="badge bg-success">${present}</span></td>
            <td><span class="badge bg-danger">${absent}</span></td>
            <td><span class="badge bg-${cls}">${percentage}%</span></td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Clear Attendance Filters
function clearAllFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterSection').value = '';
    document.getElementById('filterSubject').value = '';
    applyAttendanceFilters();
    showAlert('All filters cleared', 'info');
}

// ==================== MARKS SECTION ====================

// Load Marks Records
async function loadMarksRecords() {
    const tbody = document.getElementById('marksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading marks...</p></td></tr>';
    
    try {
        allMarksRecords = [];
        
        for (const section of teacherSections) {
            const response = await fetch(`${API_BASE_URL}/section-marks/all?section=${section.section_id}`);
            const data = await response.json();
            
            if (data.success && data.marks && data.marks.length > 0) {
                data.marks.forEach(mark => {
                    allMarksRecords.push({
                        ...mark,
                        section_name: section.section_details?.section_name || 'N/A',
                        section_id: section.section_id
                    });
                });
            }
        }
        
        allMarksRecords = sortRecords(allMarksRecords, 'exam_date', 'desc');
        console.log(`Loaded ${allMarksRecords.length} marks records`);
        
        // Update filter dropdowns
        updateMarksFilters();
        
        // Apply filters
        applyMarksFilters();
        
    } catch (error) {
        console.error('Error loading marks:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Failed to load marks</td></tr>';
    }
}

// Update Marks Filter Dropdowns
function updateMarksFilters() {
    // Update section filter
    const sections = getUniqueValues(allMarksRecords, 'section_name');
    updateDropdown('marksFilterSection', sections, 'All Sections');
    
    // Update subject filter
    const subjects = getUniqueValues(allMarksRecords, 'subject');
    updateDropdown('marksFilterSubject', subjects, 'All Subjects');
    
    // Update exam type filter
    const examTypes = getUniqueValues(allMarksRecords, 'exam_type');
    updateDropdown('marksFilterExamType', examTypes, 'All Exams');
}

// Apply Marks Filters
function applyMarksFilters() {
    const dateFilter = document.getElementById('marksFilterDate')?.value || '';
    const sectionFilter = document.getElementById('marksFilterSection')?.value || '';
    const subjectFilter = document.getElementById('marksFilterSubject')?.value || '';
    const examFilter = document.getElementById('marksFilterExamType')?.value || '';
    
    filteredMarksRecords = filterRecords(allMarksRecords, {
        exam_date: dateFilter,
        section_name: sectionFilter,
        subject: subjectFilter,
        exam_type: examFilter
    });
    
    displayMarksRecords(filteredMarksRecords);
    updateFilterStats('marks');
}

// Display Marks Records
function displayMarksRecords(records) {
    const tbody = document.getElementById('marksTableBody');
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No marks records found</td></tr>';
        return;
    }
    
    const displayRecords = records.slice(0, 50);
    
    let html = '';
    displayRecords.forEach(record => {
        const marksObtained = record.marks_obtained || 0;
        const totalMarks = record.total_marks || 100;
        const percentage = record.percentage || ((marksObtained / totalMarks) * 100).toFixed(1);
        
        let grade = record.grade || 'N/A';
        if (!record.grade) {
            if (percentage >= 90) grade = 'A+';
            else if (percentage >= 80) grade = 'A';
            else if (percentage >= 70) grade = 'B+';
            else if (percentage >= 60) grade = 'B';
            else if (percentage >= 50) grade = 'C';
            else if (percentage >= 40) grade = 'D';
            else grade = 'F';
        }
        
        const cls = percentage >= 75 ? 'success' : 
                   percentage >= 50 ? 'warning' : 'danger';
        
        html += `<tr>
            <td>${record.exam_date || record.date || 'N/A'}</td>
            <td><span class="badge bg-secondary">${record.exam_type || 'N/A'}</span></td>
            <td>Section ${record.section_name || 'N/A'}</td>
            <td>${record.student_name || 'N/A'}</td>
            <td><span class="badge bg-info">${record.subject || 'N/A'}</span></td>
            <td><strong>${marksObtained}/${totalMarks}</strong></td>
            <td><span class="badge bg-${cls}">${percentage}%</span></td>
            <td><span class="badge bg-dark">${grade}</span></td>
        </tr>`;
    });
    
    if (records.length > 50) {
        html += `<tr><td colspan="8" class="text-center text-muted py-2">
            <i class="fas fa-info-circle me-1"></i> Showing 50 of ${records.length} records
        </td></tr>`;
    }
    
    tbody.innerHTML = html;
}

// Clear Marks Filters
function clearAllMarksFilters() {
    document.getElementById('marksFilterDate').value = '';
    document.getElementById('marksFilterSection').value = '';
    document.getElementById('marksFilterSubject').value = '';
    document.getElementById('marksFilterExamType').value = '';
    applyMarksFilters();
    showAlert('All marks filters cleared', 'info');
}

// ==================== PDF SECTION ====================

// Load PDF Records
async function loadPdfRecords() {
    const container = document.getElementById('pdfsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading PDFs...</p></div>';
    
    try {
        let html = '';
        let hasAnyPdf = false;
        
        for (const section of teacherSections) {
            const sectionId = section.section_id;
            const sectionName = section.section_details?.section_name || 'N/A';
            
            for (const subject of section.subjects) {
                const response = await fetch(
                    `${API_BASE_URL}/section-pdfs/by-subject?section_id=${sectionId}&subject=${encodeURIComponent(subject)}`
                );
                const data = await response.json();
                
                if (data.success && data.pdfs && data.pdfs.length > 0) {
                    hasAnyPdf = true;
                    
                    html += `<div class="subject-section mb-4">
                        <div class="subject-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">
                                    <i class="fas fa-book-open me-2"></i>
                                    Section ${sectionName} - ${subject}
                                </h4>
                                <span class="badge bg-light text-dark">${data.pdfs.length} PDFs</span>
                            </div>
                        </div>
                        
                        <div class="subject-body">
                            <div class="row">`;
                    
                    data.pdfs.forEach(pdf => {
                        const date = new Date(pdf.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                        });
                        
                        html += `<div class="col-md-6 col-lg-4 mb-3">
                            <div class="pdf-card-modern">
                                <div class="card-header">
                                    <div class="d-flex justify-content-between">
                                        <i class="fas fa-file-pdf text-danger fa-2x"></i>
                                        <span class="badge bg-info">${pdf.subject}</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <h6 class="pdf-title">${pdf.pdf_title}</h6>
                                    <div class="pdf-meta">
                                        <i class="fas fa-calendar-alt"></i> ${date}
                                    </div>
                                    <p class="small text-muted mt-2">${pdf.description || 'No description'}</p>
                                </div>
                                <div class="card-footer">
                                    <div class="btn-group w-100">
                                        <button class="btn btn-sm btn-outline-primary" onclick="viewPdf('${pdf.pdf_id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-success" onclick="downloadPdf('${pdf.pdf_id}')">
                                            <i class="fas fa-download"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="deletePdf('${pdf.pdf_id}', '${pdf.pdf_title}')">
                                            <i class="fas fa-trash"></i>
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
            html = `<div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h5>No PDFs Uploaded Yet</h5>
                <p>Click on a subject card to upload PDFs</p>
            </div>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading PDFs:', error);
        container.innerHTML = `<div class="alert alert-danger">Failed to load PDFs</div>`;
    }
}

// PDF Functions
function viewPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}`, '_blank'); 
}

function downloadPdf(id) { 
    window.open(`${API_BASE_URL}/section-pdfs/view/${id}?download=true`, '_blank'); 
}

async function deletePdf(pdfId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/section-pdfs/delete/${pdfId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`PDF deleted successfully!`, 'success');
            loadPdfRecords();
        } else {
            showAlert('Failed to delete PDF', 'error');
        }
    } catch (error) {
        console.error('Error deleting PDF:', error);
        showAlert('Error deleting PDF', 'error');
    }
}

// ==================== STUDENTS SECTION ====================

// Load My Students
async function loadMyStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="loading-spinner-modern mx-auto"></div><p class="mt-2">Loading students...</p></td></tr>';
    
    try {
        allStudentsList = [];
        
        for (const section of teacherSections) {
            const response = await fetch(`${API_BASE_URL}/section-attendance/students/${section.section_id}`);
            const data = await response.json();
            
            if (data.success && data.students) {
                data.students.forEach(student => {
                    allStudentsList.push({
                        ...student,
                        section_name: section.section_details?.section_name || 'N/A',
                        section_id: section.section_id
                    });
                });
            }
        }
        
        allStudentsList = sortRecords(allStudentsList, 'name', 'asc');
        
        // Update filter dropdowns
        updateStudentsFilters();
        
        // Apply filters
        applyStudentsFilters();
        
    } catch (error) {
        console.error('Error loading students:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load students</td></tr>';
    }
}

// Update Students Filters
function updateStudentsFilters() {
    const sections = getUniqueValues(allStudentsList, 'section_name');
    updateDropdown('studentSectionFilter', sections, 'All Sections');
}

// Apply Students Filters
function applyStudentsFilters() {
    const sectionFilter = document.getElementById('studentSectionFilter')?.value || '';
    const searchTerm = document.getElementById('studentSearch')?.value || '';
    
    let filtered = filterRecords(allStudentsList, {
        section_name: sectionFilter
    });
    
    if (searchTerm) {
        filtered = searchRecords(filtered, searchTerm, ['name', 'student_id']);
    }
    
    filteredStudentsList = filtered;
    displayStudentsRecords(filteredStudentsList);
    updateFilterStats('students');
}

// Display Students Records
function displayStudentsRecords(records) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No students found</td></tr>';
        return;
    }
    
    let html = '';
    records.forEach((student, index) => {
        html += `<tr>
            <td>${index + 1}</td>
            <td><span class="badge bg-dark">${student.student_id}</span></td>
            <td><strong>${student.name}</strong></td>
            <td>Section ${student.section_name}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Search Students
function searchStudents() {
    applyStudentsFilters();
}

// Clear Students Filters
function clearStudentsFilters() {
    document.getElementById('studentSectionFilter').value = '';
    document.getElementById('studentSearch').value = '';
    applyStudentsFilters();
    showAlert('All filters cleared', 'info');
}

// ==================== TIMETABLE SECTION ====================

let teacherTimetable = [];

async function loadTeacherTimetable() {
    console.log('📅 Loading teacher timetable...');
    
    const container = document.getElementById('teacherTimetableContainer');
    const countBadge = document.getElementById('timetableCount');
    const navCount = document.getElementById('timetableNavCount');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3"></div>
            <p class="text-muted">Loading your teaching schedule...</p>
        </div>
    `;
    
    try {
        const teacherId = currentTeacher?.teacher_id;
        
        if (!teacherId) {
            throw new Error('Teacher ID not found');
        }
        
        const response = await fetch(`${API_BASE_URL}/timetable/teacher/${teacherId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            teacherTimetable = result.timetable || [];
            
            if (countBadge) {
                countBadge.textContent = `${teacherTimetable.length} Class${teacherTimetable.length !== 1 ? 'es' : ''}`;
            }
            if (navCount) {
                navCount.textContent = teacherTimetable.length;
            }
            
            displayTeacherTimetable(teacherTimetable);
        } else {
            throw new Error(result.message || 'Failed to load timetable');
        }
        
    } catch (error) {
        console.error('❌ Error loading teacher timetable:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error loading timetable!</strong>
                <p class="mb-0 mt-2">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-3" onclick="loadTeacherTimetable()">
                    <i class="fas fa-sync-alt me-1"></i> Retry
                </button>
            </div>
        `;
    }
}

function displayTeacherTimetable(timetable) {
    const container = document.getElementById('teacherTimetableContainer');
    if (!container) return;
    
    const activeTimetable = timetable.filter(item => item.is_active === true);
    
    if (activeTimetable.length === 0) {
        container.innerHTML = `
            <div class="timetable-empty">
                <i class="fas fa-calendar-times"></i>
                <h5>No Classes Scheduled</h5>
                <p>You don't have any classes in your timetable yet.</p>
            </div>
        `;
        return;
    }
    
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayColors = {
        'Monday': 'monday', 'Tuesday': 'tuesday', 'Wednesday': 'wednesday',
        'Thursday': 'thursday', 'Friday': 'friday', 'Saturday': 'saturday'
    };
    
    const groupedByDay = {};
    
    activeTimetable.forEach(item => {
        const day = item.day_of_week || 'Other';
        if (!groupedByDay[day]) {
            groupedByDay[day] = [];
        }
        groupedByDay[day].push(item);
    });
    
    Object.keys(groupedByDay).forEach(day => {
        groupedByDay[day].sort((a, b) => 
            (a.start_time || '').localeCompare(b.start_time || '')
        );
    });
    
    let html = '';
    
    dayOrder.forEach(day => {
        const dayEntries = groupedByDay[day] || [];
        
        if (dayEntries.length > 0) {
            const colorClass = dayColors[day] || 'primary';
            
            html += `
                <div class="teacher-timetable-day">
                    <div class="card-header bg-${colorClass} text-white">
                        <i class="fas fa-calendar-day"></i> ${day}
                        <span class="badge bg-light text-dark float-end">${dayEntries.length} Class${dayEntries.length > 1 ? 'es' : ''}</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Section</th>
                                    <th>Course</th>
                                    <th>Subject</th>
                                    <th>Room</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            dayEntries.forEach(item => {
                const startTime = formatTime12Hour(item.start_time);
                const endTime = formatTime12Hour(item.end_time);
                
                html += `
                    <tr>
                        <td>
                            <div class="time-range">
                                <span class="time-badge">${startTime}</span>
                                <span class="time-separator">-</span>
                                <span class="time-badge">${endTime}</span>
                            </div>
                        </td>
                        <td>
                            <span class="section-badge">
                                Section ${item.section_name || item.section_id || 'N/A'}
                            </span>
                        </td>
                        <td><strong>${item.course_code || 'N/A'}</strong></td>
                        <td><span class="subject-badge">${item.subject || 'N/A'}</span></td>
                        <td><i class="fas fa-door-open me-1"></i> ${item.room_number || 'N/A'}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    });
    
    if (html === '') {
        html = `
            <div class="timetable-empty">
                <i class="fas fa-calendar-times"></i>
                <h5>No Classes Scheduled</h5>
                <p>You don't have any classes in your timetable yet.</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function formatTime12Hour(time24) {
    if (!time24) return 'N/A';
    
    try {
        let hours, minutes;
        
        if (time24.includes(':')) {
            [hours, minutes] = time24.split(':').map(Number);
        } else {
            return time24;
        }
        
        if (isNaN(hours) || isNaN(minutes)) return time24;
        
        const period = hours >= 12 ? 'PM' : 'AM';
        let hours12 = hours % 12;
        hours12 = hours12 === 0 ? 12 : hours12;
        
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
        return time24;
    }
}

// ==================== NOTIFICATIONS SECTION ====================

async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher-notices`);
        const data = await response.json();
        
        console.log('Teacher notifications loaded:', data);
        
        if (data.success) {
            notifications = data.notices || [];
            updateNotificationBadges();
            displayNotifications();
        } else {
            console.error('Failed to load notifications:', data.message);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateNotificationBadges() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    const count = document.getElementById('notificationCount');
    
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    if (count) count.textContent = unread;
}

function displayNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                <p class="text-muted">No notifications</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    notifications.slice(0, 5).forEach(n => {
        let iconColor = '#1e90ff';
        let bgColor = '#e3f2fd';
        let icon = 'fa-bell';
        
        if (n.priority === 'high') {
            iconColor = '#dc3545';
            bgColor = '#fee';
            icon = 'fa-exclamation-circle';
        } else if (n.priority === 'medium') {
            iconColor = '#ffc107';
            bgColor = '#fff3cd';
            icon = 'fa-exclamation-triangle';
        } else if (n.priority === 'low') {
            iconColor = '#6c757d';
            bgColor = '#e9ecef';
            icon = 'fa-arrow-down';
        }
        
        let audienceBadge = '';
        if (n.audience === 'all') {
            audienceBadge = '<span class="badge bg-success ms-2">All</span>';
        } else if (n.audience === 'teachers') {
            audienceBadge = '<span class="badge bg-warning ms-2">Teachers</span>';
        }
        
        html += `
            <div class="notification-item-modern">
                <div class="notification-icon" style="background:${bgColor};color:${iconColor};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6>${n.title || 'Notification'}</h6>
                        ${audienceBadge}
                    </div>
                    <p>${(n.message || '').substring(0,60)}${(n.message || '').length > 60 ? '...' : ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-muted small">${getTimeAgo(n.created_at)}</span>
                        <span class="badge bg-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'secondary'}">
                            ${n.priority || 'normal'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

function displayAllNotifications() {
    const list = document.getElementById('allNotificationsList');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-bell-slash fa-4x text-muted mb-3"></i>
                <p class="text-muted">No notifications</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    notifications.forEach(n => {
        const date = new Date(n.created_at).toLocaleString();
        const unreadClass = !n.read ? 'unread' : '';
        
        let iconColor = '#1e90ff';
        let bgColor = '#e3f2fd';
        let icon = 'fa-bell';
        
        if (n.priority === 'high') {
            iconColor = '#dc3545';
            bgColor = '#fee';
            icon = 'fa-exclamation-circle';
        } else if (n.priority === 'medium') {
            iconColor = '#ffc107';
            bgColor = '#fff3cd';
            icon = 'fa-exclamation-triangle';
        } else if (n.priority === 'low') {
            iconColor = '#6c757d';
            bgColor = '#e9ecef';
            icon = 'fa-arrow-down';
        }
        
        html += `
            <div class="notification-item-modern ${unreadClass}">
                <div class="notification-icon" style="background:${bgColor};color:${iconColor};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6>${n.title || 'Notification'}</h6>
                        <span class="badge bg-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'secondary'}">
                            ${n.priority || 'normal'}
                        </span>
                    </div>
                    <p>${n.message || ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-calendar-alt me-1"></i> ${date}
                        </small>
                        ${n.audience === 'all' ? 
                            '<span class="badge bg-success">All</span>' : 
                            '<span class="badge bg-warning">Teachers</span>'
                        }
                    </div>
                </div>
            </div>
        `;
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
        if (seconds < 2592000) return `${Math.floor(seconds/86400)} days ago`;
        
        return new Date(date).toLocaleDateString();
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

// ==================== MODAL FUNCTIONS ====================

// Attendance Modal
function takeAttendance() { 
    showMySections(); 
    showAlert('Select a section to take attendance', 'info'); 
}

async function openAttendanceModal(sectionId, subject) {
    currentSectionId = sectionId;
    currentSubject = subject;
    const date = document.getElementById('attendanceDate').value;
    
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

async function checkAttendanceManually(sectionId, date, subject) {
    try {
        const response = await fetch(`${API_BASE_URL}/section-attendance/filter?section=${sectionId}&date=${date}`);
        const data = await response.json();
        
        if (data.success && data.attendance) {
            const matchingRecord = data.attendance.find(record => record.subject === subject);
            
            if (matchingRecord) {
                return { success: true, exists: true, attendance: matchingRecord };
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

async function submitAttendance() {
    const sectionId = currentSectionId;
    const date = document.getElementById('attendanceDate').value;
    const subject = currentSubject;
    
    if (!subject) {
        showAlert('Subject not selected', 'error');
        return;
    }
    
    const exists = await checkAttendanceManually(sectionId, date, subject);
    if (exists.exists) {
        showAlert(`Attendance already marked for ${subject} on this day`, 'error');
        return;
    }
    
    const data = {};
    document.querySelectorAll('.attendance-checkbox').forEach(cb => {
        data[cb.dataset.studentId] = cb.checked ? 'present' : 'absent';
    });
    
    const payload = { 
        section_id: sectionId, 
        date, 
        subject, 
        attendance: data, 
        teacher_id: currentTeacher.teacher_id 
    };
    
    try {
        const res = await fetch(`${API_BASE_URL}/section-attendance/mark-restricted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        
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

// Marks Modal
function enterMarks() { 
    showMySections(); 
    showAlert('Select a section to enter marks', 'info'); 
}

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
    
    const subjectSelect = document.getElementById('marksSubjectSelect');
    if (subjectSelect) {
        subjectSelect.innerHTML = `<option value="${subject}" selected>${subject}</option>`;
        subjectSelect.disabled = true;
    }
    
    const modalTitle = document.querySelector('#marksModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-edit me-2"></i>Enter Marks - ${subject}`;
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
    const subject = currentSubject;
    let total = document.getElementById('totalMarks').value;
    
    if (!examType || !subject) {
        showAlert('Please fill all required fields', 'error');
        return;
    }
    
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
        
        if (val === '') return;
        
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
    
    const saveBtn = document.querySelector('#marksModal .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    saveBtn.disabled = true;
    
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
            loadMarksRecords();
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

// PDF Modal
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

function openPdfModal(sectionId, subject) {
    currentSubject = subject;
    
    const select = document.getElementById('pdfSectionSelect');
    if (!select) return;
    
    const section = teacherSections.find(s => s.section_id === sectionId);
    select.innerHTML = `<option value="${sectionId}" selected>
        Section ${section?.section_details?.section_name || ''} - ${subject}
    </option>`;
    
    const modalTitle = document.querySelector('#pdfModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-upload me-2"></i>Upload PDF - ${subject}`;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('pdfModal'));
    modal.show();
}

async function submitPdf() {
    const sectionId = document.getElementById('pdfSectionSelect').value;
    const title = document.getElementById('pdfTitle').value.trim();
    const desc = document.getElementById('pdfDescription').value.trim();
    const file = document.getElementById('pdfFile').files[0];
    const subject = currentSubject;
    
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
    formData.append('subject', subject);
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
            loadPdfRecords();
        } else {
            showAlert(result.message || 'Failed to upload PDF', 'error');
        }
    } catch (error) {
        console.error('Error uploading PDF:', error);
        showAlert('Failed to upload PDF', 'error');
    }
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

// ==================== PASSWORD CHANGE ====================
function openChangePasswordModal() {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('strengthBar').className = 'strength-bar';
    document.getElementById('matchMessage').innerHTML = '';
    document.getElementById('passwordHelp').innerHTML = 'Password must be at least 6 characters';
    
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

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

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const helpText = document.getElementById('passwordHelp');
    
    strengthBar.className = 'strength-bar';
    
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        helpText.innerHTML = 'Password must be at least 6 characters';
        return;
    }
    
    let strength = 0;
    
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
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
    
    const confirm = document.getElementById('confirmPassword').value;
    if (confirm) checkPasswordMatch();
}

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

async function changePassword() {
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
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
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            
            document.getElementById('changePasswordForm').reset();
            
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

// ==================== FILTER STATS UPDATE ====================
function updateFilterStats(type) {
    let displayedSpan, totalSpan, filteredCount, totalCount;
    
    switch(type) {
        case 'attendance':
            displayedSpan = document.getElementById('displayedCount');
            totalSpan = document.getElementById('totalCount');
            filteredCount = filteredAttendanceRecords.length;
            totalCount = allAttendanceRecords.length;
            break;
        case 'marks':
            displayedSpan = document.getElementById('marksDisplayedCount');
            totalSpan = document.getElementById('marksTotalCount');
            filteredCount = filteredMarksRecords.length;
            totalCount = allMarksRecords.length;
            break;
        case 'students':
            displayedSpan = document.getElementById('studentsDisplayedCount');
            totalSpan = document.getElementById('studentsTotalCount');
            filteredCount = filteredStudentsList.length;
            totalCount = allStudentsList.length;
            break;
        default:
            return;
    }
    
    if (displayedSpan) displayedSpan.textContent = filteredCount;
    if (totalSpan) totalSpan.textContent = totalCount;
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
