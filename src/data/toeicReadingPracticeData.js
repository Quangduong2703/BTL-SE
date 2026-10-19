import readingTestCatalog from "./toeicReadingTests.generated.json";

function buildQuestion(prefix, practiceType, item, index) {
  return {
    id: `${prefix}-${index + 1}`,
    practiceType,
    passage: item.passage || "",
    text: item.text || "",
    question: item.question || "",
    imageUrl: item.imageUrl || "",
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
  };
}

function buildTopic(id, title, desc, icon, practiceType, items) {
  return {
    id,
    title,
    desc,
    icon,
    practiceType,
    questions: items.map((item, index) => buildQuestion(id, practiceType, item, index)),
  };
}


function buildReadingTestTopic(testId, toeicPart, id, title, desc, icon, practiceType) {
  const test = (readingTestCatalog.tests || []).find((item) => item.id === testId);
  const questions = (test?.sections || [])
    .flatMap((section) => section.questions || [])
    .filter((question) => question.toeicPart === toeicPart)
    .map((question) => ({
      passage: question.sharedPassage || "",
      text: question.prompt || question.text || "",
      question: question.prompt || question.question || "",
      imageUrl: question.imageUrl || "",
      options: (question.options || []).map((option) => option.text),
      correct: (question.options || []).findIndex((option) => option.key === question.correctKey),
      explanation: question.explanation || "",
    }));

  return buildTopic(id, title, desc, icon, practiceType, questions);
}

const part5Grammar = [
  { text: "The office will remain _____ during the holiday weekend.", options: ["close", "closed", "closing", "closure"], correct: 1, explanation: "Remain đi với tính từ, nên `closed` là đáp án đúng." },
  { text: "All visitors must sign in _____ entering the research area.", options: ["before", "during", "unless", "among"], correct: 0, explanation: "`Before entering` là cách dùng đúng trong ngữ cảnh quy định." },
  { text: "The manager spoke very _____ during the budget meeting.", options: ["confidence", "confident", "confidential", "confidently"], correct: 3, explanation: "Cần trạng từ bổ nghĩa cho động từ `spoke`, nên chọn `confidently`." },
  { text: "The report _____ by Friday afternoon for the director's review.", options: ["submit", "submitted", "must submit", "must be submitted"], correct: 3, explanation: "Câu cần bị động với `must`, nên `must be submitted` là đúng." },
  { text: "Customers are advised to _____ reservations at least two days in advance.", options: ["make", "do", "create", "build"], correct: 0, explanation: "`Make a reservation` là collocation chuẩn." },
];

const part5Vocabulary = [
  { text: "Please contact customer service for further _____.", options: ["assist", "assistance", "assisting", "assistant"], correct: 1, explanation: "Sau `for further` cần danh từ, nên `assistance` là đúng." },
  { text: "The sales team expects a _____ increase in online orders this quarter.", options: ["significant", "significance", "significantly", "signify"], correct: 0, explanation: "Cần tính từ bổ nghĩa cho `increase`, nên chọn `significant`." },
  { text: "The hotel offers complimentary breakfast to all _____ guests.", options: ["stayed", "staying", "stays", "stay"], correct: 1, explanation: "`Staying guests` là cách dùng tự nhiên để chỉ khách đang lưu trú." },
  { text: "Employees should keep their ID cards _____ at all times.", options: ["visible", "visibility", "visibly", "vision"], correct: 0, explanation: "Sau `keep` cần tính từ, nên `visible` là phù hợp." },
  { text: "The company plans to expand its delivery _____ next year.", options: ["network", "networking", "networked", "networks"], correct: 0, explanation: "`Delivery network` là cụm danh từ phù hợp." },
];

const part5Business = [
  { text: "_____ the weather was unfavorable, the outdoor event continued as scheduled.", options: ["Although", "Because", "Unless", "During"], correct: 0, explanation: "Cần liên từ nhượng bộ để nối hai mệnh đề đối lập, nên chọn `Although`." },
  { text: "Ms. Rivera is responsible _____ coordinating the annual workshop.", options: ["at", "for", "with", "to"], correct: 1, explanation: "Cấu trúc đúng là `responsible for`." },
  { text: "The shipment was delayed _____ a traffic accident on the highway.", options: ["because", "because of", "despite", "while"], correct: 1, explanation: "Theo sau là cụm danh từ, nên phải dùng `because of`." },
  { text: "Our branch has recently hired two _____ accountants.", options: ["experience", "experienced", "experiencing", "experiences"], correct: 1, explanation: "Cần tính từ bổ nghĩa cho `accountants`, nên `experienced` là đúng." },
  { text: "If the printer is still not working, please notify the technician _____.", options: ["prompt", "promptly", "promptness", "prompts"], correct: 1, explanation: "Cần trạng từ bổ nghĩa cho `notify`, nên chọn `promptly`." },
];

