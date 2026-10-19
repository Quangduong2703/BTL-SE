import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnseenLevelUp, markLevelUpSeen } from '../utils/xpSystem';
import { getDueCount } from '../utils/srsStorage';
import { useAuth } from '../contexts/useAuth';
import { isAuthenticatedUser } from '../utils/userStorage';
import { isNotificationsEnabled, SETTINGS_CHANGE_EVENT } from '../utils/preferences';

const overlay = { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', animation: 'fadeIn .3s ease' };
const card = { background: 'linear-gradient(135deg,#1a1a2e,#16213e)', borderRadius: 20, padding: '40px 32px', textAlign: 'center', maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)', animation: 'scaleIn .4s cubic-bezier(.22,1,.36,1)' };
const badgeStyle = { fontSize: '4rem', display: 'block', marginBottom: 16, animation: 'bounce 1s ease infinite' };
const titleStyle = { fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' };
const subtitleStyle = { fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' };
const btnStyle = { padding: '12px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'transform .2s' };

const toastStyle = { position: 'fixed', bottom: 24, right: 24, zIndex: 9998, background: 'linear-gradient(135deg,#1e293b,#334155)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 20px', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'slideUp .4s ease', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' };

const keyframesId = 'vocabup-notif-keyframes';
function injectKeyframes() {
  if (document.getElementById(keyframesId)) return;
  const style = document.createElement('style');
  style.id = keyframesId;
  style.textContent = `
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-100px) rotate(720deg);opacity:0}}
  `;
  document.head.appendChild(style);
}

function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#22c55e', '#8b5cf6', '#f97316'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            animation: `confetti 1.5s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function LevelUpModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...card, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <Confetti />
        <span style={badgeStyle}>{data.badge}</span>
        <h2 style={titleStyle}>Level Up!</h2>
        <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Level {data.to}</p>
        <p style={subtitleStyle}>Bạn đã mở khóa badge mới!</p>
        <button style={btnStyle} onClick={onClose} onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.target.style.transform = 'none'; }}>
          Tuyệt vời!
        </button>
      </div>
    </div>
  );
}

function SrsToast({ count, onClose, onReview }) {
  if (!count) return null;
  return (
    <div style={{ ...toastStyle, background: 'linear-gradient(135deg,#0f2027,#1a3a2a)', borderColor: 'rgba(34,197,94,0.35)', minWidth: 280 }}>
      <span style={{ fontSize: 20 }}>📋</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700 }}>Bạn có <strong style={{ color: '#4ade80' }}>{count}</strong> từ cần ôn tập!</span>
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400 }}>Nhấn để bắt đầu ôn tập ngay</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onReview(); }}
        style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        Ôn ngay →
      </button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, color: '#fff', fontSize: 16, padding: '0 2px' }}>✕</button>
    </div>
  );
}

export function XpToast({ amount, reason, onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone?.(), 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!amount) return null;
  return (
    <div style={{ ...toastStyle, background: 'linear-gradient(135deg,#065f46,#064e3b)', borderColor: 'rgba(34,197,94,0.3)' }}>
      <span>⚡</span>
      <span>+{amount} XP{reason ? ` · ${reason}` : ''}</span>
    </div>
  );
}

export default function NotificationManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuestUser = !isAuthenticatedUser(user);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => isNotificationsEnabled());
  const [levelUp, setLevelUp] = useState(null);
  const [srsCount, setSrsCount] = useState(0);

  useEffect(() => {
    injectKeyframes();

    if (!isGuestUser) {
      const lu = getUnseenLevelUp();
      if (lu) setLevelUp(lu);
    }

    const timer = setTimeout(() => {
      const due = getDueCount();
      if (due > 0) setSrsCount(due);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isGuestUser]);

  useEffect(() => {
    const handleSettingsChange = () => {
      setNotificationsEnabled(isNotificationsEnabled());
    };

    window.addEventListener(SETTINGS_CHANGE_EVENT, handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);

    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, [isGuestUser]);

  useEffect(() => {
    if (notificationsEnabled) return;
    setLevelUp(null);
    setSrsCount(0);
  }, [notificationsEnabled]);

  const closeLevelUp = () => {
    markLevelUpSeen();
    setLevelUp(null);
  };
  const closeSrs = () => setSrsCount(0);
  const goReview = () => {
    setSrsCount(0);
    navigate('/dashboard/games#games-srs-label');
  };

  return (
    <>
      {!notificationsEnabled ? null : (
        <>
          {levelUp && <LevelUpModal data={levelUp} onClose={closeLevelUp} />}
          {srsCount > 0 && !levelUp && (
            <SrsToast count={srsCount} onClose={closeSrs} onReview={goReview} />
          )}
        </>
      )}
    </>
  );
}
