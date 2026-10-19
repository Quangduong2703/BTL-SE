// Simplified standard TOEIC mapping table
// Maps the raw score (number of correct answers 0-100) to the scaled score (5-495)

function getListeningScaledScore(rawScore) {
  if (rawScore < 0) rawScore = 0;
  if (rawScore > 100) rawScore = 100;
  
  // Standardized mapping approximation
  if (rawScore >= 93) return 495; // usually 93-100 gives 495 in listening
  if (rawScore <= 6) return 5;
  
  // Linear approximation for the rest (this is an approximation of the real complex table)
  return Math.round(5 + ((rawScore - 6) / 87) * 490 / 5) * 5;
}

function getReadingScaledScore(rawScore) {
  if (rawScore < 0) rawScore = 0;
  if (rawScore > 100) rawScore = 100;

  // Standardized mapping approximation
  if (rawScore >= 97) return 495; // Reading needs more correct answers to get 495
  if (rawScore <= 9) return 5;
  
  // Linear approximation for the rest
  return Math.round(5 + ((rawScore - 9) / 88) * 490 / 5) * 5;
}

module.exports = {
  getListeningScaledScore,
  getReadingScaledScore
};
