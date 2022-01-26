# Q Server

**Maintainer**: [Franco Gervasi](https://github.com/fgervasi)

**Q** is a system that lets journalists create visual elements for stories. It is developed by [NZZ Editorial Tech](https://twitter.com/NZZEditoTech) and [NZZ Visuals](https://twitter.com/NZZVisuals) and used in the [NZZ](https://www.nzz.ch) newsroom. There is a Demo over here: https://editor.q.tools

This is the server for the Q Toolbox. To make use of Q server you will also need a [Q editor](https://github.com/nzzdev/Q-editor/).

Documentation: https://nzzdev.github.io/Q-server

## Development

```bash
git clone git@github.com:nzzdev/Q-server.git
cd Q-server
nvm use
npm install
```

For testing local changes of Q-server, one can link the local package to the global installation of Q-server:

```bash
cd Q-server
npm link
```

Next, in some other location, the following command will create a symbolic link from globally-installed Q-server to ```node_modules/``` of the current folder.

```bash
cd some-other-location
npm link @nzz/q-server
```

Note: Q-server uses [joi](https://www.npmjs.com/package/joi). If the other location, where you linked the Q-server to, uses joi as well, make sure they have the exact same version.

To unlink, simply install Q-server again globally:

```bash
npm install @nzz/q-server -g
```

### Tests

There is a 100% coverage aim with the tests. Please do not lower the coverage.
The tests use `pouchdb-server` to mock the database and implement a simple mock tool endpoint. This makes e2e testing completely self contained without the need for any external services running. Just do a `npm install` and then `npm run test` and you are good to go. There are e2e tests in `test/e2e-tests.js` and some unit tests in `test/unit-tests.js`.

## License

Copyright (c) 2019 Neue Zürcher Zeitung. All rights reserved.

This software is published under the MIT license.
