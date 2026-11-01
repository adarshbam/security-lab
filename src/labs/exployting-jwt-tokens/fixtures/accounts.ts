// Published dummy credentials, not production accounts or password-storage guidance.
export const demoUsers = [
  { username: 'adarsh', role: 'user', password: 'pass123' },
  { username: 'rahul', role: 'admin', password: 'admin@123' },
  { username: 'priya', role: 'admin', password: 'priya123' },
  ...['sneha', 'vikram', 'ananya', 'karan', 'meera', 'arjun', 'divya'].map(username =>
    ({ username, role: 'user', password: 'demo-only' })),
];
