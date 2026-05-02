import React, { useState, useEffect, useRef } from 'react'
import { fetch_categories } from '../../backend/admin_requests_service.js'
import CategoryOption from '../category_option/category_option.js'
import './category_select.css'

function CategorySelect({ value, onChange }) {
    const [expand, set_expand] = useState(false)
    const [categories, set_categories] = useState([])
    const [loading, set_loading] = useState(true)
    // ADDED: Ref to track clicks outside the component
    const dropdown_ref = useRef(null)

    useEffect(() => {
        const load = async () => {
            try {
                const all = await fetch_categories()
                // Only show active categories to residents
                const active = all.filter((c) => c.active).map((c) => c.name)
                set_categories(active)
            } catch (err) {
                console.error('Failed to load categories:', err)
            } finally {
                set_loading(false)
            }
        }
        load()
    }, [])

    // ADDED: Close dropdown when user clicks outside of it
    useEffect(() => {
        function handle_click_outside(event) {
            if (dropdown_ref.current && !dropdown_ref.current.contains(event.target)) {
                set_expand(false)
            }
        }
        document.addEventListener('mousedown', handle_click_outside)
        return () => document.removeEventListener('mousedown', handle_click_outside)
    }, [])

    return (
        // Wrapper now uses the ref to track boundaries
        <div className="category_select_wrapper" ref={dropdown_ref}>
            <button
                type="button"
                className={`dropdown_trigger ${expand ? 'expanded' : ''}`}
                // CHANGED: Now toggles between true and false
                onClick={() => set_expand(!expand)} 
                disabled={loading}
            >
                <span className="dropdown_trigger_text">
                    {loading
                        ? 'Loading categories...'
                        : value
                            ? value.replaceAll(
                                  /((^[a-z])|( [a-z]|_[a-z]))/g,
                                  (match) => match.replace('_', ' ').toUpperCase()
                              )
                            : '--Please choose a category--'}
                </span>
                {/* ADDED: SVG Chevron for better visual affordance */}
                <svg 
                    className={`dropdown_chevron ${expand ? 'rotated' : ''}`} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
            <ul className={`category_dropdown_list ${expand ? 'open' : ''}`}>
                {categories.map((opt) => (
                    <CategoryOption
                        opt={opt}
                        key={opt}
                        set_value={onChange}
                        set_expand={set_expand}
                    />
                ))}
            </ul>
        </div>
    )
}

export default CategorySelect