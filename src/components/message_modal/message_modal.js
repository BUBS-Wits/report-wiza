import React, { useState, useEffect, useCallback } from 'react'
import './message_modal.css'

/**
 * MessageDisplay — renders toast/overlay messages centered on screen.
 *
 * Props:
 *   messages   {Array}    – controlled list of message objects (see shape below)
 *   onDismiss  {Function} – called with message `id` when a message closes
 *
 * Message object shape:
 *   {
 *     id:       string | number   (required, must be unique)
 *     text:     string            (required)
 *     type:     "info" | "success" | "warning" | "error"   (default: "info")
 *     duration: number            (ms before auto-dismiss; 0 = never, default 4000)
 *     icon:     string | null     (override the default icon with any emoji/string)
 *   }
 */

const TYPE_META = {
	info: { icon: 'ℹ', label: 'Info' },
	success: { icon: '✓', label: 'Success' },
	warning: { icon: '⚠', label: 'Warning' },
	error: { icon: '✕', label: 'Error' },
}

function MessageItem({ message, onDismiss }) {
	const [visible, setVisible] = useState(false)
	const [leaving, setLeaving] = useState(false)

	const dismiss = useCallback(() => {
		setLeaving(true)
		setTimeout(() => onDismiss(message.id), 350)
	}, [message.id, onDismiss])

	// Mount animation
	useEffect(() => {
		const t = requestAnimationFrame(() => setVisible(true))
		return () => cancelAnimationFrame(t)
	}, [])

	// Auto-dismiss
	useEffect(() => {
		const duration = message.duration ?? 4000
		if (duration === 0) {
			return
		}
		const t = setTimeout(dismiss, duration)
		return () => clearTimeout(t)
	}, [message.duration, dismiss])

	const meta = TYPE_META[message.type] ?? TYPE_META.info
	const icon = message.icon ?? meta.icon

	return (
		<div
			className={`md-message md-message--${message.type ?? 'info'} ${visible && !leaving ? 'md-message--visible' : ''} ${leaving ? 'md-message--leaving' : ''}`}
			role="alert"
			aria-live="assertive"
			aria-label={`${meta.label}: ${message.text}`}
		>
			<span className="md-message__icon" aria-hidden="true">
				{icon}
			</span>
			<span className="md-message__text">{message.text}</span>
			<button
				className="md-message__close"
				onClick={dismiss}
				aria-label="Dismiss message"
			>
				×
			</button>
		</div>
	)
}

export default function MessageDisplay({
	messages = [],
	onDismiss = () => {},
}) {
	if (messages.length === 0) {
		return null
	}

	return (
		<div className="md-overlay" aria-live="polite">
			{messages.map((msg) => (
				<MessageItem key={msg.id} message={msg} onDismiss={onDismiss} />
			))}
		</div>
	)
}

// ─── Convenience hook ──────────────────────────────────────────────────────────
let _nextId = 1

/**
 * useMessages() — drop-in state manager for MessageDisplay.
 *
 * Returns: { messages, addMessage, removeMessage, clearMessages }
 *
 * addMessage({ text, type, duration, icon }) → id
 */
export function useMessages() {
	const [messages, setMessages] = useState([])

	const addMessage = useCallback((msg) => {
		const id = msg.id ?? `msg-${_nextId++}`
		setMessages((prev) => [...prev, { ...msg, id }])
		return id
	}, [])

	const removeMessage = useCallback((id) => {
		setMessages((prev) => prev.filter((m) => m.id !== id))
	}, [])

	const clearMessages = useCallback(() => setMessages([]), [])

	return { messages, addMessage, removeMessage, clearMessages }
}
