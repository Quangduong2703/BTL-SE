export const SPEECH_LANG_MAP = {
    en: 'en-US',
    ko: 'ko-KR',
    ja: 'ja-JP',
    zh: 'zh-CN',
    fr: 'fr-FR',
};

export function getSpeechLang(language, fallback = 'en') {
    return SPEECH_LANG_MAP[language || fallback] || 'en-US';
}

export function getInitialRememberedSelection(words = [], initialRememberedWordIds = []) {
    const validWordIds = new Set(words.map((word) => word.id));
    return Array.from(new Set(initialRememberedWordIds)).filter((wordId) => validWordIds.has(wordId));
}

export function shuffleArray(items = []) {
    const cloned = [...items];

    for (let index = cloned.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
    }

    return cloned;
}

export function buildFlashcardDeck(words = []) {
    return shuffleArray(words);
}

export function buildSessionQueue(items = [], idKey = 'id') {
    return items
        .map((item) => item?.[idKey])
        .filter(Boolean);
}

export function buildWordsMap(words = []) {
    return words.reduce((map, word) => {
        if (word?.id) {
            map[word.id] = word;
        }
        return map;
    }, {});
}

export function createSessionStats(words = [], initialLearnedWordIds = []) {
    const initiallyLearned = new Set(initialLearnedWordIds);

    return words.reduce((stats, word) => {
        if (!word?.id) return stats;

        stats[word.id] = {
            seenCount: 0,
            correctCount: 0,
            wrongCount: 0,
            masteredInSession: initiallyLearned.has(word.id),
        };

        return stats;
    }, {});
}

export function resolveSessionQueueResult(queue = [], wordId, isMastered, sessionStatsByWordId = {}) {
    if (!wordId) {
        return {
            queue,
            statsByWordId: sessionStatsByWordId,
            isCompleted: queue.length === 0,
        };
    }

    const nextQueue = [...queue];
    if (nextQueue[0] === wordId) {
        nextQueue.shift();
    } else {
        const queueIndex = nextQueue.indexOf(wordId);
        if (queueIndex >= 0) {
            nextQueue.splice(queueIndex, 1);
        }
    }

    const previousStats = sessionStatsByWordId[wordId] || {
        seenCount: 0,
        correctCount: 0,
        wrongCount: 0,
        masteredInSession: false,
    };

    const updatedStats = {
        ...previousStats,
        seenCount: previousStats.seenCount + 1,
        correctCount: previousStats.correctCount + (isMastered ? 1 : 0),
        wrongCount: previousStats.wrongCount + (isMastered ? 0 : 1),
        masteredInSession: isMastered ? true : previousStats.masteredInSession,
    };

    if (!isMastered) {
        const offset = previousStats.wrongCount >= 1
            ? 1 + Math.floor(Math.random() * 2)
            : 2 + Math.floor(Math.random() * 3);
        const insertIndex = Math.min(nextQueue.length, offset);
        nextQueue.splice(insertIndex, 0, wordId);
    }

    return {
        queue: nextQueue,
        statsByWordId: {
            ...sessionStatsByWordId,
            [wordId]: updatedStats,
        },
        isCompleted: nextQueue.length === 0,
    };
}

function getChoiceText(word) {
    return word.mean?.trim() || word.word?.trim() || 'Ch?a c? ngh?a';
}

function getUniqueDistractors(currentWord, words, count = 3) {
    const seenTexts = new Set([getChoiceText(currentWord)]);
    const distractors = [];

    shuffleArray(words).forEach((word) => {
        if (word.id === currentWord.id || distractors.length >= count) return;

        const choiceText = getChoiceText(word);
        if (seenTexts.has(choiceText)) return;

        seenTexts.add(choiceText);
        distractors.push(word);
    });

    return distractors;
}

export function buildQuizQuestions(words = [], allWords = words) {
    return shuffleArray(words).map((word) => {
        const distractors = getUniqueDistractors(word, allWords, 3);
        const choices = shuffleArray([
            {
                id: `${word.id}-correct`,
                text: getChoiceText(word),
                isCorrect: true,
            },
            ...distractors.map((item) => ({
                id: `${word.id}-distractor-${item.id}`,
                text: getChoiceText(item),
                isCorrect: false,
            })),
        ]);

        return {
            wordId: word.id,
            word,
            choices,
            correctText: getChoiceText(word),
        };
    });
}

export function buildTypingQuestions(words = []) {
    return shuffleArray(words).map((word) => ({
        wordId: word.id,
        word,
    }));
}

export function normalizeTypingAnswer(value = '') {
    return String(value)
        .trim()
        .toLocaleLowerCase()
        .replace(/\s+/g, ' ');
}

function escapeRegExp(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskWordInExample(example = '', answer = '') {
    if (!example) return '';
    if (!answer) return example;

    const escaped = escapeRegExp(answer.trim());
    if (!escaped) return example;

    const wholeWordPattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    const maskedWholeWord = example.replace(wholeWordPattern, '_');
    if (maskedWholeWord !== example) return maskedWholeWord;

    const loosePattern = new RegExp(escaped, 'gi');
    return example.replace(loosePattern, '_');
}

function getRevealableIndices(answer = '') {
    return Array.from(answer).reduce((indices, char, index) => {
        if (/[^\s]/.test(char)) indices.push(index);
        return indices;
    }, []);
}

export function buildHintMask(answer = '', revealedIndices = []) {
    const revealedSet = new Set(revealedIndices);

    return Array.from(answer)
        .map((char, index) => {
            if (/\s/.test(char)) return ' ';
            return revealedSet.has(index) ? char : '_';
        })
        .join(' ')
        .replace(/\s{3,}/g, '   ')
        .trim();
}

export function getNextHintState(answer = '', revealedIndices = [], hintLevel = 0, maxHintLevel = 4) {
    const revealableIndices = getRevealableIndices(answer);
    const availableIndices = revealableIndices.filter((index) => !revealedIndices.includes(index));

    if (hintLevel <= 0) {
        return {
            hintLevel: 1,
            revealedIndices,
            mask: buildHintMask(answer, revealedIndices),
            canAdvance: true,
        };
    }

    if (!availableIndices.length || hintLevel >= maxHintLevel) {
        return {
            hintLevel,
            revealedIndices,
            mask: buildHintMask(answer, revealedIndices),
            canAdvance: false,
        };
    }

    const nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const nextRevealedIndices = [...revealedIndices, nextIndex].sort((a, b) => a - b);

    return {
        hintLevel: hintLevel + 1,
        revealedIndices: nextRevealedIndices,
        mask: buildHintMask(answer, nextRevealedIndices),
        canAdvance: true,
    };
}

export function buildMatchBoard(words = [], limit = 20) {
    const validPairs = shuffleArray(
        words.filter((word) => word?.id && word?.word && word?.mean),
    )
        .slice(0, limit)
        .map((word) => ({
            wordId: word.id,
            word,
            wordText: word.word,
            meanText: word.mean,
        }));

    return {
        pairs: validPairs,
        leftItems: validPairs.map((pair) => ({
            wordId: pair.wordId,
            label: pair.wordText,
        })),
        rightItems: shuffleArray(validPairs.map((pair) => ({
            wordId: pair.wordId,
            label: pair.meanText,
        }))),
    };
}
