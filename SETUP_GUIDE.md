# Content Curator - Complete Setup Guide

**Last Updated**: December 28, 2025

This guide covers SMTP configuration, cron job setup, and production deployment.

---

## 📧 SMTP Configuration for Email Digests

### Option 1: Gmail (Recommended for Testing)

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to Security
3. Enable 2-Step Verification

#### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "Content Curator"
4. Copy the 16-character password

#### Step 3: Configure Backend
Edit `backend/.env`:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=noreply@yourdomain.com  # Optional: custom From address
FRONTEND_URL=http://localhost:3000
```

#### Step 4: Test Email Delivery
```bash
# Restart backend to load new config
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Generate a test digest (in another terminal)
curl -X POST http://localhost:8000/api/digests/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"digest_type": "daily"}'

# Check your email inbox
```

---

### Option 2: SendGrid (Recommended for Production)

#### Step 1: Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify your email address
3. Complete sender authentication

#### Step 2: Create API Key
1. Go to Settings → API Keys
2. Create API Key with "Mail Send" permissions
3. Copy the API key

#### Step 3: Configure Backend
Edit `backend/.env`:

```bash
# SendGrid Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey  # Literally the word "apikey"
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Benefits**:
- 100 emails/day free tier
- Better deliverability
- Analytics and tracking
- Production-ready

---

### Option 3: AWS SES (Enterprise)

#### Step 1: Set Up AWS SES
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your domain or email
3. Request production access (removes sending limits)

#### Step 2: Create SMTP Credentials
1. Go to SMTP Settings
2. Click "Create My SMTP Credentials"
3. Download credentials CSV

#### Step 3: Configure Backend
Edit `backend/.env`:

```bash
# AWS SES Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Your region
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Benefits**:
- 62,000 emails/month free (if sending from EC2)
- $0.10 per 1,000 emails after that
- Excellent deliverability
- High sending limits

---

## ⏰ Cron Job Setup

### Step 1: Create Cron Scripts

The digest sending script is already created at:
```
backend/scripts/send_digests.py
```

Make it executable:
```bash
chmod +x backend/scripts/send_digests.py
```

### Step 2: Set Up Environment

Create a wrapper script for cron (handles virtualenv):

```bash
# Create wrapper script
cat > backend/scripts/cron_wrapper.sh << 'EOF'
#!/bin/bash

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Activate virtual environment (if using one)
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the digest script
python scripts/send_digests.py "$@"

# Exit with the script's exit code
exit $?
EOF

# Make executable
chmod +x backend/scripts/cron_wrapper.sh
```

### Step 3: Configure Cron Jobs

Edit your crontab:
```bash
crontab -e
```

Add these lines (adjust paths to your installation):

```bash
# Content Curator - Email Digests
# Daily digests at 8:00 AM every day
0 8 * * * /path/to/ContentCurator/backend/scripts/cron_wrapper.sh daily >> /var/log/content-curator/daily-digests.log 2>&1

# Weekly digests at 8:00 AM every Monday
0 8 * * 1 /path/to/ContentCurator/backend/scripts/cron_wrapper.sh weekly >> /var/log/content-curator/weekly-digests.log 2>&1

# Monthly cleanup - remove old digests (optional)
0 2 1 * * /path/to/ContentCurator/backend/scripts/cleanup_old_digests.sh >> /var/log/content-curator/cleanup.log 2>&1
```

### Step 4: Create Log Directory

```bash
sudo mkdir -p /var/log/content-curator
sudo chown $USER:$USER /var/log/content-curator
```

### Step 5: Set Up Log Rotation

Create `/etc/logrotate.d/content-curator`:

```bash
sudo cat > /etc/logrotate.d/content-curator << 'EOF'
/var/log/content-curator/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 youruser yourgroup
    sharedscripts
}
EOF
```

### Step 6: Test Cron Jobs

Test manually first:
```bash
# Test daily digest
/path/to/ContentCurator/backend/scripts/cron_wrapper.sh daily

# Check logs
tail -f /var/log/content-curator/daily-digests.log
```

### Step 7: Verify Cron Schedule

```bash
# List current cron jobs
crontab -l

# Check cron logs (Ubuntu/Debian)
grep CRON /var/log/syslog | tail -20
```

---

## 🚀 Production Deployment

### Option A: Docker Deployment (Recommended)

#### Step 1: Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: content_curator
      POSTGRES_USER: curator
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U curator"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      DATABASE_URL: postgresql://curator:${DB_PASSWORD}@db:5432/content_curator
      SECRET_KEY: ${SECRET_KEY}
      OLLAMA_HOST: http://ollama:11434
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM: ${SMTP_FROM}
      FRONTEND_URL: ${FRONTEND_URL}
      TAVILY_API_KEY: ${TAVILY_API_KEY}
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
    depends_on:
      db:
        condition: service_healthy
      ollama:
        condition: service_started
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    networks:
      - app-network

  ollama:
    image: ollama/ollama:latest
    restart: always
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - app-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  certbot:
    image: certbot/certbot:latest
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
  ollama_data:

networks:
  app-network:
    driver: bridge
```

