import listeningTestCatalog from "./toeicListeningTests.generated.json";

function buildPart1Question(prefix, item, index) {
  return {
    id: `${prefix}-${index + 1}`,
    practiceType: "part1-picture",
    audioText: item.audioText,
    audioUrl: item.audioUrl || "",
    imageUrl: item.imageUrl || `/toeic-listening/placeholders/${prefix}-${index + 1}.svg`,
    imageEmoji: item.imageEmoji,
    imageTitle: item.imageTitle,
    imageDetail: item.imageDetail,
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
  };
}

function buildPart2Question(prefix, item, index) {
  return {
    id: `${prefix}-${index + 1}`,
    practiceType: "part2-response",
    audioText: item.audioText,
    audioUrl: item.audioUrl || "",
    question: item.prompt || item.question || "",
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
  };
}

function buildPart3Question(prefix, item, index) {
  return {
    id: `${prefix}-${index + 1}`,
    practiceType: "part3-conversations",
    audioText: item.audioText,
    audioUrl: item.audioUrl || "",
    imageUrl: item.imageUrl || "",
    question: item.question,
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
  };
}

function buildPart4Question(prefix, item, index) {
  return {
    id: `${prefix}-${index + 1}`,
    practiceType: "part4-talks",
    audioText: item.audioText,
    audioUrl: item.audioUrl || "",
    imageUrl: item.imageUrl || "",
    question: item.question,
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
  };
}

function buildTopic(id, title, desc, icon, practiceType, items) {
  const builderMap = {
    "part1-picture": buildPart1Question,
    "part2-response": buildPart2Question,
    "part3-conversations": buildPart3Question,
    "part4-talks": buildPart4Question,
  };

  return {
    id,
    title,
    desc,
    icon,
    practiceType,
    questions: items.map((item, index) => builderMap[practiceType](id, item, index)),
  };
}


function formatPart1AudioText(options = []) {
  return options.map((option, index) => `(${String.fromCharCode(65 + index)}) ${option}`).join(" ");
}

function buildListeningTestPart1Topic(testId, id, title, desc, icon) {
  const test = (listeningTestCatalog.tests || []).find((item) => item.id === testId);
  const section = (test?.sections || []).find((item) => item.id.endsWith("part1"));
  const items = (section?.questions || [])
    .filter((question) => question.toeicPart === "PART 1")
    .slice(0, 6)
    .map((question, index) => {
      const options = (question.options || []).map((option) => option.text);
      return {
        audioText: formatPart1AudioText(options),
        audioUrl: question.audioUrl || section?.audioUrl || "",
        imageUrl: question.imageUrl || "",
        imageTitle: `Question ${question.displayNumber || index + 1}`,
        imageDetail: `Listening Test ${testId === "listening-test-1" ? "Đề 1" : "Đề 2"} · Part 1`,
        options,
        correct: (question.options || []).findIndex((option) => option.key === question.correctKey),
        explanation: question.explanation || "",
      };
    });

  return buildTopic(id, title, desc, icon, "part1-picture", items);
}

function buildListeningTestTopic(testId, toeicPart, sectionSuffix, id, title, desc, icon, practiceType) {
  const test = (listeningTestCatalog.tests || []).find((item) => item.id === testId);
  const section = (test?.sections || []).find((item) => item.id.endsWith(sectionSuffix));
  const items = (section?.questions || [])
    .filter((question) => question.toeicPart === toeicPart)
    .map((question) => ({
      audioText: question.transcript || question.audioText || "",
      audioUrl: question.audioUrl || section?.audioUrl || "",
      imageUrl: question.imageUrl || "",
      prompt: question.prompt || "",
      question: question.prompt || "",
      options: (question.options || []).map((option) => option.text),
      correct: (question.options || []).findIndex((option) => option.key === question.correctKey),
      explanation: question.explanation || "",
    }));

  return buildTopic(id, title, desc, icon, practiceType, items);
}

