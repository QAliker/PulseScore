export class ArticleDto {
  id: string;
  title: string;
  trailText: string | null;
  url: string;
  thumbnail: string | null;
  byline: string | null;
  published: string; // ISO 8601
  section: string;
}

export class NewsFeedDto {
  articles: ArticleDto[];
  page: number;
  totalPages: number;
}
