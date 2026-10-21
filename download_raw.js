const https = require('https');
const fs = require('fs');

const url = 'https://20-10-vuive.kazvndc-edu.workers.dev/';

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (d) => chunks.push(d));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync('raw_page.html', buffer);
    console.log('Saved raw_page.html, size:', buffer.length);

    // Verify text
    const text = buffer.toString('utf8');
    const sample = text.match(/<div id="text-1"[^>]*>([\s\S]*?)<\/div>/);
    console.log('Verified text-1:', sample ? sample[1] : 'none');
    const title = text.match(/<title>([\s\S]*?)<\/title>/);
    console.log('Verified title:', title ? title[1] : 'none');
  });
}).on('error', (e) => {
  console.error('Error downloading:', e);
});
