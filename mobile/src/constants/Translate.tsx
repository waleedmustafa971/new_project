import { Configuration, OpenAIApi } from "openai";

// Initialize OpenAI client
const configuration = new Configuration({
  apiKey: "YOUR_OPENAI_API_KEY", // store securely in .env
});

const openai = new OpenAIApi(configuration);

/**
 * Translate any text to a target language using OpenAI API
 * @param text - The text to translate
 * @param targetLanguage - Target language (e.g., "Arabic", "Bangla", "English")
 * @returns Translated text
 */
export const translateText = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  if (!text) return text;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful translator. Translate any text to ${targetLanguage} and keep the meaning intact.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0,
    });

    return response.data.choices[0]?.message?.content ?? text;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // fallback to original text
  }
};
