const fs = require('fs');

const filePath = 'updated-candidates.json';

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Function to create a website key  

function addWebsiteField(enteries){
    return enteries.map(entry => ({
        ...entry,
        website: entry.email_source
    }));
}

const updated = addWebsiteField(data);

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');


// Using Regex to check email address format

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

data.forEach(entry => {
    if (entry.email && !emailRegex.test(entry.email)) {
        console.log(` ${entry.name}: ${entry.email}`);
    }
});
