const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

// السماح باستقبال نصوص HTML طويلة (حتى 10 ميجابايت)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // التأكد من أن الطلب POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  let browser = null;
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    if (!body.html) {
      return res.status(400).json({ error: 'HTML is required' });
    }

    // تحميل متصفح Chromium من سيرفر خارجي أثناء التشغيل لتجاوز قيود مساحة Vercel
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
    );

    // تشغيل المتصفح بالإعدادات المحسنة
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // ضبط الأبعاد ودقة الصورة بناءً على طلبك
    await page.setViewport({ 
      width: body.width || 500, 
      height: body.height || 800,
      deviceScaleFactor: body.deviceScaleFactor || 2 
    });
    
    // حقن الفاتورة
    await page.setContent(body.html, { waitUntil: 'networkidle0' });
    
    let imageBuffer;
    
    // قص جزء محدد من الشاشة إذا تم تحديد selector (مثل كلاس الفاتورة)
    if (body.selector) {
      const element = await page.$(body.selector);
      if (element) {
        imageBuffer = await element.screenshot({ omitBackground: body.omitBackground || false });
      } else {
        // في حال لم يجد العنصر، التقط الصفحة كاملة
        imageBuffer = await page.screenshot({ fullPage: true, omitBackground: body.omitBackground || false });
      }
    } else {
      imageBuffer = await page.screenshot({ fullPage: true, omitBackground: body.omitBackground || false });
    }
    
    // إرجاع الصورة
    res.setHeader('Content-Type', 'image/png');
    // إضافة كاش اختياري لتقليل الضغط
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(imageBuffer);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
