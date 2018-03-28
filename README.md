# Q Server

**Maintainer**: [benib](https://github.com/benib)

__Q__ is a system that lets journalists create visual elements for stories. It is developed by [NZZ Storytelling](https://www.nzz.ch/storytelling) and used in the [NZZ](https://www.nzz.ch) newsroom. There is a Demo over here: https://q-demo.st.nzz.ch

This is the server for the Q Toolbox. To make use of Q server you will also need a [Q editor](https://github.com/nzzdev/Q-editor/).

Documentation: https://nzzdev.github.io/Q-server

## Development
### Tests
There is a 100% coverage aim with the tests. Please do not lower the coverage.
The tests use `pouchdb-server` to mock the database and implement a simple mock tool endpoint. This makes e2e testing completely self contained without the need for any external services running. Just do a `npm install` and then `npm run test` and you are good to go. There are e2e tests in `test/e2e-tests.js` and some unit tests in `test/unit-tests.js`.

## License
Copyright (c) 2017 Neue Zürcher Zeitung. All rights reserved.

This software is published under the MIT license.
