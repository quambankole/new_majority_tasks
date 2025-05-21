import fs from 'fs';
import PartyScraper from '../core/PartyScraper.js';
import { matchToVoteMate } from '../core/utils.js';

class GreenPartyScraper extends PartyScraper {
  constructor() {
    super('https://www.greenparty.ca/en/candidates', 'greenparty');
  }

  async scrapeCandidatesFromPage(page) {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article.gpc-post-card')).map(card => ({
        name: card.querySelector('.gpc-post-card-heading a')?.innerText.trim() || null,
        email_source: card.querySelector('.gpc-post-card-heading a')?.href || null,
        riding: card.querySelector('.gpc-post-card-location')?.innerText.trim() || null,
      }));
    });
  }

  async enrichCandidate(page, candidate) {
    if (!candidate.email_source) return candidate;

    try {
      console.log(`Visiting: ${candidate.email_source}`);
      await page.goto(candidate.email_source, { waitUntil: 'networkidle2' });

      const email = await page.evaluate(() => {
        const mailLink = document.querySelector('a[href^="mailto:"]');
        return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
      });

      candidate.email = email;
    } catch (err) {
      console.error(`Failed to fetch details for ${candidate.name}:`, err.message);
      candidate.email = null;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    return candidate;
  }

  filterCandidate(candidate) {
    const ignored = ['greenteam@greenparty.ca', 'equipevert@partivert.ca'];
    return !ignored.includes(candidate.email);
  }
}

const scraper = new GreenPartyScraper();
const candidates = await scraper.scrape();

fs.writeFileSync('candidates-greenparty.json', JSON.stringify(candidates, null, 2));
console.log(`Saved ${candidates.length} filtered candidates.`);

const matched = matchToVoteMate(candidates, 'candidate_emails_14.json');
fs.writeFileSync('matched_greenparty_candidates.json', JSON.stringify(matched, null, 2));
console.log('Saved matched candidate data.');