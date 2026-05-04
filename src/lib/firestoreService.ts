import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  async getDocument<T>(path: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as T) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
      return null;
    }
  },

  async setDocument<T extends object>(path: string, id: string, data: T): Promise<void> {
    try {
      await setDoc(doc(db, path, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    }
  },

  async addDocument<T extends object>(path: string, data: T): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateDocument<T extends object>(path: string, id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(db, path, id), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  },

  async deleteDocument(path: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  },

  async listDocuments<T>(path: string, filters: { field: string, operator: any, value: any }[] = []): Promise<T[]> {
    try {
      let q = query(collection(db, path));
      filters.forEach(f => {
        q = query(q, where(f.field, f.operator, f.value));
      });
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToDocuments<T>(path: string, filters: { field: string, operator: any, value: any }[] = [], callback: (data: T[]) => void) {
    let q = query(collection(db, path));
    filters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async sendNotification(userId: string, title: string, message: string, type: 'lesson' | 'grade' | 'homework' | 'system' = 'system') {
    const notification = {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    return this.addDocument('notifications', notification);
  }
};