#### Step 2: Create Production Backend Dockerfile

Create `backend/Dockerfile.prod`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 curator && chown -R curator:curator /app
USER curator

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

#### Step 3: Create Production Frontend Dockerfile

Create `frontend/Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1000 curator && \
    adduser -D -u 1000 -G curator curator && \
    chown -R curator:curator /app
USER curator

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]
```

#### Step 4: Create Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin https://yourdomain.com always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Step 5: Create Environment File

Create `.env.production`:

```bash
# Database
DB_PASSWORD=your-secure-password-here

# Backend
SECRET_KEY=$(openssl rand -hex 32)
OLLAMA_HOST=http://ollama:11434

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com

# Frontend
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# API Keys
TAVILY_API_KEY=your-tavily-key
YOUTUBE_API_KEY=your-youtube-key
```

#### Step 6: Deploy

```bash
# Set up SSL certificate first (one-time)
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email

# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Pull Ollama models
docker-compose -f docker-compose.prod.yml exec ollama ollama pull llama3.2
docker-compose -f docker-compose.prod.yml exec ollama ollama pull nomic-embed-text

# Run database migrations (if any)
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl https://yourdomain.com/api/health
```

---

### Option B: VPS Deployment (DigitalOcean, Linode, etc.)

#### Step 1: Provision Server

```bash
# Minimum specs:
# - 4 CPU cores
# - 8GB RAM
# - 50GB SSD
# - Ubuntu 22.04 LTS
```

#### Step 2: Initial Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Create app user
adduser curator
usermod -aG sudo curator

# Set up firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
usermod -aG docker curator

# Switch to app user
su - curator
```

#### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/ContentCurator.git
cd ContentCurator

# Set up environment
cp .env.example .env.production
nano .env.production  # Edit with production values

# Deploy with Docker
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Set up SSL
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    -d yourdomain.com --email your@email.com --agree-tos
```

#### Step 4: Set Up Monitoring

```bash
# Install monitoring tools
docker run -d \
    --name=prometheus \
    -p 9090:9090 \
    -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus

docker run -d \
    --name=grafana \
    -p 3001:3000 \
    grafana/grafana
```

---

## 🔒 Security Checklist

### Pre-Deployment
- [ ] Change all default passwords
- [ ] Generate secure SECRET_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS to allow only your domain
- [ ] Set up firewall rules
- [ ] Enable rate limiting (already configured)
- [ ] Review and secure all API endpoints

### Post-Deployment
- [ ] Set up automated backups (database + volumes)
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts
- [ ] Test disaster recovery procedures
- [ ] Enable automatic security updates
- [ ] Set up intrusion detection (fail2ban)

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl https://yourdomain.com/api/health

# Database check
docker-compose exec db pg_isready -U curator

# Check disk space
df -h

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f --tail=100 backend
```

### Backup Strategy

```bash
# Create backup script
cat > /home/curator/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/curator/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker-compose exec -T db pg_dump -U curator content_curator | \
    gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup volumes
docker run --rm \
    -v contentcurator_postgres_data:/data \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/postgres_data_$DATE.tar.gz /data

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /home/curator/backup.sh

# Add to cron (daily at 2 AM)
echo "0 2 * * * /home/curator/backup.sh" | crontab -
```

---

## 🆘 Troubleshooting

### Email Not Sending

```bash
# Check SMTP configuration
docker-compose exec backend python -c "
from app.config import settings
print(f'SMTP Host: {settings.SMTP_HOST}')
print(f'SMTP Port: {settings.SMTP_PORT}')
print(f'SMTP User: {settings.SMTP_USER}')
"

# Test SMTP connection
docker-compose exec backend python scripts/test_email.py
```

### Ollama Not Responding

```bash
# Check Ollama service
docker-compose exec ollama ollama list

# Restart Ollama
docker-compose restart ollama

# Check logs
docker-compose logs ollama
```

### Database Connection Issues

```bash
# Check database status
docker-compose exec db psql -U curator -d content_curator -c "SELECT version();"

# Check connections
docker-compose exec db psql -U curator -d content_curator -c \
    "SELECT count(*) FROM pg_stat_activity;"
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart specific service
docker-compose restart backend

# Check Ollama model memory
docker-compose exec ollama ollama ps
```

---

## 📚 Additional Resources

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

---

**Setup Complete!** Your Content Curator is now production-ready. 🚀
