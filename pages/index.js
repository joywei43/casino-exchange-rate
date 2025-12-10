// pages/index.js
import Head from 'next/head';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SPREAD_CONFIG, DISPLAY_PAIRS, CURRENCY_SYMBOLS, CURRENCIES } from '../config';

const USDT_IMG_URL = '/tether-usdt-logo.png'; 

// --- 匯率計算核心邏輯 (確保包含反向計算) ---
const calculateRates = (baseRates, spreadConfig) => {
    const finalRates = {};
    const requiredPairs = DISPLAY_PAIRS.map(p => `${p.from}_${p.to}`);
    const inversePairs = requiredPairs.map(p => {
        const [from, to] = p.split('_');
        return `${to}_${from}`;
    });
    const allPairs = [...new Set([...requiredPairs, ...inversePairs])];

    allPairs.forEach((rateKey) => {
        const [from, to] = rateKey.split('_');
        const spreadDelta = spreadConfig[rateKey] || 0.03; 
        
        let midRate;
        midRate = baseRates[to] / baseRates[from];

        if (midRate === undefined || midRate === 0) {
             console.error(`Missing base rate or invalid mid rate for ${rateKey}`);
             return; 
        }
        
        // 核心邏輯：Buy/Sell 定義修正
        // Buy Rate: 客戶買入目標幣 (高價) = Mid * (1 + Spread)
        // Sell Rate: 客戶賣出目標幣 (低價) = Mid * (1 - Spread)

        const buyRate = midRate * (1 + spreadDelta); 
        const sellRate = midRate * (1 - spreadDelta); 

        finalRates[rateKey] = {
            mid: midRate,
            buy: buyRate, 
            sell: sellRate,
        };
    });

    return finalRates;
};
// ------------------------------------------------------------------------------------

// --- 輔助函數：將 USD 替換為 USDT 顯示 ---
const formatCurrencyDisplay = (code) => {
    return code === 'USD' ? 'USDT' : code;
};


