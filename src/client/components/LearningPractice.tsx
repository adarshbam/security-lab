import { useState } from 'react';
import type { ExperimentDefinition } from '../../shared/contracts/lab.js';
import type { ExperimentProgress } from '../../shared/contracts/progress.js';

export function LearningPractice({ experiment, progress, update }: {
  experiment: ExperimentDefinition; progress: ExperimentProgress; update: (changes: Partial<ExperimentProgress>) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewHelp, setReviewHelp] = useState(false);
  const teaching = experiment.teaching;
  if (!teaching) return null;
  const checkPrompt = teaching.check?.prompt || experiment.predictionPrompt;
  const checkOptions = teaching.check?.options || experiment.predictionOptions;
  const reviews = progress.reviewResponses || [];
  const attempts = progress.conceptAttempts || (progress.checkedAnswer ? [progress.checkedAnswer] : []);
  const checkAnswer = () => {
    const attempt = { id: answer, correct: Boolean(checkOptions.find(o => o.id === answer)?.isCorrect), withHelp: revealed || Boolean(progress.explanationViewedAt || progress.referenceViewedAt), at: Date.now() };
    update({ checkedAnswer: attempt, conceptAttempts: [...attempts, attempt].slice(-10) });
  };
  const lastPracticeAt = Math.max(reviews.at(-1)?.at ?? 0, progress.checkedAnswer?.at ?? 0);
  const due = Boolean(lastPracticeAt && Date.now() >= lastPracticeAt + (reviews.length ? 7 : 1) * 86400000);
  return <section className="panel space-y-4" aria-label="Practice and review">
    <details open={Boolean(progress.checkedAnswer || progress.referenceViewedAt) || progress.currentStep === 'learn' || progress.currentStep === 'compare'}>
    <summary>Practice and review · optional after your experiment</summary>
    <h3 className="text-lg font-semibold">Explain and try independently</h3>
    <p>{teaching.question}</p>
    <details onToggle={event => { if (event.currentTarget.open) { setRevealed(true); update({ referenceViewedAt: Date.now() }); } }}><summary>Show the reference explanation</summary>
      <p>{experiment.predictionOptions.find(option => option.isCorrect)?.explanation}</p>
      <p>Compare this reference with your actual evidence. A correct answer alone does not verify your browser investigation.</p>
    </details>
    <fieldset><legend>{checkPrompt}</legend>
      {checkOptions.filter(option => option.id !== 'unsure').map(option => <label className="block" key={option.id}>
        <input type="radio" name={'check-' + experiment.id} checked={answer === option.id} onChange={() => setAnswer(option.id)} /> {option.label}
      </label>)}
    </fieldset>
    <button className="action secondary" disabled={!answer} onClick={checkAnswer}>Check my reasoning</button>
    {progress.checkedAnswer && <p role="status">{progress.checkedAnswer.correct ? 'Correct reasoning.' : 'Revisit your reasoning.'} {checkOptions.find(o => o.id === progress.checkedAnswer?.id)?.explanation} Recorded {progress.checkedAnswer.withHelp ? 'after viewing help' : 'before viewing help'}. This is a concept check, not a mastery score.</p>}
    {!!attempts.length && <details><summary>Recent reasoning attempts ({attempts.length}, last 10 retained)</summary>
      <ol>{attempts.map((attempt, index) => <li key={index}>{checkOptions.find(option => option.id === attempt.id)?.label || 'Earlier answer'} · {attempt.correct ? 'correct' : 'revisit'} · {attempt.withHelp ? 'after help' : 'before help'}</li>)}</ol>
    </details>}
    <h4 className="font-semibold">Try a variation</h4><p>{teaching.challenge}</p>
    <button className="action secondary" onClick={() => update({ challengeAttemptedAt: Date.now() })}>Record that I attempted this variation</button>
    {progress.challengeAttemptedAt && <p role="status">Variation attempt recorded as self-reported.</p>}
    <details><summary>My result differs</summary><p>Check the browser tab and origin, credentials and expiry, and the stated starting conditions. Inspect the actual request and response. Browser privacy controls can change cookie behavior. A CORS error does not establish that a mutation was prevented. Missing evidence means unknown. Refresh the inspector explicitly after external requests.</p></details>
    <h4 className="font-semibold">Review later</h4>
    <p>Return after about one day, then one week. These are adjustable study suggestions, not optimal intervals for everyone. No notifications are sent.</p>
    <p>{due ? 'A review is suggested now.' : 'You can also practice recall now.'} {teaching.review}</p>
    <label className="block">Your explanation (keep credentials out)<textarea className="block w-full bg-slate-950 text-slate-100" rows={3} value={reviewAnswer} onChange={event => setReviewAnswer(event.target.value)} /></label>
    <details onToggle={event => { if (event.currentTarget.open) { setReviewHelp(true); update({ referenceViewedAt: Date.now() }); } }}><summary>Review answer</summary><p>{experiment.predictionOptions.find(o => o.isCorrect)?.explanation}</p></details>
    <button className="action secondary" disabled={!reviewAnswer.trim()} onClick={() => { update({ reviewResponses: [...reviews, { answer: reviewAnswer, at: Date.now(), withHelp: reviewHelp || Boolean(progress.referenceViewedAt || progress.explanationViewedAt) }] }); setReviewAnswer(''); }}>Save my review</button>
    <p aria-live="polite">{reviews.length} review responses saved locally. Free text is not automatically graded.</p>
    </details>
  </section>;
}
