// config.js

// 網站支援的貨幣列表 (API 請求時 TWD 會被排除)
export const CURRENCIES = ['USD', 'TWD', 'KRW', 'PHP', 'JPY', 'HKD'];

// 【TWD/USD 特殊手動設定】(保持不變，用於計算中價)
const TWD_SELL_USD_RATE = 30.00; 
const TWD_BUY_USD_RATE = 32.00;  
const TWD_MID_RATE = (TWD_SELL_USD_RATE + TWD_BUY_USD_RATE) / 2; 
const TWD_SPREAD_PERCENTAGE = (TWD_BUY_USD_RATE - TWD_SELL_USD_RATE) / 2 / TWD_MID_RATE; 
const TWD_TO_KRW_MID = 45.00; 

// 【FINAL 價差設定】所有上下價差都改成 3% (除了 TWD/USD)
export const SPREAD_CONFIG = {
  'USD_KRW': 0.03, 
  'USD_PHP': 0.03, 
  'USD_JPY': 0.03, 
  'USD_HKD': 0.03, 
  'TWD_USD': TWD_SPREAD_PERCENTAGE, 
  'TWD_KRW': 0.03, 
};

// 【手動設定基礎值】後端代理會使用這些值
export const MANUAL_MID_RATES = {
    'USD_TO_TWD_MID': TWD_MID_RATE, 
    'TWD_TO_KRW_MID': TWD_TO_KRW_MID, 
};

// 最終需要顯示的交易對 (移除國旗圖標)
export const DISPLAY_PAIRS = [
    { from: 'USD', to: 'KRW', icon: '🇰🇷' },
    { from: 'USD', to: 'PHP', icon: '🇵🇭' },
    { from: 'USD', to: 'JPY', icon: '🇯🇵' },
    { from: 'USD', to: 'HKD', icon: '🇭🇰' },
    { from: 'TWD', to: 'USD', icon: '' }, // TWD 換 USD (移除國旗)
    { from: 'TWD', to: 'KRW', icon: '🇰🇷' },
    // 反向交易無需在此列出
];

// 貨幣符號
export const CURRENCY_SYMBOLS = {
    USD: 'T', 
    TWD: 'NT$',
    KRW: '₩',
    PHP: '₱',
    JPY: '¥',
    HKD: 'HK$',
};
