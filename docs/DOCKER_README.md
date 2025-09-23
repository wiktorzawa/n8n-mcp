# Docker Deployment Guide for n8n-MCP

This guide provides comprehensive instructions for deploying n8n-MCP using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+ (Docker Desktop on Windows/macOS, or Docker Engine on Linux)
- Docker Compose V2
- (Optional) openssl for generating auth tokens

### 1. HTTP Server Mode (Recommended)

The simplest way to deploy n8n-MCP is using Docker Compose with HTTP mode:

```bash
# Clone the repository
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp

# Create .env file with auth token
cat > .env << EOF
AUTH_TOKEN=$(openssl rand -base64 32)
USE_FIXED_HTTP=true
EOF

# Start the server
docker compose up -d

# Check logs
docker compose logs -f

# Test the health endpoint
curl http://localhost:3000/health
```

### 2. Using Pre-built Images

Pre-built images are available on GitHub Container Registry:

```bash
# Pull the latest image (~280MB optimized)
docker pull ghcr.io/czlonkowski/n8n-mcp:latest

# Run with HTTP mode
docker run -d \
  --name n8n-mcp \
  -e MCP_MODE=http \
  -e USE_FIXED_HTTP=true \
  -e AUTH_TOKEN=your-secure-token \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

## 📋 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_MODE` | Server mode: `stdio` or `http` | `stdio` | No |
| `AUTH_TOKEN` | Bearer token for HTTP authentication | - | Yes (HTTP mode)* |
| `AUTH_TOKEN_FILE` | Path to file containing auth token (v2.7.5+) | - | Yes (HTTP mode)* |
| `PORT` | HTTP server port | `3000` | No |
| `NODE_ENV` | Environment: `development` or `production` | `production` | No |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` | `info` | No |
| `NODE_DB_PATH` | Custom database path (v2.7.16+) | `/app/data/nodes.db` | No |

*Either `AUTH_TOKEN` or `AUTH_TOKEN_FILE` must be set for HTTP mode. If both are set, `AUTH_TOKEN` takes precedence.

### Configuration File Support (v2.8.2+)

You can mount a JSON configuration file to set environment variables:

```bash
# Create config file
cat > config.json << EOF
{
  "MCP_MODE": "http",
  "AUTH_TOKEN": "your-secure-token",
  "LOG_LEVEL": "info",
  "N8N_API_URL": "https://your-n8n-instance.com",
  "N8N_API_KEY": "your-api-key"
}
EOF

# Run with config file
docker run -d \
  --name n8n-mcp \
  -v $(pwd)/config.json:/app/config.json:ro \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

The config file supports:
- All standard environment variables
- Nested objects (flattened with underscore separators)
- Arrays, booleans, numbers, and strings
- Secure handling with command injection prevention
- Dangerous variable blocking for security

### Docker Compose Configuration

The default `docker-compose.yml` provides:
- Automatic restart on failure
- Named volume for data persistence
- Memory limits (512MB max, 256MB reserved)
- Health checks every 30 seconds
- Container labels for organization

### Custom Configuration

Create a `docker-compose.override.yml` for local customizations:

```yaml
# docker-compose.override.yml
services:
  n8n-mcp:
    ports:
      - "8080:3000"  # Use different port
    environment:
      LOG_LEVEL: debug
      NODE_ENV: development
    volumes:
      - ./custom-data:/app/data  # Use local directory
```

## 🔧 Usage Modes

### HTTP Mode (Remote Access)

Perfect for cloud deployments and remote access:

```bash
# Start in HTTP mode
docker run -d \
  --name n8n-mcp-http \
  -e MCP_MODE=http \
  -e AUTH_TOKEN=your-secure-token \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

Configure Claude Desktop with mcp-remote:
```json
{
  "mcpServers": {
    "n8n-remote": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/mcp-remote@latest",
        "connect",
        "http://your-server:3000/mcp"
      ],
      "env": {
        "MCP_AUTH_TOKEN": "your-secure-token"
      }
    }
  }
}
```

### Stdio Mode (Local Direct Access)

For local Claude Desktop integration without HTTP:

```bash
# Run in stdio mode (interactive)
docker run --rm -i --init \
  -e MCP_MODE=stdio \
  -v n8n-mcp-data:/app/data \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

### Server Mode (Command Line)

You can also use the `serve` command to start in HTTP mode:

```bash
# Using the serve command (v2.8.2+)
docker run -d \
  --name n8n-mcp \
  -e AUTH_TOKEN=your-secure-token \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest serve
```

