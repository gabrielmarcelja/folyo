# Folyo API Documentation

Backend API completo para gerenciamento de portfolios de criptomoedas.

## 🔗 Base URL
```
http://folyo.test/api
```

## 🔐 Autenticação

A API usa **sessões PHP** para autenticação. Após login, um cookie `PHPSESSID` é retornado e deve ser incluído em todas as requisições subsequentes.

---

## 📋 Endpoints

### 1. Autenticação (`/api/auth.php`)

#### 1.1. Registro de Usuário
**POST** `/api/auth.php?action=register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

**Erros:**
- `400` - Email inválido ou senha muito curta (< 6 caracteres)
- `409` - Email já cadastrado

---

#### 1.2. Login
**POST** `/api/auth.php?action=login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

**Erros:**
- `401` - Email ou senha inválidos

---

#### 1.3. Logout
**POST** `/api/auth.php?action=logout`

**Headers:**
```
Cookie: PHPSESSID=xxx
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logout successful"
  }
}
```

---

#### 1.4. Status de Autenticação
**GET** `/api/auth.php?action=status`

**Headers:**
```
Cookie: PHPSESSID=xxx
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

---

### 2. Portfolios (`/api/portfolios.php`)

> ⚠️ **Autenticação obrigatória** para todos os endpoints de portfolios

#### 2.1. Listar Portfolios
**GET** `/api/portfolios.php`

**Headers:**
```
Cookie: PHPSESSID=xxx
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "hold wallet",
      "description": "Long term holdings",
      "created_at": "2024-01-01 10:00:00",
      "updated_at": "2024-01-01 10:00:00",
      "unique_cryptos": 3,
      "total_invested": "50534.25"
    }
  ]
}
```

---

#### 2.2. Obter Portfolio Específico
**GET** `/api/portfolios.php?id={portfolio_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "hold wallet",
    "description": "Long term holdings",
    "created_at": "2024-01-01 10:00:00",
    "updated_at": "2024-01-01 10:00:00",
    "holdings": [
      {
        "portfolio_id": 1,
        "crypto_id": 1,
        "crypto_symbol": "BTC",
        "crypto_name": "Bitcoin",
        "total_quantity": "0.800000000000000000",
        "avg_buy_price": "51875.00",
        "cost_basis": "41518.25",
        "transaction_count": 2,
        "first_buy_date": "2024-01-15 10:30:00",
        "last_transaction_date": "2024-02-20 14:15:00"
      }
    ]
  }
}
```

---

#### 2.3. Criar Portfolio
**POST** `/api/portfolios.php`

**Body:**
```json
{
  "name": "My Wallet",
  "description": "Optional description"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "My Wallet",
    "description": "Optional description",
    "created_at": "2024-01-01 12:00:00"
  }
}
```

**Erros:**
- `400` - Nome obrigatório ou inválido (2-100 caracteres)
- `409` - Já existe portfolio com este nome

---

#### 2.4. Atualizar Portfolio
**PUT** `/api/portfolios.php?id={portfolio_id}`

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Name",
    "description": "Updated description",
    "created_at": "2024-01-01 10:00:00",
    "updated_at": "2024-01-01 12:30:00"
  }
}
```

---

#### 2.5. Deletar Portfolio
**DELETE** `/api/portfolios.php?id={portfolio_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Portfolio deleted successfully",
    "deleted_portfolio": {
      "id": 1,
      "name": "My Wallet"
    }
  }
}
```

> ⚠️ **Atenção:** Deletar um portfolio também deleta TODAS as transações relacionadas (CASCADE).

---

### 3. Transações (`/api/transactions.php`)

> ⚠️ **Autenticação obrigatória** para todos os endpoints de transações

#### 3.1. Listar Transações de um Portfolio
**GET** `/api/transactions.php?portfolio_id={portfolio_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "portfolio_id": 1,
      "transaction_type": "buy",
      "crypto_id": 1,
      "crypto_symbol": "BTC",
      "crypto_name": "Bitcoin",
      "quantity": "0.500000000000000000",
      "price_per_coin": "50000.00000000",
      "total_amount": "25010.00000000",
      "fee": "10.00000000",
      "currency": "USD",
      "transaction_date": "2024-01-15 10:30:00",
      "notes": "First Bitcoin purchase",
      "created_at": "2024-01-15 11:00:00"
    }
  ]
}
```

---

