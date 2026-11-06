import type { ExperimentDefinition, PredictionOption } from '../../../shared/contracts/lab.js';
import { sourceRegion } from '../../../client/source.js';
import { xssManifest } from '../manifest.js';
import documentSource from '../server/document.ts?raw';
import isolatedSource from '../server/isolated.ts?raw';

function choices(correct: string, misconception: string, why: string, correction: string): PredictionOption[] {
  return [
    { id: 'trace', label: correct, isCorrect: true, explanation: why },
    { id: 'misconception', label: misconception, isCorrect: false, explanation: correction },
    { id: 'unsure', label: 'I’m not sure yet.', isCorrect: false, explanation: 'Use the named source, sink, response headers and actual marker counters to decide. Missing evidence means unknown.' },
  ];
}
const lessons = [
  {
    id: 'xss-reflected', question: 'With CSP absent, will the SVG handler execute when search input is rendered as HTML?',
    correct: 'The raw HTML renderer executes it; HTML text encoding keeps it literal.',
    misconception: 'HTTPS or a query-string encoder makes the HTML safe.',
    why: 'HTTPS protects transport. URL encoding is decoded by query parsing. The raw response becomes HTML; the protected response encodes HTML text metacharacters before parsing.',
    correction: 'A URL-safe representation is not HTML-safe output. Inspect the decoded query and raw response: the final HTML context determines the required encoding.',
    example: 'For the legitimate emphasis input, query parsing returns <strong>Fictional release notes</strong>. Raw insertion produces a strong element; encodeText produces &lt;strong&gt; in the response and the browser displays literal angle brackets. Change to the handler input to see why this parser difference matters.',
    trace: 'Query input → Express query decoding → raw HTML text position or encodeText → browser HTML parser.',
    steps: ['Choose SVG event handler, vulnerable rendering and absent CSP. Create a run, then inspect the frame’s document request in Network.', 'Read input in Query String Parameters and locate #output in the response. Compare with Elements, then read state. Repeat with protected rendering and run the legitimate control.'],
    evidence: 'Look for a parsed svg element versus literal text, HTTP 200, and an attacker marker POST versus no attacker POST. A 200 alone does not prove execution.',
    challenge: 'Change only the payload to Script element. Compare server-parsed script execution with the DOM fragment experiment’s inert script insertion.',
    transfer: 'A profile nickname is inserted into a quoted href attribute. Can this HTML text encoder alone validate a URL?',
    transferYes: 'No. Validate allowed URL schemes and use attribute-safe construction or encoding for that context.',
    transferNo: 'Yes. One encoding function secures every parser context.',
    transferWhy: 'HTML text, attribute, URL and JavaScript contexts differ. For links, validate the destination scheme as well as constructing the attribute safely.',
    review: 'From memory, explain why percent-encoding input in a URL does not replace encoding at an HTML text sink.',
  },
  {
    id: 'xss-stored', question: 'Does saving the handler before rendering prevent execution on a later visit?',
    correct: 'No. The vulnerable stored value executes again on a fresh document load.',
    misconception: 'Yes. Database values are trusted because the server saved them.',
    why: 'Persistence changes when the source is read, not whether it is safe. The stored note is inserted raw on every visit; protected HTML text rendering encodes it at output.',
    correction: 'Storage is not a trust boundary. Compare a second document request with the first: the server reads the same saved note without accepting new payload input.',
    example: 'Create a stored run with Legitimate emphasis. The control API saves that catalogue note once in memory. Revisit requests only the run ID; the response obtains the note from stored state. Reset deletes that state, so revisiting returns 404.',
    trace: 'Catalogue note saved by POST /runs → in-memory run.stored → raw HTML or encoded HTML text → browser parser.',
    steps: ['Create a vulnerable stored run with absent CSP. Inspect the shell POST /runs and then the frame document request: the latter carries no note input.', 'Revisit the saved document and read visits and marker state. Compare a protected run, then use Legitimate emphasis with sanitized HTML to verify formatting still works.'],
    evidence: 'Visits should rise on a second load; marker and mutation counters are deliberately capped at one. Persistence is in this local process, not a production database.',
    challenge: 'Create two stored runs, one protected and one vulnerable. Revisit each without creating new runs. Reset and check that both old URLs expire.',
    transfer: 'An admin approved a comment yesterday. Today a different page inserts it into JavaScript source. Is yesterday’s HTML encoding sufficient?',
    transferYes: 'No. Reassess the new sink and avoid interpolating data into JavaScript source.',
    transferNo: 'Yes. Approval and persistence make the value safe everywhere.',
    transferWhy: 'Approval does not change parser context. Keep data out of executable JavaScript; an earlier HTML representation is not a JavaScript encoding contract.',
    review: 'Recall where a stored XSS fix belongs when the same note appears in several different output contexts.',
  },
  {
    id: 'xss-dom', question: 'Can the fragment SVG handler execute even though the document request contains no fragment?',
    correct: 'Yes. Trusted code reads location.hash and passes it to innerHTML.',
    misconception: 'No. If the server never receives the input, it cannot cause XSS.',
    why: 'The source is the browser fragment. The trusted script decodes it, then innerHTML parses it. textContent renders text; the tiny sanitizer reconstructs only allowed formatting nodes without attributes.',
    correction: 'DOM XSS can occur entirely after the response arrives. Inspect location.hash in the frame and the innerHTML assignment in executable source.',
    example: 'Insert the Script element through the fragment. innerHTML creates an inert script element here, so the attacker counter stays zero. That is not a safe sink: switch only to the SVG handler and observe event-driven execution. textContent makes both strings literal.',
    trace: 'location.hash → decodeURIComponent → exact catalogue containment guard → innerHTML, textContent or tiny DOM allowlist.',
    steps: ['Create a DOM run with vulnerable rendering, absent CSP and SVG event handler. Select the isolated frame in Console and compare location.hash with the document request URL in Network.', 'Read the innerHTML implementation, switch to Script element, then text rendering and sanitized HTML. Use Legitimate emphasis to verify strong formatting survives only in the HTML modes.'],
    evidence: 'The fragment is absent from the HTTP request. Elements shows the resulting DOM. Script nodes inserted by innerHTML are inert here, while event handlers can execute.',
    challenge: 'Compare the script element under reflected and DOM input with the same absent policy. Explain the HTML parser versus innerHTML difference without calling innerHTML safe.',
    transfer: 'A product preview intentionally supports bold text. Which approach preserves formatting while narrowing the HTML language?',
    transferYes: 'Use a maintained sanitizer configured for required tags; use textContent when formatting is unnecessary.',
    transferNo: 'Remove only script tags and put the rest into innerHTML.',
    transferWhy: 'Event attributes and other active markup remain after script-tag removal. This lesson’s tiny rebuild only supports b, strong, em and br with no attributes; it is not a general rich-text sanitizer.',
    review: 'Name a source and sink for DOM XSS that never sends the attacker input to the server.',
  },
  {
    id: 'xss-csp', question: 'Will the nonce policy in report-only mode stop a handler while legitimate nonce code still works?',
    correct: 'Report-only observes; enforcement blocks the handler. Legitimate nonce code works in both.',
    misconception: 'Any CSP header prevents XSS, and HttpOnly prevents scripts changing authenticated state.',
    why: 'Report-only records violations without enforcing that policy. The enforced script-src nonce blocks the unnonced handler. HttpOnly hides direct cookie reads but the browser still attaches the session to fetch.',
    correction: 'Read the exact header name and policy. unsafe-inline permits this handler. HttpOnly does not prevent an executing script from issuing authenticated same-origin requests.',
    example: 'Use vulnerable rendering and SVG event handler. Absent and unsafe policies allow the marker. Report-only sends a script-src-attr report yet also allows the marker under its permissive baseline. Enforcement sends a violation report and blocks that marker; Run legitimate code still posts using its nonce-authorized listener.',
    trace: 'Decoded query → vulnerable HTML sink → CSP inline-script check → handler blocked or marker POST; nonce-authorized control is separate.',
    steps: ['Keep rendering vulnerable and run the same handler under absent, unsafe, report-only and enforced policies. In Network inspect the document response headers, not a meta element or the shell headers.', 'Inspect Console CSP messages and /reports requests. Run legitimate code in every document; inspect dummy state and Application cookies. Then enable protected text rendering with enforcement.'],
    evidence: 'Separate a blocked script from a failed request. Compare attacker counter, legitimate counter, authenticated marker POST and actual report disposition. A report can arrive asynchronously; missing reports alone prove nothing.',
    challenge: 'Keep the enforced nonce policy and use Legitimate emphasis with vulnerable rendering. It remains a strong element: CSP did not turn HTML into text. Compare protected rendering.',
    transfer: 'A nonce-authorized script passes attacker-controlled text into an unsafe sink. Does the nonce certify that data is safe?',
    transferYes: 'No. The nonce authorizes code; it does not validate inputs or repair rendering.',
    transferNo: 'Yes. Every value handled by trusted code becomes trusted.',
    transferWhy: 'Trusted code can misuse attacker-controlled data. CSP is an additional execution restriction; safe rendering and validation still have to match the sink.',
    review: 'Recall why HttpOnly and CSP each reduce some consequences of XSS but neither replaces safe rendering.',
  },
];

