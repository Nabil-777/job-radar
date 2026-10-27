const axios = require('axios');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  const idx = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[idx];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestWithRetry(config, retries = 2, backoffMs = 1000) {
  const mergedHeaders = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    ...(config.headers || {})
  };

  const finalConfig = {
    timeout: 8000,
    ...config,
    headers: mergedHeaders
  };

  try {
    return await axios(finalConfig);
  } catch (err) {
    const status = err.response ? err.response.status : null;
    const isRetryable = status === 429 || (status >= 500 && status <= 599) || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

    if (retries > 0 && isRetryable) {
      const wait = backoffMs + Math.floor(Math.random() * 500);
      await delay(wait);
      return requestWithRetry(config, retries - 1, backoffMs * 2);
    }
    throw err;
  }
}

const httpClient = {
  get: (url, config = {}) => requestWithRetry({ method: 'GET', url, ...config }),
  post: (url, data, config = {}) => requestWithRetry({ method: 'POST', url, data, ...config })
};

module.exports = { httpClient, getRandomUserAgent };