Configure Claude Desktop:
```json
{
  "mcpServers": {
    "n8n-docker": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--init",
        "-e", "MCP_MODE=stdio",
        "-v", "n8n-mcp-data:/app/data",
        "ghcr.io/czlonkowski/n8n-mcp:latest"
      ]
    }
  }
}
```

## 🏗️ Building from Source

### Build Locally

```bash
# Clone repository
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp

# Build image
docker build -t n8n-mcp:local .

# Run your local build
docker run -d \
  --name n8n-mcp-local \
  -e MCP_MODE=http \
  -e AUTH_TOKEN=test-token \
  -p 3000:3000 \
  n8n-mcp:local
```

### Multi-architecture Build

Build for multiple platforms:

```bash
# Enable buildx
docker buildx create --use

# Build for amd64 and arm64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t n8n-mcp:multiarch \
  --load \
  .
```

## 🔍 Health Monitoring

### Health Check Endpoint

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
curl http://localhost:3000/health
```

Response example:
```json
{
  "status": "healthy",
  "uptime": 120.5,
  "memory": {
    "used": "8.5 MB",
    "rss": "45.2 MB",
    "external": "1.2 MB"
  },
  "version": "2.3.0",
  "mode": "http",
  "database": {
    "adapter": "better-sqlite3",
    "ready": true
  }
}
```

### Docker Health Status

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect n8n-mcp | jq '.[0].State.Health'
```

## 🔒 Security Considerations

### Authentication

n8n-MCP supports two authentication methods for HTTP mode:

#### Method 1: AUTH_TOKEN (Environment Variable)
- Set the token directly as an environment variable
- Simple and straightforward for basic deployments
- Always use a strong token (minimum 32 characters)

```bash
# Generate secure token
openssl rand -base64 32

# Use in Docker
docker run -e AUTH_TOKEN=your-secure-token ...
```

#### Method 2: AUTH_TOKEN_FILE (File Path) - NEW in v2.7.5
- Read token from a file (Docker secrets compatible)
- More secure for production deployments
- Prevents token exposure in process lists

```bash
# Create token file
echo "your-secure-token" > /path/to/token.txt

# Use with Docker secrets
docker run -e AUTH_TOKEN_FILE=/run/secrets/auth_token ...
```

#### Best Practices
- Never commit tokens to version control
- Rotate tokens regularly
- Use AUTH_TOKEN_FILE with Docker secrets for production
- Ensure token files have restricted permissions (600)

### Network Security

For production deployments:

1. **Use HTTPS** - Put a reverse proxy (nginx, Caddy) in front
2. **Firewall** - Restrict access to trusted IPs only
3. **VPN** - Consider VPN access for internal use

Example with Caddy:
```
your-domain.com {
  reverse_proxy n8n-mcp:3000
  basicauth * {
    admin $2a$14$... # bcrypt hash
  }
}
```

### Container Security

- Runs as non-root user (uid 1001)
- Read-only root filesystem compatible
- No unnecessary packages installed
- Regular security updates via GitHub Actions

## 📊 Resource Management

### Memory Limits

Default limits in docker-compose.yml:
- Maximum: 512MB
- Reserved: 256MB

Adjust based on your needs:
```yaml
services:
  n8n-mcp:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Volume Management

```bash
# List volumes
docker volume ls | grep n8n-mcp

# Inspect volume
docker volume inspect n8n-mcp-data

# Backup data
docker run --rm \
  -v n8n-mcp-data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/n8n-mcp-backup.tar.gz -C /source .

# Restore data
docker run --rm \
  -v n8n-mcp-data:/target \
  -v $(pwd):/backup:ro \
  alpine tar xzf /backup/n8n-mcp-backup.tar.gz -C /target
```

### Custom Database Path (v2.7.16+)

You can specify a custom database location using `NODE_DB_PATH`:

```bash
# Use custom path within mounted volume
docker run -d \
  --name n8n-mcp \
  -e MCP_MODE=http \
  -e AUTH_TOKEN=your-token \
  -e NODE_DB_PATH=/app/data/custom/my-nodes.db \
  -v n8n-mcp-data:/app/data \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

**Important Notes:**
- The path must end with `.db`
- For data persistence, ensure the path is within a mounted volume
- Paths outside mounted volumes will be lost on container restart
- The directory will be created automatically if it doesn't exist

## 🐛 Troubleshooting

### Common Issues

#### Container Exits Immediately
```bash
# Check logs
docker logs n8n-mcp

# Common causes:
# - Missing AUTH_TOKEN in HTTP mode
# - Database initialization failure
# - Port already in use
```

