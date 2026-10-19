import { NavLink, useNavigate } from 'react-router-dom';
import logo2 from '../../assets/images/logo-vocabup.svg';
import { useAuth } from '../../contexts/useAuth';

const getNavClass = ({ isActive }) => `manager-nav-link ${isActive ? 'active' : ''}`;

function safeText(value, fallback = '') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return fallback;
}

const OVERVIEW_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
        <path d="M20 20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V11L1 11L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11L20 11V20ZM11 13V19H13V13H11Z"></path>
    </svg>
);

const USERS_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12ZM4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20V22H4V20Z"></path>
    </svg>
);

const COURSES_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
        <path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM12 5V19H20V5H12ZM13 7H19V9H13V7ZM13 10H19V12H13V10Z"></path>
    </svg>
);

const TOEIC_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
        <path d="M20 2H4C2.89543 2 2 2.89543 2 4V20C2 21.1046 2.89543 22 4 22H20C21.1046 22 22 21.1046 22 20V4C22 2.89543 21.1046 2 20 2ZM8 17H6V10H8V17ZM13 17H11V7H13V17ZM18 17H16V13H18V17Z"></path>
    </svg>
);

const SUPPORT_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
        <path d="M6.45455 19L2 22.5V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.45455Z"></path>
    </svg>
);

const managerNavItems = [
    { to: '/manager', label: 'Tổng quan', exact: true, icon: OVERVIEW_ICON },
    { to: '/manager/users', label: 'Người dùng', icon: USERS_ICON },
    { to: '/manager/courses', label: 'Khóa học', icon: COURSES_ICON },
    { to: '/manager/toeic', label: 'Đề TOEIC', icon: TOEIC_ICON },
    { to: '/manager/support', label: 'Góp ý', icon: SUPPORT_ICON },
];

export default function ManagerSidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const displayName = safeText(user?.name, 'Quản trị viên');
    const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'A';

    const handleLogout = () => {
        onClose?.();
        logout();
        navigate('/login');
    };

    return (
        <aside className={`manager-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="manager-sidebar-brand">
                <NavLink to="/manager" onClick={onClose}>
                    <img src={logo2} alt="VocabUp" className="manager-sidebar-logo" />
                </NavLink>
            </div>

            <nav className="manager-sidebar-nav">
                {managerNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        className={getNavClass}
                        onClick={onClose}
                    >
                        <span className="manager-nav-icon" aria-hidden="true">{item.icon}</span>
                        <span className="manager-nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="manager-sidebar-footer">
                <div className="manager-user-card">
                    <div className="manager-user-avatar">
                        {avatarInitial}
                    </div>
                    <div className="manager-user-meta">
                        <strong>{displayName}</strong>
                        <span>{safeText(user?.email, 'Chưa có email')}</span>
                        <small>{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</small>
                    </div>
                </div>
                <div className="manager-sidebar-actions">
                    <button type="button" className="manager-secondary-btn" onClick={() => navigate('/dashboard')}>
                        Trang học
                    </button>
                    <button type="button" className="manager-primary-btn" onClick={handleLogout}>
                        Đăng xuất
                    </button>
                </div>
            </div>
        </aside>
    );
}
