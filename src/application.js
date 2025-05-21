/**
 * Scraper for the Libertarian Party of Canada 2025 candidates.
 * Extends PartyScraper to reuse browser automation and file-saving logic.
 */
class Lpc2025Scraper extends PartyScraper {
    /**
     * Main scraping method.
     * Launches browser, navigates to the candidate list, extracts data, visits profile links for emails,
     * and saves the final results to a JSON file.
     */
    async scrape() {
        await this.launchBrowser();

        let retries = 0;
        // Retry up to 5 times if the site returns "Too Many Requests"
        while (retries < 5) {
            try {
                await this.goToPage('https://www.libertarian.ca/2025_candidates');
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

        // Extract candidate name, riding, and profile link from each paragraph
        const candidates = await this.page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('.page-content p'));
            return nodes.map(p => {
                const anchor = p.querySelector('a');
                const text = p.innerText.trim();
                const [riding, name] = text.includes(' - ') ? text.split(' - ') : [null, null];

                return {
                    name: name?.trim() || null,
                    riding: riding?.trim() || null,
                    email_source: anchor?.href || null,
                    party: 'Libertarian Party of Canada'
                };
            });
        });

        // Visit each candidate's page and look for an email address
        for (const candidate of candidates) {
            if (candidate.email_source) {
                try {
                    const candidatePage = await this.browser.newPage();
                    await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2' });

                    // Try to find any email address in the page body
                    const email = await candidatePage.evaluate(() => {
                        const bodyText = document.body.innerText;
                        const match = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                        return match ? match[0].trim() : null;
                    });

                    candidate.email = email || null;
                    await candidatePage.close();
                } catch (err) {
                    console.error(`Failed to fetch email for ${candidate.name}:`, err.message);
                    candidate.email = null;
                }
            } else {
                candidate.email = null;
            }

            // Wait 2–5 seconds between requests to avoid getting blocked
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }

        // Remove duplicates and save to file
        const unique = this.removeDuplicates(candidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-lpc.json');
        await this.closeBrowser();
    }
}