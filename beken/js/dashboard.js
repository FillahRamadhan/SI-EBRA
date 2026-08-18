import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- VARIABEL GLOBAL CHART ---
let extractionChartInstance = null;

// --- ELEMEN NAVIGASI HEADER ---
const userProfileBtn = document.getElementById('userProfileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// --- ELEMEN NOTIFIKASI HEADER ---
const notifContainer = document.getElementById('notifContainer');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');

// --- ELEMEN MODAL GANTI AKUN ---
const accountModal = document.getElementById('accountModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnSwitchAccount = document.getElementById('btnSwitchAccount');
const btnAddAnotherAccount = document.getElementById('btnAddAnotherAccount');
const savedAccountList = document.getElementById('savedAccountList');
const btnLogout = document.getElementById('btnLogout');

// --- ELEMEN OCR PYTHON & UPLOAD ---
const fileInput = document.getElementById('fileInput');
const btnRemoveFile = document.getElementById('btnRemoveFile');
const btnProsesOCR = document.getElementById('btnProsesOCR');
const btnSimpanExcel = document.getElementById('btnSimpanExcel');

let currentUserEmail = "";

// ==========================================
// 1. HEADER: TANGGAL & SISTEM NOTIFIKASI
// ==========================================

/**
 * Menampilkan tanggal hari ini di header
 */
function updateHeaderDate() {
    const dateElement = document.getElementById('currentDateText');
    if (!dateElement) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    dateElement.textContent = formattedDate;
}

/**
 * Memperbarui angka badge notifikasi di header.
 * @param {number} count - Jumlah data yang belum dicek / perlu diperiksa
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

/**
 * Merender daftar item notifikasi ke dalam dropdown bar
 */
function renderNotifItems(dataPending) {
    if (!notifList) return;
    notifList.innerHTML = '';

    if (!dataPending || dataPending.length === 0) {
        notifList.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-check-circle" style="color:#10b981; margin-right:6px;"></i> 
                Semua data sudah diperiksa
            </div>`;
        return;
    }

    dataPending.forEach(item => {
        const itemHTML = `
            <div class="notif-item">
                <i class="fas fa-exclamation-triangle notif-icon"></i>
                <div class="notif-text">
                    <p><strong>${item.bank || 'Bank'}</strong> - Ref: ${item.no_ref || item.ref || '-'}</p>
                    <span>Perlu verifikasi ulang data ekstraksi</span>
                </div>
            </div>
        `;
        notifList.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// ==========================================
// 2. DASHBOARD DATA & GRAFIK (TANPA DUMMY)
// ==========================================

/**
 * Mengambil data ekstraksi murni dari localStorage
 */
function getExtractionData() {
    return JSON.parse(localStorage.getItem('extractedDataList')) || [];
}

/**
 * Mengambil log aktivitas dari localStorage
 */
function getActivityData() {
    return JSON.parse(localStorage.getItem('extractedActivityLogs')) || [];
}

/**
 * Menambahkan log aktivitas baru
 */
function addActivityLog(title, type = "info", icon = "fa-info-circle", bg = "icon-blue") {
    const activities = getActivityData();
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    activities.unshift({
        title: title,
        time: timeStr,
        icon: icon,
        bg: bg
    });

    // Simpan maksimal 10 log aktivitas terbaru
    localStorage.setItem('extractedActivityLogs', JSON.stringify(activities.slice(0, 10)));
}

/**
 * Memperbarui angka statistik pada kartu bagian atas Dashboard
 */
function updateDashboardStats(data) {
    const total = data.length;
    const success = data.filter(d => d.status === "Berhasil").length;
    const pendingData = data.filter(d => d.status === "Perlu Diperiksa");
    const pendingCount = pendingData.length;

    const elTotal = document.getElementById('statTotal');
    const elSuccess = document.getElementById('statSuccess');
    const elPending = document.getElementById('statPending');

    if (elTotal) elTotal.textContent = total;
    if (elSuccess) elSuccess.textContent = success;
    if (elPending) elPending.textContent = pendingCount;

    // Perbarui badge notifikasi & isi dropdown
    updateNotificationBadge(pendingCount);
    renderNotifItems(pendingData);
}

/**
 * Render Tabel Data Ekstraksi Terbaru pada Dashboard
 */
function renderDashboardTable(data) {
    const tbody = document.getElementById('dashboardTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 20px;">Belum ada data ekstraksi</td></tr>`;
        return;
    }

    // Ambil maksimal 5 data paling baru
    const recentData = data.slice(0, 5);

    recentData.forEach(item => {
        const isSuccess = item.status === "Berhasil";
        const row = `
            <tr>
                <td>${item.tanggal || '-'}</td>
                <td><strong>${item.bank || '-'}</strong></td>
                <td>${item.nominal || '-'}</td>
                <td>${item.no_ref || item.ref || '-'}</td>
                <td>${item.waktu || '-'}</td>
                <td>
                    <span class="status-badge ${isSuccess ? 'success' : 'pending'}">
                        ${item.status}
                    </span>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * Render List Aktivitas Terbaru
 */
function renderActivityList() {
    const activityContainer = document.getElementById('activityList');
    if (!activityContainer) return;

    const activities = getActivityData();
    activityContainer.innerHTML = '';

    if (activities.length === 0) {
        activityContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:13px; padding:10px;">Belum ada aktivitas</div>`;
        return;
    }

    activities.forEach(act => {
        const html = `
            <div class="activity-item">
                <div class="act-left">
                    <div class="act-icon ${act.bg}">
                        <i class="fas ${act.icon}"></i>
                    </div>
                    <span class="act-text">${act.title}</span>
                </div>
                <span class="act-time">${act.time}</span>
            </div>
        `;
        activityContainer.insertAdjacentHTML('beforeend', html);
    });
}

/**
 * Inisialisasi Grafik Line Chart (Chart.js) Berdasarkan Data Aktual
 */
function initExtractionChart() {
    const ctx = document.getElementById('extractionChart');
    if (!ctx) return;

    if (extractionChartInstance) {
        extractionChartInstance.destroy();
    }

    if (typeof Chart === 'undefined') return;

    const dataList = getExtractionData();
    const totalSuccess = dataList.filter(d => d.status === "Berhasil").length;
    const totalPending = dataList.filter(d => d.status === "Perlu Diperiksa").length;

    extractionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['7 Hari Lalu', '6 Hari Lalu', '5 Hari Lalu', '4 Hari Lalu', '3 Hari Lalu', 'Kemarin', 'Hari Ini'],
            datasets: [
                {
                    label: 'Berhasil',
                    data: dataList.length > 0 ? [0, 0, 0, 0, 0, 0, totalSuccess] : [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    tension: 0.35,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: '#16a34a'
                },
                {
                    label: 'Perlu Diperiksa',
                    data: dataList.length > 0 ? [0, 0, 0, 0, 0, 0, totalPending] : [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#ea580c',
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    tension: 0.35,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: '#ea580c'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#94a3b8', precision: 0 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

/**
 * Memuat ulang seluruh komponen Dashboard
 */
function refreshDashboard() {
    const data = getExtractionData();
    updateDashboardStats(data);
    renderDashboardTable(data);
    renderActivityList();
    initExtractionChart();
}

// ==========================================
// 3. NAVIGASI ANTAR MENU (SINGLE PAGE FIX)
// ==========================================
function initNavigation() {
    const navItems = {
        beranda: document.getElementById('navBeranda'),
        transaksi: document.getElementById('navTransaksi'),
        data: document.getElementById('navData'),
        riwayat: document.getElementById('navRiwayat'),
        excel: document.getElementById('navExcel'),
        pengaturan: document.getElementById('navPengaturan')
    };

    const sections = {
        beranda: document.getElementById('sectionBeranda'),
        transaksi: document.getElementById('sectionTransaksi'),
        data: document.getElementById('sectionData'),
        riwayat: document.getElementById('sectionRiwayat'),
        excel: document.getElementById('sectionExcel'),
        pengaturan: document.getElementById('sectionPengaturan')
    };

    function switchPage(targetKey) {
        Object.keys(sections).forEach(key => {
            if (sections[key]) sections[key].classList.add('hidden');
            if (navItems[key]) navItems[key].classList.remove('active');
        });

        if (sections[targetKey]) {
            sections[targetKey].classList.remove('hidden');
        }
        if (navItems[targetKey]) {
            navItems[targetKey].classList.add('active');
        }

        if (targetKey === 'beranda') {
            refreshDashboard();
        }
    }

    Object.keys(navItems).forEach(key => {
        if (navItems[key]) {
            navItems[key].addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(key);
            });
        }
    });

    const linkSeeAll = document.getElementById('linkSeeAll');
    if (linkSeeAll) {
        linkSeeAll.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage('data');
        });
    }
}

// Inisialisasi awal saat aplikasi berjalan
function initApp() {
    updateHeaderDate();
    initNavigation();
    refreshDashboard();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ==========================================
// 4. SIMPAN & RENDER AKUN DI MODAL
// ==========================================
function saveAccountToHistory(user) {
    const name = user.displayName || user.email.split('@')[0];
    const photo = user.photoURL || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=random");

    const newAccount = {
        uid: user.uid,
        email: user.email,
        name: name,
        photo: photo
    };

    let savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];
    const existingIndex = savedAccounts.findIndex(acc => acc.email === user.email);

    if (existingIndex !== -1) {
        savedAccounts[existingIndex] = newAccount;
    } else {
        savedAccounts.push(newAccount);
    }

    localStorage.setItem('savedAccounts', JSON.stringify(savedAccounts));
}

function renderSavedAccountsModal(currentEmail) {
    const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];
    if (!savedAccountList) return;

    savedAccountList.innerHTML = '';

    savedAccounts.forEach(acc => {
        const isCurrent = acc.email === currentEmail;

        const itemHTML = `
            <div class="saved-account-item ${isCurrent ? 'active-account' : ''}" data-email="${acc.email}">
                <img src="${acc.photo}" class="saved-account-avatar" alt="${acc.name}">
                <div class="saved-account-info">
                    <p class="saved-account-name">${acc.name}</p>
                    <p class="saved-account-email">${acc.email}</p>
                </div>
                ${isCurrent ? '<span class="active-badge">Aktif</span>' : ''}
            </div>
        `;
        savedAccountList.insertAdjacentHTML('beforeend', itemHTML);
    });

    document.querySelectorAll('.saved-account-item').forEach(item => {
        item.addEventListener('click', async () => {
            const selectedEmail = item.getAttribute('data-email');

            if (selectedEmail === currentEmail) {
                accountModal.classList.add('hidden');
                return;
            }

            await signOut(auth);
            window.location.href = `index.html?switch=true&email=${encodeURIComponent(selectedEmail)}`;
        });
    });
}

// ==========================================
// 5. MONITOR STATUS LOGIN (FIREBASE AUTH)
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        const name = user.displayName || user.email.split('@')[0];
        
        if (userName) userName.textContent = name;
        if (userEmail) userEmail.textContent = user.email;

        if (userAvatar) {
            userAvatar.src = user.photoURL || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=random");
        }

        saveAccountToHistory(user);
    } else {
        if (!accountModal || accountModal.classList.contains('hidden')) {
            window.location.href = "index.html";
        }
    }
});

