// config.js

// 網站支援的貨幣列表
export const CURRENCIES = ['TWD', 'KRW', 'USD', 'PHP'];

// 【後台設定】自訂價差百分比
export const SPREAD_CONFIG = {
  'TWD_KRW': 0.06, // TWD/KRW: 6%
  'TWD_USD': 0.03, // TWD/USD: 3%
  'TWD_PHP': 0.06, // TWD/PHP: 6%
  'USD_KRW': 0.05, // USD/KRW: 5%
  'USD_PHP': 0.05, // USD/PHP: 5%
};

// 最終需要顯示的交易對 (這五個交易對)
export const DISPLAY_PAIRS = [
    { from: 'TWD', to: 'KRW', icon: '🇰🇷' },
    { from: 'TWD', to: 'USD', icon: '🇺🇸' },
    { from: 'TWD', to: 'PHP', icon: '🇵🇭' },
    { from: 'USD', to: 'KRW', icon: '🇰🇷' },
    { from: 'USD', to: 'PHP', icon: '🇵🇭' },
];

// 貨幣符號
export const CURRENCY_SYMBOLS = {
    TWD: 'NT$',
    KRW: '₩',
    USD: '$',
    PHP: '₱',
};
