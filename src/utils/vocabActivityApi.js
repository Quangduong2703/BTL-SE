import axiosClient from './axiosClient';
import { getStoredUser } from './userStorage';

const ALLOWED_VOCAB_ACTIVITY_MODES = new Set([
  'flashcard',
  'quiz',
  'listen',
  'typing',
  'match',
  'flappy-bird',
]);

export async function recordVocabularyActivity(mode) {
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (!ALLOWED_VOCAB_ACTIVITY_MODES.has(normalizedMode)) return null;

  const user = getStoredUser();
  if (!user || (!user.token && !user.id)) {
    return null;
  }

  try {
    return await axiosClient.post('/progress/vocab-activity', {
      mode: normalizedMode,
    });
  } catch (error) {
    console.error('Failed to record vocabulary activity:', error);
    return null;
  }
}
