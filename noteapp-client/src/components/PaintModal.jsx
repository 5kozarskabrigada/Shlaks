import React, { useState, useRef, useEffect } from 'react';

const PaintModal = ({ onClose, onUpload }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState('brush');
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentSize, setCurrentSize] = useState(5);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Initialize canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
    };

    const draw = (e) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');

        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : currentColor;
        ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

        ctx.lineTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleUpload = () => {
        const canvas = canvasRef.current;
        const dataURL = canvas.toDataURL('image/png');
        onUpload(dataURL);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <span className="close" onClick={onClose}>&times;</span>
                <h2>Paint Tool</h2>
                <div className="paint-tools">
                    <button
                        className={currentTool === 'brush' ? 'active' : ''}
                        onClick={() => setCurrentTool('brush')}
                    >
                        Brush
                    </button>
                    <button
                        className={currentTool === 'eraser' ? 'active' : ''}
                        onClick={() => setCurrentTool('eraser')}
                    >
                        Eraser
                    </button>
                    <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                    />
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={currentSize}
                        onChange={(e) => setCurrentSize(parseInt(e.target.value))}
                    />
                </div>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                <div className="modal-actions">
                    <button onClick={clearCanvas}>Clear</button>
                    <button onClick={handleUpload}>Upload to Note</button>
                </div>
            </div>
        </div>
    );
};

export default PaintModal;