#!/usr/bin/env node
/**
 * Enforce a 14px minimum font size in css/style.css.
 * Root is 16px, so the floor is 0.875rem / 14px. clamp() values are reported
 * for manual review (their min term is handled separately).
 */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../css/style.css');
let css = fs.readFileSync(file, 'utf8');
const changes = [];

css = css.replace(/font-size:\s*([0-9]*\.?[0-9]+)(rem|px)(\s*!important)?/g, (m, num, unit, imp) => {
  const v = parseFloat(num);
  const min = unit === 'rem' ? 0.875 : 14;
  if (v < min) {
    const nv = unit === 'rem' ? '0.875' : '14';
    changes.push(`${num}${unit} -> ${nv}${unit}`);
    return `font-size: ${nv}${unit}${imp || ''}`;
  }
  return m;
});

fs.writeFileSync(file, css, 'utf8');
console.log(`Bumped ${changes.length} declarations to the 14px floor:`);
changes.forEach(c => console.log('  ' + c));

// Flag clamp() minimums under 14px for manual review
const clamps = [...css.matchAll(/font-size:\s*clamp\(([^,]+),/g)].map(m => m[1].trim());
const lowClamps = clamps.filter(c => {
  const r = c.match(/([0-9.]+)rem/), p = c.match(/([0-9.]+)px/);
  return (r && parseFloat(r[1]) < 0.875) || (p && parseFloat(p[1]) < 14);
});
if (lowClamps.length) console.log('\nclamp() mins to review manually:', lowClamps.join(', '));
else console.log('\nNo clamp() minimums under 14px.');
