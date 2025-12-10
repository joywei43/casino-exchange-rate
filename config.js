// config.js

// 網站支援的貨幣列表 (API 請求使用的代碼)
export const CURRENCIES = ['USD', 'KRW', 'PHP', 'JPY', 'HKD'];

// 【FINAL 價差設定】所有上下價差都改成 3%
export const SPREAD_CONFIG = {
  'USD_KRW': 0.03, // 3%
  'USD_PHP': 0.03, // 3%
  'USD_JPY': 0.03, // 3%
  'USD_HKD': 0.03, // 3%
};

// 最終需要顯示的交易對 (新增圖標：使用您提供的 Tether 圖片替代原本的🟡符號)
export const DISPLAY_PAIRS = [
    { from: 'USD', to: 'KRW', icon: '🇰🇷' }, // 韓國國旗
    { from: 'USD', to: 'PHP', icon: '🇵🇭' }, // 菲律賓國旗
    { from: 'USD', to: 'JPY', icon: '🇯🇵' }, // 日本國旗
    { from: 'USD', to: 'HKD', icon: '🇭🇰' }, // 香港國旗
];

// 貨幣符號
export const CURRENCY_SYMBOLS = {
    USD: 'T', 
    KRW: '₩',
    PHP: '₱',
    JPY: '¥',
    HKD: 'HK$',
};
