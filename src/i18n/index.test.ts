import { describe, it, expect } from 'vitest'
import { t, getCurrentLanguage, setLanguage } from '../i18n'

describe('i18n', () => {
  describe('t', () => {
    it('should return Chinese translation by default', () => {
      expect(t('common.save', 'zh')).toBe('保存')
    })

    it('should return English translation', () => {
      expect(t('common.save', 'en')).toBe('Save')
    })

    it('should fallback to Chinese if key not found', () => {
      expect(t('common.save', 'zh')).toBe('保存')
    })
  })

  describe('getCurrentLanguage', () => {
    it('should return zh by default', () => {
      expect(getCurrentLanguage()).toBe('zh')
    })
  })

  describe('setLanguage', () => {
    it('should save language to localStorage', () => {
      setLanguage('en')
      expect(localStorage.setItem).toHaveBeenCalledWith('ocm-language', 'en')
    })
  })
})
