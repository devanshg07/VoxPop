import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({});
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Hello!',
});

console.log(response.text);