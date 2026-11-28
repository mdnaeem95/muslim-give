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
 * The testing package types the context's Firestore with its own declaration, which the modular
 * `firebase/firestore` functions do not accept as a class. The object is the modular one at
 * runtime, so the conversion is made here, once. Storage needs no cast: its type already matches.
 */
export const firestoreOf = (context: RulesTestContext): Firestore =>
  context.firestore() as unknown as Firestore;
export const storageOf = (context: RulesTestContext): FirebaseStorage => context.storage();
