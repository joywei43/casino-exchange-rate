// pages/api/liveRates.js

// 確保在 Vercel Settings 中設置了 FREE_CURRENCY_API_KEY
const API_KEY = process.env.FREE_CURRENCY_API_KEY; 
const BASE_URL = 'https://api.freecurrencyapi.com/v1/latest'; 

// 從 config.js 導入 CURRENCIES 列表
import { CURRENCIES } from '../../config';

export default async function handler(req, res) {
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key 未設置，請檢查 Vercel 環境變數 FREE_CURRENCY_API_KEY。' });
    }

    // 1. 構建 API 請求 URL: 基礎貨幣為 USD，並請求所有其他貨幣
    // Freecurrencyapi 需要 'apikey' 參數
    const targetSymbols = CURRENCIES.filter(c => c !== 'USD').join(','); 
    const url = `${BASE_URL}?apikey=${API_KEY}&base_currency=USD&currencies=${targetSymbols}`; 

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            let errorText = await response.text();
            
            // 由於 API 錯誤可能返回 HTML 或純文本
            return res.status(response.status).json({ 
                error: `外部 API 服務錯誤 (${response.status})`,
                details: errorText.substring(0, 500) // 提供更多細節
            });
        }
        
        const data = await response.json();

        // 2. 檢查 API 響應內容 (Freecurrencyapi 使用 data 欄位)
        if (!data.data) {
            // 如果 API 成功響應 (HTTP 200) 但內容錯誤 (例如缺少 data 欄位)
            const errorDetail = data.message || 'API 響應內容無效或缺少 rates 數據';
            return res.status(500).json({ error: '外部 API 數據錯誤', details: errorDetail });
        }
        
        // 3. 補充 USD 基準值 (API base_currency=USD，USD 匯率應該是 1)
        const finalRates = {
            ...data.data,
            'USD': 1.00 
        };

        // 成功獲取數據，返回給前端
        res.status(200).json({
            rates: finalRates, 
            timestamp: Date.now(), // 使用當前時間作為時間戳
        });

    } catch (error) {
        console.error('API Call Exception:', error);
        res.status(500).json({ error: '伺服器執行 API 請求時發生例外錯誤。', details: error.message });
    }
}
