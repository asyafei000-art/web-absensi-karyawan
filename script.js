const employees = [
  { id: 'EMP001', name: 'Agus Santoso' },
  { id: 'EMP002', name: 'Dewi Rahma' },
  { id: 'EMP003', name: 'Budi Pratama' },
  { id: 'EMP004', name: 'Siti Nurhaliza' }
];

const startBtn = document.getElementById('startBtn');
const identifyBtn = document.getElementById('identifyBtn');
const retryBtn = document.getElementById('retryBtn');
const saveBtn = document.getElementById('saveBtn');
const doneBtn = document.getElementById('doneBtn');
const employeeSelect = document.getElementById('employeeSelect');
const scanInput = document.getElementById('scanInput');
const resultCard = document.getElementById('result-card');
const invalidCard = document.getElementById('invalid-card');
const notificationCard = document.getElementById('notification-card');
const stepIdentify = document.getElementById('step-identify');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const userId = document.getElementById('userId');
const userName = document.getElementById('userName');
const attendanceTime = document.getElementById('attendanceTime');
const attendanceStatus = document.getElementById('attendanceStatus');
const notificationText = document.getElementById('notificationText');
const logTable = document.getElementById('logTable');

let selectedEmployee = null;
let currentAttendance = null;

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function loadEmployees() {
  employeeSelect.innerHTML = '<option value="">-- Pilih Karyawan --</option>';
  employees.forEach(emp => {
    const option = document.createElement('option');
    option.value = emp.id;
    option.textContent = `${emp.name} (${emp.id})`;
    employeeSelect.appendChild(option);
  });
}

function getAttendanceLog() {
  return JSON.parse(localStorage.getItem('attendanceLog') || '[]');
}

function setAttendanceLog(log) {
  localStorage.setItem('attendanceLog', JSON.stringify(log));
}

function renderLog() {
  const log = getAttendanceLog();
  logTable.innerHTML = log.map(entry => `
      <tr>
        <td>${entry.time}</td>
        <td>${entry.id}</td>
        <td>${entry.name}</td>
        <td>${entry.status}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; padding: 18px 0; color: #6c7682;">Belum ada riwayat absensi.</td></tr>';
}

function showSection(section) {
  [stepIdentify, resultCard, invalidCard, notificationCard].forEach(el => {
    if (el === section) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function showStart() {
  showSection(stepIdentify);
  resultCard.classList.add('hidden');
  invalidCard.classList.add('hidden');
  notificationCard.classList.add('hidden');
}

function showInvalid() {
  showSection(invalidCard);
}

function showResult() {
  showSection(resultCard);
}

function showNotification(message) {
  notificationCard.classList.remove('hidden');
  notificationText.textContent = message;
  stepIdentify.classList.add('hidden');
  resultCard.classList.add('hidden');
  invalidCard.classList.add('hidden');
}

function resetInputs() {
  scanInput.value = '';
  employeeSelect.value = '';
  selectedEmployee = null;
}

function findEmployee(query) {
  if (!query) return null;
  const normalized = query.trim().toUpperCase();
  return employees.find(emp => emp.id === normalized || emp.name.toUpperCase() === normalized);
}

function computeStatus(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  if (hour < 8 || (hour === 8 && minute === 0)) {
    return 'Hadir Tepat Waktu';
  }
  return 'Terlambat';
}

function handleStart() {
  showStart();
}

function handleIdentify() {
  const selectedValue = employeeSelect.value;
  const scanValue = scanInput.value.trim();
  const employee = selectedValue ? findEmployee(selectedValue) : findEmployee(scanValue);

  if (!employee) {
    showInvalid();
    return;
  }

  selectedEmployee = employee;
  const now = new Date();
  const time = formatTime(now);
  const status = computeStatus(time);

  currentAttendance = {
    id: employee.id,
    name: employee.name,
    time,
    status
  };

  resultTitle.textContent = status === 'Hadir Tepat Waktu' ? 'Status: Hadir Tepat Waktu' : 'Status: Terlambat';
  resultMessage.textContent = status === 'Hadir Tepat Waktu'
    ? 'Jam masuk kurang dari atau sama dengan 08:00 WIB.'
    : 'Jam masuk lebih dari 08:00 WIB. Silakan simpan catatan terlambat.';
  userId.textContent = employee.id;
  userName.textContent = employee.name;
  attendanceTime.textContent = time;
  attendanceStatus.textContent = status;
  showResult();
}

function handleSave() {
  if (!currentAttendance) return;
  const log = getAttendanceLog();
  log.unshift(currentAttendance);
  setAttendanceLog(log);
  renderLog();
  showNotification(`Absensi ${currentAttendance.name} berhasil disimpan dengan status ${currentAttendance.status}.`);
}

function handleRetry() {
  resetInputs();
  showStart();
}

function handleDone() {
  resetInputs();
  startBtn.scrollIntoView({ behavior: 'smooth' });
  showStart();
}

startBtn.addEventListener('click', handleStart);
identifyBtn.addEventListener('click', handleIdentify);
retryBtn.addEventListener('click', handleRetry);
saveBtn.addEventListener('click', handleSave);
doneBtn.addEventListener('click', handleDone);

loadEmployees();
renderLog();
