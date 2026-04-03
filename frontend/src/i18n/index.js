import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './vi.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: localStorage.getItem('eventhub-lang') || 'vi',
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
  });

// Lưu ngôn ngữ khi thay đổi
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('eventhub-lang', lng);
});

export default i18n;