const part1Office = [
  {
    imageEmoji: "🏢",
    imageTitle: "Reception desk",
    imageDetail: "A visitor is checking in at the lobby desk.",
    audioText: "(A) A receptionist is greeting a visitor at the front desk. (B) Employees are loading boxes into a truck. (C) A mechanic is repairing a machine outdoors. (D) Passengers are waiting beside a train platform.",
    options: [
      "A receptionist is greeting a visitor at the front desk.",
      "Employees are loading boxes into a truck.",
      "A mechanic is repairing a machine outdoors.",
      "Passengers are waiting beside a train platform.",
    ],
    correct: 0,
    explanation: "The image shows a receptionist greeting a visitor at the front desk.",
  },
  {
    imageEmoji: "💻",
    imageTitle: "Open office",
    imageDetail: "An employee is typing while looking at two monitors.",
    audioText: "(A) The office chairs are being stacked after a seminar. (B) A team is serving food in the cafeteria. (C) A man is typing on a computer at his workstation. (D) A woman is adjusting lights above a stage.",
    options: [
      "The office chairs are being stacked after a seminar.",
      "A team is serving food in the cafeteria.",
      "A man is typing on a computer at his workstation.",
      "A woman is adjusting lights above a stage.",
    ],
    correct: 2,
    explanation: "The correct statement describes the man working at his computer station.",
  },
  {
    imageEmoji: "🗂️",
    imageTitle: "File shelves",
    imageDetail: "Tall shelves are filled with binders and labeled boxes.",
    audioText: "(A) Several customers are browsing in a bookstore. (B) Workers are assembling a display cabinet. (C) A presenter is speaking in front of a screen. (D) The shelves are filled with binders and storage boxes.",
    options: [
      "Several customers are browsing in a bookstore.",
      "Workers are assembling a display cabinet.",
      "A presenter is speaking in front of a screen.",
      "The shelves are filled with binders and storage boxes.",
    ],
    correct: 3,
    explanation: "The image focuses on shelves full of binders and labeled storage boxes.",
  },
  {
    imageEmoji: "☕",
    imageTitle: "Break area",
    imageDetail: "A staff member is pouring coffee beside a machine.",
    audioText: "(A) A woman is watering plants near the entrance. (B) The counter is being cleaned with a towel. (C) A woman is pouring coffee into a paper cup. (D) Two workers are unpacking office supplies.",
    options: [
      "A woman is watering plants near the entrance.",
      "The counter is being cleaned with a towel.",
      "A woman is pouring coffee into a paper cup.",
      "Two workers are unpacking office supplies.",
    ],
    correct: 2,
    explanation: "The woman is clearly pouring coffee into a paper cup.",
  },
  {
    imageEmoji: "📊",
    imageTitle: "Meeting room",
    imageDetail: "A presenter points to a chart at the front of the room.",
    audioText: "(A) Employees are eating lunch together. (B) Visitors are waiting in a reception line. (C) A janitor is polishing the conference table. (D) A presenter is pointing to a chart during a meeting.",
    options: [
      "Employees are eating lunch together.",
      "Visitors are waiting in a reception line.",
      "A janitor is polishing the conference table.",
      "A presenter is pointing to a chart during a meeting.",
    ],
    correct: 3,
    explanation: "The presenter is pointing to a chart during a meeting.",
  },
];

const part1Travel = [
  {
    imageEmoji: "✈️",
    imageTitle: "Boarding gate",
    imageDetail: "Passengers sit with carry-on bags near a departure screen.",
    audioText: "(A) Passengers are waiting near the boarding gate. (B) A clerk is filing receipts in the back office. (C) Shoppers are comparing products at a counter. (D) Workers are washing the company vehicle.",
    options: [
      "Passengers are waiting near the boarding gate.",
      "A clerk is filing receipts in the back office.",
      "Shoppers are comparing products at a counter.",
      "Workers are washing the company vehicle.",
    ],
    correct: 0,
    explanation: "The departure screen and seated travelers indicate a boarding gate.",
  },
  {
    imageEmoji: "🧳",
    imageTitle: "Baggage claim",
    imageDetail: "Suitcases move along a carousel while travelers watch.",
    audioText: "(A) Employees are arranging folders in a cabinet. (B) Guests are reading a menu at a cafe. (C) Travelers are standing beside a baggage carousel. (D) A mechanic is checking a truck engine.",
    options: [
      "Employees are arranging folders in a cabinet.",
      "Guests are reading a menu at a cafe.",
      "Travelers are standing beside a baggage carousel.",
      "A mechanic is checking a truck engine.",
    ],
    correct: 2,
    explanation: "The luggage carousel and waiting travelers match the correct statement.",
  },
  {
    imageEmoji: "🚆",
    imageTitle: "Train platform",
    imageDetail: "Commuters stand under a sign while a train approaches.",
    audioText: "(A) People are waiting on a train platform. (B) Workers are moving chairs into a meeting room. (C) A cashier is counting bills at a register. (D) A chef is preparing sandwiches at a counter.",
    options: [
      "People are waiting on a train platform.",
      "Workers are moving chairs into a meeting room.",
      "A cashier is counting bills at a register.",
      "A chef is preparing sandwiches at a counter.",
    ],
    correct: 0,
    explanation: "The people are standing on a platform waiting for a train.",
  },
  {
    imageEmoji: "🗺️",
    imageTitle: "Ticket counter",
    imageDetail: "A traveler points at a route map while speaking to an agent.",
    audioText: "(A) A server is polishing glasses in a restaurant. (B) A traveler is speaking with an agent at the ticket counter. (C) Employees are unpacking computers in a warehouse. (D) A nurse is organizing medical files.",
    options: [
      "A server is polishing glasses in a restaurant.",
      "A traveler is speaking with an agent at the ticket counter.",
      "Employees are unpacking computers in a warehouse.",
      "A nurse is organizing medical files.",
    ],
    correct: 1,
    explanation: "The traveler is speaking with an agent at the ticket counter.",
  },
  {
    imageEmoji: "🚌",
    imageTitle: "Shuttle stop",
    imageDetail: "People line up beside a hotel shuttle with luggage.",
    audioText: "(A) A presenter is writing on a whiteboard. (B) Customers are examining shoes in a store. (C) A worker is cleaning windows on a ladder. (D) Passengers are lining up to board a shuttle bus.",
    options: [
      "A presenter is writing on a whiteboard.",
      "Customers are examining shoes in a store.",
      "A worker is cleaning windows on a ladder.",
      "Passengers are lining up to board a shuttle bus.",
    ],
    correct: 3,
    explanation: "The people and luggage are lined up next to a shuttle bus.",
  },
];

