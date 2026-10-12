/**
 * Name-based Avatar Utility
 * Generates dynamic, high-resolution, branded avatar URLs and deterministic color schemes based on a person's name.
 */

// Modern, curated Wanderlust color palette for name-based avatars
const AVATAR_PALETTE = [
    "FF385C", // Airbnb / Wanderlust Coral Red
    "E11D48", // Rose Red
    "7C3AED", // Violet
    "4F46E5", // Indigo
    "2563EB", // Royal Blue
    "0284C7", // Sky Blue
    "0D9488", // Teal
    "059669", // Emerald Green
    "D97706", // Amber
    "EA580C", // Tangerine
    "9333EA", // Purple
    "0891B2"  // Cyan
];

/**
 * Hash a string deterministically to a numeric value
 */
function hashString(str) {
    if (!str || typeof str !== "string") return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Deterministically get a hex background color based on name
 */
function getNameColor(name) {
    const cleanName = (name && typeof name === "string") ? name.trim() : "Wanderer";
    const index = hashString(cleanName) % AVATAR_PALETTE.length;
    return "#" + AVATAR_PALETTE[index];
}

/**
 * Extract 1 or 2 capital initials from a name
 * e.g., "Tejaswini Cheethirala" -> "TC", "teja" -> "T", "Jane Mary Doe" -> "JD"
 */
function getInitials(name) {
    if (!name || typeof name !== "string") return "W";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "W";
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate a dynamic avatar URL based on name
 */
function generateNameAvatar(name, size = 200) {
    const cleanName = (name && typeof name === "string" && name.trim()) ? name.trim() : "Wanderer";
    const hexColor = getNameColor(cleanName).replace("#", "");
    const initials = getInitials(cleanName);

    // High resolution UI-Avatars URL with bold text, rounded shape, and deterministic background color
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${hexColor}&color=ffffff&bold=true&size=${size}&format=png`;
}

/**
 * Get the proper avatar URL for a user object or name string
 * Ignores old generic default Unsplash placeholder images and falls back to name-based avatar
 */
function getAvatarUrl(userOrName, size = 200) {
    if (!userOrName) {
        return generateNameAvatar("Guest", size);
    }

    // If passed a user object
    if (typeof userOrName === "object") {
        const name = userOrName.displayName || userOrName.username || userOrName.name || "Wanderer";
        const currentAvatar = userOrName.avatar;

        // If avatar is present and is NOT the old generic unsplash placeholder
        if (
            currentAvatar &&
            typeof currentAvatar === "string" &&
            currentAvatar.trim() !== "" &&
            !currentAvatar.includes("photo-1535713875002-d1d0cf377fde")
        ) {
            return currentAvatar.trim();
        }

        return generateNameAvatar(name, size);
    }

    // If passed a string
    if (typeof userOrName === "string") {
        const trimmed = userOrName.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            if (!trimmed.includes("photo-1535713875002-d1d0cf377fde")) {
                return trimmed;
            }
        }
        return generateNameAvatar(trimmed, size);
    }

    return generateNameAvatar("Wanderer", size);
}

module.exports = {
    AVATAR_PALETTE,
    hashString,
    getNameColor,
    getInitials,
    generateNameAvatar,
    getAvatarUrl
};
