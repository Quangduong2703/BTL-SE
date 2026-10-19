export default function StudyCompletionPanel({
    title = 'Chọn lại danh sách từ đã thuộc',
    summary = null,
    metrics = null,
    words,
    selectedWordIds,
    onPlayAgain,
    onSave,
    isSaved = false,
}) {
    const selectedCount = selectedWordIds.length;
    const totalWords = words.length;
    const unselectedCount = Math.max(totalWords - selectedCount, 0);
    const progressPct = totalWords > 0 ? Math.round((selectedCount / totalWords) * 100) : 0;
    const modeLabel = (() => {
        const match = String(title).match(/\b(Match|Typing|Listening)\b/i);
        return match ? match[1] : 'bài luyện tập';
    })();

    const displayMetrics = Array.isArray(metrics) && metrics.length > 0
        ? metrics
        : [
            { label: 'Đã chọn', value: `${selectedCount}/${totalWords}` },
            { label: 'Tỉ lệ', value: `${progressPct}%` },
        ];

    const CheckIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" color="#10b981" fill="none" stroke="#10b981" strokeWidth="1.75" aria-hidden="true">
            <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"></path>
            <path d="M8 12.5L10.5 15L16 9" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
    );

    const CrossIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" color="#ef4444" fill="none" stroke="#ef4444" strokeWidth="1.75" aria-hidden="true">
            <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"></path>
            <path d="M9 9L15 15" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M15 9L9 15" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
    );

    return (
        <div className="flashcard-completion-view">
            <div className="flashcard-completion-content">
                <div className="flashcard-trophy">🏆</div>
                <h2>Tuyệt vời!</h2>
                <p>Bạn đã hoàn thành bài luyện tập {modeLabel}.</p>

                <div className="flashcard-completion-metrics">
                    {displayMetrics.map((metric) => (
                        <div key={metric.label} className="flashcard-progress flashcard-completion-score">
                            <span className="flashcard-completion-score-label">{metric.label}</span>
                            <strong className="flashcard-completion-score-value">{metric.value}</strong>
                        </div>
                    ))}
                </div>

                <div className="flashcard-completion-stats">
                    <div className="flashcard-completion-stats-head">
                        <span className="flashcard-completion-stats-title">Thống kê:</span>
                    </div>
                    <div className="flashcard-completion-stat-row">
                        <span className="flashcard-completion-stat-label"><span className="flashcard-completion-stat-icon is-correct"><CheckIcon /></span> Đã chọn:</span>
                        <strong>{selectedCount} từ</strong>
                    </div>
                    <div className="flashcard-completion-stat-row">
                        <span className="flashcard-completion-stat-label"><span className="flashcard-completion-stat-icon is-wrong"><CrossIcon /></span> Chưa chọn:</span>
                        <strong>{unselectedCount} từ</strong>
                    </div>
                </div>

                <div className="flashcard-completion-actions">
                    {!isSaved ? (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={onPlayAgain}>
                                Học lại
                            </button>
                            <button type="button" className="btn btn-primary" onClick={onSave}>
                                Hoàn thành
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
