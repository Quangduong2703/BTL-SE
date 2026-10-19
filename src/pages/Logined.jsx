import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import LandingPage from './landingPage/LandingPage';

export default function Logined() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    void user;
    void handleLogout;

    return (
        <main className="logined-home-page">
            <LandingPage />
        </main>
    );
}
