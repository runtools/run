import Tool from '../../tool';

export async function initialize(invocation) {
  const tool = await Tool.ensure(process.cwd(), invocation.config);
  console.dir(tool, {depth: 5});
}

initialize.aliases = ['init'];
