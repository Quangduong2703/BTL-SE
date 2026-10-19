// ── Features data ────────────────────────────────────────────────────────────
export const FEATURES = [
    {
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="35" height="35" color="currentColor" fill="none" stroke="#141B34" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M11 8H13C15.8284 8 17.2426 8 18.1213 8.87868C19 9.75736 19 11.1716 19 14C19 16.8284 19 18.2426 18.1213 19.1213C17.2426 20 15.8284 20 13 20H12C12 20 11.5 22 8 22C8 22 9 20.9913 9 19.9827C7.44655 19.9359 6.51998 19.7626 5.87868 19.1213C5 18.2426 5 16.8284 5 14C5 11.1716 5 9.75736 5.87868 8.87868C6.75736 8 8.17157 8 11 8Z" />
            <path d="M19 11.5H19.5C20.4346 11.5 20.9019 11.5 21.25 11.701C21.478 11.8326 21.6674 12.022 21.799 12.25C22 12.5981 22 13.0654 22 14C22 14.9346 22 15.4019 21.799 15.75C21.6674 15.978 21.478 16.1674 21.25 16.299C20.9019 16.5 20.4346 16.5 19.5 16.5H19" />
            <path d="M5 11.5H4.5C3.56538 11.5 3.09808 11.5 2.75 11.701C2.52197 11.8326 2.33261 12.022 2.20096 12.25C2 12.5981 2 13.0654 2 14C2 14.9346 2 15.4019 2.20096 15.75C2.33261 15.978 2.52197 16.1674 2.75 16.299C3.09808 16.5 3.56538 16.5 4.5 16.5H5" />
            <path d="M13.5 3.5C13.5 4.32843 12.8284 5 12 5C11.1716 5 10.5 4.32843 10.5 3.5C10.5 2.67157 11.1716 2 12 2C12.8284 2 13.5 2.67157 13.5 3.5Z" />
            <path d="M12 5V8" />
            <path d="M9 12V13M15 12V13" />
            <path d="M10 16.5C10 16.5 10.6667 17 12 17C13.3333 17 14 16.5 14 16.5" />
        </svg>,
        tone: 'blue',
        badge: 'AI Powered',
        title: 'Trợ lý AI thông minh',
        desc: 'Hỏi bất kỳ điều gì về từ vựng, ngữ pháp hay cách phát âm. AI giải thích chi tiết, đưa ví dụ thực tế và gợi ý mẹo ghi nhớ ngay lập tức.',
    },
    {
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="35" height="35" color="#000000" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 18C22 19.4001 22 20.1002 21.7275 20.635C21.4878 21.1054 21.1054 21.4878 20.635 21.7275C20.1002 22 19.4001 22 18 22C16.5999 22 15.8998 22 15.365 21.7275C14.8946 21.4878 14.5122 21.1054 14.2725 20.635C14 20.1002 14 19.4001 14 18C14 16.5999 14 15.8998 14.2725 15.365C14.5122 14.8946 14.8946 14.5122 15.365 14.2725C15.8998 14 16.5999 14 18 14C19.4001 14 20.1002 14 20.635 14.2725C21.1054 14.5122 21.4878 14.8946 21.7275 15.365C22 15.8998 22 16.5999 22 18Z" />
            <path d="M22 10C22 11.4001 22 12.1002 21.7275 12.635C21.4878 13.1054 21.1054 13.4878 20.635 13.7275C20.1002 14 19.4001 14 18 14C16.5999 14 15.8998 14 15.365 13.7275C14.8946 13.4878 14.5122 13.1054 14.2725 12.635C14 12.1002 14 11.4001 14 10C14 8.59987 14 7.8998 14.2725 7.36502C14.5122 6.89462 14.8946 6.51217 15.365 6.27248C15.8998 6 16.5999 6 18 6C19.4001 6 20.1002 6 20.635 6.27248C21.1054 6.51217 21.4878 6.89462 21.7275 7.36502C22 7.8998 22 8.59987 22 10Z" />
            <path d="M14 18C14 19.4001 14 20.1002 13.7275 20.635C13.4878 21.1054 13.1054 21.4878 12.635 21.7275C12.1002 22 11.4001 22 10 22C8.59987 22 7.8998 22 7.36502 21.7275C6.89462 21.4878 6.51217 21.1054 6.27248 20.635C6 20.1002 6 19.4001 6 18C6 16.5999 6 15.8998 6.27248 15.365C6.51217 14.8946 6.89462 14.5122 7.36502 14.2725C7.8998 14 8.59987 14 10 14C11.4001 14 12.1002 14 12.635 14.2725C13.1054 14.5122 13.4878 14.8946 13.7275 15.365C14 15.8998 14 16.5999 14 18Z" />
            <path d="M10 6C10 7.40013 10 8.1002 9.72752 8.63497C9.48783 9.10538 9.10538 9.48783 8.63498 9.72752C8.1002 10 7.40013 10 6 10C4.59987 10 3.8998 10 3.36502 9.72751C2.89462 9.48783 2.51217 9.10538 2.27248 8.63497C2 8.10019 2 7.40013 2 6C2 4.59987 2 3.8998 2.27248 3.36502C2.51217 2.89462 2.89462 2.51217 3.36502 2.27248C3.8998 2 4.59987 2 6 2C7.40013 2 8.1002 2 8.63498 2.27248C9.10538 2.51217 9.48783 2.89462 9.72752 3.36502C10 3.8998 10 4.59987 10 6Z" />
        </svg>,
        tone: 'blue',
        badge: 'Interactive',
        title: 'Chức năng học đa dạng',
        desc: 'Học và ôn từ vựng với đa dạng chức năng: Flashcard, Quiz, Listening, Typing, Match. Ghi nhớ nhanh và lâu dài nhờ kỹ thuật học ngắt quãng.',
    },
    {
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="35" height="35" color="#000000" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9H18C18.9319 9 19.3978 9 19.7654 9.15224C20.2554 9.35523 20.6448 9.74458 20.8478 10.2346C21 10.6022 21 11.0681 21 12C21 12.9319 21 13.3978 20.8478 13.7654C20.6448 14.2554 20.2554 14.6448 19.7654 14.8478C19.3978 15 18.9319 15 18 15H13" />
            <path d="M6 15H3" />
            <path d="M13 15H15C15.9319 15 16.3978 15 16.7654 15.1522C17.2554 15.3552 17.6448 15.7446 17.8478 16.2346C18 16.6022 18 17.0681 18 18C18 18.9319 18 19.3978 17.8478 19.7654C17.6448 20.2554 17.2554 20.6448 16.7654 20.8478C16.3978 21 15.9319 21 15 21H3" />
            <path d="M3 3H14C14.9319 3 15.3978 3 15.7654 3.15224C16.2554 3.35523 16.6448 3.74458 16.8478 4.23463C17 4.60218 17 5.06812 17 6C17 6.93188 17 7.39782 16.8478 7.76537C16.6448 8.25542 16.2554 8.64477 15.7654 8.84776C15.3978 9 14.9319 9 14 9H3" />
            <path d="M13 9L13 15.1905C13 16.3045 13 16.8616 12.6735 16.9803C12.3469 17.0991 11.9782 16.6761 11.2407 15.8303L10.7593 15.278C10.4064 14.8733 10.23 14.6709 10 14.6709C9.77003 14.6709 9.5936 14.8733 9.24074 15.278L8.75926 15.8303C8.02179 16.6761 7.65305 17.0991 7.32653 16.9803C7 16.8616 7 16.3045 7 15.1905L7 9" />
        </svg>,
        tone: 'blue',
        badge: '2 Language',
        title: 'Kho từ vựng phong phú',
        desc: 'Hơn 600 từ vựng TOEIC và 600 từ tiếng Hàn theo 30 chủ đề được sắp xếp rõ ràng, kèm phiên âm và câu ví dụ thực tế để học dễ hơn mỗi ngày.',
    },
    {
        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="35" height="35" color="#000000" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18.5 9.19028C16.9878 7.3721 14.7872 6 12.5 6C8.35786 6 4.5 10.5 4.5 14C4.5 18.1421 8.35786 21 12.5 21C13.0064 21 13.5086 20.9573 14 20.8747" />
            <path d="M13 8.5L17.7059 10L21 8" />
            <path d="M20.6089 17.1305H22L20.1374 15.5872C18.8302 14.5041 18.1766 13.9625 17.4061 14.002C16.6357 14.0415 16.0515 14.6466 14.8831 15.8567L14.7463 15.9984C14.2628 16.4993 14.021 16.7497 14.0017 17.0446C13.9983 17.0956 14 17.1467 14.0066 17.1974C14.0447 17.4908 14.302 17.7278 14.8167 18.2016C16.1158 19.3976 16.7654 19.9957 17.527 20C17.6567 20.0007 17.7862 19.9889 17.9133 19.9648C18.6592 19.823 19.1688 19.1193 20.1879 17.7119L20.6089 17.1305ZM20.6089 17.1305H17.8266" />
            <path d="M13 6C12.7333 5 11.56 3 9 3" />
            <path d="M11 6C10.5 5.47719 9 4.58841 7 5.21578" />
            <path d="M2 11L4 14L2 15" />
            <path d="M13.125 12H13M13.25 12C13.25 12.1381 13.1381 12.25 13 12.25C12.8619 12.25 12.75 12.1381 12.75 12C12.75 11.8619 12.8619 11.75 13 11.75C13.1381 11.75 13.25 11.8619 13.25 12Z" />
            <path d="M20.125 12H20M20.25 12C20.25 12.1381 20.1381 12.25 20 12.25C19.8619 12.25 19.75 12.1381 19.75 12C19.75 11.8619 19.8619 11.75 20 11.75C20.1381 11.75 20.25 11.8619 20.25 12Z" />
        </svg>,
        tone: 'blue',
        badge: 'Personalization',
        title: 'Luyện từ qua game tương tác',
        desc: 'Biến việc ôn từ vựng thành trải nghiệm sinh động hơn với game tương tác, thử thách phản xạ và luyện nhớ ngay trong lúc chơi. Học nhanh hơn, đỡ chán hơn và dễ duy trì thói quen mỗi ngày.',
    },
];

