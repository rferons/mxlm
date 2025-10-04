# Docker Development Environment

This directory contains Docker configuration for local development of the GA Maintenance LogbookLM application.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- pnpm package manager

### Starting the Services

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Check service status:**
   ```bash
   docker-compose ps
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f [service-name]
   ```

### Environment Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/logbooklm"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# AWS Services (LocalStack for development)
AWS_ENDPOINT_URL="http://localhost:4566"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"

# S3 Configuration (MinIO for development)
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="logbooklm-documents"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin123"

# Email Configuration (MailHog for development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_FROM="noreply@logbooklm.local"

# Application Configuration
NODE_ENV="development"
PORT="3001"
API_BASE_URL="http://localhost:3001"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# LLM Provider Configuration
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_API_KEY="your-google-api-key"
```

## 📊 Services Overview

| Service | Port | Description | Web UI |
|---------|------|-------------|---------|
| PostgreSQL | 5432 | Main database | - |
| Redis | 6379 | Caching & sessions | - |
| MinIO | 9000/9001 | S3-compatible storage | http://localhost:9001 |
| LocalStack | 4566 | AWS services emulation | - |
| Elasticsearch | 9200 | Search engine | - |
| MailHog | 1025/8025 | Email testing | http://localhost:8025 |
| Prometheus | 9090 | Metrics collection | http://localhost:9090 |
| Grafana | 3000 | Metrics visualization | http://localhost:3000 |

### Default Credentials

- **MinIO**: `minioadmin` / `minioadmin123`
- **Grafana**: `admin` / `admin`
- **PostgreSQL**: `postgres` / `postgres`

## 🛠️ Development Workflow

### Database Setup

1. **Run migrations:**
   ```bash
   pnpm --filter @mxlm/db run migrate:deploy
   ```

2. **Seed the database:**
   ```bash
   pnpm --filter @mxlm/db run seed
   ```

### Running Tests

1. **Start services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run database tests:**
   ```bash
   pnpm --filter @mxlm/db test
   ```

### Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **MailHog**: http://localhost:8025

## 🔧 Useful Commands

### Service Management
```bash
# Start specific services
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a service
docker-compose restart postgres

# View service logs
docker-compose logs -f postgres
```

### Database Operations
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d logbooklm

# Backup database
docker-compose exec postgres pg_dump -U postgres logbooklm > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres logbooklm < backup.sql
```

### Redis Operations
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Clear all Redis data
docker-compose exec redis redis-cli FLUSHALL
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: If ports are already in use, modify the port mappings in `docker-compose.yml`

2. **Permission issues**: On Linux/macOS, you might need to adjust file permissions:
   ```bash
   sudo chown -R $USER:$USER .
   ```

3. **Docker not running**: Ensure Docker Desktop is started and running

4. **Out of disk space**: Clean up unused Docker resources:
   ```bash
   docker system prune -a
   ```

### Health Checks

All services include health checks. Check service health:
```bash
docker-compose ps
```

### Logs

View logs for debugging:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f postgres
```

## 🔒 Security Notes

- Default credentials are for development only
- Change all passwords in production
- Use environment variables for sensitive data
- Consider using Docker secrets for production deployments

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [MinIO Documentation](https://docs.min.io/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
