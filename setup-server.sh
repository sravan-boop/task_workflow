#!/bin/bash
set -e

echo "=== TaskFlow AI Server Setup ==="

# 1. Update system
echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 22
echo ">>> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL
echo ">>> Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. Create database and user
echo ">>> Setting up database..."
sudo -u postgres psql -c "CREATE USER taskflow WITH PASSWORD 'taskflow123';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE taskflow OWNER taskflow;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE taskflow TO taskflow;"

# 5. Clone the repo
echo ">>> Cloning repository..."
cd ~
if [ -d "task_workflow" ]; then
  cd task_workflow && git pull
else
  git clone https://github.com/sravan-boop/task_workflow.git
  cd task_workflow
fi

# 6. Install dependencies
echo ">>> Installing dependencies..."
npm install

# 7. Create .env file
echo ">>> Creating .env file..."
SERVER_IP=$(curl -s ifconfig.me)
cat > .env << 'ENVEOF'
DATABASE_URL="postgresql://taskflow:taskflow123@localhost:5432/taskflow"
AUTH_SECRET="supersecretkey_change_me_in_production_1234567890"
AUTH_URL="http://SERVER_IP_PLACEHOLDER:3000"
NEXT_PUBLIC_GOOGLE_ENABLED="false"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="taskflow-uploads"
REDIS_URL=""
REDIS_TOKEN=""
RESEND_API_KEY=""
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
ENVEOF
sed -i "s/SERVER_IP_PLACEHOLDER/$SERVER_IP/g" .env
echo "   AUTH_URL set to http://$SERVER_IP:3000"

# 8. Setup Prisma and build
echo ">>> Setting up database schema..."
npx prisma generate
npx prisma db push

echo ">>> Building the app..."
npm run build

# 9. Install PM2 for process management
echo ">>> Installing PM2..."
sudo npm install -g pm2

# 10. Start the app
echo ">>> Starting TaskFlow AI..."
pm2 delete taskflow 2>/dev/null || true
pm2 start npm --name "taskflow" -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "==================================="
echo "  TaskFlow AI is running!"
echo "  Open: http://$SERVER_IP:3000"
echo "==================================="
echo ""
echo "Useful commands:"
echo "  pm2 logs taskflow    - View logs"
echo "  pm2 restart taskflow - Restart app"
echo "  pm2 stop taskflow    - Stop app"
