import { Outlet } from 'react-router-dom';
import Navbar from '../components/landingPage/Navbar';
import Footer from '../components/landingPage/Footer';
import '../assets/css/styles.css';

export default function MainLayout() {
    return (
        <>
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </>
    );
}
