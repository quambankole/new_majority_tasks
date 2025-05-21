import PartyScraper from '../../scraper/partyScraper.js';

/**
 * Scraper for the Conservative Party of Canada 2025 candidate list.
 * This class scrapes candidate names, ridings, and emails (from candidate pages) and saves the data.
 * Inherits from PartyScraper.
 */
class Conservative2025Scraper extends PartyScraper {
    /**
     * Main scraping method.
     * Launches browser, navigates to the candidates page, extracts data, and saves the results.
     */
    async scrape() {
        await this.launchBrowser();

        let retries = 0;
        // Retry up to 3 times if we encounter a 429 (rate limit) error.
        while (retries < 3) {
            try {
                await this.goToPage('https://www.conservative.ca/candidates/');
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

        // Wait for candidate cards to load.
        await this.page.waitForSelector('.candidate-card');

        // Extract candidate info from each card in the grid.
        const scrapedCandidates = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll(".candidate-grid .card-wrapper .candidate-card")).map(card => {
                // The name is split into two h3 elements: first and last name.
                const firstName = card.querySelectorAll('h3.name-header')[0]?.innerText.trim() || '';
                const lastName = card.querySelectorAll('h3.name-header')[1]?.innerText.trim() || '';
                const name = `${firstName} ${lastName}`.trim();
                const riding = card.querySelector('p.riding-title')?.innerText.trim() || null;
                // The candidate's page link, used to scrape the email.
                const link = card.querySelector('a.button')?.href || null;
                return {
                    name,
                    riding,
                    email_source: link,
                    party: 'Conservative Party of Canada'
                };
            });
        });

        const allCandidates = [];

        // For each candidate, visit their page to extract their email.
        for (const candidate of scrapedCandidates) {
            if (candidate.email_source) {
                try {
                    console.log(`Visiting: ${candidate.email_source}`);
                    const candidatePage = await this.browser.newPage();
                    try {
                        // Attempt to navigate to the candidate's page.
                        await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2', timeout: 5000 });
                    } catch (navError) {
                        console.warn(`Navigation to ${candidate.email_source} failed: ${navError.message}`);
                        await candidatePage.close();
                        candidate.email = null;
                        continue;
                    }

                    // Look for a mailto: link on the candidate's page.
                    const email = await candidatePage.evaluate(() => {
                        const mailLink = document.querySelector('a[href^="mailto:"]');
                        return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
                    });

                    candidate.email = email || null;
                    await candidatePage.close();
                } catch (err) {
                    console.error(`Failed to process ${candidate.name}:`, err.message);
                    candidate.email = null;
                }

                // Wait 5 seconds between requests to avoid spamming the server.
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                candidate.email = null;
            }

            allCandidates.push(candidate);
        }

        // Remove duplicates and save the results to file.
        const unique = this.removeDuplicates(allCandidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-conservative.json');
        await this.closeBrowser();
    }
}

export default Conservative2025Scraper;