// Catch-all proxy for forwarding API requests to the ML backend (avoids mixed-content)
// Forwards method, headers and body to the target ML API defined by env var ML_API_BASE_URL
// If ML_API_BASE_URL is not set, falls back to http://52.66.208.231:8002

const DEFAULT_TARGET = 'http://52.66.208.231:8002';

export default async function handler(req, res) {
  try {
    const proxyPath = req.query.proxy;
    const path = Array.isArray(proxyPath) ? proxyPath.join('/') : proxyPath || '';
    const targetBase = process.env.ML_API_BASE_URL || DEFAULT_TARGET;
    const url = `${targetBase}/${path}`.replace(/(?<!:)\/\//g, '/').replace('http:/', 'http://').replace('https:/', 'https://');

    // Read raw request body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    // Build headers to forward (omit host/connection which are set by fetch)
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders.connection;

    const fetchRes = await fetch(url, {
      method: req.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      // keep credentials/cookies out; backend should accept forwarded requests
    });

    // Set response status and headers
    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, name) => {
      // Vercel/Node may forbid some headers; most should be fine to pass through
      res.setHeader(name, value);
    });

    // Stream response back
    const arrayBuf = await fetchRes.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
