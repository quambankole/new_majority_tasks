const puppeteer = require('puppeteer'); 
const fs = require('fs');



(async () => { 

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

    await page.goto('https://www.animalprotectionparty.ca/candidates/', { waitUntil: 'networkidle2' });

    async function scrapeCandidates(page) {
        const allCandidates = [];

        while (true) {
            const candidates = await page.evaluate(() => {
                return Array.from(document.querySelectorAll("article")).map(candidate => {
                    const emailLink = candidate.querySelector('ul.contact a');
                    const email = emailLink?.href.replace('mailto:', '') || null;
                    const email_source = email? (window.location.href ): null;
                    return {
                        name: candidate.querySelector('h1.transparent')?.innerText.trim() ||
                            candidate.querySelector('div.col h1')?.innerText.trim() || null,
                        riding: candidate.querySelector('h2')?.innerText.trim() || null,
                        email,
                        email_source
                    };
                });
            });

            allCandidates.push(...candidates);

            const nextButton = await page.$('a.more.centered.infinity');
            if (!nextButton) break;

            const previousCount = await page.$$eval("article", all => all.length);
            await nextButton.click();
            await page.waitForFunction(
                prev => document.querySelectorAll("article").length > prev,
                {},
            previousCount
            );
        }

        const uniqueCandidates = [];
        const seen = new Set();

        for (const candidate of allCandidates) {
            const key = candidate.email || `${candidate.name}|${candidate.riding}`;
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueCandidates.push(candidate);
        }
        return uniqueCandidates;
    }

    const candidates = await scrapeCandidates(page);
    fs.writeFileSync('candidates-blocquebecois.json', JSON.stringify(candidates, null, 2), 'utf-8');
    console.log('Candidate data saved to candidates-blocquebecois.json');

	await browser.close(); 
})();
