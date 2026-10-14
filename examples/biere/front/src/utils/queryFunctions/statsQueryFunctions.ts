import StatsService from "@/api/stats/statsService";

export const fetchStats = () => StatsService.get();
