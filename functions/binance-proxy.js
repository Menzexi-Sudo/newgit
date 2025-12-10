// Netlify Function (Node.js) to proxy requests for GAS
const fetch = require('node-fetch');

// 核心函数
exports.handler = async (event, context) => {
  // 目标 API 主机：使用 Futures API，降低被墙概率
  const binanceBaseUrl = 'https://fapi.binance.com'; 
  
  const { queryStringParameters, headers } = event;

  // 关键：从 Header 中获取实际要访问的币安接口路径
  const binancePath = headers['x-binance-path'];

  if (!binancePath) {
      return { statusCode: 400, body: 'Missing X-BINANCE-PATH header' };
  }
  
  // 构造查询字符串
  const query = new URLSearchParams(queryStringParameters).toString();
  const targetUrl = `${binanceBaseUrl}${binancePath}?${query}`;

  // 复制头部信息（尤其是 X-MBX-APIKEY）
  const requestHeaders = {};
  if (headers['x-mbx-apikey']) {
      requestHeaders['X-MBX-APIKEY'] = headers['x-mbx-apikey'];
  }
  
  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: requestHeaders,
    });
    
    // 传递响应内容和状态码
    const body = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        // 重要 CORS 头部，允许 GAS 访问
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'X-MBX-APIKEY, X-BINANCE-PATH, Content-Type',
      },
      body: body,
    };

  } catch (error) {
    // 调试信息：如果转发失败，打印目标 URL
    console.error(`Proxy failed to fetch: ${targetUrl}`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Netlify Proxy Error', details: error.message, target: targetUrl }),
    };
  }
};
