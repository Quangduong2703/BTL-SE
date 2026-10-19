export function mapApiTestToFrontendFormat(apiTest) {
  const allQs = [];
  
  if (apiTest.groups) {
    apiTest.groups.forEach(g => {
      if (g.questions) {
        g.questions.forEach(q => {
          allQs.push({ ...q, audioUrl: q.audio_url || g.audio_url, imageUrl: q.image_url || g.image_url, sharedPassage: g.passage_text });
        });
      }
    });
  }
  
  if (apiTest.single_questions) {
    apiTest.single_questions.forEach(q => {
      allQs.push({ ...q, audioUrl: q.audio_url, imageUrl: q.image_url });
    });
  }

  // Sort by question number
  allQs.sort((a, b) => a.question_number - b.question_number);

  // Normalize questions
  const normalizedQs = allQs.map(q => {
    let options = [];
    try {
      const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      options = Object.keys(parsed).map(k => ({ key: k, text: parsed[k] }));
    } catch (e) { }

    const correctIndex = options.findIndex(
      o => o.key.trim().toUpperCase() === q.correct_answer?.trim().toUpperCase()
    );
    
    return {
      id: `ft-${q.id}`,
      displayNumber: q.question_number,
      skill: q.part <= 4 ? "Listening" : "Reading",
      toeicPart: `PART ${q.part}`,
      partLabel: `PART ${q.part}`,
      prompt: q.question_text || "",
      passage: q.sharedPassage || "",
      imageUrl: q.imageUrl || "",
      audioUrl: q.audioUrl || "",
      instruction: "",
      options: options.map(o => o.text), // TOEIC.jsx expects array of strings for FullTest, or array of objects for normal?
      // Wait, let's look at normalizeListeningQuestionsForFullTest: options: [opt.text]
      // And in normal sections: options: [{key, text}]
      rawOptions: options,
      correctKey: q.correct_answer,
      correct: correctIndex >= 0 ? correctIndex : 0,
      explanation: "",
    };
  });

  // Group into sections
  const listeningQs = normalizedQs.filter(q => q.skill === "Listening");
  const readingQs = normalizedQs.filter(q => q.skill === "Reading");

  const listeningSections = [
    {
      id: 'part12',
      label: 'Part 1 & 2',
      title: 'Listening Part 1 + Part 2',
      desc: '31 câu đầu tiên.',
      questionCount: listeningQs.filter(q => q.toeicPart === 'PART 1' || q.toeicPart === 'PART 2').length,
      questions: listeningQs.filter(q => q.toeicPart === 'PART 1' || q.toeicPart === 'PART 2').map(q => ({...q, options: q.rawOptions}))
    },
    {
      id: 'part3',
      label: 'Part 3',
      title: 'Listening Part 3',
      desc: '39 câu hội thoại.',
      questionCount: listeningQs.filter(q => q.toeicPart === 'PART 3').length,
      questions: listeningQs.filter(q => q.toeicPart === 'PART 3').map(q => ({...q, options: q.rawOptions}))
    },
    {
      id: 'part4',
      label: 'Part 4',
      title: 'Listening Part 4',
      desc: '30 câu bài nói.',
      questionCount: listeningQs.filter(q => q.toeicPart === 'PART 4').length,
      questions: listeningQs.filter(q => q.toeicPart === 'PART 4').map(q => ({...q, options: q.rawOptions}))
    }
  ].filter(s => s.questionCount > 0);

  const readingSections = [
    {
      id: 'part56',
      label: 'Part 5 & 6',
      title: 'Reading Part 5 + Part 6',
      desc: '46 câu đầu tiên.',
      questionCount: readingQs.filter(q => q.toeicPart === 'PART 5' || q.toeicPart === 'PART 6').length,
      questions: readingQs.filter(q => q.toeicPart === 'PART 5' || q.toeicPart === 'PART 6').map(q => ({...q, options: q.rawOptions}))
    },
    {
      id: 'part7',
      label: 'Part 7',
      title: 'Reading Part 7',
      desc: '54 câu đọc hiểu.',
      questionCount: readingQs.filter(q => q.toeicPart === 'PART 7').length,
      questions: readingQs.filter(q => q.toeicPart === 'PART 7').map(q => ({...q, options: q.rawOptions}))
    }
  ].filter(s => s.questionCount > 0);

  return {
    normalizedQs,
    listeningSections,
    readingSections
  };
}
