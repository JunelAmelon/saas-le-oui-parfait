/**
 * SEEDER ADAPTÉ AUX COLLECTIONS EXISTANTES
 * 
 * Ce script utilise vos collections existantes:
 * - clients
 * - events
 * - documents
 * - tasks (comme checklist)
 * - invoices (comme payments)
 * - vendors
 * 
 * INSTRUCTIONS:
 * 1. Copier votre configuration Firebase depuis lib/firebase.ts
 * 2. Remplacer YOUR_PLANNER_UID par votre UID
 * 3. Créer un compte client dans Firebase Auth et copier son UID
 * 4. Exécuter: npx ts-node scripts/seed-existing-collections.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// ⚠️ REMPLACER PAR VOTRE CONFIGURATION FIREBASE
// Vous pouvez la copier depuis lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyAjMELZfAXIcEKIVQmhXJvfQYQNhPXqbPE",
  authDomain: "saas-le-oui-parfait.firebaseapp.com",
  projectId: "saas-le-oui-parfait",
  storageBucket: "saas-le-oui-parfait.firebasestorage.app",
  messagingSenderId: "1050817467933",
  appId: "1:1050817467933:web:a1d6b4e6a3f6c8e9d4f5a6"
};

// ⚠️ REMPLACER CES UIDs
const PLANNER_UID = "YOUR_PLANNER_UID"; // Votre UID de planner
const CLIENT_AUTH_UID = "CLIENT_AUTH_UID"; // UID du client créé dans Firebase Auth

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedExistingCollections() {
  console.log('🚀 Début du seed avec vos collections existantes...\n');

  try {
    // 1. Créer un client de test
    console.log('📝 Création du client test...');
    const clientId = 'client-test-' + Date.now();
    const clientData = {
      planner_id: PLANNER_UID,
      client_user_id: CLIENT_AUTH_UID,
      name: 'Julie Martin',
      partner: 'Frédérick Dubois',
      email: 'julie.martin@example.com',
      phone: '+33 6 12 34 56 78',
      created_at: Timestamp.now()
    };
    await setDoc(doc(db, 'clients', clientId), clientData);
    console.log(`✅ Client créé: ${clientId}\n`);

    // 2. Créer un événement
    console.log('📝 Création de l\'événement...');
    const eventId = 'event-test-' + Date.now();
    const eventData = {
      client_id: clientId,
      planner_id: PLANNER_UID,
      couple_names: 'Julie & Frédérick',
      event_date: '2024-08-23',
      location: 'Château d\'Apigné, Rennes',
      guest_count: 150,
      budget: 25000,
      theme: {
        style: 'Champêtre chic',
        colors: ['#E8D5B7', '#7BA89D', '#C4A26A', '#FFFFFF'],
        description: 'Un mariage élégant aux tons naturels'
      },
      notes: 'Cérémonie laïque dans le parc du château',
      client_email: 'julie.martin@example.com',
      created_at: Timestamp.now()
    };
    await setDoc(doc(db, 'events', eventId), eventData);
    console.log(`✅ Événement créé: ${eventId}\n`);

    // 3. Créer des documents
    console.log('📝 Création des documents...');
    const documents = [
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        name: 'Contrat de prestation Wedding Planner',
        type: 'contrat',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 245000,
        status: 'signed',
        date: '20/01/2024',
        uploaded_at: '20/01/2024',
        created_timestamp: Timestamp.now()
      },
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        name: 'Devis traiteur - Menu Prestige',
        type: 'devis',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 180000,
        status: 'accepted',
        date: '22/01/2024',
        uploaded_at: '22/01/2024',
        created_timestamp: Timestamp.now()
      },
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        name: 'Facture acompte - Château d\'Apigné',
        type: 'facture',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 120000,
        status: 'paid',
        date: '25/01/2024',
        uploaded_at: '25/01/2024',
        created_timestamp: Timestamp.now()
      }
    ];

    for (let i = 0; i < documents.length; i++) {
      const docId = `doc-test-${Date.now()}-${i}`;
      await setDoc(doc(db, 'documents', docId), documents[i]);
    }
    console.log(`✅ ${documents.length} documents créés\n`);

    // 4. Créer des tâches (checklist)
    console.log('📝 Création des tâches (checklist)...');
    const tasks = [
      {
        event_id: eventId,
        client_id: clientId,
        planner_id: PLANNER_UID,
        title: 'Réserver le lieu de réception',
        description: 'Confirmer la réservation du Château d\'Apigné',
        deadline: '2024-01-15',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Lieu & Réception',
        priority: 'high',
        created_at: Timestamp.now()
      },
      {
        event_id: eventId,
        client_id: clientId,
        planner_id: PLANNER_UID,
        title: 'Choisir et réserver le traiteur',
        description: 'Dégustation et signature du contrat',
        deadline: '2024-01-22',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Traiteur & Boissons',
        priority: 'high',
        created_at: Timestamp.now()
      },
      {
        event_id: eventId,
        client_id: clientId,
        planner_id: PLANNER_UID,
        title: 'Choisir la robe de mariée',
        description: 'Rendez-vous boutique Marie & Nous',
        deadline: '2024-03-01',
        completed: false,
        category: 'Tenue des mariés',
        priority: 'high',
        created_at: Timestamp.now()
      },
      {
        event_id: eventId,
        client_id: clientId,
        planner_id: PLANNER_UID,
        title: 'Commander les faire-part',
        description: 'Finaliser design et passer commande',
        deadline: '2024-03-15',
        completed: false,
        category: 'Invitations',
        priority: 'medium',
        created_at: Timestamp.now()
      },
      {
        event_id: eventId,
        client_id: clientId,
        planner_id: PLANNER_UID,
        title: 'Réserver le photographe',
        description: 'Studio Photo Lumière confirmé',
        deadline: '2024-02-05',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Photographie & Vidéo',
        priority: 'high',
        created_at: Timestamp.now()
      }
    ];

    for (let i = 0; i < tasks.length; i++) {
      const taskId = `task-test-${Date.now()}-${i}`;
      await setDoc(doc(db, 'tasks', taskId), tasks[i]);
    }
    console.log(`✅ ${tasks.length} tâches créées\n`);

    // 5. Créer des factures (invoices)
    console.log('📝 Création des factures...');
    const invoices = [
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        invoice_number: 'FAC-2024-001',
        description: 'Acompte Château d\'Apigné',
        vendor: 'Château d\'Apigné',
        amount: 5000,
        status: 'paid',
        method: 'Virement',
        date: '25/01/2024',
        due_date: '25/01/2024',
        paid_date: '25/01/2024',
        created_at: Timestamp.now()
      },
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        invoice_number: 'FAC-2024-002',
        description: 'Acompte traiteur - 30%',
        vendor: 'Traiteur Le Gourmet',
        amount: 3500,
        status: 'paid',
        method: 'Carte bancaire',
        date: '30/01/2024',
        due_date: '30/01/2024',
        paid_date: '30/01/2024',
        created_at: Timestamp.now()
      },
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        invoice_number: 'FAC-2024-003',
        description: 'Acompte photographe',
        vendor: 'Studio Photo Lumière',
        amount: 1500,
        status: 'paid',
        method: 'Virement',
        date: '05/02/2024',
        due_date: '05/02/2024',
        paid_date: '05/02/2024',
        created_at: Timestamp.now()
      },
      {
        client_id: clientId,
        planner_id: PLANNER_UID,
        event_id: eventId,
        invoice_number: 'FAC-2024-004',
        description: 'Acompte fleuriste - 50%',
        vendor: 'Atelier Floral',
        amount: 1500,
        status: 'pending',
        method: '',
        date: '01/02/2024',
        due_date: '28/02/2024',
        created_at: Timestamp.now()
      }
    ];

    for (let i = 0; i < invoices.length; i++) {
      const invoiceId = `invoice-test-${Date.now()}-${i}`;
      await setDoc(doc(db, 'invoices', invoiceId), invoices[i]);
    }
    console.log(`✅ ${invoices.length} factures créées\n`);

    // 6. Créer des prestataires (vendors)
    console.log('📝 Création des prestataires...');
    const vendors = [
      {
        name: 'Château d\'Apigné',
        category: 'Lieu de réception',
        contact: 'Marie Dupont',
        phone: '02 99 14 80 66',
        email: 'contact@chateau-apigne.fr',
        address: '35650 Le Rheu, Rennes',
        website: 'www.chateau-apigne.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: [eventId],
        next_appointment: {
          date: '10/04/2024',
          time: '15:00',
          description: 'Visite finale du lieu'
        },
        created_at: Timestamp.now()
      },
      {
        name: 'Traiteur Le Gourmet',
        category: 'Traiteur',
        contact: 'Pierre Martin',
        phone: '02 99 45 23 12',
        email: 'contact@legourmet.fr',
        address: 'Rennes',
        website: 'www.traiteur-legourmet.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: [eventId],
        next_appointment: {
          date: '15/03/2024',
          time: '19:00',
          description: 'Dégustation menu final'
        },
        created_at: Timestamp.now()
      },
      {
        name: 'Studio Photo Lumière',
        category: 'Photographe',
        contact: 'Sophie Bernard',
        phone: '06 12 34 56 78',
        email: 'sophie@studiolumiere.fr',
        address: 'Rennes',
        website: 'www.studio-lumiere.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: [eventId],
        created_at: Timestamp.now()
      }
    ];

    for (let i = 0; i < vendors.length; i++) {
      const vendorId = `vendor-test-${Date.now()}-${i}`;
      await setDoc(doc(db, 'vendors', vendorId), vendors[i]);
    }
    console.log(`✅ ${vendors.length} prestataires créés\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 Seed terminé avec succès !');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Résumé des données créées:');
    console.log(`   ✅ 1 client: ${clientId}`);
    console.log(`   ✅ 1 événement: ${eventId}`);
    console.log(`   ✅ ${documents.length} documents`);
    console.log(`   ✅ ${tasks.length} tâches (checklist)`);
    console.log(`   ✅ ${invoices.length} factures`);
    console.log(`   ✅ ${vendors.length} prestataires`);
    console.log('\n📝 IMPORTANT - Notez ces informations:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Client Email: julie.martin@example.com`);
    console.log('\n🔐 Pour tester l\'espace client:');
    console.log('   1. Créer un compte Firebase Auth avec:');
    console.log('      Email: julie.martin@example.com');
    console.log('      Password: TestClient123');
    console.log('      Custom claim: { "role": "client" }');
    console.log(`   2. Mettre l'UID généré dans client_user_id du client ${clientId}`);
    console.log('   3. Se connecter à l\'application');
    console.log('\n✅ Vous pouvez maintenant tester l\'espace client !');

  } catch (error: any) {
    console.error('❌ Erreur lors du seed:', error);
    console.error('\n💡 Vérifications:');
    console.error('   - Configuration Firebase correcte ?');
    console.error('   - PLANNER_UID remplacé ?');
    console.error('   - Règles Firestore configurées ?');
    process.exit(1);
  }
}

// Exécuter le seed
seedExistingCollections();
