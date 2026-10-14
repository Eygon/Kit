import BadgeService from "@/api/badges/badgeService";

export const fetchBadges = () => BadgeService.getAll();
