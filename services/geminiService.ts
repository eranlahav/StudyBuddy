/**
 * Gemini AI Service for Quiz Generation
 *
 * Handles all AI-powered features using Google's Gemini API:
 * - Quiz question generation
 * - Exam recommendations
 * - Mistake analysis
 * - Topic extraction from images/text
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  GradeLevel,
  QuizQuestion,
  DifficultyLevel,
  Subject,
  EvaluationType,
  ExtractedSkill,
  ExtractedQuestion,
  proficiencyToDifficulty
} from "../types";
import { logger, retry, QuizGenerationError, TopicExtractionError, EvaluationAnalysisError, hasApiKey } from "../lib";

// Initialize AI client with API key from environment
// The key is injected by Vite's define config from GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Default retry options for AI calls
const AI_RETRY_OPTIONS = {
  maxRetries: 2,
  initialDelayMs: 1000,
  context: 'GeminiService'
};

// Default fallback recommendations (Hebrew)
const DEFAULT_RECOMMENDATIONS = [
  "קראו את השאלות לאט ובזהירות",
  "בידקו שוב את התשובות לפני ההגשה",
  "האמינו בעצמכם, אתם יודעים את החומר!"
];

/**
 * Generate quiz questions using Gemini AI
 *
 * @throws {QuizGenerationError} If question generation fails after retries
 *
 * @example
 * const questions = await generateQuizQuestions('מתמטיקה', 'שברים', GradeLevel.Grade4, 5, 'medium');
 */