#### Database Not Initialized
```bash
# Manually initialize database
docker exec n8n-mcp node dist/scripts/rebuild.js

# Or recreate container with fresh volume
docker compose down -v
docker compose up -d
```

#### Permission Errors
```bash
# Fix volume permissions
docker exec n8n-mcp chown -R nodejs:nodejs /app/data
```

### Debug Mode

Enable debug logging:
```bash
docker run -d \
  --name n8n-mcp-debug \
  -e MCP_MODE=http \
  -e AUTH_TOKEN=test \
  -e LOG_LEVEL=debug \
  -p 3000:3000 \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

### Container Shell Access

```bash
# Access running container
docker exec -it n8n-mcp sh

# Run as root for debugging
docker exec -it -u root n8n-mcp sh
```

## 🚀 Production Deployment

### Recommended Setup

1. **Use Docker Compose** for easier management
2. **Enable HTTPS** with reverse proxy
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure backups** for the data volume
5. **Use secrets management** for AUTH_TOKEN

### Google Cloud VM Production Deployment

This section documents a complete production setup on Google Cloud VM with proven architecture:

**What you get:**
- n8n workflow editor with SSL (https://n8n.YOUR_IP.sslip.io)
- n8n-MCP AI integration (https://mcp.YOUR_IP.sslip.io) 
- Automatic HTTPS certificates via Caddy
- Secure internal networking (no exposed ports)
- Docker volume persistence
- Easy backup and maintenance

**One-Command Deployment:**

```bash
# SSH into your Google Cloud VM and run:
curl -fsSL https://raw.githubusercontent.com/czlonkowski/n8n-mcp/main/deploy/gcp-setup.sh | bash
```

**Manual Step-by-Step:**

```bash
# 1. Prepare VM and install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout and login again

# 2. Create deployment directory
mkdir -p ~/n8n-stack && cd ~/n8n-stack

# 3. Get your VM's external IP
VM_IP=$(curl -s ifconfig.me)
echo "Your VM IP: $VM_IP"

# 4. Create environment configuration
cat > .env << EOF
# Auto-detected VM IP for sslip.io
VM_IP=$VM_IP

# n8n Settings
N8N_HOST=0.0.0.0
N8N_PORT=5678
WEBHOOK_URL=https://n8n.${VM_IP}.sslip.io
N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)

# n8n-MCP Settings
N8N_MODE=true
MCP_MODE=http
N8N_API_URL=http://n8n:5678
N8N_API_KEY=change-me-after-n8n-setup
MCP_AUTH_TOKEN=$(openssl rand -hex 32)
AUTH_TOKEN=$(openssl rand -hex 32)

# Domains (using sslip.io for automatic SSL)
DOMAIN_N8N=n8n.${VM_IP}.sslip.io
DOMAIN_MCP=mcp.${VM_IP}.sslip.io
EOF

# 5. Save your authentication tokens
echo "=== SAVE THESE AUTHENTICATION TOKENS ==="
echo "MCP Auth Token: $(grep MCP_AUTH_TOKEN .env | cut -d= -f2)"
echo "n8n Encryption Key: $(grep N8N_ENCRYPTION_KEY .env | cut -d= -f2)"
echo "========================================="

# 6. Create Docker Compose stack
cat > docker-compose.yml << 'EOF'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=${WEBHOOK_URL}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - DB_TYPE=sqlite
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - app_network

  n8n-mcp:
    image: ghcr.io/czlonkowski/n8n-mcp:latest
    container_name: n8n-mcp
    restart: unless-stopped
    pull_policy: always
    environment:
      - N8N_MODE=${N8N_MODE}
      - MCP_MODE=${MCP_MODE}
      - N8N_API_URL=${N8N_API_URL}
      - N8N_API_KEY=${N8N_API_KEY}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
      - AUTH_TOKEN=${AUTH_TOKEN}
      - PORT=3000
      - LOG_LEVEL=info
    volumes:
      - mcp_data:/app/data
      - mcp_logs:/app/logs
    networks:
      - app_network
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
      - app_network

networks:
  app_network:
    driver: bridge

volumes:
  n8n_data:
  mcp_data:
  mcp_logs:
  caddy_data:
  caddy_config:
EOF