const part6Emails = [
  { passage: "Dear Staff,\n\nOur office will be _____ next Monday for scheduled electrical maintenance. Please make sure all laptops are fully charged before leaving on Friday, and contact the facilities team if you need temporary workspace arrangements.", question: "Which word best completes the email?", options: ["close", "closed", "closing", "closure"], correct: 1, explanation: "Sau `will be` cần tính từ, nên `closed` là đáp án đúng." },
  { passage: "Thank you for registering for next week's supplier seminar. _____, we have moved the morning session from Room 204 to Room 312 to accommodate additional attendees.", question: "Which option best completes the email?", options: ["However", "As a result", "Please note that", "Even though"], correct: 2, explanation: "`Please note that` phù hợp nhất để giới thiệu thông báo cập nhật." },
  { passage: "We are pleased to inform you that your service request has been approved. A technician will arrive between 1:00 and 3:00 P.M. and will contact you upon _____.", question: "Which word best completes the email?", options: ["arrive", "arrival", "arrived", "arriving"], correct: 1, explanation: "Sau giới từ `upon` cần danh từ, nên `arrival` là đúng." },
  { passage: "Because several employees will be working remotely next week, all project updates should be submitted through the shared system _____ sent by email.", question: "Which option best completes the memo?", options: ["except", "instead of", "along with", "prior to"], correct: 1, explanation: "Câu mang nghĩa gửi qua hệ thống thay vì email, nên `instead of` là phù hợp." },
  { passage: "The customer support team has extended its weekday hours. _____, clients may now call until 8 P.M. from Monday through Thursday.", question: "Which transition best completes the announcement?", options: ["For example", "Otherwise", "As a result", "Nevertheless"], correct: 2, explanation: "Câu sau là kết quả của việc mở rộng giờ làm, nên `As a result` là đúng." },
];

const part6Notices = [
  { passage: "Notice to Tenants:\n\nThe elevators in Building B will be temporarily unavailable this Saturday from 9 A.M. to noon. During this period, please use the stairwell near the west entrance and allow extra time when _____ deliveries.", question: "Which option best completes the notice?", options: ["receive", "received", "receiving", "receives"], correct: 2, explanation: "Sau `when` trong ngữ cảnh rút gọn mệnh đề, `receiving` là cách dùng tự nhiên." },
  { passage: "To improve checkout speed, customers with ten items or fewer are encouraged to use the express lane. The lane will remain open _____ store traffic is heavy.", question: "Which word best completes the notice?", options: ["unless", "while", "despite", "once"], correct: 1, explanation: "`While store traffic is heavy` là mệnh đề thời gian phù hợp nhất." },
  { passage: "All employees attending the annual conference must wear their badges at all times. Badge replacements will be available at the registration desk for a small _____.", question: "Which word best completes the notice?", options: ["fee", "feed", "fewer", "federal"], correct: 0, explanation: "`For a small fee` là cụm dùng đúng nghĩa trong thông báo." },
  { passage: "The museum gift shop will reopen at noon after inventory is completed. Until then, visitors may purchase guidebooks from the kiosk _____ the main entrance.", question: "Which option best completes the notice?", options: ["beside", "during", "among", "except"], correct: 0, explanation: "Cần giới từ chỉ vị trí, và `beside the main entrance` là hợp lý nhất." },
  { passage: "Employees who plan to attend the software training workshop should complete the online form by Friday. Late submissions may not be _____ due to limited seating.", question: "Which word best completes the notice?", options: ["accepted", "accepting", "acceptance", "acceptably"], correct: 0, explanation: "Sau `be` cần quá khứ phân từ trong bị động, nên `accepted` là đúng." },
];