const part1Retail = [
  {
    imageEmoji: "🛍️",
    imageTitle: "Store entrance",
    imageDetail: "Customers walk past a window display with mannequins.",
    audioText: "(A) Customers are entering a store past the window display. (B) Travelers are boarding a city bus. (C) Employees are sorting files in the office. (D) A mechanic is replacing a tire.",
    options: [
      "Customers are entering a store past the window display.",
      "Travelers are boarding a city bus.",
      "Employees are sorting files in the office.",
      "A mechanic is replacing a tire.",
    ],
    correct: 0,
    explanation: "The shoppers are entering the store beside a display window.",
  },
  {
    imageEmoji: "🧾",
    imageTitle: "Checkout counter",
    imageDetail: "A cashier scans an item while a customer holds a wallet.",
    audioText: "(A) A waiter is pouring tea at a table. (B) An agent is issuing train tickets. (C) Workers are stacking cartons in a warehouse. (D) A cashier is scanning an item at the register.",
    options: [
      "A waiter is pouring tea at a table.",
      "An agent is issuing train tickets.",
      "Workers are stacking cartons in a warehouse.",
      "A cashier is scanning an item at the register.",
    ],
    correct: 3,
    explanation: "The cashier is scanning an item at the register.",
  },
  {
    imageEmoji: "👗",
    imageTitle: "Fitting room",
    imageDetail: "A shopper stands near mirrors holding two jackets.",
    audioText: "(A) A receptionist is answering a phone call. (B) Travelers are unloading luggage from a van. (C) A shopper is comparing jackets near a fitting room. (D) A clerk is arranging binders on a shelf.",
    options: [
      "A receptionist is answering a phone call.",
      "Travelers are unloading luggage from a van.",
      "A shopper is comparing jackets near a fitting room.",
      "A clerk is arranging binders on a shelf.",
    ],
    correct: 2,
    explanation: "The shopper is comparing jackets near the fitting-room mirrors.",
  },
  {
    imageEmoji: "🍰",
    imageTitle: "Bakery case",
    imageDetail: "Pastries are neatly arranged behind glass.",
    audioText: "(A) A technician is checking a control panel. (B) Office staff are preparing name tags. (C) Pastries are displayed inside a glass case. (D) Passengers are waiting beside a gate.",
    options: [
      "A technician is checking a control panel.",
      "Office staff are preparing name tags.",
      "Pastries are displayed inside a glass case.",
      "Passengers are waiting beside a gate.",
    ],
    correct: 2,
    explanation: "The pastries are displayed inside a glass case.",
  },
  {
    imageEmoji: "📚",
    imageTitle: "Bookshop aisle",
    imageDetail: "A clerk restocks books on tall wooden shelves.",
    audioText: "(A) A manager is presenting sales figures. (B) Guests are checking in at a hotel. (C) Workers are loading packages into a truck. (D) A clerk is placing books on a store shelf.",
    options: [
      "A manager is presenting sales figures.",
      "Guests are checking in at a hotel.",
      "Workers are loading packages into a truck.",
      "A clerk is placing books on a store shelf.",
    ],
    correct: 3,
    explanation: "The clerk is visibly placing books on a store shelf.",
  },
];

const part2Office = [
  {
    prompt: "Where should I submit the reimbursement form?",
    audioText: "Where should I submit the reimbursement form? (A) To the accounting office on the second floor. (B) Yes, the form was very detailed. (C) I submitted the budget last quarter.",
    options: [
      "To the accounting office on the second floor.",
      "Yes, the form was very detailed.",
      "I submitted the budget last quarter.",
    ],
    correct: 0,
    explanation: "The question asks for a location, so a place-based response is correct.",
  },
  {
    prompt: "When will the new printer be installed?",
    audioText: "When will the new printer be installed? (A) Near the supply cabinet. (B) The technician is coming tomorrow morning. (C) No, I printed it already.",
    options: [
      "Near the supply cabinet.",
      "The technician is coming tomorrow morning.",
      "No, I printed it already.",
    ],
    correct: 1,
    explanation: "The question asks about time, and tomorrow morning answers it directly.",
  },
  {
    prompt: "Who approved the design proposal?",
    audioText: "Who approved the design proposal? (A) Our creative director signed off on it yesterday. (B) At the client presentation room. (C) It has three main sections.",
    options: [
      "Our creative director signed off on it yesterday.",
      "At the client presentation room.",
      "It has three main sections.",
    ],
    correct: 0,
    explanation: "The speaker asks about a person, so the answer must identify who.",
  },
  {
    prompt: "Could you send me the updated schedule?",
    audioText: "Could you send me the updated schedule? (A) Sure, I'll email it after this meeting. (B) On the wall by the elevators. (C) The schedule started last Monday.",
    options: [
      "Sure, I'll email it after this meeting.",
      "On the wall by the elevators.",
      "The schedule started last Monday.",
    ],
    correct: 0,
    explanation: "This is a request, so a natural agreement is the best response.",
  },
  {
    prompt: "Why is the lobby so crowded today?",
    audioText: "Why is the lobby so crowded today? (A) At the front entrance desk. (B) Yes, the crowd moved quickly. (C) A trade conference is starting this afternoon.",
    options: [
      "At the front entrance desk.",
      "Yes, the crowd moved quickly.",
      "A trade conference is starting this afternoon.",
    ],
    correct: 2,
    explanation: "The question asks for a reason, and the trade conference explains the situation.",
  },
];

