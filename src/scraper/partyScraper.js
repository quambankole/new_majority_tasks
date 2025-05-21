import puppeteer from 'puppeteer';
import fs from 'fs/promises';

/**
 * This is the main scraper class that others can build on.
 * It includes shared features all party scrapers need.
 */
class PartyScraper {
    /**
     * Sets up the scraper with optional settings.
     * @param {Object} config - Extra settings if needed.
     */
    constructor(config = {}) {
        this.config = config;
        this.browser = null;
        this.page = null;
    }
    /**
     * Starts the browser and sets NewMajority's name.
     * @returns {Promise<void>}
     */
    async launchBrowser() {
        this.browser = await puppeteer.launch({ headless: true });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(
            'Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)'
        );
    }
    /**
     * Goes to a specific web page.
     * @param {string} url - The website link to visit.
     * @returns {Promise<void>}
     * @throws If the browser page isn't ready yet.
     */
    async goToPage(url) {
        if (!this.page) throw new Error('Page not initialized. Call launchBrowser() first.');
        await this.page.goto(url, { waitUntil: 'networkidle2' });
    }
    /**
     * Closes the browser when done.
     * @returns {Promise<void>}
     */
    async closeBrowser() {
        if (this.browser) await this.browser.close();
    }
    /**
     * Saves the list of candidates to a file in JSON format.
     * @param {Array<Object>} candidates - The candidates to save.
     * @param {string} filePath - Where to save the file.
     * @returns {Promise<void>}
     */
    async saveToFile(candidates, filePath) {
        await fs.writeFile(filePath, JSON.stringify(candidates, null, 2), 'utf-8');
        console.log(`Saved ${candidates.length} candidates to ${filePath}`);
    }

    /**
     * Removes repeated candidates based on their name and riding.
     * @param {Array<Object>} candidates - The list of candidates.
     * @returns {Array<Object>} - The list without duplicates.
     */
    removeDuplicates(candidates) {
        const seen = new Set();
        return candidates.filter(candidate => {
            const key = `${candidate.name}|${candidate.riding}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * This method should be created in the child class.
     * It will do the actual scraping.
     * @returns {Promise<Array<Object>>}
     */
    async scrape() {
        throw new Error('scrape() must be implemented in the subclass');
    }
}

export default PartyScraper;
