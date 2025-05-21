import PartyScraper from '../../scraper/partyScraper.js';

class Liberal2025Scraper extends PartyScraper {
    async scrape() {
        await this.launchBrowser();

        let retries = 0;
        while (retries < 5) {
            try {
                await this.goToPage('https://liberal.ca/your-liberal-candidates/');
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

        await this.page.waitForSelector('.person__item-container');

        const scrapedCandidates = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll(".person__item-container")).map(card => {
                const nameElements = card.querySelectorAll('.person__name');
                const name = Array.from(nameElements).map(el => el?.innerText?.trim()).filter(Boolean).join(' ') || null;
                const riding = card.querySelector('.person__riding-name')?.innerText.trim() || null;
                const link = card.querySelector('.person__item a')?.href || null;

                return {
                    name,
                    riding,
                    email_source: link,
                    party: 'Liberal Party of Canada'
                };
            });
        });

        const allCandidates = [];

        for (const candidate of scrapedCandidates) {
            if (candidate.email_source) {
                try {
                    console.log(`Visiting: ${candidate.email_source}`);
                /**
                 * Opens a new tab to visit the candidate's personal page and attempts to extract their email address.
                 * The tab is closed after extraction to free up resources.
                 */
                // Open a new tab to visit the candidate's personal page
                const candidatePage = await this.browser.newPage();
                try {
                    // Navigate to the candidate's profile page and wait for the network to be idle (ensures page is fully loaded)
                    await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2', timeout: 5000 });
                } catch (navError) {
                    // If navigation fails (e.g., timeout, 404), log the error, close the tab, and skip this candidate
                    console.warn(`Navigation to ${candidate.email_source} failed: ${navError.message}`);
                    await candidatePage.close();
                    candidate.email = null;
                    continue;
                }

                /**
                 * Extracts the first email address found on the candidate's page by looking for a mailto: link.
                 * If no such link exists, returns null.
                 */
                const email = await candidatePage.evaluate(() => {
                    // Find the first anchor element whose href starts with "mailto:"
                    const mailLink = document.querySelector('a[href^="mailto:"]');
                    // If found, extract the email address and trim whitespace; otherwise, return null
                    return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
                });

                // Save the extracted email to the candidate record (or null if not found)
                candidate.email = email || null;
                // Always close the tab to free up browser resources
                await candidatePage.close();
                } catch (err) {
                    console.error(`Failed to process ${candidate.name}:`, err.message);
                    candidate.email = null;
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                candidate.email = null;
            }

            allCandidates.push(candidate);
        }

        const unique = this.removeDuplicates(allCandidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-liberal.json');
        await this.closeBrowser();
    }
}

export default Liberal2025Scraper;