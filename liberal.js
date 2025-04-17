const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');
    
    let retries = 0;
    while (retries < 5) {
        try {
            await page.goto('https://liberal.ca/your-liberal-candidates/', { waitUntil: 'networkidle2' });
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
    const scrapedCandidates = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".person__item-container")).map(card => {
            const nameElements = card.querySelectorAll('.person__name');
            const name = Array.from(nameElements).map(el => el?.innerText?.trim()).filter(Boolean).join(' ') || null;
            const riding = card.querySelector('.person__riding-name')?.innerText.trim() || null;
            const link = card.querySelector('.person__item a')?.href || null;

            return {
                name,
                riding,
                email_source: link
            };
        });
    });

    const allCandidates = [];

    for (const candidate of scrapedCandidates) {
        if (candidate.email_source) {
            try {
                console.log(`Visiting: ${candidate.email_source}`);
                const candidatePage = await browser.newPage();
                try {
                    await candidatePage.goto(candidate.email_source, { waitUntil: 'networkidle2', timeout: 5000 });
                } catch (navError) {
                    console.warn(`Navigation to ${candidate.email_source} failed: ${navError.message}`);
                    await candidatePage.close();
                    candidate.email = null;
                    continue;
                }

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

            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
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

await page.waitForSelector('.person__item-container');

const candidates = await scrapeCandidates(page);
fs.writeFileSync('candidates-liberal.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-liberal.json');

await browser.close();
})();