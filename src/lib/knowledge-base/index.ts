import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { Database } from '../database.types';

// Use database types directly
export type KBCategory = Database['public']['Tables']['kb_categories']['Row'];
export type KBArticle = Database['public']['Tables']['kb_articles']['Row'];
export type KBRating = Database['public']['Tables']['kb_ratings']['Row'];
export type KBSearchLog = Database['public']['Tables']['kb_search_logs']['Row'];
export type KBArticleHistory =
  Database['public']['Tables']['kb_article_history']['Row'];
export type KBAttachment =
  Database['public']['Tables']['kb_attachments']['Row'];

export type KBCategoryInsert =
  Database['public']['Tables']['kb_categories']['Insert'];
export type KBArticleInsert =
  Database['public']['Tables']['kb_articles']['Insert'];
export type KBRatingInsert =
  Database['public']['Tables']['kb_ratings']['Insert'];
export type KBSearchLogInsert =
  Database['public']['Tables']['kb_search_logs']['Insert'];

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category_name: string;
  category_slug: string;
  content: string;
  tags: string[] | null;
  reading_time_minutes: number | null;
  difficulty_level: string | null;
  view_count: number;
  helpful_count: number;
  published_at: string | null;
  rank: number;
}

export interface ArticleWithCategory extends KBArticle {
  category: KBCategory;
  author: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

export interface KnowledgeBaseStats {
  total_articles: number;
  total_categories: number;
  total_views: number;
  total_ratings: number;
  average_rating: number;
  featured_articles: number;
  recent_articles: number;
}

export interface SearchOptions {
  query: string;
  category_slug?: string | null;
  limit?: number;
  offset?: number;
  difficulty_level?: string;
  tags?: string[];
}

export interface PopularArticle {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  helpful_count: number;
  category_name: string;
  published_at: string | null;
}

class KnowledgeBaseService {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Categories
  async getCategories(activeOnly: boolean = true): Promise<KBCategory[]> {
    try {
      let query = this.supabase
        .from('kb_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch knowledge base categories', { error });
      throw error;
    }
  }

