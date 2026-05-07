# Deployment

Runbook: как развернуть cs2-bot-admin на VPS с нуля. Команды копипастятся, переменные подставляются. Если что-то сломалось — в `operations.md` (когда заведём).

---

## Prereqs

- VPS Ubuntu 24.04, root SSH-доступ
- Уже установлены: `docker`, `docker compose plugin`, `nginx`, `certbot` (с `python3-certbot-nginx`), `postgresql-16`
- Уже работает соседний проект на хостовом nginx + Postgres — не ломаем
- Домен `awawa-chef.com` в Namecheap, доступ к Advanced DNS
- GitHub repo `abuyuk10/cs2-bot`, права на push в main + Settings/Secrets

---

## 1. DNS

Namecheap → Domain List → `awawa-chef.com` → Manage → Advanced DNS:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `cs2` | `144.91.73.230` | Automatic |

Проверка пропагации (с любой машины):
```bash
dig cs2.awawa-chef.com +short    # должно вернуть 144.91.73.230
```
Или https://dnschecker.org. Пропагация обычно 5–30 минут.

---

## 2. Postgres setup на VPS

### 2.1 Закрыть от интернета

```bash
cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.bak.$(date +%s)
sed -i "s/^#*\s*listen_addresses.*/listen_addresses = 'localhost,172.17.0.1'/" /etc/postgresql/16/main/postgresql.conf
systemctl restart postgresql
ss -tlnp | grep :5432
# ожидаем: 127.0.0.1:5432, 172.17.0.1:5432, [::1]:5432. БЕЗ 0.0.0.0
```

⚠️ Если на VPS ещё работают другие приложения, использующие БД через публичный IP — сначала перенастрой их на `172.17.0.1`, иначе `restart` уронит коннекты.

### 2.2 Роль и БД

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE cs2_bot WITH LOGIN PASSWORD 'СГЕНЕРИРУЙ_СИЛЬНЫЙ_ПАРОЛЬ';
CREATE DATABASE cs2_bot OWNER cs2_bot;
\c cs2_bot
GRANT ALL ON SCHEMA public TO cs2_bot;
SQL
```

### 2.3 pg_hba для docker bridge

⚠️ **Важно:** перед `echo >>` убедиться, что файл оканчивается переводом строки, иначе склеишь две строки в одну невалидную.

```bash
[ "$(tail -c1 /etc/postgresql/16/main/pg_hba.conf | xxd -p)" != "0a" ] && echo "" >> /etc/postgresql/16/main/pg_hba.conf
cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.bak.$(date +%s)
echo "host    cs2_bot    cs2_bot    172.17.0.0/16    scram-sha-256" >> /etc/postgresql/16/main/pg_hba.conf
systemctl reload postgresql

# verify
sudo -u postgres psql -c "SELECT line_number, user_name, address, error FROM pg_hba_file_rules WHERE error IS NOT NULL OR user_name::text='cs2_bot';"
# error должен быть NULL
```

### 2.4 Smoke-test из docker

```bash
PGPASSWORD='ТВОЙ_ПАРОЛЬ' docker run --rm -e PGPASSWORD postgres:16 \
  psql -h 172.17.0.1 -U cs2_bot -d cs2_bot -c "SELECT current_user, inet_server_addr();"
# ожидаем: cs2_bot | 172.17.0.1
```

---

## 3. nginx vhost + TLS

### 3.1 Server-block

```bash
cat > /etc/nginx/sites-available/cs2.awawa-chef.com <<'CONF'
server {
    listen 80;
    server_name cs2.awawa-chef.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
CONF

ln -s /etc/nginx/sites-available/cs2.awawa-chef.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3.2 TLS

```bash
certbot --nginx -d cs2.awawa-chef.com --non-interactive --agree-tos -m anton.buyuk@gmail.com
# certbot сам перепишет vhost, добавит listen 443 ssl и редирект
nginx -t && systemctl reload nginx
```

Проверка:
```bash
curl -I https://cs2.awawa-chef.com
# ожидаем: HTTP/2 502 (бэкенда ещё нет — это норма) с правильными SSL-заголовками
```

Renewal — через системный `certbot.timer` (уже запущен соседом, ничего не настраиваем).

---

## 4. /opt/cs2-bot/ на VPS

```bash
mkdir -p /opt/cs2-bot/storage/uploads
chown -R 1000:1000 /opt/cs2-bot/storage   # UID node-юзера

# .env
cat > /opt/cs2-bot/.env <<'ENV'
DATABASE_URL=postgres://cs2_bot:ТВОЙ_ПАРОЛЬ@host.docker.internal:5432/cs2_bot
BOT_TOKEN=...
BOT_USERNAME=...
JWT_SECRET=...
DEVELOP_MODE=false
NODE_ENV=production
STORAGE_PATH=/app/storage/uploads
ENV
chmod 600 /opt/cs2-bot/.env

# docker-compose.yml
cat > /opt/cs2-bot/docker-compose.yml <<'YAML'
services:
  admin:
    image: ghcr.io/abuyuk10/cs2-bot-admin:latest
    container_name: cs2-admin
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file: .env
    volumes:
      - /opt/cs2-bot/storage/uploads:/app/storage/uploads
    extra_hosts:
      - "host.docker.internal:host-gateway"
YAML
```

---

## 5. GH Secrets + Actions

### 5.1 SSH key

```bash
# на VPS
ssh-keygen -t ed25519 -f ~/.ssh/cs2_deploy -N "" -C "cs2-bot deploy"
cat ~/.ssh/cs2_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/cs2_deploy   # приватный — копируем в GH Secrets
```

### 5.2 Secrets

GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SSH_HOST` | `144.91.73.230` |
| `SSH_USER` | `root` |
| `SSH_KEY` | содержимое `~/.ssh/cs2_deploy` (приватный) |

### 5.3 Workflow

См. `.github/workflows/deploy.yml` в репо. Триггеры: `push` в `main`, `workflow_dispatch`. Шаги:
1. Checkout
2. Login в `ghcr.io`
3. `docker buildx build` + push образа с тегом `${{ github.sha }}` и `latest`
4. SSH на VPS → `cd /opt/cs2-bot && docker compose pull && docker compose up -d`

---

## 6. Smoke-test

```bash
# 1. главная отдаёт 200
curl -I https://cs2.awawa-chef.com

# 2. БД мигрирована (initDatabase прошёл)
sudo -u postgres psql cs2_bot -c "\dt"
# ожидаем таблицы: maps, sides, lines, difficulties, grenade_types, smokes, granade_media, users

# 3. логин через Telegram → переход на /admin/grenades
# (вручную в браузере)

# 4. загрузка гранаты с медиа → файл в storage
ls /opt/cs2-bot/storage/uploads/
```

---

## Rollback

Если новая сборка сломала прод:

```bash
# на VPS, в /opt/cs2-bot/
docker compose pull cs2-admin                  # подтянуть текущий latest, если он ещё ОК
# либо запинить конкретный sha:
sed -i 's|:latest|:abc1234|' docker-compose.yml
docker compose up -d
```

Образы старых сборок остаются в `ghcr.io` неограниченно (для пет-проекта норм). Тег по `github.sha` всегда даёт детерминистичный rollback.
