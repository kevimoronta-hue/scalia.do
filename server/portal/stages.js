/* Scalia Portal · the five stages of a Scalia web project and the progress
   rule. Each stage is worth 20 %: a completed stage counts in full, a stage
   in progress (or waiting for the client) counts its own progress. */
'use strict';

const STAGES = ['brief', 'mockup', 'development', 'review', 'delivery'];
const STAGE_STATUS = ['upcoming', 'in_progress', 'waiting_client', 'completed'];
const PROJECT_STATUS = ['active', 'on_hold', 'completed'];
const CURRENCIES = ['EUR', 'USD', 'DOP'];
const LOCALES = ['es', 'fr', 'en'];
const DOC_CATEGORIES = ['contract', 'mockup', 'branding', 'project', 'invoice', 'delivery', 'other'];

function stageValue(s) {
  if (s.status === 'completed') return 100;
  if (s.status === 'in_progress' || s.status === 'waiting_client') return Math.max(0, Math.min(100, Number(s.progress) || 0));
  return 0;
}
// Overall progress, 0-100, from the stage rows.
function overall(stages) {
  const by = {};
  (stages || []).forEach(s => { by[s.stage_key] = s; });
  const total = STAGES.reduce((sum, k) => sum + (by[k] ? stageValue(by[k]) : 0), 0) / STAGES.length;
  return Math.round(total);
}
// The current stage: the first one not completed (delivery once all are).
function current(stages) {
  const by = {};
  (stages || []).forEach(s => { by[s.stage_key] = s; });
  return STAGES.find(k => !by[k] || by[k].status !== 'completed') || 'delivery';
}
function ordered(stages) {
  return (stages || []).slice().sort((a, b) => STAGES.indexOf(a.stage_key) - STAGES.indexOf(b.stage_key));
}

module.exports = { STAGES, STAGE_STATUS, PROJECT_STATUS, CURRENCIES, LOCALES, DOC_CATEGORIES, overall, current, ordered, stageValue };
