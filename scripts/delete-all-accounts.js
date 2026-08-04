/**
 * WARNING: THIS SCRIPT IS IRREVERSIBLE.
 * It deletes ALL Firebase Authentication users and ALL Firestore user documents.
 * Only run this if you are absolutely sure you want to wipe everything.
 *
 * Requirements:
 *   npm install firebase-admin
 *
 * Environment variables needed (place in .env or export before running):
 *   FIREBASE_ADMIN_PROJECT_ID - your Firebase project ID (e.g. talkapp55)
 *   FIREBASE_ADMIN_CLIENT_EMAIL - the client_email from your service account JSON
 *   FIREBASE_ADMIN_PRIVATE_KEY - the private_key from your service account JSON (include \n characters)
 *
 * Alternatively, set FIREBASE_ADMIN_CREDENTIAL_PATH to the path of your service account JSON file.
 *
 * To get a service account JSON:
 *   1. Go to Firebase Console > Project Settings > Service Accounts
 *   2. Click "Generate new private key"
 *   3. Save the JSON file securely
 *
 * Usage:
 *   node scripts/delete-all-accounts.js
 *
 * Or with the JSON file:
 *   FIREBASE_ADMIN_CREDENTIAL_PATH=./service-account.json node scripts/delete-all-accounts.js
 */

const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || 'talkapp55';
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const credentialPath = process.env.FIREBASE_ADMIN_CREDENTIAL_PATH;

if (credentialPath) {
  const serviceAccount = require(credentialPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} else if (clientEmail && privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
} else {
  console.error(
    'ERROR: No Firebase Admin credentials found.\n' +
    'Set FIREBASE_ADMIN_CREDENTIAL_PATH to your service account JSON file path,\n' +
    'or set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY environment variables.'
  );
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

async function deleteAllAccounts() {
  // --- Step 1: List all Firebase Auth users ---
  console.log('Fetching all Firebase Auth users...');
  const userRecords = [];
  let pageToken = undefined;

  do {
    const result = await auth.listUsers(1000, pageToken);
    userRecords.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`Found ${userRecords.length} user(s) in Firebase Auth.`);

  // --- Step 2: Delete all Firestore documents from user-related collections ---
  // Common collections that store per-user data
  const userCollections = ['users'];
  let firestoreDeleted = 0;

  for (const collectionName of userCollections) {
    console.log(`Deleting all documents from Firestore collection: ${collectionName}`);
    const snapshot = await db.collection(collectionName).get();
    const batchSize = 400;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      console.log(`  Deleted ${Math.min(i + batchSize, docs.length)}/${docs.length} from ${collectionName}`);
    }
    firestoreDeleted += docs.length;
  }

  // Also check for any other collections that might contain user data
  console.log('Scanning for other collections...');
  const allCollections = await db.listCollections();
  for (const col of allCollections) {
    if (!userCollections.includes(col.id)) {
      console.log(`  Found collection: ${col.id} — scanning for user documents...`);
      const snap = await col.get();
      if (!snap.empty) {
        console.log(`  Collection ${col.id} has ${snap.size} documents. Review manually if needed.`);
      }
    }
  }

  console.log(`Deleted ${firestoreDeleted} Firestore document(s).`);

  // --- Step 3: Delete all Firebase Auth users ---
  console.log('Deleting all Firebase Auth users...');
  const uids = userRecords.map(u => u.uid);

  for (let i = 0; i < uids.length; i += 1000) {
    const chunk = uids.slice(i, i + 1000);
    const result = await auth.deleteUsers(chunk);
    console.log(`  Deleted ${result.successCount} user(s), ${result.failureCount} failure(s)`);
    if (result.errors && result.errors.length > 0) {
      for (const err of result.errors) {
        console.error(`  Error: index ${err.index} — ${err.error.message}`);
      }
    }
  }

  console.log(`\nDone! Deleted ${uids.length} Firebase Auth user(s) and ${firestoreDeleted} Firestore document(s).`);
  console.log('WARNING: This action was irreversible. All user data has been permanently removed.');
}

deleteAllAccounts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  });
