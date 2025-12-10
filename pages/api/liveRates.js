// pages/api/liveRates.js

// Exchangerate.host 的免費端點
const API_URL = 'https://api.exchangerate.host/latest'; 

// 從 config.js 導入 CURRENCIES 列表
import { CURRENCIES } from '../../config';

export default async function handler(req, res) {
    
    // 1. 構建 API 請求 URL: 基礎貨幣為 USD，目標貨幣為 TWD, KRW, PHP
    const symbols = CURRENCIES.filter(c => c !== 'USD').join(','); // 排除 USD，只列出 TWD, KRW, PHP
    const url = `${API_URL}?base=USD&symbols=${symbols}`; 

    try {
        const response = await fetch(url);
        
        // 2. 檢查 HTTP 狀態碼
        if (!response.ok) {
            // 如果狀態碼不是 200 (例如 404 或 500)，則嘗試讀取錯誤資訊
            let errorText = await response.text();
            
            // 由於 API 錯誤可能返回 HTML 或純文本
            return res.status(response.status).json({ 
                error: `外部 API 服務錯誤 (${response.status})`,
                details: errorText.substring(0, 200) // 截斷錯誤訊息避免過長
            });
        }
        
        const data = await response.json();

        // 3. 檢查 API 響應內容 (Exchangerate.host 使用 success 欄位)
        if (!data.success || !data.rates) {
            // 如果 API 成功響應 (HTTP 200) 但內容錯誤 (success: false)
            const errorDetail = data.error?.message || '響應內容無效或缺少 rates 數據';
            return res.status(500).json({ error: '外部 API 數據錯誤', details: errorDetail });
        }
        
        // 4. 補充 USD 基準值 (因為 API 是 base=USD，USD 匯率應該是 1)
        const finalRates = {
            ...data.rates,
            'USD': 1.00 
        };

        // 成功獲取數據，返回給前端
        res.status(200).json({
            rates: finalRates, 
            timestamp: data.date ? new Date(data.date).getTime() : Date.now(),
        });

    } catch (error) {
        console.error('API Call Exception:', error);
        res.status(500).json({ error: '伺服器執行 API 請求時發生例外錯誤。', details: error.message });
    }
}
