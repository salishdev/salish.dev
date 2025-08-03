import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateResumePDF() {
  console.log('Generating resume PDF...');
  
  // Ensure public directory exists
  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to the CV page (using the built version)
    const cvUrl = process.env.PDF_BASE_URL || 'http://localhost:4321/cv';
    console.log(`Loading CV from: ${cvUrl}`);
    
    await page.goto(cvUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for content to render
    await page.waitForSelector('.cv-content', { timeout: 10000 });

    // Generate PDF with ATS-friendly settings
    const pdfPath = join(publicDir, 'resume.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'Letter', // US Letter size (8.5 x 11 inches)
      printBackground: false, // ATS-friendly: no background colors
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      },
      displayHeaderFooter: false
    });

    console.log(`PDF generated successfully at: ${pdfPath}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  generateResumePDF().catch((error) => {
    console.error('Failed to generate PDF:', error);
    process.exit(1);
  });
}

export default generateResumePDF;