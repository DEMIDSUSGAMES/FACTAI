
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Fact } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let sessionTopicHistory: string[] = [];
let sessionFactHistory: string[] = [];

export async function generateGameFacts(difficulty: Difficulty): Promise<Fact[]> {
  const topicsMap: Record<Difficulty, string[]> = {
    [Difficulty.AGE_3_6]: ["домашние животные", "дикие животные", "сказки", "цвета и формы", "фрукты и овощи", "игрушки"],
    [Difficulty.AGE_7_12]: ["динозавры", "планеты", "океан", "мультфильмы", "школьные предметы", "изобретения", "видеоигры"],
    [Difficulty.AGE_13_17]: ["поп-культура", "современные технологии", "космос", "интернет", "музыка", "история великих открытий"],
    [Difficulty.AGE_18_PLUS]: ["квантовая физика", "мировая экономика", "редкие исторические факты", "психология", "микробиология", "геополитика"]
  };

  const difficultyInstruction: Record<Difficulty, string> = {
    [Difficulty.AGE_3_6]: "Пиши ОЧЕНЬ ПРОСТО. Факты должны быть понятны малышу. Ложь должна быть очевидной, но забавной. Например: 'У кошки 8 лап'.",
    [Difficulty.AGE_7_12]: "Пиши познавательно и весело. Факты о природе, науке или играх. Ложь должна быть правдоподобной для ребенка, но проверяемой логикой.",
    [Difficulty.AGE_13_17]: "Используй подростковый сленг или темы, которые интересны молодежи. Факты должны быть средней сложности. Ложь должна быть хитрой.",
    [Difficulty.AGE_18_PLUS]: "Факты должны быть по-настоящему сложными и малоизвестными. Используй научную терминологию. Ложь должна быть филигранной и почти неотличимой от правды."
  };

  const availableTopics = topicsMap[difficulty];
  let randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  
  const prompt = `Ты — элитный ведущий AI-викторины. 
  ИГРОКИ: Возраст ${difficulty}.
  ТЕМА: ${randomTopic}.
  ИНСТРУКЦИЯ ПО СЛОЖНОСТИ: ${difficultyInstruction[difficulty]}

  ЗАДАЧА: Сгенерируй ровно 3 факта на тему "${randomTopic}".
  1. ДВА факта — АБСОЛЮТНАЯ ПРАВДА.
  2. ОДИН факт — СТРОГАЯ ЛОЖЬ (выглядит как правда, но является вымыслом).

  ПРАВИЛА:
  - Темы не должны повторяться часто.
  - Избегай этих уже использованных фактов: ${sessionFactHistory.slice(-10).join(', ')}.
  - Ответ должен быть СТРОГО В JSON.

  Формат:
  {
    "facts": [
      {"text": "...", "isLie": false},
      {"text": "...", "isLie": false},
      {"text": "...", "isLie": true}
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            facts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  isLie: { type: Type.BOOLEAN }
                },
                required: ["text", "isLie"]
              }
            }
          },
          required: ["facts"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"facts": []}');
    const generatedFacts = result.facts as Fact[];
    
    generatedFacts.forEach(f => sessionFactHistory.push(f.text));
    if (sessionFactHistory.length > 50) sessionFactHistory.splice(0, 3);

    return generatedFacts.sort(() => Math.random() - 0.5);
  } catch (e) {
    console.error("AI Error:", e);
    return [
      { text: "Солнце — это звезда.", isLie: false },
      { text: "Луна сделана из сыра.", isLie: true },
      { text: "Вода замерзает при 0 градусах Цельсия.", isLie: false }
    ].sort(() => Math.random() - 0.5);
  }
}

export function resetSessionHistory() {
  sessionTopicHistory = [];
  sessionFactHistory = [];
}
