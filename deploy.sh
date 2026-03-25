#!/bin/bash

# T2GCRM VPS Deployment Script
# Target: Ubuntu 22.04+ | Domain: crm.t2gcrm.in

set -e

APP_NAME="t2gcrm"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="crm.t2gcrm.in"
PORT=3000

echo "🚀 Starting deployment for $APP_NAME..."

# 1. Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx build-essential curl

# 2. Install Node.js v20 via NVM
if ! [ -x "$(command -v nvm)" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

nvm install 20
nvm use 20

# 3. Clone / Update Repository
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p /var/www
    sudo chown $USER:$USER /var/www
    git clone https://github.com/G0kulakrishnan/crm.git "$APP_DIR"
else
    cd "$APP_DIR"
    git pull
fi

cd "$APP_DIR"

# 4. Install Dependencies & Build
npm install
npm run build

# 5. Environment Variables
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found. Creating a template..."
    cat <<EOT >> .env
PORT=$PORT
VITE_INSTANT_APP_ID=your_instantdb_app_id
INSTANT_ADMIN_TOKEN=your_instantdb_admin_token
EOT
    echo "❌ Please edit $APP_DIR/.env with your actual credentials and run the script again."
    # exit 1 # Don't exit here, let them finish Nginx setup first
fi

# 6. PM2 Setup
sudo npm install -g pm2
pm2 stop "$APP_NAME" || true
pm2 start server.mjs --name "$APP_NAME"
pm2 save
sudo env PATH=$PATH:$(dirname $(which node)) $(which pm2) startup systemd -u $USER --hp $HOME

# 7. Nginx Configuration
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
sudo bash -c "cat <<EOT > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOT"

sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/"
sudo nginx -t
sudo systemctl restart nginx

# 8. SSL Setup (Certbot)
sudo apt install -y certbot python3-certbot-nginx
echo "🔒 Requesting SSL for $DOMAIN..."
# sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m santhanam.gokul@gmail.com

echo "✅ Deployment Complete!"
echo "📍 Access your app at: http://$DOMAIN"
echo "🛠️ Remember to edit your .env file at $APP_DIR/.env if you haven't already."
