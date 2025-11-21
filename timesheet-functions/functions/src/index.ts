import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

type DateInput = { toDate: () => Date } | string;

// Helper to get YYYY-MM string from a date object or string
const getYearMonth = (date: DateInput | null | undefined): string | null => {
  if (!date) return null;

  let d: Date;
  if (typeof date === 'object' && date !== null && 'toDate' in date) { // Firestore Timestamp
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    return null;
  }

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

export const aggregateUserHours = onDocumentWritten('entries/{entryId}', async (event) => {
  if (!event.data) {
    console.log('No data found in event. Exiting.');
    return;
  }

  const entryBefore = event.data.before.data();
  const entryAfter = event.data.after.data();

  const oldYearMonth = getYearMonth(entryBefore?.date);
  const newYearMonth = getYearMonth(entryAfter?.date);

  const oldHours = entryBefore?.hours || 0;
  const newHours = entryAfter?.hours || 0;

  const userId = entryBefore?.userId || entryAfter?.userId;

  if (!userId) {
    console.log(`No userId found for entry ${event.params.entryId}. Skipping aggregation.`);
    return;
  }

  try {
    await db.runTransaction(async (transaction) => {
      // If the month is the same (handle create, update, delete)
      if (oldYearMonth === newYearMonth) {
        if (newYearMonth) {
          const hoursDifference = newHours - oldHours;
          if (hoursDifference !== 0) {
            const summaryRef = db.collection('monthlySummaries').doc(newYearMonth).collection('users').doc(userId);
            const summaryDoc = await transaction.get(summaryRef);
            const currentHours = summaryDoc.data()?.totalHours || 0;
            const newTotalHours = currentHours + hoursDifference;
            transaction.set(summaryRef, { totalHours: newTotalHours }, { merge: true });
          }
        }
      } else { // Month has changed (or create/delete)
        // Decrement old month's total
        if (oldYearMonth && oldHours > 0) {
          const oldSummaryRef = db.collection('monthlySummaries').doc(oldYearMonth).collection('users').doc(userId);
          const oldSummaryDoc = await transaction.get(oldSummaryRef);
          const oldTotalHours = oldSummaryDoc.data()?.totalHours || 0;
          transaction.set(oldSummaryRef, { totalHours: oldTotalHours - oldHours }, { merge: true });
        }

        // Increment new month's total
        if (newYearMonth && newHours > 0) {
          const newSummaryRef = db.collection('monthlySummaries').doc(newYearMonth).collection('users').doc(userId);
          const newSummaryDoc = await transaction.get(newSummaryRef);
          const newTotalHours = newSummaryDoc.data()?.totalHours || 0;
          transaction.set(newSummaryRef, { totalHours: newTotalHours + newHours }, { merge: true });
        }
      }
    });
    console.log(`Successfully updated monthly summaries for user ${userId}.`);
  } catch (error) {
    console.error(`Transaction failed for user ${userId}:`, error);
  }
});

export const recalculateMonthlySummary = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
  }

  const userDocRef = db.collection('users').doc(request.auth.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
  }

  const { yearMonth, userId } = request.data;

  // 2. Validation: Ensure yearMonth is provided and is a string.
  if (!yearMonth || typeof yearMonth !== 'string' || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new HttpsError('invalid-argument', 'A valid yearMonth string (e.g., "YYYY-MM") is required.');
  }

  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  console.log(`Recalculation triggered by admin ${request.auth?.uid} for year: ${year}, month: ${month}, userId: ${userId || 'All Users'}`);

  try {
    let query;
    const entriesCollection = db.collection('entries');

    // 3. Define query based on whether a single user or all users are being recalculated.
    if (userId) {
      query = entriesCollection
        .where('userId', '==', userId)
        .where('year', '==', year)
        .where('month', '==', month);
    } else {
      query = entriesCollection
        .where('year', '==', year)
        .where('month', '==', month);
    }
    
    const entriesSnapshot = await query.get();

    // 4. Process the results.
    if (userId) {
      // For a single user
      let totalHours = 0;
      entriesSnapshot.forEach(doc => {
        totalHours += doc.data().hours || 0;
      });

      const summaryRef = db.collection('monthlySummaries').doc(yearMonth).collection('users').doc(userId);
      await summaryRef.set({ totalHours }, { merge: true });

      console.log(`Successfully recalculated hours for user ${userId} in ${yearMonth}. Total: ${totalHours}`);
      return { success: true, message: `Recalculated hours for user ${userId}. Total: ${totalHours}` };
    } else {
      // For all users
      const userTotals: { [key: string]: number } = {};
      entriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId) {
          userTotals[data.userId] = (userTotals[data.userId] || 0) + (data.hours || 0);
        }
      });

      if (Object.keys(userTotals).length === 0) {
        console.log(`No entries found for any user in ${yearMonth}.`);
        return { success: true, message: 'No entries found for that month.' };
      }

      const batch = db.batch();
      for (const uid in userTotals) {
        const summaryRef = db.collection('monthlySummaries').doc(yearMonth).collection('users').doc(uid);
        batch.set(summaryRef, { totalHours: userTotals[uid] }, { merge: true });
      }
      await batch.commit();

      console.log(`Successfully recalculated hours for ${Object.keys(userTotals).length} users in ${yearMonth}.`);
      return { success: true, message: `Recalculated hours for ${Object.keys(userTotals).length} users.` };
    }
  } catch (error) {
    console.error('Recalculation failed:', error);
    throw new HttpsError('internal', 'An error occurred during recalculation.', error);
  }
});