  async getCategoryBySlug(slug: string): Promise<KBCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('kb_categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch category by slug', { slug, error });
      throw error;
    }
  }

  async createCategory(category: KBCategoryInsert): Promise<KBCategory> {
    try {
      const { data, error } = await this.supabase
        .from('kb_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create category', { category, error });
      throw error;
    }
  }

  async updateCategory(
    id: string,
    updates: Partial<KBCategory>
  ): Promise<KBCategory> {
    try {
      const { data, error } = await this.supabase
        .from('kb_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update category', { id, updates, error });
      throw error;
    }
  }

  // Articles
  async getArticles(
    options: {
      category_slug?: string;
      status?: string;
      featured?: boolean;
      limit?: number;
      offset?: number;
      sort_by?: 'created_at' | 'published_at' | 'view_count' | 'title';
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<ArticleWithCategory[]> {
    try {
      let query = this.supabase.from('kb_articles').select(`
          *,
          category:kb_categories(*),
          author:auth.users(id, email, name)
        `);

      if (options.category_slug) {
        query = query.eq('category.slug', options.category_slug);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      } else {
        query = query.eq('status', 'published');
      }

      if (options.featured !== undefined) {
        query = query.eq('featured', options.featured);
      }

      // Set default sorting
      const sortBy = options.sort_by || 'published_at';
      const sortOrder = options.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 20) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch articles', { options, error });
      throw error;
    }
  }

  async getArticleBySlug(
    slug: string,
    incrementViews: boolean = true
  ): Promise<ArticleWithCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('kb_articles')
        .select(
          `
          *,
          category:kb_categories(*),
          author:auth.users(id, email, name)
        `
        )
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      // Increment view count if requested
      if (incrementViews && data) {
        await this.incrementViewCount(data.id);
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch article by slug', { slug, error });
      throw error;
    }
  }

  async getArticleById(id: string): Promise<ArticleWithCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('kb_articles')
        .select(
          `
          *,
          category:kb_categories(*),
          author:auth.users(id, email, name)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch article by id', { id, error });
      throw error;
    }
  }

  async createArticle(article: KBArticleInsert): Promise<KBArticle> {
    try {
      const { data, error } = await this.supabase
        .from('kb_articles')
        .insert([article])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create article', { article, error });
      throw error;
    }
  }

  async updateArticle(
    id: string,
    updates: Partial<KBArticle>
  ): Promise<KBArticle> {
    try {
      const { data, error } = await this.supabase
        .from('kb_articles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update article', { id, updates, error });
      throw error;
    }
  }

  async deleteArticle(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('kb_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete article', { id, error });
      throw error;
    }
  }

  async incrementViewCount(articleId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_view_count', {
        article_id: articleId,
      });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to increment view count', { articleId, error });
      // Don't throw error for view count updates
    }
  }

  // Search
  async searchArticles(
    options: SearchOptions
  ): Promise<{ articles: SearchResult[]; total: number }> {
    try {
      const { data, error } = await this.supabase.rpc('search_knowledge_base', {
        search_query: options.query,
        category_slug: options.category_slug || null,
        limit_count: options.limit || 20,
        offset_count: options.offset || 0,
      });

      if (error) throw error;

      // Log the search
      await this.logSearch(options.query, data?.length || 0);

      return {
        articles: data || [],
        total: data?.length || 0,
      };
    } catch (error) {
      logger.error('Failed to search articles', { options, error });
      throw error;
    }
  }

  async getPopularArticles(limit: number = 10): Promise<PopularArticle[]> {
    try {
      const { data, error } = await this.supabase
        .from('kb_articles')
        .select(
          `
          id,
          title,
          slug,
          view_count,
          helpful_count,
          published_at,
          category:kb_categories(name)
        `
        )
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch popular articles', { limit, error });
      throw error;
    }
  }

  async getRelatedArticles(
    articleId: string,
    limit: number = 5
  ): Promise<ArticleWithCategory[]> {
    try {
      // First get the current article to find related ones
      const currentArticle = await this.getArticleById(articleId);
      if (!currentArticle) return [];

      // Find articles in the same category or with similar tags
      const { data, error } = await this.supabase
        .from('kb_articles')
        .select(
          `
          *,
          category:kb_categories(*),
          author:auth.users(id, email, name)
        `
        )
        .eq('status', 'published')
        .eq('category_id', currentArticle.category_id)
        .neq('id', articleId)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch related articles', { articleId, error });
      throw error;
    }
  }

  // Ratings
  async rateArticle(rating: KBRatingInsert): Promise<KBRating> {
    try {
      const { data, error } = await this.supabase
        .from('kb_ratings')
        .insert([rating])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to rate article', { rating, error });
      throw error;
    }
  }

  async getArticleRatings(articleId: string): Promise<KBRating[]> {
    try {
      const { data, error } = await this.supabase
        .from('kb_ratings')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch article ratings', { articleId, error });
      throw error;
    }
  }

  async getUserRating(
    articleId: string,
    userId: string
  ): Promise<KBRating | null> {
    try {
      const { data, error } = await this.supabase
        .from('kb_ratings')
        .select('*')
        .eq('article_id', articleId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error) {
      logger.error('Failed to fetch user rating', { articleId, userId, error });
      throw error;
    }
  }

  // Analytics
  async getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
    try {
      const { data: articles, error: articlesError } = await this.supabase
        .from('kb_articles')
        .select('view_count, helpful_count, created_at, published_at')
        .eq('status', 'published');

      if (articlesError) throw articlesError;

      const { data: categories, error: categoriesError } = await this.supabase
        .from('kb_categories')
        .select('id')
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;

      const { data: ratings, error: ratingsError } = await this.supabase
        .from('kb_ratings')
        .select('rating');

      if (ratingsError) throw ratingsError;

      const totalViews =
        articles?.reduce(
          (sum, article) => sum + (article.view_count || 0),
          0
        ) || 0;

      const averageRating =
        ratings?.length > 0
          ? ratings.reduce((sum, rating) => sum + rating.rating, 0) /
            ratings.length
          : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentArticles =
        articles?.filter(
          article =>
            article.published_at &&
            new Date(article.published_at) > thirtyDaysAgo
        ).length || 0;

      const featuredArticles =
        articles?.filter(article => article.featured).length || 0;

      return {
        total_articles: articles?.length || 0,
        total_categories: categories?.length || 0,
        total_views: totalViews,
        total_ratings: ratings?.length || 0,
        average_rating: Math.round(averageRating * 10) / 10,
        featured_articles: featuredArticles,
        recent_articles: recentArticles,
      };
    } catch (error) {
      logger.error('Failed to fetch knowledge base stats', { error });
      throw error;
    }
  }

  // Search logging
  async logSearch(
    query: string,
    resultsCount: number,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const searchLog: KBSearchLogInsert = {
        query,
        results_count: resultsCount,
        user_id: userId || null,
        ip_address: '127.0.0.1', // Would be extracted from request in real implementation
        user_agent: 'Knowledge Base Service',
        session_id: sessionId || null,
      };

      const { error } = await this.supabase
        .from('kb_search_logs')
        .insert([searchLog]);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to log search', { query, resultsCount, error });
      // Don't throw error for logging
    }
  }

  // Utility functions
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .trim();
  }

  estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  extractExcerpt(content: string, maxLength: number = 150): string {
    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/\n+/g, ' ') // Newlines
      .trim();

    if (plainText.length <= maxLength) return plainText;

    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
export default knowledgeBaseService;
