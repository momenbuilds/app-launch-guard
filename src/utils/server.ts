import http from 'node:http';

export async function serveHtmlReport(html: string, port: number): Promise<{ server: http.Server; url: string }> {
  return await new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.method !== 'GET' || request.url !== '/') {
        response.statusCode = 404;
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    });

    server.on('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try --port ${port + 1}.`));
        return;
      }
      reject(error);
    });

    server.listen(port, '127.0.0.1', () => {
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}
