import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await fs.readFile(path.join(root, 'data', 'live.json'), 'utf8'));
const errors = [];
const warnings = [];

if (data.fixtures?.length !== 104) errors.push(`Expected 104 fixtures, received ${data.fixtures?.length || 0}`);
if (Object.keys(data.teams || {}).length !== 48) errors.push(`Expected 48 teams, received ${Object.keys(data.teams || {}).length}`);

const expectedStages = { 'group-stage':72, 'round-of-32':16, 'round-of-16':8, quarterfinals:4, semifinals:2, '3rd-place-match':1, final:1 };
for (const [stage, expected] of Object.entries(expectedStages)) {
  const actual = data.fixtures.filter(f => f.stageSlug === stage).length;
  if (actual !== expected) errors.push(`${stage}: expected ${expected}, received ${actual}`);
}

for (const [code, team] of Object.entries(data.teams || {})) {
  const recent = team.recent || [];
  if (!recent.length) warnings.push(`${code}: no recent results returned`);
  if (recent.length < 10) warnings.push(`${code}: only ${recent.length}/10 recent results returned`);
  if ((team.players || []).length < 26) warnings.push(`${code}: only ${team.players?.length || 0}/26 players returned`);
  for (const player of team.players || []) {
    if (!player.name || !player.nameZh) errors.push(`${code}: player is missing original or Chinese display name`);
  }
  for (const [index, match] of recent.entries()) {
    const score = String(match.score).match(/^(\d+)-(\d+)$/);
    if (!score) { errors.push(`${code} recent #${index + 1}: invalid score ${match.score}`); continue; }
    const home = Number(score[1]), away = Number(score[2]);
    const expected = home > away ? 'W' : home === away ? 'D' : 'L';
    if (match.result !== expected) errors.push(`${code} recent #${index + 1}: ${match.score} cannot be ${match.result}`);
  }
}

const resultLabel = (home, away) => home > away ? '胜' : home < away ? '负' : '平';
for (const fixture of data.fixtures || []) {
  const prefix = `match #${fixture.matchNo}`;
  if ((fixture.probabilities || []).reduce((sum, value) => sum + value, 0) !== 100) errors.push(`${prefix}: probabilities do not total 100`);
  const score = String(fixture.score).match(/^(\d+)[–-](\d+)$/);
  if (!score) { errors.push(`${prefix}: invalid score ${fixture.score}`); continue; }
  const home = Number(score[1]), away = Number(score[2]);
  if (fixture.completed) {
    if (fixture.scoreType !== '赛果') errors.push(`${prefix}: completed match is labelled ${fixture.scoreType}`);
    if (home !== fixture.homeScore || away !== fixture.awayScore) errors.push(`${prefix}: final score fields disagree`);
    if (fixture.halfFullType !== 'actual') errors.push(`${prefix}: completed match half/full is not actual`);
    if (fixture.halfFull !== '暂无半场数据') {
      const parts = fixture.halfFull.split(/\s*\/\s*/);
      if (parts.length !== 2) errors.push(`${prefix}: invalid half/full ${fixture.halfFull}`);
      else {
        if (parts[1] !== resultLabel(home, away)) errors.push(`${prefix}: full-time result ${parts[1]} disagrees with ${fixture.score}`);
        const half = String(fixture.halfTimeScore).match(/^(\d+)[–-](\d+)$/);
        if (!half) errors.push(`${prefix}: missing halftime score`);
        else if (parts[0] !== resultLabel(Number(half[1]), Number(half[2]))) errors.push(`${prefix}: halftime result disagrees with ${fixture.halfTimeScore}`);
      }
    }
    const goals = (fixture.timeline || []).filter(event => event.type === 'goal');
    if (goals.length !== fixture.homeScore + fixture.awayScore) errors.push(`${prefix}: timeline has ${goals.length} goals but score has ${fixture.homeScore + fixture.awayScore}`);
  } else if (fixture.halfFullType === 'prediction') {
    if (fixture.scoreType !== '预测比分') errors.push(`${prefix}: scheduled match is labelled ${fixture.scoreType}`);
    const parts = fixture.halfFull.split(/\s*\/\s*/);
    if (parts.length !== 2 || parts[1] !== resultLabel(home, away)) errors.push(`${prefix}: prediction ${fixture.halfFull} disagrees with ${fixture.score}`);
    const alternative = String(fixture.alternativeScore).match(/^(\d+)[–-](\d+)$/);
    if (!alternative) errors.push(`${prefix}: missing alternative score`);
    else {
      const altHome = Number(alternative[1]), altAway = Number(alternative[2]);
      if (fixture.alternativeScore === fixture.score) errors.push(`${prefix}: alternative score duplicates primary prediction`);
      if (resultLabel(altHome, altAway) !== resultLabel(home, away)) errors.push(`${prefix}: alternative score changes predicted outcome`);
    }
  }
  if (fixture.scoreType === '实时比分' && (!fixture.clockSnapshotAt || !Number.isFinite(fixture.clockSeconds))) errors.push(`${prefix}: live clock cannot advance`);
  for (const event of fixture.timeline || []) {
    if (!['goal','yellow','red'].includes(event.type)) errors.push(`${prefix}: unsupported timeline event ${event.type}`);
    if (!event.minute || !event.player) errors.push(`${prefix}: incomplete timeline event ${event.id}`);
    if (event.type === 'goal' && !['正常进球','乌龙球','点球','头球'].includes(event.goalKind)) errors.push(`${prefix}: invalid goal kind ${event.goalKind}`);
  }
}

const summary = data.scoreSummary;
if (!summary) errors.push('Missing score summary');
else {
  const completed = data.fixtures.filter(f => f.completed).length;
  const future = data.fixtures.filter(f => !f.completed && f.halfFullType === 'prediction').length;
  const counted = summary.distribution.reduce((sum, row) => sum + row.count, 0);
  const additions = summary.distribution.reduce((sum, row) => sum + row.expectedAdditional, 0);
  if (summary.completedMatches !== completed || counted !== completed) errors.push(`Score summary completed total mismatch: ${summary.completedMatches}/${counted}/${completed}`);
  if (summary.futureMatches !== future || Math.abs(additions - future) > .6) errors.push(`Score summary forecast total mismatch: ${summary.futureMatches}/${additions}/${future}`);
  if (summary.totalGoals !== data.fixtures.filter(f => f.completed).reduce((sum, f) => sum + f.homeScore + f.awayScore, 0)) errors.push('Score summary goal total mismatch');
}

console.log(`Audit: ${data.fixtures.length} fixtures, ${Object.keys(data.teams).length} teams, ${Object.values(data.teams).reduce((n, t) => n + (t.recent?.length || 0), 0)} recent results`);
for (const warning of warnings) console.warn(`WARNING ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}