#### 3.2. Obter Transação Específica
**GET** `/api/transactions.php?id={transaction_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "portfolio_id": 1,
    "transaction_type": "buy",
    "crypto_id": 1,
    "crypto_symbol": "BTC",
    "crypto_name": "Bitcoin",
    "quantity": "0.500000000000000000",
    "price_per_coin": "50000.00000000",
    "total_amount": "25010.00000000",
    "fee": "10.00000000",
    "currency": "USD",
    "transaction_date": "2024-01-15 10:30:00",
    "notes": "First Bitcoin purchase",
    "created_at": "2024-01-15 11:00:00",
    "updated_at": "2024-01-15 11:00:00"
  }
}
```

---

#### 3.3. Criar Transação
**POST** `/api/transactions.php`

**Body:**
```json
{
  "portfolio_id": 1,
  "transaction_type": "buy",
  "crypto_id": 1,
  "crypto_symbol": "BTC",
  "crypto_name": "Bitcoin",
  "quantity": 0.5,
  "price_per_coin": 50000,
  "total_amount": 25010,
  "fee": 10,
  "currency": "USD",
  "transaction_date": "2024-01-15 10:30:00",
  "notes": "Optional notes"
}
```

**Campos:**
- `portfolio_id` (obrigatório): ID do portfolio
- `transaction_type` (obrigatório): `"buy"` ou `"sell"`
- `crypto_id` (obrigatório): ID da API CoinMarketCap
- `crypto_symbol` (obrigatório): Símbolo da cripto (ex: `"BTC"`)
- `crypto_name` (obrigatório): Nome da cripto (ex: `"Bitcoin"`)
- `quantity` (obrigatório): Quantidade de moedas (> 0)
- `price_per_coin` (obrigatório): Preço por moeda (> 0)
- `total_amount` (obrigatório): Total da transação (≥ 0)
- `fee` (opcional): Taxa da transação (padrão: 0)
- `currency` (opcional): Moeda (padrão: `"USD"`)
- `transaction_date` (opcional): Data/hora (padrão: data atual)
- `notes` (opcional): Observações

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "portfolio_id": 1,
    "transaction_type": "buy",
    "crypto_id": 1,
    "crypto_symbol": "BTC",
    "crypto_name": "Bitcoin",
    "quantity": "0.500000000000000000",
    "price_per_coin": "50000.00000000",
    "total_amount": "25010.00000000",
    "fee": "10.00000000",
    "currency": "USD",
    "transaction_date": "2024-01-15 10:30:00",
    "notes": "Optional notes",
    "created_at": "2024-01-15 11:00:00",
    "updated_at": "2024-01-15 11:00:00"
  }
}
```

**Erros:**
- `400` - Campos obrigatórios faltando ou valores inválidos
- `404` - Portfolio não encontrado

---

#### 3.4. Atualizar Transação
**PUT** `/api/transactions.php?id={transaction_id}`

**Body:** (todos os campos são opcionais)
```json
{
  "quantity": 0.6,
  "price_per_coin": 51000,
  "total_amount": 30610,
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "portfolio_id": 1,
    "transaction_type": "buy",
    "crypto_id": 1,
    "crypto_symbol": "BTC",
    "crypto_name": "Bitcoin",
    "quantity": "0.600000000000000000",
    "price_per_coin": "51000.00000000",
    "total_amount": "30610.00000000",
    "fee": "10.00000000",
    "currency": "USD",
    "transaction_date": "2024-01-15 10:30:00",
    "notes": "Updated notes",
    "created_at": "2024-01-15 11:00:00",
    "updated_at": "2024-01-15 14:30:00"
  }
}
```

---

#### 3.5. Deletar Transação
**DELETE** `/api/transactions.php?id={transaction_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Transaction deleted successfully",
    "deleted_transaction": {
      "id": 1,
      "crypto_symbol": "BTC",
      "transaction_type": "buy",
      "quantity": "0.500000000000000000"
    }
  }
}
```

---

### 4. Holdings (`/api/holdings.php`)

> ⚠️ **Autenticação obrigatória**

Este endpoint combina dados do banco com preços atuais da API CoinMarketCap para calcular profit/loss em tempo real.

#### 4.1. Holdings de um Portfolio
**GET** `/api/holdings.php?portfolio_id={portfolio_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": 1,
      "name": "hold wallet"
    },
    "holdings": [
      {
        "portfolio_id": 1,
        "crypto_id": 1,
        "crypto_symbol": "BTC",
        "crypto_name": "Bitcoin",
        "total_quantity": "0.800000000000000000",
        "avg_buy_price": "51875.00",
        "cost_basis": "41518.25",
        "transaction_count": 2,
        "first_buy_date": "2024-01-15 10:30:00",
        "last_transaction_date": "2024-02-20 14:15:00",
        "current_price": 108296.14,
        "current_value": 86636.912,
        "profit_loss": 45118.662,
        "profit_loss_percent": 108.66
      }
    ],
    "summary": {
      "total_value": 86636.912,
      "total_cost": 41518.25,
      "total_profit_loss": 45118.662,
      "total_profit_loss_percent": 108.66,
      "unique_assets": 1
    }
  }
}
```

---

#### 4.2. Overview do Portfolio
**GET** `/api/holdings.php?portfolio_id={portfolio_id}&overview`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": 1,
      "name": "hold wallet",
      "description": "Long term holdings"
    },
    "total_value": 86636.912,
    "total_cost": 41518.25,
    "profit_loss": 45118.662,
    "profit_loss_percent": 108.66,
    "best_performer": {
      "symbol": "BTC",
      "value": 86636.912,
      "cost": 41518.25,
      "profit_loss": 45118.662,
      "profit_loss_percent": 108.66
    },
    "worst_performer": {
      "symbol": "BTC",
      "value": 86636.912,
      "cost": 41518.25,
      "profit_loss": 45118.662,
      "profit_loss_percent": 108.66
    },
    "allocation": [
      {
        "token": "BTC",
        "percent": 100,
        "value": 86636.912
      }
    ]
  }
}
```

