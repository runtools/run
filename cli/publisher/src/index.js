import {join} from 'path';

export default Resource => ({
  async run(_input, environment) {
    const root = this.$getRoot();

    await root.macOSPacker.run(undefined, environment);
    await root.linuxPacker.run(undefined, environment);

    const installWebsite = await Resource.$load(join(root.$getCurrentDirectory(), '..', 'install'));

    await installWebsite.addRelease(
      {
        version: root.version,
        macOSExecutable: join(root.$getCurrentDirectory(), root.macOSPacker.output),
        linuxExecutable: join(root.$getCurrentDirectory(), root.linuxPacker.output)
      },
      environment
    );

    await installWebsite.deploy(undefined, environment);
  }
});
