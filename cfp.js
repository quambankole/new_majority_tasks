const puppeteer = require('puppeteer');
const fs = require('fs');


(async () => {
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

await page.goto('https://www.thecanadianfutureparty.ca/who-we-are/candidates', { waitUntil: 'networkidle2' });

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
        return Array.from(document.querySelectorAll('.collection-item.candidate')).map(item => {
            const card = item.querySelector('.team-card-container.candidates');
            const name = card.querySelector('h3')?.innerText.trim() || null;
            const riding = card.querySelector('h4')?.innerText.trim() || null;
            const profileLink = item.querySelector('a');
            const email_source = profileLink ? (profileLink.href.startsWith('http') ? profileLink.href : `https://www.thecanadianfutureparty.ca${profileLink.getAttribute('href')}`) : null;

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

await page.waitForSelector('.collection-item.candidate');

const candidates = await scrapeCandidates(page);
fs.writeFileSync('candidates-cfp.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-cfp.json');

await browser.close();
})();