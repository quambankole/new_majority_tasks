const fs = require('fs');

const filePath = 'output-candidate.json';

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

data.forEach(entry => {
if (entry.email && !emailRegex.test(entry.email)) {
    console.log(` ${entry.name}: ${entry.email}`);
}
});
