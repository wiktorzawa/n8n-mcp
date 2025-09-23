# Installation Guide

This guide covers all installation methods for n8n-MCP.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Installation](#docker-installation)
- [Manual Installation](#manual-installation)
- [Development Setup](#development-setup)
- [Troubleshooting](#troubleshooting)

## Quick Start

The fastest way to get n8n-MCP running:

```bash
# Using Docker (recommended)
cat > .env << EOF
AUTH_TOKEN=$(openssl rand -base64 32)
USE_FIXED_HTTP=true
EOF
docker compose up -d
```

## Docker Installation

### Prerequisites

- Docker Engine (install via package manager or Docker Desktop)
- Docker Compose V2 (included with modern Docker installations)

### Method 1: Using Pre-built Images

1. **Create a project directory:**
   ```bash
   mkdir n8n-mcp && cd n8n-mcp
   ```

2. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     n8n-mcp:
       image: ghcr.io/czlonkowski/n8n-mcp:latest
       container_name: n8n-mcp
       restart: unless-stopped
       
       environment:
         MCP_MODE: ${MCP_MODE:-http}
         USE_FIXED_HTTP: ${USE_FIXED_HTTP:-true}
         AUTH_TOKEN: ${AUTH_TOKEN:?AUTH_TOKEN is required}
         NODE_ENV: ${NODE_ENV:-production}
         LOG_LEVEL: ${LOG_LEVEL:-info}
         PORT: ${PORT:-3000}
       
       volumes:
         - n8n-mcp-data:/app/data
       
       ports:
         - "${PORT:-3000}:3000"
       
       healthcheck:
         test: ["CMD", "curl", "-f", "http://127.0.0.1:3000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   
   volumes:
     n8n-mcp-data:
       driver: local
   ```

3. **Create .env file:**
   ```bash
   echo "AUTH_TOKEN=$(openssl rand -base64 32)" > .env
   ```

4. **Start the container:**
   ```bash
   docker compose up -d
   ```

5. **Verify installation:**
   ```bash
   curl http://localhost:3000/health
   ```

### Method 2: Building from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/czlonkowski/n8n-mcp.git
   cd n8n-mcp
   ```

2. **Build the image:**
   ```bash
   docker build -t n8n-mcp:local .
   ```

3. **Run with docker-compose:**
   ```bash
   docker compose up -d
   ```

### Docker Management Commands

```bash
# View logs
docker compose logs -f

# Stop the container
docker compose stop

# Remove container and volumes
docker compose down -v

# Update to latest image
docker compose pull
docker compose up -d

# Execute commands inside container
docker compose exec n8n-mcp npm run validate

# Backup database
docker cp n8n-mcp:/app/data/nodes.db ./nodes-backup.db
```

## Manual Installation

### Prerequisites

- Node.js v16+ (v20+ recommended)
- npm or yarn
- Git

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/czlonkowski/n8n-mcp.git
   cd n8n-mcp
   ```

2. **Clone n8n documentation (optional but recommended):**
   ```bash
   git clone https://github.com/n8n-io/n8n-docs.git ../n8n-docs
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Initialize the database:**
   ```bash
   npm run rebuild
   ```

6. **Validate installation:**
   ```bash
   npm run test-nodes
   ```

### Running the Server

#### stdio Mode (for Claude Desktop)
```bash
npm start
```

#### HTTP Mode (for remote access)
```bash
npm run start:http
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Server configuration
MCP_MODE=http          # or stdio
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# Authentication (required for HTTP mode)
AUTH_TOKEN=your-secure-token-here

# Database
NODE_DB_PATH=./data/nodes.db
REBUILD_ON_START=false
```

## Development Setup

### Prerequisites

- All manual installation prerequisites
- TypeScript knowledge
- Familiarity with MCP protocol

### Setup Steps

1. **Clone and install:**
   ```bash
   git clone https://github.com/czlonkowski/n8n-mcp.git
   cd n8n-mcp
   npm install
   ```

2. **Set up development environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Development commands:**
   ```bash
   # Run in development mode with auto-reload
   npm run dev
   
   # Run tests
   npm test
   
   # Type checking
   npm run typecheck
   
   # Linting
   npm run lint
   ```

### Docker Development

1. **Use docker-compose override:**
   ```bash
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```

2. **Edit override for development:**
   ```yaml
   version: '3.8'
   
   services:
     n8n-mcp:
       build: .
       environment:
         NODE_ENV: development
         LOG_LEVEL: debug
       volumes:
         - ./src:/app/src:ro
         - ./dist:/app/dist
   ```

3. **Run with live reload:**
   ```bash
   docker compose up --build
   ```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Use a different port
PORT=3001 docker compose up -d
```

#### Database Initialization Failed
```bash
# For Docker
docker compose exec n8n-mcp npm run rebuild

# For manual installation
npm run rebuild
```

#### Permission Denied Errors
```bash
# Fix permissions (Linux/macOS)
sudo chown -R $(whoami) ./data

# For Docker volumes
docker compose exec n8n-mcp chown -R nodejs:nodejs /app/data
```

#### Node Version Mismatch
The project includes automatic fallback to sql.js for compatibility. If you still have issues:
```bash
# Check Node version
node --version

# Use nvm to switch versions
nvm use 20
```

### Getting Help

1. Check the logs:
   - Docker: `docker compose logs`
   - Manual: Check console output or `LOG_LEVEL=debug npm start`

2. Validate the database:
   ```bash
   npm run validate
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Report issues:
   - GitHub Issues: https://github.com/czlonkowski/n8n-mcp/issues
   - Include logs and environment details

## Production Deployment on Google Cloud VM

This section documents a proven production deployment architecture used successfully on Google Cloud VM, featuring:
- n8n in Docker (internal port 5678)
- n8n-MCP in Docker (internal port 3000) 
- Caddy reverse proxy (public ports 80/443 with automatic HTTPS)
- Docker volumes for data persistence
- SSL certificates via sslip.io or custom domain

### Architecture Overview

```
Internet → Caddy (80/443) → Docker Network → n8n (5678) + n8n-MCP (3000)
                    ↓
              [SSL Termination]
              [Load Balancing]
              [Static Files]
```

**Benefits:**
- Automatic HTTPS with Let's Encrypt
- No exposed internal ports
- Easy scaling and maintenance
- Production-ready security
- Simple backup and restore

### Prerequisites

- Google Cloud VM (or any cloud provider)
- Ubuntu 20.04+ or similar Linux distribution  
- Docker and Docker Compose installed
- Domain name (or use sslip.io for testing)
- Firewall rules allowing HTTP/HTTPS traffic

### Step 1: Server Preparation

```bash
# SSH into your Google Cloud VM
ssh your-username@your-vm-external-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Logout and login again to apply docker group membership
exit
ssh your-username@your-vm-external-ip

# Verify Docker installation
docker --version
docker compose --version
```

### Step 2: Create Project Structure

```bash
# Create project directory
mkdir -p ~/n8n-production && cd ~/n8n-production

# Create data directories
mkdir -p data/n8n data/mcp data/caddy

# Create configuration directory
mkdir -p config
```

### Step 3: Configure Environment Variables

```bash
# Create environment file with secure tokens
cat > .env << EOF
# n8n Configuration
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=https://n8n.your-domain.com
N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)

# n8n-MCP Configuration  
MCP_MODE=http
N8N_MODE=true
MCP_AUTH_TOKEN=$(openssl rand -hex 32)
AUTH_TOKEN=$(openssl rand -hex 32)
N8N_API_URL=http://n8n:5678
N8N_API_KEY=your-n8n-api-key-here

# Domain Configuration (adjust for your setup)
DOMAIN_N8N=n8n.your-domain.com
DOMAIN_MCP=mcp.your-domain.com

# For testing with sslip.io (replace YOUR_VM_IP)
# DOMAIN_N8N=n8n.YOUR_VM_IP.sslip.io
# DOMAIN_MCP=mcp.YOUR_VM_IP.sslip.io
EOF

# Secure the environment file
chmod 600 .env

# Display generated tokens (save these!)
echo "=== IMPORTANT: Save these tokens ==="
grep -E "(ENCRYPTION_KEY|AUTH_TOKEN)" .env
echo "===================================="
```

### Step 4: Create Docker Compose Configuration

```bash
# Create main docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    environment:
      - N8N_HOST=${N8N_HOST:-0.0.0.0}
      - N8N_PORT=${N8N_PORT:-5678}
      - N8N_PROTOCOL=${N8N_PROTOCOL:-http}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - DB_TYPE=sqlite
      - DB_SQLITE_DATABASE=/home/node/.n8n/database.sqlite
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - n8n_network
    depends_on:
      - n8n-mcp

  n8n-mcp:
    image: ghcr.io/czlonkowski/n8n-mcp:latest
    container_name: n8n-mcp
    restart: unless-stopped
    environment:
      - MCP_MODE=${MCP_MODE:-http}
      - N8N_MODE=${N8N_MODE:-true}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
      - AUTH_TOKEN=${AUTH_TOKEN}
      - N8N_API_URL=${N8N_API_URL}
      - N8N_API_KEY=${N8N_API_KEY}
      - PORT=3000
      - LOG_LEVEL=info
    volumes:
      - mcp_data:/app/data
      - mcp_logs:/app/logs
    networks:
      - n8n_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - n8n_network
    depends_on:
      - n8n
      - n8n-mcp

networks:
  n8n_network:
    driver: bridge

volumes:
  n8n_data:
    driver: local
  mcp_data:
    driver: local
  mcp_logs:
    driver: local
  caddy_data:
    driver: local
  caddy_config:
    driver: local
EOF
```

### Step 5: Configure Caddy Reverse Proxy

```bash
# Create Caddyfile for reverse proxy and SSL
cat > Caddyfile << EOF
# n8n instance - main workflow editor
${DOMAIN_N8N} {
    reverse_proxy n8n:5678
    
    # Security headers
    header {
        # Enable HSTS
        Strict-Transport-Security max-age=31536000;
        # Prevent XSS attacks
        X-Content-Type-Options nosniff
        # Prevent clickjacking
        X-Frame-Options DENY
        # Enable XSS protection
        X-XSS-Protection "1; mode=block"
    }
    
    # Optional: Basic auth for additional security
    # basicauth {
    #     admin \$2a\$14\$hashed_password_here
    # }
}

# n8n-MCP instance - AI integration service
${DOMAIN_MCP} {
    reverse_proxy n8n-mcp:3000
    
    # Security headers
    header {
        Strict-Transport-Security max-age=31536000;
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
    
    # Rate limiting for API protection
    rate_limit {
        zone mcp_api {
            key {remote}
            window 1m
            requests 60
        }
    }
}

# Optional: Redirect root domain to n8n
# your-domain.com {
#     redir https://${DOMAIN_N8N}{uri}
# }
EOF

# For sslip.io testing, update domains in Caddyfile
if grep -q "sslip.io" .env; then
    VM_IP=$(curl -s ifconfig.me)
    sed -i "s/your-domain.com/${VM_IP}.sslip.io/g" Caddyfile
    echo "Updated Caddyfile for sslip.io with IP: $VM_IP"
fi
```

### Step 6: Configure Google Cloud Firewall

```bash
# Allow HTTP and HTTPS traffic (if not already configured)
gcloud compute firewall-rules create allow-http-https \
    --allow tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP and HTTPS traffic"

# Optional: Allow specific port for testing (remove in production)
# gcloud compute firewall-rules create allow-mcp-test \
#     --allow tcp:3000 \
#     --source-ranges YOUR_IP/32 \
#     --description "Temporary MCP testing access"
```

### Step 7: Deploy the Stack

```bash
# Pull latest images
docker compose pull

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 8: Verify Installation

```bash
# Check container health
docker compose ps
docker stats --no-stream

# Test internal connectivity
docker exec n8n curl -f http://n8n-mcp:3000/health

# Test external endpoints
curl -I https://n8n.${VM_IP}.sslip.io
curl -I https://mcp.${VM_IP}.sslip.io/health

# Check SSL certificates
openssl s_client -connect n8n.${VM_IP}.sslip.io:443 -servername n8n.${VM_IP}.sslip.io < /dev/null
```

### Step 9: n8n Initial Setup

1. **Access n8n**: Navigate to `https://n8n.your-domain.com`
2. **Create Admin Account**: Set up your admin user
3. **Generate API Key**: 
   - Go to Settings → API
   - Create a new API key
   - Copy the key to your `.env` file as `N8N_API_KEY`
4. **Restart Services**: `docker compose restart n8n-mcp`

### Step 10: Configure n8n MCP Client Tool

In your n8n workflows:

1. **Add MCP Client Tool Node**
2. **Configure Connection**:
   ```
   Server URL: https://mcp.your-domain.com/mcp
   Auth Token: [Your MCP_AUTH_TOKEN value]
   Transport: HTTP Streamable (SSE)
   ```
3. **Test Connection**: Try the `list_nodes` tool

### Data Management

```bash
# Backup all data
docker compose exec caddy tar czf /data/backup-$(date +%Y%m%d).tar.gz \
    /data/n8n /data/mcp /data/caddy

# Copy backup to host
docker cp caddy:/data/backup-$(date +%Y%m%d).tar.gz ./

# Restore from backup
docker compose down
docker volume rm n8n-production_n8n_data n8n-production_mcp_data
docker compose up -d
docker cp ./backup-YYYYMMDD.tar.gz caddy:/data/
docker compose exec caddy tar xzf /data/backup-YYYYMMDD.tar.gz -C /
```

### Monitoring and Maintenance

```bash
# View logs
docker compose logs -f --tail=50

# Monitor resource usage
docker stats

# Update services
docker compose pull
docker compose up -d

# Clean up old images
docker system prune -f
```

### Security Best Practices

1. **Firewall Configuration**:
   - Only expose ports 80 and 443
   - Use Google Cloud firewall rules
   - Consider IP whitelisting for admin access

2. **Authentication**:
   - Use strong API keys (32+ characters)
   - Enable basic auth on Caddy for additional protection
   - Rotate tokens regularly

3. **SSL/TLS**:
   - Caddy automatically manages Let's Encrypt certificates
   - Enforces HTTPS redirects
   - Includes security headers

4. **Data Protection**:
   - Regular backups of Docker volumes
   - Encrypted communication between services
   - Secure environment variable storage

### Troubleshooting

**Service won't start:**
```bash
# Check logs
docker compose logs service-name

# Verify environment variables
docker compose config

# Test network connectivity
docker compose exec n8n ping n8n-mcp
```

**SSL certificate issues:**
```bash
# Check Caddy logs
docker compose logs caddy

# Verify domain DNS
nslookup your-domain.com

# Test certificate manually
openssl s_client -connect your-domain.com:443
```

**n8n-MCP connection issues:**
```bash
# Verify MCP endpoint
curl https://mcp.your-domain.com/mcp

# Check authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://mcp.your-domain.com/mcp

# Test internal connectivity
docker compose exec n8n curl http://n8n-mcp:3000/health
```

### Cost Optimization (Google Cloud)

- **Machine Type**: e2-standard-2 (2 vCPU, 8GB RAM) recommended
- **Disk**: 20GB persistent SSD for OS + data
- **Firewall**: Use targeted rules instead of 0.0.0.0/0 where possible
- **Monitoring**: Enable Cloud Monitoring for resource tracking

This architecture provides a production-ready, scalable deployment that can handle significant workloads while maintaining security and ease of management.

## Next Steps

After installation, configure Claude Desktop to use n8n-MCP:
- See [Claude Desktop Setup Guide](./README_CLAUDE_SETUP.md)
- For remote deployments, see [HTTP Deployment Guide](./HTTP_DEPLOYMENT.md)
- For Docker details, see [Docker README](../DOCKER_README.md)