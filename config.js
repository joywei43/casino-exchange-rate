// config.js

// 網站支援的貨幣列表 (純 API 支援的幣種)
export const CURRENCIES = ['USD', 'KRW', 'PHP', 'JPY', 'HKD'];

// 【FINAL 價差設定】所有上下價差都改成 3%
export const SPREAD_CONFIG = {
  'USD_KRW': 0.03, // 3%
  'USD_PHP': 0.03, // 3%
  'USD_JPY': 0.03, // 3%
  'USD_HKD': 0.03, // 3%
};

// 最終需要顯示的交易對 (只有 USD 基準的四個)
export const DISPLAY_PAIRS = [
    { from: 'USD', to: 'KRW', icon: '🇰🇷' },
    { from: 'USD', to: 'PHP', icon: '🇵🇭' },
    { from: 'USD', to: 'JPY', icon: '🇯🇵' },
    { from: 'USD', to: 'HKD', icon: '🇭🇰' },
];

// 貨幣符號
export const CURRENCY_SYMBOLS = {
    USD: 'T', 
    KRW: '₩',
    PHP: '₱',
    JPY: '¥',
    HKD: 'HK$',
};

// 移除所有 TWD/USD 的手動設定，專注於穩定性。
