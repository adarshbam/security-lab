import type { ExperimentDefinition, TeachingContent } from '../../../shared/contracts/lab.js';
import { sourceRegion } from '../../../client/source.js';
import source from '../server/engine.ts?raw';
import { injectionManifest } from '../manifest.js';

const content = {
  sql: {
    prompt: 'Will alex\' -- with a wrong password authenticate when both implementations already require strings?',
    correct: 'Concatenation authenticates Alex; parameters treat the entire username as data and find no match.',
    wrong: 'Both reject it because the username and password are strings.',
    feedback: 'A type check accepts this payload because it is a string. Only the concatenated route lets its quote and comment become SQL syntax.',
    example: 'Start with alex and paper-lantern: both implementations return Alex. Change only username to alex\' -- and password to wrong. SQLite closes the username literal and comments out the password predicate in the concatenated statement. The bound statement still searches for the complete supplied username. Verify each result with GET /me; do not infer it from the response color.',
    terms: [{ term: 'SQL literal', meaning: 'A value written inside SQL text, usually within quotes.' }, { term: 'Parameter', meaning: 'A value bound separately from SQL statement syntax.' }],
    question: 'Which exact Network requests demonstrate that the password predicate was bypassed, and which /me response establishes Alex’s identity?',
    challenge: 'Target sam with sam\' --, then try a username containing a lone quote. Compare query errors with a clean no-match response. Finally log in as Sam with the legitimate fixture.',
    review: 'A string-only API concatenates a search term into SELECT text. Explain why rejecting objects is insufficient and describe where the term must be bound.',
    transfer: 'A search endpoint validates that a filter is a string, then concatenates it into SQL. Which change addresses SQL injection?',
    transferCorrect: 'Bind the filter as a parameter while keeping statement syntax fixed.',
    transferWrong: 'Convert the filter to a string again before concatenation.',
    transferFeedback: 'String conversion does not separate data from syntax. Parameter binding does; validation still defines the accepted input shape.',
    learn: 'SQLite parses the concatenated text as one statement. The payload is already a string, so strict types alone do not fix it. Parameterization keeps values separate from statement syntax. Authentication still needs correct credential verification; production passwords require a password hash verifier, not this intentionally simplified plaintext fixture.',
    instruction: 'Load the attack example, then send to the vulnerable implementation. In Network inspect the JSON payload and response. Compare the redacted construction template with the executable source: the supplied comment changes how SQLite parses the concatenated statement. The inspector template does not reproduce the full parsed query.',
  },
  nosql: {
    prompt: 'What happens when username and password are JSON objects containing $ne: ""?',
    correct: 'The vulnerable query matches Alex; the protected route rejects object-valued credentials before evaluation.',
    wrong: 'JSON objects are just text, so both routes search for the literal characters $ne.',
    feedback: 'application/json preserves objects. Mingo interprets $ne as a predicate in a query position. A string containing the same characters is different data.',
    example: 'A legitimate alex/paper-lantern login works in both implementations. Supply {"username":{"$ne":""},"password":{"$ne":""}}. The vulnerable query asks for documents with nonempty fields, so its first matching fictional document is Alex. The protected route requires strings and explicitly creates $eq predicates. It returns 400 for these objects. A failed attack is paired with a legitimate 200 login.',
    terms: [{ term: 'Document query', meaning: 'An object describing predicates used to select stored documents.' }, { term: '$ne', meaning: 'A Mongo-style not-equal predicate, evaluated here by Mingo over local documents.' }],
    question: 'What JSON types arrived, which operators entered the vulnerable query, and what distinguishes protected rejection from a valid query with no match?',
    challenge: 'Keep username as the string sam and change only password to {"$ne":""}. Then send the same operator characters as a JSON string. Explain the difference, and finish with Sam’s legitimate login.',
    review: 'An API accepts a JSON object where an email string was expected and places it in a document query. Explain the trust boundary and two complementary protections.',
    transfer: 'A profile search accepts a caller-supplied email field. How should the server build its exact-match document query?',
    transferCorrect: 'Require an email string and construct the equality predicate on the server.',
    transferWrong: 'Spread the caller’s object into the query because JSON has no executable code.',
    transferFeedback: 'A query object carries operator semantics even without executable JavaScript. Validation and explicit equality construction control those semantics.',
    learn: 'This is a real in-memory Mongo-style query evaluator, not a MongoDB server. Only string equality and $eq/$ne string operands are enabled in this bounded lesson. No $where, scripts, regular expressions or arbitrary operators are accepted. Rejecting object-shaped credential fields and constructing equality queries are separate from verifying the credential and creating an authenticated session.',
    instruction: 'Load the attack example and send it once to each implementation. In Network → Payload verify that each field is an object, not a quoted JSON string. Compare the operator keys in the redacted query and the 200 versus 400 decisions.',
  },
  coercion: {
    prompt: 'The fictional pin-demo account stores the string "0". Will JSON false satisfy its password comparison?',
    correct: 'JavaScript loose equality accepts false == "0"; the protected route rejects the boolean type.',
    wrong: 'A boolean is never equal to a string, even with JavaScript ==.',
    feedback: 'JavaScript abstract equality converts false and the string "0" to numeric zero in this comparison. Strict equality does not perform that conversion.',
    example: 'First send {"username":"pin-demo","password":"0"}; both implementations authenticate the fictional PIN account. Replace only the password value with the boolean false. The vulnerable JavaScript comparison accepts it. The protected route requires a nonempty string and returns 400. This is coercion in application code, not a SQL query, a PHP magic hash or a database operator.',
    terms: [{ term: 'Coercion', meaning: 'An implicit conversion between types during evaluation.' }, { term: 'Strict equality', meaning: 'JavaScript === compares without the cross-type conversions of ==.' }],
    question: 'Which request type produced which comparison result, and did a fresh /me confirm the PIN identity or a previous session?',
    challenge: 'Try numeric 0, the string "false", and an empty array separately. Predict the JavaScript comparisons, inspect actual results, then restore the legitimate string "0" control.',
    review: 'Explain why replacing == with === addresses this comparison but does not repair a separate endpoint that concatenates strings into SQL.',
    transfer: 'A developer replaces == with === in a PIN comparison but still concatenates a string username into SQL elsewhere. Which claim is justified?',
    transferCorrect: 'The comparison avoids cross-type coercion; the SQL endpoint still needs parameterization.',
    transferWrong: 'Strict equality makes every credential path injection-safe.',
    transferFeedback: 'Equality semantics protect this comparison. SQL parsing is a different mechanism and still needs separation of query syntax and values.',
    learn: 'The result depends on JavaScript equality semantics and the stored string "0". It does not generalize to every language or password. Validation defines the allowed input domain; strict equality avoids coercion; parameterization controls SQL syntax; explicit query construction controls document operators; authentication establishes an identity. These controls solve different problems.',
    instruction: 'Load the attack example and send the boolean false to each implementation. Inspect Content-Type, the unquoted boolean in Payload, the returned types and the fresh /me response. Compare with a quoted string control.',
  },
};

