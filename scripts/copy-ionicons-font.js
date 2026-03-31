#!/usr/bin/env node
'use strict';
// Copy Ionicons font into project assets for bundling.
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
const dest = path.join(root, 'assets', 'fonts', 'ionicons.ttf');

if (!fs.existsSync(src)) {
  console.warn('copy-ionicons-font: source font not found, skipping');
  process.exit(0);
}

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
} catch (e) {
  console.warn('copy-ionicons-font:', e.message);
}
