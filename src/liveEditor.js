import React, {useState, useEffect, useRef, useCallback} from 'react';
import debounce from 'lodash.debounce';

const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

const LiveEditor = React.memo(() => {
    const [content, setContent] = useState('');
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const ws = useRef(null);
    const editorRef = useRef(null);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    const connectWebSocket = () => {
        ws.current = new WebSocket(WEBSOCKET_URL);
        ws.current.onopen = () => {
            console.log("WebSocket connected");
        };
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'update' && data.content !== content) {
                    setContent(data.content);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };
        ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
        ws.current.onclose = () => {
            console.log("WebSocket closed, attempting reconnect in 3 seconds...");
            setTimeout(connectWebSocket, 3000);
        };
    };

    const sendUpdate = useCallback(
        debounce((newContent) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({type: 'update', content: newContent}));
            }
        }, 500),
        []
    );

    const handleInput = (e) => {
        const newContent = e.target.innerText;
        setHistory((prev) => [...prev, content]);
        setRedoStack([]);
        setContent(newContent);
        sendUpdate(newContent);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousContent = history[history.length - 1];
        setRedoStack((prev) => [content, ...prev]);
        setHistory(history.slice(0, history.length - 1));
        setContent(previousContent);
        sendUpdate(previousContent);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const nextContent = redoStack[0];
        setHistory((prev) => [...prev, content]);
        setRedoStack(redoStack.slice(1));
        setContent(nextContent);
        sendUpdate(nextContent);
    };

    const getDisplayContent = () => {
        if (content.length > 10000) {
            return content.slice(0, 10000) + '...';
        }
        return content;
    };

    return (
        <div>
            <div style={{marginBottom: '10px'}}>
                <button onClick={handleUndo} disabled={history.length === 0}>
                    Undo
                </button>
                <button onClick={handleRedo} disabled={redoStack.length === 0}>
                    Redo
                </button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                style={{
                    minHeight: '300px',
                    border: '1px solid #ccc',
                    padding: '10px',
                    overflowY: 'auto'
                }}
            >
                {getDisplayContent()}
            </div>
        </div>
    );
});

export default LiveEditor;
