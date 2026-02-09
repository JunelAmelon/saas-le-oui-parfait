/**
 * Script de test rapide pour vérifier la connexion client
 * 
 * Ce script teste si un client peut récupérer ses données depuis Firebase
 * 
 * Usage: npx ts-node scripts/test-client-connection.ts
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Configuration Firebase (remplacer par vos valeurs)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Identifiants du client test
const CLIENT_EMAIL = "julie.martin@example.com";
const CLIENT_PASSWORD = "TestClient123";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testClientConnection() {
  console.log('🧪 Test de connexion client...\n');

  try {
    // 1. Connexion avec le compte client
    console.log('📝 Tentative de connexion...');
    const userCredential = await signInWithEmailAndPassword(auth, CLIENT_EMAIL, CLIENT_PASSWORD);
    const user = userCredential.user;
    console.log(`✅ Connecté avec succès !`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}\n`);

    // 2. Récupérer le client depuis Firestore
    console.log('📝 Récupération des données client...');
    const clientsRef = collection(db, 'clients');
    const clientQuery = query(clientsRef, where('client_user_id', '==', user.uid));
    const clientSnapshot = await getDocs(clientQuery);

    if (clientSnapshot.empty) {
      console.log('❌ Aucun client trouvé avec cet UID');
      console.log('⚠️  Vérifier que client_user_id dans Firestore correspond à l\'UID ci-dessus');
      return;
    }

    const clientData = clientSnapshot.docs[0].data();
    console.log('✅ Client trouvé :');
    console.log(`   Nom: ${clientData.name}`);
    console.log(`   Partner: ${clientData.partner}`);
    console.log(`   Client ID: ${clientSnapshot.docs[0].id}\n`);

    // 3. Récupérer l'événement du client
    console.log('📝 Récupération de l\'événement...');
    const eventsRef = collection(db, 'events');
    const eventQuery = query(eventsRef, where('client_id', '==', clientSnapshot.docs[0].id));
    const eventSnapshot = await getDocs(eventQuery);

    if (eventSnapshot.empty) {
      console.log('❌ Aucun événement trouvé pour ce client');
      return;
    }

    const eventData = eventSnapshot.docs[0].data();
    console.log('✅ Événement trouvé :');
    console.log(`   Couple: ${eventData.couple_names}`);
    console.log(`   Date: ${eventData.event_date}`);
    console.log(`   Lieu: ${eventData.location}`);
    console.log(`   Invités: ${eventData.guest_count}`);
    console.log(`   Budget: ${eventData.budget}€\n`);

    // 4. Compter les documents
    console.log('📝 Vérification des collections...');
    const documentsRef = collection(db, 'documents');
    const documentsQuery = query(documentsRef, where('client_id', '==', clientSnapshot.docs[0].id));
    const documentsSnapshot = await getDocs(documentsQuery);
    console.log(`✅ Documents: ${documentsSnapshot.size} trouvés`);

    // 5. Compter la checklist
    const checklistRef = collection(db, 'checklist');
    const checklistQuery = query(checklistRef, where('event_id', '==', eventSnapshot.docs[0].id));
    const checklistSnapshot = await getDocs(checklistQuery);
    const completed = checklistSnapshot.docs.filter(doc => doc.data().completed).length;
    console.log(`✅ Checklist: ${checklistSnapshot.size} tâches (${completed} complétées)`);

    // 6. Compter les paiements
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('client_id', '==', clientSnapshot.docs[0].id));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const paid = paymentsSnapshot.docs.filter(doc => doc.data().status === 'paid').length;
    console.log(`✅ Paiements: ${paymentsSnapshot.size} trouvés (${paid} payés)`);

    // 7. Compter les prestataires
    const vendorsRef = collection(db, 'vendors');
    const vendorsQuery = query(vendorsRef, where('event_ids', 'array-contains', eventSnapshot.docs[0].id));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    console.log(`✅ Prestataires: ${vendorsSnapshot.size} trouvés\n`);

    console.log('🎉 Test réussi ! L\'espace client devrait fonctionner correctement.');
    console.log('\n📋 Résumé:');
    console.log(`   - Client authentifié: ✅`);
    console.log(`   - Données client: ✅`);
    console.log(`   - Événement: ✅`);
    console.log(`   - Documents: ${documentsSnapshot.size > 0 ? '✅' : '❌'}`);
    console.log(`   - Checklist: ${checklistSnapshot.size > 0 ? '✅' : '❌'}`);
    console.log(`   - Paiements: ${paymentsSnapshot.size > 0 ? '✅' : '❌'}`);
    console.log(`   - Prestataires: ${vendorsSnapshot.size > 0 ? '✅' : '❌'}`);

    console.log('\n✅ Vous pouvez maintenant vous connecter à l\'application avec:');
    console.log(`   Email: ${CLIENT_EMAIL}`);
    console.log(`   Password: ${CLIENT_PASSWORD}`);

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n⚠️  Le compte client n\'existe pas dans Firebase Auth');
      console.log('   Créer le compte d\'abord (voir GUIDE_INITIALISATION_FIREBASE.txt)');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n⚠️  Mot de passe incorrect');
    } else if (error.code === 'permission-denied') {
      console.log('\n⚠️  Permission refusée');
      console.log('   Vérifier les règles de sécurité Firestore');
    }
    
    process.exit(1);
  }
}

// Exécuter le test
testClientConnection();
