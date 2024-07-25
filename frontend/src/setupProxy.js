const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/gw/devices/',
    createProxyMiddleware({
      target: 'https://flespi.io',
      changeOrigin: true,
      pathRewrite: {
        '^/gw/devices/': '/gw/devices/'
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Authorization', `FlespiToken ${process.env.REACT_APP_FLESPI_TOKEN}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin;
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      },
    })
  );

  app.use(
    '/gw/channels/1211469/messages',
    createProxyMiddleware({
      target: 'https://flespi.io',
      changeOrigin: true,
      pathRewrite: {
        '^/gw/channels/1211469/messages': '/gw/channels/1211469/messages'
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Authorization', `FlespiToken ${process.env.REACT_APP_FLESPI_TOKEN}`);
      }
    })
  );
};

// const { createProxyMiddleware } = require('http-proxy-middleware');

// module.exports = function(app) {
//   app.use(
//     '/gw/channels/1211469/messages',
//     createProxyMiddleware({
//       target: 'https://flespi.io',
//       changeOrigin: true,
//     })
//   );
// };
