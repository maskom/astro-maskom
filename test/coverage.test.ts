// Tests for coverage service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { coverageService } from '../src/lib/coverage';
import { geocodingService } from '../src/lib/geocoding';

// Mock Supabase
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  }
}));

// Mock geocoding service
vi.mock('../src/lib/geocoding', () => ({
  geocodingService: {
    geocodeAddress: vi.fn(),
    validateIndonesianAddress: vi.fn(),
    getCurrentLocation: vi.fn(),
    reverseGeocode: vi.fn()
  }
}));

describe('CoverageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCoverageZones', () => {
    it('should fetch coverage zones', async () => {
      const mockZones = [
        {
          id: '1',
          name: 'Available',
          type: 'available',
          color: '#22c55e',
          priority: 3,
          is_active: true
        }
      ];

      const { supabase } = await import('../src/lib/supabase');
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockZones, error: null }))
          }))
        }))
      });

      const zones = await coverageService.getCoverageZones();
      expect(zones).toEqual(mockZones);
    });

    it('should handle errors when fetching zones', async () => {
      const { supabase } = await import('../src/lib/supabase');
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      });

      await expect(coverageService.getCoverageZones()).rejects.toThrow('Unable to load coverage zones');
    });
  });

  describe('checkAvailability', () => {
    it('should check availability for a valid address', async () => {
      const mockAddress = {
        original: 'Jakarta, Indonesia',
        formatted: 'Jakarta, Indonesia',
        components: {
          city: 'Jakarta',
          country: 'Indonesia'
        },
        coordinates: {
          lat: -6.2088,
          lng: 106.8456
        },
        confidence: 0.9
      };

      const mockValidation = {
        isValid: true,
        issues: [],
        suggestions: []
      };

      const mockCoverageData = [{
        is_available: true,
        zone_id: '1',
        area_id: '1',
        estimated_installation_days: 7
      }];

      const mockPackagesData = [{
        package_id: 'home-basic',
        is_available: true,
        installation_fee: 500000,
        monthly_fee: 299000,
        max_speed: 50
      }];

      vi.mocked(geocodingService.geocodeAddress).mockResolvedValue(mockAddress);
      vi.mocked(geocodingService.validateIndonesianAddress).mockReturnValue(mockValidation);

      const { supabase } = await import('../src/lib/supabase');
      supabase.rpc.mockImplementation((funcName) => {
        if (funcName === 'check_coverage_at_point') {
          return Promise.resolve({ data: mockCoverageData, error: null });
        }
        if (funcName === 'get_available_packages_at_point') {
          return Promise.resolve({ data: mockPackagesData, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const result = await coverageService.checkAvailability('Jakarta, Indonesia');

      expect(result.is_available).toBe(true);
      expect(result.available_packages).toHaveLength(1);
      expect(result.confidence).toBe(0.9);
    });

    it('should throw error for invalid address', async () => {
      vi.mocked(geocodingService.geocodeAddress).mockResolvedValue(null);

      await expect(coverageService.checkAvailability('Invalid address'))
        .rejects.toThrow('Address not found');
    });

    it('should throw error for invalid Indonesian address', async () => {
      const mockAddress = {
        original: 'New York, USA',
        formatted: 'New York, USA',
        components: {
          city: 'New York',
          country: 'USA'
        },
        coordinates: {
          lat: 40.7128,
          lng: -74.0060
        },
        confidence: 0.9
      };

      const mockValidation = {
        isValid: false,
        issues: ['Address is not in Indonesia'],
        suggestions: []
      };

      vi.mocked(geocodingService.geocodeAddress).mockResolvedValue(mockAddress);
      vi.mocked(geocodingService.validateIndonesianAddress).mockReturnValue(mockValidation);

      await expect(coverageService.checkAvailability('New York, USA'))
        .rejects.toThrow('Address validation failed: Address is not in Indonesia');
    });
  });

  describe('createLead', () => {
    it('should create a new lead', async () => {
      const leadData = {
        name: 'John Doe',
        email: 'john@example.com',
        address: 'Jakarta, Indonesia'
      };

      const mockLead = {
        id: '1',
        ...leadData,
        status: 'new',
        created_at: new Date().toISOString()
      };

      const { supabase } = await import('../src/lib/supabase');
      supabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockLead, error: null }))
          }))
        }))
      });

      const result = await coverageService.createLead(leadData);

      expect(result).toEqual(mockLead);
    });

    it('should handle errors when creating lead', async () => {
      const leadData = {
        name: 'John Doe',
        email: 'john@example.com',
        address: 'Jakarta, Indonesia'
      };

      const { supabase } = await import('../src/lib/supabase');
      supabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      });

      await expect(coverageService.createLead(leadData))
        .rejects.toThrow('Unable to save your information');
    });
  });

  describe('getCoverageMapData', () => {
    it('should fetch coverage map data', async () => {
      const mockZones = [
        { id: '1', name: 'Available', type: 'available', color: '#22c55e' }
      ];

      const mockAreas = [
        {
          id: '1',
          zone_id: '1',
          name: 'Jakarta',
          center_point: { coordinates: [106.8456, -6.2088] }
        }
      ];

      vi.spyOn(coverageService, 'getCoverageZones').mockResolvedValue(mockZones);
      vi.spyOn(coverageService, 'getCoverageAreas').mockResolvedValue(mockAreas);

      const result = await coverageService.getCoverageMapData();

      expect(result.zones).toEqual(mockZones);
      expect(result.areas).toHaveLength(1);
      expect(result.areas[0].zone).toEqual(mockZones[0]);
    });
  });
});