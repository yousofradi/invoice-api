const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/render', async (req, res) => {
  let browser;
  try {
    const body = req.body;
    if (!body.html) return res.status(400).json({ error: 'HTML is required' });

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });

    const page = await browser.newPage();
    await page.setViewport({ 
      width: body.width || 500, 
      height: body.height || 800,
      deviceScaleFactor: body.deviceScaleFactor || 2 
    });

    await page.setContent(body.html, { waitUntil: 'networkidle0' });

    let imageBuffer;
    if (body.selector) {
      const element = await page.$(body.selector);
      imageBuffer = element 
        ? await element.screenshot({ omitBackground: body.omitBackground || false })
        : await page.screenshot({ fullPage: true, omitBackground: body.omitBackground || false });
    } else {
      imageBuffer = await page.screenshot({ fullPage: true, omitBackground: body.omitBackground || false });
    }

    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on port ${port}`));
