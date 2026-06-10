const employees = [
  { id: 'EMP001', name: 'Agus Santoso' },
  { id: 'EMP002', name: 'Dewi Rahma' },
  { id: 'EMP003', name: 'Budi Pratama' },
  { id: 'EMP004', name: 'Siti Nurhaliza' }
];

const startBtn = document.getElementById('startBtn');
const identifyBtn = document.getElementById('identifyBtn');
const retryBtn = document.getElementById('retryBtn');
const invalidRetryBtn = document.getElementById('invalidRetryBtn');
const saveBtn = document.getElementById('saveBtn');
const doneBtn = document.getElementById('doneBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const cameraToggleBtn = document.getElementById('cameraToggleBtn');
const snapshotBtn = document.getElementById('snapshotBtn');
const cameraPanel = document.getElementById('cameraPanel');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const employeeSelect = document.getElementById('employeeSelect');
const scanInput = document.getElementById('scanInput');
const resultCard = document.getElementById('result-card');
const invalidCard = document.getElementById('invalid-card');
const notificationCard = document.getElementById('notification-card');
const stepStart = document.getElementById('step-start');
const stepIdentify = document.getElementById('step-identify');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const userId = document.getElementById('userId');
const userName = document.getElementById('userName');
const attendanceDate = document.getElementById('attendanceDate');
const attendanceTime = document.getElementById('attendanceTime');
const attendanceStatus = document.getElementById('attendanceStatus');
const invalidMessage = document.getElementById('invalidMessage');
const notificationText = document.getElementById('notificationText');
const logTable = document.getElementById('logTable');

let selectedEmployee = null;
let currentAttendance = null;
let cameraStream = null;
let cameraScanner = null;

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
        <td>${entry.date}</td>
        <td>${entry.time}</td>
        <td>${entry.id}</td>
        <td>${entry.name}</td>
        <td>${entry.status}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 18px 0; color: #6c7682;">Belum ada riwayat absensi.</td></tr>';
}

function showSection(section) {
  [stepStart, stepIdentify, resultCard, invalidCard, notificationCard].forEach(el => {
    if (el === section) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function showStart() {
  showSection(stepStart);
}

function showInvalid(message) {
  invalidMessage.textContent = message || 'User tidak dikenal atau belum terdaftar. Silakan coba lagi.';
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
  return employees.find(emp => emp.id === normalized || emp.name.toUpperCase() === normalized || emp.id === normalized.replace(/^QR:/, ''));
}

function computeStatus(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  if (hour < 8 || (hour === 8 && minute === 0)) {
    return 'Hadir Tepat Waktu';
  }
  return 'Terlambat';
}

function getTodayDate() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraStatus('Kamera tidak didukung oleh browser ini.', true);
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    cameraVideo.srcObject = cameraStream;
    cameraPanel.classList.remove('hidden');
    snapshotBtn.classList.remove('hidden');
    cameraToggleBtn.textContent = 'Matikan Kamera';
    showCameraStatus('Arahkan QR code ke kamera.');

    if ('BarcodeDetector' in window) {
      cameraScanner = setInterval(scanQRCode, 800);
    } else {
      showCameraStatus('Browser tidak mendukung deteksi QR otomatis. Gunakan input manual.', true);
    }
  } catch (error) {
    showCameraStatus('Gagal mengakses kamera. Periksa izin halaman.', true);
    console.error(error);
  }
}

function stopCamera() {
  if (cameraScanner) {
    clearInterval(cameraScanner);
    cameraScanner = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraPanel.classList.add('hidden');
  snapshotBtn.classList.add('hidden');
  cameraToggleBtn.textContent = 'Buka Kamera';
}

function showCameraStatus(message, isError = false) {
  const cameraStatus = document.getElementById('cameraStatus');
  cameraStatus.textContent = message;
  cameraStatus.classList.toggle('error', isError);
}

async function scanQRCode() {
  if (!cameraVideo || cameraVideo.readyState < 2) return;

  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const context = cameraCanvas.getContext('2d');
  context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const results = await detector.detect(cameraCanvas);
    if (results && results.length > 0) {
      scanInput.value = results[0].rawValue.trim();
      showCameraStatus(`QR terbaca: ${results[0].rawValue}`);
      stopCamera();
    }
  } catch (error) {
    console.warn('Barcode detection failed', error);
  }
}

function capturePhoto() {
  if (!cameraVideo || cameraVideo.readyState < 2) return;

  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const context = cameraCanvas.getContext('2d');
  context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  showCameraStatus('Foto berhasil diambil. Anda dapat menggunakan input atau scan ulang.');
}

function handleStart() {
  resetInputs();
  showSection(stepIdentify);
}

function handleIdentify() {
  const selectedValue = employeeSelect.value;
  const scanValue = scanInput.value.trim();

  if (!selectedValue && !scanValue) {
    showInvalid('Silakan pilih karyawan atau masukkan ID/QR.');
    return;
  }

  const employee = selectedValue ? findEmployee(selectedValue) : findEmployee(scanValue);
  if (!employee) {
    showInvalid('User tidak dikenali dalam daftar. Coba lagi dengan ID/QR yang valid.');
    return;
  }

  selectedEmployee = employee;
  const now = new Date();
  const time = formatTime(now);
  const status = computeStatus(time);

  currentAttendance = {
    id: employee.id,
    name: employee.name,
    date: getTodayDate(),
    time,
    status
  };

  resultTitle.textContent = status === 'Hadir Tepat Waktu' ? 'Status: Hadir Tepat Waktu' : 'Status: Terlambat';
  resultMessage.textContent = status === 'Hadir Tepat Waktu'
    ? 'Jam masuk tidak terlambat. Silakan lanjutkan menyimpan data.'
    : 'Anda datang terlambat. Silakan simpan data absensi.';
  userId.textContent = employee.id;
  userName.textContent = employee.name;
  attendanceDate.textContent = currentAttendance.date;
  attendanceTime.textContent = time;
  attendanceStatus.textContent = status;
  showResult();
}

function handleSave() {
  if (!currentAttendance) return;
  const log = getAttendanceLog();
  const exists = log.some(entry => entry.id === currentAttendance.id && entry.date === currentAttendance.date);
  if (exists) {
    showNotification(`Absensi untuk ${currentAttendance.name} sudah tercatat hari ini.`);
    return;
  }

  log.unshift(currentAttendance);
  setAttendanceLog(log);
  renderLog();
  showNotification(`Absensi ${currentAttendance.name} berhasil disimpan dengan status ${currentAttendance.status}.`);
}

function handleRetry() {
  resetInputs();
  showStart();
}

function handleClearHistory() {
  if (!confirm('Hapus semua riwayat absensi?')) return;
  localStorage.removeItem('attendanceLog');
  renderLog();
}

function handleDone() {
  resetInputs();
  startBtn.scrollIntoView({ behavior: 'smooth' });
  showStart();
}

cameraToggleBtn.addEventListener('click', () => {
  if (cameraStream) {
    stopCamera();
  } else {
    startCamera();
  }
});
snapshotBtn.addEventListener('click', capturePhoto);

startBtn.addEventListener('click', handleStart);
identifyBtn.addEventListener('click', handleIdentify);
retryBtn.addEventListener('click', handleRetry);
invalidRetryBtn.addEventListener('click', handleRetry);
saveBtn.addEventListener('click', handleSave);
doneBtn.addEventListener('click', handleDone);
clearHistoryBtn.addEventListener('click', handleClearHistory);
loadEmployees();
renderLog();
