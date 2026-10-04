import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { localeENUS } from './en-us'
import { localePTBR } from './pt-br'
import LanguageDetector from 'i18next-browser-languagedetector'

export const i18nextInit = () => {
	if (!i18next.isInitialized)
		i18next
			.use(initReactI18next)
			.use(LanguageDetector)
			.init({
				debug: import.meta.env.DEV,
				resources: {
					'en-US': {
						translation: localeENUS,
					},
					'pt-BR': {
						translation: localePTBR,
					},
				},
				fallbackLng: 'en-US',
				interpolation: {
					escapeValue: false,
				},
			})
}
