const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

await page.goto('https://www.ndp.ca/team', { waitUntil: 'networkidle2' });

async function scrapeCandidates(page) {
    const scrapedCandidates = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".campaign-civics-list-item")).map(candidate => {
            const data = candidate.querySelector('.civic-data')?.dataset || {};
            return {
                name: candidate.querySelector('.campaign-civics-list-title.civic-name')?.innerText.trim() || null,
                riding: candidate.querySelector('.campaign-civics-list-desc.civic-riding')?.innerText.trim() || null,
                email_source: data.websiteLink || null,
            };
        });
    });

    const allCandidates = [];

    for (const candidate of scrapedCandidates) {
        if (candidate.email_source) {
            try {
                console.log(`Visiting: ${candidate.email_source}`);
                const candidatePage = await browser.newPage();
                await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2' });

                const email = await candidatePage.evaluate(() => {
                    const mailLink = document.querySelector('a[href^="mailto:"]');
                    return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
                });

                await candidatePage.close();
                candidate.email = email || null;
            } catch (err) {
                console.error(`Failed to fetch details for ${candidate.name}:`, err.message);
                candidate.email = null;
            }

            await new Promise(resolve => setTimeout(resolve, 11000));
        }
        else{
            console.log(`Skipping ${candidate.name}, no profile link.`);
            candidate.email = null;
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

await page.waitForSelector('.campaign-civics-list-item');

const candidates = await scrapeCandidates(page);
fs.writeFileSync('candidates-ndp.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-ndp.json');

await browser.close();
})();