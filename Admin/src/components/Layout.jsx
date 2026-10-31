import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/accounts': 'Account Management',
  '/roles': 'Role & Permission Management',
  '/profile': 'My Profile',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Management Portal';

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
