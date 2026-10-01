# LavaLust Framework

> A lightweight, fast PHP framework built for developers who want clean MVC architecture without unnecessary complexity or performance overhead.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PHP Version](https://img.shields.io/badge/PHP-%3E%3D7.4-8892BF)](https://www.php.net/)
[![GitHub Stars](https://img.shields.io/github/stars/ronmarasigan/lavalust?style=flat)](https://github.com/ronmarasigan/lavalust/stargazers)

---

## Overview

**LavaLust** is an open-source PHP framework that follows the **MVC (Model–View–Controller)** architectural pattern. It is designed for developers who need a structured, maintainable, and scalable foundation — without the bloat of heavier modern frameworks.

Whether you are building a simple web application, a REST API, or a teaching project, LavaLust provides the right tools with minimal friction.

---

## Features

| Feature | Description |
|---|---|
| **MVC Architecture** | Clean separation of Models, Views, and Controllers for organized, maintainable code |
| **Built-in Routing** | Flexible URL routing that maps requests to controllers with minimal configuration |
| **Libraries & Helpers** | Reusable components for sessions, forms, validation, and database access |
| **Modular Design** | Scalable structure that supports clean organization as your application grows |
| **REST API Support** | First-class support for building RESTful APIs using LavaLust conventions |
| **ORM-like Models** | Simplified, readable database interaction without a heavy abstraction layer |

---

## Requirements

- PHP 7.4 or higher
- A web server with URL rewriting support (Apache `.htaccess` or Nginx config)
- Composer (optional, for dependency management)

---

## Installation

**Clone the repository:**

```bash
git clone https://github.com/ronmarasigan/lavalust.git
cd lavalust
```

**Or download a release directly:**

```bash
wget https://github.com/ronmarasigan/lavalust/archive/refs/heads/main.zip
unzip main.zip
```

Configure your web server to point to the project root and ensure `mod_rewrite` (Apache) or equivalent is enabled.

---

## Quick Start

### 1. Define a Route

**File:** `app/config/routes.php`

```php
$router->get('/', 'Welcome::index');
$router->get('/about', 'Welcome::about');
$router->post('/users/store', 'Users::store');
```

### 2. Create a Controller

**File:** `app/controllers/Welcome.php`

```php
<?php

class Welcome extends Controller
{
    public function index()
    {
        $data['title'] = 'Home';
        $this->call->view('welcome', $data);
    }

    public function about()
    {
        $this->call->view('about');
    }
}
```

### 3. Create a View

**File:** `app/views/welcome.php`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= $title ?></title>
</head>
<body>
    <h1>Welcome to LavaLust Framework</h1>
    <p>Lightweight. Fast. MVC.</p>
</body>
</html>
```

### 4. Create a Model

**File:** `app/models/User_model.php`

```php
<?php

class User_model extends Model
{
    protected $table = 'users';

    public function getAll()
    {
        return $this->db->table($this->table)->get()->getResult();
    }

    public function findById(int $id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get()
    }
}
```

---

## Project Structure

```
lavalust/
├── app/
│   ├── config/          # Application configuration (database, routes, etc.)
│   ├── controllers/     # Controller classes
│   ├── models/          # Model classes
│   ├── views/           # View templates
│   └── libraries/       # Custom libraries and helpers
├── scheme/              # Core framework files (do not modify)
├── public/              # Publicly accessible entry point
│   └── index.php
└── runtime/            # Cache, logs, and uploads (must be writable)
```

---

## Configuration

### Database

**File:** `app/config/database.php`

```php
$database['main'] = array(
    'driver'	=> getenv('DB_DRIVER') ?: '',
    'hostname'	=> getenv('DB_HOST') ?: '',
    'port'		=> getenv('DB_PORT') ?: '',
    'username'	=> getenv('DB_USER') ?: '',
    'password'	=> getenv('DB_PASSWORD') ?: '',
    'database'	=> getenv('DB_NAME') ?: '',
    'charset'	=> getenv('DB_CHARSET') ?: '',
    'dbprefix'	=> getenv('DB_PREFIX') ?: '',
    // Optional for SQLite
    'path'      => ''
);
```

### Base URL

**File:** `app/config/config.php`

```php
$config['base_url'] = 'http://localhost:3000/';
```

---

## Building a REST API

LavaLust supports REST API development out of the box. Controllers can return JSON responses for API endpoints.

```php
<?php

class Api extends Controller
{
    $this->call->library('api');

    public function users()
    {
        $this->api->require_method('GET');
        $auth = $this->api->require_jwt(); 

        $this->call->model('User_model');
        $users = $this->User_model->getAll();

        $this->api->respond(['data' => $users]);
    }
}
```

Route definition:

```php
$router->get('/api/users', 'Api::users');
```

## Laboratory Exercise 6: Stockroom

This repository contains the LavaLust API in `app/` and the React/Vite client in `frontend/`.

### Local setup

1. Create an Aiven MySQL service and run `database/lab6_schema.sql` in its SQL console. For local development, the same script can be run against a MySQL database.
2. Copy `.env.example` to `.env` and enter the Aiven connection values. Set `DB_SSL_CA` to the downloaded Aiven CA certificate path. Use separate random values (at least 32 characters) for `JWT_SECRET` and `REFRESH_TOKEN_KEY`.
3. Start the API from the repository root with `php lava run 3000`.
4. In `frontend/`, run `npm install`, then `npm run dev`. The client defaults to `http://localhost:3000`; set `VITE_API_URL` in `frontend/.env.local` if the API uses another URL.
5. Create the first account from the sign-in screen. Registration is open; every registered account can manage products.

The authenticated API is `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, and the product endpoints under `/api/products`. Include `Authorization: Bearer <token>` for all product requests. Logout clears the client token; access tokens expire after 15 minutes.

### Render deployment

Connect the repository to Render and create or update the Docker Web Service from `render.yaml`. The Docker build compiles the React app and serves it at `/`; LavaLust API routes remain under `/api/`, using the same origin. Set the Aiven values as Render environment variables. Upload the Aiven CA certificate as a Secret File named `ca.pem`; `DB_SSL_CA` is configured as `/etc/secrets/ca.pem`.

To create the tables without a local SQL client, open the Render Web Service Shell after its Aiven environment variables and CA Secret File are configured, then run `php console/setup_schema.php`. The script applies `database/lab6_schema.sql` to the configured Aiven database and is safe to run more than once. Render and Aiven credentials are intentionally not included in this repository; deployment requires your own GitHub, Render, and Aiven accounts.

---

## Philosophy

LavaLust is built on a single principle: **minimal core, maximum control.**

Modern frameworks often add layers of abstraction that benefit large enterprise teams but get in the way of developers who want to understand exactly what their code is doing. LavaLust provides structure and utilities without hiding the underlying logic — making it an excellent choice for:

- **Rapid prototyping** — Get an application running in minutes
- **Learning MVC** — Understand how each architectural layer works
- **Lightweight production apps** — Deploy without dragging in unused dependencies
- **Teaching PHP development** — Clear conventions, readable source code

---

## Documentation

Full documentation is available at **[https://lavalust.netlify.app](https://lavalust.netlify.app)**

Topics covered include:

- Installation and server configuration
- Routing: static, dynamic, and grouped routes
- Controllers and request handling
- Models and query builder
- Views, layouts, and partials
- Built-in libraries (sessions, form validation, file upload)
- Helper functions
- REST API development
- Security best practices

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature description"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a pull request against `main`

Please ensure your code follows the existing style conventions and includes relevant documentation or comments where appropriate.

---

## Roadmap

- [ ] CLI tool for generating controllers, models, and migrations
- [ ] Middleware support
- [ ] Improved query builder with relationship support
- [ ] Enhanced error handling and debugging tools

---

## License

LavaLust Framework is open-source software licensed under the **[MIT License](https://opensource.org/licenses/MIT)**.

---

## Links

- **GitHub Repository:** [https://github.com/ronmarasigan/lavalust](https://github.com/ronmarasigan/lavalust)
- **Documentation:** [https://lavalust.netlify.app](https://lavalust.netlify.app)
- **Report an Issue:** [https://github.com/ronmarasigan/lavalust/issues](https://github.com/ronmarasigan/lavalust/issues)