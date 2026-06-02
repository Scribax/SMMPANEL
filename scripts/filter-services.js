const fs = require('fs');

const raw = fs.readFileSync('smmkings-services-utf8.json', 'utf8');
const data = JSON.parse(raw.replace(/^\uFEFF/, ''));

const filtered = data.filter((svc) => {
  const category = svc.category || '';
  const isTargetCategory = !/(instagram|youtube)/i.test(category);
  const hasRefill = svc.refill === true;
  const reasonableRate = Number(svc.rate) >= 0.5 && Number(svc.rate) <= 5;
  return isTargetCategory && hasRefill && reasonableRate;
});

console.log(`Total filtrados: ${filtered.length}`);
console.log('Top 40 ejemplos:\n');
console.log(
  filtered
    .slice(0, 40)
    .map(
      (svc) =>
        `${svc.service} | ${svc.name} | ${svc.category} | rate:${svc.rate} | min:${svc.min} | max:${svc.max}`
    )
    .join('\n')
);

fs.writeFileSync('smmkings-filtered-non-ig-yt.json', JSON.stringify(filtered, null, 2));
console.log('\nArchivo exportado: smmkings-filtered-non-ig-yt.json');
