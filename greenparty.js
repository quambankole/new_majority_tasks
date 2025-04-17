    const puppeteer = require('puppeteer');
    const fs = require('fs');

    (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; NewMajorityBot/1.0; +https://vote.newmajority.ca; contact: hello@newmajority.ca)');

    await page.goto('https://www.greenparty.ca/en/candidates', { waitUntil: 'networkidle2' });

    // Scroll to bottom until all candidates are loaded
    async function autoScroll(page) {
        await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
            }
            }, 400);
        });
        });
    }

    await autoScroll(page);

    async function scrapeCandidates(page) {
        const candidateCards = await page.evaluate(() => 
        {
            // Select all candidate cards on the page=
            return Array.from(document.querySelectorAll('article.gpc-post-card')).map(card => ({
                name: card.querySelector('.gpc-post-card-heading a')?.innerText.trim() || null,
                email_source: card.querySelector('.gpc-post-card-heading a')?.href || null,
                riding: card.querySelector('.gpc-post-card-location')?.innerText.trim() || null,
                }));
        });

        const allCandidates = [];

        for (const candidate of candidateCards) {
        if (candidate.email_source) {
            try {
            console.log(`Visiting: ${candidate.email_source}`);
                await page.goto(candidate.email_source, { waitUntil: 'networkidle2' });

                const email = await page.evaluate(() => {
                    const mailLink = document.querySelector('a[href^="mailto:"]');
                    return mailLink ? mailLink.href.replace('mailto:', '').trim() : null;
                });

            candidate.email = email;
            } catch (err) {
            console.error(`Failed to fetch details for ${candidate.name}:`, err.message);
            candidate.email = null;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        allCandidates.push(candidate);
        }

        return allCandidates;
    }

    const candidates = await scrapeCandidates(page);
    fs.writeFileSync('candidates-greenparty.json', JSON.stringify(candidates, (key, value) => {
        if ( key === 'email' && value === 'greenteam@greenparty.ca' || key === 'email' && value === 'equipevert@partivert.ca') {
        return null;
        }
        return value;
    }, 2), 'utf-8');
    console.log('Candidate data saved to candidates-greenparty.json');

    await browser.close();
    })();