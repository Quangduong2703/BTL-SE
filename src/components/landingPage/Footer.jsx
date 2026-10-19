import { Link } from 'react-router-dom';
import logo2 from '../../assets/images/logo-vocabup.svg';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-col col-brand">
                    <Link to="/">
                        <img src={logo2} style={{ width: '270px', height: 'auto' }} alt="VocabUp Logo" className="footer-logo" />
                    </Link>
                    <p className="footer-desc">
                        Nền tảng học Vocabulary tiếng Anh toàn diện với từ vựng phong phú, phát âm chuẩn, luyện nghe hiệu quả, flashcard sinh động và trợ lý AI thông minh.
                    </p>
                </div>

                <div className="footer-col col-links">
                    <h3 className="footer-heading">Danh mục</h3>
                    <ul className="footer-list">
                        <li><Link to="/" className="footer-link">Trang chủ</Link></li>
                        <li><a href="/#gioi-thieu" className="footer-link">Giới thiệu</a></li>
                        <li><Link to="/dashboard/courses" className="footer-link">Tài liệu</Link></li>
                        <li><Link to="/dashboard" className="footer-link">Chatbot AI</Link></li>
                    </ul>
                </div>

                <div className="footer-col col-links">
                    <h3 className="footer-heading">Dịch Vụ</h3>
                    <ul className="footer-list">
                        <li><Link to="/dashboard/courses" className="footer-link">Danh sách tài liệu</Link></li>
                        <li><Link to="/dashboard/games" className="footer-link">Học từ vựng</Link></li>
                        <li><Link to="/dashboard/toeic" className="footer-link">Ôn luyện TOEIC</Link></li>
                        <li><Link to="/dashboard" className="footer-link">Học Thử ngay</Link></li>
                    </ul>
                </div>

                <div className="footer-col col-map">
                    <h3 className="footer-heading">Địa Chỉ</h3>
                    <div className="map-wrapper">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3541.401605565887!2d105.7461114750295!3d20.962611180670255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313452efff394ce3%3A0x391a39d4325be464!2zVHLGsOG7nW5nIMSQ4bqhaSBI4buNYyBQaGVuaWthYQ!5e1!3m2!1svi!2s!4v1776373716545!5m2!1svi!2s"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Location Map"
                        ></iframe>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="footer-bottom-divider"></div>
                <p>© 2026 VocabUp. All rights reserved.</p>
            </div>
        </footer>
    );
}
