import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- ELEMEN NAVIGASI HEADER ---
const userProfileBtn = document.getElementById('userProfileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// --- ELEMEN MODAL GANTI AKUN ---
const accountModal = document.getElementById('accountModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnSwitchAccount = document.getElementById('btnSwitchAccount');
const btnAddAnotherAccount = document.getElementById('btnAddAnotherAccount');
const savedAccountList = document.getElementById('savedAccountList');
const btnLogout = document.getElementById('btnLogout');

// --- ELEMEN OCR PYTHON ---
const fileInput = document.getElementById('fileInput');
const btnProsesOCR = document.getElementById('btnProsesOCR');
const btnSimpanExcel = document.getElementById('btnSimpanExcel');

let currentUserEmail = "";

// ==========================================
// 1. NAVIGASI ANTAR MENU (SINGLE PAGE FIX)
// ==========================================
function initNavigation() {
    const navItems = {
        beranda: document.getElementById('navBeranda'),
        transaksi: document.getElementById('navTransaksi'),
        data: document.getElementById('navData'),
        riwayat: document.getElementById('navRiwayat'),
        pengaturan: document.getElementById('navPengaturan')
    };

    const sections = {
        beranda: document.getElementById('sectionBeranda'),
        transaksi: document.getElementById('sectionTransaksi'),
        data: document.getElementById('sectionData'),
        riwayat: document.getElementById('sectionRiwayat'),
        pengaturan: document.getElementById('sectionPengaturan')
    };

    function switchPage(targetKey) {
        // Sembunyikan semua section dan lepaskan class active
        Object.keys(sections).forEach(key => {
            if (sections[key]) sections[key].classList.add('hidden');
            if (navItems[key]) navItems[key].classList.remove('active');
        });

        // Tampilkan section pilihan
        if (sections[targetKey]) {
            sections[targetKey].classList.remove('hidden');
        }
        if (navItems[targetKey]) {
            navItems[targetKey].classList.add('active');
        }
    }

    // Pasang Event Listener ke Setiap Navigasi
    Object.keys(navItems).forEach(key => {
        if (navItems[key]) {
            navItems[key].addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(key);
            });
        }
    });
}

// Jalankan inisialisasi navigasi
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

// ==========================================
// 2. SIMPAN & RENDER AKUN DI MODAL
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
// 3. MONITOR STATUS LOGIN (FIREBASE AUTH)
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
// 4. EVENT DROPDOWN HEADER & MODAL
// ==========================================
if (userProfileBtn && profileDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userProfileBtn.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
}

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
// 5. SISTEM OCR
// ==========================================

// Handle Preview Gambar
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
    }
});

// Kirim gambar ke python flask untuk OCR
btnProsesOCR.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih file terlebih dahulu!");

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
            const data = result.data;
            document.getElementById('ocrBank').value = data.bank;
            document.getElementById('ocrTanggal').value = data.tanggal + " " + (data.waktu !== "-" ? data.waktu : "");
            document.getElementById('ocrPengirim').value = data.pengirim;
            document.getElementById('ocrPenerima').value = data.penerima;
            document.getElementById('ocrNominal').value = data.nominal;
            document.getElementById('ocrRef').value = data.no_ref;
        } else {
            alert("Gagal OCR: " + result.error);
        }
    } catch (err) {
        alert("Gagal terhubung ke server Python!");
    } finally {
        btnProsesOCR.textContent = "Proses OCR";
    }
});

// Simpan data form ke Excel via Python Backend
btnSimpanExcel.addEventListener('click', async () => {
    const payload = {
        bank: document.getElementById('ocrBank').value,
        tanggal: document.getElementById('ocrTanggal').value,
        pengirim: document.getElementById('ocrPengirim').value,
        penerima: document.getElementById('ocrPenerima').value,
        nominal: document.getElementById('ocrNominal').value,
        no_ref: document.getElementById('ocrRef').value
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/simpan-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        alert(result.message);
    } catch (err) {
        alert("Gagal menyimpan ke Excel!");
    }
});