import os
import re
import shutil
import cv2
import pytesseract
from PIL import Image
import openpyxl
from openpyxl import Workbook, load_workbook
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Mengizinkan frontend berkomunikasi dengan backend

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# 1. KONFIGURASI TESSERACT
# ==========================================
def configure_tesseract():
    if shutil.which("tesseract"):
        pytesseract.pytesseract.tesseract_cmd = "tesseract"
        return True
    default_win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
    ]
    for path in default_win_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            return True
    return False

configure_tesseract()

# ==========================================
# 2. PREPROCESSING & PARSER LOGIC
# ==========================================
def preprocess_transaction_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Gambar tidak dapat dibaca.")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]
    scale_factor = 2.5
    gray = cv2.resize(gray, (int(w * scale_factor), int(h * scale_factor)), interpolation=cv2.INTER_CUBIC)
    gray_clean = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(gray_clean, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10)
    return gray_clean, thresh

class TransactionInformation:
    def __init__(self):
        self.bank = "-"
        self.tanggal = "-"
        self.waktu = "-"
        self.pengirim = "-"
        self.penerima = "-"
        self.nominal = "-"
        self.no_ref = "-"

class TransactionOCRParser:
    def __init__(self, raw_text):
        self.text = raw_text
        self.result = TransactionInformation()
        self.parse()

    def parse(self):
        lines = [line.strip() for line in self.text.split('\n') if line.strip()]
        full_text_upper = self.text.upper()

        # Deteksi Bank
        banks = {"BNI": "Bank BNI", "MANDIRI": "Bank Mandiri", "BCA": "Bank BCA", "BRI": "Bank BRI", "SEABANK": "SeaBank"}
        for key, value in banks.items():
            if key in full_text_upper:
                self.result.bank = value
                break

        # Extract Tanggal, Waktu, & Ref
        for i, line in enumerate(lines):
            line_upper = line.upper()
            match_waktu = re.search(r'(\d{2}:\d{2}(?::\d{2})?)', line)
            if match_waktu and self.result.waktu == "-":
                self.result.waktu = match_waktu.group(1).strip()

            if self.result.tanggal == "-":
                match_tgl = re.search(r'(\d{1,2}\s+[A-Za-z0-9]{3,4}\s+20\d{2}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]20\d{2})', line)
                if match_tgl:
                    self.result.tanggal = match_tgl.group(1).strip()

            if any(k in line_upper for k in ["REF", "NO. TRANSAKSI", "ID TRANSAKSI"]) and self.result.no_ref == "-":
                digits = re.findall(r'\d+', line_upper)
                if digits:
                    self.result.no_ref = "".join(digits)

        # Extract Nominal
        for line in lines:
            line_upper = line.upper()
            if any(k in line_upper for k in ["TOTAL", "NOMINAL", "AMOUNT", "JUMLAH", "RP"]):
                match_rp = re.search(r'(?:RP|\:\s*)[\s\.]*([0-9\.\,]{4,})', line_upper)
                if match_rp:
                    self.result.nominal = f"Rp {match_rp.group(1).strip()}"
                    break

    def to_dict(self):
        return self.result.__dict__

# ==========================================
# 3. ENDPOINT FLASK API
# ==========================================
@app.route('/api/ocr', methods=['POST'])
def process_ocr():
    if 'file' not in request.files:
        return jsonify({"error": "Tidak ada file diunggah"}), 400
    
    file = request.files['file']
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        gray_img, thresh_img = preprocess_transaction_image(filepath)
        custom_config = r'--psm 6'
        raw_text = pytesseract.image_to_string(thresh_img, config=custom_config)
        
        parser = TransactionOCRParser(raw_text)
        data = parser.to_dict()

        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/simpan-excel', methods=['POST'])
def save_excel():
    data = request.json
    file_path = "Rekap_Bukti_Transfer.xlsx"
    headers = ["Bank", "Tanggal", "Pengirim", "Penerima", "Nominal", "No Referensi"]

    if not os.path.exists(file_path):
        wb = Workbook()
        ws = wb.active
        ws.title = "Rekap Transaksi"
        ws.append(headers)
    else:
        wb = load_workbook(file_path)
        ws = wb.active

    ws.append([
        data.get("bank", "-"),
        data.get("tanggal", "-"),
        data.get("pengirim", "-"),
        data.get("penerima", "-"),
        data.get("nominal", "-"),
        data.get("no_ref", "-")
    ])
    wb.save(file_path)
    return jsonify({"status": "success", "message": "Data berhasil disimpan ke Excel"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)