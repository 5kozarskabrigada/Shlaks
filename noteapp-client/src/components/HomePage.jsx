import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserNotes } from '../api/api';
import './HomePage.css';

const HomePage = () => {
    const [recentNote, setRecentNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecentNote = async () => {
            try {
                const notes = await getUserNotes();
                if (notes.length > 0) {
                    const sortedNotes = [...notes].sort((a, b) =>
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    setRecentNote(sortedNotes[0]);
                }
            } catch (error) {
                console.error('Error fetching recent note:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentNote();
    }, []);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="home-container">
            <h1>Welcome to Shlaks</h1>
            <p>Your Dashboard</p>

            {recentNote ? (
                <div className="recent-note-section">
                    <h2>Most Recent Note</h2>
                    <div
                        className="recent-note-card"
                        onClick={() => navigate(`/note/${recentNote.id}`)}
                    >
                        <h3>{recentNote.title || 'Untitled Note'}</h3>
                        <div className="note-preview">
                            {recentNote.encryptedContent && (
                                <div dangerouslySetInnerHTML={{
                                    __html: recentNote.encryptedContent.substring(0, 100) + '...'
                                }} />
                            )}
                        </div>
                        <div className="note-meta">
                            <span>{formatDate(recentNote.createdAt)}</span>
                            <span className="view-link">View Note →</span>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="empty-message">No notes found. Create your first note!</p>
            )}
        </div>
    );
};

export default HomePage;