const part2Travel = [
  {
    prompt: "Which gate are we boarding from?",
    audioText: "Which gate are we boarding from? (A) Gate twenty-three, near the bookstore. (B) In about twenty minutes. (C) Yes, the flight was delayed.",
    options: [
      "Gate twenty-three, near the bookstore.",
      "In about twenty minutes.",
      "Yes, the flight was delayed.",
    ],
    correct: 0,
    explanation: "The question asks for a gate location, so the gate number is the correct response.",
  },
  {
    prompt: "Didn't you reserve the hotel shuttle already?",
    audioText: "Didn't you reserve the hotel shuttle already? (A) Yes, I booked two seats this morning. (B) At the side entrance. (C) Because the luggage was heavy.",
    options: [
      "Yes, I booked two seats this morning.",
      "At the side entrance.",
      "Because the luggage was heavy.",
    ],
    correct: 0,
    explanation: "A yes/no confirmation is the most natural response here.",
  },
  {
    prompt: "How long will the ferry ride take?",
    audioText: "How long will the ferry ride take? (A) To the lower boarding ramp. (B) About forty-five minutes, according to the schedule. (C) Yes, the weather looks fine.",
    options: [
      "To the lower boarding ramp.",
      "About forty-five minutes, according to the schedule.",
      "Yes, the weather looks fine.",
    ],
    correct: 1,
    explanation: "The question asks for duration, so the time estimate is correct.",
  },
  {
    prompt: "Do you happen to know where the baggage claim office is?",
    audioText: "Do you happen to know where the baggage claim office is? (A) It closes at six o'clock. (B) She claimed the package yesterday. (C) It's beside carousel number four.",
    options: [
      "It closes at six o'clock.",
      "She claimed the package yesterday.",
      "It's beside carousel number four.",
    ],
    correct: 2,
    explanation: "The question asks for a location, and the response gives one.",
  },
  {
    prompt: "Why don't we take a taxi instead?",
    audioText: "Why don't we take a taxi instead? (A) That would save us some time. (B) At the airport exit. (C) The driver was polite.",
    options: [
      "That would save us some time.",
      "At the airport exit.",
      "The driver was polite.",
    ],
    correct: 0,
    explanation: "This is a suggestion, so agreeing with the idea is the best response.",
  },
];

const part2Service = [
  {
    prompt: "What seems to be the problem with the coffee machine?",
    audioText: "What seems to be the problem with the coffee machine? (A) It stopped heating the water. (B) Near the break room window. (C) I cleaned it yesterday afternoon.",
    options: [
      "It stopped heating the water.",
      "Near the break room window.",
      "I cleaned it yesterday afternoon.",
    ],
    correct: 0,
    explanation: "The question asks what the problem is, so the malfunction is the correct response.",
  },
  {
    prompt: "Could someone help me carry these boxes?",
    audioText: "Could someone help me carry these boxes? (A) On the top shelf. (B) Sure, I'll be right there. (C) They arrived this morning.",
    options: [
      "On the top shelf.",
      "Sure, I'll be right there.",
      "They arrived this morning.",
    ],
    correct: 1,
    explanation: "The speaker is requesting help, and agreeing to help is the best response.",
  },
  {
    prompt: "When are the store shelves being restocked?",
    audioText: "When are the store shelves being restocked? (A) By the evening shift, after six. (B) In the home goods section. (C) Yes, they look much neater now.",
    options: [
      "By the evening shift, after six.",
      "In the home goods section.",
      "Yes, they look much neater now.",
    ],
    correct: 0,
    explanation: "The question asks when, so the time-based response is correct.",
  },
  {
    prompt: "Who is covering the front desk this afternoon?",
    audioText: "Who is covering the front desk this afternoon? (A) The afternoon shift starts at one. (B) Ms. Tran is filling in until closing. (C) At the reception counter.",
    options: [
      "The afternoon shift starts at one.",
      "Ms. Tran is filling in until closing.",
      "At the reception counter.",
    ],
    correct: 1,
    explanation: "The question asks who, so the answer must identify a person.",
  },
  {
    prompt: "Should we call the technician now?",
    audioText: "Should we call the technician now? (A) Yes, before the office gets busier. (B) In the maintenance closet. (C) The repair manual is on the desk.",
    options: [
      "Yes, before the office gets busier.",
      "In the maintenance closet.",
      "The repair manual is on the desk.",
    ],
    correct: 0,
    explanation: "This yes/no suggestion is best answered by agreeing and giving a reason.",
  },
];

