// config.js

// 網站支援的幣種列表
export const CURRENCIES = ['TWD', 'KRW', 'USD', 'PHP'];

// 【後台設定】定義 TWD 兌換其他幣種的價差百分比 (例如：0.02 = 2%)
export const SPREAD_CONFIG = {
  'USD': 0.02, // TWD/USD 價差 2%
  'KRW': 0.05, // TWD/KRW 價差 5%
  'PHP': 0.05, // TWD/PHP 價差 5%
};

/**
 * 模擬 API 中價數據 (USD 為基準貨幣)
 * 實際部署後，您需要在這裡手動更新數據，或替換成真實 API 邏輯
 */
export const MOCK_API_RATES = {
    // 1 USD 兌換...
    'TWD': 32.15,  
    'KRW': 1300.50, 
    'PHP': 58.70,  
    'USD': 1.00,   
};
