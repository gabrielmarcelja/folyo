-- ================================================
-- FOLYO - Database Setup Script
-- MariaDB / MySQL
-- ================================================

-- IMPORTANTE: Execute este script como root:
-- sudo mariadb -u root -p1976 < /var/www/html/folyo/database/schema.sql

-- ================================================
-- CRIAR USUÁRIO E BANCO
-- ================================================
CREATE USER IF NOT EXISTS 'folyo_user'@'localhost' IDENTIFIED BY 'folyo_password_2024';

-- Dropar banco existente e recriá-lo do zero
DROP DATABASE IF EXISTS folyo;

CREATE DATABASE folyo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON folyo.* TO 'folyo_user'@'localhost';
FLUSH PRIVILEGES;

USE folyo;

-- ================================================
-- TABELA: users
-- ================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt da senha',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABELA: portfolios
-- ================================================
CREATE TABLE portfolios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT 'Ex: hold wallet, work wallet, binance',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_user_portfolio_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABELA: transactions
-- ================================================
CREATE TABLE transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    portfolio_id INT UNSIGNED NOT NULL,
    transaction_type ENUM('buy', 'sell') NOT NULL,

    -- Dados da Criptomoeda
    crypto_id INT UNSIGNED NOT NULL COMMENT 'ID da API CoinMarketCap',
    crypto_symbol VARCHAR(20) NOT NULL COMMENT 'Ex: BTC, ETH, SOL',
    crypto_name VARCHAR(100) NOT NULL COMMENT 'Ex: Bitcoin, Ethereum, Solana',

    -- Valores da Transação
    quantity DECIMAL(30, 18) NOT NULL COMMENT 'Quantidade de moedas',
    price_per_coin DECIMAL(20, 8) NOT NULL COMMENT 'Preço por moeda no momento',
    total_amount DECIMAL(20, 8) NOT NULL COMMENT 'Total gasto (buy) ou recebido (sell)',
    fee DECIMAL(20, 8) DEFAULT 0 COMMENT 'Taxa da transação',
    currency VARCHAR(10) DEFAULT 'USD' COMMENT 'Moeda: USD, BRL, EUR, etc',

    -- Metadata
    transaction_date DATETIME NOT NULL COMMENT 'Data/hora da transação (sem restrição de data)',
    notes TEXT NULL COMMENT 'Observações do usuário',

    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Quando foi registrado',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    INDEX idx_portfolio_id (portfolio_id),
    INDEX idx_crypto_id (crypto_id),
    INDEX idx_crypto_symbol (crypto_symbol),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_portfolio_crypto_date (portfolio_id, crypto_symbol, transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- VIEW: portfolio_holdings
-- Calcula holdings atuais de cada cripto em cada portfolio
-- ================================================
CREATE VIEW portfolio_holdings AS
SELECT
    p.id AS portfolio_id,
    p.user_id,
    p.name AS portfolio_name,
    t.crypto_id,
    t.crypto_symbol,
    t.crypto_name,
    -- Quantidade total (compras - vendas)
    SUM(CASE
        WHEN t.transaction_type = 'buy' THEN t.quantity
        WHEN t.transaction_type = 'sell' THEN -t.quantity
    END) AS total_quantity,
    -- Preço médio ponderado de compra
    SUM(CASE
        WHEN t.transaction_type = 'buy' THEN t.quantity * t.price_per_coin
        ELSE 0
    END) / NULLIF(SUM(CASE
        WHEN t.transaction_type = 'buy' THEN t.quantity
        ELSE 0
    END), 0) AS avg_buy_price,
    -- Custo base (total investido - total recebido)
    SUM(CASE
        WHEN t.transaction_type = 'buy' THEN t.total_amount
        WHEN t.transaction_type = 'sell' THEN -t.total_amount
    END) AS cost_basis,
    -- Estatísticas
    COUNT(*) AS transaction_count,
    MIN(CASE WHEN t.transaction_type = 'buy' THEN t.transaction_date END) AS first_buy_date,
    MAX(t.transaction_date) AS last_transaction_date
FROM portfolios p
INNER JOIN transactions t ON t.portfolio_id = p.id
GROUP BY p.id, p.user_id, p.name, t.crypto_id, t.crypto_symbol, t.crypto_name
HAVING total_quantity > 0.00000001;

-- ================================================
-- VIEW: user_portfolio_summary
-- Resumo de cada portfolio do usuário
-- ================================================
CREATE VIEW user_portfolio_summary AS
SELECT
    portfolio_id,
    user_id,
    portfolio_name,
    COUNT(DISTINCT crypto_id) AS unique_cryptos,
    SUM(cost_basis) AS total_cost_basis,
    COUNT(DISTINCT crypto_symbol) AS total_assets
FROM portfolio_holdings
GROUP BY portfolio_id, user_id, portfolio_name;

-- ================================================
-- VIEW: user_overview
-- Visão geral de todos os portfolios do usuário
-- ================================================
CREATE VIEW user_overview AS
SELECT
    user_id,
    COUNT(DISTINCT portfolio_id) AS total_portfolios,
    COUNT(DISTINCT crypto_id) AS unique_cryptos,
    SUM(cost_basis) AS total_invested
FROM portfolio_holdings
GROUP BY user_id;

-- ================================================
-- TRIGGERS DE VALIDAÇÃO
-- ================================================
DELIMITER $$

-- Trigger: Validar transação antes de INSERT
CREATE TRIGGER validate_transaction_before_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantity must be greater than 0';
    END IF;

    IF NEW.price_per_coin <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price per coin must be greater than 0';
    END IF;

    IF NEW.total_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Total amount cannot be negative';
    END IF;

    IF NEW.fee < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Fee cannot be negative';
    END IF;
END$$

-- Trigger: Validar transação antes de UPDATE
CREATE TRIGGER validate_transaction_before_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantity must be greater than 0';
    END IF;

    IF NEW.price_per_coin <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Price per coin must be greater than 0';
    END IF;

    IF NEW.total_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Total amount cannot be negative';
    END IF;

    IF NEW.fee < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Fee cannot be negative';
    END IF;
END$$

DELIMITER ;

-- ================================================
-- DADOS DE TESTE
-- ================================================

-- Usuário de teste
-- Email: test@folyo.com
-- Senha: test123
INSERT INTO users (email, password) VALUES
('test@folyo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Portfolios de teste
INSERT INTO portfolios (user_id, name, description) VALUES
(1, 'hold wallet', 'Long term holdings'),
(1, 'work wallet', 'Earnings from work'),
(1, 'binance', 'Binance exchange');

-- Transações de teste
INSERT INTO transactions (
    portfolio_id, transaction_type, crypto_id, crypto_symbol, crypto_name,
    quantity, price_per_coin, total_amount, fee, transaction_date
) VALUES
-- BTC: 2 compras em datas diferentes (para testar preço médio)
(1, 'buy', 1, 'BTC', 'Bitcoin', 0.50000000, 50000.00000000, 25010.00000000, 10.00000000, '2024-01-15 10:30:00'),
(1, 'buy', 1, 'BTC', 'Bitcoin', 0.30000000, 55000.00000000, 16508.25000000, 8.25000000, '2024-02-20 14:15:00'),

-- ETH: 1 compra e 1 venda (para testar saldo parcial)
(1, 'buy', 1027, 'ETH', 'Ethereum', 5.00000000, 3000.00000000, 15007.50000000, 7.50000000, '2024-01-20 09:00:00'),
(1, 'sell', 1027, 'ETH', 'Ethereum', 2.00000000, 3500.00000000, 6996.50000000, 3.50000000, '2024-03-10 16:45:00'),

-- SOL: 1 compra em outro portfolio
(2, 'buy', 5426, 'SOL', 'Solana', 10.00000000, 100.00000000, 1005.00000000, 5.00000000, '2024-02-01 11:20:00');

-- ================================================
-- FIM DO SCRIPT
-- ================================================