const part3Meetings = [
  {
    audioText: "Man: Have you finished the draft for the client newsletter?\nWoman: Almost. I just need to confirm the event dates with marketing.\nMan: Great. Please send it to me before lunch so I can review it.",
    question: "What does the woman still need to do?",
    options: [
      "Confirm the event dates.",
      "Call the printing company.",
      "Book the meeting room.",
      "Update the expense report.",
    ],
    correct: 0,
    explanation: "She says she still needs to confirm the event dates with marketing.",
  },
  {
    audioText: "Woman: The training seminar begins at ten, but the projector in Room B isn't turning on.\nMan: I'll ask IT to come up right away.\nWoman: Thanks. I'll seat the guests in Room A until it's fixed.",
    question: "What will the man most likely do next?",
    options: [
      "Contact the IT team.",
      "Move the guests to another floor.",
      "Replace the training materials.",
      "Call the caterer.",
    ],
    correct: 0,
    explanation: "The man says he will ask IT to come up right away.",
  },
  {
    audioText: "Man: Did the hotel confirm the conference lunch menu?\nWoman: Yes, and they can also provide vegetarian options.\nMan: Perfect. I'll update the attendee email before the meeting starts.",
    question: "What does the hotel say they can provide?",
    options: [
      "Vegetarian options.",
      "Free parking passes.",
      "Additional guest rooms.",
      "A later check-out time.",
    ],
    correct: 0,
    explanation: "The woman says the hotel can provide vegetarian options.",
  },
  {
    audioText: "Woman: Are we still meeting with the supplier at two?\nMan: Yes, but they asked if we could move to the smaller conference room.\nWoman: That's fine. I'll change the calendar invite now.",
    question: "What will the woman do next?",
    options: [
      "Update the meeting invitation.",
      "Call the supplier's driver.",
      "Print the revised contract.",
      "Prepare refreshments for the lobby.",
    ],
    correct: 0,
    explanation: "She says she will change the calendar invite now.",
  },
  {
    audioText: "Man: Why are there so many people in the lobby today?\nWoman: The regional training seminar begins at ten.\nMan: Right, I should move the welcome signs closer to the entrance.",
    question: "What does the man plan to do?",
    options: [
      "Move the welcome signs.",
      "Start the seminar early.",
      "Reserve another room.",
      "Call the security office.",
    ],
    correct: 0,
    explanation: "He says he should move the welcome signs closer to the entrance.",
  },
];

const part3Travel = [
  {
    audioText: "Woman: The shuttle to the convention center leaves in fifteen minutes.\nMan: Then I'd better finish checking out now.\nWoman: I'll wait for you by the hotel entrance with the brochures.",
    question: "Where will the woman wait?",
    options: [
      "By the hotel entrance.",
      "At the registration desk.",
      "Inside the conference hall.",
      "Near the airport counter.",
    ],
    correct: 0,
    explanation: "She says she will wait by the hotel entrance.",
  },
  {
    audioText: "Man: Is this the right line for the museum tour?\nWoman: Yes, but the afternoon group is full.\nMan: That's okay. I'll join the next one at three-thirty.",
    question: "What will the man most likely do?",
    options: [
      "Join the next tour later.",
      "Ask for a refund immediately.",
      "Take a taxi to another museum.",
      "Return to the ticket office tomorrow.",
    ],
    correct: 0,
    explanation: "He says he will join the next tour at three-thirty.",
  },
  {
    audioText: "Woman: Did you already pick up the rental car?\nMan: Not yet. The counter agent said there was a delay with the paperwork.\nWoman: In that case, let's get coffee while we wait.",
    question: "Why has the man not picked up the rental car yet?",
    options: [
      "The paperwork is delayed.",
      "The car was sent to another city.",
      "He changed the reservation time.",
      "The parking lot is closed.",
    ],
    correct: 0,
    explanation: "The agent said there was a delay with the paperwork.",
  },
  {
    audioText: "Man: The ferry terminal looks busier than usual.\nWoman: That's because two departures were combined this morning.\nMan: I see. Then we'd better line up near the ramp now.",
    question: "Why is the terminal busier than usual?",
    options: [
      "Two departures were combined.",
      "A tour group missed its shuttle.",
      "The weather caused a cancellation.",
      "A new route opened today.",
    ],
    correct: 0,
    explanation: "The woman explains that two departures were combined.",
  },
  {
    audioText: "Woman: Have you seen the updated city tour map?\nMan: Yes, they added the harbor district stop.\nWoman: Great. I'll mention that change to our guests before departure.",
    question: "What was added to the tour?",
    options: [
      "A stop in the harbor district.",
      "A free lunch voucher.",
      "An evening museum ticket.",
      "A hotel pickup service.",
    ],
    correct: 0,
    explanation: "The man says they added the harbor district stop.",
  },
];

