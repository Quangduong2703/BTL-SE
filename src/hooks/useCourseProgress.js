import { useState, useEffect, useCallback, useRef } from "react";
import axiosClient from "../utils/axiosClient";
import { useAuth } from "../contexts/useAuth";
import { syncRememberedWordProgress } from "../utils/dashboardProgress";
import {
  getUserScopedJson,
  getUserScopedStorageKey,
  setUserScopedJson,
} from "../utils/userStorage";

const STORAGE_KEY = "vocabup_remembered";

function getLocalRemembered(user) {
  return getUserScopedJson(STORAGE_KEY, {}, user) || {};
}

function saveLocalRemembered(map, user) {
  setUserScopedJson(STORAGE_KEY, map, user);
}

function isLoggedIn(user) {
  return Boolean(user?.token || user?.id);
}

export function useCourseProgress() {
  const { user } = useAuth();
  const storageKey = getUserScopedStorageKey(STORAGE_KEY, user);
  const [remembered, setRemembered] = useState(() => getLocalRemembered(user));
  const isMountedRef = useRef(true);
  const pendingRef = useRef({});
  const syncTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    pendingRef.current = {};
    setRemembered(getLocalRemembered(user));

    if (!isLoggedIn(user)) {
      return () => {
        isMountedRef.current = false;
      };
    }

    axiosClient
      .get("/word-progress")
      .then((res) => {
        const serverMap = res || {};
        if (!isMountedRef.current) return;
        saveLocalRemembered(serverMap, user);
        setRemembered(serverMap);
      })
      .catch((e) => {
        console.warn("[WordProgress] Failed to load from server:", e?.message);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [storageKey, user]);

  useEffect(() => () => clearTimeout(syncTimerRef.current), []);

  const scheduleBatchSync = useCallback(() => {
    if (!isLoggedIn(user)) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const pending = pendingRef.current;
      pendingRef.current = {};
      const updates = Object.entries(pending).map(
        ([flashcard_id, is_remembered]) => ({
          flashcard_id: parseInt(flashcard_id, 10),
          is_remembered,
        }),
      );
      if (updates.length === 0) return;
      try {
        await axiosClient.post("/word-progress/batch", { updates });
      } catch (e) {
        console.warn("[WordProgress] Batch sync failed:", e?.message);
      }
    }, 800);
  }, [user]);

  const saveRemembered = useCallback(
    (newMap) => {
      const previousMap = remembered;
      setRemembered(newMap);
      saveLocalRemembered(newMap, user);
      syncRememberedWordProgress(previousMap, newMap);
    },
    [remembered, user],
  );

  const toggleWord = useCallback(
    (wordId) => {
      const newMap = { ...remembered };
      if (newMap[wordId]) {
        delete newMap[wordId];
      } else {
        newMap[wordId] = true;
      }
      saveRemembered(newMap);

      const numId = parseInt(wordId, 10);
      if (!isNaN(numId)) {
        pendingRef.current[numId] = Boolean(newMap[wordId]);
        scheduleBatchSync();
      }
    },
    [remembered, saveRemembered, scheduleBatchSync],
  );

  const markWordRemembered = useCallback(
    (wordId, isRemembered = true) => {
      const newMap = { ...remembered };
      if (isRemembered) {
        newMap[wordId] = true;
      } else {
        delete newMap[wordId];
      }
      saveRemembered(newMap);

      const numId = parseInt(wordId, 10);
      if (!isNaN(numId)) {
        pendingRef.current[numId] = isRemembered;
        scheduleBatchSync();
      }
    },
    [remembered, saveRemembered, scheduleBatchSync],
  );

  const replaceRememberedInTopic = useCallback(
    (topicWordIds, selectedWordIds) => {
      const newMap = { ...remembered };
      const selectedSet = new Set(selectedWordIds);

      topicWordIds.forEach((wordId) => {
        if (selectedSet.has(wordId)) {
          newMap[wordId] = true;
        } else {
          delete newMap[wordId];
        }
      });

      saveRemembered(newMap);

      topicWordIds.forEach((wordId) => {
        const numId = parseInt(wordId, 10);
        if (!isNaN(numId)) {
          pendingRef.current[numId] = selectedSet.has(wordId);
        }
      });
      scheduleBatchSync();
    },
    [remembered, saveRemembered, scheduleBatchSync],
  );

  return {
    remembered,
    toggleWord,
    markWordRemembered,
    replaceRememberedInTopic,
  };
}
