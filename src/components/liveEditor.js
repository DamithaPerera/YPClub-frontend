import React, {useReducer, useCallback, useMemo, useEffect} from 'react';
import debounce from 'lodash.debounce';
import useWebSocket from '../hooks/useWebSocket';

const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

const MAX_HISTORY = 50;

const initialState = {
    content: '',
    history: [],
    redoStack: [],
};

function reducer(state, action) {
    switch (action.type) {
        case 'UPDATE_CONTENT':
            if (state.content === action.payload) return state;
            const newHistory = [...state.history, state.content];
            if (newHistory.length > MAX_HISTORY) newHistory.shift();
            return {
                ...state,
                content: action.payload,
                history: newHistory,
                redoStack: [],
            };
        case 'UNDO':
            if (state.history.length === 0) return state;
            const previousContent = state.history[state.history.length - 1];
            return {
                ...state,
                content: previousContent,
                history: state.history.slice(0, state.history.length - 1),
                redoStack: [state.content, ...state.redoStack],
            };
        case 'REDO':
            if (state.redoStack.length === 0) return state;
            const nextContent = state.redoStack[0];
            return {
                ...state,
                content: nextContent,
                history: [...state.history, state.content],
                redoStack: state.redoStack.slice(1),
            };
        case 'SET_CONTENT':
            return {
                ...state,
                content: action.payload,
            };
        default:
            return state;
    }
}

const LiveEditor = React.memo(() => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const {content, history, redoStack} = state;

    const ws = useWebSocket(WEBSOCKET_URL, (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'update' && data.content !== content) {
                dispatch({type: 'SET_CONTENT', payload: data.content});
            }
        } catch (err) {
            console.error("Error parsing WebSocket message:", err);
        }
    });

    const sendUpdate = useCallback(
        debounce((newContent) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({type: 'update', content: newContent}));
            }
        }, 500),
        [ws]
    );

    useEffect(() => {
        return () => {
            sendUpdate.cancel();
        };
    }, [sendUpdate]);

    const handleInput = (e) => {
        const newContent = e.target.innerText;
        dispatch({type: 'UPDATE_CONTENT', payload: newContent});
        sendUpdate(newContent);
    };

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previousContent = history[history.length - 1];
        dispatch({type: 'UNDO'});
        sendUpdate(previousContent);
    }, [history, sendUpdate]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const nextContent = redoStack[0];
        dispatch({type: 'REDO'});
        sendUpdate(nextContent);
    }, [redoStack, sendUpdate]);

    const displayContent = useMemo(() => {
        return content.length > 10000 ? content.slice(0, 10000) + '...' : content;
    }, [content]);

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
                {displayContent}
            </div>
        </div>
    );
});

export default LiveEditor;
