// Must come first: dotenv reads `.env` relative to the working directory, and
// the import below leaves the repo for a temp directory.
import 'dotenv/config';
/**
 * Puts each test file in its own real, throwaway project directory. Imported
 * for its side effects — see the module for why this has to happen in a setup
 * file rather than a `beforeEach`.
 */
import './src/__test__/project';
