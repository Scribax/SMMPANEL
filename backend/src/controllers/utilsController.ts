import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

const ALLOWED_HOSTS = [
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be'
];

const getMeta = (html: string, property: string): string | undefined => {
  const $ = cheerio.load(html);
  return (
    $(`meta[property="${property}"]`).attr('content') ||
    $(`meta[name="${property}"]`).attr('content')
  );
};

export const getLinkPreview = async (req: Request, res: Response): Promise<void> => {
  const urlParam = (req.query.url as string | undefined)?.trim();

  if (!urlParam) {
    res.status(400).json({ success: false, message: 'url parameter is required' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam.startsWith('http') ? urlParam : `https://${urlParam}`);
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid URL' });
    return;
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    res.status(400).json({ success: false, message: 'Domain not supported' });
    return;
  }

  try {
    const response = await axios.get<string>(parsed.toString(), {
      timeout: 8000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
      }
    });

    const html = response.data ?? '';
    const title = getMeta(html, 'og:title') || getMeta(html, 'twitter:title') || parsed.hostname;
    const description = getMeta(html, 'og:description') || getMeta(html, 'description');
    const image = getMeta(html, 'og:image') || getMeta(html, 'twitter:image');

    res.json({
      success: true,
      preview: {
        url: parsed.toString(),
        title,
        description,
        image,
        site: parsed.hostname
      }
    });
  } catch (error) {
    logger.warn('Link preview fetch failed', { url: urlParam, error: (error as Error).message });
    res.json({ success: true, preview: null });
  }
};
