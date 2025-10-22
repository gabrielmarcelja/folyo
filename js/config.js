/**
 * Folyo - Configuration
 */

const CONFIG = {
    // API
    API_BASE_URL: 'api/proxy.php',

    // Pagination
    ITEMS_PER_PAGE: 100,

    // Refresh interval (milliseconds)
    REFRESH_INTERVAL: 60000, // 60 seconds

    // Currency symbols mapping
    CURRENCY_SYMBOLS: {
        'USD': '$',
        'EUR': '€',
        'BRL': 'R$',
        'GBP': '£',
        'JPY': '¥',
        'AUD': '$',
        'CAD': '$',
        'CHF': 'Fr',
        'CNY': '¥',
        'KRW': '₩',
        'INR': '₹',
        'MXN': '$',
        'RUB': '₽',
        'TRY': '₺',
        'ARS': '$',
        'SGD': '$',
        'HKD': '$',
        'NOK': 'kr',
        'SEK': 'kr',
        'DKK': 'kr',
        'PLN': 'zł',
        'THB': '฿',
        'MYR': 'RM',
        'ZAR': 'R',
        'PHP': '₱',
        'IDR': 'Rp',
        'CZK': 'Kč',
        'HUF': 'Ft',
        'ILS': '₪',
        'CLP': '$',
        'PKR': '₨',
        'EGP': 'ج.م',
        'VND': '₫',
        'UAH': '₴',
        'SAR': 'ر.س',
        'AED': 'د.إ',
        'TWD': 'NT$',
        'NZD': '$'
    },

    // Fear & Greed Index levels
    FEAR_GREED_LEVELS: {
        0: { label: 'Extreme Fear', class: 'extreme-fear', color: '#EA3943' },
        25: { label: 'Fear', class: 'fear', color: '#FF9500' },
        45: { label: 'Neutral', class: 'neutral', color: '#A0A0A0' },
        55: { label: 'Greed', class: 'greed', color: '#FFB800' },
        75: { label: 'Extreme Greed', class: 'extreme-greed', color: '#16C784' }
    },

    // Cryptocurrency logo URL template
    LOGO_URL_TEMPLATE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/{id}.png',

    // LocalStorage keys
    STORAGE_KEYS: {
        THEME: 'folyo_theme',
        CURRENCY: 'folyo_currency',
        LAST_UPDATE: 'folyo_last_update'
    }
};
