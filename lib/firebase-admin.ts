import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace \\n with \n if the key is passed as a string with literal \n characters
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('Firebase Admin Initialized');
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.stack);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
