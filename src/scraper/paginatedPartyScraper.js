import PartyScraper from '../../partyScraper.js';
/**
 * A scraper class that handles scrolling and pagination
 * for pages that load  content dynamically.
 */
class PaginatedPartyScraper extends PartyScraper {
    /**
     * Scrolls down the page until all content is loaded.
     * @param {puppeteer.Page} page - The Puppeteer page object (defaults to this.page).
     * @returns {Promise<void>}
     */
    async autoScroll(page = this.page) {
        // Scrolls the page down in increments until the bottom is reached.
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 100; // pixels to scroll each step
                const timer = setInterval(() => {
                    window.scrollBy(0, distance); // scroll down a bit
                    totalHeight += distance;

                    // Stop scrolling when we've reached the bottom of the page
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200); // wait 200ms between scrolls
            });
        });
    }

    /**
     * Repeatedly clicks a pagination button to load more candidates.
     * Useful for "Load more" or "Next" buttons.
     * @param {string} selector - CSS selector for the pagination button.
     * @param {boolean} waitForNew - Whether to wait for new content after each click.
     * @param {number} waitTimeout - How long to wait (in ms) for new content to appear.
     * @returns {Promise<void>}
     */
    async clickToPaginate(selector, waitForNew = true, waitTimeout = 10000) {
        const page = this.page;
        while (true) {
            const hasNext = await page.$(selector); // check if button exists
            if (!hasNext) break;

            // Count current articles before clicking
            const previousCount = await page.$$eval("article", items => items.length);

            await hasNext.click(); // Click the pagination button

            if (waitForNew) {
                try {
                    // Wait until more articles appear on the page
                    await page.waitForFunction(
                        prev => document.querySelectorAll("article").length > prev,
                        { timeout: waitTimeout },
                        previousCount
                    );
                } catch (err) {
                    // If new content doesn't appear in time, stop paginating
                    console.warn('Pagination wait timeout:', err.message);
                    break;
                }
            } else {
                // Just wait a little before continuing to next iteration
                await page.waitForTimeout(2000);
            }
        }
    }
}

export default PaginatedPartyScraper;
