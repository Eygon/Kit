import FeedService from "@/api/feed/feedService";

export const fetchFeedPage = (page: number) => FeedService.getPage(page);
