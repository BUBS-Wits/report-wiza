const tests = []

export function assert_equal(actual, expected) {
	if (actual !== expected) {
		throw new Error(`Equal assertion failed: ${actual} !== ${expected}`)
	}
}

export function assert_not_equal(actual, expected) {
	if (actual === expected) {
		throw new Error(`Not equal assertion failed: ${actual} === ${expected}`)
	}
}

export function assert_less_than(actual, expected) {
	if (actual < expected) {
		throw new Error(`Less than assertion failed: ${actual} >= ${expected}`)
	}
}

export function assert_greater_than(actual, expected) {
	if (actual > expected) {
		throw new Error(`Greater than assertion failed: ${actual} <= ${expected}`)
	}
}

export function assert_true(value) {
	if (!value) {
		throw new Error(`True assertion failed: true !== ${Boolean(value)}`)
	}
}

export function assert_false(value) {
	if (value) {
		throw new Error(`True assertion failed: false !== ${Boolean(value)}`)
	}
}

export function test(name, func) {
	tests.push({name, func})
}

export async function run_tests() {
	let passed = 0
	for (const {name, func} of tests) {
		try {
			await func()
			passed++
			console.log(`\u2705 ${name}`)
		} catch (err) {
			console.log(`\u274C ${name}`)
			console.error(`======`)
			console.error(err)
			console.error(`======`)
		}
	}
	const percantage_pass = Math.round((passed / tests.length) * 10000, 2) / 100
	console.log(`Passed Tests: ${passed}`)
	console.log(`Failed Tests: ${tests.length - passed}`)
	console.log(`Percentage Passed: ${percantage_pass}%`)
	return percantage_pass == 100 ? 0 : 1
}
