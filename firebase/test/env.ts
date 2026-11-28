import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { firestoreRules, storageRules } from './rules-files.js';

/** A project ID starting with `demo-` never touches a real project. */
export const PROJECT_ID = 'demo-muslim-give';

/** Starts a test environment against the emulators that `firebase emulators:exec` started. */
export function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });
}
