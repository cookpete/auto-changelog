const PREFIX = 'auto-changelog: ';

// The lines auto-changelog wrote to stderr while `fn` ran, without its prefix
// or the escape codes that clear the progress line.
async function captureStderr(t, fn) {
	const stderr = t.capture(process.stderr, 'write');
	try {
		const result = await fn();
		const lines = stderr()
			.map((call) => call.args[0])
			.filter((chunk) => typeof chunk === 'string' && chunk.startsWith(PREFIX))
			.map((chunk) => chunk.slice(PREFIX.length).replace(/\n$/, ''));
		return { result, lines };
	} finally {
		stderr.restore?.();
	}
}

export { captureStderr };
