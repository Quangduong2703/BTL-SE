/* ═══════════════════════════════════════════════════════
   TOEIC Parts & Questions Data
═══════════════════════════════════════════════════════ */

export const TOEIC_PARTS = {
  listening: [
    {
      id: 'part1', label: 'Part 1', title: 'Photographs',
      desc: 'Nghe và chọn câu mô tả đúng nhất cho bức ảnh.', icon: '🖼️',
      questionCount: 6,
      questions: [
        { id: 'p1q1', audioText: 'A man is sitting at a desk and typing on a computer.', options: ['A man is sitting at a desk and typing on a computer.', 'A woman is standing near a window.', 'Two people are shaking hands.', 'A child is playing in the park.'], correct: 0, explanation: '"Sitting at a desk and typing" mô tả đúng hành động trong ảnh.' },
        { id: 'p1q2', audioText: 'The shelves are filled with books and folders.', options: ['The room is completely empty.', 'The shelves are filled with books and folders.', 'A man is arranging items on a shelf.', 'Several people are working in an office.'], correct: 1, explanation: '"The shelves are filled with books and folders" mô tả đúng nội dung ảnh.' },
        { id: 'p1q3', audioText: 'A woman is pouring coffee into a cup.', options: ['A woman is washing dishes.', 'A man is drinking water.', 'A woman is pouring coffee into a cup.', 'Two people are eating lunch.'], correct: 2, explanation: '"Pouring coffee into a cup" mô tả chính xác hành động.' },
      ],
    },
    {
      id: 'part2', label: 'Part 2', title: 'Question-Response',
      desc: 'Nghe câu hỏi và chọn câu trả lời phù hợp nhất.', icon: '💬',
      questionCount: 25,
      questions: [
        { id: 'p2q1', audioText: 'When does the meeting start?', options: ['It starts at 10 a.m.', 'In the conference room.', 'About thirty people.'], correct: 0, explanation: '"When" hỏi về thời gian → "It starts at 10 a.m."' },
        { id: 'p2q2', audioText: 'Who is responsible for the project budget?', options: ['The budget is very large.', 'Ms. Kim is in charge of it.', 'The project finished last week.'], correct: 1, explanation: '"Who" hỏi về người → "Ms. Kim is in charge of it".' },
        { id: 'p2q3', audioText: 'Where can I find the supply closet?', options: ['Yes, we have supplies.', 'It is down the hall on the left.', 'The order was placed yesterday.'], correct: 1, explanation: '"Where" hỏi về địa điểm → "down the hall on the left".' },
      ],
    },
    {
      id: 'part3', label: 'Part 3', title: 'Conversations',
      desc: 'Nghe đoạn hội thoại và trả lời câu hỏi.', icon: '🗣️',
      questionCount: 39,
      questions: [
        { id: 'p3q1', audioText: 'M: Have you finished the quarterly report yet?\nW: Almost. I just need to add the sales figures from last week.\nM: Great. Can you send it to me by 3 p.m.?', question: 'What does the woman still need to do?', options: ['Start a new report', 'Add sales figures', 'Schedule a meeting', 'Contact the client'], correct: 1, explanation: 'Người phụ nữ nói "I just need to add the sales figures".' },
        { id: 'p3q2', audioText: 'W: I heard the company is moving to a new office building.\nM: Yes, the move is scheduled for next month.\nW: Do we need to pack our own things?', question: 'When will the company move?', options: ['This week', 'Next month', 'Next year', 'Tomorrow'], correct: 1, explanation: '"The move is scheduled for next month".' },
      ],
    },
    {
      id: 'part4', label: 'Part 4', title: 'Talks',
      desc: 'Nghe bài nói và trả lời câu hỏi.', icon: '🎙️',
      questionCount: 30,
      questions: [
        { id: 'p4q1', audioText: 'Attention all employees. Due to the scheduled maintenance of our building elevators, all elevators will be out of service from 9 a.m. to 12 p.m. tomorrow. Please use the stairs during this time.', question: 'What is the announcement about?', options: ['A fire drill', 'Elevator maintenance', 'A company meeting', 'New parking rules'], correct: 1, explanation: '"Scheduled maintenance of our building elevators".' },
        { id: 'p4q2', audioText: 'Good morning and welcome to the annual sales conference. Today we have several exciting presentations planned. Our keynote speaker is Dr. Sarah Chen, who will discuss emerging market trends.', question: 'Who is the keynote speaker?', options: ['The CEO', 'Dr. Sarah Chen', 'A sales manager', 'A customer'], correct: 1, explanation: '"Our keynote speaker is Dr. Sarah Chen".' },
      ],
    },
  ],
  reading: [
    {
      id: 'part5', label: 'Part 5', title: 'Incomplete Sentences',
      desc: 'Chọn từ/cụm từ phù hợp để hoàn thành câu.', icon: '📝',
      questionCount: 30,
      questions: [
        { id: 'p5q1', text: 'The company _____ its annual report last Friday.', options: ['publish', 'published', 'publishing', 'to publish'], correct: 1, explanation: 'Câu ở thì quá khứ ("last Friday") → dùng "published".' },
        { id: 'p5q2', text: 'All employees must submit _____ expense reports by the end of the month.', options: ['they', 'them', 'their', 'themselves'], correct: 2, explanation: '"their" là tính từ sở hữu đứng trước danh từ.' },
        { id: 'p5q3', text: 'The new policy will _____ effect on January 1st.', options: ['take', 'make', 'do', 'have'], correct: 0, explanation: '"take effect" = có hiệu lực.' },
        { id: 'p5q4', text: 'Ms. Park is _____ for coordinating the annual fundraiser.', options: ['response', 'responsible', 'responsibly', 'responsibility'], correct: 1, explanation: '"is responsible for" là cấu trúc tính từ.' },
      ],
    },
    {
      id: 'part6', label: 'Part 6', title: 'Text Completion',
      desc: 'Đọc đoạn văn và chọn từ/cụm từ phù hợp.', icon: '📄',
      questionCount: 16,
      questions: [
        { id: 'p6q1', text: 'Dear Mr. Johnson,\n\nThank you for your interest in our products. We _____ happy to offer you a 15% discount on your next order.', options: ['are', 'were', 'would be', 'have been'], correct: 2, explanation: '"would be" diễn đạt lịch sự trong văn phong thương mại.' },
        { id: 'p6q2', text: 'The training session has been _____ to next Wednesday due to a scheduling conflict.', options: ['postponed', 'canceled', 'advanced', 'confirmed'], correct: 0, explanation: '"postponed to" = hoãn lại đến.' },
      ],
    },
    {
      id: 'part7', label: 'Part 7', title: 'Reading Comprehension',
      desc: 'Đọc tài liệu và trả lời các câu hỏi liên quan.', icon: '📰',
      questionCount: 54,
      questions: [
        { id: 'p7q1', passage: 'Notice: The office will be closed on November 11th for the national holiday. Employees are required to complete all pending reports before November 10th.', question: 'When should employees finish their reports?', options: ['On November 11th', 'By November 10th', 'After the holiday', 'At the end of the month'], correct: 1, explanation: '"Before November 10th" → "By November 10th".' },
        { id: 'p7q2', passage: 'Green Valley Hotel is pleased to announce the opening of its new rooftop restaurant. Starting March 1st, guests and visitors can enjoy a variety of international cuisines with panoramic city views. Reservations are recommended.', question: 'What is being announced?', options: ['A hotel renovation', 'A new restaurant opening', 'A change in room rates', 'A new parking area'], correct: 1, explanation: '"Opening of its new rooftop restaurant".' },
      ],
    },
  ],
};