export async function generateQuizQuestions(
  subject: string,
  topic: string, // Can be a single topic or comma-separated list
  grade: GradeLevel,
  count: number = 5,
  difficultyLevel: DifficultyLevel = 'medium'
): Promise<QuizQuestion[]> {
  // Check if API key is configured
  if (!hasApiKey()) {
    logger.error('generateQuizQuestions: API key not configured');
    throw new QuizGenerationError('API key not configured');
  }

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

  logger.info('generateQuizQuestions: Starting generation', {
    subject,
    topic,
    grade,
    count,
    difficultyLevel,
    isMixedReview
  });

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

    if (!response.text) {
      throw new QuizGenerationError('Empty response from Gemini API');
    }

    const questions = JSON.parse(response.text) as QuizQuestion[];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new QuizGenerationError('Invalid response format: expected non-empty array of questions');
    }

    logger.info('generateQuizQuestions: Successfully generated questions', {
      count: questions.length
    });

    return questions;
  }, {
    ...AI_RETRY_OPTIONS,
    context: 'generateQuizQuestions'
  }).catch((error) => {
    // Wrap non-QuizGenerationError errors
    if (error instanceof QuizGenerationError) {
      throw error;
    }
    logger.error('generateQuizQuestions: Failed after retries', { subject, topic }, error);
    throw new QuizGenerationError(
      `Failed to generate quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error instanceof Error ? error : undefined }
    );
  });
}

/**
 * Generate exam recommendations based on quiz performance
 *
 * Returns encouraging tips for the upcoming exam.
 * Falls back to default recommendations on error (non-critical feature).
 */
export async function generateExamRecommendations(
  subject: string,
  topics: string[],
  questions: QuizQuestion[],
  userAnswers: number[]
): Promise<string[]> {
  // This is a non-critical feature - return defaults if no API key
  if (!hasApiKey()) {
    logger.warn('generateExamRecommendations: API key not configured, using defaults');
    return DEFAULT_RECOMMENDATIONS;
  }

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

  logger.info('generateExamRecommendations: Generating recommendations', {
    subject,
    score: `${correctCount}/${questions.length}`
  });

  try {
    return await retry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini');
      }

      const recommendations = JSON.parse(response.text) as string[];

      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        throw new Error('Invalid recommendations format');
      }

      logger.info('generateExamRecommendations: Successfully generated recommendations');
      return recommendations;
    }, {
      ...AI_RETRY_OPTIONS,
      maxRetries: 1, // Less retries for non-critical feature
      context: 'generateExamRecommendations'
    });
  } catch (error) {
    // Non-critical: fall back to defaults
    logger.warn('generateExamRecommendations: Failed, using defaults', {}, error);
    return DEFAULT_RECOMMENDATIONS;
  }
}

/**
 * Analyze mistakes and generate remediation topics
 *
 * Identifies specific topics the student should practice based on their errors.
 * Falls back to generic topic on error (non-critical feature).
 */
export async function analyzeMistakesAndGenerateTopics(
  subject: string,
  mistakes: { question: string; wrongAnswer: string }[]
): Promise<string[]> {
  const fallbackTopic = [`חיזוק ${subject}`];

  // Non-critical feature - return fallback if no API key
  if (!hasApiKey()) {
    logger.warn('analyzeMistakesAndGenerateTopics: API key not configured, using fallback');
    return fallbackTopic;
  }

  const mistakesText = mistakes
    .map(m => `Question: ${m.question} | Student Wrong Answer: ${m.wrongAnswer}`)
    .join('\n');

  const prompt = `
  A student made the following mistakes in a ${subject} exam.
  Identify the specific micro-topics or concepts they are struggling with based on these errors.

  Mistakes:
  ${mistakesText}

  Return a JSON array of 2-3 specific topics (in Hebrew) that they should practice to fix these specific errors.
  E.g. if they missed "1/2 + 1/3", return ["חיבור שברים עם מכנים שונים"].
  Keep it short and focused.
  `;

  logger.info('analyzeMistakesAndGenerateTopics: Analyzing mistakes', {
    subject,
    mistakeCount: mistakes.length
  });

  try {
    return await retry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini');
      }

      const topics = JSON.parse(response.text) as string[];

      if (!Array.isArray(topics) || topics.length === 0) {
        throw new Error('Invalid topics format');
      }

      logger.info('analyzeMistakesAndGenerateTopics: Successfully identified topics', {
        topics
      });
      return topics;
    }, {
      ...AI_RETRY_OPTIONS,
      maxRetries: 1,
      context: 'analyzeMistakesAndGenerateTopics'
    });
  } catch (error) {
    // Non-critical: fall back to generic topic
    logger.warn('analyzeMistakesAndGenerateTopics: Failed, using fallback', {}, error);
    return fallbackTopic;
  }
}

/**
 * Part type for multimodal content
 */
interface ContentPart {
  inlineData?: {
    data: string;
    mimeType: string;
  };
  text?: string;
}

/**
 * Extract topics from text and/or image input
 *
 * Uses multimodal capabilities to analyze worksheets, teacher messages, etc.
 *
 * @throws {TopicExtractionError} If extraction fails (critical for test setup)
 */
export async function extractTopicsFromInput(
  text: string,
  imageBase64?: string,
  mimeType?: string
): Promise<string[]> {
  if (!hasApiKey()) {
    logger.error('extractTopicsFromInput: API key not configured');
    throw new TopicExtractionError('API key not configured');
  }

  const parts: ContentPart[] = [];

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

  logger.info('extractTopicsFromInput: Extracting topics', {
    hasImage: Boolean(imageBase64),
    textLength: text.length
  });

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (!response.text) {
      throw new TopicExtractionError('Empty response from Gemini API');
    }

    const topics = JSON.parse(response.text) as string[];

    if (!Array.isArray(topics)) {
      throw new TopicExtractionError('Invalid response format: expected array of topics');
    }

    logger.info('extractTopicsFromInput: Successfully extracted topics', {
      topicCount: topics.length
    });

    return topics;
  }, {
    ...AI_RETRY_OPTIONS,
    context: 'extractTopicsFromInput'
  }).catch((error) => {
    if (error instanceof TopicExtractionError) {
      throw error;
    }
    logger.error('extractTopicsFromInput: Failed after retries', {}, error);
    throw new TopicExtractionError(
      `Failed to extract topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error instanceof Error ? error : undefined }
    );
  });
}

