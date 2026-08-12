// 1. Import dari CDN gstatic (bukan npm path)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Konfigurasi Firebase kamu
const firebaseConfig = {
  apiKey: "AIzaSyAxgcsYjE0_COkK_hITCFQo9BnKh_xYAcI",
  authDomain: "ocr-transaction-15314.firebaseapp.com",
  projectId: "ocr-transaction-15314",
  storageBucket: "ocr-transaction-15314.firebasestorage.app",
  messagingSenderId: "172099804276",
  appId: "1:172099804276:web:8072d605ff72dfde798521",
  measurementId: "G-KEJW4LRSLC"
};

// 2. Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// 3. Export instance auth supaya bisa dipakai di file auth.js
export const auth = getAuth(app);