# 7. Create Caddyfile for SSL and reverse proxy
cat > Caddyfile << EOF
# n8n workflow editor
${DOMAIN_N8N} {
    reverse_proxy n8n:5678
    header {
        Strict-Transport-Security max-age=31536000;
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
}

# n8n-MCP AI service
${DOMAIN_MCP} {
    reverse_proxy n8n-mcp:3000
    header {
        Strict-Transport-Security max-age=31536000;
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
}
EOF

# 8. Configure Google Cloud firewall
gcloud compute firewall-rules create allow-http-https \
    --allow tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP and HTTPS for n8n stack" \
    2>/dev/null || echo "Firewall rule already exists"

# 9. Deploy the stack
docker compose pull
docker compose up -d

# 10. Wait for startup
echo "Waiting for services to start..."
sleep 30

# 11. Verify deployment
echo "Checking service status..."
docker compose ps

echo "
🎉 Deployment Complete!

Your services are running at:
📝 n8n Editor: https://n8n.${VM_IP}.sslip.io
🤖 n8n-MCP: https://mcp.${VM_IP}.sslip.io

Next Steps:
1. Open n8n and create admin account
2. Go to Settings → API and create API key
3. Update .env file: N8N_API_KEY=your-new-api-key
4. Restart MCP: docker compose restart n8n-mcp
5. Test MCP connection in n8n workflows

Your MCP Auth Token: $(grep MCP_AUTH_TOKEN .env | cut -d= -f2)
"
```

**Quick Health Check:**

```bash
# Verify all services are running
docker compose ps

# Test external access
VM_IP=$(curl -s ifconfig.me)
curl -I https://n8n.${VM_IP}.sslip.io
curl -I https://mcp.${VM_IP}.sslip.io/health

# Check internal connectivity
docker compose exec n8n curl -f http://n8n-mcp:3000/health

# View logs if needed
docker compose logs -f --tail=20
```

**Integration with n8n:**

After n8n setup, configure the MCP Client Tool node:
- Server URL: `https://mcp.YOUR_VM_IP.sslip.io/mcp`
- Auth Token: Your `MCP_AUTH_TOKEN` value  
- Transport: HTTP Streamable (SSE)

**Backup and Maintenance:**

```bash
# Backup all data
mkdir backups
docker run --rm \
  -v n8n-stack_n8n_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/n8n-$(date +%Y%m%d).tar.gz -C /source .

docker run --rm \
  -v n8n-stack_mcp_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mcp-$(date +%Y%m%d).tar.gz -C /source .

# Update services
docker compose pull
docker compose up -d

# View resource usage
docker stats --no-stream
```

**Cost Estimation (Google Cloud):**
- VM: e2-standard-2 (~$50/month)
- Storage: 20GB SSD (~$3/month)  
- Network: Egress costs vary by region
- **Total: ~$55/month for production-ready setup**

```yaml
# docker-compose.prod.yml
services:
  n8n-mcp:
    image: ghcr.io/czlonkowski/n8n-mcp:latest
    restart: always
    environment:
      MCP_MODE: http
      AUTH_TOKEN_FILE: /run/secrets/auth_token
      NODE_ENV: production
    secrets:
      - auth_token
    networks:
      - internal
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
  
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    networks:
      - internal
      - external

networks:
  internal:
  external:

secrets:
  auth_token:
    file: ./secrets/auth_token.txt
```

## 📦 Available Images

- `ghcr.io/czlonkowski/n8n-mcp:latest` - Latest stable release
- `ghcr.io/czlonkowski/n8n-mcp:2.3.0` - Specific version
- `ghcr.io/czlonkowski/n8n-mcp:main-abc123` - Development builds

### Image Details

- Base: `node:22-alpine`
- Size: ~280MB compressed
- Features: Pre-built database with all node information
- Database: Complete SQLite with 525+ nodes
- Architectures: `linux/amd64`, `linux/arm64`
- Updated: Automatically via GitHub Actions

## 🔄 Updates and Maintenance

### Updating

```bash
# Pull latest image
docker compose pull

# Recreate container
docker compose up -d

# View update logs
docker compose logs -f
```

### Automatic Updates (Watchtower)

```yaml
# Add to docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 n8n-mcp
```

## 📚 Additional Resources

- [Main Documentation](./docs/README.md)
- [HTTP Deployment Guide](./docs/HTTP_DEPLOYMENT.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- [Installation Guide](./docs/INSTALLATION.md)

## 🤝 Support

- Issues: [GitHub Issues](https://github.com/czlonkowski/n8n-mcp/issues)
- Discussions: [GitHub Discussions](https://github.com/czlonkowski/n8n-mcp/discussions)

---

*Last updated: July 2025 - Docker implementation v1.1*