/**
 * Result of evaluation document analysis
 */
export interface EvaluationAnalysisResult {
  testType: EvaluationType;
  testName: string;
  subject: string;           // Hebrew subject name
  subjectId?: string;        // Matched subject ID
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  skills?: ExtractedSkill[];
  questions?: ExtractedQuestion[];
  weakTopics: string[];
  strongTopics: string[];
  teacherComments?: string;
  schoolTerm?: string;
  rawText: string;
  confidence: number;        // 0-100
}

/**
 * Analyze school evaluation documents using Gemini AI
 *
 * Supports:
 * - Rubric feedback (משוב) - criteria-based scoring
 * - Proficiency summaries (סיכום משימת הערכה) - skills with mastery levels
 * - Traditional tests (מבחן/מבדק) - questions with numeric scores
 *
 * @param imageBase64Array - Array of base64-encoded images
 * @param mimeTypes - Array of MIME types for each image
 * @param childGrade - Child's grade level for context
 * @param existingSubjects - Available subjects for matching
 *
 * @throws {EvaluationAnalysisError} If analysis fails after retries
 */
export async function analyzeEvaluationDocument(
  imageBase64Array: string[],
  mimeTypes: string[],
  childGrade: GradeLevel,
  existingSubjects: Subject[]
): Promise<EvaluationAnalysisResult> {
  if (!hasApiKey()) {
    logger.error('analyzeEvaluationDocument: API key not configured');
    throw new EvaluationAnalysisError('API key not configured');
  }

  if (imageBase64Array.length === 0) {
    throw new EvaluationAnalysisError('No images provided for analysis');
  }

  // Build content parts with all images
  const parts: ContentPart[] = [];

  for (let i = 0; i < imageBase64Array.length; i++) {
    parts.push({
      inlineData: {
        data: imageBase64Array[i],
        mimeType: mimeTypes[i]
      }
    });
  }

  // Create subject list for matching
  const subjectList = existingSubjects.map(s => `${s.name} (ID: ${s.id})`).join(', ');

  // Add the analysis prompt
  parts.push({
    text: `
אתה מנתח מסמכים חינוכיים מבתי ספר בישראל. נתח את המסמך/ים המצורפים וחלץ את כל המידע הרלוונטי.

פרטי התלמיד: ${childGrade}

מקצועות זמינים במערכת: ${subjectList}

משימות:
1. **זיהוי סוג המסמך**:
   - "rubric" = משוב עם קריטריונים וציונים
   - "proficiency_summary" = סיכום משימת הערכה עם רמות שליטה
   - "test" = מבחן/מבדק עם שאלות וציונים מספריים
   - "other" = סוג אחר

2. **חילוץ מידע בסיסי**:
   - שם המבחן/הערכה
   - מקצוע (התאם למקצועות הזמינים)
   - ציון כולל ומקסימלי
   - מחצית/תקופה
   - הערות מורה

3. **חילוץ מיומנויות** (למסמכי proficiency_summary):
   - שם המיומנות
   - רמת שליטה: "שולט/ת היטב", "שולט/ת", "שולט/ת באופן חלקי", "דרוש חיזוק ותרגול"

4. **חילוץ שאלות** (למבחנים):
   - מספר שאלה
   - נושא (אם ניתן לזהות)
   - ציון שהתקבל
   - ציון מקסימלי

5. **זיהוי נושאים חלשים וחזקים**:
   - נושאים שבהם התלמיד טעה או קיבל ציון נמוך = weakTopics
   - נושאים שבהם התלמיד הצליח = strongTopics

6. **רמת ביטחון**: הערך 0-100 עד כמה אתה בטוח בניתוח

חשוב:
- כל הטקסט בעברית
- אם לא ניתן לקרוא משהו, סמן confidence נמוך יותר
- התאם את שם המקצוע למקצועות הזמינים במערכת
- אם יש מספר דפים, שלב את כל המידע ביחד
`
  });

  logger.info('analyzeEvaluationDocument: Starting analysis', {
    imageCount: imageBase64Array.length,
    grade: childGrade
  });

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            testType: {
              type: Type.STRING,
              enum: ["rubric", "proficiency_summary", "test", "other"],
              description: "Type of document"
            },
            testName: {
              type: Type.STRING,
              description: "Name of the test or evaluation"
            },
            subject: {
              type: Type.STRING,
              description: "Subject name in Hebrew"
            },
            subjectId: {
              type: Type.STRING,
              description: "Matched subject ID from available subjects, if found"
            },
            totalScore: {
              type: Type.NUMBER,
              description: "Total score achieved"
            },
            maxScore: {
              type: Type.NUMBER,
              description: "Maximum possible score"
            },
            schoolTerm: {
              type: Type.STRING,
              description: "School term/semester (e.g., מחצית א')"
            },
            teacherComments: {
              type: Type.STRING,
              description: "Teacher comments or feedback"
            },
            skills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Skill name" },
                  level: {
                    type: Type.STRING,
                    enum: ["שולט/ת היטב", "שולט/ת", "שולט/ת באופן חלקי", "דרוש חיזוק ותרגול"],
                    description: "Proficiency level"
                  }
                },
                required: ["name", "level"]
              },
              description: "Extracted skills from proficiency summaries"
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER, description: "Question number" },
                  topic: { type: Type.STRING, description: "Question topic if identifiable" },
                  score: { type: Type.NUMBER, description: "Score received" },
                  maxScore: { type: Type.NUMBER, description: "Maximum score" }
                },
                required: ["questionNumber", "score", "maxScore"]
              },
              description: "Extracted questions from traditional tests"
            },
            weakTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Topics needing improvement"
            },
            strongTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Topics mastered"
            },
            rawText: {
              type: Type.STRING,
              description: "Full OCR text from document"
            },
            confidence: {
              type: Type.INTEGER,
              description: "Confidence level 0-100"
            }
          },
          required: ["testType", "testName", "subject", "weakTopics", "strongTopics", "rawText", "confidence"]
        }
      }
    });

    if (!response.text) {
      throw new EvaluationAnalysisError('Empty response from Gemini API');
    }

    const result = JSON.parse(response.text) as Omit<EvaluationAnalysisResult, 'percentage' | 'skills'> & {
      skills?: Array<{ name: string; level: string }>;
    };

    // Calculate percentage if scores available
    let percentage: number | undefined;
    if (result.totalScore !== undefined && result.maxScore && result.maxScore > 0) {
      percentage = Math.round((result.totalScore / result.maxScore) * 100);
    }

    // Map skills with difficulty levels
    const mappedSkills: ExtractedSkill[] | undefined = result.skills?.map(skill => ({
      name: skill.name,
      level: skill.level as ExtractedSkill['level'],
      suggestedDifficulty: proficiencyToDifficulty(skill.level as ExtractedSkill['level'])
    }));

    // Mark questions as correct/incorrect
    const mappedQuestions: ExtractedQuestion[] | undefined = result.questions?.map(q => ({
      ...q,
      isCorrect: q.score === q.maxScore
    }));

    logger.info('analyzeEvaluationDocument: Analysis complete', {
      testType: result.testType,
      testName: result.testName,
      subject: result.subject,
      confidence: result.confidence,
      weakTopicCount: result.weakTopics.length,
      strongTopicCount: result.strongTopics.length
    });

    return {
      ...result,
      percentage,
      skills: mappedSkills,
      questions: mappedQuestions
    };
  }, {
    ...AI_RETRY_OPTIONS,
    context: 'analyzeEvaluationDocument'
  }).catch((error) => {
    if (error instanceof EvaluationAnalysisError) {
      throw error;
    }
    logger.error('analyzeEvaluationDocument: Failed after retries', {}, error);
    throw new EvaluationAnalysisError(
      `Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error instanceof Error ? error : undefined }
    );
  });
}
