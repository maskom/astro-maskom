import { describe, it, expect, vi, beforeEach } from 'vitest';
import { knowledgeBaseService } from '../../src/lib/knowledge-base';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  range: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  rpc: vi.fn(() => mockSupabase),
};

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should generate a slug from title', () => {
      const title = 'How to Set Up Your Router';
      const expected = 'how-to-set-up-your-router';

      const result = knowledgeBaseService.generateSlug(title);

      expect(result).toBe(expected);
    });

    it('should handle special characters', () => {
      const title = 'Router Setup! @#$%';
      const expected = 'router-setup';

      const result = knowledgeBaseService.generateSlug(title);

      expect(result).toBe(expected);
    });

    it('should handle multiple spaces', () => {
      const title = 'Multiple   Spaces   Here';
      const expected = 'multiple-spaces-here';

      const result = knowledgeBaseService.generateSlug(title);

      expect(result).toBe(expected);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time correctly', () => {
      const content =
        'This is a test content with exactly twenty words. '.repeat(4);
      const expected = 1; // 80 words / 200 words per minute = 0.4, rounded up to 1

      const result = knowledgeBaseService.estimateReadingTime(content);

      expect(result).toBe(expected);
    });

    it('should handle empty content', () => {
      const content = '';
      const expected = 1;

      const result = knowledgeBaseService.estimateReadingTime(content);

      expect(result).toBe(expected);
    });
  });

  describe('extractExcerpt', () => {
    it('should extract excerpt from content', () => {
      const content =
        'This is a long content that should be truncated. '.repeat(10);
      const maxLength = 50;

      const result = knowledgeBaseService.extractExcerpt(content, maxLength);

      expect(result.length).toBeLessThanOrEqual(maxLength + 3); // +3 for "..."
      expect(result).toContain('...');
    });

    it('should return short content as-is', () => {
      const content = 'Short content';
      const maxLength = 50;

      const result = knowledgeBaseService.extractExcerpt(content, maxLength);

      expect(result).toBe(content);
    });

    it('should remove markdown formatting', () => {
      const content = '# Header\n\nThis is **bold** and *italic* text.';
      const maxLength = 100;

      const result = knowledgeBaseService.extractExcerpt(content, maxLength);

      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
    });
  });

  describe('getCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Getting Started',
          slug: 'getting-started',
          is_active: true,
        },
        {
          id: '2',
          name: 'Technical Support',
          slug: 'technical-support',
          is_active: true,
        },
      ];

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.then.mockImplementation(callback =>
        callback({ data: mockCategories, error: null })
      );

      const result = await knowledgeBaseService.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockSupabase.from).toHaveBeenCalledWith('kb_categories');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.order).toHaveBeenCalledWith('sort_order', {
        ascending: true,
      });
    });

    it('should handle errors', async () => {
      const mockError = new Error('Database error');

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.then.mockImplementation(callback =>
        callback({ data: null, error: mockError })
      );

      await expect(knowledgeBaseService.getCategories()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('searchArticles', () => {
    it('should search articles successfully', async () => {
      const mockSearchResults = [
        {
          id: '1',
          title: 'Router Setup Guide',
          slug: 'router-setup-guide',
          excerpt: 'Complete guide for setting up your router',
          rank: 0.9,
        },
      ];

      mockSupabase.rpc.mockReturnValue(mockSupabase);
      mockSupabase.then.mockImplementation(callback =>
        callback({ data: mockSearchResults, error: null })
      );

      const result = await knowledgeBaseService.searchArticles({
        query: 'router setup',
        limit: 10,
      });

      expect(result.articles).toEqual(mockSearchResults);
      expect(result.total).toBe(mockSearchResults.length);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_knowledge_base', {
        search_query: 'router setup',
        category_slug: null,
        limit_count: 10,
        offset_count: 0,
      });
    });
  });
});
