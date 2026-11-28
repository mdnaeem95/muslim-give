import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore';
import { createEnv, firestoreOf } from './env.js';
import { SAMPLES, clientTimestamp, meta, type Doc } from './samples.js';

let env: RulesTestEnvironment;

beforeAll(async () => {
  setLogLevel('error');
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const asAlice = (): Firestore => firestoreOf(env.authenticatedContext('alice'));
const asBob = (): Firestore => firestoreOf(env.authenticatedContext('bob'));
const signedOut = (): Firestore => firestoreOf(env.unauthenticatedContext());

/** Writes a document as the admin SDK would, with the rules switched off. */
async function seed(path: string, data: Doc): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(firestoreOf(context), path), data);
  });
}

const without = (data: Doc, name: string): Doc =>
  Object.fromEntries(Object.entries(data).filter(([key]) => key !== name));

const SYNC_COLUMNS = [
  'id',
  'createdAt',
  'updatedAt',
  '_hlc',
  '_deleted',
  '_deviceId',
  '_schema',
  '_serverUpdatedAt',
];

const OLDER = '0000000000100-0000-device-a';
const NEWER = '0000000000300-0000-device-a';
const NEWEST = '0000000000900-0000-device-a';

for (const [name, sample] of Object.entries(SAMPLES)) {
  const isCollection = !name.startsWith('singletons/');
  const path = `users/alice/${sample.path(sample.id)}`;

  describe(`users/{uid}/${name}`, () => {
    it('lets the owner create a valid record', async () => {
      await assertSucceeds(setDoc(doc(asAlice(), path), sample.make()));
    });

    it('does not let another user or a signed-out visitor create it', async () => {
      await assertFails(setDoc(doc(asBob(), path), sample.make()));
      await assertFails(setDoc(doc(signedOut(), path), sample.make()));
    });

    it('lets only the owner read it', async () => {
      await seed(path, sample.make());
      await assertSucceeds(getDoc(doc(asAlice(), path)));
      await assertFails(getDoc(doc(asBob(), path)));
      await assertFails(getDoc(doc(signedOut(), path)));
    });

    it('never lets a client delete it, not even the owner', async () => {
      await seed(path, sample.make());
      await assertFails(deleteDoc(doc(asAlice(), path)));
      await assertFails(deleteDoc(doc(asBob(), path)));
    });

    it('refuses a field the record does not have', async () => {
      await assertFails(setDoc(doc(asAlice(), path), { ...sample.make(), extra: 'x' }));
    });

    it('refuses a record whose id does not match its path', async () => {
      await assertFails(setDoc(doc(asAlice(), path), { ...sample.make(), id: 'someone-else' }));
      if (isCollection) {
        const elsewhere = `users/alice/${sample.path('another-id')}`;
        await assertFails(setDoc(doc(asAlice(), elsewhere), sample.make()));
      }
    });

    it('refuses a time made up by the phone in place of the server time', async () => {
      await assertFails(
        setDoc(doc(asAlice(), path), { ...sample.make(), _serverUpdatedAt: clientTimestamp }),
      );
    });

    for (const column of SYNC_COLUMNS) {
      it(`refuses a record with no ${column}`, async () => {
        await assertFails(setDoc(doc(asAlice(), path), without(sample.make(), column)));
      });
    }

    for (const [what, patch] of sample.invalid) {
      it(`refuses ${what}`, async () => {
        await assertFails(setDoc(doc(asAlice(), path), { ...sample.make(), ...patch }));
      });
    }

    for (const [what, patch] of sample.valid) {
      it(`accepts ${what}`, async () => {
        await assertSucceeds(setDoc(doc(asAlice(), path), { ...sample.make(), ...patch }));
      });
    }

    it('keeps the newest write: an older or equal clock loses, a newer one wins', async () => {
      await seed(path, sample.make(NEWER));
      await assertFails(setDoc(doc(asAlice(), path), sample.make(OLDER)));
      await assertFails(setDoc(doc(asAlice(), path), sample.make(NEWER)));
      await assertSucceeds(setDoc(doc(asAlice(), path), sample.make(NEWEST)));
    });

    it('accepts a deletion as a newer tombstone', async () => {
      await seed(path, sample.make(OLDER));
      await assertSucceeds(setDoc(doc(asAlice(), path), { ...sample.make(NEWER), _deleted: true }));
    });

    if (isCollection) {
      it('lets the owner list the collection and nobody else', async () => {
        await seed(path, sample.make());
        const listPath = `users/alice/${name}`;
        await assertSucceeds(getDocs(collection(asAlice(), listPath)));
        await assertFails(getDocs(collection(asBob(), listPath)));
        await assertFails(getDocs(collection(signedOut(), listPath)));
      });
    }
  });
}