const part3Service = [
  {
    audioText: "Man: The printer on the third floor is jammed again.\nWoman: I'll submit a service request right away.\nMan: Thanks. In the meantime, I'll use the one near reception.",
    question: "What will the woman do?",
    options: [
      "Submit a service request.",
      "Use the printer near reception.",
      "Move the printer upstairs.",
      "Order more paper.",
    ],
    correct: 0,
    explanation: "She says she will submit a service request right away.",
  },
  {
    audioText: "Woman: The courier brought three boxes, but the invoice says four.\nMan: Then one carton must still be on the truck.\nWoman: I'll go downstairs and check with the driver.",
    question: "What does the woman plan to do?",
    options: [
      "Check with the driver downstairs.",
      "Rewrite the invoice herself.",
      "Return all three boxes.",
      "Call the accounting department.",
    ],
    correct: 0,
    explanation: "She says she will go downstairs and check with the driver.",
  },
  {
    audioText: "Man: I noticed the break room refrigerator is almost empty.\nWoman: That's because the beverage order is coming this afternoon.\nMan: Good. I'll wait until then before buying anything.",
    question: "What are the speakers mainly discussing?",
    options: [
      "A beverage delivery.",
      "A room reservation.",
      "A software update.",
      "A delayed flight.",
    ],
    correct: 0,
    explanation: "They are discussing the beverage order arriving later today.",
  },
  {
    audioText: "Woman: The store display by the entrance looks unfinished.\nMan: You're right. I'll bring over the remaining signs from storage.\nWoman: Thanks, and I'll straighten the product boxes while you do that.",
    question: "What will the man most likely do next?",
    options: [
      "Bring signs from storage.",
      "Move the display to the back room.",
      "Count the cash drawers.",
      "Call the regional manager.",
    ],
    correct: 0,
    explanation: "He says he will bring over the remaining signs from storage.",
  },
  {
    audioText: "Man: Have the samples for tomorrow's trade show arrived?\nWoman: Yes, but two of the display stands were missing.\nMan: Then I'll call the vendor before they close.",
    question: "Why will the man call the vendor?",
    options: [
      "Some display stands were missing.",
      "The samples arrived too late.",
      "The event was canceled.",
      "The shipment went to the wrong address.",
    ],
    correct: 0,
    explanation: "He plans to call because two of the display stands were missing.",
  },
];

const part4Announcements = [
  {
    audioText: "Good morning, everyone. Before today's training begins, please sign the attendance sheet near the door and pick up a revised agenda from the registration table. We'll start with the software demonstration in ten minutes.",
    question: "What should listeners do first?",
    options: [
      "Sign the attendance sheet.",
      "Move to the software lab.",
      "Call the registration desk.",
      "Return the revised agenda.",
    ],
    correct: 0,
    explanation: "The speaker first instructs listeners to sign the attendance sheet.",
  },
  {
    audioText: "Attention passengers traveling to Seattle on Flight 282. Boarding will begin at Gate 14 in approximately fifteen minutes. Please have your boarding passes and identification ready at the gate area.",
    question: "What are passengers asked to prepare?",
    options: [
      "Their boarding passes and identification.",
      "Their checked baggage receipts.",
      "Their hotel confirmations.",
      "Their customs declaration forms.",
    ],
    correct: 0,
    explanation: "The announcement asks passengers to have their boarding passes and identification ready.",
  },
  {
    audioText: "This is a reminder that the warehouse will be closed for inventory counting tomorrow from 8 a.m. until noon. During that time, no outgoing shipments will be processed, so please schedule pickups for the afternoon.",
    question: "Why will no outgoing shipments be processed in the morning?",
    options: [
      "The warehouse will be counting inventory.",
      "The loading dock is under repair.",
      "The delivery drivers are on strike.",
      "The shipment software is being replaced.",
    ],
    correct: 0,
    explanation: "The warehouse is closed for inventory counting during that period.",
  },
  {
    audioText: "Good evening, shoppers. The store will close in fifteen minutes. Please bring your final selections to the registers at the front of the store. Our customer service counter will reopen tomorrow at nine a.m.",
    question: "What will reopen tomorrow at nine?",
    options: [
      "The customer service counter.",
      "The clothing department.",
      "The delivery entrance.",
      "The parking garage.",
    ],
    correct: 0,
    explanation: "The speaker specifically says that the customer service counter will reopen tomorrow at nine.",
  },
  {
    audioText: "On behalf of the hotel management, we'd like to thank you for attending tonight's awards banquet. Valet tickets can be redeemed at the front entrance, and a shuttle to the train station will depart every twenty minutes until midnight.",
    question: "How often will the shuttle depart?",
    options: [
      "Every twenty minutes.",
      "Every thirty minutes.",
      "Once an hour.",
      "Only at midnight.",
    ],
    correct: 0,
    explanation: "The speaker says the shuttle to the train station departs every twenty minutes.",
  },
];

