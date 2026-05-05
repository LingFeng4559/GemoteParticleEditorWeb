import zh_tw from './lang/zh_tw.js';
import zh_cn from './lang/zh_cn.js';
import en from './lang/en.js';

class LanguageManager {
    constructor() {
        this.languages = {
            'zh_tw': zh_tw,
            'zh_cn': zh_cn,
            'en': en
        };
        this.currentLang = localStorage.getItem('app-language') || 'zh_tw';
        this.translations = this.languages[this.currentLang];
    }

    setLanguage(langCode) {
        if (this.languages[langCode]) {
            this.currentLang = langCode;
            this.translations = this.languages[langCode];
            localStorage.setItem('app-language', langCode);
            this.updateUI();
        }
    }

    get(key, params = {}) {
        let value = this.translations[key] || key;
        if (typeof value === 'object' && value !== null) return value;
        
        Object.keys(params).forEach(p => {
            value = value.replace(`{${p}}`, params[p]);
        });
        return value;
    }

    updateUI() {
        // 更新所有帶有 data-i18n 屬性的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = this.get(key);
        });

        // 更新帶有 data-i18n-placeholder 屬性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = this.get(key);
        });

        // 更新帶有 data-i18n-title 屬性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = this.get(key);
        });

        // 更新粒子選擇器的選項
        const particleSelect = document.querySelector('#particle-type');
        if (particleSelect) {
            const particles = this.get('particles');
            const currentValue = particleSelect.value;
            
            // 清除現有選項
            particleSelect.innerHTML = '';
            
            // 建立並排序選項 (redstone 始終排在第一位)
            const sortedKeys = Object.keys(particles).sort((a, b) => {
                if (a === 'redstone') return -1;
                if (b === 'redstone') return 1;
                return particles[a].localeCompare(particles[b], this.currentLang.replace('_', '-'));
            });
            
            sortedKeys.forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = particles[key];
                particleSelect.appendChild(option);
            });
            
            // 恢復先前選中的值（如果存在）
            if (currentValue && particles[currentValue]) {
                particleSelect.value = currentValue;
            }
        }

        // 通知 UIManager 更新
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    }
}

const instance = new LanguageManager();
export default instance;
