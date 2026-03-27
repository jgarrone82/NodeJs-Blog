# NodeJs Blog — Blog de Viajes

Blog de viajes construido con Node.js, Express, MySQL y EJS. Permite registro de usuarios, publicación de artículos, sistema de votos y una API REST.

## Características

- Registro e inicio de sesión con contraseñas hasheadas (bcrypt)
- CRUD completo de publicaciones (crear, editar, eliminar)
- Sistema de votos en publicaciones
- Subida de avatares para autores
- Envío de correo de bienvenida (Nodemailer + Gmail)
- Búsqueda de publicaciones
- Paginación
- API REST pública (v1)
- Panel de administración protegido por sesión

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express 4.x |
| Base de datos | MySQL |
| Motor de vistas | EJS |
| Autenticación | express-session + bcrypt |
| Archivos | express-fileupload |
| Email | Nodemailer |

## Requisitos previos

- Node.js 18+
- MySQL 5.7+ o MariaDB 10.3+
- Una cuenta de Gmail con [App Password](https://support.google.com/accounts/answer/185833) habilitado

## Instalación

```bash
git clone https://github.com/jgarrone82/NodeJs-Blog.git
cd NodeJs-Blog
npm install
```

## Configuración

Crear el archivo `.env` a partir del ejemplo:

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=blog_viajes

SESSION_SECRET=change_this_to_random_string

GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password_here
```

## Base de datos

Crear la base de datos y las tablas:

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

## Ejecución

```bash
npm run dev    # Desarrollo (con nodemon)
node webapp.js # Producción
```

El servidor arranca en `http://localhost:8080`

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/publicaciones/` | Listar publicaciones (query: `busqueda`) |
| GET | `/api/v1/publicaciones/:id` | Obtener publicación por ID |
| POST | `/api/v1/publicaciones/` | Crear publicación (query: `email`, `contrasena`) |
| DELETE | `/api/v1/publicaciones/:id` | Eliminar publicación (query: `email`, `contrasena`) |
| GET | `/api/v1/autores/` | Listar autores |
| GET | `/api/v1/autores/:id` | Obtener autor con sus publicaciones |
| POST | `/api/v1/autores/` | Registrar autor (body: `email`, `contrasena`, `pseudonimo`) |

## Licencia

ISC
