import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
    try {
        console.log('Starting seed process...');

        // 1. Create Admin User (Planner)
        const adminEmail = 'admin@leouiparfait.com';
        const adminPassword = 'password123';
        let adminUid;

        try {
            const user = await adminAuth.getUserByEmail(adminEmail);
            adminUid = user.uid;
            console.log('Admin user already exists:', adminUid);
        } catch (error) {
            const user = await adminAuth.createUser({
                email: adminEmail,
                password: adminPassword,
                displayName: 'Admin Planner',
                emailVerified: true,
            });
            adminUid = user.uid;
            console.log('Created Admin user:', adminUid);
        }

        // Set Admin custom claims (optional but good practice) and Firestore Profile
        await adminAuth.setCustomUserClaims(adminUid, { role: 'planner' });
        await adminDb.collection('profiles').doc(adminUid).set({
            email: adminEmail,
            full_name: 'Admin Planner',
            role: 'planner',
            created_at: new Date().toISOString(),
        }, { merge: true });


        // 2. Create Client User
        const clientEmail = 'julie@email.com';
        const clientPassword = 'password123';
        let clientUid;

        try {
            const user = await adminAuth.getUserByEmail(clientEmail);
            clientUid = user.uid;
            console.log('Client user already exists:', clientUid);
        } catch (error) {
            const user = await adminAuth.createUser({
                email: clientEmail,
                password: clientPassword,
                displayName: 'Julie & Marc',
                emailVerified: true,
            });
            clientUid = user.uid;
            console.log('Created Client user:', clientUid);
        }

        // Set Client custom claims and Firestore Profile
        await adminAuth.setCustomUserClaims(clientUid, { role: 'client' });
        await adminDb.collection('profiles').doc(clientUid).set({
            email: clientEmail,
            full_name: 'Julie & Marc',
            role: 'client',
            created_at: new Date().toISOString(),
        }, { merge: true });


        // 3. Create Clients CRM Data (Moved up to be available for events)
        const clientsRef = adminDb.collection('clients');
        const clientsSnapshot = await clientsRef.where('planner_id', '==', adminUid).get();
        let demoClientId;

        if (clientsSnapshot.empty) {
            const clientDoc = await clientsRef.add({
                planner_id: adminUid,
                email: 'julie@email.com',
                name: 'Julie',
                partner: 'Marc',
                phone: '0612345678',
                eventDate: '2024-08-24',
                budget: 35000,
                status: 'active',
                created_at: new Date().toISOString()
            });
            demoClientId = clientDoc.id;
            await clientsRef.add({
                planner_id: adminUid,
                email: 'sophie@email.com',
                name: 'Sophie',
                partner: 'Thomas',
                phone: '0698765432',
                eventDate: '2025-06-15',
                budget: 45000,
                status: 'active',
                created_at: new Date().toISOString()
            });
            console.log('Seeded Clients');
        } else {
            demoClientId = clientsSnapshot.docs[0].id;
        }

        // 4. Create Sample Event for Client
        // Check if event exists for this client to avoid duplicates
        const eventQuery = await adminDb.collection('events').where('client_email', '==', clientEmail).get();
        let eventId;

        if (eventQuery.empty) {
            const eventRef = await adminDb.collection('events').add({
                couple_names: 'Julie & Marc', // Keep for display if needed
                client_id: demoClientId, // Link to CRM client doc
                date: '2024-08-24', // Unified field name
                event_date: '2024-08-24', // Legacy support
                venue: 'Château de la Mariée',
                location: 'Paris',
                guest_count: 120,
                budget: 35000,
                spent: 12000,
                status: 'in_progress',
                planner_id: adminUid,
                client_email: clientEmail,
                created_at: new Date().toISOString(),
                reference: 'EVT-2024-001'
            });
            eventId = eventRef.id;
            console.log('Created Event:', eventId);
        } else {
            eventId = eventQuery.docs[0].id;
            console.log('Event already exists:', eventId);
        }

        // 5. Create Sub-collections for the Event

        // Timeline Items
        const timelineRef = adminDb.collection('events').doc(eventId).collection('timeline_items');
        const timelineSnapshot = await timelineRef.get();
        if (timelineSnapshot.empty) {
            await timelineRef.add({ title: 'Fiançailles', date: '2023-08-24', status: 'completed', order: 1 });
            await timelineRef.add({ title: 'Choix du lieu', date: '2023-09-15', status: 'completed', order: 2 });
            await timelineRef.add({ title: 'Choix du traiteur', date: '2023-10-01', status: 'in_progress', order: 3 });
            await timelineRef.add({ title: 'Envoi des faire-parts', date: '2024-02-01', status: 'pending', order: 4 });
            await timelineRef.add({ title: 'Mariage !', date: '2024-08-24', status: 'pending', order: 5 });
            console.log('Seeded Timeline');
        }

        // Documents
        const docsRef = adminDb.collection('events').doc(eventId).collection('documents');
        const docsSnapshot = await docsRef.get();
        if (docsSnapshot.empty) {
            await docsRef.add({ name: 'Contrat Location Lieu', type: 'Contrat', date: '2023-09-15', url: 'https://example.com/contrat.pdf' });
            await docsRef.add({ name: 'Devis Traiteur', type: 'Devis', date: '2023-10-01', url: 'https://example.com/devis.pdf' });
            console.log('Seeded Documents');
        }

        // Payments
        const paymentsRef = adminDb.collection('events').doc(eventId).collection('payments');
        const paymentsSnapshot = await paymentsRef.get();
        if (paymentsSnapshot.empty) {
            await paymentsRef.add({ description: 'Acompte Château', amount: 2000, status: 'paid', date: '2023-09-15' });
            await paymentsRef.add({ description: 'Acompte Traiteur', amount: 1500, status: 'pending', date: '2023-10-15' });
            await paymentsRef.add({ description: 'Solde Château', amount: 2000, status: 'pending', date: '2024-07-24' });
            console.log('Seeded Payments');
        }

        // 6. Prospects
        const prospectsRef = adminDb.collection('prospects');
        const prospectsSnapshot = await prospectsRef.where('planner_id', '==', adminUid).get();
        if (prospectsSnapshot.empty) {
            await prospectsRef.add({ planner_id: adminUid, name: 'Alice', partner: 'Bob', email: 'alice@example.com', status: 'new', source: 'Instagram', budget: '20000', eventDate: '2025-09-01', created_at: new Date().toISOString() });
            await prospectsRef.add({ planner_id: adminUid, name: 'Claire', partner: 'David', email: 'claire@example.com', status: 'qualified', source: 'Mariage.net', budget: '30000', eventDate: '2025-07-12', created_at: new Date().toISOString() });
            await prospectsRef.add({ planner_id: adminUid, name: 'Emma', partner: 'Fabien', email: 'emma@example.com', status: 'converted', source: 'Bouche à oreille', budget: '25000', eventDate: '2025-05-20', created_at: new Date().toISOString() });
            console.log('Seeded Prospects');
        }

        // Tasks (Todo)
        const tasksRef = adminDb.collection('tasks');
        const tasksSnapshot = await tasksRef.where('assigned_to', '==', adminUid).get();
        if (tasksSnapshot.empty) {
            await tasksRef.add({ assigned_to: adminUid, title: 'Relancer traiteur', status: 'todo', due_date: '2023-10-25', priority: 'high', created_at: new Date().toISOString() });
            await tasksRef.add({ assigned_to: adminUid, title: 'Finaliser moodboard', status: 'done', due_date: '2023-10-20', priority: 'medium', created_at: new Date().toISOString() });
            await tasksRef.add({ assigned_to: adminUid, title: 'Envoyer devis fleurs', status: 'todo', due_date: '2023-10-28', priority: 'low', created_at: new Date().toISOString() });
            console.log('Seeded Tasks');
        }

        // Notes (Post-its)
        const notesRef = adminDb.collection('notes');
        const notesSnapshot = await notesRef.where('planner_id', '==', adminUid).get();
        if (notesSnapshot.empty) {
            await notesRef.add({ planner_id: adminUid, content: 'Appeler le DJ pour le mariage de Julie', color: 'yellow', position: { x: 0, y: 0 }, created_at: new Date().toISOString() });
            await notesRef.add({ planner_id: adminUid, content: 'Idée déco: Thème champêtre chic', color: 'blue', position: { x: 1, y: 0 }, created_at: new Date().toISOString() });
            console.log('Seeded Notes');
        }

        return NextResponse.json({
            message: 'Database seeded successfully',
            data: {
                admin: { email: adminEmail, password: adminPassword },
                client: { email: clientEmail, password: clientPassword },
                eventId: eventId
            }
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
