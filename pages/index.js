// pages/index.js
import Head from 'next/head';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SPREAD_CONFIG, DISPLAY_PAIRS, CURRENCY_SYMBOLS, CURRENCIES } from '../config';

const USDT_IMG_URL = '/tether-usdt-logo.png'; 

// --- 匯率計算核心邏輯 (確保包含反向計算) ---
const calculateRates = (baseRates, spreadConfig) => {
    const finalRates = {};

    // 獲取所有需要的交易對 (包含顯示列表和反向交易)
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
    // 由於用戶要求移除 Buy/Sell 按鈕，我們預設使用 'buy' 價格進行計算
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
            // 如果是 USDT，可以選所有幣種 (除了 USDT 自己)
            return CURRENCIES.filter(c => c !== 'USD');
        } else {
            // 如果是其他幣種 (KRW/PHP/JPY/HKD)，只能兌換回 USD
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
        let keyToUse;

        // 檢查正向和反向交易對 (由於防呆已處理，這裡只需確保數據存在)
        if (rates[rateKey]) {
            keyToUse = rateKey;
        } 
        else if (rates[inverseRateKey]) {
            keyToUse = inverseRateKey;
        } else {
            // 由於防呆邏輯已經過濾選項，這裡理論上不應該被觸發，除非 API 數據缺失
            setResult({ message: '不支援該交易對。' });
            return;
        }

        // 確定最終使用的買賣價
        // **重要：由於移除了選擇按鈕，我們統一使用 'buy' 價格進行計算**
        if (keyToUse === rateKey) {
             // 正向交易 (USD -> KRW)
             finalRate = rates[rateKey].buy;
        } 
        else if (keyToUse === inverseRateKey) {
             // 反向交易 (KRW -> USD): R(A->B) 的 Buy = 1 / R(B->A) 的 Sell
             finalRate = 1 / rates[inverseRateKey].sell;
        }

        const convertedAmount = amount * finalRate;
        
        setResult({
            amount: convertedAmount.toFixed(4),
            rate: finalRate.toFixed(4),
            message: null,
            // 由於移除了選項，我們在這裡明確顯示使用的是 Buy 價格
            rateType: 'Buy (客戶買入)'
        });
    };


    // --- 渲染表格 ---
    const renderRateTable = () => {
        if (loading) return <p>數據載入中...</p>;
        if (error) return <p style={{ color: 'red' }}>{error}</p>;
        if (!rates) return <p>無可用匯率數據。</p>;
        
        // 修正：移除表格中的國旗，只保留 USDT Logo
        const headers = ['交易對', '買入價 (Buy)', '賣出價 (Sell)'];
        
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                            {headers.map(h => <th key={h} style={{ padding: '12px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {DISPLAY_PAIRS.map(({ from, to }) => { // 移除 icon
                            const rateKey = `${from}_${to}`;
                            const rate = rates[rateKey];
                            
                            if (!rate) return null;
                            
                            const displayFrom = formatCurrencyDisplay(from);
                            const showUsdtLogo = from === 'USD'; 

                            return (
                                <tr key={rateKey} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                        {/* USDT 圖標 */}
                                        {showUsdtLogo && <img src={USDT_IMG_URL} alt="USDT Icon" style={{width: '20px', height: '20px', marginRight: '8px'}} />}
                                        {displayFrom}/{to} 
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#28a745' }}>
                                        {rate.buy.toFixed(4)}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#dc3545' }}>
                                        {rate.sell.toFixed(4)}
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
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
                            style={{ padding: '10px', width: '60%', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    {/* 從幣種 (標籤修改為「客戶提供幣種」) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontWeight: 'bold' }}>客戶提供幣種:</label>
                        <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} style={{ padding: '10px', width: '60%', border: '1px solid #ddd', borderRadius: '4px' }}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{formatCurrencyDisplay(c)}</option>)}
                        </select>
                    </div>

                    {/* 到幣種 (標籤修改為「客戶收到幣種」) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontWeight: 'bold' }}>客戶收到幣種:</label>
                        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} style={{ padding: '10px', width: '60%', border: '1px solid #ddd', borderRadius: '4px' }}>
                            {availableToCurrencies.map(c => <option key={c} value={c}>{formatCurrencyDisplay(c)}</option>)}
                        </select>
                    </div>
                </div>

                {/* 徹底移除「客戶買入/客戶賣出」單選按鈕的部分 */}
                {/* 由於我們預設使用 Buy 價格，此處不需顯示單選按鈕 */}

                <button onClick={handleConvert} disabled={loading} style={{ width: '100%', padding: '12px 30px', backgroundColor: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1.1em', fontWeight: 'bold' }}>
                    {loading ? '載入中...' : '立即計算'}
                </button>

                {result && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #bce8f1', borderRadius: '4px' }}>
                        {result.message ? (
                            <p style={{ color: 'red' }}>{result.message}</p>
                        ) : (
                            <>
                                <p style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                                    {amount} {formatCurrencyDisplay(fromCurrency)} 兌換結果 (以 {result.rateType} 價格計算):
                                </p>
                                <p style={{ fontSize: '1.6em', color: '#0070f3', margin: '0' }}>
                                    約等於 <span style={{ fontWeight: 'bolder' }}>{result.amount}</span> {formatCurrencyDisplay(toCurrency)}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
