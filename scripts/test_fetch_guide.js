const http = require('http');

http.get('http://localhost:3001/guide', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Has "Zoho" or "Developer Docs":', data.includes('Developer Docs'));
    console.log('Has "SELECT YOUR WEB APPLICATION FRAMEWORK":', data.includes('SELECT YOUR WEB APPLICATION FRAMEWORK'));
    console.log('Snippet of HTML:', data.substring(0, 500));
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});

