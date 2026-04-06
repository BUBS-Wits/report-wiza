# TESTING
I can't sleep at night because of TDD...

---

## Requirements
There are 2 dependencies for the testing framework I am currently building and expanding on as I work. These dependencies are:
* `jsdom`: Mocks the DOM tree of a web page, allowing frontend unit-testing without a browser.
* `serve`: Hosts the frontend on `localhost` so you can view the changes in the browser.
* `process`: Used to return status signals from scripts.
* `vite`: Builds and/or tests the frontend deployment.

> Note: All dependencies can be found in `requirements.txt`. You can install them by running `setup-requirements.sh`, or `run_tests.sh`, which will check if the dependencies exist in the repo, and install them, before continuing.

---

## Local Deployment

You can deploy the webapp locally by run:
```
$ ./deploy_local.sh
```
This will start a local server using serve so you can view the application in your browser at localhost.

---

## Using Framework
The testing framework provides a minimal and flexible API for writing and running JavaScript tests across your `app` and `packages` directories. All tests are automatically discovered by `run_tests.js` if the file ends with `.test.js`.

### Core Functions
| Function                                | Description                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test(name, func)`                      | Registers a test. `name` is a string describing the test. `func` is the test function (can be `async`). Example: `test("adds correctly", () => { assert_equal(1+1, 2) })`. |
| `assert_equal(actual, expected)`        | Throws an error if `actual !== expected`.                                                                                                                                  |
| `assert_not_equal(actual, expected)`    | Throws an error if `actual === expected`.                                                                                                                                  |
| `assert_less_than(actual, expected)`    | Throws an error if `actual >= expected`.                                                                                                                                   |
| `assert_greater_than(actual, expected)` | Throws an error if `actual <= expected`.                                                                                                                                   |
| `assert_true(value)`                    | Throws an error if `value` is falsy.                                                                                                                                       |
| `assert_false(value)`                   | Throws an error if `value` is truthy.                                                                                                                                      |
| `run_tests()`                           | Runs all registered tests and prints a summary. Returns `0` if all tests pass, otherwise `1`. Usually called internally by `run_tests.js`.                                 |

### Example Test File
Create a file named `example.test.js`:

```
import { test, assert_equal, assert_true } from '@bubs-wits/tests';

test("simple addition", () => {
  assert_equal(1 + 1, 2);
});

test("truthy check", () => {
  assert_true(true);
});

test("async fetch", async () => {
  const result = await fetchData();
  assert_equal(result.status, 200);
});
```

---

## Running Tests
Run:
```
$ ./run_tests.sh
```
The framework will:
1. Recursively find all .test.js files in app and packages.
2. Import each test module using ESM dynamic imports.
3. Execute all registered tests.
4. Print a summary with:
	* Number of passed tests
	* Number of failed tests
	* Pass percentage

> Exit code 0 indicates all tests passed; any failures return 1.
