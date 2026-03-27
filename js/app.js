// app.js
import { openTemplate, saveTemplate } from './template.js';
import { fetchContract } from './api.js';
import './config.js';
import './state.js';
import './table.js';
import './blueform.js';
import './utils.js';

document.getElementById('openBtn').addEventListener('click', openTemplate);
