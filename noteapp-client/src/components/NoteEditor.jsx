import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import FontFamily from '@tiptap/extension-font-family';
import { toast } from 'react-toastify';
import { createNote, getNoteById, uploadImage, updateNote } from '../api/api';
import './NoteEditor.css';
import PaintModal from './PaintModal';
import Image from '@tiptap/extension-image';

const FONT_FAMILIES = [
    { label: 'Sans Serif', value: '' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
];


const HIGHLIGHT_COLORS = [
    { color: '#ffe9a7', label: 'Pastel Yellow' },
    { color: '#cabee9', label: 'Pastel Purple' },
    { color: '#b6d0ff', label: 'Pastel Blue' },
    { color: '#baffc9', label: 'Pastel Green' },
];


const NoteEditor = () => {
    const [showPaintModal, setShowPaintModal] = useState(false);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [note, setNote] = useState({ title: '', content: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [showSessionModal, setShowSessionModal] = useState(false);
    const lastSavedContent = useRef('');
    const [color, setColor] = useState('#000000');
    const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].color);

    // const handleImageUpload = async (dataURL) => {
    //     try {
    //         // Ensure we have a valid data URL
    //         if (!dataURL.startsWith('data:image')) {
    //             throw new Error('Invalid image format');
    //         }

    //         // Extract just the base64 part
    //         const base64Data = dataURL.split(',')[1];

    //         if (!base64Data) {
    //             throw new Error('Could not extract image data');
    //         }

    //         const result = await uploadImage(base64Data);

    //         if (editor && result.imageUrl) {
    //             editor.chain().focus().setImage({ src: result.imageUrl }).run();
    //             toast.success('Image uploaded successfully');
    //         }
    //     } catch (error) {
    //         console.error('Upload failed:', error);
    //         toast.error(error.message || 'Image upload failed');
    //     }
    // };

    const handleImageUpload = async (dataURL) => {
        try {
            const base64Data = dataURL.split(',')[1];
            const result = await uploadImage(base64Data);

            if (editor && result.imageUrl) {
                editor.chain().focus().setImage({ src: result.imageUrl }).run();
                toast.success('Image added successfully');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        }
      };



    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);


    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false, 
                orderedList: false, 
                listItem: false   
            }),
            TextStyle,
            Color,
            Underline,
            Highlight.configure({ multicolor: true }),
            BulletList.configure({
                HTMLAttributes: {
                    class: 'bullet-list',
                },
            }),
            OrderedList.configure({
                HTMLAttributes: {
                    class: 'ordered-list',
                },
            }),
            ListItem.configure({
                HTMLAttributes: {
                    class: 'list-item',
                },
            }),
            FontFamily.configure({
                types: ['textStyle'],
            }),
            Image.configure({
                inline: true,
                allowBase64: false, // We're using URLs now
                HTMLAttributes: {
                    class: 'editor-image',
                },
               
            }),
        ],
        content: '',
        onUpdate: ({ editor }) => {
            setNote((prev) => ({ ...prev, content: editor.getHTML() }));
        },
    });



    useEffect(() => {
        if (editor && color) {
            editor.chain().focus().setColor(color).run();
        }
    }, [color, editor]);


    useEffect(() => {
        if (id && editor) {
            getNoteById(id).then((fetched) => {
                setNote({ title: fetched.title || '', content: fetched.encryptedContent || '' });
                editor.commands.setContent(fetched.encryptedContent || '');
                lastSavedContent.current = fetched.encryptedContent || '';
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [id, editor]);




    // const saveNote = useCallback(async () => {
    //     if (!editor || saving) return;


    //     try {
    //         const currentContent = editor.getHTML();
    //         if (!note.title.trim()) {
    //             toast.error('Note title cannot be empty');
    //             return;
    //         }


    //         setSaving(true);
    //         const created = await createNote(note.title, currentContent);


    //         if (created?.id) {
    //             navigate(`/note/${created.id}`);
    //             toast.success('Note created successfully');
    //             window.dispatchEvent(new Event('noteCreated'));
    //         }
    //     } catch (error) {
    //         toast.error(`Save failed: ${error.message}`);
    //     } finally {
    //         setSaving(false);
    //     }
    // }, [editor, saving, note.title, navigate]);

    const saveNote = useCallback(async () => {
        if (!editor || saving) return;

        try {
            const currentContent = editor.getHTML();
            if (!note.title.trim()) {
                toast.error('Note title cannot be empty');
                return;
            }

            setSaving(true);

            if (id) {
                // Update existing note
                const updated = await updateNote(id, {
                    title: note.title,
                    content: currentContent
                });

                if (updated) {
                    toast.success('Note updated successfully');
                    // Dispatch event to update note list
                    window.dispatchEvent(new CustomEvent('noteSaved', { detail: { id } }));
                }
            } else {
                // Create new note
                const created = await createNote(note.title, currentContent);

                if (created?.id) {
                    navigate(`/note/${created.id}`);
                    toast.success('Note created successfully');
                    window.dispatchEvent(new Event('noteCreated'));
                }
            }
        } catch (error) {
            toast.error(`Save failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }, [editor, saving, note.title, id, navigate]);


    // useEffect(() => {
    //     let timeoutId;


    //     const handleChange = () => {
    //         clearTimeout(timeoutId);
    //         timeoutId = setTimeout(() => {
    //             saveNote();
    //         }, 2000); 
    //     };


    //     if (editor) {
    //         editor.on('update', handleChange);
    //     }


    //     return () => {
    //         clearTimeout(timeoutId);
    //         if (editor) {
    //             editor.off('update', handleChange);
    //         }
    //     };
    // }, [editor, saveNote]);


    useEffect(() => {
        let timeoutId;

        const handleChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                saveNote();
            }, 2000);
        };

        if (editor) {
            editor.on('update', handleChange);
        }

        return () => {
            clearTimeout(timeoutId);
            if (editor) {
                editor.off('update', handleChange);
            }
        };
    }, [editor, saveNote]);



    const setOrderedList = () => {
        editor.chain().focus().toggleOrderedList().run();
    };


    if (loading || !editor) return <p>Loading editor...</p>;


    return (
        <div className="note-editor-container">
            {showSessionModal && (
                <div className="session-modal">
                    <div className="modal-content">
                        <h3>Session Expired</h3>
                        <p>Your session has expired. Please login to continue.</p>
                        <button
                            onClick={() => {
                                setShowSessionModal(false);
                                navigate('/login', { state: { from: location.pathname } });
                            }}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            )}


            <div className="topbar-nav">
                <div className="title-container">
                    <input
                        className="title-editor"
                        placeholder="Untitled Document"
                        type="text"
                        value={note.title}
                        onChange={e => setNote({ ...note, title: e.target.value })}
                    />
                    {saving && <span className="saving-indicator">Saving...</span>}
                </div>


                <div className="toolbar-container">
                    <div className="toolbar">
                        <div className="undo-redo-group">
                            <button
                                className="undo-redo-btn"
                                onClick={() => editor.chain().focus().undo().run()}
                                title="Undo"
                            >
                                ↶
                            </button>
                            <button
                                className="undo-redo-btn"
                                onClick={() => editor.chain().focus().redo().run()}
                                title="Redo"
                            >
                                ↷
                            </button>
                            <button className="toolbar-btn" onClick={saveNote} title="Save manually">💾</button>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <button
                                className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                title="Bold"
                            >
                                <b>B</b>
                            </button>
                            <button
                                className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                title="Italic"
                            >
                                <i>I</i>
                            </button>
                            <button
                                className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                title="Underline"
                            >
                                <u>U</u>
                            </button>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <div className="color-picker-container">
                                <button className="color-picker-btn" style={{ color: color }} />
                                <input
                                    type="color"
                                    className="color-picker-input"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    title="Text color"
                                />
                            </div>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <button
                                className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                title="Bullet list"
                            >
                                •
                            </button>
                            <button
                                className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                                onClick={() => setOrderedList('decimal')}
                                title="Numbered list"
                            >
                                1.
                            </button>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <div className="highlight-swatches">
                                {HIGHLIGHT_COLORS.map(hc => (
                                    <button
                                        key={hc.color}
                                        className={`highlight-swatch ${highlightColor === hc.color ? 'selected' : ''}`}
                                        style={{ backgroundColor: hc.color }}
                                        onClick={() => {
                                            setHighlightColor(hc.color);
                                            editor.chain().focus().toggleHighlight({ color: hc.color }).run();
                                        }}
                                        title={`Highlight color ${hc.color}`}
                                    />
                                ))}
                            </div>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <select
                                className="toolbar-btn"
                                onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
                                value={editor.getAttributes('textStyle').fontFamily || ''}
                                title="Font family"
                            >
                                {FONT_FAMILIES.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>


                        <div className="toolbar-group-divider" />


                        <div className="toolbar-group">
                            <button
                                className="toolbar-btn"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                title="Toggle theme"
                            >
                                {theme === 'dark' ? '🌞' : '🌙'}
                            </button>
                            <button
                                className="toolbar-btn"
                                onClick={() => setShowPaintModal(true)}
                                title="Paint Tool"
                            >
                                🎨
                            </button>

                            {showPaintModal && (
                                <PaintModal
                                    onClose={() => setShowPaintModal(false)}
                                    onUpload={handleImageUpload}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="editor-wrapper">
                <EditorContent editor={editor} className="editor" />
            </div>
        </div>
        
    );
};


export default NoteEditor;









