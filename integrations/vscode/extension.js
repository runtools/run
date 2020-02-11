const {join, dirname} = require('path');
const {readdirSync} = require('fs');
const {execFile} = require('child_process');
const {window, workspace, ProgressLocation} = require('vscode');

const disposables = [];

function activate(_context) {
  const disposable = workspace.onDidSaveTextDocument(handleDidSaveTextDocument);
  disposables.push(disposable);
  // console.info('Run integration activated');
}

function deactivate() {
  for (const disposable of disposables) {
    disposable.dispose();
  }
}

async function handleDidSaveTextDocument({fileName: file}) {
  // console.info('run: handleDidSaveTextDocument() called');

  const directories = findResourceDirectories(dirname(file));
  if (!directories.length) {
    return;
  }

  await window.withProgress(
    {
      location: ProgressLocation.Window,
      title: "run: Broadcasting '@fileModified' event..."
    },
    async progress => {
      for (let index = 0; index < directories.length; index++) {
        const directory = directories[index];

        progress.report({increment: (index / directories.length) * 100});

        try {
          await broadcastFileModifiedEvent(directory, file);
        } catch (err) {
          console.error(err);
          const message = `run: An error occurred while broadcasting '@fileModified' event. ${err.message}`;
          window.showErrorMessage(message);
        }
      }
    }
  );
}

function findResourceDirectories(directory) {
  const directories = [];
  while (true) {
    const files = readdirSync(directory);
    if (files.some(file => file.startsWith('@resource.'))) {
      directories.push(directory);
    }
    const parentDirectory = join(directory, '..');
    if (parentDirectory === directory) {
      break;
    }
    directory = parentDirectory;
  }
  return directories;
}

async function broadcastFileModifiedEvent(directory, file) {
  return new Promise((resolve, reject) => {
    const command = 'run';
    const args = [
      '.',
      '@broadcast',
      '--event=@fileModified',
      '--@stage=dev',
      '--',
      `--file=${file}`,
      '--@quiet'
    ];
    const options = {cwd: directory, timeout: 60 * 1000};
    execFile(command, args, options, (err, stdout, stderr) => {
      if (stdout) {
        console.log(stdout.trim());
      }
      if (err) {
        reject(new Error(stderr));
      } else {
        resolve();
      }
    });
  });
}

exports.activate = activate;
exports.deactivate = deactivate;