const Home = () => {
    // 狀態設定
    const [rates, setRates] = useState(null);
    const [timestamp, setTimestamp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 計算機狀態
    const [amount, setAmount] = useState(100);
    const [fromCurrency, setFromCurrency] = useState('USD'); 
    const [toCurrency, setToCurrency] = useState('KRW'); 
    const [result, setResult] = useState(null);
    // **重要修正**：移除按鈕後，我們假設計算機的 Buy/Sell 價格由 From/To 決定
    // 但為計算方便，我們保留 type 狀態，並讓它預設為 'buy' (客戶買入)
    const [type, setType] = useState('buy'); 

    // --- 數據獲取函數 (保持不變) ---
    const fetchRates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/liveRates'); 
            const apiData = await res.json();
            
            if (apiData.error) {
                throw new Error(apiData.details || apiData.error);
            }
            
            const calculatedRates = calculateRates(apiData.rates, SPREAD_CONFIG);
            
            setRates(calculatedRates);
            setTimestamp(apiData.timestamp);
            
        } catch (err) {
            setError('數據獲取失敗，請檢查 API Key 或等待額度重置。');
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始載入和每小時更新 (前端定時器)
    useEffect(() => {
        fetchRates();
        const intervalId = setInterval(fetchRates, 3600000); 
        return () => clearInterval(intervalId);
    }, [fetchRates]);


    // 🎯 核心防呆邏輯：根據 From Currency 過濾 To Currency 選項
    const availableToCurrencies = useMemo(() => {
        if (fromCurrency === 'USD') {
            return CURRENCIES.filter(c => c !== 'USD');
        } else {
            return ['USD'];
        }
    }, [fromCurrency]);

    // 確保當 From Currency 改變時，To Currency 是一個有效選項
    useEffect(() => {
        if (!availableToCurrencies.includes(toCurrency)) {
            setToCurrency(availableToCurrencies[0] || 'USD');
        }
    }, [fromCurrency, availableToCurrencies, toCurrency]);


    // --- 計算機邏輯 (使用預設的 'buy' 價格) ---
    const handleConvert = () => {
        if (!rates) {
            setResult({ message: '匯率數據尚未載入。' });
            return;
        }

        const rateKey = `${fromCurrency}_${toCurrency}`;
        const inverseRateKey = `${toCurrency}_${fromCurrency}`;

        let finalRate;
        
        if (rates[rateKey]) {
             // 正向交易 (USD -> KRW)
             // 由於移除按鈕，我們假設客戶總是 '買入' 目標幣 (toCurrency)
             finalRate = rates[rateKey].buy; 
        } 
        else if (rates[inverseRateKey]) {
             // 反向交易 (KRW -> USD)
             // 客戶提供 KRW (from) 收到 USDT (to)。這意味著：
             // 客戶賣出 KRW (from)，買入 USDT (to)。
             // 匯率計算：R(KRW->USD) 的 Buy = 1 / R(USD->KRW) 的 Sell
             finalRate = 1 / rates[inverseRateKey].sell;
        } else {
            setResult({ message: '不支援該交易對。請選擇 USD/USDT 與 KRW/PHP/JPY/HKD 之間的兌換。' });
            return;
        }

        const convertedAmount = amount * finalRate;
        
        setResult({
            amount: convertedAmount.toFixed(4),
            rate: finalRate.toFixed(4),
            message: null,
        });
    };


    // --- 渲染表格 (表格欄位對調: Sell | Buy) ---
    const renderRateTable = () => {
        if (loading) return <p>數據載入中...</p>;
        if (error) return <p style={{ color: 'red' }}>{error}</p>;
        if (!rates) return <p>無可用匯率數據。</p>;
        
        // **修正**：對調表格標頭
        const headers = ['交易對', '賣出價 (Sell)', '買入價 (Buy)'];
        
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                            {headers.map(h => <th key={h} style={{ padding: '12px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {DISPLAY_PAIRS.map(({ from, to, icon }) => {
                            const rateKey = `${from}_${to}`;
                            const rate = rates[rateKey];
                            
                            if (!rate) return null;
                            
                            const displayFrom = formatCurrencyDisplay(from);
                            const showUsdtLogo = from === 'USD'; 

                            return (
                                <tr key={rateKey} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                        {showUsdtLogo && <img src={USDT_IMG_URL} alt="USDT Icon" style={{width: '20px', height: '20px', marginRight: '8px'}} />}
                                        {displayFrom}/{to} {icon} 
                                    </td>
                                    {/* **修正**：對調 Buy 和 Sell 數據 */}
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#dc3545' }}>
                                        {rate.sell.toFixed(4)}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#28a745' }}>
                                        {rate.buy.toFixed(4)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };


    return (
        <div style={{ 
            maxWidth: '1000px', 
            margin: '0 auto', 
            padding: '15px', 
            fontFamily: 'Arial, sans-serif', 
            backgroundColor: '#f9f9f9',
            minWidth: '320px'
        }}>
            <Head>
                <title>EVERWIN-VIP 參考匯率</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: '2px solid #ddd' }}>
                <h1>🏆 EVERWIN-VIP 參考匯率</h1>
                {timestamp && (
                    <p style={{ fontSize: '0.85em', color: '#666' }}>
                        最新更新時間: {new Date(timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '.').replace(',', '')}
                    </p>
                )}
            </header>
            
            {/* --- 板塊一: 實時匯率顯示 --- */}
            <section style={{ marginBottom: '30px', backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <h2>📈 實時匯率</h2>
                {renderRateTable()}
            </section>

            {/* --- 板塊二: 試算計算機 --- */}
            <section style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <h2>🧮 匯率試算計算機</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                    
                    {/* 輸入金額 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontWeight: 'bold' }}>輸入金額:</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0
