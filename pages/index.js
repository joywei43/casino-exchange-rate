// pages/index.js
import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { SPREAD_CONFIG, DISPLAY_PAIRS, CURRENCY_SYMBOLS, CURRENCIES } from '../config';

// 固定的 USDT 圖標 (使用 Unicode 符號)
const USDT_ICON = '🟡'; // 可以替換為任何其他表情符號或圖片連結

// --- 匯率計算核心邏輯 ---

/**
 * 核心計算函數：計算所有交叉幣種的買入價和賣出價 
 * @param {object} baseRates - 從 API 獲取的即時中價數據 (以 USD 為基準)
 * @param {object} spreadConfig - 價差配置
 */
const calculateRates = (baseRates, spreadConfig) => {
    const finalRates = {};

    DISPLAY_PAIRS.forEach(({ from, to }) => {
        const rateKey = `${from}_${to}`;
        const spreadDelta = spreadConfig[rateKey];
        
        let midRate;
        if (from === 'USD') {
            midRate = baseRates[to];
        } else {
            // 這個專案只有 USD 為基準，所以這裡的 else 主要是防止錯誤
            midRate = baseRates[to] / baseRates[from];
        }
        
        if (midRate === undefined || midRate === 0) {
             console.error(`Missing base rate or invalid mid rate for ${rateKey}`);
             return; 
        }

        // 計算 Buy/Sell Rate
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

// --- 輔助函數：將 USD 替換為 USDT 顯示 ---
const formatCurrencyDisplay = (code) => {
    return code === 'USD' ? `USDT ${USDT_ICON}` : code;
};

// --- 前端元件與介面 ---

const Home = () => {
    // 狀態設定
    const [rates, setRates] = useState(null);
    const [timestamp, setTimestamp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 計算機狀態
    const [amount, setAmount] = useState(100);
    const [fromCurrency, setFromCurrency] = useState('USD'); // 預設為 USD/USDT
    const [toCurrency, setToCurrency] = useState('KRW');
    const [result, setResult] = useState(null);
    const [type, setType] = useState('buy'); 

    // --- 數據獲取函數 (API 代理) ---
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
            // 由於 API 可能拒絕，我們顯示一個更清晰的錯誤提示
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


    // --- 計算機邏輯 ---
    const handleConvert = () => {
        if (!rates) {
            setResult({ message: '匯率數據尚未載入。' });
            return;
        }

        const rateKey = `${fromCurrency}_${toCurrency}`;
        const rateObject = rates[rateKey];

        if (!rateObject) {
             setResult({ message: '該交易對不在顯示列表中，請選擇 USD 兌換其他貨幣。' });
             return;
        }

        let finalRate = type === 'buy' ? rateObject.buy : rateObject.sell;
        const convertedAmount = amount * finalRate;
        
        setResult({
            amount: convertedAmount.toFixed(4),
            rate: finalRate.toFixed(4),
            message: null,
        });
    };
    
    // --- 渲染表格 ---
    const renderRateTable = () => {
        if (loading) return <p>數據載入中...</p>;
        if (error) return <p style={{ color: 'red' }}>{error}</p>;
        if (!rates) return <p>無可用匯率數據。</p>;
        
        const headers = ['交易對', '買入價 (Buy)', '賣出價 (Sell)'];
        
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        {headers.map(h => <th key={h} style={{ padding: '12px', border: '1px solid #ddd' }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {DISPLAY_PAIRS.map(({ from, to, icon }) => {
                        const rateKey = `${from}_${to}`;
                        const rate = rates[rateKey];
                        
                        if (!rate) return null;
                        
                        // 替換顯示名稱
                        const displayFrom = formatCurrencyDisplay(from);
                        const displayTo = formatCurrencyDisplay(to);

                        const displayRate = `1 ${displayFrom} = ${CURRENCY_SYMBOLS[to] || to}`;

                        return (
                            <tr key={rateKey} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                    {USDT_ICON} {displayFrom.replace(` ${USDT_ICON}`, '')}/{to} <span style={{fontSize:'0.8em', fontWeight: 'normal'}} >({displayRate})</span>
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
        );
    };


    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9' }}>
            <Head>
                <title>EVERWIN-VIP 參考匯率</title>
            </Head>

            <header style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #ddd' }}>
                <h1>🏆 EVERWIN-VIP 參考匯率</h1>
                {timestamp && (
                    <p style={{ fontSize: '0.85em', color: '#666' }}>
                        最新更新時間: {new Date(timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '.').replace(',', '')}
                    </p>
                )}
            </header>
            
            {/* --- 板塊一: 實時匯率顯示 --- */}
            <section style={{ marginBottom: '50px', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <h2>📈 實時匯率</h2>
                <blockquote style={{ borderLeft: '3px solid #d9534f', paddingLeft: '15px', margin: '15px 0', backgroundColor: '#f9e8e7', fontSize: '0.9em' }}>
                    **自訂價差：** USD/KRW: 5% | USD/PHP: 5% | USD/JPY: 5% | USD/HKD: 5%
                </blockquote>
                {renderRateTable()}
            </section>

            {/* --- 板塊二: 試算計算機 --- */}
            <section style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <h2>🧮 匯率試算計算機</h2>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', marginBottom: '25px' }}>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>輸入金額:</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
                            style={{ padding: '10px', width: '150px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>從幣種:</label>
                        <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{formatCurrencyDisplay(c)}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>到幣種:</label>
                        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{formatCurrencyDisplay(c)}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                     <label style={{ marginRight: '30px' }}>
                        <input 
                            type="radio" 
                            value="buy" 
                            checked={type === 'buy'} 
                            onChange={() => setType('buy')} 
                            style={{ marginRight: '5px' }}
                        />
                        客戶**買入** {formatCurrencyDisplay(toCurrency)} (使用買入價)
                    </label>
                    <label>
                        <input 
                            type="radio" 
                            value="sell" 
                            checked={type === 'sell'} 
                            onChange={() => setType('sell')} 
                            style={{ marginRight: '5px' }}
                        />
                        客戶**賣出** {formatCurrencyDisplay(toCurrency)} (使用賣出價)
                    </label>
                </div>

                <button onClick={handleConvert} disabled={loading} style={{ padding: '12px 30px', backgroundColor: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1.1em', fontWeight: 'bold' }}>
                    {loading ? '載入中...' : '立即計算'}
                </button>

                {result && (
                    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f8ff', border: '1px solid #bce8f1', borderRadius: '4px' }}>
                        {result.message ? (
                            <p style={{ color: 'red' }}>{result.message}</p>
                        ) : (
                            <>
                                <p style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                                    {amount} {formatCurrencyDisplay(fromCurrency)} 兌換結果:
                                </p>
                                <p style={{ fontSize: '1.8em', color: '#0070f3', margin: '0' }}>
                                    約等於 <span style={{ fontWeight: 'bolder' }}>{result.amount}</span> {formatCurrencyDisplay(toCurrency)}
                                </p>
                                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                                    (本次使用的匯率: 1 {formatCurrencyDisplay(fromCurrency)} = {result.rate} {formatCurrencyDisplay(toCurrency)})
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
