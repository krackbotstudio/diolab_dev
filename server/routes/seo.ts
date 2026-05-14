import express from 'express';
import { getAllRoutes } from '../utils/sitemap'; // Import all application routes

const router = express.Router();

// Robots.txt route
router.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap location
Sitemap: https://www.diolab.in/sitemap.xml
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// Sitemap.xml route
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Define static routes
    const staticRoutes = [
      '/',
      '/sign-in',
      '/sign-up',
      '/privacy-policy',
      '/terms-and-conditions',
      '/affiliates',
      '/contact',
      '/about'
    ];

    // Get dynamic routes from the application
    const dynamicRoutes = getAllRoutes ? getAllRoutes() : [];

    // Combine static and dynamic routes
    const allRoutes = [...staticRoutes, ...dynamicRoutes];

    // Generate XML sitemap
    let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    allRoutes.forEach(route => {
      sitemapXml += `  <url>\n`;
      sitemapXml += `    <loc>https://www.diolab.in${route}</loc>\n`;
      sitemapXml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      sitemapXml += `    <changefreq>weekly</changefreq>\n`;
      sitemapXml += `    <priority>0.8</priority>\n`;
      sitemapXml += `  </url>\n`;
    });

    sitemapXml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(sitemapXml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;