import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Check Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleApiError(res: express.Response, err: unknown) {
  const message =
    err instanceof Error ? err.message : 'Unexpected server error while contacting Gemini.';
  console.error('Gemini API error:', err);

  if (message.includes('GEMINI_API_KEY is not configured')) {
    return res.status(500).json({ error: message });
  }
  if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
    return res.status(403).json({
      error: 'Gemini API permission denied. Please verify your API key in Settings > Secrets.',
    });
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return res.status(429).json({
      error: 'Gemini API rate limit reached. Please wait a moment and try again.',
    });
  }
  return res.status(502).json({ error: message });
}

const STRICT_CHALLENGER_SYSTEM_INSTRUCTION = `You are a rigorous entrepreneurship strategy challenger for NEXUS Venture Studio.
Your sole role is to test whether the founder's competitive position is logically defensible and supported by evidence already entered in the app.

NON-NEGOTIABLE GROUNDING RULES:
1. Use ONLY the information provided in the user's Venture Profile, Competitor Research / Matrix, Evidence / Sources, Positioning Map scores, and Positioning Statement.
2. NEVER invent competitors, prices, customer behaviour, market facts, survey results, statistics, or evidence.
3. NEVER claim the venture has any feature, partnership, or capability that is not explicitly present in the provided data.
4. NEVER answer the challenge questions for the founder, rewrite their positioning statement into a polished answer, or predict whether the venture will succeed or fail.
5. Be concise, specific, direct, and grounded in exact names, numbers, gaps, and evidence quality from the provided JSON.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Generate 3 specific strategy challenge questions
  app.post('/api/strategy-challenge/questions', async (req, res) => {
    try {
      const { context } = req.body as { context?: unknown };
      if (!context) {
        return res.status(400).json({ error: 'Missing venture strategy context.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Review this venture's existing strategy work (Venture Profile, Competitor Research, Competitor Matrix, Positioning Map, and Positioning Statement) and generate exactly 3 difficult, specific challenge questions that test whether the competitive position is logically defensible and supported by evidence.

Each question MUST reference specific details from the provided data (such as the named alternatives, their types like Substitute or Do Nothing, documented strengths/weaknesses, evidence quality ratings, Positioning Map axis names/scores, or claims in the Positioning Statement). Do NOT ask generic entrepreneurship questions.

Provided Venture & Strategy Data:
${JSON.stringify(context, null, 2)}`,
        config: {
          systemInstruction: STRICT_CHALLENGER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    focusArea: {
                      type: Type.STRING,
                      description:
                        'Short 2-4 word focus area (e.g., Switching Friction, Map Consistency, Evidence Gap).',
                    },
                    question: {
                      type: Type.STRING,
                      description:
                        'A concise, tough, specific challenge question referencing the venture data.',
                    },
                  },
                  required: ['focusArea', 'question'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        questions?: { focusArea: string; question: string }[];
      };
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 3)
        : [];

      if (questions.length !== 3) {
        return res.status(502).json({
          error: 'Gemini returned an incomplete set of challenge questions. Please try again.',
        });
      }

      return res.json({ questions });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  // 2. Evaluate the user's defence to one challenge question
  app.post('/api/strategy-challenge/evaluate', async (req, res) => {
    try {
      const { context, question, defence } = req.body as {
        context?: unknown;
        question?: string;
        defence?: string;
      };

      if (!context || !question || !defence?.trim()) {
        return res.status(400).json({
          error: 'Context, challenge question, and user defence are required.',
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Evaluate the founder's defence against the challenge question using ONLY the provided Venture & Strategy Data.

Challenge Question:
${question}

Founder's Defence:
${defence.trim()}

Provided Venture & Strategy Data:
${JSON.stringify(context, null, 2)}

Provide concise, specific feedback under three exact fields:
- supported: What in the founder's defence is directly supported by information or evidence already entered in the app. If nothing in the defence is supported by the entered data, explicitly say so without inventing support.
- assumption: Any claim in the defence that is not sufficiently supported by the evidence already entered (or relies on Weak/missing evidence or unentered capabilities).
- nextEvidenceNeeded: What concrete evidence, observation, customer feedback, or market check would help test that assumption. Do NOT invent missing evidence or fake statistics.`,
        config: {
          systemInstruction: STRICT_CHALLENGER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supported: {
                type: Type.STRING,
                description:
                  'Concise statement of what in the defence is supported by existing app data.',
              },
              assumption: {
                type: Type.STRING,
                description:
                  'Concise identification of unsupported claims or assumptions in the defence.',
              },
              nextEvidenceNeeded: {
                type: Type.STRING,
                description:
                  'Concise description of what additional evidence or observation is needed to test the assumption.',
              },
            },
            required: ['supported', 'assumption', 'nextEvidenceNeeded'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        supported?: string;
        assumption?: string;
        nextEvidenceNeeded?: string;
      };

      if (!parsed.supported || !parsed.assumption || !parsed.nextEvidenceNeeded) {
        return res.status(502).json({
          error: 'Gemini returned incomplete feedback. Please try submitting again.',
        });
      }

      return res.json({ feedback: parsed });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  // 3. Generate Final Strategy Review after all 3 challenges are completed
  app.post('/api/strategy-challenge/summary', async (req, res) => {
    try {
      const { context, challenges } = req.body as {
        context?: unknown;
        challenges?: unknown;
      };

      if (!context || !challenges) {
        return res.status(400).json({
          error: 'Context and completed challenge records are required.',
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `All 3 strategy challenge questions have been answered and evaluated. Write a concise Final Strategy Review using ONLY the provided Venture & Strategy Data and the 3 completed challenge exchanges.

CRITICAL: Do NOT predict whether the venture will succeed or fail. Do NOT invent market facts, statistics, or capabilities.

Provided Venture & Strategy Data:
${JSON.stringify(context, null, 2)}

Completed 3 Challenges, Founder Defences, and Feedback:
${JSON.stringify(challenges, null, 2)}`,
        config: {
          systemInstruction: STRICT_CHALLENGER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strongestPart: {
                type: Type.STRING,
                description:
                  'Strongest part of the strategy using only information supported by the existing work.',
              },
              biggestAssumption: {
                type: Type.STRING,
                description:
                  'The most important unsupported or weakly supported assumption identified across the work and defences.',
              },
              nextValidationPriority: {
                type: Type.STRING,
                description:
                  'The single most important thing the founder should test or research next.',
              },
            },
            required: ['strongestPart', 'biggestAssumption', 'nextValidationPriority'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        strongestPart?: string;
        biggestAssumption?: string;
        nextValidationPriority?: string;
      };

      if (
        !parsed.strongestPart ||
        !parsed.biggestAssumption ||
        !parsed.nextValidationPriority
      ) {
        return res.status(502).json({
          error: 'Gemini returned an incomplete strategy review. Please try again.',
        });
      }

      return res.json({ review: parsed });
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXUS Venture Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
