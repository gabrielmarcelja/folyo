/**
 * Folyo - Validation Utilities
 * Centralized validation functions for forms and data
 */

const Validators = {
    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {object} { valid: boolean, message: string }
     */
    email(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email is required' };
        }

        const trimmed = email.trim();

        if (trimmed.length === 0) {
            return { valid: false, message: 'Email is required' };
        }

        // RFC 5322 simplified email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(trimmed)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        if (trimmed.length > 254) {
            return { valid: false, message: 'Email address is too long' };
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate password with comprehensive rules
     * @param {string} password - Password to validate
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, message: string, errors: array }
     */
    password(password, options = {}) {
        const defaults = {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            checkCommonPasswords: true
        };

        const opts = { ...defaults, ...options };
        const errors = [];

        if (!password || typeof password !== 'string') {
            return { valid: false, message: 'Password is required', errors: ['Password is required'] };
        }

        // Length check
        if (password.length < opts.minLength) {
            errors.push(`Password must be at least ${opts.minLength} characters long`);
        }

        // Uppercase check
        if (opts.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        // Lowercase check
        if (opts.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        // Number check
        if (opts.requireNumbers && !/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        // Special character check
        if (opts.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        // Common password check
        if (opts.checkCommonPasswords) {
            const commonPasswords = [
                'password', '123456', '12345678', 'qwerty', 'abc123',
                'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
                'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
                'bailey', 'passw0rd', 'shadow', '123123', '654321'
            ];

            if (commonPasswords.includes(password.toLowerCase())) {
                errors.push('Password is too common. Please choose a stronger password');
            }
        }

        // Repeated character check
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password should not contain repeated characters');
        }

        const valid = errors.length === 0;
        const message = valid ? '' : errors[0]; // Return first error as main message

        return { valid, message, errors };
    },

    /**
     * Validate number
     * @param {*} value - Value to validate
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, message: string }
     */
    number(value, options = {}) {
        const defaults = {
            min: null,
            max: null,
            allowDecimals: true,
            allowNegative: true
        };

        const opts = { ...defaults, ...options };

        if (value === null || value === undefined || value === '') {
            return { valid: false, message: 'Value is required' };
        }

        const num = Number(value);

        if (isNaN(num)) {
            return { valid: false, message: 'Please enter a valid number' };
        }

        if (!opts.allowDecimals && num % 1 !== 0) {
            return { valid: false, message: 'Decimal numbers are not allowed' };
        }

        if (!opts.allowNegative && num < 0) {
            return { valid: false, message: 'Negative numbers are not allowed' };
        }

        if (opts.min !== null && num < opts.min) {
            return { valid: false, message: `Value must be at least ${opts.min}` };
        }

        if (opts.max !== null && num > opts.max) {
            return { valid: false, message: `Value must be at most ${opts.max}` };
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate required field
     * @param {*} value - Value to validate
     * @param {string} fieldName - Field name for error message
     * @returns {object} { valid: boolean, message: string }
     */
    required(value, fieldName = 'This field') {
        if (value === null || value === undefined) {
            return { valid: false, message: `${fieldName} is required` };
        }

        if (typeof value === 'string' && value.trim().length === 0) {
            return { valid: false, message: `${fieldName} is required` };
        }

        if (Array.isArray(value) && value.length === 0) {
            return { valid: false, message: `${fieldName} is required` };
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate string length
     * @param {string} value - String to validate
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, message: string }
     */
    length(value, options = {}) {
        const defaults = {
            min: null,
            max: null,
            exact: null
        };

        const opts = { ...defaults, ...options };

        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'Value is required' };
        }

        const len = value.length;

        if (opts.exact !== null && len !== opts.exact) {
            return { valid: false, message: `Must be exactly ${opts.exact} characters` };
        }

        if (opts.min !== null && len < opts.min) {
            return { valid: false, message: `Must be at least ${opts.min} characters` };
        }

        if (opts.max !== null && len > opts.max) {
            return { valid: false, message: `Must be at most ${opts.max} characters` };
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate date
     * @param {*} value - Date to validate
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, message: string }
     */
    date(value, options = {}) {
        const defaults = {
            allowPast: true,
            allowFuture: true,
            minDate: null,
            maxDate: null
        };

        const opts = { ...defaults, ...options };

        if (!value) {
            return { valid: false, message: 'Date is required' };
        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return { valid: false, message: 'Please enter a valid date' };
        }

        const now = new Date();

        if (!opts.allowPast && date < now) {
            return { valid: false, message: 'Date cannot be in the past' };
        }

        if (!opts.allowFuture && date > now) {
            return { valid: false, message: 'Date cannot be in the future' };
        }

        if (opts.minDate) {
            const min = new Date(opts.minDate);
            if (date < min) {
                return { valid: false, message: `Date must be after ${min.toLocaleDateString()}` };
            }
        }

        if (opts.maxDate) {
            const max = new Date(opts.maxDate);
            if (date > max) {
                return { valid: false, message: `Date must be before ${max.toLocaleDateString()}` };
            }
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {object} { valid: boolean, message: string }
     */
    url(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, message: 'URL is required' };
        }

        const trimmed = url.trim();

        try {
            const urlObj = new URL(trimmed);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { valid: false, message: 'URL must use HTTP or HTTPS protocol' };
            }
            return { valid: true, message: '' };
        } catch (e) {
            return { valid: false, message: 'Please enter a valid URL' };
        }
    },

    /**
     * Validate cryptocurrency quantity
     * @param {*} value - Quantity to validate
     * @returns {object} { valid: boolean, message: string }
     */
    cryptoQuantity(value) {
        const result = this.number(value, {
            min: 0.00000001, // Smallest unit (1 satoshi)
            allowDecimals: true,
            allowNegative: false
        });

        if (!result.valid) {
            if (result.message.includes('at least')) {
                return { valid: false, message: 'Quantity must be greater than 0' };
            }
            return result;
        }

        // Check for too many decimal places (8 is standard for crypto)
        const valueStr = String(value);
        if (valueStr.includes('.')) {
            const decimals = valueStr.split('.')[1].length;
            if (decimals > 8) {
                return { valid: false, message: 'Maximum 8 decimal places allowed' };
            }
        }

        return { valid: true, message: '' };
    },

    /**
     * Validate cryptocurrency price
     * @param {*} value - Price to validate
     * @returns {object} { valid: boolean, message: string }
     */
    cryptoPrice(value) {
        return this.number(value, {
            min: 0.00000001,
            allowDecimals: true,
            allowNegative: false
        });
    },

    /**
     * Validate form with multiple fields
     * @param {object} data - Object with field values
     * @param {object} rules - Validation rules for each field
     * @returns {object} { valid: boolean, errors: object }
     */
    validateForm(data, rules) {
        const errors = {};
        let valid = true;

        for (const field in rules) {
            const fieldRules = rules[field];
            const value = data[field];

            for (const rule of fieldRules) {
                const result = this.applyRule(value, rule, field);

                if (!result.valid) {
                    errors[field] = result.message;
                    valid = false;
                    break; // Stop at first error for this field
                }
            }
        }

        return { valid, errors };
    },

    /**
     * Apply a single validation rule
     * @param {*} value - Value to validate
     * @param {object|string} rule - Validation rule
     * @param {string} fieldName - Field name for error messages
     * @returns {object} { valid: boolean, message: string }
     */
    applyRule(value, rule, fieldName) {
        if (typeof rule === 'string') {
            // Simple rule like 'required', 'email'
            switch (rule) {
                case 'required':
                    return this.required(value, fieldName);
                case 'email':
                    return this.email(value);
                case 'url':
                    return this.url(value);
                default:
                    return { valid: true, message: '' };
            }
        } else if (typeof rule === 'object') {
            // Complex rule with options like { type: 'number', min: 0, max: 100 }
            const { type, ...options } = rule;

            switch (type) {
                case 'number':
                    return this.number(value, options);
                case 'length':
                    return this.length(value, options);
                case 'date':
                    return this.date(value, options);
                case 'password':
                    return this.password(value, options);
                case 'cryptoQuantity':
                    return this.cryptoQuantity(value);
                case 'cryptoPrice':
                    return this.cryptoPrice(value);
                default:
                    return { valid: true, message: '' };
            }
        }

        return { valid: true, message: '' };
    },

    /**
     * Sanitize string to prevent XSS
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(str) {
        if (!str || typeof str !== 'string') return '';

        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
};

// Expose to window
window.Validators = Validators;
