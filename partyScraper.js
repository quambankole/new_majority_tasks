import puppeteer from 'puppeteer';
import fs from 'fs/promises';

class PartyScraper {
    constructor(config = {}) {
        this.config = config;
        this.browser = null;
        this.page = null;
    }

    async launchBrowser() {
        this.browser = await puppeteer.launch({ headless: true });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)'
        );
    }

    async goToPage(url) {
        if (!this.page) throw new Error('Page not initialized. Call launchBrowser() first.');
        await this.page.goto(url, { waitUntil: 'networkidle2' });
    }

    async closeBrowser() {
        if (this.browser) await this.browser.close();
    }

    async saveToFile(candidates, filePath) {
        await fs.writeFile(filePath, JSON.stringify(candidates, null, 2), 'utf-8');
        console.log(`Saved ${candidates.length} candidates to ${filePath}`);
    }

    removeDuplicates(candidates) {
        const seen = new Set();
        return candidates.filter(candidate => {
            const key = `${candidate.name}|${candidate.riding}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async scrape() {
        throw new Error('scrape() must be implemented in the subclass');
    }
}

export default PartyScraper;
