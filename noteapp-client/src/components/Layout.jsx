import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import './Layout.css';

const Layout = () => {
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const handleSignOut = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        window.location.href = '/login';
    };

    const toggleSidebar = () => {
        setIsSidebarMinimized((prev) => !prev);
    };

    return (
        <div className={`layout ${isSidebarMinimized ? 'sidebar-minimized' : ''}`}>
            <aside className={`sidebar ${isSidebarMinimized ? 'minimized' : ''}`}>
                <div className="sidebar-header">
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        {isSidebarMinimized ? '>' : '<'}
                    </button>
                    <br />
                    <br />
                    <br />
                    <h2>Shlaks</h2>
                </div>
                <nav className="nav-links">
                    <Link to="/home">Dashboard</Link>
                    <Link to="/note/new">New Note</Link>
                    <Link to="/notes">Notes List</Link>
                    <Link to="/profile">Account</Link>
                </nav>
                <div className="bottom-section">
                    <button className="theme-toggle-sidebar" onClick={toggleTheme}>
                        {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
                    </button>
                    <button onClick={handleSignOut}>Logout</button>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;