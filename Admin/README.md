# WAC Auto Care - Admin Portal

React JavaScript single page application (SPA) built with Vite for managing the WAC Auto Care platform.

## Features
- **Dashboard Overview**: Key metrics (total bookings, revenue, pending jobs, active services, registered customers).
- **Service Bookings**: Real-time booking management, search filters, and status transitions (`pending`, `confirmed`, `in_progress`, `completed`, `cancelled`).
- **Services Catalog**: Add, edit, and deactivate auto care services and pricing.
- **User & Role Management**: Manage administrator, mechanic/staff, and customer access.
- **Database Link**: One-click quick access to [phpMyAdmin](http://localhost:8081/phpmyadmin/).

## Tech Stack
- **Framework**: React 18 (JavaScript / JSX)
- **Bundler & Dev Server**: Vite
- **Routing**: React Router v6
- **Icons**: Lucide React
- **HTTP Client**: Axios (pre-configured with JWT interceptors)

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Check `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_PHPMYADMIN_URL=http://localhost:8081/phpmyadmin/
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Default Admin Login
- **Email**: `admin@wac.com`
- **Password**: `admin123`
