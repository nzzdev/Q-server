# Q Server

**Maintainer**: [Manuel Roth](https://github.com/manuelroth)

**Q** is a system that lets journalists create visual elements for stories. It is developed by [NZZ Editorial Tech](https://twitter.com/NZZEditoTech) and [NZZ Visuals](https://twitter.com/NZZVisuals) and used in the [NZZ](https://www.nzz.ch) newsroom. There is a Demo over here: https://editor.q.tools

This is the server for the Q Toolbox. To make use of Q server you will also need a [Q editor](https://github.com/nzzdev/Q-editor/).

Documentation: https://nzzdev.github.io/Q-server

## Development

### Tests

There is a 100% coverage aim with the tests. Please do not lower the coverage.
The tests use `pouchdb-server` to mock the database and implement a simple mock tool endpoint. This makes e2e testing completely self contained without the need for any external services running. Just do a `npm install` and then `npm run test` and you are good to go. There are e2e tests in `test/e2e-tests.js` and some unit tests in `test/unit-tests.js`.

## License

Copyright (c) 2019 Neue Zürcher Zeitung. All rights reserved.

This software is published under the MIT license.
