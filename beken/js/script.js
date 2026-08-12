import { 
    registerUser, 
    loginUser, 
    loginWithGoogle, 
    loginWithGithub 
} from "./auth.js";

document.addEventListener('DOMContentLoaded', () => {

    const btnMulai = document.getElementById('btnMulai');
    const authModal = document.getElementById('authModal');
    const btnClose = document.getElementById('btnClose');

    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const slidingContainer = document.getElementById('slidingContainer');

    const signUpForm = document.querySelector('.sign-up-container form');
    const signInForm = document.querySelector('.sign-in-container form');

    // --- 1. HANDLER PENANGGULANGAN GANTI AKUN (SWITCH ACCOUNT) ---
    const urlParams = new URLSearchParams(window.location.search);
    const isSwitch = urlParams.get('switch');
    const targetEmail = urlParams.get('email');

    if (isSwitch && authModal) {
        // Otomatis tampilkan modal auth jika dialihkan dari fitur Ganti Akun
        authModal.classList.remove('hidden');

        // Pastikan tampilan dalam posisi panel Sign In
        if (slidingContainer) {
            slidingContainer.classList.remove("right-panel-active");
        }

        // Isikan email otomatis & fokuskan ke kursor password
        if (targetEmail && signInForm) {
            const emailInput = signInForm.querySelector('input[type="email"]');
            const passwordInput = signInForm.querySelector('input[type="password"]');

            if (emailInput) {
                emailInput.value = targetEmail;
            }
            if (passwordInput) {
                passwordInput.focus();
            }
        }
    }

    // --- 2. INTERAKSI MODAL & SLIDER ---
    if (btnMulai && authModal) {
        btnMulai.addEventListener('click', () => authModal.classList.remove('hidden'));
    }

    if (btnClose && authModal) {
        btnClose.addEventListener('click', () => authModal.classList.add('hidden'));
    }

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.classList.add('hidden');
    });

    if (signUpButton && signInButton && slidingContainer) {
        signUpButton.addEventListener('click', () => slidingContainer.classList.add("right-panel-active"));
        signInButton.addEventListener('click', () => slidingContainer.classList.remove("right-panel-active"));
    }

    // --- 3. HANDLER FORM AUTHENTICATION ---

    // Proses Sign Up (Pendaftaran)
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signUpForm.querySelector('input[type="email"]').value;
            const password = signUpForm.querySelector('input[type="password"]').value;

            const result = await registerUser(email, password);
            if (result.success) {
                alert("Pendaftaran berhasil! Selamat datang, " + result.user.email);
                signUpForm.reset();
                authModal.classList.add('hidden');
                window.location.href = "dashboard.html";
            } else {
                alert("Gagal mendaftar: " + result.message);
            }
        });
    }

    // Proses Sign In (Masuk)
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signInForm.querySelector('input[type="email"]').value;
            const password = signInForm.querySelector('input[type="password"]').value;

            const result = await loginUser(email, password);
            if (result.success) {
                alert("Login Berhasil!");
                signInForm.reset();
                authModal.classList.add('hidden');
                window.location.href = "dashboard.html";
            } else {
                alert("Login Gagal: " + result.message);
            }
        });
    }

    // --- 4. EVENT LISTENER LOGIN GOOGLE & GITHUB ---
    let activeProvider = null;

    document.addEventListener('click', async (e) => {
        const googleBtn = e.target.closest('.btn-google');
        const githubBtn = e.target.closest('.btn-github');

        if (!googleBtn && !githubBtn) return;

        e.preventDefault();

        const currentProvider = googleBtn ? 'google' : 'github';
        if (activeProvider === currentProvider) return;

        activeProvider = currentProvider;

        try {
            const loginFn = googleBtn ? loginWithGoogle : loginWithGithub;
            const result = await loginFn();

            if (result.success) {
                alert("Login Berhasil! Selamat datang " + (result.user.displayName || result.user.email));
                authModal.classList.add('hidden');
                window.location.href = "dashboard.html";
            } else {
                if (!result.message.includes('popup-closed-by-user') && 
                    !result.message.includes('cancelled-popup-request')) {
                    alert("Gagal Login: " + result.message);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            activeProvider = null;
        }
    });

});