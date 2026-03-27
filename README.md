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

Create the database and tables:

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

## License

ISC
