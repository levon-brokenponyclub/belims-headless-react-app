const fs = require('fs');

const filePath = './constants.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace each product object to add slug field after id
content = content.replace(/(\s+id: ')([^']+)(',\n\s+name:)/g, (match, p1, p2, p3) => {
  return `${p1}${p2}${p3.replace(",\n    name:", ",\n    slug: '" + p2 + "',\n    name:")}`;
});

fs.writeFileSync(filePath, content);
console.log('Added slug fields to all products');
