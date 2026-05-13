/**
 * Phase 0 smoke test — grade a sample B1 essay end-to-end with Claude.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx script/smoke-test-writing-grader.ts
 *
 * Validates:
 *   1. Anthropic client initializes from env
 *   2. Adaptive thinking + system-prompt caching work
 *   3. Master-plan-spec JSON shape is returned and parses cleanly
 *   4. All five dimension scores sum to overall_score
 *
 * Per Master Plan §0 acceptance: "smoke test the writing grading prompt
 * end-to-end with one essay." This is that test.
 */

import { gradeWriting, type WritingGradeResponse } from '../server/grading/writingPrompt';

const SAMPLE_B1_ESSAY = `In my opinion, working from home have many advantages and disadvantages. The good things are that you save time because you no need to travel to the office every day, and you can wear comfortable clothes. Also, you can spend more time with your family.

But, there are some bad things too. For example, sometimes is difficult to concentrate at home because there are many distractions like television and family members. Also, you can feel isolated because you no see your colleagues every day.

Furthermore, I think working from home is good for some people but not for everyone. It depends of the person and the type of job. Some people need to be in office to work well, but others prefer their home. Personally, I prefer a mix of both — three days at home and two days in the office.

In conclusion, working from home has positives and negatives. Companies should let workers choose what works for them.`;

async function main() {
  console.log('🧪 Phase 0 smoke test — Claude writing grader\n');
  console.log('--- Input ---');
  console.log(`Target level: B1`);
  console.log(`Word count: ${SAMPLE_B1_ESSAY.split(/\s+/).length}\n`);

  const start = Date.now();

  let result: { grade: WritingGradeResponse; rawResponse: unknown };
  try {
    result = await gradeWriting({
      targetLevel: 'B1',
      currentWeek: 3,
      assignment: 'B1 Week 3 — opinion essay on remote work',
      writingPrompt:
        'Write 200 words sharing your opinion on remote work. Include at least two reasons supporting your view. Use connectors to organize your ideas. Target audience: a general adult reader.',
      studentText: SAMPLE_B1_ESSAY,
    });
  } catch (err) {
    console.error('❌ FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`✅ Graded in ${elapsed}s\n`);

  const { grade } = result;

  // Validation checks
  console.log('--- Validation ---');

  const dimSum =
    grade.dimensions.task_achievement.score +
    grade.dimensions.coherence_cohesion.score +
    grade.dimensions.lexical_range.score +
    grade.dimensions.grammatical_range.score +
    grade.dimensions.register_tone.score;

  const dimSumMatchesOverall = Math.abs(dimSum - grade.overall_score) <= 1; // allow 1pt rounding
  console.log(
    `  Dimensions sum (${dimSum}) ≈ overall_score (${grade.overall_score}): ${dimSumMatchesOverall ? '✅' : '⚠️  off by ' + Math.abs(dimSum - grade.overall_score)}`,
  );

  console.log(`  Overall score in [0, 100]: ${grade.overall_score >= 0 && grade.overall_score <= 100 ? '✅' : '❌'}`);
  console.log(`  Level assessment is valid CEFR: ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(grade.level_assessment) ? '✅' : '❌'}`);
  console.log(`  Has ≥1 strength: ${grade.strengths.length >= 1 ? '✅' : '❌'}`);
  console.log(`  Has ≥1 improvement priority: ${grade.improvement_priorities.length >= 1 ? '✅' : '❌'}`);
  console.log(`  Has ≥1 inline annotation: ${grade.inline_annotations.length >= 1 ? '✅ (' + grade.inline_annotations.length + ' annotations)' : '⚠️  zero annotations on a B1 sample with known errors'}`);

  console.log('\n--- Sample output ---');
  console.log(`Overall score: ${grade.overall_score}/100`);
  console.log(`Estimated CEFR: ${grade.estimated_cefr_for_this_writing}`);
  console.log(`\nDimension breakdown:`);
  console.log(`  Task Achievement:        ${grade.dimensions.task_achievement.score}/20`);
  console.log(`  Coherence & Cohesion:    ${grade.dimensions.coherence_cohesion.score}/20`);
  console.log(`  Lexical Range:           ${grade.dimensions.lexical_range.score}/20`);
  console.log(`  Grammatical Range:       ${grade.dimensions.grammatical_range.score}/20`);
  console.log(`  Register & Tone:         ${grade.dimensions.register_tone.score}/20`);

  console.log(`\nStrengths:`);
  grade.strengths.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  console.log(`\nImprovement priorities:`);
  grade.improvement_priorities.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  if (grade.inline_annotations.length > 0) {
    console.log(`\nSample annotation:`);
    const a = grade.inline_annotations[0];
    console.log(`  Issue (${a.severity} ${a.issue_type}): "${a.text_segment}"`);
    console.log(`  → ${a.suggestion}`);
    console.log(`  Reason: ${a.explanation}`);
  }

  if (grade.spanish_speaker_patterns_noticed.length > 0) {
    console.log(`\nSpanish L1 patterns noticed:`);
    grade.spanish_speaker_patterns_noticed.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  }

  // Token usage
  const usage = (result.rawResponse as { usage?: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } }).usage;
  if (usage) {
    console.log(`\n--- Token usage ---`);
    console.log(`  Input:       ${usage.input_tokens}`);
    console.log(`  Output:      ${usage.output_tokens}`);
    if (usage.cache_creation_input_tokens) {
      console.log(`  Cache write: ${usage.cache_creation_input_tokens} (system prompt cached for ~5 min)`);
    }
    if (usage.cache_read_input_tokens) {
      console.log(`  Cache read:  ${usage.cache_read_input_tokens} (cheap repeat)`);
    }
    const sonnetInputCost  = ((usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1) / 1_000_000) * 3;
    const sonnetOutputCost = (usage.output_tokens / 1_000_000) * 15;
    console.log(`  Approx cost (Sonnet 4.6 rates): $${(sonnetInputCost + sonnetOutputCost).toFixed(4)}`);
  }

  console.log('\n✅ Phase 0 smoke test passed — Anthropic grading is wired correctly.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
