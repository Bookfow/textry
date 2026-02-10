export const LANGUAGES = [
    { value: 'ko', label: '한국어', flag: '🇰🇷' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'ru', label: 'Русский', flag: '🇷🇺' },
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' },
    { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { value: 'other', label: '기타', flag: '🌐' },
  ] as const
  
  export type LanguageValue = typeof LANGUAGES[number]['value']
  
  export function getLanguageLabel(value: string | null): string {
    if (!value) return '언어 없음'
    const language = LANGUAGES.find(l => l.value === value)
    return language ? language.label : '언어 없음'
  }
  
  export function getLanguageFlag(value: string | null): string {
    if (!value) return '🌐'
    const language = LANGUAGES.find(l => l.value === value)
    return language ? language.flag : '🌐'
  }