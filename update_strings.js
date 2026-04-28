const fs = require('fs');

const es = JSON.parse(fs.readFileSync('./messages/es.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('./messages/en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('./messages/fr.json', 'utf8'));

es.HomePage.whatsapp = "Hablar por WhatsApp";
en.HomePage.whatsapp = "Talk on WhatsApp";
fr.HomePage.whatsapp = "Parler sur WhatsApp";

es.HomePage.scroll = "Deslizar";
en.HomePage.scroll = "Scroll";
fr.HomePage.scroll = "Défiler";

fs.writeFileSync('./messages/es.json', JSON.stringify(es, null, 2));
fs.writeFileSync('./messages/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('./messages/fr.json', JSON.stringify(fr, null, 2));

console.log("JSON updated!");
