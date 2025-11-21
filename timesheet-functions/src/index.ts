import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const aggregateUserHours = functions.firestore
  .document('entries/{entryId}')
  .onWrite(async (change, context) => {
    const entryId = context.params.entryId;
    const entryBefore = change.before.data();
    const entryAfter = change.after.data();

    let userId: string | undefined;
    let oldHours = 0;
    let newHours = 0;

    if (entryBefore) {
      userId = entryBefore.userId;
      oldHours = entryBefore.hours || 0;
    }
    if (entryAfter) {
      userId = entryAfter.userId;
      newHours = entryAfter.hours || 0;
    }

    // If no userId, something is wrong or entry was malformed, exit.
    if (!userId) {
      console.log(`No userId found for entry ${entryId}. Skipping aggregation.`);
      return null;
    }

    const hoursDifference = newHours - oldHours;

    const userSummaryRef = db.collection('userSummaries').doc(userId);

    try {
      await db.runTransaction(async (transaction) => {
        const userSummaryDoc = await transaction.get(userSummaryRef);

        let currentTotalHours = 0;
        if (userSummaryDoc.exists) {
          currentTotalHours = userSummaryDoc.data()?.totalHours || 0;
        }

        const newTotalHours = currentTotalHours + hoursDifference;

        transaction.set(userSummaryRef, { totalHours: newTotalHours }, { merge: true });
        console.log(`User ${userId} total hours updated to ${newTotalHours} for entry ${entryId}.`);
      });
      return null;
    } catch (error) {
      console.error(`Transaction failed for user ${userId} and entry ${entryId}:`, error);
      return null;
    }
  });
