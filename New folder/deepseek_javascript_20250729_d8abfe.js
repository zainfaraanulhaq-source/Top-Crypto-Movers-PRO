// API Configuration
const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const TOP_N_GAINERS = 5;

// DOM Elements
const elements = {
    currentTableBody: document.querySelector('#currentTable tbody'),
    previousTableBody: document.querySelector('#previousTable tbody'),
    lastUpdatedText: document.getElementById('lastUpdated'),
    currentIntervalTime: document.getElementById('currentIntervalTime'),
    previousIntervalTime: document.getElementById('previousIntervalTime'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    refreshDataBtn: document.getElementById('refreshDataBtn'),
    refreshBtnText: document.getElementById('refreshBtnText'),
    analysisModal: document.getElementById('analysisModal'),
    analysisModalTitle: document.getElementById('analysisModalTitle'),
    analysisText: document.getElementById('analysisText'),
    analysisLoading: document.getElementById('analysisLoading'),
    closeAnalysisBtn: document.getElementById('closeAnalysisBtn'),
    closeButton: document.querySelector('.close-button')
};

// State Management
let currentGainers = [];
let previousGainers = [];

// Initialize Application
function init() {
    loadPreviousData();
    setupEventListeners();
    updateTracker();
}

// Load previous data from session storage
function loadPreviousData() {
    const storedPreviousGainers = sessionStorage.getItem('previousGainers');
    if (storedPreviousGainers) {
        previousGainers = JSON.parse(storedPreviousGainers);
        renderTable(previousGainers, elements.previousTableBody);
    }
    
    const previousTime = sessionStorage.getItem('previousIntervalTime');
    if (previousTime) {
        elements.previousIntervalTime.textContent = `Previous Interval: ${formatDateTime(previousTime)}`;
    }
}

// Set up event listeners
function setupEventListeners() {
    elements.refreshDataBtn.addEventListener('click', updateTracker);
    elements.closeAnalysisBtn.addEventListener('click', closeAnalysisModal);
    elements.closeButton.addEventListener('click', closeAnalysisModal);
    
    // Close modal when clicking outside content
    elements.analysisModal.addEventListener('click', (e) => {
        if (e.target === elements.analysisModal) closeAnalysisModal();
    });
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Show/hide error messages
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// Modal controls
function showAnalysisModal(title) {
    elements.analysisModalTitle.textContent = title;
    elements.analysisText.textContent = '';
    elements.analysisLoading.classList.add('hidden');
    elements.analysisModal.classList.add('active');
}

function closeAnalysisModal() {
    elements.analysisModal.classList.remove('active');
}

// Render table data
function renderTable(data, tableBody, highlightedSymbols = new Set()) {
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    No data available
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach((coin, index) => {
        const row = document.createElement('tr');
        const isHighlighted = highlightedSymbols.has(coin.symbol);
        const gainClass = parseFloat(coin.gainPercent) >= 0 ? 'gain-positive' : 'gain-negative';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="${isHighlighted ? 'highlighted-coin' : ''}">${coin.symbol}</td>
            <td>$${parseFloat(coin.price).toFixed(2)}</td>
            <td class="${gainClass}">${parseFloat(coin.gainPercent).toFixed(2)}%</td>
            <td>
                <button class="get-analysis-btn"
                        data-symbol="${coin.symbol}"
                        data-price="${parseFloat(coin.price).toFixed(2)}"
                        data-gain="${parseFloat(coin.gainPercent).toFixed(2)}">
                    ✨ Info
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to analysis buttons
    tableBody.querySelectorAll('.get-analysis-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const { symbol, price, gain } = btn.dataset;
            getGeminiAnalysis(symbol, price, gain);
        });
    });
}

// Find common symbols between current and previous gainers
function findCommonSymbols() {
    const currentSymbols = new Set(currentGainers.map(c => c.symbol));
    const common = new Set();
    
    previousGainers.forEach(coin => {
        if (currentSymbols.has(coin.symbol)) {
            common.add(coin.symbol);
        }
    });
    
    return common;
}

// Fetch top gainers from Binance
async function fetchTopGainers() {
    try {
        toggleLoading(true);
        
        const response = await fetch(BINANCE_API_URL);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        // Filter and sort USDT pairs
        const usdtPairs = data
            .filter(item => item.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
        
        // Get top N gainers
        return usdtPairs.slice(0, TOP_N_GAINERS).map(item => ({
            symbol: item.symbol,
            price: parseFloat(item.lastPrice),
            gainPercent: parseFloat(item.priceChangePercent)
        }));
        
    } catch (error) {
        console.error('Binance API error:', error);
        showError(`Failed to fetch data: ${error.message}`);
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Toggle loading state
function toggleLoading(isLoading) {
    if (isLoading) {
        elements.loadingIndicator.classList.remove('hidden');
        elements.refreshDataBtn.disabled = true;
        elements.refreshBtnText.textContent = 'Fetching...';
    } else {
        elements.loadingIndicator.classList.add('hidden');
        elements.refreshDataBtn.disabled = false;
        elements.refreshBtnText.textContent = 'Refresh Data';
    }
}

// Get Gemini AI analysis
async function getGeminiAnalysis(symbol, price, gain) {
    try {
        showAnalysisModal(`Analysis for ${symbol}`);
        elements.analysisLoading.classList.remove('hidden');
        
        // Replace with your actual Gemini API key
        const API_KEY = "YOUR_GEMINI_API_KEY";
        
        const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Provide a brief, neutral market overview and potential factors influencing the recent performance of ${symbol} cryptocurrency. Current price: $${price}, 24h change: ${gain}%. Focus on general market sentiment without giving financial advice.`
                    }]
                }]
            })
        });
        
        const data = await response.json();
        
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            elements.analysisText.textContent = data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Unexpected API response');
        }
        
    } catch (error) {
        console.error('Gemini API error:', error);
        elements.analysisText.textContent = 'Could not fetch analysis. Please try again later.';
    } finally {
        elements.analysisLoading.classList.add('hidden');
    }
}

// Update tracker data
async function updateTracker() {
    // Move current to previous
    previousGainers = currentGainers;
    sessionStorage.setItem('previousGainers', JSON.stringify(previousGainers));
    sessionStorage.setItem('previousIntervalTime', sessionStorage.getItem('currentIntervalTime') || '');
    
    // Fetch new data
    currentGainers = await fetchTopGainers();
    sessionStorage.setItem('currentGainers', JSON.stringify(currentGainers));
    
    // Update timestamps
    const now = new Date().toISOString();
    elements.lastUpdatedText.textContent = `Last updated: ${formatDateTime(now)}`;
    elements.currentIntervalTime.textContent = `Current Interval: ${formatDateTime(now)}`;
    sessionStorage.setItem('currentIntervalTime', now);
    
    const previousTime = sessionStorage.getItem('previousIntervalTime');
    elements.previousIntervalTime.textContent = `Previous Interval: ${formatDateTime(previousTime)}`;
    
    // Find and highlight common symbols
    const commonSymbols = findCommonSymbols();
    
    // Render tables
    renderTable(currentGainers, elements.currentTableBody, commonSymbols);
    renderTable(previousGainers, elements.previousTableBody, commonSymbols);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);