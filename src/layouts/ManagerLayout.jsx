import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import ManagerSidebar from '../components/manager/ManagerSidebar';
import ManagerTopbar from '../components/manager/ManagerTopbar';
import '../assets/css/dashboard/base.css';
import '../assets/css/manager.css';

const pageCopy = {
    '/manager': {
        title: 'Tổng quan',
    },
    '/manager/users': {
        title: 'Quản lý người dùng',
    },
    '/manager/support': {
        title: 'Quản lý góp ý',
    },
    '/manager/courses': {
        title: 'Quản lý khóa học',
    },
    '/manager/toeic': {
        title: 'Quản lý đề TOEIC',
    },
};

export default function ManagerLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const heading = useMemo(() => {
        if (location.pathname.includes('/topics')) {
            return {
                title: 'Quản lý chủ đề',
            };
        }

        if (location.pathname.includes('/manager/toeic/')) {
            return {
                title: 'TOEIC Test Builder',
            };
        }

        return pageCopy[location.pathname] || pageCopy['/manager'];
    }, [location.pathname]);

    return (
        <div className="manager-shell">
            <ManagerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div
                className={`manager-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />
            <div className="manager-main">
                <ManagerTopbar
                    onMenuClick={() => setSidebarOpen(true)}
                    title={heading.title}
                />
                <Outlet />
            </div>
        </div>
    );
}
