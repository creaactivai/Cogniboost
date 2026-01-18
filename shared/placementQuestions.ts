export interface PlacementQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  skill: "grammar" | "vocabulary" | "reading";
}

export const placementQuestions: PlacementQuestion[] = [
  // A1 - Elementary (Questions 1-6)
  {
    id: "a1_1",
    text: "She _____ from Mexico.",
    options: ["is", "are", "am", "be"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },
  {
    id: "a1_2", 
    text: "I _____ coffee every morning.",
    options: ["drink", "drinks", "drinking", "drank"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },
  {
    id: "a1_3",
    text: "_____ are you from?",
    options: ["Where", "What", "Who", "When"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },
  {
    id: "a1_4",
    text: "My brother _____ 25 years old.",
    options: ["is", "have", "has", "are"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },
  {
    id: "a1_5",
    text: "They _____ students at the university.",
    options: ["are", "is", "am", "be"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },
  {
    id: "a1_6",
    text: "I _____ a teacher. I work at a school.",
    options: ["am", "is", "are", "be"],
    correctAnswer: 0,
    difficulty: "A1",
    skill: "grammar"
  },

  // A2 - Pre-Intermediate (Questions 7-12)
  {
    id: "a2_1",
    text: "I _____ to the cinema last night.",
    options: ["went", "go", "going", "gone"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },
  {
    id: "a2_2",
    text: "She _____ dinner when the phone rang.",
    options: ["was cooking", "cooked", "cooks", "is cooking"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },
  {
    id: "a2_3",
    text: "I have _____ been to Paris. It's beautiful!",
    options: ["already", "yet", "still", "never"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },
  {
    id: "a2_4",
    text: "There isn't _____ milk in the fridge.",
    options: ["any", "some", "a", "the"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },
  {
    id: "a2_5",
    text: "My car is _____ than yours.",
    options: ["faster", "more fast", "most fast", "fastest"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },
  {
    id: "a2_6",
    text: "You _____ study harder if you want to pass the exam.",
    options: ["should", "can", "may", "might"],
    correctAnswer: 0,
    difficulty: "A2",
    skill: "grammar"
  },

  // B1 - Intermediate (Questions 13-18)
  {
    id: "b1_1",
    text: "If I _____ more money, I would buy a new car.",
    options: ["had", "have", "has", "having"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },
  {
    id: "b1_2",
    text: "She asked me where I _____.",
    options: ["lived", "live", "am living", "living"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },
  {
    id: "b1_3",
    text: "The book _____ by millions of people around the world.",
    options: ["has been read", "has read", "is reading", "reads"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },
  {
    id: "b1_4",
    text: "I wish I _____ speak French fluently.",
    options: ["could", "can", "would", "should"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },
  {
    id: "b1_5",
    text: "By the time we arrived, the movie _____.",
    options: ["had already started", "already started", "has already started", "is starting"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },
  {
    id: "b1_6",
    text: "She _____ working here for five years next month.",
    options: ["will have been", "has been", "is", "was"],
    correctAnswer: 0,
    difficulty: "B1",
    skill: "grammar"
  },

  // B2 - Upper Intermediate (Questions 19-24)
  {
    id: "b2_1",
    text: "If I had known about the problem, I _____ something about it.",
    options: ["would have done", "would do", "will do", "had done"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },
  {
    id: "b2_2",
    text: "The manager insisted _____ the report by Friday.",
    options: ["on having", "to have", "having", "for having"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },
  {
    id: "b2_3",
    text: "Not only _____ late, but he also forgot to bring the documents.",
    options: ["was he", "he was", "did he be", "he is"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },
  {
    id: "b2_4",
    text: "She would rather you _____ tell anyone about the surprise party.",
    options: ["didn't", "don't", "won't", "wouldn't"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },
  {
    id: "b2_5",
    text: "_____ the rain, we decided to go ahead with the picnic.",
    options: ["Despite", "Although", "Even", "However"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },
  {
    id: "b2_6",
    text: "The more you practice, _____ you will become.",
    options: ["the better", "better", "the best", "more better"],
    correctAnswer: 0,
    difficulty: "B2",
    skill: "grammar"
  },

  // C1 - Advanced (Questions 25-30)
  {
    id: "c1_1",
    text: "Had it not been for her quick thinking, the situation _____ much worse.",
    options: ["could have been", "would be", "could be", "had been"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },
  {
    id: "c1_2",
    text: "The proposal was turned down _____ grounds that it was too expensive.",
    options: ["on the", "in the", "at the", "by the"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },
  {
    id: "c1_3",
    text: "She gave _____ impression of being completely unaware of the situation.",
    options: ["every", "all", "any", "some"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },
  {
    id: "c1_4",
    text: "Under no circumstances _____ leave the building without permission.",
    options: ["should you", "you should", "could you", "you could"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },
  {
    id: "c1_5",
    text: "The research findings _____ be published by the end of the year.",
    options: ["are due to", "are bound to", "are likely", "are about"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },
  {
    id: "c1_6",
    text: "Were it not for the scholarship, she _____ afford to attend university.",
    options: ["would not be able to", "will not be able to", "is not able to", "was not able to"],
    correctAnswer: 0,
    difficulty: "C1",
    skill: "grammar"
  },

  // C2 - Proficient (Questions 31-36)
  {
    id: "c2_1",
    text: "The politician's speech was so full of _____ that nobody could understand his actual position.",
    options: ["circumlocution", "brevity", "clarity", "concision"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "vocabulary"
  },
  {
    id: "c2_2",
    text: "His argument, _____ sound on the surface, failed to address the underlying issues.",
    options: ["albeit", "despite", "although", "whereas"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "grammar"
  },
  {
    id: "c2_3",
    text: "The new regulations have _____ far-reaching implications for the industry.",
    options: ["ostensibly", "manifestly", "purportedly", "seemingly"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "vocabulary"
  },
  {
    id: "c2_4",
    text: "Little _____ that his decision would lead to such controversy.",
    options: ["did he realize", "he realized", "he did realize", "realized he"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "grammar"
  },
  {
    id: "c2_5",
    text: "The _____ nature of the negotiations made it difficult to predict the outcome.",
    options: ["protracted", "abbreviated", "curtailed", "truncated"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "vocabulary"
  },
  {
    id: "c2_6",
    text: "The scientist's hypothesis, _____ initially met with skepticism, has since been validated.",
    options: ["which was", "that was", "being", "having been"],
    correctAnswer: 0,
    difficulty: "C2",
    skill: "grammar"
  }
];

// Function to select questions for a placement test
// Returns 20 questions: balanced across difficulty levels
export function selectQuizQuestions(totalQuestions: number = 20): PlacementQuestion[] {
  const selected: PlacementQuestion[] = [];
  const difficulties: Array<"A1" | "A2" | "B1" | "B2" | "C1" | "C2"> = ["A1", "A2", "B1", "B2", "C1", "C2"];
  
  // Get questions by difficulty
  const questionsByDifficulty: Record<string, PlacementQuestion[]> = {};
  for (const diff of difficulties) {
    questionsByDifficulty[diff] = placementQuestions.filter(q => q.difficulty === diff);
  }
  
  // For 20 questions: 3 from A1, 3 from A2, 4 from B1, 4 from B2, 3 from C1, 3 from C2
  const distribution: Record<string, number> = {
    "A1": Math.ceil(totalQuestions * 0.15),
    "A2": Math.ceil(totalQuestions * 0.15),
    "B1": Math.ceil(totalQuestions * 0.20),
    "B2": Math.ceil(totalQuestions * 0.20),
    "C1": Math.ceil(totalQuestions * 0.15),
    "C2": Math.ceil(totalQuestions * 0.15)
  };
  
  // Select random questions from each difficulty
  for (const diff of difficulties) {
    const pool = [...questionsByDifficulty[diff]];
    const count = Math.min(distribution[diff], pool.length);
    
    for (let i = 0; i < count && selected.length < totalQuestions; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      selected.push(pool.splice(randomIndex, 1)[0]);
    }
  }
  
  // Shuffle the final selection
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  
  return selected.slice(0, totalQuestions);
}

// Calculate placement level based on correct answers
export function calculatePlacementLevel(answers: Array<{ questionId: string; selectedAnswer: number; isCorrect: boolean }>): {
  level: string;
  confidence: "high" | "medium" | "low";
  correctCount: number;
  totalQuestions: number;
} {
  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalQuestions = answers.length;
  const percentage = (correctCount / totalQuestions) * 100;
  
  // Count correct answers by difficulty
  const correctByDifficulty: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  const totalByDifficulty: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  
  for (const answer of answers) {
    const question = placementQuestions.find(q => q.id === answer.questionId);
    if (question) {
      totalByDifficulty[question.difficulty]++;
      if (answer.isCorrect) {
        correctByDifficulty[question.difficulty]++;
      }
    }
  }
  
  // Calculate level based on overall percentage and performance at each level
  let level: string;
  let confidence: "high" | "medium" | "low";
  
  // Simple percentage-based scoring
  if (percentage >= 90) {
    level = "C2";
    confidence = "high";
  } else if (percentage >= 80) {
    level = "C1";
    confidence = percentage >= 85 ? "high" : "medium";
  } else if (percentage >= 70) {
    level = "B2";
    confidence = percentage >= 75 ? "high" : "medium";
  } else if (percentage >= 55) {
    level = "B1";
    confidence = percentage >= 60 ? "high" : "medium";
  } else if (percentage >= 40) {
    level = "A2";
    confidence = percentage >= 45 ? "high" : "medium";
  } else if (percentage >= 20) {
    level = "A1";
    confidence = percentage >= 30 ? "medium" : "low";
  } else {
    level = "A0";
    confidence = "medium";
  }
  
  return { level, confidence, correctCount, totalQuestions };
}
