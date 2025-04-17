    const puppeteer = require('puppeteer');
    const fs = require('fs');

    (async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

    let retries = 0;
    while (retries < 5) {
        try {
            await page.goto('https://communist-party.ca/candidates/', { waitUntil: 'networkidle2' });
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
        const candidateRows = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.elementor-container.elementor-column-gap-default'));
            const candidates = [];

            for (const row of rows) {
                const columns = row.querySelectorAll('.elementor-column');
                if (columns.length >= 3) {
                    const riding = columns[0].querySelector('h5')?.innerText.trim() || null;
                    const name = columns[1].querySelector('a')?.innerText.trim() || null;
                    const email = columns[2].querySelector('h5')?.innerText.trim() || null;
                    const email_source = window.location.href;

                    candidates.push({ name, riding, email, email_source });
                }
            }
            return candidates;
        });

        const allCandidates = [];

        for (const candidate of candidateRows) {
            allCandidates.push(candidate);
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }

        return allCandidates;
    }

    const candidates = await scrapeCandidates(page);
    fs.writeFileSync('candidates-cpc.json', JSON.stringify(candidates, null, 2), 'utf-8');
    console.log('Candidate data saved to candidates-cpc.json');

    await browser.close();
    })();