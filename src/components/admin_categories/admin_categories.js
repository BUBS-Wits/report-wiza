import React, { useState, useEffect } from 'react'
import {
    fetch_categories,
    add_category,
    remove_category,
} from '../../backend/admin_requests_service.js'
import './admin_categories.css'

function AdminCategories() {
    const [categories, set_categories] = useState([])
    const [loading, set_loading] = useState(true)
    const [new_name, set_new_name] = useState('')
    const [adding, set_adding] = useState(false)
    const [updating_id, set_updating_id] = useState(null)
    const [message, set_message] = useState(null)
    const [error, set_error] = useState('')

    const show_feedback = (text, is_error = false) => {
        if (is_error) {
            set_error(text)
            set_message(null)
        } else {
            set_message(text)
            set_error('')
        }
        setTimeout(() => {
            set_message(null)
            set_error('')
        }, 3000)
    }

    const load = async () => {
        set_loading(true)
        try {
            const cats = await fetch_categories()
            set_categories(cats)
        } catch (err) {
            console.error(err)
        } finally {
            set_loading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handle_add = async () => {
        const trimmed = new_name.trim()
        if (!trimmed) {
            set_error('Please enter a category name.')
            return
        }
        const duplicate = categories.find(
            (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        )
        if (duplicate) {
            set_error('A category with that name already exists.')
            return
        }
        set_adding(true)
        try {
            await add_category(trimmed)
            set_new_name('')
            show_feedback('Category added successfully.')
            await load()
        } catch (err) {
            show_feedback(err.message, true)
        } finally {
            set_adding(false)
        }
    }

    const handle_toggle = async (cat) => {
        set_updating_id(cat.id)
        try {
            await remove_category(cat.id, !cat.active)
            set_categories((prev) =>
                prev.map((c) =>
                    c.id === cat.id ? { ...c, active: !c.active } : c
                )
            )
            show_feedback(
                `"${cat.name}" ${!cat.active ? 'activated' : 'deactivated'}.`
            )
        } catch (err) {
            show_feedback(err.message, true)
        } finally {
            set_updating_id(null)
        }
    }

    return (
        <div className="admin_categories">
            {/* Add row */}
            <div className="admin_categories__add_row">
                <input
                    className="admin_categories__input"
                    type="text"
                    placeholder="New category name..."
                    value={new_name}
                    onChange={(e) => set_new_name(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handle_add()}
                    disabled={adding}
                />
                <button
                    className="admin_categories__add_btn"
                    onClick={handle_add}
                    disabled={adding}
                >
                    {adding ? 'Adding...' : 'Add category'}
                </button>
            </div>

            {/* Feedback */}
            {error && <p className="admin_categories__error">{error}</p>}
            {message && <p className="admin_categories__message">{message}</p>}

            {/* Table */}
            {loading ? (
                <p className="admin_categories__loading">Loading categories…</p>
            ) : categories.length === 0 ? (
                <p className="admin_categories__empty">No categories found.</p>
            ) : (
                <div className="admin_categories__table_wrapper">
                    <table className="admin_categories__table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id}>
                                    <td className="admin_categories__name">{cat.name}</td>
                                    <td>
                                        <span
                                            className={`admin_categories__badge ${
                                                cat.active
                                                    ? 'admin_categories__badge--active'
                                                    : 'admin_categories__badge--inactive'
                                            }`}
                                        >
                                            {cat.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className={`admin_categories__toggle_btn ${
                                                cat.active
                                                    ? 'admin_categories__toggle_btn--deactivate'
                                                    : 'admin_categories__toggle_btn--activate'
                                            }`}
                                            onClick={() => handle_toggle(cat)}
                                            disabled={updating_id === cat.id}
                                        >
                                            {updating_id === cat.id
                                                ? '...'
                                                : cat.active
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default AdminCategories