# Database Setup Guide

## PostgreSQL Setup

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Or use Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE cs2_bot;

# Exit
\q
```

### 3. Configure Connection String

Add to `apps/bot/.env`:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cs2_bot
```

Add to `apps/admin/.env`:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cs2_bot
```

**Note:** Replace `postgres:postgres` with your actual PostgreSQL username and password.

### 4. Run Migrations

Migrations will run automatically when you start the bot or admin app via `initDatabase()`.

### 5. Verify Connection

Start the bot or admin app. You should see:
```
===================== <START> Initializing database =====================
===================== <END> Initializing database =====================
```

If you see connection errors, check:
- PostgreSQL is running: `pg_isready` or check service status
- Database exists: `psql -U postgres -l | grep cs2_bot`
- Connection string is correct in `.env` files
- Firewall allows connections on port 5432

### Docker Alternative

If you prefer Docker:

```bash
docker run --name cs2-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cs2_bot \
  -p 5432:5432 \
  -d postgres:15

# Connection string:
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/cs2_bot
```

