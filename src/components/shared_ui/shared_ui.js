// src/components/admin_messaging_review/SharedUI.js
import React from 'react'
import { STATUS_LABELS } from '../../utils/amr_untils.js'
import './shared_ui.css'

export function CategoryPill({ category }) {
	if (!category) {
		return null
	}
	return (
		<span className={`amr_cat_pill amr_cat_${category.toLowerCase()}`}>
			{category.replace('_', ' ')}
		</span>
	)
}

export function StatusChip({ status }) {
	if (!status) {
		return null
	}
	return (
		<span className={`amr_status_chip amr_status_${status}`}>
			{STATUS_LABELS[status] || status}
		</span>
	)
}