---

#### 4.3. Todos os Holdings do Usuário
**GET** `/api/holdings.php`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "portfolio_id": 1,
        "portfolio_name": "hold wallet",
        "crypto_id": 1,
        "crypto_symbol": "BTC",
        "crypto_name": "Bitcoin",
        "total_quantity": "0.800000000000000000",
        "avg_buy_price": "51875.00",
        "cost_basis": "41518.25",
        "current_price": 108296.14,
        "current_value": 86636.912,
        "profit_loss": 45118.662,
        "profit_loss_percent": 108.66
      }
    ],
    "summary": {
      "total_value": 86636.912,
      "total_cost": 41518.25,
      "total_profit_loss": 45118.662,
      "total_profit_loss_percent": 108.66,
      "unique_assets": 1
    }
  }
}
```

---

## 📊 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Recurso criado com sucesso |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Autenticação necessária |
| `404` | Not Found - Recurso não encontrado |
| `405` | Method Not Allowed - Método HTTP inválido |
| `409` | Conflict - Conflito (ex: email já existe) |
| `500` | Internal Server Error - Erro no servidor |

---

## 🔍 Formato de Erros

Todos os erros retornam o seguinte formato:

```json
{
  "success": false,
  "error": "Mensagem de erro descritiva",
  "errors": {
    "campo": "Detalhes do erro"
  }
}
```

---

## 🧪 Testes

Execute o teste completo da API:
```
http://folyo.test/api/test_api.php
```

Este teste executa 16 cenários cobrindo todos os endpoints.

---

## 📝 Notas Importantes

### Datas de Transações
- ✅ **Sem restrição de data** no banco de dados
- ✅ Frontend deve validar a regra de 30 dias:
  - **≤ 30 dias**: Buscar preço automaticamente da API
  - **> 30 dias**: Usuário informa preço manualmente

### Cálculos
- **Preço médio de compra**: Calculado automaticamente pela view `portfolio_holdings`
- **Profit/Loss**: Calculado em tempo real com preços atuais da API
- **Método**: Average Cost (custo médio ponderado)

### Segurança
- ✅ Senhas hash com bcrypt
- ✅ Prepared statements (SQL injection)
- ✅ Validações de entrada
- ✅ Sessões com timeout de 30 minutos

### Performance
- ✅ Views otimizadas no banco
- ✅ Índices em campos chave
- ✅ Cache de preços recomendado (futuro)

---

## 🚀 Próximos Passos

1. Integrar frontend com a API
2. Adicionar paginação em listagens
3. Implementar cache de preços da API
4. Adicionar filtros e ordenação
5. Implementar websockets para preços em tempo real
