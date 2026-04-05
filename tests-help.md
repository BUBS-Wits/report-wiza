# TESTING
I can't sleep at night because of TDD...

---

## Requirements
There are 2 dependencies for the testing framework I am currently building and expanding on as I work. These dependencies are:
* `jsdom`: Mocks the DOM tree of a web page, allowing frontend unit-testing without a browser.
* `serve`: Hosts the frontend on `localhost` so you can view the changes in the browser.
* `process`: Used to return status signals from scripts.
* `vite`: Builds and/or tests the frontend deployment.

> Note: All dependencies can be found in `requirements.txt`. You can install them by running `setup-requirements.sh`, or `run-tests.sh`, which will check if the dependencies exist in the repo, and install them, before continuing.

---

## Running Tests
Tests are automatically discovered and executed from both the `app` and `packages` directories. Any JavaScript file ending in `.test.js` will be executed and are assumed to be ES Modules and not CommonJS.

You have two options to run tests:
1. Setup First, Then Run:
```
$ ./setup-requirements.sh
$ ./run-tests.sh
```

2. Run Directly:
```
$ ./run-tests.sh
```
> Note: `run-tests.sh` will still try to check if the dependencies exist before continuing with the tests, and execute `setup-requirements.sh` if any are missing.

After the tests finish, you will see:
* Number of passed tests
* Number of failed tests
* Pass rate as a percentage

> Tip: Aim for 100% pass rate


---

## Local Deployment

Once testing is complete, you can deploy the webapp locally. Run:
```
$ ./deploy-local.sh
```
This will start a local server using serve so you can view the application in your browser at localhost.
