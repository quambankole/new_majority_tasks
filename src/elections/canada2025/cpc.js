import PartyScraper from '../../scraper/partyScraper.js';

/**
 * Scraper for the Communist Party of Canada 2025 candidate list.
 * This class scrapes candidate names, ridings, and emails and saves the data.
 * Inherits from PartyScraper.
 */
class Cpc2025Scraper extends PartyScraper {
    /**
     * Main scraping method.
     * Launches browser, navigates to the candidates page, extracts data, and saves the results.
     */
    async scrape() {
        await this.launchBrowser();

        let retries = 0;
        // Retry up to 5 times if we encounter a 429 (rate limit) error.
        while (retries < 5) {
            try {
                await this.goToPage('https://communist-party.ca/candidates/');
                break;
            } catch (err) {
                if (err.message.includes('429')) {
                    const backoff = Math.pow(2, retries) * 1000;
                    console.warn(`429 Too Many Requests — retrying in ${backoff}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    retries++;
                } else {
                    throw err;
                }
            }
        }

        // Extract candidate info from each row in the candidate list.
        const candidates = await this.page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.elementor-container.elementor-column-gap-default'));
            return rows.map(row => {
                // Each row contains columns for riding, name, and email.
                const columns = row.querySelectorAll('.elementor-column');
                const riding = columns[0]?.querySelector('h5')?.innerText.trim() || null;
                const name = columns[1]?.querySelector('a')?.innerText.trim() || null;
                const email = columns[2]?.querySelector('h5')?.innerText.trim() || null;
                const email_source = window.location.href;

                // Skip entries without a name or ones that mention privacy.
                if (!name || name.toUpperCase().includes('PRIVACY')) return null;

                return {
                    name,
                    riding,
                    email,
                    email_source,
                    party: 'Communist Party of Canada'
                };
            }).filter(Boolean);
        });

        // Remove duplicates and save the results to file.
        const unique = this.removeDuplicates(candidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-cpc.json');
        await this.closeBrowser();
    }
}

export default Cpc2025Scraper;