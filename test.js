const fs = require('fs');

const filePath = 'output-candidate.json';

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Function to remove duplicates based on riding, email, and party
function removeDuplicates(entries) {
  const seen = new Set();
  return entries.filter(entry => {
    const key = `${entry.riding}|${entry.email}|${entry.party}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const deduplicated = removeDuplicates(data);

const updated = deduplicated.map(entry => {
  if (entry.email === null) {
    return { ...entry, email_source: null };
  }
  return entry;
});

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
