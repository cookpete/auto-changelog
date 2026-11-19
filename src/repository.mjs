import {
	dirname,
	isAbsolute,
	relative,
	sep,
} from 'path';
import {
	lstat,
	readlink,
	realpath,
} from 'fs/promises';
import cmd from './cmd.mjs';

function isInside(root, path) {
	const rel = relative(root, path);
	return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function getRoot() {
	// Outside a git repository, the working directory stands in for it.
	const toplevel = (await cmd('git rev-parse --show-toplevel').catch(() => '')).trim();
	return realpath(toplevel || process.cwd());
}

// A path that doesn't exist yet (like an output file) is placed by its nearest existing
// ancestor, which is where a symlinked directory would send it; a symlink whose target
// doesn't exist yet is followed, since writing to it creates that target. Paths are never
// normalized here, since `link/..` must be resolved through the symlink, as the OS does.
async function realpathOfNearest(path) {
	try {
		return await realpath(path);
	} catch (e) {
		if (e.code === 'ELOOP') {
			throw e;
		}
		const stats = await lstat(path).catch(() => null);
		if (stats && stats.isSymbolicLink()) {
			const target = await readlink(path);
			return realpathOfNearest(isAbsolute(target) ? target : `${dirname(path)}${sep}${target}`);
		}
		return realpathOfNearest(dirname(path));
	}
}

async function isInsideRepository(root, path) {
	return isInside(root, await realpathOfNearest(path));
}

export {
	getRoot,
	isInside,
	isInsideRepository,
};
