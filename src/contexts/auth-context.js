import { createContext } from 'react';

export const guestUser = {
    id: null,
    profileId: null,
    authUserId: null,
    name: 'Guest User',
    email: null,
    role: 'guest',
    status: 'active',
    token: null,
};

export const AuthContext = createContext();

function toSafeString(value, fallback = '') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return fallback;
}

export function normalizeUser(user) {
    if (!user || typeof user !== 'object') {
        return guestUser;
    }

    return {
        id: user.id ?? null,
        profileId: user.profileId ?? null,
        authUserId: user.authUserId ?? null,
        name: toSafeString(user.name, guestUser.name) || guestUser.name,
        email: toSafeString(user.email, '') || null,
        role: toSafeString(user.role, 'user') || 'user',
        status: toSafeString(user.status, 'active') || 'active',
        samplePersonalTopicSeededAt: user.samplePersonalTopicSeededAt || null,
        token: toSafeString(user.token, '') || null,
    };
}

export function getInitialUser() {
    try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? normalizeUser(JSON.parse(storedUser)) : guestUser;
    } catch {
        return guestUser;
    }
}
