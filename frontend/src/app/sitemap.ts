import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://followarg.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/order`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/precios`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
