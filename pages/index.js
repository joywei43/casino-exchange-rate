// pages/index.js

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { CURRENCIES, SPREAD_CONFIG, MOCK_API_RATES } from '../config';

// --- 匯率計算邏輯 ---

const BASE_CURRENCY = 'USD'; 

/**
 * 獲取並計算所有交叉幣種的買入價和賣出價 (這是您網站的後端邏輯)
 */
const calculateRates = (baseRates) => {
    const finalRates = {};

    CURRENCIES.forEach(fromCurrency => {
        CURRENCIES.forEach(toCurrency => {
            if (fromCurrency === toCurrency) {
                finalRates[`${fromCurrency}_${toCurrency}`] = { buy: 1, sell: 1 };
                return;
            }

            // 步驟 1: 計算中價 (Mid Rate)
            const midRate = baseRates[toCurrency] / baseRates[fromCurrency];
            
            // 步驟 2: 確定使用的價差百分比
            let spreadDelta = 0;
            if (fromCurrency === 'TWD' && SPREAD_CONFIG[toCurrency]) {
                spreadDelta = SPREAD_CONFIG[toCurrency];
            } else if (toCurrency === 'TWD' && SPREAD_CONFIG[fromCurrency]) {
                spreadDelta = SPREAD_CONFIG[fromCurrency];
            } else {
                spreadDelta = 0.005; // 非 TWD 相關的預設低價差
            }

            // 步驟 3: 計算買入價和賣出價
            const buyRate = midRate * (1 + spreadDelta); // 客戶買入目標幣 (高價)
            const sellRate = midRate * (1 - spreadDelta); // 客戶賣出目標幣 (低價)

            finalRates[`${fromCurrency}_${toCurrency}`] = {
                buy: buyRate, 
                sell: sellRate,
            };
        });
    });

    return {
        rates: finalRates,
        timestamp: Date.now(),
        base: BASE_CURRENCY,
    };
};

// --- 前端元件與介面 ---

const Home = () => {
    // 狀態設定
    const [ratesData, setRatesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 計算機狀態
    const [amount, setAmount] = useState(100);
    const [fromCurrency, setFromCurrency] = useState('TWD');
    const [toCurrency, setToCurrency] = useState('USD');
    const [result, setResult] = useState(null);
    const [type, setType] = useState('buy'); // 'buy' or 'sell'

    // 數據獲取與更新 (每小時)
    const updateRates = useCallback(() => {
        setLoading(true);
        setError(null);
        try {
            // 直接運行計算邏輯
            const data = calculateRates(MOCK_API_RATES);
            setRatesData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始載入和每小時更新 (前端定時器)
    useEffect(() => {
        updateRates();
        // 每 3600 秒 (1 小時) 重新計算一次數據
        const intervalId = setInterval(updateRates, 3600000); 

        return () => clearInterval(intervalId);
    }, [updateRates]);


    // --- 計算機邏輯 ---
    const handleConvert = () => {
        if (!ratesData || !ratesData.rates) {
            setResult({ message: '匯率數據尚未載入。' });
            return;
        }

        const rates = ratesData.rates;
        const rateKey = `${fromCurrency}_${toCurrency}`;
        const rateObject = rates[rateKey];

        if (!rateObject) {
            setResult({ message: '找不到該幣種組合的匯率。' });
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
        if (error) return <p style={{ color: 'red' }}>數據載入錯誤: {error}。</p>;
        if (!ratesData || !ratesData.rates) return <p>無可用匯率數據。</p>;
        
        const rates = ratesData.rates;
        const headers = ['幣種', '買入價 (Buy)', '賣出價 (Sell)'];
        
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '10px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        {headers.map(h => <th key={h} style={{ padding: '12px', border: '1px solid #ddd' }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {CURRENCIES.flatMap(fromC => (
                        CURRENCIES.map(toC => {
                            if (fromC === toC) return null;
                            
                            const rateKey = `${fromC}_${toC}`;
                            const rate = rates[rateKey];
                            
                            return (
                                <tr key={rateKey} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                        1 {fromC} = {toC}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#28a745' }}>
                                        {rate.buy.toFixed(4)}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', color: '#dc3545' }}>
                                        {rate.sell.toFixed(4)}
                                    </td>
                                </tr>
                            );
                        })
                    )).filter(Boolean)}
                </tbody>
            </table>
        );
    };

    const timestamp = ratesData?.timestamp;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9' }}>
            <Head>
                <title>賭場專用匯率計算器 (TWD/KRW/USD/PHP)</title>
            </Head>

            <header style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #ddd' }}>
                <h1>💰 尊榮客戶匯率中心 </h1>
                <p>數據來源: 靜態中價模擬 | 更新頻率: **每小時** (客戶端)</p>
                {timestamp && (
                    <p style={{ fontSize: '0.85em', color: '#666' }}>
                        上次計算: {new Date(timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                    </p>
                )}
            </header>
            
            {/* --- 板塊一: 實時匯率顯示 --- */}
            <section style={{ marginBottom: '50px', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <h2>📊 即時買賣價列表</h2>
                <blockquote style={{ borderLeft: '3px solid #0070f3', paddingLeft: '15px', margin: '15px 0', backgroundColor: '#e6f0ff', fontSize: '0.9em' }}>
                    **價差配置：** TWD/USD: 2% | TWD/KRW: 5% | TWD/PHP: 5% | 其他交叉幣種: 0.5%
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

                <button onClick={handleConvert} style={{ padding: '12px 30px', backgroundColor: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em', fontWeight: 'bold' }}>
                    立即計算
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
// 修正路徑識別
