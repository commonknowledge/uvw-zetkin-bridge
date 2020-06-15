# UVW Zetkin Bridge

### Development

- Rename `.envs/.local/.node.example` to `.envs/.local/.node` and complete the file
- `yarn develop:db` to start up a development database
- `yarn migrate` after initial setup to configure the database
- `yarn develop` to start the hot-reloadable node server

### Deployment

- `yarn build` to compile TS to JS
- `yarn start` to run

This repo is configured for Heroku deploys.