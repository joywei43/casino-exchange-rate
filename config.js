// config.js

// 網站支援的貨幣列表
// *** 將 TWD 替換為 NTD (另一種常見代碼) ***
export const CURRENCIES = ['NTD', 'KRW', 'USD', 'PHP'];

// 【後台設定】自訂價差百分比 (同步更新 TWD 為 NTD)
export const SPREAD_CONFIG = {
  'NTD_KRW': 0.06, // TWD/KRW: 6%
  'NTD_USD': 0.03, // TWD/USD: 3%
  'NTD_PHP': 0.06, // TWD/PHP: 6%
  'USD_KRW': 0.05, // USD/KRW: 5%
  'USD_PHP': 0.05, // USD/PHP: 5%
};

// 最終需要顯示的交易對 (同步更新 TWD 為 NTD)
export const DISPLAY_PAIRS = [
    { from: 'NTD', to: 'KRW', icon: '🇰🇷' },
    { from: 'NTD', to: 'USD', icon: '🇺🇸' },
    { from: 'NTD', to: 'PHP', icon: '🇵🇭' },
    { from: 'USD', to: 'KRW', icon: '🇰🇷' },
    { from: 'USD', to: 'PHP', icon: '🇵🇭' },
];

// 貨幣符號 (同步更新 TWD 為 NTD)
export const CURRENCY_SYMBOLS = {
    NTD: 'NT$', // 修正為 NTD
    KRW: '₩',
    USD: '$',
    PHP: '₱',
};
