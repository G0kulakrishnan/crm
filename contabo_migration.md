# Contabo VPS Migration Guide

This guide describes how to move your TechCRM application from Vercel to a **Contabo VPS** (running Ubuntu 22.04 or 24.04).

## 1. Prerequisites
- A Contabo VPS with **Ubuntu** installed.
- SSH access to your VPS.
- Your domain name pointed to the VPS IP address (set an **A Record**).

## 2. Server Initial Setup
Connect to your VPS:
```bash
ssh root@your_vps_ip
```

Update the system and install Node.js (via NVM):
```bash
sudo apt update && sudo apt upgrade -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
node -v # Should show v20.x.x
```

Install common build tools and Nginx:
```bash
sudo apt install git nginx build-essential -y
```

## 3. Deploy the Application
Clone your repository:
```bash
git clone https://github.com/G0kulakrishnan/crm.git /var/www/t2gcrm
cd /var/www/t2gcrm
```

Install dependencies and build the frontend:
```bash
npm install
npm run build
```

Create a `.env` file in the root:
```bash
nano .env
```
Add your environment variables:
```env
PORT=3000
VITE_INSTANT_APP_ID=your_id
INSTANT_ADMIN_TOKEN=your_token
```

## 4. Setup PM2 (Process Manager)
PM2 ensures your app stays running even after a crash or server reboot.
```bash
npm install pm2 -g
pm2 start server.mjs --name "techcrm"
pm2 save
pm2 startup # Follow the on-screen instructions to enable auto-boot
```

## 5. Configure Nginx (Reverse Proxy)
Configure Nginx to forward port 80 to your app port 3000:
```bash
sudo nano /etc/nginx/sites-available/t2gcrm
```

Paste the following:
```nginx
server {
    listen 80;
    server_name yourdomain.com; # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/techcrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Secure with SSL (Certbot)
Install Certbot for free Let's Encrypt certificates:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d crm.t2gcrm.in
```

---
> [!NOTE]
> Since you are using **Express (`server.mjs`)** as your entrance point (which I created earlier), it will automatically serve both the React frontend (from the `dist` folder) and all your backend APIs under `/api`. 
