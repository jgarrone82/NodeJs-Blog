# NodeJs Blog — Travel Blog

Travel blog built with Node.js, Express, MySQL, and EJS. Features user registration, article publishing, voting system, and a REST API.

## Features

- User registration and login with hashed passwords (bcrypt)
- Full CRUD for posts (create, edit, delete)
- Post voting system
- Author avatar uploads
- Welcome email delivery (Nodemailer + Gmail)
- Post search
- Pagination
- Public REST API (v1)
- Session-protected admin panel

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express 4.x |
| Database | MySQL |
| View Engine | EJS |
| Authentication | express-session + bcrypt |
| File Uploads | express-fileupload |
| Email | Nodemailer |

## Prerequisites

- Node.js 18+
- MySQL 5.7+ or MariaDB 10.3+
- Gmail account with [App Password](https://support.google.com/accounts/answer/185833) enabled

## Installation

```bash
git clone https://github.com/jgarrone82/NodeJs-Blog.git
cd NodeJs-Blog
npm install
```

## Configuration

Create the `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=blog_viajes

SESSION_SECRET=change_this_to_random_string

GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password_here
```

## Database

### Option 1: Import from provided dumps (recommended)

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS blog_viajes;"

# Import tables and data
mysql -u root -p blog_viajes < Dump/blog_viajes_autores.sql
mysql -u root -p blog_viajes < Dump/blog_viajes_publicaciones.sql
```

### Option 2: Create tables manually

```sql
CREATE DATABASE blog_viajes;

USE blog_viajes;

CREATE TABLE autores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  pseudonimo VARCHAR(255) NOT NULL UNIQUE,
  avatar VARCHAR(255) DEFAULT NULL
);

CREATE TABLE publicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  resumen TEXT,
  contenido LONGTEXT,
  autor_id INT NOT NULL,
  fecha_hora DATE,
  votos INT DEFAULT 0,
  FOREIGN KEY (autor_id) REFERENCES autores(id)
);
```

### Authentication compatibility

MySQL 8.0+ uses `caching_sha2_password` by default, which isn't compatible with the older `mysql` npm package. To fix `ER_NOT_SUPPORTED_AUTH_MODE` errors, switch to `mysql_native_password`:

```sql
-- For root user (development only)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;

-- For dedicated user (recommended)
CREATE USER 'bloguser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
GRANT ALL PRIVILEGES ON blog_viajes.* TO 'bloguser'@'localhost';
FLUSH PRIVILEGES;
```

> **Note:** The provided dumps in `Dump/` directory include sample data with example authors and posts. Importing them is recommended for quick setup.

## Running

```bash
npm run dev    # Development (with nodemon)
node webapp.js # Production
```

The server starts at `http://localhost:8080`

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/publicaciones/` | List posts (query: `busqueda`) |
| GET | `/api/v1/publicaciones/:id` | Get post by ID |
| POST | `/api/v1/publicaciones/` | Create post (query: `email`, `contrasena`) |
| DELETE | `/api/v1/publicaciones/:id` | Delete post (query: `email`, `contrasena`) |
| GET | `/api/v1/autores/` | List authors |
| GET | `/api/v1/autores/:id` | Get author with their posts |
| POST | `/api/v1/autores/` | Register author (body: `email`, `contrasena`, `pseudonimo`) |

## Troubleshooting

### MySQL authentication error

If you see `ER_NOT_SUPPORTED_AUTH_MODE`, ensure you've switched to `mysql_native_password` as described above.

### EJS syntax errors

If you encounter EJS compilation errors, check that includes use the correct syntax:
```ejs
<!-- Correct -->
<% include('partials/header') %>

<!-- Incorrect (deprecated) -->
<% include ./partials/header %>
```

### Port already in use

If port 8080 is busy:
```bash
# Find process using port 8080
lsof -ti:8080
# Kill it
kill -9 <PID>
```

ISC
