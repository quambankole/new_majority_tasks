const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

await page.goto('https://www.peoplespartyofcanada.ca/candidates', { waitUntil: 'networkidle2' });

async function scrapeCandidateEmail(browser, url, name) {
    try {
        console.log(`Visiting: ${url}`);
        const candidatePage = await browser.newPage();
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

async function scrapeCandidates(page) {
    const scrapedCandidates = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.collection-item-10')).map(item => {
            const card = item.querySelector('a.card-6.social-media');
            const name = card.querySelector('h3')?.innerText.trim() || null;
            const riding = card.querySelector('.social-media-card-content > div:nth-of-type(1)')?.innerText.trim() || null;
            const email_source = card.href.startsWith('http')? card.href: `https://www.peoplespartyofcanada.ca${card.getAttribute('href')}`;

        
            return {
                name,
                riding,
                email_source,
            };
            });
        });

    const allCandidates = [];

    for (const candidate of scrapedCandidates) {
        if (candidate.email_source) {
            candidate.email = await scrapeCandidateEmail(browser, candidate.email_source, candidate.name);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        allCandidates.push(candidate);
    }

    const uniqueCandidates = [];
    const seen = new Set();

    for (const candidate of allCandidates) {
        const key = `${candidate.name}|${candidate.riding}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueCandidates.push(candidate);
    }
    return uniqueCandidates;
}

async function scrapeAllPages(page) {
    const allCandidates = [];

    while (true) {
        await page.waitForSelector('.collection-item-10');
        const candidates = await scrapeCandidates(page);
        allCandidates.push(...candidates);

        const nextButton = await page.$('.w-pagination-next');
        if (!nextButton) break;

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            nextButton.click(),
        ]);

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return allCandidates;
}

await page.waitForSelector('.collection-item-10');

const candidates = await scrapeAllPages(page);
fs.writeFileSync('candidates-ppc.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-ppc.json');

await browser.close();
})();