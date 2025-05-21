import PartyScraper from '../../scraper/partyScraper.js';

/**
 * Scraper for the Canadian Future Party 2025 candidate list.
 * This class scrapes candidate names, ridings, and emails (from profile pages) and saves the data.
 * Inherits from PartyScraper.
 */
class Cfp2025Scraper extends PartyScraper {
    /**
     * Scrapes a candidate's email address from their profile page.
     * @param {string} url - The URL of the candidate's profile page.
     * @param {string} name - The candidate's name (used for logging).
     * @returns {Promise<string|null>} The candidate's email address, or null if not found.
     */
    async scrapeCandidateEmail(url, name) {
        try {
            console.log(`Visiting: ${url}`);
            const candidatePage = await this.browser.newPage();
            await candidatePage.goto(url, { waitUntil: 'networkidle2' });

            // Look for a mailto: link on the profile page.
            const email = await candidatePage.evaluate(() => {
                const mailLink = document.querySelector('a[href^="mailto:"]');
                return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
            });

            await candidatePage.close();
            return email || null;
        } catch (err) {
            console.error(`Failed to fetch details for ${name}:`, err.message);
            return null;
        }
    }

    /**
     * Main scraping method.
     * Launches browser, navigates to the party's candidates page, extracts data, and saves the results.
     */
    async scrape() {
        await this.launchBrowser();
        await this.goToPage('https://www.thecanadianfutureparty.ca/who-we-are/candidates');
        await this.page.waitForSelector('.collection-item.candidate');

        // Extract basic candidate info from the main candidates page.
        const scrapedCandidates = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('.collection-item.candidate')).map(item => {
                const card = item.querySelector('.team-card-container.candidates');
                // Extract name and riding from the card.
                const name = card.querySelector('h3')?.innerText.trim() || null;
                const riding = card.querySelector('h4')?.innerText.trim() || null;
                // Get the candidate's profile link (for email scraping).
                const profileLink = item.querySelector('a');
                const email_source = profileLink ? 
                    (profileLink.href.startsWith('http') ? profileLink.href : `https://www.thecanadianfutureparty.ca${profileLink.getAttribute('href')}`) 
                    : null;

                return {
                    name,
                    riding,
                    email_source,
                    party: 'Canadian Future Party'
                };
            });
        });

        const allCandidates = [];

        // For each candidate, visit their profile page to extract their email.
        for (const candidate of scrapedCandidates) {
            if (candidate.email_source) {
                candidate.email = await this.scrapeCandidateEmail(candidate.email_source, candidate.name);
                // Wait 5 seconds between requests to avoid spamming the server.
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                candidate.email = null;
            }
            allCandidates.push(candidate);
        }

        // Remove duplicates and save the results to file.
        const unique = this.removeDuplicates(allCandidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-cfp.json');
        await this.closeBrowser();
    }
}

export default Cfp2025Scraper;