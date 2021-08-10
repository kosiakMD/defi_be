/* eslint-disable */
const { message, warn, danger, markdown } = require('danger');

// Check which files changed
if (danger.git.modified_files.length > 0) {
  const modifiedMD = danger.git.modified_files.join('\n- ');
  message('Changed files in this PR: \n - ' + modifiedMD);
}

// Check which files were created
if (danger.git.created_files.length > 0) {
  const createdFiles = danger.git.created_files.join('\n- ');
  message('Created files in this PR: \n - ' + createdFiles);
}

const bigPRThreshold = 1000;
const chars = danger.github.pr.additions + danger.github.pr.deletions;
if (chars > bigPRThreshold) {
  warn(':exclamation: Big PR (' + chars + ')');
  markdown(
    '> (' +
      chars +
      ') : Pull Request size seems relatively large. If Pull Request contains multiple changes, split each into separate PR will helps faster, easier review.',
  );
}

// Check for changes to package.json
const packageLockfileChanged = danger.git.modified_files.includes('package-lock.json');
// if npm
// const packageChanged = danger.git.modified_files.includes('package.json');
// if ((packageChanged && !packageLockfileChanged) || (!packageChanged && packageLockfileChanged)) {
//   const message = 'Files package.json and package-lock.json include different packages';
//   const idea = 'Perhaps you need to run `npm install`?';
//   warn(`${message} - <i>${idea}</i>`);
// }
// if yarn
const yarnLockfileChanged = danger.git.modified_files.includes('yarn.lock');
if (yarnLockfileChanged && !packageLockfileChanged || !yarnLockfileChanged && packageLockfileChanged) {
	const message = 'Changes were made to package.json, but not to yarn.lock';
	const idea = 'Perhaps you need to run `yarn install`?';
	warn(`${message} - <i>${idea}</i>`);
}
