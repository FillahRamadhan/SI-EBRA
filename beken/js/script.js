import { loginUser } from "./auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.getElementById('signInForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');
    const nikInput = document.getElementById('nikInput');

    // 1. AUTOFILL NIK/EMAIL SAAT SWITCH ACCOUNT DARI DASHBOARD
    const urlParams = new URLSearchParams(window.location.search);
    const targetEmail = urlParams.get('email');

    if (targetEmail && nikInput) {
        // Jika parameter URL berisi email domain custom, tampilkan angka NIK-nya saja ke user
        nikInput.value = targetEmail.includes('@siebra.com') 
            ? targetEmail.split('@')[0] 
            : targetEmail;
            
        if (passwordInput) passwordInput.focus();
    }

    // 2. TOGGLE SHOW/HIDE PASSWORD
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Ubah ikon mata
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // 3. HANDLER SUBMIT FORM LOGIN
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rawNik = nikInput ? nikInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!rawNik || !password) {
                alert("Harap isi Nomor Induk Karyawan dan Password!");
                return;
            }

            // Trik Email Custom: Jika input hanya berupa angka NIK, otomatis tambahkan @siebra.com
            const emailForFirebase = rawNik.includes('@') ? rawNik : `${rawNik}@siebra.com`;

            // Proses autentikasi via Firebase Auth
            const result = await loginUser(emailForFirebase, password);

            if (result.success) {
                window.location.href = "dashboard.html";
            } else {
                alert("Login Gagal: NIK atau Password yang Anda masukkan salah.");
            }
        });
    }
});
