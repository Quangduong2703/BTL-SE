import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo2 from '../../assets/images/logo-vocabup.svg';
import { useAuth } from '../../contexts/useAuth';
import { applyTheme, getSavedTheme, THEME_EVENT } from '../../utils/theme';

function LogoutIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M10 17L11.41 15.59L8.83 13H21V11H8.83L11.41 8.41L10 7L5 12L10 17Z"
                fill="currentColor"
            />
            <path
                d="M4 4H11V6H6V18H11V20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState(() => getSavedTheme());

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.classList.add('mobile-menu-open');
        } else {
            document.body.classList.remove('mobile-menu-open');
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.classList.remove('mobile-menu-open');
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        const handleThemeChange = (event) => {
            setTheme(event.detail?.theme === 'dark' ? 'dark' : 'light');
        };

        window.addEventListener(THEME_EVENT, handleThemeChange);
        return () => window.removeEventListener(THEME_EVENT, handleThemeChange);
    }, []);

    const closeMenu = () => setIsMobileMenuOpen(false);
    const isDarkMode = theme === 'dark';
    const isAuthenticated = Boolean(user?.token);

    const toggleTheme = () => setTheme(applyTheme(isDarkMode ? 'light' : 'dark'));

    const handleLogout = async () => {
        closeMenu();
        await logout();
        navigate('/');
    };

    const greetingName = user?.name || 'user';

    return (
        <nav className="navbar">
            <div className="nav-left">
                <Link to="/"><img src={logo2} style={{ width: '179px', height: 'auto' }} alt="VocabUp Logo" className="nav-logo" /></Link>
            </div>

            <div className="nav-mobile-controls">
                <button
                    className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Menu"
                    type="button"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>

            <div
                className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={closeMenu}
            ></div>

            <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
                <div className="mobile-menu-header">
                    <Link to="/" onClick={closeMenu}><img src={logo2} alt="VocabUp Logo" className="mobile-menu-logo" /></Link>
                    <button className="mobile-menu-close" onClick={closeMenu} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <nav className="mobile-menu-nav">
                    <Link to="/" className="mobile-nav-link" onClick={closeMenu}>Trang chủ</Link>
                    <a href="/#gioi-thieu" className="mobile-nav-link" onClick={closeMenu}>Giới thiệu</a>
                    <Link to="/dashboard/courses" className="mobile-nav-link" onClick={closeMenu}>Tài liệu</Link>
                    <a href="/#chatbot-ai" className="mobile-nav-link" onClick={closeMenu}>Chatbot AI</a>
                </nav>

                <div className="mobile-menu-actions">
                    <button
                        type="button"
                        className={`btn btn-secondary btn-mobile-menu theme-switch-btn theme-switch-btn-menu${isDarkMode ? ' is-dark' : ''}`}
                        onClick={toggleTheme}
                    >
                        {isDarkMode ? '☀ Chế độ sáng' : '☾ Chế độ tối'}
                    </button>

                    {isAuthenticated ? (
                        <div className="mobile-auth-row">
                            <div className="mobile-auth-greeting">
                                Xin chào, <strong>{greetingName}</strong>!
                            </div>
                            <button
                                type="button"
                                className={`theme-switch-btn theme-switch-btn-mobile nav-logout-btn${isDarkMode ? ' is-dark' : ''}`}
                                onClick={handleLogout}
                                aria-label="Đăng xuất"
                                title="Đăng xuất"
                            >
                                <LogoutIcon />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" onClick={closeMenu}><button className="btn btn-secondary btn-mobile-menu">Đăng nhập</button></Link>
                            <Link to="/register" onClick={closeMenu}><button className="btn btn-primary btn-mobile-menu">Đăng ký</button></Link>
                        </>
                    )}
                </div>
            </div>

            <div className="nav-links">
                <Link to="/" className="nav-link">Trang chủ</Link>
                <a href="/#gioi-thieu" className="nav-link">Giới thiệu</a>
                <Link to="/dashboard/courses" className="nav-link">Tài liệu</Link>
                <a href="/#chatbot-ai" className="nav-link">Chatbot AI</a>
            </div>

            <div className="nav-right">
                {isAuthenticated ? (
                    <>
                        <span className="nav-greeting">
                            Xin chào, <strong>{greetingName}</strong>!
                        </span>
                        <button
                            type="button"
                            className={`btn btn-nav btn-secondary theme-switch-btn theme-switch-btn-desktop${isDarkMode ? ' is-dark' : ''}`}
                            onClick={toggleTheme}
                            aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                            title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                        >
                            <span className="theme-switch-icon" aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
                        </button>
                        <button
                            type="button"
                            className={`btn btn-nav btn-secondary theme-switch-btn nav-logout-btn theme-switch-btn-desktop${isDarkMode ? ' is-dark' : ''}`}
                            onClick={handleLogout}
                            aria-label="Đăng xuất"
                            title="Đăng xuất"
                        >
                            <LogoutIcon />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className={`btn btn-nav btn-secondary theme-switch-btn theme-switch-btn-desktop${isDarkMode ? ' is-dark' : ''}`}
                            onClick={toggleTheme}
                            aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                            title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                        >
                            <span className="theme-switch-icon" aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
                        </button>
                        <Link to="/login"><button className="btn btn-nav btn-secondary" style={{ maxHeight: '38px', width: 'auto' }}>Đăng nhập</button></Link>
                        <Link to="/register"><button className="btn btn-nav btn-primary" style={{ maxHeight: '38px', width: 'auto' }}>Đăng ký</button></Link>
                    </>
                )}
            </div>
        </nav>
    );
}
