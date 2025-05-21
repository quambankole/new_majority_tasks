import PaginatedPartyScraper from '../../scraper/paginatedPartyScraper.js';
/**
 * Scraper for People's Party of Canada candidates in the 2025 federal election.
 * Uses page scrolling and pagination to gather candidate names, ridings, and emails.
 */
class Ppc2025Scraper extends PaginatedPartyScraper {
    /**
     * Visits a candidate's page to find their email address.
     * @param {string} url - The link to the candidate's personal profile or page.
     * @param {string} name - The candidate's name (used for logging).
     * @returns {Promise<string|null>} - The email address if found, otherwise null.
     */
    async scrapeCandidateEmail(url, name) {
        try {
            console.log(`Visiting: ${url}`);
            const candidatePage = await this.browser.newPage();
            await candidatePage.goto(url, { waitUntil: 'networkidle2' });

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
     * The main scraping logic. Opens the candidate list, loops through pages,
     * extracts details, fetches emails, removes duplicates, and saves to file.
     */
    async scrape() {
        await this.launchBrowser();
        await this.goToPage('https://www.peoplespartyofcanada.ca/candidates');
        await this.page.waitForSelector('.collection-item-10');

        const allCandidates = [];

        while (true) {
            // Pulls all visible candidate cards from the page
            const scrapedCandidates = await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('.collection-item-10')).map(item => {
                    const card = item.querySelector('a.card-6.social-media');
                    const name = card.querySelector('h3')?.innerText.trim() || null;
                    const riding = card.querySelector('.social-media-card-content > div:nth-of-type(1)')?.innerText.trim() || null;
                    const email_source = card.href.startsWith('http') 
                        ? card.href 
                        : `https://www.peoplespartyofcanada.ca${card.getAttribute('href')}`;

                    return {
                        name,
                        riding,
                        email_source,
                        party: 'People\'s Party of Canada'
                    };
                });
            });

            // Visit each candidate's page to extract email
            for (const candidate of scrapedCandidates) {
                if (candidate.email_source) {
                    candidate.email = await this.scrapeCandidateEmail(candidate.email_source, candidate.name);
                    await new Promise(resolve => setTimeout(resolve, 5000)); // avoid triggering rate limits
                } else {
                    candidate.email = null;
                }
                allCandidates.push(candidate);
            }

            // Try to click "next" to load more candidates; stop if not found
            const nextButton = await this.page.$('.w-pagination-next');
            if (!nextButton) break;

            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
                nextButton.click(),
            ]);

            await new Promise(resolve => setTimeout(resolve, 5000)); // give time for new content to load
        }

        const unique = this.removeDuplicates(allCandidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-ppc.json');
        await this.closeBrowser();
    }
}

export default Ppc2025Scraper;