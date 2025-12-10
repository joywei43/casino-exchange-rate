// config.js

// 網站支援的貨幣列表 (API 請求使用的代碼)
export const CURRENCIES = ['USD', 'KRW', 'PHP', 'JPY', 'HKD'];

// 【後台設定】自訂價差百分比 (新交易對)
export const SPREAD_CONFIG = {
  'USD_KRW': 0.05, // USD/KRW: 5%
  'USD_PHP': 0.05, // USD/PHP: 5%
  'USD_JPY': 0.05, // USD/JPY: 5%
  'USD_HKD': 0.05, // USD/HKD: 5%
};

// 最終需要顯示的交易對 (新增 JPY/HKD)
export const DISPLAY_PAIRS = [
    { from: 'USD', to: 'KRW', icon: '🇰🇷' },
    { from: 'USD', to: 'PHP', icon: '🇵🇭' },
    { from: 'USD', to: 'JPY', icon: '🇯🇵' },
    { from: 'USD', to: 'HKD', icon: '🇭🇰' },
];

// 貨幣符號 (USD 將被前端替換為 USDT)
export const CURRENCY_SYMBOLS = {
    USD: 'T', // 符號顯示為 'T' (代表 USDT)
    KRW: '₩',
    PHP: '₱',
    JPY: '¥',
    HKD: 'HK$',
};
