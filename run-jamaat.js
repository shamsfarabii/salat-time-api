import { runJamaatCli } from './src/db/cli.js';

const exitCode = runJamaatCli(process.argv.slice(2));
process.exit(exitCode);
