/**
 * Folyo - Price Chart Module
 * Renders interactive price charts using Canvas
 */

const PriceChart = {
    canvas: null,
    ctx: null,
    data: [],
    currency: 'USD',
    currencySymbol: '$',
    hoveredPoint: null,
    chartPadding: {
        top: 40,
        right: 20,
        bottom: 50,
        left: 70
    },

    /**
     * Draw rounded rectangle (polyfill for older browsers)
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} radius
     */
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    },

    /**
     * Initialize chart
     * @param {string} canvasId
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            Debug.error('Canvas element not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.setupMouseEvents();

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            this.setupCanvas();
        });
    },

    /**
     * Setup canvas size
     * @param {number} retryCount - Internal retry counter
     * @returns {boolean} - True if setup successful
     */
    setupCanvas(retryCount = 0) {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;

        // Set display size (css pixels)
        this.canvas.style.width = '100%';
        this.canvas.style.height = '400px';

        // Set actual size in memory (scaled to account for extra pixel density)
        const rect = container.getBoundingClientRect();

        // Check if dimensions are valid
        if (rect.width === 0 || rect.height === 0) {
            // Retry up to 3 times with increasing delays
            if (retryCount < 3) {
                setTimeout(() => {
                    this.setupCanvas(retryCount + 1);
                    // If we have data, try to render after setup
                    if (this.data.length > 0) {
                        this.render();
                    }
                }, 50 * (retryCount + 1)); // 50ms, 100ms, 150ms
            } else {
                console.warn('Canvas setup failed after 3 attempts - container has zero dimensions');
            }
            return false;
        }

        this.canvas.width = rect.width * dpr;
        this.canvas.height = 400 * dpr;

        // Reset transform before scaling (in case this is a re-setup)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Normalize coordinate system to use css pixels
        this.ctx.scale(dpr, dpr);

        return true;
    },

    /**
     * Setup mouse events for tooltips
     */
    setupMouseEvents() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Redraw on window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.setupCanvas();
            if (this.data.length > 0) {
                this.render();
            }
        }, 250));
    },

    /**
     * Handle mouse move
     * @param {MouseEvent} e
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find closest point
        const point = this.findClosestPoint(x, y);
        if (point && point !== this.hoveredPoint) {
            this.hoveredPoint = point;
            this.render();
        }
    },

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        if (this.hoveredPoint) {
            this.hoveredPoint = null;
            this.render();
        }
    },

    /**
     * Find closest data point to mouse position
     * @param {number} mouseX
     * @param {number} mouseY
     * @returns {object|null}
     */
    findClosestPoint(mouseX, mouseY) {
        if (this.data.length === 0) return null;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const chartWidth = width - this.chartPadding.left - this.chartPadding.right;
        const chartHeight = height - this.chartPadding.top - this.chartPadding.bottom;

        // Get price range
        const prices = this.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        // Find closest point by X coordinate
        let closest = null;
        let minDistance = Infinity;

        this.data.forEach((point, index) => {
            const x = this.chartPadding.left + (index / (this.data.length - 1)) * chartWidth;
            const y = this.chartPadding.top + ((maxPrice - point.close) / priceRange) * chartHeight;

            const distance = Math.abs(x - mouseX);
            if (distance < minDistance && distance < 30) { // 30px threshold
                minDistance = distance;
                closest = { ...point, x, y, index };
            }
        });

        return closest;
    },

    /**
     * Set chart data
     * @param {array} data - OHLCV data points
     * @param {string} currency
     */
    setData(data, currency = 'USD') {
        this.data = data;
        this.currency = currency;
        this.currencySymbol = CONFIG.CURRENCY_SYMBOLS[currency] || '$';

        // Ensure canvas is setup before rendering
        const rect = this.canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.setupCanvas();
        } else {
            this.render();
        }
    },

    /**
     * Render chart
     */
    render() {
        if (!this.ctx) {
            Debug.error('No canvas context available');
            return;
        }

        if (this.data.length === 0) {
            return;
        }

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw components
        this.drawGrid(width, height);
        this.drawAxes(width, height);
        this.drawChart(width, height);

        if (this.hoveredPoint) {
            this.drawTooltip(this.hoveredPoint);
        }
    },

    /**
     * Draw grid
     * @param {number} width
     * @param {number} height
     */
    drawGrid(width, height) {
        const chartWidth = width - this.chartPadding.left - this.chartPadding.right;
        const chartHeight = height - this.chartPadding.top - this.chartPadding.bottom;

        this.ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color') || '#EFF2F5';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.5;

        // Horizontal grid lines (5 lines)
        for (let i = 0; i <= 5; i++) {
            const y = this.chartPadding.top + (i / 5) * chartHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(this.chartPadding.left, y);
            this.ctx.lineTo(this.chartPadding.left + chartWidth, y);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1;
    },

    /**
     * Draw axes labels
     * @param {number} width
     * @param {number} height
     */
    drawAxes(width, height) {
        const chartHeight = height - this.chartPadding.top - this.chartPadding.bottom;
        const prices = this.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#808A9D';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'right';

        // Y-axis labels (prices)
        for (let i = 0; i <= 5; i++) {
            const price = maxPrice - (i / 5) * (maxPrice - minPrice);
            const y = this.chartPadding.top + (i / 5) * chartHeight;
            const formattedPrice = this.currencySymbol + Utils.formatNumber(price, 2);
            this.ctx.fillText(formattedPrice, this.chartPadding.left - 10, y + 4);
        }

        // X-axis labels (dates)
        this.ctx.textAlign = 'center';
        const step = Math.max(1, Math.floor(this.data.length / 6));
        for (let i = 0; i < this.data.length; i += step) {
            const point = this.data[i];
            const chartWidth = width - this.chartPadding.left - this.chartPadding.right;
            const x = this.chartPadding.left + (i / (this.data.length - 1)) * chartWidth;
            const date = new Date(point.time_close);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            this.ctx.fillText(label, x, height - this.chartPadding.bottom + 20);
        }
    },

    /**
     * Draw price chart
     * @param {number} width
     * @param {number} height
     */
    drawChart(width, height) {
        const chartWidth = width - this.chartPadding.left - this.chartPadding.right;
        const chartHeight = height - this.chartPadding.top - this.chartPadding.bottom;

        const prices = this.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        // Calculate points
        const points = this.data.map((point, index) => ({
            x: this.chartPadding.left + (index / (this.data.length - 1)) * chartWidth,
            y: this.chartPadding.top + ((maxPrice - point.close) / priceRange) * chartHeight
        }));

        // Determine color based on trend
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const isPositive = lastPrice >= firstPrice;
        const lineColor = isPositive ? '#16C784' : '#EA3943';
        const areaColor = isPositive ? 'rgba(22, 199, 132, 0.1)' : 'rgba(234, 57, 67, 0.1)';

        // Draw area under line
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, height - this.chartPadding.bottom);
        points.forEach(point => this.ctx.lineTo(point.x, point.y));
        this.ctx.lineTo(points[points.length - 1].x, height - this.chartPadding.bottom);
        this.ctx.closePath();
        this.ctx.fillStyle = areaColor;
        this.ctx.fill();

        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const controlX = (current.x + next.x) / 2;
            const controlY = (current.y + next.y) / 2;
            this.ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }
        this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();

        // Draw hover point
        if (this.hoveredPoint) {
            this.ctx.beginPath();
            this.ctx.arc(this.hoveredPoint.x, this.hoveredPoint.y, 6, 0, 2 * Math.PI);
            this.ctx.fillStyle = lineColor;
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Vertical line
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.hoveredPoint.x, this.chartPadding.top);
            this.ctx.lineTo(this.hoveredPoint.x, height - this.chartPadding.bottom);
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.5;
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.globalAlpha = 1;
        }
    },

    /**
     * Draw tooltip
     * @param {object} point
     */
    drawTooltip(point) {
        const padding = 12;
        const date = new Date(point.time_close).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const price = this.currencySymbol + Utils.formatNumber(point.close, 2);

        this.ctx.font = '13px Inter, sans-serif';
        const dateWidth = this.ctx.measureText(date).width;
        const priceWidth = this.ctx.measureText(price).width;
        const tooltipWidth = Math.max(dateWidth, priceWidth) + padding * 2;
        const tooltipHeight = 60;

        // Position tooltip
        let x = point.x + 15;
        let y = point.y - tooltipHeight / 2;

        const width = this.canvas.width / (window.devicePixelRatio || 1);

        // Keep tooltip within canvas bounds
        if (x + tooltipWidth > width - this.chartPadding.right) {
            x = point.x - tooltipWidth - 15;
        }

        // Draw tooltip background
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary') || '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;

        this.drawRoundedRect(x, y, tooltipWidth, tooltipHeight, 8);
        this.ctx.fill();

        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // Draw tooltip text
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#808A9D';
        this.ctx.textAlign = 'left';
        this.ctx.font = '11px Inter, sans-serif';
        this.ctx.fillText(date, x + padding, y + 20);

        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#000000';
        this.ctx.font = 'bold 15px Inter, sans-serif';
        this.ctx.fillText(price, x + padding, y + 42);
    },

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.ctx) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#808A9D';
        this.ctx.font = '14px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading chart...', width / 2, height / 2);
    },

    /**
     * Show error state
     * @param {string} message
     */
    showError(message) {
        if (!this.ctx) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--red') || '#EA3943';
        this.ctx.font = '14px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message || 'Failed to load chart data', width / 2, height / 2);
    }
};
