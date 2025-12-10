// pages/api/liveRates.js

const API_URL = 'https://api.exchangerate.host/latest'; // Exchangerate.host 的免費端點

// 定義我們需要的基準貨幣和目標貨幣
import { CURRENCIES } from '../../config';

export default async function handler(req, res) {
    // Exchangerate.host 接受 USD 作為基礎貨幣 (Base)
    const symbols = CURRENCIES.join(',');
    const url = `${API_URL}?base=USD&symbols=${symbols}`; 

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success || !data.rates) {
            return res.status(500).json({ error: '外部 API 請求失敗或返回錯誤', details: data.error });
        }
        
        // Exchangerate.host 返回的 rates 已經是以 USD 為基準的 TWD, KRW, PHP 匯率。
        
        // 成功獲取數據，返回給前端
        res.status(200).json({
            rates: data.rates, // 這是 USD 為基準的中價
            timestamp: data.timestamp * 1000, // API timestamp 是秒級，轉為毫秒
        });

    } catch (error) {
        console.error('API Call Error:', error);
        res.status(500).json({ error: '伺服器執行 API 請求時出錯。', details: error.message });
    }
}
