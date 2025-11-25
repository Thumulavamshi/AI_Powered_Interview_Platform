// Catch-all proxy for forwarding API requests to the ML backend (avoids mixed-content)
// Forwards method, headers and body to the target ML API defined by env var ML_API_BASE_URL
// If ML_API_BASE_URL is not set, falls back to http://52.66.208.231:8002

const DEFAULT_TARGET = 'http://52.66.208.231:8002';

export default async function handler(req, res) {
  try {
    // Derive the proxied path robustly. Prefer the Next/Vercel-provided query param,
    // but fall back to parsing req.url to handle edge cases where query is empty.
    let path = '';
    const proxyPath = req.query && req.query.proxy;
    if (proxyPath) {
      path = Array.isArray(proxyPath) ? proxyPath.join('/') : String(proxyPath);
    } else if (req.url) {
      // req.url looks like '/api/parse-resume' or '/api/generate-questions'
      const m = req.url.match(/^\/api\/(.*)$/);
      path = m && m[1] ? m[1] : '';
    }

    const targetBase = process.env.ML_API_BASE_URL || DEFAULT_TARGET;
    // Use the URL constructor to join base + path safely (handles slashes correctly).
    const url = path ? new URL(path, targetBase).toString() : new URL('', targetBase).toString();

    console.log('[proxy] incoming', { method: req.method, path, url, reqUrl: req.url });
    // Log limited headers for debugging (avoid logging large auth headers)
    const debugHeaders = { ...req.headers };
    if (debugHeaders.authorization) debugHeaders.authorization = '[REDACTED]';
    console.log('[proxy] incoming headers:', Object.keys(debugHeaders));

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
    // Debug: log upstream response status and a short preview of body when JSON/text
    console.log('[proxy] upstream status:', fetchRes.status);
    const contentType = fetchRes.headers.get('content-type') || '';
    let upstreamTextPreview = '';
    try {
      if (contentType.includes('application/json') || contentType.includes('text/') ) {
        const txt = await fetchRes.clone().text();
        upstreamTextPreview = txt.slice(0, 2000);
        console.log('[proxy] upstream body preview:', upstreamTextPreview);
      } else {
        console.log('[proxy] upstream content-type:', contentType);
      }
    } catch (e) {
      console.log('[proxy] failed to read upstream body preview', e?.message || e);
    }

    // Set response status and headers
    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, name) => {
      try {
        res.setHeader(name, value);
      } catch (err) {
        // some headers are forbidden to set; ignore them
      }
    });

    // Stream response back
    const arrayBuf = await fetchRes.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
