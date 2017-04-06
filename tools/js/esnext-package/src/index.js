import {join, resolve, relative, extname} from 'path';
import {copy, readFile, outputFile, emptyDirSync} from 'fs-promise';
import isDirectory from 'is-directory';
import {transform} from 'babel-core';
import {formatPath, throwUserError} from 'run-common';
import JSPackage from '@runtools/js-package';

export class JSESNextPackage extends JSPackage {
  static async load(file, {context} = {}) {
    const pkg = await JSPackage.load.call(this, file, {context});
    context = this.extendContext(context, pkg);
    return pkg;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      sourceDir: this.sourceDir,
      distributionDir: this.distributionDir,
      'transpile.extensions': this['transpile.extensions']
    };
  }

  static extendContext(base, pkg) {
    return {...base, jsESNextPackage: pkg.getResourceFile()};
  }

  async build({files = [], context}) {
    const dir = this.getResourceDir();
    const srcDir = resolve(dir, this.getPropertyValue('sourceDir'));
    const distDir = resolve(dir, this.getPropertyValue('distributionDir'));
    const transpilableExtensions = this.getPropertyValue('transpile.extensions');

    if (!files.length) {
      files = [srcDir];
    }

    const transpilableFiles = [];

    for (const srcFile of files) {
      const relativeFile = relative(srcDir, srcFile);
      if (relativeFile.startsWith('..')) {
        throwUserError(
          `Cannot build a file (${formatPath(srcFile)}) located outside of the source directory (${formatPath(srcDir)})`,
          {context}
        );
      }

      const distFile = join(distDir, relativeFile);

      await copy(srcFile, distFile, {
        preserveTimestamps: true,
        filter: file => {
          const relativeFile = relative(srcDir, file);
          if (isDirectory.sync(file)) {
            const targetDir = join(distDir, relativeFile);
            emptyDirSync(targetDir);
            return true;
          }
          const extension = extname(file);
          if (!transpilableExtensions.includes(extension)) {
            return true;
          }
          transpilableFiles.push(relativeFile);
          return false;
        }
      });
    }

    await this.transpile(srcDir, distDir, transpilableFiles, {context});
  }

  async transpile(srcDir, distDir, files, {_context}) {
    for (const file of files) {
      const srcFile = join(srcDir, file);
      const distFile = join(distDir, file);

      let code = await readFile(srcFile, 'utf8');

      ({code} = transform(code, {
        presets: [
          [
            require.resolve('babel-preset-env'),
            {targets: {node: 6}, loose: true, exclude: ['transform-regenerator']}
          ]
        ],
        plugins: [require.resolve('babel-plugin-transform-object-rest-spread')],
        sourceMaps: 'inline'
      }));

      await outputFile(distFile, code);
    }
  }
}

export default JSESNextPackage;