export const injectionExperiments: Record<string, ExperimentDefinition> = Object.fromEntries(injectionManifest.experiments.map(meta => {
  const engine = meta.id.replace('injection-', '') as keyof typeof content;
  const item = content[engine];
  const teaching: TeachingContent = {
    check: { prompt: item.transfer, options: [
      { id: 'transfer-correct', label: item.transferCorrect, isCorrect: true, explanation: item.transferFeedback },
      { id: 'transfer-misconception', label: item.transferWrong, isCorrect: false, explanation: item.transferFeedback },
    ] },
    objective: item.prompt,
    prerequisites: ['Reset this lab with the header control to revoke only its sessions.', 'Use the local app tab and only the provided fictional credentials. Keep credential values out of notes.', 'Open DevTools → Network and filter /api/labs/injection-attacks/. Browser payloads contain your local input; the app inspector redacts credential values.'],
    terms: [...item.terms, { term: 'Positive control', meaning: 'A legitimate request expected to work, used to check that the endpoint is functioning.' }, { term: 'Authenticated identity', meaning: 'The fictional account returned by a fresh server-side session lookup, not merely a successful HTTP status.' }],
    workedExample: item.example,
    steps: [
      { id: meta.id + '-control', action: 'Load the legitimate example. Send it to each implementation separately. Locate each POST /login and following GET /me in Network.', evidence: 'Expect a functioning login to identify the fixture account. If not observed, stop and check the local server rather than assuming the attack failed.', hint: 'The page automatically sends GET /me after every login response. It does not run the attack twice or change your selected implementation.' },
      { id: meta.id + '-attack', action: item.instruction, evidence: item.question, hint: 'Inspect Headers → Content-Type and Payload. Compare actual types, status, redacted queryStructure and actor. A 400 validation rejection differs from a 401 no-match.' },
      { id: meta.id + '-state', action: 'Use Check current identity for another GET /me. Record the implementation, request types, server decision and identity. Change one input for the independent variation.', evidence: 'A failed evaluated login revokes that scope’s earlier session. Other engine/implementation sessions remain separate.', hint: 'Switching the selector only changes the next request target. Historic responses remain labelled with their original implementation. Refresh the inspector explicitly after manual requests.' },
    ],
    question: item.question, challenge: item.challenge, review: item.review,
  };
  return [meta.id, { ...meta, startingConditions: teaching.prerequisites, understandMarkdown: '### One question\n' + item.prompt + '\n\n' + item.learn,
    predictionPrompt: item.prompt, predictionOptions: [
      { id: 'mechanism', label: item.correct, isCorrect: true, explanation: item.learn },
      { id: 'misconception', label: item.wrong, isCorrect: false, explanation: item.feedback },
      { id: 'unsure', label: 'I’m not sure yet.', isCorrect: false, explanation: 'Record uncertainty, then use Network and a fresh identity check to construct an explanation.' },
    ], teaching, learnMarkdown: '### Explain the boundary\n' + item.learn + '\n\n### Worked example\n' + item.example,
    codeSnippets: [sourceRegion(source, engine + '-login', 'Executable ' + engine + ' login pair')],
    defenderReplay: 'Select Protected and send the same local input, then use the legitimate example as a positive control. The selector chooses an existing executable implementation. It does not edit source. Compare request types, query structure, response and GET /me. All identities and credentials are fictional.',
  }];
}));

