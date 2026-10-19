import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import FloatChat from './components/FloatChat';
import { useAuth } from './contexts/useAuth';
import { initializeTheme } from './utils/theme';

const RequireAdmin = lazy(() => import('./components/manager/RequireAdmin'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const ManagerLayout = lazy(() => import('./layouts/ManagerLayout'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Games = lazy(() => import('./pages/dashboard/Games'));
const CourseTopics = lazy(() => import('./pages/dashboard/CourseTopics'));
const Courses = lazy(() => import('./pages/dashboard/Courses'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Stats = lazy(() => import('./pages/dashboard/Stats'));
const TopicWords = lazy(() => import('./pages/dashboard/TopicWords'));
const TOEIC = lazy(() => import('./pages/dashboard/TOEIC'));
const LandingPage = lazy(() => import('./pages/landingPage/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Logined = lazy(() => import('./pages/Logined'));
const ManagerCourses = lazy(() => import('./pages/manager/Courses'));
const ManagerOverview = lazy(() => import('./pages/manager/Overview'));
const ManagerSupport = lazy(() => import('./pages/manager/Support'));
const ManagerToeic = lazy(() => import('./pages/manager/Toeic'));
const ManagerToeicBuilder = lazy(() => import('./pages/manager/ToeicBuilder'));
const ManagerTopics = lazy(() => import('./pages/manager/Topics'));
const ManagerUsers = lazy(() => import('./pages/manager/Users'));
const Register = lazy(() => import('./pages/Register'));

function AppShellFallback() {
  return <div className="app-shell-loading">Loading...</div>;
}

function HomeRoute() {
  const { user } = useAuth();

  if (user?.token) {
    return <Navigate to="/logined" replace />;
  }

  return <LandingPage />;
}

function LoginedRoute() {
  const { user } = useAuth();

  if (!user?.token) {
    return <Navigate to="/" replace />;
  }

  return <Logined />;
}

function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <>
      <Suspense fallback={<AppShellFallback />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/logined" element={<LoginedRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="courses">
              <Route index element={<Courses />} />
              <Route path=":courseId" element={<CourseTopics />} />
              <Route path=":courseId/topic/:topicId" element={<TopicWords />} />
              <Route path="custom/topic/:topicId" element={<TopicWords />} />
            </Route>
            <Route path="games" element={<Games />} />
            <Route path="toeic" element={<TOEIC />} />
            <Route path="stats" element={<Stats />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerOverview />} />
              <Route path="users" element={<ManagerUsers />} />
              <Route path="support" element={<ManagerSupport />} />
              <Route path="courses" element={<ManagerCourses />} />
              <Route path="courses/:courseId/topics" element={<ManagerTopics />} />
              <Route path="toeic" element={<ManagerToeic />} />
              <Route path="toeic/:testId" element={<ManagerToeicBuilder />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <FloatChat />
    </>
  );
}

export default App;