// ==========================================
// 6. EVENT DROPDOWN HEADER, NOTIFIKASI & MODAL
// ==========================================

if (userProfileBtn && profileDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifDropdown) notifDropdown.classList.add('hidden');
        profileDropdown.classList.toggle('hidden');
    });
}

if (notifContainer && notifDropdown) {
    notifContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.classList.add('hidden');
        notifDropdown.classList.toggle('hidden');
    });
}

document.addEventListener('click', (e) => {
    if (userProfileBtn && !userProfileBtn.contains(e.target)) {
        if (profileDropdown) profileDropdown.classList.add('hidden');
    }
    if (notifContainer && !notifContainer.contains(e.target)) {
        if (notifDropdown) notifDropdown.classList.add('hidden');
    }
});

if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.classList.add('hidden');
        renderSavedAccountsModal(currentUserEmail);
        if (accountModal) accountModal.classList.remove('hidden');
    });
}

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        if (accountModal) accountModal.classList.add('hidden');
    });
}

if (btnAddAnotherAccount) {
    btnAddAnotherAccount.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = "index.html?switch=true";
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            alert("Gagal logout: " + error.message);
        }
    });
}

// ==========================================
// 7. SISTEM OCR, RESET & PENYIMPANAN DATA
// ==========================================

/**
 * Fungsi untuk Mereset State Upload & Preview Gambar
 */
