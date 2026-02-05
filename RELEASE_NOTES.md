# Release Notes

## Dependency Hygiene - em-icp-api

### Summary
Reviewed project dependencies, removed unused packages, and aligned tooling dependencies to reduce maintenance overhead while preserving runtime and test behavior.

### Changes
1. Removed unused production dependencies:
- @hmcts/info-provider
- ansi-regex
- engine.io
- follow-redirects
- jsonwebtoken
- jwk-to-pem
- jwt-decode
- lodash
- nanoid
- socket.io
- superagent
- swagger-ui-dist
- ws
- xmlhttprequest-ssl

2. Added missing runtime dependency:
- body-parser (required by app.ts)

3. Moved test-only dependencies to devDependencies:
- chai-http
- socket.io-client

4. Moved types packages to devDependencies:
- @types/config
- @types/cookie-parser
- @types/csurf
- @types/es6-promisify
- @types/express
- @types/helmet
- @types/node
- @types/require-directory
- @types/uuid

5. Removed unused dev dependencies:
- @babel/preset-env
- @typescript-eslint/eslint-plugin-tslint
- babel-loader
- chai-as-promised
- @types/chai-as-promised
- debug
- nock
- pa11y
- sinon-chai
- ts-loader
- tslint

6. Tooling alignment:
- Moved typescript to devDependencies
- Removed typescript-eslint (package) from dependencies
- Aligned @typescript-eslint/eslint-plugin and @typescript-eslint/parser to ^8.7.0
- Added @types/ioredis-mock to satisfy ioredis-mock peer requirement