// ── Avatars data ─────────────────────────────────────────────────────────────
export const AVATARS = [
    { initial: 'L', bg: 'linear-gradient(135deg, #1cb0f6, #0e80c4)' },
    { initial: 'M', bg: 'linear-gradient(135deg, #58cc02, #3d9600)' },
    { initial: 'T', bg: 'linear-gradient(135deg, #ff9600, #cc7000)' },
    { initial: 'A', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { initial: 'N', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
];

// ── SVGs data ─────────────────────────────────────────────────────────────────
export const SVGS = [
    {
        // svg for hero-left
        svg: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="#1877F2" stroke="none">
            <path d="M18.9905 19H19M18.9905 19C18.3678 19.6175 17.2393 19.4637 16.4479 19.4637C15.4765 19.4637 15.0087 19.6537 14.3154 20.347C13.7251 20.9374 12.9337 22 12 22C11.0663 22 10.2749 20.9374 9.68457 20.347C8.99128 19.6537 8.52349 19.4637 7.55206 19.4637C6.76068 19.4637 5.63218 19.6175 5.00949 19C4.38181 18.3776 4.53628 17.2444 4.53628 16.4479C4.53628 15.4414 4.31616 14.9786 3.59938 14.2618C2.53314 13.1956 2.00002 12.6624 2 12C2.00001 11.3375 2.53312 10.8044 3.59935 9.73817C4.2392 9.09832 4.53628 8.46428 4.53628 7.55206C4.53628 6.76065 4.38249 5.63214 5 5.00944C5.62243 4.38178 6.7556 4.53626 7.55208 4.53626C8.46427 4.53626 9.09832 4.2392 9.73815 3.59937C10.8044 2.53312 11.3375 2 12 2C12.6625 2 13.1956 2.53312 14.2618 3.59937C14.9015 4.23907 15.5355 4.53626 16.4479 4.53626C17.2393 4.53626 18.3679 4.38247 18.9906 5C19.6182 5.62243 19.4637 6.75559 19.4637 7.55206C19.4637 8.55858 19.6839 9.02137 20.4006 9.73817C21.4669 10.8044 22 11.3375 22 12C22 12.6624 21.4669 13.1956 20.4006 14.2618C19.6838 14.9786 19.4637 15.4414 19.4637 16.4479C19.4637 17.2444 19.6182 18.3776 18.9905 19Z" fill="#1877F2" stroke="#1877F2" strokeWidth="1" />
            <path d="M9 12.8929L10.8 14.5L15 9.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    },
    {
        // svg for about-us
        svg: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M2 12C2 7.52166 2 5.28249 3.39124 3.89124C4.78249 2.5 7.02166 2.5 11.5 2.5C15.9783 2.5 18.2175 2.5 19.6088 3.89124C21 5.28249 21 7.52166 21 12C21 16.4783 21 18.7175 19.6088 20.1088C18.2175 21.5 15.9783 21.5 11.5 21.5C7.02166 21.5 4.78249 21.5 3.39124 20.1088C2 18.7175 2 16.4783 2 12Z" />
            <path d="M12.3638 7.72209L13.2437 9.49644C13.3637 9.74344 13.6837 9.98035 13.9536 10.0257L15.5485 10.2929C16.5684 10.4643 16.8083 11.2103 16.0734 11.9462L14.8335 13.1964C14.6236 13.4081 14.5086 13.8164 14.5736 14.1087L14.9285 15.6562C15.2085 16.8812 14.5636 17.355 13.4887 16.7148L11.9939 15.8226C11.7239 15.6613 11.2789 15.6613 11.004 15.8226L9.50913 16.7148C8.43925 17.355 7.78932 16.8761 8.06929 15.6562L8.42425 14.1087C8.48925 13.8164 8.37426 13.4081 8.16428 13.1964L6.92442 11.9462C6.1945 11.2103 6.42947 10.4643 7.44936 10.2929L9.04419 10.0257C9.30916 9.98035 9.62912 9.74344 9.74911 9.49644L10.629 7.72209C11.109 6.7593 11.8889 6.7593 12.3638 7.72209Z" />
        </svg>
    },
    {
        // svg for docs
        svg: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#189cd8" fill="none" stroke="#189cd8" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12.8809 7.01656L17.6538 8.28825M11.8578 10.8134L14.2442 11.4492M11.9765 17.9664L12.9311 18.2208C15.631 18.9401 16.981 19.2998 18.0445 18.6893C19.108 18.0787 19.4698 16.7363 20.1932 14.0516L21.2163 10.2548C21.9398 7.57005 22.3015 6.22768 21.6875 5.17016C21.0735 4.11264 19.7235 3.75295 17.0235 3.03358L16.0689 2.77924C13.369 2.05986 12.019 1.70018 10.9555 2.31074C9.89196 2.9213 9.53023 4.26367 8.80678 6.94841L7.78366 10.7452C7.0602 13.4299 6.69848 14.7723 7.3125 15.8298C7.92652 16.8874 9.27651 17.2471 11.9765 17.9664Z" />
            <path d="M12 20.9462L11.0477 21.2055C8.35403 21.939 7.00722 22.3057 5.94619 21.6832C4.88517 21.0607 4.52429 19.692 3.80253 16.9546L2.78182 13.0833C2.06006 10.3459 1.69918 8.97718 2.31177 7.89892C2.84167 6.96619 4 7.00015 5.5 7.00003" />
        </svg>
    },
    {
        // svg for docs 2
        svg: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" />
            <path d="M8 12.5L10.5 15L16 9" />
        </svg>
    },
    {
        // svg for docs 3
        svg: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.49977 18.9853V20.5H5.01449C6.24074 20.5 6.85387 20.5 7.40518 20.2716C7.9565 20.0433 8.39004 19.6097 9.25713 18.7426L19.1211 8.87868C20.0037 7.99612 20.4449 7.55483 20.4937 7.01325C20.5018 6.92372 20.5018 6.83364 20.4937 6.74411C20.4449 6.20253 20.0037 5.76124 19.1211 4.87868C18.2385 3.99612 17.7972 3.55483 17.2557 3.50605C17.1661 3.49798 17.0761 3.49798 16.9865 3.50605C16.4449 3.55483 16.0037 3.99612 15.1211 4.87868L5.25713 14.7426C4.39004 15.6097 3.9565 16.0433 3.72813 16.5946C3.49977 17.1459 3.49977 17.759 3.49977 18.9853Z" />
                <path d="M13.5 6.5L17.5 10.5" />
            </svg>
        )
    }
];

// ── Course cards data ─────────────────────────────────────────────────────────
export const COURSE_CARDS = [
    {
        delay: 80,
        banner: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
        bannerLabel: 'Tiếng Anh',
        name: '600 Essential Words for the TOEIC',
        tags: [
            { label: 'TOEIC', color: 'blue' },
            { label: '600 từ', color: 'blue' },
            { label: '50 lessons', color: 'blue' },
        ],
        desc: 'Sách từ vựng TOEIC nổi tiếng của Dr. Lin Lougheed, xuất bản bởi Barron’s, giúp xây nền 600 từ trọng tâm cho Reading, Listening và ngữ cảnh công việc quốc tế.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/toeic-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 160,
        banner: 'linear-gradient(135deg,#ecfeff,#cffafe)',
        bannerLabel: 'Tiếng Anh A1',
        name: 'English A1 Basic Vocabulary',
        tags: [
            { label: 'English', color: 'green' },
            { label: 'A1', color: 'green' },
            { label: '500 từ', color: 'green' },
            { label: '50 lessons', color: 'green' },
        ],
        desc: 'Bộ từ vựng tiếng Anh A1 cơ bản với 500 từ nền tảng, chia thành 50 topic quen thuộc để người mới bắt đầu học dễ nắm bắt hơn.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-a1-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 240,
        banner: 'linear-gradient(135deg,#fef9c3,#fde68a)',
        bannerLabel: 'Tiếng Anh A2',
        name: 'English A2 Basic Vocabulary',
        tags: [
            { label: 'English', color: 'yellow' },
            { label: 'A2', color: 'yellow' },
            { label: '1500 từ', color: 'yellow' },
            { label: '50 lessons', color: 'yellow' },
        ],
        desc: 'Bộ từ vựng tiếng Anh A2 với 1500 từ nền tảng, chia thành 50 chủ đề đa dạng giúp người học ở trình độ sơ trung cấp luyện theo từng ngữ cảnh.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-a2-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 320,
        banner: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
        bannerLabel: 'Tiếng Anh B1',
        name: 'English B1 Intermediate Vocabulary',
        tags: [
            { label: 'English', color: 'green' },
            { label: 'B1', color: 'green' },
            { label: '2000 từ', color: 'green' },
            { label: '50 lessons', color: 'green' },
        ],
        desc: 'Bộ từ vựng tiếng Anh B1 với 2000 từ vựng, được chia theo 50 chủ đề đa dạng để người học ở trình độ sơ trung cấp mở rộng vốn từ theo ngữ cảnh.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-b1-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 400,
        banner: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        bannerLabel: 'Tiếng Anh B2',
        name: 'English B2 Upper-Intermediate Vocabulary',
        tags: [
            { label: 'English', color: 'blue' },
            { label: 'B2', color: 'blue' },
            { label: '2500 từ', color: 'blue' },
            { label: '50 lessons', color: 'blue' },
        ],
        desc: 'Bộ từ vựng tiếng Anh B2 với 2500 từ vựng, tiếp nối B1 và mở rộng thêm vốn từ học thuật, công việc và đời sống hàng ngày.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-b2-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 480,
        banner: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
        bannerLabel: 'Tiếng Anh C1',
        name: 'English C1 Advanced Vocabulary',
        tags: [
            { label: 'English', color: 'pink' },
            { label: 'C1', color: 'pink' },
            { label: '3000 từ', color: 'pink' },
            { label: '50 lessons', color: 'pink' },
        ],
        desc: 'Bộ từ vựng tiếng Anh C1 với 3000 từ vựng, tiếp nối B2 và tập trung nhiều hơn vào ngữ cảnh học thuật, công việc và diễn đạt nâng cao.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-c1-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 560,
        banner: 'linear-gradient(135deg,#ffe4e6,#fecdd3)',
        bannerLabel: 'Cụm từ',
        name: '100 Cụm từ thông dụng nhất',
        tags: [
            { label: 'English', color: 'pink' },
            { label: 'Phrases', color: 'pink' },
            { label: '100 cụm từ', color: 'pink' },
            { label: '10 lessons', color: 'pink' },
        ],
        desc: 'Bộ 10 chủ đề gồm 100 cụm từ tiếng Anh thông dụng nhất, tập trung vào các mẫu diễn đạt thường gặp trong giao tiếp thực tế.',
        fillWidth: '24%',
        ctaLink: '/dashboard/courses/english-phrases-basic',
        ctaLabel: 'Học ngay',
    },
    {
        delay: 640,
        banner: 'linear-gradient(135deg,#fdf4ff,#ede9fe)',
        bannerLabel: 'Cá nhân',
        name: 'Tạo bộ từ vựng của riêng bạn',
        nameIcon: SVGS[4].svg,
        tags: [
            { label: 'AI tạo hàng loạt', color: 'yellow' },
            { label: '5 ngôn ngữ', color: 'yellow' },
            { label: 'Cá nhân', color: 'yellow' },
        ],
        desc: 'Thêm từ thủ công hoặc dùng AI tạo hàng loạt, hoàn toàn cá nhân hóa. AI hỗ trợ tạo từ vựng cho 5 ngôn ngữ: Anh, Hàn, Nhật, Trung, Pháp.',
        fillWidth: '72%',
        ctaLink: '/dashboard/courses?tab=custom',
        ctaLabel: 'Tạo ngay',
    },
];
