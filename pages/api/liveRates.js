// pages/api/liveRates.js

const API_KEY = process.env.FREE_CURRENCY_API_KEY; 
const BASE_URL = 'https://api.freecurrencyapi.com/v1/latest'; 

import { CURRENCIES } from '../../config';

export default async function handler(req, res) {
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key 未設置，請檢查 Vercel 環境變數 FREE_CURRENCY_API_KEY。' });
    }

    // 只請求 KRW, PHP, JPY, HKD
    const targetCurrencies = CURRENCIES.filter(c => c !== 'USD').join(','); 
    const url = `${BASE_URL}?apikey=${API_KEY}&base_currency=USD&currencies=${targetCurrencies}`; 

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            let errorText = await response.text();
            return res.status(response.status).json({ error: `外部 API 服務錯誤 (${response.status})`, details: errorText.substring(0, 500) });
        }
        
        const data = await response.json();

        if (!data.data) {
            const errorDetail = data.message || 'API 響應內容無效或缺少 rates 數據';
            return res.status(500).json({ error: '外部 API 數據錯誤', details: errorDetail });
        }
        
        const finalRates = {
            ...data.data,
            'USD': 1.00 
        };

        res.status(200).json({
            rates: finalRates, 
            timestamp: Date.now(),
        });

    } catch (error) {
        console.error('API Call Exception:', error);
        res.status(500).json({ error: '伺服器執行 API 請求時發生例外錯誤。', details: error.message });
    }
}
