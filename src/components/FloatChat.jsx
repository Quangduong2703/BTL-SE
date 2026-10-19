import { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import '../assets/css/chatbot.css';
import aiImg from '../assets/images/ai.png';
import { AI_API_URL, AI_MODEL } from '../utils/aiConfig';

marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch {
                return hljs.highlightAuto(code).value;
            }
        }
        return hljs.highlightAuto(code).value;
    }
});


const SYSTEM_PROMPT = `Xin chào bạn! Mình là trợ lý AI của VocabUp — người bạn đồng hành giúp bạn học tiếng Anh hiệu quả và thú vị hơn.

Bạn thân thiện, dễ hiểu, giải thích rõ ràng, và luôn khuyến khích người học tiến bộ.

Nhiệm vụ của bạn là:
- Giải nghĩa từ vựng, ngữ pháp tiếng Anh
- Hỗ trợ luyện hội thoại, phát âm, viết câu
- Sửa lỗi và giải thích chi tiết, dễ hiểu
- Đưa ví dụ thực tế, dễ áp dụng
- Trả lời bằng tiếng Việt (trừ khi người dùng hỏi bằng tiếng Anh hoặc ngôn ngữ khác)

Lưu ý:
- Không tiết lộ thông tin cá nhân của người dùng
- Không cung cấp thông tin sai lệch hoặc gây hiểu nhầm
- Luôn giữ thái độ tích cực, khuyến khích học tập
- Trả lời ngắn gọn, súc tích (dưới 200 từ, ưu tiên dễ hiểu)

Lưu ý:
Nếu câu hỏi không thuộc các mục trên, hãy trả lời như một gia sư ngoại ngữ thân thiện, dễ hiểu, và luôn hỗ trợ người học tiến bộ.`;

export default function FloatChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{
        sender: 'bot',
        text: 'Xin chào bạn! Mình là trợ lý AI của VocabUp. Mình có thể giúp gì cho bạn hôm nay?'
    }]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesRef = useRef(messages);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const callAPI = useCallback(async (newMessage) => {
        if (isLoading) return;
        setIsLoading(true);

        const currentHistory = [];
        // Only keep last 20 messages for history to avoid token overflow
        const recentMessages = messagesRef.current.slice(-20);
        for (const m of recentMessages) {
            // skip the "..." typing indicator if it somehow got stuck
            if (m.isTyping) continue;
            currentHistory.push({
                role: m.sender === 'bot' ? 'assistant' : 'user',
                content: m.text
            });
        }

        currentHistory.push({ role: 'user', content: newMessage });

        // Optimistically add user message and bot typing indicator
        setMessages(prev => [
            ...prev,
            { sender: 'user', text: newMessage },
            { sender: 'bot', text: '...', isTyping: true }
        ]);
        setInputText('');

        try {
            const response = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...currentHistory
                    ],
                    max_tokens: 1024,
                    temperature: 0.7,
                    top_p: 0.9,
                    stream: true
                })
            });

            if (!response.ok) throw new Error('API Error');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            // change the 'isTyping' message to real text container
            setMessages(prev => {
                const newArray = [...prev];
                newArray[newArray.length - 1] = { sender: 'bot', text: '', isTyping: false };
                return newArray;
            });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (!trimmed.startsWith('data: ')) continue;
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json?.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            const display = fullText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*/gi, '').trim();
                            setMessages(prev => {
                                const newArray = [...prev];
                                newArray[newArray.length - 1] = { sender: 'bot', text: display, isTyping: false };
                                return newArray;
                            });
                        }
                    } catch {
                        // Ignore partial or malformed stream chunks.
                    }
                }
            }
        } catch {
            setMessages(prev => {
                const newArray = [...prev];
                newArray[newArray.length - 1] = { sender: 'bot', text: 'Xin lỗi, hệ thống AI đang gặp sự cố. Bạn thử lại sau nhé!' };
                return newArray;
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        const toggleHandler = () => setIsOpen(prev => !prev);
        window.addEventListener('toggleFloatChat', toggleHandler);

        const askAIHandler = (e) => {
            setIsOpen(true);
            if (e.detail?.message) {
                callAPI(e.detail.message);
            }
        };
        window.addEventListener('vocabupAskAI', askAIHandler);

        return () => {
            window.removeEventListener('toggleFloatChat', toggleHandler);
            window.removeEventListener('vocabupAskAI', askAIHandler);
        };
    }, [callAPI]);

    const sendMessage = () => {
        if (!inputText.trim() || isLoading) return;
        callAPI(inputText);
    };

    return (
        <div className="float-chat-container">
            <div id="floatChatWindow" className={`float-chat-window ${isOpen ? 'float-chat-open' : 'float-chat-closed'}`} aria-hidden={!isOpen}>
                <div className="float-chat-header">
                    <div className="float-chat-title">
                        <div className="bot-avatar">
                            <img src={aiImg} alt="Bot Avatar" className="bot-avatar-img" />
                        </div>
                        Trợ lý AI của VocabUp
                    </div>
                    <button className="float-chat-close" onClick={() => setIsOpen(false)}>&times;</button>
                </div>

                <div className="float-chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`float-msg ${msg.sender === 'bot' ? 'float-msg-bot' : 'float-msg-user'}`}>
                            {msg.sender === 'user' || msg.isTyping ? (
                                <span>{msg.isTyping ? <span className="float-typing"><span></span><span></span><span></span></span> : msg.text}</span>
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.text || '') }} />
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="float-chat-footer">
                    <textarea
                        className="custom-input float-input"
                        placeholder="Hỏi từ vựng, ngữ pháp..."
                        rows="1"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        disabled={isLoading}
                    ></textarea>
                    <button className="btn btn-primary btn-small float-send-btn" onClick={sendMessage} disabled={isLoading || !inputText.trim()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>

        </div>
    );
}
