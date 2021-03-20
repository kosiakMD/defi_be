/* eslint-disable */
const { message, warn, danger } = require("danger");

// Check which files changed
if (danger.git.modified_files.length > 0) {
    const modifiedMD = danger.git.modified_files.join("\n- ");
    message("Changed files in this PR: \n - " + modifiedMD);
}

// Check which files were created
if (danger.git.created_files.length > 0) {
    const createdFiles = danger.git.created_files.join("\n- ");
    message("Created files in this PR: \n - " + createdFiles);
}

// Check for changes to package.json
const packageChanged = danger.git.modified_files.includes("package.json");
// if npm
const packageLockfileChanged = danger.git.modified_files.includes("package-lock.json");
if (packageChanged && !packageLockfileChanged) {
    const message = "Changes were made to package.json, but not to package-lock.json";
    const idea = "Perhaps you need to run `npm install`?";
    warn(`${message} - <i>${idea}</i>`);
}
// if yarn
const yarnLockfileChanged = danger.git.modified_files.includes("yarn.lock");
if (packageChanged && !yarnLockfileChanged) {
    const message = "Changes were made to package.json, but not to yarn.lock";
    const idea = "Perhaps you need to run `yarn install`?";
    warn(`${message} - <i>${idea}</i>`);
}
