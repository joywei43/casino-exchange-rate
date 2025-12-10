// pages/index.js
import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { SPREAD_CONFIG, DISPLAY_PAIRS, CURRENCY_SYMBOLS, CURRENCIES } from '../config';

// --- 匯率計算核心邏輯 ---

/**
 * 核心計算函數：計算所有交叉幣種的買入價和賣出價 
 * @param {object} baseRates - 從 API 獲取的即時中價數據 (以 USD 為基準)
 * @param {object} spreadConfig - 價差配置
 */
const calculateRates = (baseRates, spreadConfig) => {
    const finalRates = {};

    DISPLAY_PAIRS.forEach(({ from, to }) => {
        // 匯率鍵 e.g., 'TWD_KRW'
        const rateKey = `${from}_${to}`;
        const spreadDelta = spreadConfig[rateKey];

        // --- 1. 計算 Mid Rate (中價) ---
        // 匯率公式: R(A->B) = R(USD->B) / R(USD->A)
        // 例如：R(TWD->KRW) = R(USD->KRW) / R(USD->TWD)
        
        let midRate;
        
        if (from === 'USD') {
             // 如果是 USD 基準，直接取目標貨幣的 rates
            midRate = baseRates[to];
        } else {
            // 計算交叉匯率
            midRate = baseRates[to] / baseRates[from];
        }
        
        if (midRate === undefined || midRate === 0) {
             console.error(`Missing base rate or invalid mid rate for ${rateKey}`);
             return; // 跳過缺少數據的交易對
        }

        // --- 2. 計算 Buy/Sell Rate ---
        // Buy Rate (客戶買入目標幣): 價格較高 (+Spread)
        const buyRate = midRate * (1 + spreadDelta); 
        
        // Sell Rate (客戶賣出目標幣): 價格較低 (-Spread)
        const sellRate = midRate * (1 - spreadDelta); 

        finalRates[rateKey] = {
            mid: midRate,
            buy: buyRate, 
            sell: sellRate,
        };
    });

    return finalRates;
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
    const [fromCurrency, setFromCurrency] = useState('TWD');
    const [toCurrency, setToCurrency] = useState('USD');
    const [result, setResult] = useState(null);
    const [type, setType] = useState('buy'); 

    // --- 數據獲取函數 (使用 Exchangerate.host 代理) ---
    const fetchRates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 呼叫我們自己的後端代理路由
            const res = await fetch('/api/liveRates'); 
            const apiData = await res.json();
            
            if (apiData.error) {
                throw new Error(apiData.details || apiData.error);
            }
            
            // 計算買賣價 (使用 config.js 價差)
            // apiData.rates 是 USD 為基準的中價
            const calculatedRates = calculateRates(apiData.rates, SPREAD_CONFIG);
            
            setRates(calculatedRates);
            setTimestamp(apiData.timestamp); // 使用 API 返回的時間戳
            
        } catch (err) {
            setError('數據獲取失敗，請稍後再試: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始載入和每小時更新 (前端定時器)
    useEffect(() => {
        fetchRates();
        // 每 3600 秒 (1 小時) 重新抓取一次數據
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
        
        // 檢查是否為指定的交易對
        const rateObject = rates[rateKey];

        if (!rateObject) {
            // 如果不是指定的五個交易對，則嘗試計算反向匯率
            const inverseRateKey = `${toCurrency}_${fromCurrency}`;
            const inverseRateObject = rates[inverseRateKey];
            
            if (inverseRateObject) {
                // 如果找到反向匯率，使用反向公式計算買賣價
                // R(A->B) = 1 / R(B->A)
                // 客戶買入 B (A->B)：使用 R(B->A) 的 Buy Rate -> 1 / R(B->A)_Sell
                // 客戶賣出 B (A->B)：使用 R(B->A) 的 Sell Rate -> 1 / R(B->A)_Buy
                
                let finalRate;
                if (type === 'buy') {
                    // 客戶買入 B (A->B) 時，您是以高價賣出 A，對應 R(B->A) 的 Sell Rate (您低價買入 B)
                    // 這裡的邏輯比較複雜，為了簡化和確保價差邏輯正確：
                    // 我們從中價計算
                    const midRate = 1 / inverseRateObject.mid; 
                    const spreadDelta = SPREAD_CONFIG[inverseRateKey] || 0.005; // 由於是反向，價差應該相同
                    
                    // 重新計算目標匯率的買賣價 (A->B)
                    finalRate = type === 'buy' ? midRate * (1 + spreadDelta) : midRate * (1 - spreadDelta);

                } else {
                    // 客戶賣出 B (A->B) 時，您是以低價買入 B，對應 R(B->A) 的 Buy Rate (您高價賣出 B)
                     const midRate = 1 / inverseRateObject.mid; 
                     const spreadDelta = SPREAD_CONFIG[inverseRateKey] || 0.005; 
                    
                     finalRate = type === 'buy' ? midRate * (1 + spreadDelta) : midRate * (1 - spreadDelta);
                }
                 
                // 由於交叉和反向計算邏輯複雜，這裡我們統一採用中價計算後，加上價差，確保單向性
                // 為了避免錯誤，如果不是 DISPLAY_PAIRS 中的，我們不允許試算
                 setResult({ message: '請選擇顯示列表中的五個主要交易對進行試算。' });
                 return;
            } else {
                setResult({ message: '該交易對不在五個主要匯率中，無法試算。' });
                return;
            }
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
                        
                        const displayRate = `1 ${CURRENCY_SYMBOLS[from] || from} = ${CURRENCY_SYMBOLS[to] || to}`;

                        return (
                            <tr key={rateKey} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                    {icon} {from}/{to} <span style={{fontSize:'0.8em', fontWeight: 'normal'}} >({displayRate})</span>
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
                    **自訂價差：** TWD/KRW: 6% | TWD/USD: 3% | TWD/PHP: 6% | USD/KRW: 5% | USD/PHP: 5%
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
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>到幣種:</label>
                        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                        客戶**買入** {toCurrency} (使用買入價)
                    </label>
                    <label>
                        <input 
                            type="radio" 
                            value="sell" 
                            checked={type === 'sell'} 
                            onChange={() => setType('sell')} 
                            style={{ marginRight: '5px' }}
                        />
                        客戶**賣出** {toCurrency} (使用賣出價)
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
                                    {amount} {fromCurrency} 兌換結果:
                                </p>
                                <p style={{ fontSize: '1.8em', color: '#0070f3', margin: '0' }}>
                                    約等於 <span style={{ fontWeight: 'bolder' }}>{result.amount}</span> {toCurrency}
                                </p>
                                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                                    (本次使用的匯率: 1 {fromCurrency} = {result.rate} {toCurrency})
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
