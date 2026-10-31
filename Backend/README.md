# WAC Auto Care - Backend API

Node.js + Express backend service connected to MySQL for the WAC Auto Care ecosystem (Admin Web Dashboard and React Native Mobile App).

## Tech Stack
- **Runtime**: Node.js (v22+)
- **Framework**: Express.js
- **Database**: MySQL (XAMPP / MariaDB)
- **Database Driver**: `mysql2` with Connection Pool and Promises
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Database Management**: [phpMyAdmin](http://localhost:8081/phpmyadmin/)

## Setup & Running

### 1. Configure Environment
Copy `.env.example` to `.env` if not already present. Default values:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wac_db
DB_PORT=3306
JWT_SECRET=wac_jwt_super_secret_key_2026_xyz123
```

### 2. Initialize Database & Seeds
Run the database setup script to automatically create tables (`users`, `services`, `bookings`) and seed initial data:
```bash
npm run init-db
```

### 3. Start Server
- **Development (auto-reload)**:
  ```bash
  npm run dev
  ```
- **Production**:
  ```bash
  npm start
  ```

Server will run at `http://localhost:5000`.

## API Endpoints

### System
- `GET /api/health` - Health check & database connection status
- `GET /api` - API info and route index

### Authentication
- `POST /api/auth/register` - Register a customer or staff user
- `POST /api/auth/login` - User login (returns JWT token and user info)
- `GET /api/auth/profile` - Current user profile (Bearer token required)

### Services
- `GET /api/services` - List all active services
- `GET /api/services/:id` - Get specific service
- `POST /api/services` - Create service (Admin only)
- `PUT /api/services/:id` - Update service (Admin only)
- `DELETE /api/services/:id` - Deactivate service (Admin only)

### Bookings & Appointments
- `GET /api/bookings` - List all bookings with filters (Admin / Staff)
- `GET /api/bookings/stats` - Summary statistics for Admin Dashboard
- `GET /api/bookings/:id` - Booking details
- `POST /api/bookings` - Create new booking (Mobile App / Admin)
- `PATCH /api/bookings/:id/status` - Update booking status (`pending`, `confirmed`, `in_progress`, `completed`, `cancelled`)

### Users
- `GET /api/users` - List all users (Admin only)
- `PATCH /api/users/:id` - Update user role or status (Admin only)
