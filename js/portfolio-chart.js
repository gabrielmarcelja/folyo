/**
 * Folyo - Portfolio Chart
 * Renders historical portfolio value chart on canvas
 */

class PortfolioChart {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element #${canvasId} not found`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.canvasId = canvasId;
        this.tooltipId = options.tooltipId || 'chart-tooltip';
        this.loadingId = options.loadingId || 'chart-loading';
        this.emptyId = options.emptyId || 'chart-empty';

        this.currentPeriod = '24h';
        this.data = null;
        this.hoveredPointIndex = null;

        // Bind event handlers to preserve 'this' context for cleanup
        this.boundHandleMouseMove = (e) => this.handleMouseMove(e);
        this.boundHandleMouseLeave = () => this.handleMouseLeave();
        this.boundHandleResize = () => this.handleResize();

        // Colors
        this.colors = {
            profit: '#16C784',
            loss: '#EA3943',
            grid: 'rgba(255, 255, 255, 0.1)',
            text: '#8E8E93',
            bgPrimary: getComputedStyle(document.body).getPropertyValue('--bg-primary') || '#1a1a1a'
        };

        // Chart dimensions (will be calculated)
        this.padding = { top: 20, right: 20, bottom: 40, left: 60 };
        this.chartWidth = 0;
        this.chartHeight = 0;

