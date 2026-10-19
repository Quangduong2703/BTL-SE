import { useEffect, useMemo, useRef, useState } from 'react';
import { useOverlayBehavior } from '../../hooks/useOverlayBehavior';

const CHECK_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" />
    </svg>
);

const ADD_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
    </svg>
);

function extractEmoji(title) {
    const match = title?.trim().match(/^\p{Emoji}/u);
    return match ? match[0] : '📝';
}

function normalizeWord(value = '') {
    return String(value).trim().toLocaleLowerCase();
}

function getTopicWords(topic) {
    return Array.isArray(topic?.words) ? topic.words : [];
}

export default function TopicPickerModal({ isOpen, onClose, word, customCourses, onAdd, onCreateTopic }) {
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState(null);
    const inputRef = useRef(null);

    useOverlayBehavior(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedTopicId(null);
        setIsCreatingNew(!customCourses?.length);
        setNewTopicName('');
        setSearchQuery('');
        setMessage(null);
    }, [isOpen, word?.id, customCourses?.length]);

    useEffect(() => {
        if (isCreatingNew) {
            inputRef.current?.focus();
        }
    }, [isCreatingNew]);

    const allTopics = Array.isArray(customCourses) ? customCourses : [];

    const filteredTopics = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();

        return allTopics
            .filter((topic) => {
                if (!query) return true;
                return topic.title?.toLocaleLowerCase().includes(query);
            })
            .sort((a, b) => getTopicWords(b).length - getTopicWords(a).length);
    }, [allTopics, searchQuery]);

    const firstAvailableTopic = useMemo(
        () =>
            filteredTopics.find(
                (topic) => !getTopicWords(topic).some((item) => normalizeWord(item.word) === normalizeWord(word?.word))
            ),
        [filteredTopics, word?.word]
    );

    useEffect(() => {
        if (!isOpen || isCreatingNew) return;

        const stillVisible = filteredTopics.some((topic) => topic.id === selectedTopicId);
        if (stillVisible) return;

        setSelectedTopicId(firstAvailableTopic?.id || filteredTopics[0]?.id || null);
    }, [filteredTopics, firstAvailableTopic, isCreatingNew, isOpen, selectedTopicId]);

    if (!isOpen || !word) return null;

    const selectedTopic =
        filteredTopics.find((topic) => topic.id === selectedTopicId) ||
        allTopics.find((topic) => topic.id === selectedTopicId) ||
        null;

    const currentWordKey = normalizeWord(word.word);

    const getDuplicateTopic = (topicId) => {
        const target = allTopics.find((topic) => topic.id === topicId);
        if (!target) return null;

        const isDuplicate = getTopicWords(target).some((item) => normalizeWord(item.word) === currentWordKey);
        return isDuplicate ? target : null;
    };

    const duplicateCount = filteredTopics.filter((topic) => getDuplicateTopic(topic.id)).length;
    const selectedTopicDuplicate = selectedTopic ? getDuplicateTopic(selectedTopic.id) : null;
    const canSubmitSelected = Boolean(selectedTopic && !selectedTopicDuplicate);

    const handleSelectTopic = (topicId) => {
        setSelectedTopicId(topicId);
        setIsCreatingNew(false);
        setMessage(null);
    };

    const handleToggleCreate = () => {
        setIsCreatingNew((prev) => {
            const next = !prev;
            if (next && !newTopicName.trim() && searchQuery.trim()) {
                setNewTopicName(searchQuery.trim());
            }
            return next;
        });
        setMessage(null);
    };

    const handleConfirmNew = async () => {
        const name = newTopicName.trim();
        if (!name) {
            setMessage({ type: 'error', text: 'Nhập tên danh sách trước khi tạo mới.' });
            return;
        }

        const duplicatedTitle = allTopics.some((topic) => topic.title.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
        if (duplicatedTitle) {
            setMessage({ type: 'error', text: 'Tên danh sách này đã tồn tại. Hãy dùng tên khác.' });
            return;
        }

        const wordLang = word.language || 'en';
        const newTopic = await onCreateTopic?.({ title: name, description: '', lang: wordLang });

        if (!newTopic?.id) {
            setMessage({ type: 'error', text: 'Không thể tạo danh sách mới. Hãy thử lại.' });
            return;
        }

        await onAdd?.(newTopic.id, { ...word, language: word.language || wordLang });
    };

    const handleAddSelected = async () => {
        if (!selectedTopicId) return;

        const duplicateTopic = getDuplicateTopic(selectedTopicId);
        if (duplicateTopic) {
            setMessage({
                type: 'error',
                text: `"${word.word}" đã có trong "${duplicateTopic.title}".`,
            });
            return;
        }

        await onAdd?.(selectedTopicId, { ...word, language: word.language || 'en' });
    };

    return (
        <div className="cv-topic-picker-overlay cv-tp-active" onClick={onClose}>
            <div className="cv-topic-picker-box" id="cv-topic-picker-box" onClick={(event) => event.stopPropagation()}>
                <div className="cv-modal-header cv-tp-header">
                    <div className="cv-tp-header-copy">
                        <h3>Thêm vào bộ từ của tôi</h3>
                        <p>
                            Chọn nơi lưu cho <strong>{word.word}</strong>
                        </p>
                    </div>
                    <button className="cv-modal-close" type="button" onClick={onClose} aria-label="Đóng">
                        &times;
                    </button>
                </div>

                <div className="cv-modal-body cv-tp-body">
                    <div className="cv-tp-word-pill">
                        <span className="cv-tp-word-emoji">{extractEmoji(word.word)}</span>
                        <div className="cv-tp-word-copy">
                            <strong>{word.word}</strong>
                            <span>{word.mean || 'Chưa có nghĩa'}</span>
                        </div>
                        <span className="cv-tp-word-tag">{allTopics.length} danh sách</span>
                    </div>

                    <div className="cv-tp-toolbar">
                        <input
                            className="cv-form-input cv-tp-search"
                            type="text"
                            placeholder="Tìm danh sách..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />

                        <button
                            type="button"
                            className={`cv-tp-create-row${isCreatingNew ? ' is-open' : ''}`}
                            onClick={handleToggleCreate}
                        >
                            {ADD_ICON} {isCreatingNew ? 'Ẩn tạo mới' : 'Tạo danh sách mới'}
                        </button>
                    </div>

                    <div className={`cv-tp-new-wrap ${isCreatingNew ? 'cv-tp-new-visible' : ''}`}>
                        <label className="cv-tp-new-label" htmlFor="cv-topic-picker-new-name">
                            Tên danh sách mới
                        </label>
                        <input
                            id="cv-topic-picker-new-name"
                            ref={inputRef}
                            className="cv-form-input"
                            placeholder="Ví dụ: Từ vựng văn phòng"
                            maxLength="60"
                            value={newTopicName}
                            onChange={(event) => setNewTopicName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handleConfirmNew();
                            }}
                        />
                        <div className="cv-tp-new-actions">
                            <button className="btn btn-primary btn-small" type="button" onClick={handleConfirmNew}>
                                Tạo và thêm vào
                            </button>
                        </div>
                    </div>

                    {message ? (
                        <div className={`cv-tp-message is-${message.type}`}>{message.text}</div>
                    ) : null}

                    {allTopics.length > 0 ? (
                        <div className="cv-tp-meta">
                            <span>{filteredTopics.length} danh sách phù hợp</span>
                            <span>{duplicateCount} danh sách đã có sẵn từ này</span>
                        </div>
                    ) : null}

                    {allTopics.length === 0 ? (
                        <div className="cv-tp-empty">
                            <div className="cv-tp-empty-icon">🗂</div>
                            <p>Chưa có danh sách nào. Tạo danh sách mới để lưu từ này.</p>
                        </div>
                    ) : filteredTopics.length === 0 ? (
                        <div className="cv-tp-empty">
                            <div className="cv-tp-empty-icon">🔎</div>
                            <p>Không tìm thấy danh sách phù hợp với từ khóa bạn nhập.</p>
                            <button className="btn btn-secondary btn-small cv-tp-empty-action" type="button" onClick={handleToggleCreate}>
                                {isCreatingNew ? 'Đang mở phần tạo mới' : 'Tạo danh sách từ từ khóa này'}
                            </button>
                        </div>
                    ) : (
                        <div className="cv-tp-topic-list">
                            {filteredTopics.map((topic) => {
                                const isSelected = selectedTopicId === topic.id;
                                const topicWords = getTopicWords(topic);
                                const isDuplicate = topicWords.some((item) => normalizeWord(item.word) === currentWordKey);

                                return (
                                    <button
                                        key={topic.id}
                                        type="button"
                                        className={`cv-tp-topic-item ${isSelected ? 'cv-tp-selected' : ''}${isDuplicate ? ' cv-tp-duplicate' : ''}`}
                                        onClick={() => handleSelectTopic(topic.id)}
                                    >
                                        <div className="cv-tp-topic-emoji">{extractEmoji(topic.title)}</div>
                                        <div className="cv-tp-topic-info">
                                            <div className="cv-tp-topic-name">{topic.title}</div>
                                            <div className="cv-tp-topic-count">
                                                {topicWords.length} từ vựng
                                                {isDuplicate ? ' · Đã có từ này' : ''}
                                            </div>
                                        </div>
                                        <div className={`cv-tp-topic-state${isDuplicate ? ' is-duplicate' : ' is-ready'}`}>
                                            {isDuplicate ? 'Đã có' : 'Có thể thêm'}
                                        </div>
                                        <div className="cv-tp-check">{CHECK_ICON}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="cv-modal-footer cv-modal-footer-split cv-tp-footer">
                    <button className="btn btn-secondary" type="button" onClick={onClose}>
                        Hủy
                    </button>
                    <button
                        className="btn btn-primary"
                        type="button"
                        disabled={!canSubmitSelected}
                        onClick={handleAddSelected}
                    >
                        {selectedTopicDuplicate ? 'Danh sách này đã có từ' : !selectedTopic ? 'Chọn danh sách' : 'Thêm vào'}
                    </button>
                </div>
            </div>
        </div>
    );
}
