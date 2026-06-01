//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

import React, { createContext, useContext, useState } from 'react';

const TranslationContext = createContext(null);

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});

const translate = async (key, text) => {
  console.log('🔁 Translating:', { key, text, language });

  // English = base
  if (language === 'en') {
    console.log('✅ English detected, returning base text');
    return text;
  }

  const cacheKey = `${language}_${key}`;

  if (translations[cacheKey]) {
    console.log('📦 Using cached translation:', translations[cacheKey]);
    return translations[cacheKey];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer YOUR_OPENAI_API_KEY_HERE`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Translate this text to ${language}: "${text}"`,
          },
        ],
      }),
    });

    console.log('🌐 Response status:', response.status);

    const data = await response.json();
    console.log('📨 OpenAI response:', data);

    if (!data.choices || !data.choices.length) {
      console.error('❌ No choices returned');
      return text;
    }

    const translatedText = data.choices[0].message.content;
    console.log('✅ Translated text:', translatedText);

    setTranslations(prev => ({
      ...prev,
      [cacheKey]: translatedText,
    }));

    return translatedText;
  } catch (error) {
    console.error('🔥 Translation failed:', error);
    return text;
  }
};

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        translate,
        translations,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// ✅ Hook
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used inside TranslationProvider');
  }
  return context;
};
