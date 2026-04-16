import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase_config.js';
import { REQUEST_CATEGORIES } from '../../constants.js';

export const verify_admin = async (uid) => {
  const user_doc = await getDoc(doc(db, 'users', uid));
  return user_doc.exists() && user_doc.data().role === 'admin';
};

const PENDING_STATUSES = ['pending'];
const IN_PROGRESS_STATUSES = ['in_progress', 'acknowledged'];
const RESOLVED_STATUSES = ['resolved'];

const compute_avg_hours = (resolved_requests) => {
  if (resolved_requests.length === 0) {
    return null;
  }

  const total_ms = resolved_requests.reduce((sum, r) => {
    const created = r.created_at?.toMillis?.() ?? 0;
    const updated = r.updated_at?.toMillis?.() ?? 0;
    return sum + Math.max(0, updated - created);
  }, 0);

  return total_ms / resolved_requests.length / (1000 * 60 * 60);
};

export const build_category_stats = (all_requests) => {
  return REQUEST_CATEGORIES.map((category) => {
    const cat_requests = all_requests.filter((r) => r.category === category);

    const pending = cat_requests.filter((r) =>
      PENDING_STATUSES.includes(r.status)
    );
    const in_progress = cat_requests.filter((r) =>
      IN_PROGRESS_STATUSES.includes(r.status)
    );
    const resolved = cat_requests.filter((r) =>
      RESOLVED_STATUSES.includes(r.status)
    );

    return {
      category,
      total: cat_requests.length,
      pending: pending.length,
      in_progress: in_progress.length,
      resolved: resolved.length,
      avg_hours: compute_avg_hours(resolved),
    };
  });
};

export const fetch_report_data = async () => {
  const snapshot = await getDocs(collection(db, 'service_requests'));
  const all_requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    stats: build_category_stats(all_requests),
    total_requests: all_requests.length,
  };
};

export const compute_summary = (stats) => {
  const total_resolved = stats.reduce((s, r) => s + r.resolved, 0);
  const total_pending = stats.reduce((s, r) => s + r.pending, 0);

  const categories_with_avg = stats.filter((r) => r.avg_hours !== null);
  const overall_avg_hours =
    categories_with_avg.length > 0
      ? categories_with_avg.reduce((s, r) => s + r.avg_hours, 0) /
        categories_with_avg.length
      : null;

  const worst_backlog =
    [...stats].sort((a, b) => b.pending - a.pending)[0] ?? null;

  return {
    total_resolved,
    total_pending,
    overall_avg_hours,
    worst_backlog: worst_backlog?.pending > 0 ? worst_backlog : null,
  };
};

export const format_resolution_time = (hours) => {
  if (hours === null) {
    return null;
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
};

export const get_resolution_class = (hours) => {
  if (hours === null) {
    return '';
  }
  if (hours <= 24) {
    return 'resolution_fast';
  }
  if (hours <= 72) {
    return 'resolution_medium';
  }
  return 'resolution_slow';
};