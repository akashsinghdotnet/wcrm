import api from './api';

const CACHE_KEY = 'wcrm_community_feed';
const DISMISSED_KEY = 'wcrm_dismissed_announcements';
const CACHE_TTL_MS = 3600 * 1000 * 6; // 6 hours

export const getDismissedAnnouncements = () => {
    try {
        return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    } catch {
        return [];
    }
};

export const dismissAnnouncement = (id) => {
    try {
        const dismissed = getDismissedAnnouncements();
        if (!dismissed.includes(id)) {
            dismissed.push(id);
            localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
        }
    } catch (e) {
        console.error('Error saving dismissed announcement', e);
    }
};

export const fetchCommunityFeed = async (config = {}) => {
    // Check cached feed
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS) {
                return data;
            }
        }
    } catch {
        /* ignore parse errors */
    }

    let feedData = null;

    // 1. Try external communityFeedUrl if provided
    const externalUrl = config?.community_feed_url;
    if (externalUrl && externalUrl.startsWith('http')) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(externalUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                feedData = await res.json();
            }
        } catch {
            // Silently fallback
        }
    }

    // 2. Fallback to backend /settings/community-feed
    if (!feedData) {
        try {
            const res = await api.get('/settings/community-feed');
            feedData = res.data;
        } catch {
            // Offline fallback
            feedData = {
                version: config?.app_version || '1.0.0',
                latestVersion: config?.app_version || '1.0.0',
                announcements: []
            };
        }
    }

    // Save to cache
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: feedData,
            timestamp: Date.now()
        }));
    } catch {
        /* storage full or disabled */
    }

    return feedData;
};
