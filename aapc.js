const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

let retries = 0;
while (retries < 5) {
    try {
        await page.goto('https://www.animalprotectionparty.ca/candidates/', { waitUntil: 'networkidle2' });
        break;
    } catch (err) {
        if (err.message.includes('429')) {
            const backoff = Math.pow(2, retries) * 1000;
            console.warn(`429 Too Many Requests — retrying in ${backoff}ms...`);
            await new Promise(resolve => 
                setTimeout(resolve, backoff));
            retries++;
        } else {
            throw err;
        }
    }
}

async function scrapeCandidates(page) {
    const scrapedCandidates = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".x-content")).map(section => {
            const h5 = section.querySelector("h5");
            const emailTag = section.querySelector('a[href^="mailto:"]');
            let name = null;
            let riding = null;

            if (h5 && h5.innerText.includes(":")) {
                const parts = h5.innerText.split(":");
                name = parts[0].trim();
                riding = parts[1].trim();
            }

            return {
                name,
                riding,
                email: emailTag ? emailTag.href.replace("mailto:", "").trim() : null,
                email_source: emailTag ? emailTag.href : null
            };
        })
    });

    const allCandidates = [];

    for (const candidate of scrapedCandidates) {
        allCandidates.push(candidate);

        await new Promise(resolve => setTimeout(resolve, 10000 ));
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

const candidates = await scrapeCandidates(page);
fs.writeFileSync('candidates-aapc.json', JSON.stringify(candidates, null, 2), 'utf-8');
console.log('Candidate data saved to candidates-aapc.json');

await browser.close();
})();