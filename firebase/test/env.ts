import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
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

/**
 * The testing package types the context's Firestore and Storage with its own declarations, which
 * the modular `firebase/firestore` and `firebase/storage` functions do not accept as classes. The
 * objects are the modular ones at runtime, so the conversion is made here, once.
 */
export const firestoreOf = (context: RulesTestContext): Firestore =>
  context.firestore() as unknown as Firestore;
export const storageOf = (context: RulesTestContext): FirebaseStorage =>
  context.storage() as unknown as FirebaseStorage;
