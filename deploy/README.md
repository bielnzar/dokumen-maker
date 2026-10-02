# Panduan Deployment DokumenMaker di VPS Perusahaan

Panduan ini menjelaskan cara melakukan *deployment* DokumenMaker di VPS (Ubuntu / Debian) dengan arsitektur **Reverse Proxy (Nginx)** yang aman:
- **Frontend** disajikan langsung sebagai berkas statis oleh Nginx (Port 80 / 443).
- **Backend FastAPI** berjalan di *internal loopback* (`127.0.0.1:8090`), dikelola oleh `systemd`.
- **Port 8090 TIDAK PERLU dibuka ke publik/internet**, sehingga aman dari akses luar langsung.

---

## 1. Persiapan Server VPS

Pastikan dependensi sistem sudah terpasang:
```bash
sudo apt update
sudo apt install -y nginx python3 python3-venv python3-pip poppler-utils libreoffice curl ufw git
```

Install Node.js 18+ (jika belum ada):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Setup Direktori Proyek

Disarankan menempatkan proyek di `/var/www/dokumenmaker`:
```bash
sudo mkdir -p /var/www/dokumenmaker
sudo chown -R $USER:$USER /var/www/dokumenmaker

# Clone atau copy repositori ke dalam folder tersebut
cd /var/www/dokumenmaker
```

---

## 3. Setup Backend & Virtualenv

```bash
cd /var/www/dokumenmaker/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Buat file .env dan isi API Key Gemini Anda
cp .env.example .env 2>/dev/null || echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
nano .env # pastikan GEMINI_API_KEY terisi dengan benar
deactivate
```

---

## 4. Build Frontend

```bash
cd /var/www/dokumenmaker/frontend
npm install
npm run build
# Hasil build akan berada di /var/www/dokumenmaker/frontend/dist
```

---

## 5. Pasang Systemd Service (Backend Autostart)

Salin file konfigurasi service:
```bash
sudo cp /var/www/dokumenmaker/deploy/systemd/dokumenmaker-backend.service /etc/systemd/system/

# Edit user jika bukan www-data atau sesuaikan path bila perlu
sudo nano /etc/systemd/system/dokumenmaker-backend.service

# Muat ulang systemd dan aktifkan service
sudo systemctl daemon-reload
sudo systemctl enable dokumenmaker-backend
sudo systemctl start dokumenmaker-backend

# Cek status service
sudo systemctl status dokumenmaker-backend
```

---

## 6. Pasang Nginx Reverse Proxy

Salin konfigurasi Nginx:
```bash
sudo cp /var/www/dokumenmaker/deploy/nginx/dokumenmaker.conf /etc/nginx/sites-available/

# Edit domain atau IP jika diperlukan
sudo nano /etc/nginx/sites-available/dokumenmaker.conf

# Buat symlink untuk mengaktifkan situs
sudo ln -s /etc/nginx/sites-available/dokumenmaker.conf /etc/nginx/sites-enabled/

# Hapus default Nginx jika belum dihapus
sudo rm -f /etc/nginx/sites-enabled/default

# Uji konfigurasi Nginx
sudo nginx -t

# Muat ulang Nginx
sudo systemctl reload nginx
```

---

## 7. Keamanan Firewall (UFW)

Hanya buka port HTTP (80) dan HTTPS (443) serta SSH (22):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> **Penting:** Jangan buka port `8090` di UFW. Backend aman terlindungi di jaringan internal `127.0.0.1`.

---

## 8. (Opsional) Pasang SSL Gratis (Let's Encrypt / Certbot)

Jika VPS memiliki domain publik (misal: `dokumen.kantor.co.id`):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dokumen.kantor.co.id
```
Certbot akan otomatis memperbarui konfigurasi Nginx ke HTTPS dan mengatur auto-renewal.