export const xssExperiments: Record<string, ExperimentDefinition> = Object.fromEntries(lessons.map(lesson => {
  const meta = xssManifest.experiments.find(meta => meta.id === lesson.id)!;
  const startingConditions = ['Use the trusted local HTTPS setup and a browser with JavaScript enabled.', 'Each new run starts with zero marker counters and a separate path-scoped dummy session.', 'Payloads run on attacker.csrf-lab.test:8444, separate from the teaching shell. No real credentials or external targets.'];
  return [lesson.id, {
    ...meta, startingConditions, predictionPrompt: lesson.question,
    predictionOptions: choices(lesson.correct, lesson.misconception, lesson.why, lesson.correction),
    understandMarkdown: lesson.trace,
    learnMarkdown: `${lesson.why}\n\n${lesson.trace}\n\n${lesson.example}\n\nUse HTML text encoding only for HTML text. Prefer safe DOM APIs. Intentional rich HTML needs a maintained sanitizer with a narrow configuration; this lesson rebuilds only b, strong, em and br and discards every attribute.\n\nCSP is defense in depth. A nonce authorizes a particular script, not the data it processes. HttpOnly prevents direct cookie reads, not authenticated requests.\n\n[Reflected search input](#experiment-xss-reflected) · [Stored release notes](#experiment-xss-stored) · [DOM fragment preview](#experiment-xss-dom) · [Nonce policy comparison](#experiment-xss-csp)`,
    codeSnippets: [sourceRegion(documentSource, lesson.id === 'xss-csp' ? 'policy' : lesson.id === 'xss-dom' ? 'dom-sinks' : 'server-sinks', 'Executable rendering or policy comparison'),
      sourceRegion(documentSource, 'html-encoding', 'HTML text encoding implementation'), sourceRegion(isolatedSource, 'bounded-mutation', 'Actual bounded dummy mutation')],
    defenderReplay: 'Change only the renderer, create a new run and repeat the same payload. Run the legitimate control in both. Read state explicitly; no app-generated success verdict substitutes for browser execution evidence.',
    teaching: {
      objective: lesson.question, prerequisites: startingConditions,
      terms: [
        { term: 'Source', meaning: 'Where untrusted input enters: a query, saved note or fragment.' },
        { term: 'Transformation', meaning: 'Decoding, encoding or filtering applied before the sink.' },
        { term: 'Sink', meaning: 'The browser operation that interprets a value as text, markup or code.' },
        { term: 'Nonce', meaning: 'An unpredictable value generated per document and attached only to authorized scripts.' },
      ],
      workedExample: lesson.example,
      steps: lesson.steps.map((action, index) => ({ id: lesson.id + '-' + index, action, evidence: lesson.evidence, hint: 'Select the isolated frame in DevTools. Preserve Network logs, inspect document headers and marker responses, then explicitly refresh the shell state and inspector.' })),
      console: "// Select the isolated lesson frame, not the teaching shell.\n({ origin: location.origin, fragment: location.hash, output: document.querySelector('#output')?.innerHTML, readableCookieNames: document.cookie.split(';').map(v => v.split('=')[0].trim()) })",
      question: lesson.evidence + ' Explain which source, transformation and sink caused your actual observation.',
      challenge: lesson.challenge, review: lesson.review,
      check: { prompt: lesson.transfer, options: choices(lesson.transferYes, lesson.transferNo, lesson.transferWhy, lesson.transferWhy) },
    },
  } satisfies ExperimentDefinition];
}));
