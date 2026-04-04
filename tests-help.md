# TESTING
I can't sleep at night because of TDD...

---

## Requirements
There are 2 dependencies for the testing framework I am currently building and expanding on as I work. These dependencies are:
* `jsdom`: Mocks the DOM tree of a web page, allowing you to quickly and abstractly create DOM elements for frontend unit-testing.
* `serve`: Hosts the frontend on `localhost` so you can see the results of your changes. This is required because `packages/shared/constants.js` uses ES Modules to allow loading into `app/frontend/service_request.js`, but module.exports (along with require) are CommonJS which don't work in the native browser.

> Note: All dependencies can be found in `requirements.txt`. You can install them by running `setup-requirements.sh`, or `run-tests.sh` directly which will check if the dependencies exist in the repo before continuing.

---

## Running Tests
You can run the tests by either first running `setup-requirements.sh` then `run-tests.sh` or by running `run-tests.sh` initially. It will recursively look through `app` and `packages` for any `.js` scripts ending in `.test.js` and run the tests located within them.
You have two options to run tests:
1. Setup First, Then Run:
```
$ ./setup-requirements.sh
$ ./run-tests.sh
```

1. Run Directly:
```
$ ./run-tests.sh
```

> Note: `run-tests.sh` will still try to check if the dependencies exist before continuing with the tests, and execute `setup-requirements.sh` if any are missing.

At the end you will see:
* Number of passed tests
* Number of failed tests
* Pass rate as a percentage

> Tip: Aim for 100% pass rate
