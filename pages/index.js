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
    // 預設 'buy'，這樣在計算時會使用 buy 價格 (高價)
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
            setResult({ message