const part6Articles = [
  { passage: "Company Newsletter\n\nThe downtown branch recently introduced a digital check-in system for visitors. According to branch managers, the system has reduced wait times and improved the overall arrival _____.", question: "Which word best completes the article?", options: ["experience", "experienced", "experiencing", "experiences"], correct: 0, explanation: "Cần danh từ sau `arrival`, nên `experience` là đáp án đúng." },
  { passage: "Travel Update\n\nBeginning next month, the airport shuttle will stop at two additional hotels near the convention center. This change was made _____ several guests requested more convenient transportation options.", question: "Which option best completes the article?", options: ["because", "although", "unless", "whereas"], correct: 0, explanation: "Mệnh đề sau giải thích lý do, nên `because` là phù hợp nhất." },
  { passage: "Store Promotion\n\nThis weekend only, customers who spend more than $75 will receive a free reusable shopping bag. Supplies are limited, so the offer is available only _____ quantities last.", question: "Which phrase best completes the promotion?", options: ["while", "until", "unless", "whether"], correct: 0, explanation: "Thành ngữ đúng là `while quantities last`." },
  { passage: "Community Bulletin\n\nVolunteers are still needed for Saturday's neighborhood cleanup. Gloves, bags, and water will be provided, and all participants are asked to arrive _____ 8:30 A.M.", question: "Which word best completes the bulletin?", options: ["at", "in", "on", "by"], correct: 0, explanation: "Giờ cụ thể đi với giới từ `at`." },
  { passage: "Office Update\n\nTo support cross-team collaboration, the company has redesigned the third-floor workspace with more shared tables and small meeting booths. Employees have responded _____ to the new layout in an internal survey.", question: "Which word best completes the update?", options: ["positive", "positively", "positivity", "positives"], correct: 1, explanation: "Cần trạng từ bổ nghĩa cho `responded`, nên `positively` là đúng." },
];

const part7Emails = [
  { passage: "From: Olivia Chen\nTo: Sales Team\nSubject: Client Visit\n\nThe representatives from Northstar Retail will arrive at our office on Thursday at 10:30 A.M. Please make sure the sample display in Conference Room A is ready before then. After the presentation, we will take the visitors to lunch at Harbor Cafe at noon.\n\nParking passes for the guests are available at the front desk.", question: "What is the purpose of Olivia Chen's email?", options: ["To announce a client visit schedule", "To cancel a lunch reservation", "To request product samples from a vendor", "To confirm a parking fee increase"], correct: 0, explanation: "The email gives the schedule and preparations for a client visit." },
  { passage: "From: Marcus Lee\nTo: Building Staff\nSubject: Maintenance Reminder\n\nThis is a reminder that the air-conditioning system on the fifth floor will be shut down for repairs tomorrow from 1 P.M. to 4 P.M. Employees assigned to that floor may use any open workspace on the third floor during that time.\n\nIf you need assistance moving equipment, please contact the facilities desk by noon today.", question: "What are employees on the fifth floor advised to do?", options: ["Use workspace on another floor", "Finish work before noon", "Work remotely from home", "Meet with the repair team directly"], correct: 0, explanation: "The email says they may use any open workspace on the third floor." },
  { passage: "From: Jina Park\nTo: Event Volunteers\nSubject: Saturday Check-in\n\nThank you for helping with Saturday's book fair. Volunteer check-in begins at 8:15 A.M. near the east entrance. Please wear your name badge and stop by the supply table to pick up a schedule.\n\nThe first group of visitors is expected to arrive at 9 A.M.", question: "When are volunteers expected to check in?", options: ["At 8:15 A.M.", "At 8:45 A.M.", "At 9 A.M.", "At noon"], correct: 0, explanation: "The email clearly states that volunteer check-in begins at 8:15 A.M." },
  { passage: "From: Hotel Front Desk\nTo: Guests\nSubject: Pool Closure\n\nPlease be advised that the indoor pool will be closed on Monday and Tuesday for tile repairs. During this period, guests may use the fitness center free of charge, and extra towels will be available at the front desk upon request.", question: "What can guests do while the pool is closed?", options: ["Use the fitness center at no cost", "Request a room upgrade", "Access the outdoor pool", "Receive a meal voucher"], correct: 0, explanation: "The notice says guests may use the fitness center free of charge." },
  { passage: "From: N. Alvarez\nTo: Store Employees\nSubject: Display Update\n\nBeginning next week, the seasonal display near the entrance will feature travel accessories instead of winter clothing. Please move the remaining coats to Aisle 6 by Friday evening and replace the price signs before opening on Saturday morning.", question: "What are store employees asked to do by Friday evening?", options: ["Move the remaining coats to Aisle 6", "Order more travel accessories", "Close the entrance display", "Count items in the stockroom"], correct: 0, explanation: "The email says to move the remaining coats to Aisle 6 by Friday evening." },
];

