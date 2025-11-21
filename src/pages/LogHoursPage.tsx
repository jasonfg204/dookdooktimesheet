import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAppContext } from '../context/AppContext';
import './styles/LogHoursPage.css';

const LogHoursPage: React.FC = () => {
  const { user, editingEntryId, setEditingEntryId, setCurrentPage } = useAppContext();

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isOvernight, setIsOvernight] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEditMode = editingEntryId !== null;

  useEffect(() => {
    const fetchEntry = async () => {
      if (isEditMode) {
        const entryRef = doc(db, 'entries', editingEntryId);
        const entrySnap = await getDoc(entryRef);
        if (entrySnap.exists()) {
          const entryData = entrySnap.data();
          setDate(entryData.date);
          setStartTime(entryData.startTime);
          setEndTime(entryData.endTime);
          setNotes(entryData.notes || '');
          setIsOvernight(entryData.isOvernight || false);
        } else {
          console.error("No such document to edit!");
          handleCancel();
        }
      }
    };

    fetchEntry();
  }, [editingEntryId]);

  const clearForm = () => {
    setDate('');
    setStartTime('');
    setEndTime('');
    setNotes('');
    setIsOvernight(false);
    setMessage(null);
  };

  const handleCancel = () => {
    clearForm();
    setEditingEntryId(null);
    setCurrentPage('entries-list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to perform this action.' });
      return;
    }

    if (!date || !startTime || !endTime) {
      setMessage({ type: 'error', text: 'Date, Start Time, and End Time are required.' });
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setMessage({ type: 'error', text: 'Invalid date or time value.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Dates from input are 'YYYY-MM-DD', creating a date from this gives UTC midnight.
    // To properly compare with user's local 'today', we need to parse it in the local timezone.
    // Appending T00:00 makes it be parsed as a local time.
    const selectedDate = new Date(date + 'T00:00');
    if (selectedDate > today) {
      setMessage({ type: 'error', text: 'Cannot log time for a future date.' });
      return;
    }

    if (isOvernight) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    const year = startDateTime.getFullYear();
    const month = startDateTime.getMonth() + 1;

    if (endDateTime <= startDateTime) {
      setMessage({ type: 'error', text: 'End Time must be after Start Time.' });
      return;
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = durationMs / (1000 * 60 * 60);

    if (hours > 24) {
      setMessage({ type: 'error', text: 'Work session cannot be longer than 24 hours.' });
      return;
    }

    const entryData = {
      userId: user.uid,
      year,
      month,
      date,
      startTime,
      endTime,
      hours: parseFloat(hours.toFixed(2)),
      notes,
      isOvernight,
    };

    try {
      if (isEditMode) {
        const entryRef = doc(db, 'entries', editingEntryId);
        await updateDoc(entryRef, {
          ...entryData,
          updatedAt: serverTimestamp(),
        });
        setMessage({ type: 'success', text: 'Work session updated successfully!' });
        setTimeout(() => {
          handleCancel(); // Go back to the list after a successful update
        }, 1500);
      } else {
        await addDoc(collection(db, 'entries'), {
          ...entryData,
          createdAt: serverTimestamp(),
        });
        setMessage({ type: 'success', text: 'Work session logged successfully!' });
        clearForm();
      }
    } catch (error) {
      console.error('Error submitting document: ', error);
      setMessage({ type: 'error', text: 'Failed to save work session. Please try again.' });
    }
  };

  return (
    <div className="log-hours-page">
      <h2>{isEditMode ? 'Edit Work Session' : 'Log Work Session'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group-checkbox">
          <input
            type="checkbox"
            id="isOvernight"
            checked={isOvernight}
            onChange={(e) => setIsOvernight(e.target.checked)}
          />
          <label htmlFor="isOvernight">Ends next day</label>
        </div>
        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit">{isEditMode ? 'Update Session' : 'Log Work Session'}</button>
          {isEditMode && <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>}
        </div>
      </form>
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default LogHoursPage;
