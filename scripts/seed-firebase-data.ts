/**
 * Script pour initialiser les données de test Firebase
 * 
 * INSTRUCTIONS:
 * 1. Remplacer YOUR_PLANNER_UID par votre UID planner
 * 2. Remplacer CLIENT_AUTH_UID par l'UID du client créé dans Firebase Auth
 * 3. Exécuter: npx ts-node scripts/seed-firebase-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Configuration Firebase (remplacer par vos valeurs)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// IDs à remplacer
const PLANNER_UID = "YOUR_PLANNER_UID"; // Remplacer par votre UID
const CLIENT_AUTH_UID = "CLIENT_AUTH_UID"; // UID du client créé dans Auth

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  console.log('🚀 Début du seed des données Firebase...\n');

  try {
    // 1. Créer un client
    console.log('📝 Création du client...');
    const clientData = {
      id: 'client-test-1',
      planner_id: PLANNER_UID,
      client_user_id: CLIENT_AUTH_UID,
      name: 'Julie Martin',
      partner: 'Frédérick Dubois',
      email: 'julie.martin@example.com',
      phone: '+33 6 12 34 56 78',
      created_at: Timestamp.now()
    };
    await setDoc(doc(db, 'clients', 'client-test-1'), clientData);
    console.log('✅ Client créé\n');

    // 2. Créer un événement
    console.log('📝 Création de l\'événement...');
    const eventData = {
      id: 'event-test-1',
      client_id: 'client-test-1',
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
      created_at: Timestamp.now()
    };
    await setDoc(doc(db, 'events', 'event-test-1'), eventData);
    console.log('✅ Événement créé\n');

    // 3. Créer des documents
    console.log('📝 Création des documents...');
    const documents = [
      {
        id: 'doc-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        name: 'Contrat de prestation Wedding Planner',
        type: 'contrat',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 245000,
        status: 'signed',
        date: '20/01/2024',
        created_timestamp: Timestamp.now()
      },
      {
        id: 'doc-2',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        name: 'Devis traiteur - Menu Prestige',
        type: 'devis',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 180000,
        status: 'accepted',
        date: '22/01/2024',
        created_timestamp: Timestamp.now()
      },
      {
        id: 'doc-3',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        name: 'Facture acompte - Château d\'Apigné',
        type: 'facture',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        file_size: 120000,
        status: 'paid',
        date: '25/01/2024',
        created_timestamp: Timestamp.now()
      }
    ];

    for (const document of documents) {
      await setDoc(doc(db, 'documents', document.id), document);
    }
    console.log(`✅ ${documents.length} documents créés\n`);

    // 4. Créer la checklist
    console.log('📝 Création de la checklist...');
    const checklistItems = [
      {
        id: 'task-1',
        event_id: 'event-test-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        title: 'Réserver le lieu de réception',
        description: 'Confirmer la réservation du Château d\'Apigné',
        deadline: '2024-01-15',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Lieu & Réception',
        priority: 'high'
      },
      {
        id: 'task-2',
        event_id: 'event-test-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        title: 'Choisir et réserver le traiteur',
        description: 'Dégustation et signature du contrat',
        deadline: '2024-01-22',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Traiteur & Boissons',
        priority: 'high'
      },
      {
        id: 'task-3',
        event_id: 'event-test-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        title: 'Choisir la robe de mariée',
        description: 'Rendez-vous boutique Marie & Nous',
        deadline: '2024-03-01',
        completed: false,
        category: 'Tenue des mariés',
        priority: 'high'
      },
      {
        id: 'task-4',
        event_id: 'event-test-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        title: 'Commander les faire-part',
        description: 'Finaliser design et passer commande',
        deadline: '2024-03-15',
        completed: false,
        category: 'Invitations',
        priority: 'medium'
      },
      {
        id: 'task-5',
        event_id: 'event-test-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        title: 'Réserver le photographe',
        description: 'Studio Photo Lumière confirmé',
        deadline: '2024-02-05',
        completed: true,
        completed_at: Timestamp.now(),
        category: 'Photographie & Vidéo',
        priority: 'high'
      }
    ];

    for (const item of checklistItems) {
      await setDoc(doc(db, 'checklist', item.id), item);
    }
    console.log(`✅ ${checklistItems.length} tâches checklist créées\n`);

    // 5. Créer les paiements
    console.log('📝 Création des paiements...');
    const payments = [
      {
        id: 'payment-1',
        client_id: 'client-test-1',
        invoice_id: 'inv-1',
        description: 'Acompte Château d\'Apigné',
        vendor: 'Château d\'Apigné',
        amount: 5000,
        status: 'paid',
        method: 'Virement',
        date: '25/01/2024',
        created_at: Timestamp.now()
      },
      {
        id: 'payment-2',
        client_id: 'client-test-1',
        invoice_id: 'inv-2',
        description: 'Acompte traiteur - 30%',
        vendor: 'Traiteur Le Gourmet',
        amount: 3500,
        status: 'paid',
        method: 'Carte bancaire',
        date: '30/01/2024',
        created_at: Timestamp.now()
      },
      {
        id: 'payment-3',
        client_id: 'client-test-1',
        invoice_id: 'inv-3',
        description: 'Acompte photographe',
        vendor: 'Studio Photo Lumière',
        amount: 1500,
        status: 'paid',
        method: 'Virement',
        date: '05/02/2024',
        created_at: Timestamp.now()
      },
      {
        id: 'payment-4',
        client_id: 'client-test-1',
        description: 'Acompte fleuriste - 50%',
        vendor: 'Atelier Floral',
        amount: 1500,
        status: 'pending',
        method: '',
        due_date: '28/02/2024',
        created_at: Timestamp.now()
      }
    ];

    for (const payment of payments) {
      await setDoc(doc(db, 'payments', payment.id), payment);
    }
    console.log(`✅ ${payments.length} paiements créés\n`);

    // 6. Créer les factures
    console.log('📝 Création des factures...');
    const invoices = [
      {
        id: 'inv-1',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        invoice_number: 'FAC-2024-001',
        amount: 5000,
        status: 'paid',
        created_at: Timestamp.now()
      },
      {
        id: 'inv-2',
        client_id: 'client-test-1',
        planner_id: PLANNER_UID,
        invoice_number: 'FAC-2024-002',
        amount: 3500,
        status: 'paid',
        created_at: Timestamp.now()
      }
    ];

    for (const invoice of invoices) {
      await setDoc(doc(db, 'invoices', invoice.id), invoice);
    }
    console.log(`✅ ${invoices.length} factures créées\n`);

    // 7. Créer les prestataires
    console.log('📝 Création des prestataires...');
    const vendors = [
      {
        id: 'vendor-1',
        name: 'Château d\'Apigné',
        category: 'Lieu de réception',
        contact: 'Marie Dupont',
        phone: '02 99 14 80 66',
        email: 'contact@chateau-apigne.fr',
        address: '35650 Le Rheu, Rennes',
        website: 'www.chateau-apigne.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: ['event-test-1'],
        next_appointment: {
          date: '10/04/2024',
          time: '15:00',
          description: 'Visite finale du lieu'
        }
      },
      {
        id: 'vendor-2',
        name: 'Traiteur Le Gourmet',
        category: 'Traiteur',
        contact: 'Pierre Martin',
        phone: '02 99 45 23 12',
        email: 'contact@legourmet.fr',
        address: 'Rennes',
        website: 'www.traiteur-legourmet.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: ['event-test-1'],
        next_appointment: {
          date: '15/03/2024',
          time: '19:00',
          description: 'Dégustation menu final'
        }
      },
      {
        id: 'vendor-3',
        name: 'Studio Photo Lumière',
        category: 'Photographe',
        contact: 'Sophie Bernard',
        phone: '06 12 34 56 78',
        email: 'sophie@studiolumiere.fr',
        address: 'Rennes',
        website: 'www.studio-lumiere.fr',
        status: 'confirmed',
        rating: 5,
        event_ids: ['event-test-1']
      }
    ];

    for (const vendor of vendors) {
      await setDoc(doc(db, 'vendors', vendor.id), vendor);
    }
    console.log(`✅ ${vendors.length} prestataires créés\n`);

    console.log('🎉 Seed terminé avec succès !');
    console.log('\n📋 Résumé:');
    console.log(`   - 1 client créé`);
    console.log(`   - 1 événement créé`);
    console.log(`   - ${documents.length} documents créés`);
    console.log(`   - ${checklistItems.length} tâches checklist créées`);
    console.log(`   - ${payments.length} paiements créés`);
    console.log(`   - ${invoices.length} factures créées`);
    console.log(`   - ${vendors.length} prestataires créés`);
    console.log('\n✅ Vous pouvez maintenant tester l\'espace client !');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedData();
