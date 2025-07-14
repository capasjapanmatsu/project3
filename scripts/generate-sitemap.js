import fs from 'fs';
import path from 'path';

const generateSitemap = () => {
  const baseUrl = 'https://your-domain.com'; // 実際のドメインに変更してください
  const distPath = path.resolve('dist');
  
  // PWA用の主要ページ
  const pages = [
    '/',
    '/login',
    '/register',
    '/parks',
    '/community',
    '/news',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/pwa-setup-guide',
    '/pwa-implementation-guide',
    '/pwa-documentation',
    '/pwa-testing-suite',
    '/pwa-lighthouse-audit',
    '/pwa-deployment-guide',
    '/netlify-setup-guide'
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.8'}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap);
  
  // robots.txt も更新
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
  
  fs.writeFileSync(path.join(distPath, 'robots.txt'), robotsTxt);
  
  console.log('✅ Sitemap and robots.txt generated successfully');
  console.log(`📊 Generated ${pages.length} pages in sitemap`);
};

generateSitemap();