function resetUploadState() {
    // 1. Kosongkan input file
    if (fileInput) fileInput.value = "";

    // 2. Sembunyikan kotak info file
    const filePreviewInfo = document.getElementById('filePreviewInfo');
    if (filePreviewInfo) filePreviewInfo.classList.add('hidden');

    // 3. Sembunyikan preview gambar & tampilkan teks placeholder
    const imgPreview = document.getElementById('imgPreview');
    const placeholderText = document.getElementById('placeholderText');
    if (imgPreview) {
        imgPreview.src = "";
        imgPreview.classList.add('hidden');
    }
    if (placeholderText) placeholderText.classList.remove('hidden');

    // 4. Kosongkan Form Hasil OCR
    const ocrForm = document.getElementById('formOCR');
    if (ocrForm) ocrForm.reset();
}

// Handle Upload & Preview Gambar
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('filePreviewInfo').classList.remove('hidden');

            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('imgPreview').src = evt.target.result;
                document.getElementById('imgPreview').classList.remove('hidden');
                document.getElementById('placeholderText').classList.add('hidden');
            }
            reader.readAsDataURL(file);

            // Log Aktivitas Upload
            addActivityLog("Upload bukti transfer baru", "info", "fa-upload", "icon-blue");
        }
    });
}

// Handle Tombol Batal / Hapus File Upload
if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUploadState();
    });
}

