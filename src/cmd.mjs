import { spawn } from 'child_process';

// Runs a command without a shell. Arguments are separated by whitespace, so none can contain any.
function cmd(string, onProgress) {
	const [command, ...args] = string.trim().split(/\s+/);
	return new Promise((resolve, reject) => {
		const child = spawn(command, args);
		let data = '';
		let errors = '';

		child.stdout.on('data', (buffer) => {
			data += buffer.toString();
			if (onProgress) {
				onProgress(data.length);
			}
		});
		child.stderr.on('data', (buffer) => {
			errors += buffer.toString();
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve(data);
			} else {
				reject(new Error(`\`${string.trim()}\` failed${errors.trim() ? `: ${errors.trim()}` : ` with exit code ${code}`}`));
			}
		});
	});
}

export default cmd;