const part4Business = [
  {
    audioText: "Welcome to the Lakeside Hotel. Breakfast is served on the second floor from six-thirty to ten, and the fitness center is open twenty-four hours a day with your room key card. If you need assistance, please contact the front desk at any time.",
    question: "What is said about the fitness center?",
    options: [
      "It is open all day and night.",
      "It requires an extra fee.",
      "It is located in the lobby.",
      "It closes at ten o'clock.",
    ],
    correct: 0,
    explanation: "The speaker says the fitness center is open twenty-four hours a day.",
  },
  {
    audioText: "This is a message for all conference attendees. The keynote speech has been delayed by twenty minutes because of a transportation issue affecting the guest speaker. In the meantime, refreshments are available in the exhibition hall.",
    question: "Why has the keynote speech been delayed?",
    options: [
      "The guest speaker has a transportation problem.",
      "The exhibition hall is still being prepared.",
      "The sound system needs repairs.",
      "Registration lines are too long.",
    ],
    correct: 0,
    explanation: "The announcement states the delay is due to a transportation issue affecting the guest speaker.",
  },
  {
    audioText: "Attention store employees. The regional manager will visit this branch at eleven today. Please ensure that the entrance displays are fully stocked and that all price labels in the electronics section have been updated before she arrives.",
    question: "What should employees check in the electronics section?",
    options: [
      "That the price labels are updated.",
      "That the floor has been cleaned.",
      "That the music volume is lower.",
      "That the fitting rooms are unlocked.",
    ],
    correct: 0,
    explanation: "Employees are told to ensure that the electronics price labels are updated.",
  },
  {
    audioText: "Hello, everyone. Because several speakers are attending remotely, today's workshop will be streamed in Conference Room B instead of Room A. Staff members are placing additional chairs in the new room right now.",
    question: "Why has the workshop been moved?",
    options: [
      "It will be streamed for remote speakers.",
      "Conference Room A is too small for attendees.",
      "Lunch will be served in Room A.",
      "The workshop has been postponed.",
    ],
    correct: 0,
    explanation: "The workshop is being streamed because several speakers are remote.",
  },
  {
    audioText: "This is an announcement for all staff on the third floor. The air-conditioning system will be shut down for maintenance between one and three this afternoon. If possible, please relocate to one of the conference rooms on the second floor during that period.",
    question: "Why may employees need to relocate?",
    options: [
      "The air-conditioning system will be shut down.",
      "The third floor meeting rooms are full.",
      "A fire drill is scheduled.",
      "The office furniture is being delivered.",
    ],
    correct: 0,
    explanation: "Employees may relocate because the air-conditioning system will be shut down for maintenance.",
  },
];

const part4PublicInfo = [
  {
    audioText: "Due to heavy rain in the downtown area, tonight's outdoor concert will be moved into the Riverside Convention Hall. Doors will open at six-thirty, and all previously issued tickets will remain valid.",
    question: "What has changed?",
    options: [
      "The concert location.",
      "The ticket price.",
      "The start time.",
      "The featured performer.",
    ],
    correct: 0,
    explanation: "The announcement explains that the concert has been moved indoors.",
  },
  {
    audioText: "Thank you for joining today's museum tour. In a few minutes, we'll move into the modern design gallery on the third floor. Photography is allowed there, but please do not use flash because it may damage the artwork.",
    question: "What are visitors told not to do?",
    options: [
      "Use flash photography.",
      "Enter the third floor gallery.",
      "Ask questions during the tour.",
      "Carry bags into the exhibit.",
    ],
    correct: 0,
    explanation: "The guide says that flash photography should not be used.",
  },
  {
    audioText: "Please note that the museum cafe is temporarily closed for equipment repairs. However, bottled drinks and packaged snacks are available from the kiosk beside the main gift shop until the cafe reopens tomorrow morning.",
    question: "Where can visitors buy snacks today?",
    options: [
      "At the kiosk beside the gift shop.",
      "At the museum cafe.",
      "At the reception desk.",
      "In the staff lounge.",
    ],
    correct: 0,
    explanation: "The announcement directs visitors to the kiosk beside the main gift shop.",
  },
  {
    audioText: "Good afternoon. This is the final boarding call for passengers on the Harbor Express ferry to Bayview Island. The vessel will depart in five minutes, so please proceed immediately to the lower boarding ramp.",
    question: "What are passengers asked to do?",
    options: [
      "Proceed immediately to the lower boarding ramp.",
      "Wait for another departure announcement.",
      "Pick up tickets at the service desk.",
      "Store their luggage in the main hall.",
    ],
    correct: 0,
    explanation: "The final boarding call tells passengers to go directly to the lower boarding ramp.",
  },
  {
    audioText: "This is a message for all delivery drivers scheduled for Route 6. Due to road construction on Carlton Avenue, please use the western service road and allow an additional twenty minutes for travel this afternoon.",
    question: "What are drivers told to do?",
    options: [
      "Use the western service road.",
      "Return to the depot immediately.",
      "Switch to Route 8 instead.",
      "Wait for construction to finish.",
    ],
    correct: 0,
    explanation: "The route adjustment is to use the western service road.",
  },
];