/* Scoring table (realistic ETS approximation) */
const L_TABLE = [
  5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, // 0-19
  75, 80, 85, 90, 95, 100, 110, 115, 120, 125, 130, 135, 140, 145, 150, 160, 165, 170, 175, 180, // 20-39
  185, 190, 195, 200, 210, 215, 220, 230, 240, 245, 250, 255, 260, 270, 275, 280, 290, 295, 300, 310, // 40-59
  315, 320, 325, 330, 340, 345, 350, 360, 365, 370, 380, 385, 390, 395, 400, 405, 410, 420, 425, 430, // 60-79
  440, 445, 450, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495 // 80-100
];

const R_TABLE = [
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, // 0-19
  30, 35, 40, 45, 50, 60, 65, 70, 80, 85, 90, 95, 100, 110, 115, 120, 125, 130, 140, 145, // 20-39
  150, 160, 165, 170, 175, 180, 190, 195, 200, 210, 215, 220, 225, 230, 240, 245, 250, 255, 260, 270, // 40-59
  275, 280, 290, 295, 300, 310, 315, 320, 325, 330, 340, 345, 350, 360, 365, 370, 380, 385, 390, 395, // 60-79
  400, 405, 410, 415, 420, 425, 430, 435, 445, 450, 455, 465, 470, 480, 485, 490, 495, 495, 495, 495, 495 // 80-100
];

export function convertToToeicScore(correctListening, totalListening, correctReading, totalReading) {
  // Map partial tests to 100-question scale proportionally
  const mappedL = totalListening > 0 ? Math.round((correctListening / totalListening) * 100) : 0;
  const mappedR = totalReading > 0 ? Math.round((correctReading / totalReading) * 100) : 0;
  
  const lScore = L_TABLE[Math.min(mappedL, 100)] || 5;
  const rScore = R_TABLE[Math.min(mappedR, 100)] || 5;
  
  return { listening: lScore, reading: rScore, total: lScore + rScore };
}
