import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { db as newDb } from '../config/firebase';

// Old Firebase Configuration (DebtFlow Pro)
const oldConfig = {
  apiKey: "AIzaSyCcnwb1V0NhW-tOZRQOTiMn9sMuW1CBWh4",
  authDomain: "test-company-a0c68.firebaseapp.com",
  projectId: "test-company-a0c68",
  storageBucket: "test-company-a0c68.firebasestorage.app",
  messagingSenderId: "426636793558",
  appId: "1:426636793558:web:28855be21b4f8a179f9b77"
};

// Initialize Old App
const oldApp = initializeApp(oldConfig, 'oldApp');
const oldDb = getFirestore(oldApp);
const oldAuth = getAuth(oldApp);

const COLLECTIONS = [
  'clients',
  'invoices',
  'payments',
  'debts',
  'projects',
  'expenses',
  'standaloneDebts',
  'expenseInvoices',
  'debtParties'
];

export const migrateData = async (onProgress: (msg: string) => void) => {
  try {
    // 1. Authenticate with Old DB
    onProgress('جاري تسجيل الدخول لقاعدة البيانات القديمة...');
    try {
      await signInWithEmailAndPassword(oldAuth, 'admin@debtflow.com', 'admin123');
    } catch (e) {
      onProgress('فشل تسجيل الدخول التلقائي. يرجى التأكد من صلاحيات القراءة.');
      console.error(e);
      // Continue anyway, maybe rules allow public read? Unlikely but worth trying or user might be already logged in if persistence worked (unlikely for secondary app).
      // Actually, if this fails, migration will likely fail.
      throw new Error('فشل تسجيل الدخول للقاعدة القديمة (admin@debtflow.com).');
    }

    onProgress('تم الاتصال بالقاعدة القديمة. جاري نقل البيانات...');

    let totalDocs = 0;

    // 2. Iterate Collections
    for (const collectionName of COLLECTIONS) {
      onProgress(`جاري قراءة البيانات من جدول: ${collectionName}...`);
      
      const oldCollection = collection(oldDb, collectionName);
      const snapshot = await getDocs(oldCollection);
      
      if (snapshot.empty) {
        onProgress(`لا توجد بيانات في ${collectionName}.`);
        continue;
      }

      onProgress(`تم العثور على ${snapshot.size} سجل في ${collectionName}. جاري النقل...`);

      // 3. Write to New DB
      const batchPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Use setDoc to preserve the ID
        await setDoc(doc(newDb, collectionName, docId), data);
      });

      await Promise.all(batchPromises);
      totalDocs += snapshot.size;
    }

    onProgress(`✅ تمت العملية بنجاح! تم نقل ${totalDocs} سجل.`);
    return true;

  } catch (error: any) {
    console.error("Migration Error:", error);
    onProgress(`❌ حدث خطأ: ${error.message}`);
    return false;
  }
};