const part7Notices = [
  { passage: "Notice\n\nThe office cafeteria will open one hour later than usual this Friday due to equipment maintenance. Breakfast service will begin at 8 A.M., but the lunch schedule will remain unchanged. Employees may purchase coffee and packaged snacks from the kiosk in the lobby during the morning.", question: "What will happen on Friday morning?", options: ["The cafeteria will open later than usual", "Lunch service will be canceled", "The lobby kiosk will be closed", "Breakfast will be free for employees"], correct: 0, explanation: "The notice says the cafeteria will open one hour later than usual." },
  { passage: "Store Announcement\n\nThis Saturday only, customers who present a receipt from the electronics department will receive 20 percent off all phone accessories. The promotion is valid at checkout only and may not be combined with other coupons.", question: "What is required to receive the discount?", options: ["A receipt from the electronics department", "A membership card", "A coupon from the website", "A purchase of two phone cases"], correct: 0, explanation: "The announcement says customers must present a receipt from the electronics department." },
  { passage: "Museum Notice\n\nThe west gallery will be temporarily closed this afternoon from 2 P.M. to 4 P.M. for a private event. During that time, visitors are encouraged to explore the new sculpture exhibit on the second floor, which will remain open all day.", question: "Where are visitors encouraged to go this afternoon?", options: ["To the sculpture exhibit on the second floor", "To the west gallery", "To the private event hall", "To the front entrance desk"], correct: 0, explanation: "The notice directs visitors to the sculpture exhibit on the second floor." },
  { passage: "Hotel Information\n\nGuests checking out before 7 A.M. may leave their room keys in the express box beside the main entrance. Printed receipts for express check-out will be emailed within one hour.", question: "How will guests receive their receipts?", options: ["By email", "At the front desk", "In the room mailbox", "By text message"], correct: 0, explanation: "The notice says receipts for express check-out will be emailed." },
  { passage: "Transportation Update\n\nDue to scheduled roadwork, the Route 8 shuttle will not stop at Pine Street this week. Passengers should board at the temporary stop in front of City Hall, two blocks east of the usual location.", question: "Where should passengers board the shuttle this week?", options: ["In front of City Hall", "At Pine Street", "Behind the usual location", "At the train station"], correct: 0, explanation: "The update says passengers should board at the temporary stop in front of City Hall." },
];

const part7Articles = [
  { passage: "Article\n\nMore companies are redesigning office spaces to support hybrid work. Instead of assigning permanent desks to every employee, many businesses now provide shared work areas, reservable meeting booths, and quiet rooms for video calls. Managers say the changes help teams collaborate more easily while still giving employees flexibility.\n\nSome companies have also added more lounge seating to encourage informal discussion.", question: "What is the article mainly about?", options: ["Changes in office design for hybrid work", "How to reduce furniture costs", "A shortage of meeting rooms", "Training for new office managers"], correct: 0, explanation: "The article focuses on redesigned office spaces for hybrid work." },
  { passage: "Travel Feature\n\nA new express rail service between the airport and downtown began operating this month. The train now departs every twenty minutes during peak hours and takes only fifteen minutes to reach Central Station. City officials hope the service will reduce traffic congestion and make business travel more convenient.", question: "What is mentioned about the new rail service?", options: ["It reaches Central Station in fifteen minutes", "It replaces all airport bus routes", "It operates only during the weekend", "It was delayed by construction problems"], correct: 0, explanation: "The article states that the train takes only fifteen minutes to reach Central Station." },
  { passage: "Business Report\n\nA local grocery chain recently introduced self-checkout kiosks in all of its downtown locations. According to the company, customer wait times have decreased since the change, especially during the evening rush. However, each store still keeps at least two staffed registers open for customers who prefer personal assistance.", question: "Why does the company still keep staffed registers open?", options: ["Some customers prefer personal assistance", "The self-checkout kiosks are often unavailable", "The evening rush has ended", "Employees must inspect every purchase"], correct: 0, explanation: "The passage says staffed registers remain for customers who prefer personal assistance." },
  { passage: "Community News\n\nThe Riverside Library will begin offering free evening workshops on resume writing next month. Sessions will be held on the first and third Wednesdays of each month and will be led by volunteer career coaches. Registration opens online this Friday, and space is limited to twenty participants per session.", question: "What is indicated about the workshops?", options: ["Registration opens this Friday", "They are held every week", "They require a fee", "They are available to only library staff"], correct: 0, explanation: "The article specifically says that registration opens online this Friday." },
  { passage: "Retail Update\n\nTo improve customer service, BrightHome Furniture has extended live chat support on its website until 10 P.M. on weekdays. The company says online shoppers often have questions about delivery, assembly, and warranty details after regular business hours, so the change is expected to increase completed purchases.", question: "Why was live chat support extended?", options: ["Customers ask questions after regular business hours", "The website is closed in the morning", "Delivery fees have recently increased", "Assembly instructions are no longer included"], correct: 0, explanation: "The article explains that shoppers often have questions after regular business hours." },
];

