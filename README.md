# WAC Auto Care - Full Stack Solution

Welcome to the **WAC Auto Care** repository. This solution consists of three primary subsystems:

1. **`WAC_Backend`**: Node.js & Express REST API with MySQL (`mysql2` pool & JWT authentication).
2. **`WAC_Admin`**: React JavaScript Web Admin Dashboard built with Vite, React Router, and Lucide icons.
3. **`WaseemAutoCare_RN`**: React Native mobile app (Expo SDK 58) for customers and staff.

---

## 🗄️ Database & Environment Information

- **MySQL Database**: `wac_db`
- **MySQL Host / Port**: `localhost:3306`
- **phpMyAdmin URL**: [http://localhost:8081/phpmyadmin/](http://localhost:8081/phpmyadmin/)
- **Default Database User**: `root`
- **Default Password**: *(blank)*

### Initial Database Tables:
- `users`: Administrator, Staff, and Customer user accounts.
- `services`: Auto care services catalog with pricing and estimated durations.
- `bookings`: Customer service booking requests with vehicle details and status workflow.

---

## 🚀 Quick Start Guide

### 1. Backend (`WAC_Backend`)
```bash
cd WAC_Backend

# 1. Initialize tables & seed data in MySQL
npm run init-db

# 2. Run backend dev server (Port 5000)
npm run dev
```
- API Base: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

### 2. Admin Web Panel (`WAC_Admin`)
```bash
cd WAC_Admin

# Run React Vite dev server (Port 5173)
npm run dev
```
- Web URL: `http://localhost:5173`
- Default Login:
  - **Email**: `admin@wac.com`
  - **Password**: `admin123`

### 3. React Native Mobile App (`WaseemAutoCare_RN`)
```bash
cd WaseemAutoCare_RN

# Run Expo development server
npx expo start
```
