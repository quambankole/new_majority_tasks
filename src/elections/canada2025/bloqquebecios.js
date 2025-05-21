import PaginatedPartyScraper from '../../scraper/paginatedPartyScraper.js';

/**
 * Scraper for the Bloc Québécois 2025 candidate list.
 * This class paginates through the candidates page, extracts candidate names, ridings, and emails, and saves the data.
 * Inherits from PaginatedPartyScraper.
 */
class BlocQuebecois2025Scraper extends PaginatedPartyScraper {
    /**
     * Main scraping method.
     * Launches browser, paginates through the candidates, extracts data, and saves the results.
     */
    async scrape() {
        await this.launchBrowser();
        await this.goToPage('https://www.blocquebecois.org/candidates-et-candidats/');
        // Click to load all candidates by paginating.
        await this.clickToPaginate('a.more.centered.infinity');

        // Extract candidate info from each article on the page.
        const candidates = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('article')).map(candidate => {
                // Try to find an email link in the contact section.
                const emailLink = candidate.querySelector('ul.contact a');
                const email = emailLink?.href.replace('mailto:', '') || null;
                const email_source = email ? window.location.href : null;

                // Get candidate name from possible selectors.
                const name =
                    candidate.querySelector('h1.transparent')?.innerText.trim() ||
                    candidate.querySelector('div.col h1')?.innerText.trim() || null;

                // Get riding name.
                const riding = candidate.querySelector('h2')?.innerText.trim() || null;

                return {
                    name,
                    riding,
                    email,
                    email_source,
                    party: 'Bloc Québécois'
                };
            });
        });

        // Remove duplicates and save the results to file.
        const unique = this.removeDuplicates(candidates);
        await this.saveToFile(unique, 'output/canada2025/candidates-blocquebecois.json');
        await this.closeBrowser();
    }
}

export default BlocQuebecois2025Scraper;