export const TOEIC_READING_PRACTICE_MODES = [
  {
    id: "part5-reading",
    label: "Part 5",
    title: "Incomplete Sentences",
    desc: "Đọc câu chưa hoàn chỉnh và chọn đáp án A/B/C/D đúng nhất để điền vào chỗ trống.",
    icon: "📝",
    topics: [
      buildTopic("p5-grammar", "Grammar focus", "Word form, tense, and sentence structure practice.", "🧩", "part5-reading", part5Grammar),
      buildTopic("p5-vocabulary", "Vocabulary focus", "Business vocabulary and collocation practice.", "📚", "part5-reading", part5Vocabulary),
      buildTopic("p5-business", "Business English", "Prepositions, transitions, and workplace usage.", "🏢", "part5-reading", part5Business),
    ],
  },
  {
    id: "part6-reading",
    label: "Part 6",
    title: "Text Completion",
    desc: "Đọc đoạn văn ngắn và chọn đáp án A/B/C/D phù hợp nhất với từng chỗ trống.",
    icon: "📄",
    topics: [
      buildTopic("p6-emails", "Business emails", "Email và memo ngắn theo văn phong công việc.", "✉️", "part6-reading", part6Emails),
      buildTopic("p6-notices", "Notices and memos", "Thông báo, ghi chú và hướng dẫn ngắn.", "📌", "part6-reading", part6Notices),
      buildTopic("p6-articles", "Articles and updates", "Bản tin, thông báo nội bộ và cập nhật ngắn.", "📰", "part6-reading", part6Articles),
    ],
  },
  {
    id: "part7-reading",
    label: "Part 7",
    title: "Reading Comprehension",
    desc: "Đọc passage và trả lời câu hỏi A/B/C/D về ý chính, chi tiết và suy luận.",
    icon: "📖",
    topics: [
      buildTopic("p7-emails", "Emails and messages", "Email công việc, thông báo và tin nhắn ngắn.", "📨", "part7-reading", part7Emails),
      buildTopic("p7-notices", "Notices and forms", "Thông báo, hướng dẫn và cập nhật dịch vụ.", "📋", "part7-reading", part7Notices),
      buildTopic("p7-articles", "Articles and reports", "Bài viết ngắn, báo cáo và cập nhật kinh doanh.", "🗞️", "part7-reading", part7Articles),
    ],
  },
];

const part5PracticeMode = TOEIC_READING_PRACTICE_MODES.find((mode) => mode.id === "part5-reading");

if (part5PracticeMode) {
  part5PracticeMode.topics = [
    buildReadingTestTopic("reading-test-1", "PART 5", "reading-practice-5-1", "Tài liệu 1", "30 câu của Reading Test Đề 1 Part 5.", "📘", "part5-reading"),
    buildReadingTestTopic("reading-test-2", "PART 5", "reading-practice-5-2", "Tài liệu 2", "30 câu của Reading Test Đề 2 Part 5.", "📙", "part5-reading"),
  ];
}

const part6PracticeMode = TOEIC_READING_PRACTICE_MODES.find((mode) => mode.id === "part6-reading");

if (part6PracticeMode) {
  part6PracticeMode.topics = [
    buildReadingTestTopic("reading-test-1", "PART 6", "reading-practice-6-1", "Tài liệu 1", "16 câu của Reading Test Đề 1 Part 6.", "📘", "part6-reading"),
    buildReadingTestTopic("reading-test-2", "PART 6", "reading-practice-6-2", "Tài liệu 2", "16 câu của Reading Test Đề 2 Part 6.", "📙", "part6-reading"),
  ];
}

const part7PracticeMode = TOEIC_READING_PRACTICE_MODES.find((mode) => mode.id === "part7-reading");

if (part7PracticeMode) {
  part7PracticeMode.topics = [
    buildReadingTestTopic("reading-test-1", "PART 7", "reading-practice-7-1", "Tài liệu 1", "54 câu của Reading Test Đề 1 Part 7.", "📘", "part7-reading"),
    buildReadingTestTopic("reading-test-2", "PART 7", "reading-practice-7-2", "Tài liệu 2", "54 câu của Reading Test Đề 2 Part 7.", "📙", "part7-reading"),
  ];
}
