# UVW Zetkin Bridge

### Development

- Rename `.envs/.local/.node.example` to `.envs/.local/.node` and complete the file
- `yarn develop:db` to start up a development database
- `yarn migrate` after initial setup to configure the database
- `yarn develop` to start the hot-reloadable node server

### Testing

- `yarn test` to run unit and integration tests.

The test suite will run unit and integration tests. Integration tests will test database and authorisation functionality. Using `aggressivelyRetry()`, the server will attempt to login and store a token through a headless browser. This requires a live development server to be run, for which `DevServer.setup()` is required.

Port `4041` must be clear and you must provide Ngrok.io env variables (see [the example env file](./envs/.local/.node.example)), including a subdomain and region that corresponds to the approved OAuth2 redirect domain for Zetkin dev.

Finally, to avoid unecessary logins which can sometimes disrupt the Zetkin dev server, you can provide a `ZETKIN_ACCESS_TOKEN` env variable. The easiest way to run tests is with the command:

```
ZETKIN_ACCESS_TOKEN=... yarn test
```

When running TDD, it can also be useful to pass mocha args like `--grep ...` to further limit unnecessary resource calls.

### Deployment

- `yarn build` to compile TS to JS
- `yarn start` to run

This repo is configured for Heroku deploys.