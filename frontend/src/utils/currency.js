// Supported currencies configuration with symbols and live reference conversion rates (base USD)
export const CURRENCIES = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar (USD)', rate: 1.0 },
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', rate: 86.5 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)', rate: 0.92 },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', rate: 0.79 },
    AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)', rate: 3.67 },
    CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', rate: 1.38 },
    AUD: { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)', rate: 1.54 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

/**
 * Converts an amount from one currency to another using the exchange rate matrix
 * @param {number} amount - The amount in the source currency
 * @param {string} fromCurrency - Source currency code (default: USD)
 * @param {string} toCurrency - Target currency code (default: USD)
 * @returns {number} Converted amount rounded to 2 decimal places
 */
export function convertAmount(amount, fromCurrency = 'USD', toCurrency = 'USD') {
    const num = Number(amount) || 0;
    const fromCode = (fromCurrency || 'USD').toUpperCase();
    const toCode = (toCurrency || 'USD').toUpperCase();

    if (fromCode === toCode) return num;

    const fromRate = CURRENCIES[fromCode]?.rate || 1.0;
    const toRate = CURRENCIES[toCode]?.rate || 1.0;

    // Convert from source to USD base, then from USD base to target
    const amountInUSD = num / fromRate;
    const targetAmount = amountInUSD * toRate;

    return parseFloat(targetAmount.toFixed(2));
}

/**
 * Formats a currency amount with symbol and appropriate comma/decimal grouping
 * @param {number} amount
 * @param {string} currencyCode
 * @returns {string} Formatted string like "$29.00" or "₹2,499.00"
 */
export function formatCurrency(amount, currencyCode = 'USD') {
    const code = (currencyCode || 'USD').toUpperCase();
    const cur = CURRENCIES[code] || CURRENCIES.USD;
    const num = Number(amount) || 0;

    if (code === 'INR') {
        const parts = num.toFixed(2).split('.');
        let intPart = parts[0];
        const isNeg = intPart.startsWith('-');
        if (isNeg) intPart = intPart.slice(1);
        let formatted = intPart;
        if (intPart.length > 3) {
            const last3 = intPart.slice(-3);
            const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            formatted = rest + ',' + last3;
        }
        return `${cur.symbol}${isNeg ? '-' : ''}${formatted}.${parts[1]}`;
    }

    return `${cur.symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
