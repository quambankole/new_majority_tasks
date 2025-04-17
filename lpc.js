const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

let retries = 0;
while (retries < 5) {
    try {
        await page.goto('https://www.libertarian.ca/2025_candidates', { waitUntil: 'networkidle2' });
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

async function scrapeCandidates(page) {
    const candidates = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('.page-content p'));
        return nodes.map(p => {
            const anchor = p.querySelector('a');
            const text = p.innerText.trim();
            if (anchor && text.includes(' - ')) {
                const [riding, name] = text.split(' - ');
                return {
                    name: name.trim(),
                    riding: riding.trim(),
                    email_source: anchor.href
                };
            } else if (!anchor && text.includes(' - ')) {
                const [riding, name] = text.split(' - ');
                return {
                    name: name.trim(),
                    riding: riding.trim(),
                    email_source: null
                };
            }
            return null;
        }).filter(Boolean);
    });

    const allCandidates = [];

    for (const candidate of candidates) {
        if (candidate.email_source) {
            try {
                const candidatePage = await browser.newPage();
                await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2' });

                const email = await candidatePage.evaluate(() => {
                    const bodyText = document.body.innerText;
                    const match = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    return match ? match[0].trim() : null;
                });

                candidate.email = email || null;
                await candidatePage.close();
            } catch (err) {
                console.error(`Failed to fetch email for ${candidate.name}:`, err.message);
                candidate.email = null;
            }
        } else {
            candidate.email = null;
        }

        allCandidates.push(candidate);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }

    return allCandidates;
}

const candidates = await scrapeCandidates(page);
fs.writeFileSync('candidates-lpc.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-lpc.json');

await browser.close();
})();