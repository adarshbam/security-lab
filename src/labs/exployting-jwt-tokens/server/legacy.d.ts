declare module 'jsonwebtoken-2015' {
  const jwt: { verify(token: string, key: string, options?: object): unknown };
  export default jwt;
}
declare module 'jsonwebtoken-2022' {
  const jwt: { verify(token: string, key: string | null, options?: object): unknown };
  export default jwt;
}