export const TOEIC_LISTENING_PRACTICE_MODES = [
  {
    id: "part1-picture",
    label: "Part 1",
    title: "Picture Description",
    desc: "Xem hình, nghe bốn câu mô tả và chọn đáp án A/B/C/D đúng nhất với bức ảnh.",
    icon: "🖼️",
    topics: [
      buildTopic("pb-office", "Office routines", "Reception, meetings, and daily office scenes.", "🏢", "part1-picture", part1Office),
      buildTopic("pb-travel", "Travel moments", "Airport, hotel, and transportation visuals.", "✈️", "part1-picture", part1Travel),
      buildTopic("pb-retail", "Retail services", "Store, checkout, and customer service scenes.", "🛍️", "part1-picture", part1Retail),
    ],
  },
  {
    id: "part2-response",
    label: "Part 2",
    title: "Question-Response",
    desc: "Nghe một câu hỏi hoặc câu nói ngắn, rồi chọn phản hồi A/B/C phù hợp nhất.",
    icon: "💬",
    topics: [
      buildTopic("p2-office", "Office responses", "Workplace questions, requests, and short responses.", "🏢", "part2-response", part2Office),
      buildTopic("p2-travel", "Travel responses", "Airport, hotel, and transportation response practice.", "🚕", "part2-response", part2Travel),
      buildTopic("p2-service", "Service responses", "Retail, maintenance, and support conversations.", "🛎️", "part2-response", part2Service),
    ],
  },
  {
    id: "part3-conversations",
    label: "Part 3",
    title: "Conversations",
    desc: "Nghe đoạn hội thoại ngắn và trả lời câu hỏi trắc nghiệm A/B/C/D về nội dung vừa nghe.",
    icon: "🗣️",
    topics: [
      buildTopic("p3-meetings", "Meetings and planning", "Seminars, schedules, and business coordination.", "📊", "part3-conversations", part3Meetings),
      buildTopic("p3-travel", "Travel arrangements", "Shuttle, tours, ferry, and transport conversations.", "🧳", "part3-conversations", part3Travel),
      buildTopic("p3-service", "Service issues", "Maintenance, deliveries, and customer-service situations.", "🛠️", "part3-conversations", part3Service),
    ],
  },
  {
    id: "part4-talks",
    label: "Part 4",
    title: "Talks",
    desc: "Nghe bài nói hoặc thông báo ngắn của một người và chọn đáp án A/B/C/D đúng nhất.",
    icon: "📢",
    topics: [
      buildTopic("p4-announcements", "Announcements", "Boarding, training, warehouse, and event announcements.", "📣", "part4-talks", part4Announcements),
      buildTopic("p4-business", "Business notices", "Conference, store, hotel, and workplace notices.", "🏨", "part4-talks", part4Business),
      buildTopic("p4-public", "Public information", "Museum, concert, ferry, and route updates.", "📰", "part4-talks", part4PublicInfo),
    ],
  },
];

const part1PracticeMode = TOEIC_LISTENING_PRACTICE_MODES.find((mode) => mode.id === "part1-picture");

if (part1PracticeMode) {
  part1PracticeMode.topics = [
    buildListeningTestPart1Topic("listening-test-1", "listening-practice-1", "Tài liệu 1", "6 câu đầu của Listening Test Đề 1 Part 1.", "📘"),
    buildListeningTestPart1Topic("listening-test-2", "listening-practice-2", "Tài liệu 2", "6 câu đầu của Listening Test Đề 2 Part 1.", "📙"),
  ];
}

const part2PracticeMode = TOEIC_LISTENING_PRACTICE_MODES.find((mode) => mode.id === "part2-response");

if (part2PracticeMode) {
  part2PracticeMode.topics = [
    buildListeningTestTopic("listening-test-1", "PART 2", "part1", "listening-response-1", "Tài liệu 1", "25 câu của Listening Test Đề 1 Part 2.", "📘", "part2-response"),
    buildListeningTestTopic("listening-test-2", "PART 2", "part1", "listening-response-2", "Tài liệu 2", "25 câu của Listening Test Đề 2 Part 2.", "📙", "part2-response"),
  ];
}

const part3PracticeMode = TOEIC_LISTENING_PRACTICE_MODES.find((mode) => mode.id === "part3-conversations");

if (part3PracticeMode) {
  part3PracticeMode.topics = [
    buildListeningTestTopic("listening-test-1", "PART 3", "part2", "listening-conversations-1", "Tài liệu 1", "39 câu của Listening Test Đề 1 Part 3.", "📘", "part3-conversations"),
    buildListeningTestTopic("listening-test-2", "PART 3", "part2", "listening-conversations-2", "Tài liệu 2", "39 câu của Listening Test Đề 2 Part 3.", "📙", "part3-conversations"),
  ];
}

const part4PracticeMode = TOEIC_LISTENING_PRACTICE_MODES.find((mode) => mode.id === "part4-talks");

if (part4PracticeMode) {
  part4PracticeMode.topics = [
    buildListeningTestTopic("listening-test-1", "PART 4", "part3", "listening-talks-1", "Tài liệu 1", "30 câu của Listening Test Đề 1 Part 4.", "📘", "part4-talks"),
    buildListeningTestTopic("listening-test-2", "PART 4", "part3", "listening-talks-2", "Tài liệu 2", "30 câu của Listening Test Đề 2 Part 4.", "📙", "part4-talks"),
  ];
}
