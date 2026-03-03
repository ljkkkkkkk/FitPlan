import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  // @ts-ignore
  const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY not found in environment variables.");
  }
  return key || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export interface UserProfile {
  height: number;
  weight: number;
  age: number;
  gender: string;
  goal: string;
  level: string;
  targetWeight: number;
}

export async function generateFitnessPlan(profile: UserProfile) {
  const prompt = `为以下用户生成7天健身和营养计划（JSON格式，使用中文）：
  - 身高: ${profile.height}cm, 体重: ${profile.weight}kg, 年龄: ${profile.age}, 性别: ${profile.gender}
  - 目标: ${profile.goal}, 水平: ${profile.level}, 预期体重: ${profile.targetWeight}kg

  必须包含：
  1. dailyCalories: 数字
  2. weeklyWorkouts: 7个对象(day, title, type[cardio/strength/rest], exercises[{name, sets, reps, duration}])
  3. dailyMeals: 7个对象(day, breakfast, lunch, dinner, snacks [每个含name, calories])
  4. estimatedTimeframe: 字符串
  5. advice: 简短建议`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dailyCalories: { type: Type.NUMBER },
          estimatedTimeframe: { type: Type.STRING },
          advice: { type: Type.STRING },
          weeklyWorkouts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                exercises: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      sets: { type: Type.STRING },
                      reps: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      intensity: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          },
          dailyMeals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                breakfast: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER } }
                },
                lunch: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER } }
                },
                dinner: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER } }
                },
                snacks: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER } }
                }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
}