// Kirim Gambar ke Python Flask untuk OCR
if (btnProsesOCR) {
    btnProsesOCR.addEventListener('click', async (e) => {
        // Matikan seluruh aksi submit bawaan browser
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) {
            alert("Pilih file terlebih dahulu!");
            return false;
        }

        const formData = new FormData();
        formData.append('file', file);

        btnProsesOCR.textContent = "Memproses...";

        try {
            const response = await fetch('http://127.0.0.1:5000/api/ocr', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === "success") {
                const data = result.data || {};
                
                const elBank = document.getElementById('ocrBank');
                const elTanggal = document.getElementById('ocrTanggal');
                const elPengirim = document.getElementById('ocrPengirim');
                const elPenerima = document.getElementById('ocrPenerima');
                const elNominal = document.getElementById('ocrNominal');
                const elRef = document.getElementById('ocrRef');

                if (elBank) elBank.value = data.bank || "";
                if (elTanggal) elTanggal.value = (data.tanggal || "") + " " + (data.waktu && data.waktu !== "-" ? data.waktu : "");
                if (elPengirim) elPengirim.value = data.pengirim || "";
                if (elPenerima) elPenerima.value = data.penerima || "";
                if (elNominal) elNominal.value = data.nominal || "";
                if (elRef) elRef.value = data.no_ref || "";

                addActivityLog("Ekstraksi berhasil", "success", "fa-check", "icon-green");
            } else {
                alert("Gagal OCR: " + (result.error || "Terjadi kesalahan"));
                addActivityLog("Data perlu diperiksa", "warning", "fa-exclamation", "icon-orange");
            }
        } catch (err) {
            console.error("Detail Error:", err);
            alert("Gagal terhubung ke server Python!");
        } finally {
            btnProsesOCR.textContent = "Proses OCR";
        }

        return false;
    });
}

// Simpan Data Form ke Excel & Penyimpanan Lokal Dashboard
if (btnSimpanExcel) {
    btnSimpanExcel.addEventListener('click', async () => {
        const payload = {
            bank: document.getElementById('ocrBank').value,
            tanggal: document.getElementById('ocrTanggal').value,
            pengirim: document.getElementById('ocrPengirim').value,
            penerima: document.getElementById('ocrPenerima').value,
            nominal: document.getElementById('ocrNominal').value,
            no_ref: document.getElementById('ocrRef').value
        };

        if (!payload.bank && !payload.nominal) {
            return alert("Form masih kosong!");
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/api/simpan-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            alert(result.message);

            // Simpan data baru secara nyata ke localStorage
            const currentData = getExtractionData();
            const now = new Date();
            const timeString = now.toTimeString().split(' ')[0];

            const newEntry = {
                id: Date.now(),
                tanggal: payload.tanggal.split(' ')[0] || now.toLocaleDateString('id-ID'),
                bank: payload.bank || 'Bank',
                nominal: payload.nominal || 'Rp 0',
                no_ref: payload.no_ref || '-',
                waktu: payload.tanggal.split(' ')[1] || timeString,
                status: "Berhasil"
            };

            currentData.unshift(newEntry);
            localStorage.setItem('extractedDataList', JSON.stringify(currentData));

            // Log Aktivitas Ekspor
            addActivityLog("Data diekspor ke Excel", "excel", "fa-file-excel", "icon-blue");

            // Reset form upload setelah berhasil disimpan
            resetUploadState();

            // Refresh tampilan Dashboard
            refreshDashboard();
        } catch (err) {
            alert("Gagal menyimpan ke Excel!");
        }
    });
}