describe('donations: required fields', () => {
  const sample = SAMPLES.donations;
  const path = 'users/alice/donations/don-1';

  for (const field of ['date', 'amountMinor', 'currency', 'countryCode', 'category', 'source']) {
    it(`refuses a donation with no ${field}`, async () => {
      await assertFails(setDoc(doc(asAlice(), path), without(sample?.make() ?? {}, field)));
    });
  }

  it('accepts a donation that leaves optional fields out', async () => {
    const trimmed = [
      'recipientName',
      'recipientRefId',
      'relationship',
      'relationshipSide',
      'relationshipLine',
      'occasionOther',
      'onBehalfName',
      'note',
      'recurringRuleId',
      'occurrenceMonth',
      'eidPlanId',
      'eidPersonId',
      'eidPacketGroup',
    ].reduce(without, sample?.make() ?? {});
    await assertSucceeds(setDoc(doc(asAlice(), path), trimmed));
  });
});

describe('users/{uid}', () => {
  const userDoc = { schemaVersion: 1, createdAt: '2026-11-28T02:00:00.000Z' };

  it('lets the owner create, update and read their own document', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), 'users/alice'), userDoc));
    await assertSucceeds(
      setDoc(doc(asAlice(), 'users/alice'), { ...userDoc, lastSeenAt: '2026-11-29T02:00:00.000Z' }),
    );
    await assertSucceeds(getDoc(doc(asAlice(), 'users/alice')));
  });

  it('keeps it away from everyone else', async () => {
    await seed('users/alice', userDoc);
    await assertFails(getDoc(doc(asBob(), 'users/alice')));
    await assertFails(getDoc(doc(signedOut(), 'users/alice')));
    await assertFails(setDoc(doc(asBob(), 'users/alice'), userDoc));
    await assertFails(setDoc(doc(signedOut(), 'users/alice'), userDoc));
  });

  it('refuses extra fields and wrong types', async () => {
    await assertFails(setDoc(doc(asAlice(), 'users/alice'), { ...userDoc, email: 'a@b.c' }));
    await assertFails(setDoc(doc(asAlice(), 'users/alice'), { ...userDoc, schemaVersion: '1' }));
    await assertFails(setDoc(doc(asAlice(), 'users/alice'), { createdAt: userDoc.createdAt }));
  });

  it('never lets a client delete it', async () => {
    await seed('users/alice', userDoc);
    await assertFails(deleteDoc(doc(asAlice(), 'users/alice')));
  });

  it('denies a collection or singleton that is not in the schema', async () => {
    await assertFails(setDoc(doc(asAlice(), 'users/alice/secrets/one'), meta('one')));
    await assertFails(setDoc(doc(asAlice(), 'users/alice/singletons/other'), meta('other')));
    await seed('users/alice/secrets/one', { value: 1 });
    await assertFails(getDoc(doc(asAlice(), 'users/alice/secrets/one')));
  });
});

describe('server-managed data', () => {
  const publicPaths = ['reference/mosques-SG', 'officialDates/SG_1448', 'config/app'];

  for (const path of publicPaths) {
    it(`${path}: anyone may read it, nobody on a phone may change it`, async () => {
      await seed(path, { version: 1 });
      await assertSucceeds(getDoc(doc(signedOut(), path)));
      await assertSucceeds(getDoc(doc(asAlice(), path)));
      await assertFails(setDoc(doc(asAlice(), path), { version: 2 }));
      await assertFails(setDoc(doc(signedOut(), path), { version: 2 }));
      await assertFails(deleteDoc(doc(asAlice(), path)));
    });
  }

  it('adminAudit and unknown top-level paths have no client access', async () => {
    await seed('adminAudit/a1', { outcome: 'ok' });
    await seed('anything/a1', { value: 1 });
    await assertFails(getDoc(doc(asAlice(), 'adminAudit/a1')));
    await assertFails(setDoc(doc(asAlice(), 'adminAudit/a2'), { outcome: 'ok' }));
    await assertFails(getDoc(doc(asAlice(), 'anything/a1')));
    await assertFails(setDoc(doc(asAlice(), 'anything/a2'), { value: 1 }));
    await assertFails(getDocs(collection(asAlice(), 'adminAudit')));
  });
});
