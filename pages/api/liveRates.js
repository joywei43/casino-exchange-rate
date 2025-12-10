// pages/api/liveRates.js

// Exchangerate.host 的免費端點
const API_URL = 'https://api.exchangerate.host/latest'; 

// 從 config.js 導入 CURRENCIES 列表
import { CURRENCIES } from '../../config';

export default async function handler(req, res) {
    
    // 我們只要求 USD 為基礎，返回所有貨幣 (TWD, KRW, PHP)。
    // 讓 API 自己處理，避免參數錯誤。
    const symbols = CURRENCIES.join(','); 
    const url = `${API_URL}?base=USD&symbols=${symbols}`; 

    try {
        const response = await fetch(url);
        
        // 檢查 HTTP 狀態碼
        if (!response.ok) {
            let errorText = await response.text();
            
            return res.status(response.status).json({ 
                error: `外部 API 服務錯誤 (${response.status})`,
                details: errorText.substring(0, 200) 
            });
        }
        
        const data = await response.json();

        // 檢查 API 響應內容 (Exchangerate.host 使用 success 欄位)
        if (!data.success || !data.rates) {
            // 這會捕獲到 "響應內容無效或缺少 rates 數據" 的錯誤
            const errorDetail = data.error?.message || '響應內容無效或缺少 rates 數據';
            return res.status(500).json({ error: '外部 API 數據錯誤', details: errorDetail });
        }
        
        // 補充 USD 基準值 (API base=USD，USD 匯率應該是 1)
        const finalRates = {
            ...data.rates,
            'USD': 1.00 
        };

        // 成功獲取數據
        res.status(200).json({
            rates: finalRates, 
            timestamp: data.date ? new Date(data.date).getTime() : Date.now(),
        });

    } catch (error) {
        console.error('API Call Exception:', error);
        res.status(500).json({ error: '伺服器執行 API 請求時發生例外錯誤。', details: error.message });
    }
}