        this.setupCanvas();
        this.setupEventListeners();
    }

    /**
     * Setup canvas dimensions
     */
    setupCanvas() {
        const isMobile = window.innerWidth <= 768;
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;

        if (isMobile) {
            this.canvas.width = containerWidth - 40;
            this.canvas.height = 200;
            this.padding = { top: 15, right: 15, bottom: 30, left: 45 };
        } else {
            this.canvas.width = containerWidth > 800 ? containerWidth - 48 : 800;
            this.canvas.height = 300;
        }

        this.chartWidth = this.canvas.width - this.padding.left - this.padding.right;
        this.chartHeight = this.canvas.height - this.padding.top - this.padding.bottom;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave);
        window.addEventListener('resize', this.boundHandleResize);
    }

    /**
     * Load data from API
     * @param {number|null} portfolioId - Portfolio ID (null for all)
     * @param {string} period - Period: 24h, 7d, 30d
     */
    async loadData(portfolioId, period = '24h') {
        this.currentPeriod = period;
        this.showLoading();

        try {
            const response = await APIClient.getPortfolioHistory(portfolioId, period);
            this.data = response;

            if (!response.points || response.points.length === 0) {
                this.hideLoading();
                this.showEmpty();
                return;
            }

            this.hideLoading();
            this.hideEmpty();
            this.render();

        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showEmpty('Failed to load chart data');
            this.hideLoading();
        }
    }

    /**
     * Render complete chart
     */
    render() {
        if (!this.data || !this.data.points || this.data.points.length === 0) {
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate scales
        const values = this.data.points.map(p => p.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const valueRange = maxValue - minValue || 1; // Avoid division by zero

        // Add 10% padding to top and bottom
        const paddedMax = maxValue + (valueRange * 0.1);
        const paddedMin = minValue - (valueRange * 0.1);

        // Convert data points to canvas coordinates
        const points = this.data.points.map((point, index) => {
            const x = this.padding.left + (index / (this.data.points.length - 1)) * this.chartWidth;
            const y = this.padding.top + this.chartHeight - ((point.value - paddedMin) / (paddedMax - paddedMin)) * this.chartHeight;

            return { x, y, value: point.value, label: point.date_formatted, index };
        });

        // Determine color based on profit/loss
        const lineColor = this.data.summary.is_profit ? this.colors.profit : this.colors.loss;

        // Draw grid
        this.drawGrid(paddedMin, paddedMax);

        // Draw gradient fill under line
        this.drawGradientFill(points, lineColor);

        // Draw line
        this.drawLine(points, lineColor);

        // Draw points
        this.drawPoints(points, lineColor);

        // Draw axes labels
        this.drawAxesLabels(paddedMin, paddedMax);
    }

    /**
     * Draw horizontal grid lines
     */
    drawGrid(minValue, maxValue) {
        const gridLines = 5;
        const step = (maxValue - minValue) / gridLines;

        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= gridLines; i++) {
            const value = minValue + (step * i);
            const y = this.padding.top + this.chartHeight - ((value - minValue) / (maxValue - minValue)) * this.chartHeight;

            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left, y);
            this.ctx.lineTo(this.padding.left + this.chartWidth, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw gradient fill under line
     */
    drawGradientFill(points, color) {
        if (points.length === 0) return;

        const gradient = this.ctx.createLinearGradient(0, this.padding.top, 0, this.padding.top + this.chartHeight);
        gradient.addColorStop(0, this.hexToRGBA(color, 0.3));
        gradient.addColorStop(1, this.hexToRGBA(color, 0));

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, this.padding.top + this.chartHeight);

        // Draw to first point
        this.ctx.lineTo(points[0].x, points[0].y);

        // Draw smooth curve through points
        this.drawSmoothCurve(points);

        // Close path to bottom
        this.ctx.lineTo(points[points.length - 1].x, this.padding.top + this.chartHeight);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw smooth line through points
     */
    drawLine(points, color) {
        if (points.length === 0) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        this.drawSmoothCurve(points);

        this.ctx.stroke();
    }

    /**
     * Draw smooth Bezier curve through points
     */
    drawSmoothCurve(points) {
        if (points.length < 2) return;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];

            // Calculate control points for smooth curve
            const tension = 0.3;
            const cp1x = prev.x + (curr.x - prev.x) * tension;
            const cp1y = prev.y;
            const cp2x = curr.x - (curr.x - prev.x) * tension;
            const cp2y = curr.y;

            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }
    }

    /**
     * Draw points on the line
     */
    drawPoints(points, color) {
        points.forEach((point, index) => {
            const isHovered = this.hoveredPointIndex === index;
            const radius = isHovered ? 5 : 3;

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // White outline for hovered point
            if (isHovered) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }

    /**
     * Draw axes labels (Y-axis values, X-axis dates)
     */
    drawAxesLabels(minValue, maxValue) {
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'right';

        // Y-axis labels (values)
        const gridLines = 5;
        const step = (maxValue - minValue) / gridLines;

        for (let i = 0; i <= gridLines; i++) {
            const value = minValue + (step * i);
            const y = this.padding.top + this.chartHeight - ((value - minValue) / (maxValue - minValue)) * this.chartHeight;
            const formattedValue = this.formatValue(value);

            this.ctx.fillText(formattedValue, this.padding.left - 10, y + 4);
        }

        // X-axis labels (dates)
        this.ctx.textAlign = 'center';
        const isMobile = window.innerWidth <= 768;
        const maxLabels = isMobile ? 4 : 8;
        const labelStep = Math.ceil(this.data.points.length / maxLabels);

        this.data.points.forEach((point, index) => {
            if (index % labelStep === 0 || index === this.data.points.length - 1) {
                const x = this.padding.left + (index / (this.data.points.length - 1)) * this.chartWidth;
                const y = this.padding.top + this.chartHeight + 20;

                this.ctx.fillText(point.date_formatted, x, y);
            }
        });
    }

    /**
     * Handle mouse move on canvas
     */
    handleMouseMove(event) {
        if (!this.data || !this.data.points) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find nearest point
        let nearestIndex = null;
        let minDistance = Infinity;

        this.data.points.forEach((point, index) => {
            const x = this.padding.left + (index / (this.data.points.length - 1)) * this.chartWidth;
            const distance = Math.abs(mouseX - x);

            if (distance < minDistance && distance < 30) {
                minDistance = distance;
                nearestIndex = index;
            }
        });

        if (nearestIndex !== this.hoveredPointIndex) {
            this.hoveredPointIndex = nearestIndex;
            this.render();

            if (nearestIndex !== null) {
                this.showTooltip(nearestIndex, event.clientX, event.clientY);
            } else {
                this.hideTooltip();
            }
        }
    }

    /**
     * Handle mouse leave canvas
     */
    handleMouseLeave() {
        if (this.hoveredPointIndex !== null) {
            this.hoveredPointIndex = null;
            this.render();
            this.hideTooltip();
        }
    }

    /**
     * Show tooltip at point
     */
    showTooltip(pointIndex, clientX, clientY) {
        const tooltip = document.getElementById(this.tooltipId);
        if (!tooltip) return;

        const point = this.data.points[pointIndex];
        if (!point) return;

        // Calculate change from start
        const startValue = this.data.points[0].value;
        const change = point.value - startValue;
        const changePercent = startValue > 0 ? (change / startValue * 100) : 0;
        const isPositive = change >= 0;

        // Update tooltip content
        tooltip.querySelector('.tooltip-date').textContent = point.date_formatted;
        tooltip.querySelector('.tooltip-value').textContent = this.formatValue(point.value);

        const changeEl = tooltip.querySelector('.tooltip-change');
        if (changeEl) {
            changeEl.textContent = `${isPositive ? '+' : ''}${this.formatValue(change)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`;
            changeEl.className = 'tooltip-change ' + (isPositive ? 'positive' : 'negative');
        }

        // Position tooltip
        const tooltipWidth = 150;
        const tooltipHeight = 80;
        let left = clientX + 15;
        let top = clientY - tooltipHeight / 2;

        // Keep tooltip in viewport
        if (left + tooltipWidth > window.innerWidth) {
            left = clientX - tooltipWidth - 15;
        }

        if (top < 0) top = 10;
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.display = 'block';
        tooltip.classList.add('visible');
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById(this.tooltipId);
        if (tooltip) {
            tooltip.style.display = 'none';
            tooltip.classList.remove('visible');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loading = document.getElementById(this.loadingId);
        if (loading) {
            loading.style.display = 'flex';
        }
        this.canvas.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = document.getElementById(this.loadingId);
        if (loading) {
            loading.style.display = 'none';
        }
        this.canvas.style.display = 'block';
    }

    /**
     * Show empty state
     */
    showEmpty(message = 'No data available for this period') {
        const empty = document.getElementById(this.emptyId);
        if (empty) {
            empty.textContent = message;
            empty.style.display = 'block';
        }
        this.canvas.style.display = 'none';
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        const empty = document.getElementById(this.emptyId);
        if (empty) {
            empty.style.display = 'none';
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Debounce resize
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.setupCanvas();
            if (this.data) {
                this.render();
            }
        }, 300);
    }

    /**
     * Format value as currency
     */
    formatValue(value) {
        return '$' + value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Convert hex color to RGBA
     */
    hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Destroy chart and clean up
     */
    destroy() {
        this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        window.removeEventListener('resize', this.boundHandleResize);

        // Clear any pending timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
