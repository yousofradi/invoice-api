const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// إعدادات Vercel للتعامل مع نصوص HTML الطويلة
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let browser = null;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const html = body.html;

    if (!html) {
      return res.status(400).json({ error: 'HTML is required' });
    }

    // تشغيل المتصفح المخفي
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    await page.setViewport({ 
      width: body.width || 500, 
      height: body.height || 800,
      deviceScaleFactor: body.deviceScaleFactor || 2 
    });
    
    // حقن الفاتورة
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    let imageBuffer;
    
    // تصوير العنصر المحدد أو الصفحة بأكملها
    if (body.selector) {
      const element = await page.$(body.selector);
      if (element) {
        imageBuffer = await element.screenshot({ omitBackground: body.omitBackground || false });
      } else {
        imageBuffer = await page.screenshot({ fullPage: body.fullPage || true, omitBackground: body.omitBackground || false });
      }
    } else {
      imageBuffer = await page.screenshot({ fullPage: body.fullPage || true, omitBackground: body.omitBackground || false });
    }
    
    await browser.close();
    
    // إرسال الصورة
    res.setHeader('Content-Type', 'image/png');
    // التحكم بالكاش (Cache) - اختياري
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Vercel API Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
