import { db } from './firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    DocumentData
} from 'firebase/firestore';

export async function addDocument(collectionName: string, data: any) {
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error('Error adding document:', error);
        throw error;
    }
}

export async function getDocument(collectionName: string, id: string) {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
}

// Function to set a document with a specific ID (useful for user profiles linked to Auth UID)
export async function setDocument(collectionName: string, id: string, data: any) {
    try {
        const { setDoc } = await import('firebase/firestore'); // Dynamic import to avoid circular dep if needed, or just import at top
        await setDoc(doc(db, collectionName, id), data);
        return { id, ...data };
    } catch (error) {
        console.error('Error setting document:', error);
        throw error;
    }
}

export async function getDocuments(collectionName: string, filters: { field: string; operator: any; value: any }[] = []) {
    try {
        let q = collection(db, collectionName);
        let queryRef: any = q;

        if (filters.length > 0) {
            filters.forEach(filter => {
                queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
            });
        }

        const querySnapshot = await getDocs(queryRef);
        const data: any[] = [];
        querySnapshot.forEach((doc: any) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    } catch (error) {
        console.error('Error getting documents:', error);
        throw error;
    }
}

export async function updateDocument(collectionName: string, id: string, data: any) {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
        return { id, ...data };
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
}

export async function deleteDocument(collectionName: string, id: string) {
    try {
        await deleteDoc(doc(db, collectionName, id));
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}
