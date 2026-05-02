import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase_config.js'
import NotificationBell from '../notification_bell/notification_bell.js'
import './worker_nav_bar.css'

const NAV_ITEMS = [
    {
        key: 'queue',
        label: 'My Queue',
        to: '#',
        badge: 0,
        icon: (
            <svg className="nav_icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h8" />
            </svg>
        ),
    },
    {
        key: 'available',
        label: 'Available',
        to: '#',
        badge: 0,
        badgeStyle: 'ghost',
        icon: (
            <svg className="nav_icon" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 2" />
            </svg>
        ),
    },
    {
        key: 'history',
        label: 'History',
        to: '/worker-dashboard/history',
        icon: (
            <svg className="nav_icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z" />
                <path d="M8 5v3.5l2.5 1.5" />
            </svg>
        ),
    },
    {
        key: 'messages',
        label: 'Messages',
        to: '#',
        badge: 3,
        icon: (
            <svg className="nav_icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 2h12v9H9l-3 3v-3H2z" />
            </svg>
        ),
    },
]

function Worker_nav_bar({
    user = { initials: 'JD', name: 'Jane Doe', role: 'Field Worker' },
    requests = { claimed: 0, unclaimed: 0 },
    sections = { queue_onclick: null, available_onclick: null, messages_onclick: null },
    active_section = 'queue',
}) {
    const [scrolled, set_scrolled] = useState(false)
    // ADDED: State to manage the mobile menu
    const [mobile_menu_open, set_mobile_menu_open] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        const on_scroll = () => set_scrolled(window.scrollY > 10)
        window.addEventListener('scroll', on_scroll)
        return () => window.removeEventListener('scroll', on_scroll)
    }, [])

    const handle_logout = async () => {
        await signOut(auth)
        navigate('/login')
    }

    const has_unread = NAV_ITEMS.some(
        (item) =>
            (item.key === 'notifications' || item.key === 'messages') &&
            item.badge
    )

    const get_badge = (item) => {
        if (item.key === 'available') {
            return requests.unclaimed
        } else if (item.key === 'queue') {
            return requests.claimed
        } else {
            return item.badge
        }
    }

    const get_onclick = (item) => {
        if (item.key === 'available') {
            return sections.available_onclick
        } else if (item.key === 'queue') {
            return sections.queue_onclick
        } else if (item.key === 'messages') {
            return sections.messages_onclick
        } else {
            return null
        }
    }

    // Helper to close the menu and trigger the passed onClick
    const handle_nav_click = (item) => {
        set_mobile_menu_open(false)
        const click_handler = get_onclick(item)
        if (click_handler) click_handler()
    }

    return (
        <nav
            className={`wd_navbar ${scrolled ? 'wd_navbar_scrolled' : ''}`}
            aria-label="Worker dashboard navigation"
        >
            {/* ADDED: Mobile Hamburger Button */}
            <button 
                className="wd_mobile_menu_btn" 
                onClick={() => set_mobile_menu_open(!mobile_menu_open)}
                aria-label="Toggle navigation menu"
            >
                {mobile_menu_open ? '✖' : '☰'}
            </button>

            {/* Logo */}
            <Link to="/dashboard" className="wd_navbar_logo" onClick={() => set_mobile_menu_open(false)}>
                <span className="wd_logo_mark" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M2 4h12M2 8h8M2 12h10"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </span>
                <span className="wd_logo_text">
                    Report-wiza
                    <span className="wd_logo_role">Worker Portal</span>
                </span>
            </Link>

            {/* Divider */}
            <span className="wd_nav_divider" aria-hidden="true" />

            {/* Nav links - Added dynamic class for mobile sliding */}
            <div className={`wd_nav_links ${mobile_menu_open ? 'wd_nav_links_mobile_open' : ''}`}>
                {NAV_ITEMS.map((item) => {
                    const is_active = active_section === item.key

                    return (
                        <Link
                            key={item.key}
                            to={item.to}
                            onClick={() => handle_nav_click(item)}
                            className={`wd_nav_link ${is_active ? 'wd_nav_link_active' : ''}`}
                            aria-current={is_active ? 'page' : undefined}
                        >
                            {item.icon}
                            {item.label}
                            {get_badge(item) ? (
                                <span
                                    className={`wd_nav_badge ${
                                        item.badgeStyle === 'ghost'
                                            ? 'wd_nav_badge_ghost'
                                            : 'wd_nav_badge_amber'
                                    }`}
                                >
                                    {get_badge(item)}
                                </span>
                            ) : null}
                        </Link>
                    )
                })}
            </div>

            {/* Right cluster */}
            <div className="wd_nav_right">
                {/* Notification bell */}
                <NotificationBell userUid={user.uid} role={user.role} />

                {/* User chip */}
                <button
                    className="wd_user_chip"
                    type="button"
                    aria-label="User profile"
                >
                    <span className="wd_avatar">{user.initials}</span>
                    <span className="wd_user_info">
                        <span className="wd_user_name">{user.name}</span>
                        <span className="wd_user_role">{user.role}</span>
                    </span>
                </button>

                {/* Logout */}
                <button
                    className="wd_logout_btn"
                    type="button"
                    onClick={handle_logout}
                    aria-label="Log out"
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                        <path d="M11 11l3-3-3-3" />
                        <path d="M14 8H6" />
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    )
}

export default Worker_nav_bar