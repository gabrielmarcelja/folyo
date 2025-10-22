# Folyo - Cryptocurrency Market Tracker

Folyo é um clone da homepage do CoinMarketCap, desenvolvido com HTML, CSS e JavaScript vanilla puro. Exibe preços, market cap, volume e outras métricas de criptomoedas em tempo real usando a API oficial da CoinMarketCap.

![Folyo Preview](https://via.placeholder.com/800x400?text=Folyo+Preview)

## ✨ Funcionalidades

### 🎯 Principais
- **Top 100 Criptomoedas** por market cap (expansível com paginação)
- **Tabela Completa** com 10 colunas de dados detalhados
- **Stats Globais** no header (Total Market Cap, Volume 24h, Dominance)
- **Fear & Greed Index** oficial da CoinMarketCap
- **93+ Moedas Suportadas** (USD, EUR, BRL, GBP, JPY, etc.)
- **Auto-Refresh** a cada 60 segundos
- **Tema Claro/Escuro** com persistência

### 🔍 Interativas
- **Busca em Tempo Real** por nome ou símbolo
- **Ordenação Clicável** em todas as colunas
- **Paginação Completa** (100 itens por página)
- **Sparkline Charts** (mini gráficos de 7 dias)
- **Seletor de Moedas** persistente (localStorage)

### 📱 Responsividade
- **Desktop**: Tabela completa (10 colunas)
- **Tablet**: Tabela reduzida (7 colunas)
- **Mobile**: Layout de cards otimizado

## 🛠️ Tecnologias

### Frontend
- HTML5
- CSS3 (com variáveis CSS para temas)
- JavaScript ES6+ (vanilla, sem frameworks)
- Google Fonts (Inter)

### Backend
- PHP 7+ (proxy para resolver CORS)
- CoinMarketCap API v1/v2/v3

### Armazenamento
- LocalStorage (tema, moeda, última atualização)

## 📁 Estrutura do Projeto

```
folyo/
├── index.html                 # Página principal
├── .env                      # API key (não commitar!)
├── .gitignore
├── api/
│   └── proxy.php            # Proxy PHP para CMC API
├── css/
│   ├── style.css            # Estilos principais
│   ├── themes.css           # Variáveis de tema
│   └── responsive.css       # Media queries
├── js/
│   ├── config.js            # Configurações e constantes
│   ├── api.js               # Comunicação com API
│   ├── utils.js             # Funções auxiliares
│   ├── ui.js                # Renderização da UI
│   ├── currency.js          # Gerenciador de moedas
│   ├── theme.js             # Gerenciador de temas
│   └── app.js               # Inicialização e orquestração
└── assets/
    └── logo.svg             # Logo do projeto
```

## 🚀 Instalação

### Pré-requisitos
- Servidor web (Apache, Nginx) com PHP 7+
- API Key da CoinMarketCap (gratuita em [pro.coinmarketcap.com](https://pro.coinmarketcap.com))

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/folyo.git
cd folyo
```

2. **Configure a API Key**

Crie um arquivo `.env` na raiz do projeto:
```
CMC_API_KEY=sua_api_key_aqui
```

Ou edite o arquivo existente `.env` e substitua pela sua key.

3. **Configure o servidor**

**Apache (httpd.conf ou .htaccess)**
```apache
<Directory "/var/www/html/folyo">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

**Nginx (nginx.conf)**
```nginx
location /folyo {
    try_files $uri $uri/ /folyo/index.html;
}
```

4. **Acesse a aplicação**

Abra seu navegador em:
```
http://localhost/folyo
```

## 🔧 Configuração

### Alterar Intervalo de Refresh

Edite `js/config.js`:
```javascript
REFRESH_INTERVAL: 60000, // 60 segundos (em milissegundos)
```

### Alterar Quantidade de Itens por Página

Edite `js/config.js`:
```javascript
ITEMS_PER_PAGE: 100, // Quantidade por página
```

### Adicionar Mais Moedas

Edite `js/config.js` e adicione ao objeto `CURRENCY_SYMBOLS`:
```javascript
CURRENCY_SYMBOLS: {
    'USD': '$',
    'EUR': '€',
    'SEU_CODIGO': 'Símbolo',
    // ...
}
```

E adicione no HTML `index.html` no select:
```html
<option value="SEU_CODIGO" data-symbol="Símbolo">SEU_CODIGO 🏳️</option>
```

## 📊 Endpoints da API Usados

### CoinMarketCap API

**Base URL:** `https://pro-api.coinmarketcap.com`

1. **`/v1/cryptocurrency/listings/latest`**
   - Lista top criptomoedas
   - Params: `start`, `limit`, `convert`
   - Update: 60s

2. **`/v1/global-metrics/quotes/latest`**
   - Métricas globais de mercado
   - Params: `convert`
   - Update: 5min

3. **`/v3/fear-and-greed/latest`**
   - Índice Fear & Greed
   - Update: 15min

## 🎨 Temas

### Tema Claro (Padrão)
```css
--bg-primary: #FFFFFF
--bg-secondary: #F7F7F7
--text-primary: #000000
--green: #16C784
--red: #EA3943
```

### Tema Escuro
```css
--bg-primary: #0B0E11
--bg-secondary: #17181B
--text-primary: #FFFFFF
--green: #16C784 (mesmo)
--red: #EA3943 (mesmo)
```

## 🔒 Segurança

- ✅ API key armazenada server-side (PHP)
- ✅ `.env` no `.gitignore`
- ✅ Proxy PHP evita exposição da key
- ✅ Headers CORS configurados
- ⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env`!

## 📈 Performance

- **Auto-refresh otimizado**: Para quando aba está inativa (battery saving)
- **Debounce na busca**: 300ms para evitar requests excessivos
- **Lazy loading**: Logos carregadas sob demanda
- **Cache**: Dados mantidos durante navegação (state preservation)

## 🐛 Troubleshooting

### API não funciona
1. Verifique se o `.env` existe e tem a key correta
2. Teste o proxy diretamente: `http://localhost/folyo/api/proxy.php?endpoint=global-metrics`
3. Confira logs do PHP: `tail -f /var/log/apache2/error.log`

### CORS Error
- O proxy PHP deve resolver isso automaticamente
- Verifique se `proxy.php` tem permissões de execução

### Dados não aparecem
1. Abra o Console do navegador (F12)
2. Verifique erros JavaScript
3. Teste a API manualmente com `curl`:
```bash
curl -H "X-CMC_PRO_API_KEY: sua_key" \
     https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um Fork do projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto é para fins educacionais. Os dados são fornecidos pela [CoinMarketCap API](https://coinmarketcap.com/api/).

**Atribuição Necessária:**
> Data provided by CoinMarketCap.com

## 🙏 Créditos

- **Design Inspirado**: [CoinMarketCap](https://coinmarketcap.com)
- **API**: [CoinMarketCap API](https://coinmarketcap.com/api/)
- **Fear & Greed Index**: CoinMarketCap Official Index
- **Fonte**: [Inter (Google Fonts)](https://fonts.google.com/specimen/Inter)

## 📧 Contato

Dúvidas ou sugestões? Entre em contato!

---

**Desenvolvido com ❤️ usando HTML, CSS e JavaScript vanilla**
