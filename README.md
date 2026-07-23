# 📦 Inventory Management System

A scalable and secure RESTful API for an Inventory Management System built using the MERN stack. This backend provides authentication, role-based authorization, product and inventory management, vendor management, purchase and sales tracking, and dashboard analytics.

---

## 🚀 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB Atlas**
- **Mongoose**
- **JWT Authentication**
- **bcrypt**
- **dotenv**
- **CORS**

---

## 📁 Project Structure

```
src/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   └── categoryController.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── models/
│   ├── User.js
│   └── Category.js
│
├── routes/
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   └── testRoutes.js
│
├── services/
│   ├── authService.js
│   └── categoryService.js
│
├── utils/
│   └── generateToken.js
│
├── app.js
└── server.js
```

---

# ✨ Features

### Authentication

- User Registration
- User Login
- Password Hashing (bcrypt)
- JWT Authentication
- Protected Routes

### Authorization

- Role Based Access Control
- Admin
- Manager
- Staff

### Category Management

- Create Category
- Get Categories *(In Progress)*
- Update Category *(In Progress)*
- Delete Category *(In Progress)*

### Upcoming Modules

- Vendor Management
- Product Management
- Inventory Management
- Purchase Orders
- Sales Orders
- Dashboard Analytics

---

# 📌 API Endpoints

## Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Register User |
| POST | `/api/auth/login` | Login User |

---

## Categories

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/categories` | Create Category |

---

# 🔐 Roles

- **Admin**
- **Manager**
- **Staff**

Permissions are controlled using custom role-based middleware.

---

# 🛠️ Installation

Clone the repository

```bash
git clone https://github.com/your-username/inventory-management-backend.git
```

Move into the project

```bash
cd inventory-management-backend
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Server will start on

```
http://localhost:2000
```

---

# 🧪 API Testing

The APIs can be tested using:

- Postman
- Thunder Client
- Insomnia

---

# 📦 Dependencies

```json
bcrypt
cors
dotenv
express
jsonwebtoken
mongoose
validator
nodemon
```

---

# 🏗️ Architecture

The project follows a layered architecture.

```
Client
   │
   ▼
Routes
   │
   ▼
Controllers
   │
   ▼
Services
   │
   ▼
Models
   │
   ▼
MongoDB
```

This architecture keeps the code modular, scalable, and easy to maintain.

---

# 🔒 Authentication Flow

```
Register
    │
    ▼
Password Hashing
    │
    ▼
MongoDB

---------------------

Login
    │
    ▼
Compare Password
    │
    ▼
Generate JWT
    │
    ▼
Protected Routes
```

---

# 📋 Current Progress

- ✅ Project Setup
- ✅ MongoDB Atlas Integration
- ✅ User Authentication
- ✅ JWT Authentication
- ✅ Password Hashing
- ✅ Authentication Middleware
- ✅ Role-Based Authorization
- ✅ Category Creation API

---


# 👨‍💻 TEAMMATES

**Aditya Kishore Sharma**
**Anant Raj**
**Shreshth Kumar Tyagi**

B.Tech Computer Science Engineering

MERN Stack Developer

---

