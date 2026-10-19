import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../assets/css/login-styles.css';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!name.trim() || !email.trim() || !password.trim()) {
            setErrorMessage('Vui lòng nhập đầy đủ thông tin.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        name: name.trim(),
                        full_name: name.trim(),
                    },
                },
            });

            if (error) {
                throw error;
            }

            setSuccessMessage('Đã tạo tài khoản. Vui lòng kiểm tra email để xác minh nếu cần.');
            setTimeout(() => navigate('/login'), 1000);
        } catch (error) {
            setErrorMessage(error.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-wrapper">
            <div className="auth-container">
                <div className="auth-sidebar">
                    <div className="auth-sidebar-content">
                        <h2 className="sidebar-title">Học ngoại ngữ<br />Miễn phí. Thông minh.</h2>
                        <p className="sidebar-subtitle">Lưu tiến trình, học với AI và kết nối cộng đồng.</p>

                        <ul className="modern-benefits-list">
                            <li><span className="b-icon">+</span> 100% Miễn phí trọn đời</li>
                            <li><span className="b-icon">+</span> Trợ lý AI hỗ trợ 24/7</li>
                            <li><span className="b-icon">+</span> Cá nhân hóa lộ trình học</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-main">
                    <div className="auth-form-header">
                        <h1 className="be-vietnam-pro-extrabold">Đăng ký ngay</h1>
                        <p>Chào mừng bạn! Vui lòng nhập thông tin để bắt đầu.</p>
                    </div>

                    <form className="modern-form" onSubmit={(e) => e.preventDefault()}>
                        <div className="form-floating">
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="name">Họ và tên</label>
                        </div>

                        <div className="form-floating">
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="email">Email</label>
                        </div>

                        <div className="form-row">
                            <div className="form-floating">
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                />
                                <label htmlFor="password">Mật khẩu</label>
                            </div>
                            <div className="form-floating">
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                />
                                <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                            </div>
                        </div>

                        {errorMessage && <div className="alert-box error">{errorMessage}</div>}
                        {successMessage && <div className="alert-box success">{successMessage}</div>}

                        <button
                            type="button"
                            className="btn-modern-primary btn-lg btn-block"
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner"></span> : 'Tạo tài khoản VocabUp'}
                        </button>
                    </form>

                    <div className="auth-form-footer">
                        <p>Đã có tài khoản? <Link to="/login" className="text-link-bold">Đăng nhập</Link></p>
                        <p className="legal-text">
                            Bằng việc đăng ký, bạn đồng ý với <a href="#" className="text-link">Điều khoản dịch vụ</a> và <a href="#" className="text-link">Chính sách bảo mật</a>.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
