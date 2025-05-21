// src/fetchCandidates.js
require('dotenv').config(); // Load .env variables

const axios = require('axios');
const fs = require('fs');

async function fetchCandidateEmails(electionId = 14) {
    const apiKey = process.env.VOTEMATE_API_KEY;
    const url = `https://votemate.org/i/elections/${electionId}/candidate_emails?key=${apiKey}`;

try {
    const response = await axios.get(url);
    fs.writeFileSync(`candidate_emails_${electionId}.json`, JSON.stringify(response.data, null, 2));    console.log(`Saved candidate data for election ${electionId}`);
} catch (error) {
    console.error('Error fetching data:', error.message);
    }
}

fetchCandidateEmails(); 