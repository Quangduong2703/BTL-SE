import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/useAuth";
import axiosClient from "../utils/axiosClient";

const CUSTOM_COURSES_CACHE_TTL_MS = 60 * 1000;

const customCoursesStore = {
  cacheByUserKey: new Map(),
  inflightByUserKey: new Map(),
  listenersByUserKey: new Map(),
  topicDetailInflightByUserKey: new Map(),
};

const normalizeLanguage = (value, fallback = "en") => {
  const language = String(value || "").trim().toLowerCase();
  return language || fallback;
};

const normalizeErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.error === "string") return error.error;

  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
};

const isAuthenticatedUser = (user) =>
  Boolean(user?.id || user?.profileId || user?.authUserId || user?.token);

const getCustomCoursesUserKey = (user) =>
  String(user?.profileId || user?.id || user?.authUserId || user?.uid || user?.token || "").trim();

const getCustomCoursesCacheEntry = (userKey) => customCoursesStore.cacheByUserKey.get(userKey) || null;

const getCachedCustomCourses = (userKey) => getCustomCoursesCacheEntry(userKey)?.topics || [];

const isCustomCoursesCacheFresh = (userKey) => {
  const entry = getCustomCoursesCacheEntry(userKey);
  if (!entry?.loadedAt) return false;
  return Date.now() - entry.loadedAt < CUSTOM_COURSES_CACHE_TTL_MS;
};

const notifyCustomCoursesListeners = (userKey) => {
  const entry = getCustomCoursesCacheEntry(userKey);
  const listeners = customCoursesStore.listenersByUserKey.get(userKey);
  if (!listeners?.size) return;

  const topics = entry?.topics || [];
  listeners.forEach((listener) => {
    try {
      listener(topics);
    } catch {
      // Ignore listener errors so one broken subscriber does not block the others.
    }
  });
};

const setCachedCustomCourses = (userKey, topics) => {
  const previous = getCustomCoursesCacheEntry(userKey);
  customCoursesStore.cacheByUserKey.set(userKey, {
    topics,
    loadedAt: Date.now(),
    revision: (previous?.revision || 0) + 1,
  });
  notifyCustomCoursesListeners(userKey);
  return topics;
};

const mergeCachedCustomTopic = (userKey, detailedTopic) => {
  if (!detailedTopic?.id) return null;

  const topicId = String(detailedTopic.id);
  const current = getCachedCustomCourses(userKey);
  const nextTopics = current.some((item) => item.id === topicId)
    ? current.map((item) => (item.id === topicId ? { ...item, ...detailedTopic } : item))
    : [detailedTopic, ...current];

  setCachedCustomCourses(userKey, nextTopics);
  return detailedTopic;
};

const patchCachedCustomCourses = (userKey, updater) => {
  const current = getCachedCustomCourses(userKey);
  const nextTopics = typeof updater === "function" ? updater(current) : updater;
  return setCachedCustomCourses(userKey, Array.isArray(nextTopics) ? nextTopics : current);
};

const subscribeCustomCourses = (userKey, listener) => {
  if (!userKey) return () => {};

  const listeners = customCoursesStore.listenersByUserKey.get(userKey) || new Set();
  listeners.add(listener);
  customCoursesStore.listenersByUserKey.set(userKey, listeners);

  return () => {
    const currentListeners = customCoursesStore.listenersByUserKey.get(userKey);
    if (!currentListeners) return;
    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      customCoursesStore.listenersByUserKey.delete(userKey);
    }
  };
};

const mapApiWord = (word, topicLanguage = "en") => {
  const language = normalizeLanguage(word?.language || word?.lang, topicLanguage);
  return {
    id: String(word.id),
    _serverId: word.id,
    word: word.word,
    mean: word.mean || word.meaning,
    transcription: word.transcription || "",
    wordtype: word.wordtype || word.word_type || "",
    example: word.example || "",
    example_vi: word.example_vi || "",
    language,
  };
};

