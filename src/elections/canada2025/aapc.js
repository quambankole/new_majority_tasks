import PartyScraper from '../../scraper/partyScraper.js';

/**
 * Scraper for the Animal Protection Party of Canada 2025 candidate list.
 * This class visits the party's candidates page, extracts candidate names, ridings, and emails, and saves the data.
 * Inherits from PartyScraper.
 */
class Aapc2025Scraper extends PartyScraper {
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
                await this.goToPage('https://www.animalprotectionparty.ca/candidates/');
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

        // Wait for the candidate content to load.
        await this.page.waitForSelector('.x-content', { timeout: 10000 });
        // Extract candidate information from the page.
        const scrapedCandidates = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll(".x-content")).map(section => {
                const h5 = section.querySelector("h5");
                const emailTag = section.querySelector('a[href^="mailto:"]');
                let name = null;
                let riding = null;

                // The h5 contains "Name: Riding", so split on the colon.
                if (h5 && h5.innerText.includes(":")) {
                    const parts = h5.innerText.split(":");
                    name = parts[0].trim();
                    riding = parts[1].trim();
                }

                return {
                    name,
                    riding,
                    email: emailTag ? emailTag.href.replace("mailto:", "").trim() : null,
                    email_source: emailTag ? emailTag.href : null,
                    party: 'Animal Protection Party of Canada'
                };
            });
        });

        const allCandidates = [];
        for (const candidate of scrapedCandidates) {
            allCandidates.push(candidate);
            // Wait 10 seconds between candidates to avoid overwhelming the server.
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        // Remove duplicates and save the results to file.
        const unique = this.removeDuplicates(allCandidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-aapc.json');
        await this.closeBrowser();
    }
}

export default Aapc2025Scraper;