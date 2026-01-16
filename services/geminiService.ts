
import { GoogleGenAI, Type } from "@google/genai";
import { GradeLevel, QuizQuestion, DifficultyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuizQuestions = async (
  subject: string,
  topic: string, // Can be a single topic or comma-separated list
  grade: GradeLevel,
  count: number = 5,
  difficultyLevel: DifficultyLevel = 'medium'
): Promise<QuizQuestion[]> => {
  
  const isMixedReview = topic.includes(',');

  const prompt = `Generate ${count} multiple-choice questions in Hebrew (עברית) for a student in ${grade}.
  Subject: ${subject}
  Topic(s): ${topic}
  Target Difficulty Level: ${difficultyLevel.toUpperCase()}
  
  ${isMixedReview ? 'This is a FINAL REVIEW for a test. Please generate a mix of questions covering ALL the provided topics evenly.' : ''}

  Make the questions age-appropriate. 
  For 1st-3rd grade, use simple language.
  
  If Difficulty is 'EASY': Focus on basics, simple definitions, and straightforward calculations.
  If Difficulty is 'MEDIUM': Combine concepts, standard curriculum level.
  If Difficulty is 'HARD': Include critical thinking, multi-step problems, or advanced vocabulary for the grade.
  
  IMPORTANT FOR MATH (${subject}):
  - If the subject is Math/Arithmetic, format the 'questionText' as a clear equation or problem when possible (e.g., "25 + 15 = ?" or "3 x ? = 12"). 
  - Minimize wordy narratives for math unless it's a specific word problem topic.
  - Use standard mathematical symbols (+, -, x, /, =).
  
  Ensure there is exactly one correct answer per question.
  Provide a short, encouraging explanation for the answer in Hebrew.
  Provide a 'tip' (hint) that can help the student answer the question without giving away the answer directly.
  
  Important: The output JSON must be valid. Ensure all text (questions, options, explanations, tips) is in Hebrew.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The question prompt. For math, keep it visual (e.g. 5 + 5 = ?)" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of 4 possible answers in Hebrew"
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "Index (0-3) of the correct answer" },
              explanation: { type: Type.STRING, description: "Short explanation suitable for the child's age in Hebrew" },
              tip: { type: Type.STRING, description: "A helpful hint or tip for the child" },
              difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
            },
            required: ["questionText", "options", "correctAnswerIndex", "explanation", "difficulty"]
          }
        }
      }
    });

    if (response.text) {
      const questions = JSON.parse(response.text) as QuizQuestion[];
      return questions;
    }
    
    throw new Error("No data returned from Gemini");

  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const generateExamRecommendations = async (
  subject: string,
  topics: string[],
  questions: QuizQuestion[],
  userAnswers: number[]
): Promise<string[]> => {
  
  // Construct a summary of performance
  let summary = "";
  let correctCount = 0;
  
  questions.forEach((q, idx) => {
    const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
    if (isCorrect) correctCount++;
    summary += `Q: ${q.questionText} | Topic/Context: ${q.difficulty} | Result: ${isCorrect ? 'Correct' : 'Incorrect'}\n`;
  });

  const prompt = `
  You are a friendly, encouraging teacher in Israel. A student just finished a practice exam before their real test.
  Subject: ${subject}
  Topics Covered: ${topics.join(', ')}
  Score: ${correctCount}/${questions.length}

  Performance Detail:
  ${summary}

  Please provide exactly 3 short, specific, and encouraging recommendations (in Hebrew) for the student to remember during their exam tomorrow.
  
  Rules:
  1. If they made mistakes in a specific type of question, advise them to double-check that.
  2. If they got everything right, tell them to trust themselves and stay calm.
  3. Keep the tone warm and empowering (like "Don't forget to check the plus sign!").
  4. Return ONLY a JSON array of 3 strings.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
    return [
      "קראו את השאלות לאט ובזהירות",
      "בידקו שוב את התשובות לפני ההגשה",
      "האמינו בעצמכם, אתם יודעים את החומר!"
    ];
  } catch (e) {
    console.error("Error generating recommendations", e);
    return [
      "קראו את השאלות לאט ובזהירות",
      "בידקו שוב את התשובות לפני ההגשה",
      "האמינו בעצמכם, אתם יודעים את החומר!"
    ];
  }
};

export const analyzeMistakesAndGenerateTopics = async (
  subject: string,
  mistakes: { question: string, wrongAnswer: string }[]
): Promise<string[]> => {
  const mistakesText = mistakes.map(m => `Question: ${m.question} | Student Wrong Answer: ${m.wrongAnswer}`).join('\n');

  const prompt = `
  A student made the following mistakes in a ${subject} exam. 
  Identify the specific micro-topics or concepts they are struggling with based on these errors.
  
  Mistakes:
  ${mistakesText}

  Return a JSON array of 2-3 specific topics (in Hebrew) that they should practice to fix these specific errors.
  E.g. if they missed "1/2 + 1/3", return ["חיבור שברים עם מכנים שונים"].
  Keep it short and focused.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
    return [`חיזוק ${subject}`];
  } catch (error) {
    console.error("Error analyzing mistakes:", error);
    return [`חיזוק ${subject}`];
  }
};

export const extractTopicsFromInput = async (text: string, imageBase64?: string, mimeType?: string): Promise<string[]> => {
  const parts: any[] = [];

  // Add image if provided
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    });
  }

  // Add text prompt
  parts.push({
    text: `
    Analyze the provided content (text and/or image). This content represents study material, a worksheet, or a message from a teacher about an upcoming test.
    
    User Text Context: "${text}"
    
    Instructions:
    1. Identify the specific study topics or vocabulary lists.
    2. If an image is provided, OCR the text and analyze the *style* of questions or specific words listed.
    3. Return a clean list of strings in Hebrew describing the topics.
    4. Be specific. Instead of just "Math", say "Multiplication of fractions" or "Word problems with apples".
    5. If there is a vocabulary list (English/Hebrew), include a topic like "Vocabulary: [First 3 words]..." so we know to practice those.
    6. Ignore administrative details.
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash is great for multimodal
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
    return [];
  } catch (error) {
    console.error("Error extracting topics:", error);
    return [];
  }
};