const mapApiTopic = (apiTopic) => {
  const language = normalizeLanguage(apiTopic?.language || apiTopic?.lang, "en");
  return {
    id: String(apiTopic.id),
    _serverId: apiTopic.id,
    title: apiTopic.title,
    description: apiTopic.description || "",
    lang: language,
    language,
    sharedFromTopicId: apiTopic.shared_from_topic_id || apiTopic.sharedFromTopicId || null,
    words: (apiTopic.words || []).map((word) => mapApiWord(word, language)),
    word_count: apiTopic.word_count || apiTopic.words?.length || 0,
    created_at: apiTopic.created_at || apiTopic.createdAt || null,
    updated_at: apiTopic.updated_at || apiTopic.updatedAt || null,
  };
};

const normalizeTopicId = (topicId) => String(topicId || "").trim();

export function useCustomCourses() {
  const { user } = useAuth();
  const userKey = getCustomCoursesUserKey(user);
  const [customCourses, setCustomCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const isMountedRef = useRef(true);

  const loadFromServer = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticatedUser(user) || !userKey) {
      if (isMountedRef.current) {
        setCustomCourses([]);
        setLoading(false);
        setReady(true);
      }
      return [];
    }

    if (!force && isCustomCoursesCacheFresh(userKey)) {
      const cachedTopics = getCachedCustomCourses(userKey);
      if (isMountedRef.current) {
        setCustomCourses(cachedTopics);
        setLoading(false);
        setReady(true);
      }
      return cachedTopics;
    }

    const inflight = customCoursesStore.inflightByUserKey.get(userKey);
    if (inflight) {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const sharedResult = await inflight;
      if (isMountedRef.current) {
        setCustomCourses(getCachedCustomCourses(userKey));
        setLoading(false);
        setReady(true);
      }
      return sharedResult;
    }

    setLoading(true);
    const startRevision = getCustomCoursesCacheEntry(userKey)?.revision || 0;
    const request = (async () => {
      const res = await axiosClient.get("/courses/custom/topics");
      const topics = (Array.isArray(res) ? res : []).map(mapApiTopic);
      const currentRevision = getCustomCoursesCacheEntry(userKey)?.revision || 0;
      if (currentRevision === startRevision) {
        setCachedCustomCourses(userKey, topics);
      }
      return getCachedCustomCourses(userKey);
    })();

    customCoursesStore.inflightByUserKey.set(userKey, request);

    try {
      const topics = await request;
      if (isMountedRef.current) {
        setCustomCourses(topics);
      }
      return topics;
    } catch (e) {
      console.warn("[CustomCourses] API load failed:", e?.message);
      if (isMountedRef.current) {
        setCustomCourses(getCachedCustomCourses(userKey));
      }
      return getCachedCustomCourses(userKey);
    } finally {
      if (customCoursesStore.inflightByUserKey.get(userKey) === request) {
        customCoursesStore.inflightByUserKey.delete(userKey);
      }
      if (isMountedRef.current) {
        setLoading(false);
        setReady(true);
      }
    }
  }, [user, userKey]);

  useEffect(() => {
    isMountedRef.current = true;
    const cachedTopics = getCachedCustomCourses(userKey);
    if (cachedTopics.length) {
      setCustomCourses(cachedTopics);
      setReady(true);
    } else if (!isAuthenticatedUser(user)) {
      setCustomCourses([]);
      setReady(true);
    }

    const unsubscribe = subscribeCustomCourses(userKey, (topics) => {
      if (isMountedRef.current) {
        setCustomCourses(topics);
      }
    });

    loadFromServer();
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [loadFromServer, user, userKey]);

  const createTopic = useCallback(
    async ({ title, description, lang, sharedTopicId }) => {
      if (!title?.trim()) {
        return { error: "Tên chủ đề không được để trống." };
      }
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để tạo chủ đề." };
      }

      try {
        const createdTopic = await axiosClient.post("/courses/custom/topics", {
          title: title.trim(),
          description,
          lang: normalizeLanguage(lang, "en"),
          sharedTopicId: sharedTopicId ? String(sharedTopicId).trim() : null,
        });
        const mappedTopic = mapApiTopic(createdTopic?.data || createdTopic);
        patchCachedCustomCourses(userKey, (current) => [
          mappedTopic,
          ...current.filter((topic) => topic.id !== mappedTopic.id),
        ]);
        return mappedTopic;
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Tạo chủ đề thất bại.") };
      }
    },
    [user, userKey],
  );

  const updateTopic = useCallback(
    async (topicId, { title, description, lang }) => {
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để cập nhật chủ đề." };
      }

      try {
        const topic = customCourses.find((course) => course.id === String(topicId));
        const serverId = topic?._serverId || topicId;
        const nextLanguage = normalizeLanguage(lang || topic?.lang, "en");
        await axiosClient.put(`/courses/custom/topics/${serverId}`, {
          title: title.trim(),
          description,
          lang: nextLanguage,
        });
        patchCachedCustomCourses(userKey, (current) =>
          current.map((item) => (
            item.id === String(topicId)
              ? {
                  ...item,
                  title: title.trim(),
                  description,
                  lang: nextLanguage,
                  language: nextLanguage,
                }
              : item
          )),
        );
        return {};
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Cập nhật thất bại.") };
      }
    },
    [customCourses, user, userKey],
  );

  const deleteTopic = useCallback(
    async (topicId) => {
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để xóa chủ đề." };
      }

      try {
        const topic = customCourses.find((course) => course.id === String(topicId));
        const serverId = topic?._serverId || topicId;
        await axiosClient.delete(`/courses/custom/topics/${serverId}`);
        patchCachedCustomCourses(userKey, (current) =>
          current.filter((item) => item.id !== String(topicId)),
        );
        return {};
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Xóa chủ đề thất bại.") };
      }
    },
    [customCourses, user, userKey],
  );

  const addWordToTopic = useCallback(
    async (topicId, wordData) => {
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để thêm từ." };
      }

      const topic = customCourses.find((course) => course.id === String(topicId));
      if (!topic) {
        return { error: "Không tìm thấy chủ đề." };
      }

      const topicLanguage = normalizeLanguage(topic.lang || topic.language, "en");
      const wordLanguage = normalizeLanguage(wordData?.language || wordData?.lang, topicLanguage);
      if (wordLanguage !== topicLanguage) {
        return { error: "Từ vựng không khớp ngôn ngữ của chủ đề." };
      }

      try {
        const serverId = topic._serverId || topicId;
        const createdWord = await axiosClient.post(`/courses/custom/topics/${serverId}/words`, {
          ...wordData,
          language: topicLanguage,
        });
        const normalizedWord = mapApiWord(createdWord?.data || createdWord, topicLanguage);
        patchCachedCustomCourses(userKey, (current) =>
          current.map((item) => {
            if (item.id !== String(topicId)) return item;
            const nextWords = Array.isArray(item.words) ? item.words : [];
            return {
              ...item,
              words: [...nextWords, normalizedWord],
              word_count: nextWords.length + 1,
            };
          }),
        );
        return {};
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Thêm từ thất bại.") };
      }
    },
    [customCourses, user, userKey],
  );

  const updateWordInTopic = useCallback(
    async (topicId, wordId, updates) => {
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để cập nhật từ." };
      }

      try {
        const topic = customCourses.find((course) => course.id === String(topicId));
        const serverTopicId = topic?._serverId || topicId;
        const word = topic?.words?.find((item) => item.id === String(wordId));
        const serverWordId = word?._serverId || wordId;
        await axiosClient.put(
          `/courses/custom/topics/${serverTopicId}/words/${serverWordId}`,
          updates,
        );
        patchCachedCustomCourses(userKey, (current) =>
          current.map((item) => {
            if (item.id !== String(topicId)) return item;
            const nextWords = (item.words || []).map((existingWord) => (
              existingWord.id === String(wordId)
                ? {
                    ...existingWord,
                    word: updates.word?.trim?.() || updates.word || existingWord.word,
                    mean: updates.mean?.trim?.() || updates.mean || updates.meaning || existingWord.mean,
                    transcription: updates.transcription?.trim?.() || updates.transcription || existingWord.transcription,
                    wordtype: updates.wordtype?.trim?.() || updates.wordtype || updates.word_type || existingWord.wordtype,
                    example: updates.example?.trim?.() || updates.example || existingWord.example,
                    example_vi: updates.example_vi?.trim?.() || updates.example_vi || existingWord.example_vi,
                    language: normalizeLanguage(
                      updates.language || updates.lang || existingWord.language || topic?.lang,
                      topic?.lang || "en",
                    ),
                  }
                : existingWord
            ));
            return {
              ...item,
              words: nextWords,
            };
          }),
        );
        return {};
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Cập nhật từ thất bại.") };
      }
    },
    [customCourses, user, userKey],
  );

  const deleteWordFromTopic = useCallback(
    async (topicId, wordId) => {
      if (!isAuthenticatedUser(user)) {
        return { error: "Bạn cần đăng nhập để xóa từ." };
      }

      try {
        const topic = customCourses.find((course) => course.id === String(topicId));
        const serverTopicId = topic?._serverId || topicId;
        const word = topic?.words?.find((item) => item.id === String(wordId));
        const serverWordId = word?._serverId || wordId;
        await axiosClient.delete(
          `/courses/custom/topics/${serverTopicId}/words/${serverWordId}`,
        );
        patchCachedCustomCourses(userKey, (current) =>
          current.map((item) => {
            if (item.id !== String(topicId)) return item;
            const nextWords = (item.words || []).filter((existingWord) => existingWord.id !== String(wordId));
            return {
              ...item,
              words: nextWords,
              word_count: nextWords.length,
            };
          }),
        );
        return {};
      } catch (e) {
        return { error: normalizeErrorMessage(e?.response?.data?.error, "Xóa từ thất bại.") };
      }
    },
    [customCourses, user, userKey],
  );

  const preloadTopicDetail = useCallback(
    async (topicId) => {
      if (!isAuthenticatedUser(user) || !userKey) return null;

      const normalizedTopicId = normalizeTopicId(topicId);
      if (!normalizedTopicId) return null;

      const cachedTopic = getCachedCustomCourses(userKey).find((topic) => topic.id === normalizedTopicId);
      if (cachedTopic?.words?.length) {
        return cachedTopic;
      }

      const inflightKey = `${userKey}:${normalizedTopicId}`;
      const inflightMap = customCoursesStore.topicDetailInflightByUserKey;
      const existingInflight = inflightMap.get(inflightKey);
      if (existingInflight) return existingInflight;

      const request = (async () => {
        const res = await axiosClient.get(`/courses/custom/topics/${normalizedTopicId}`);
        const mappedTopic = mapApiTopic(res?.data || res);
        return mergeCachedCustomTopic(userKey, mappedTopic);
      })();

      inflightMap.set(inflightKey, request);

      try {
        return await request;
      } catch (error) {
        console.warn("[CustomCourses] Topic preload failed:", error?.message);
        return null;
      } finally {
        if (inflightMap.get(inflightKey) === request) {
          inflightMap.delete(inflightKey);
        }
      }
    },
    [user, userKey],
  );

  const isTopicPreloading = useCallback(
    (topicId) => {
      if (!isAuthenticatedUser(user) || !userKey) return false;
      const normalizedTopicId = normalizeTopicId(topicId);
      if (!normalizedTopicId) return false;
      return customCoursesStore.topicDetailInflightByUserKey.has(`${userKey}:${normalizedTopicId}`);
    },
    [user, userKey],
  );

  const addManyWordsToTopic = useCallback(
    async (topicId, wordArray) => {
      let added = 0;
      let skipped = 0;
      for (const word of wordArray) {
        const result = await addWordToTopic(topicId, word);
        if (result?.error) skipped += 1;
        else added += 1;
      }
      return { added, skipped };
    },
    [addWordToTopic],
  );

  return {
    customCourses,
    loading: loading || (isAuthenticatedUser(user) && !getCustomCoursesCacheEntry(userKey) && customCourses.length === 0),
    ready,
    createTopic,
    updateTopic,
    deleteTopic,
    addWordToTopic,
    updateWordInTopic,
    deleteWordFromTopic,
    preloadTopicDetail,
    isTopicPreloading,
    addManyWordsToTopic,
    refresh: () => loadFromServer({ force: true }),
  };
}
