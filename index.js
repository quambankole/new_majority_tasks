// index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This script runs scraper modules for a specified election.
 * It dynamically imports and executes scraper classes found in a given election folder.
 */

// Get the current directory of this module in an ES module context
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the folder name passed as a command-line argument (e.g. "canada2025")
const electionFolder = process.argv[2];
if (!electionFolder) {
    console.error('Usage: npm start <no folder>');
    process.exit(1); // Exit if no folder is provided
}

// Build the full path to the election folder
const electionPath = path.join(__dirname, 'src', 'elections', electionFolder);
if (!fs.existsSync(electionPath)) {
    console.error(`Election folder "${electionFolder}" not found.`);
    process.exit(1); // Exit if the folder doesn't exist
}

// Find all JavaScript scraper files in the specified election folder
const scraperFiles = fs.readdirSync(electionPath).filter(f => f.endsWith('.js'));

// Loop through each scraper file and run it
for (const file of scraperFiles) {
    const filePath = path.join(electionPath, file);
    const { default: Scraper } = await import(filePath); // Dynamically import the scraper class
    const scraper = new Scraper(); // Create an instance
    console.log(`Running ${file}...`);
    await scraper.scrape(); // Execute the scrape method
}