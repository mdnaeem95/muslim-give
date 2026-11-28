import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteObject,
  getBytes,
  ref,
  updateMetadata,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';
import { createEnv, storageOf } from './env.js';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearStorage();
});

const asAlice = (): FirebaseStorage => storageOf(env.authenticatedContext('alice'));
const asBob = (): FirebaseStorage => storageOf(env.authenticatedContext('bob'));
const signedOut = (): FirebaseStorage => storageOf(env.unauthenticatedContext());

const RECEIPT = 'users/alice/receipts/receipt-1';
const TEN_MB = 10 * 1024 * 1024;

const file = (bytes: number): Uint8Array => new Uint8Array(bytes);

async function seed(path: string): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(storageOf(context), path), file(10), { contentType: 'image/jpeg' });
  });
}

describe('users/{uid}/receipts/{receiptId}', () => {
  it('lets the owner upload a receipt', async () => {
    await assertSucceeds(
      uploadBytes(ref(asAlice(), RECEIPT), file(100), { contentType: 'image/jpeg' }),
    );
  });

  it('accepts each allowed file type', async () => {
    const types = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'message/rfc822',
      'application/vnd.ms-outlook',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    for (const [index, contentType] of types.entries()) {
      await assertSucceeds(
        uploadBytes(ref(asAlice(), `users/alice/receipts/type-${String(index)}`), file(10), {
          contentType,
        }),
      );
    }
  });

  it('refuses types that are not allowed', async () => {
    for (const contentType of [
      'text/html',
      'application/zip',
      'image/svg+xml',
      'application/x-sh',
    ]) {
      await assertFails(uploadBytes(ref(asAlice(), RECEIPT), file(10), { contentType }));
    }
  });

  it('accepts a file of exactly 10 MB and refuses one byte more', async () => {
    await assertSucceeds(
      uploadBytes(ref(asAlice(), 'users/alice/receipts/at-limit'), file(TEN_MB), {
        contentType: 'application/pdf',
      }),
    );
    await assertFails(
      uploadBytes(ref(asAlice(), 'users/alice/receipts/over-limit'), file(TEN_MB + 1), {
        contentType: 'application/pdf',
      }),
    );
  });

  it('does not let another user or a signed-out visitor upload into it', async () => {
    await assertFails(uploadBytes(ref(asBob(), RECEIPT), file(10), { contentType: 'image/jpeg' }));
    await assertFails(
      uploadBytes(ref(signedOut(), RECEIPT), file(10), { contentType: 'image/jpeg' }),
    );
  });

  it('lets only the owner read it', async () => {
    await seed(RECEIPT);
    await assertSucceeds(getBytes(ref(asAlice(), RECEIPT)));
    await assertFails(getBytes(ref(asBob(), RECEIPT)));
    await assertFails(getBytes(ref(signedOut(), RECEIPT)));
  });

  // The Storage emulator checks every upload as a `create`, so it cannot tell an overwrite from a new
  // file (firebase-tools 15.37.0, storage/files.js). It does check a metadata change as an `update`,
  // so that is what this test uses. `allow update: if false` is also asserted in drift.test.ts, and
  // the real service applies it to overwrites (ADR 018 says how that is checked).
  it('never lets anyone update a receipt', async () => {
    await seed(RECEIPT);
    await assertFails(updateMetadata(ref(asAlice(), RECEIPT), { contentType: 'image/png' }));
    await assertFails(updateMetadata(ref(asBob(), RECEIPT), { contentType: 'image/png' }));
  });

  it('lets only the owner delete it', async () => {
    await seed(RECEIPT);
    await assertFails(deleteObject(ref(asBob(), RECEIPT)));
    await assertFails(deleteObject(ref(signedOut(), RECEIPT)));
    await assertSucceeds(deleteObject(ref(asAlice(), RECEIPT)));
  });

  it('denies every other path, even for the owner', async () => {
    for (const path of [
      'users/alice/photos/one',
      'users/alice/receipts/folder/nested',
      'users/alice/one',
      'public/one',
      'one',
    ]) {
      await assertFails(uploadBytes(ref(asAlice(), path), file(10), { contentType: 'image/jpeg' }));
    }
    await seed('users/alice/photos/two');
    await assertFails(getBytes(ref(asAlice(), 'users/alice/photos/two')));
  });
});
