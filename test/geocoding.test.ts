// Tests for geocoding service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { geocodingService } from '../src/lib/geocoding';

// Mock fetch
global.fetch = vi.fn();

describe('GeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchAddresses', () => {
    it('should search addresses with valid query', async () => {
      const mockResponse = [
        {
          place_id: 123,
          display_name: 'Jakarta, Indonesia',
          lat: '-6.2088',
          lon: '106.8456',
          address: {
            city: 'Jakarta',
            country: 'Indonesia'
          },
          importance: 0.9
        }
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const results = await geocodingService.searchAddresses('Jakarta');

      expect(results).toHaveLength(1);
      expect(results[0].display_name).toBe('Jakarta, Indonesia');
      expect(results[0].lat).toBe(-6.2088);
      expect(results[0].lng).toBe(106.8456);
    });

    it('should return empty array for short query', async () => {
      const results = await geocodingService.searchAddresses('Ja');
      expect(results).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(geocodingService.searchAddresses('Jakarta'))
        .rejects.toThrow('Failed to search addresses');
    });

    it('should use rate limiting', async () => {
      const mockResponse = [];
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const startTime = Date.now();
      await geocodingService.searchAddresses('Jakarta');
      await geocodingService.searchAddresses('Surabaya');
      const endTime = Date.now();

      // Should have at least 1 second delay between requests
      expect(endTime - startTime).toBeGreaterThan(1000);
    });
  });

  describe('geocodeAddress', () => {
    it('should geocode valid address', async () => {
      const mockResponse = [
        {
          place_id: 123,
          display_name: 'Jakarta, Indonesia',
          lat: '-6.2088',
          lon: '106.8456',
          address: {
            city: 'Jakarta',
            country: 'Indonesia'
          },
          importance: 0.9
        }
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geocodingService.geocodeAddress('Jakarta, Indonesia');

      expect(result).not.toBeNull();
      expect(result!.formatted).toBe('Jakarta, Indonesia');
      expect(result!.coordinates.lat).toBe(-6.2088);
      expect(result!.coordinates.lng).toBe(106.8456);
      expect(result!.components.city).toBe('Jakarta');
    });

    it('should return null for address not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const result = await geocodingService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });

    it('should return null for short address', async () => {
      const result = await geocodingService.geocodeAddress('Ja');
      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode valid coordinates', async () => {
      const mockResponse = {
        place_id: 123,
        display_name: 'Jakarta, Indonesia',
        lat: '-6.2088',
        lon: '106.8456',
        address: {
          city: 'Jakarta',
          country: 'Indonesia'
        },
        importance: 0.9
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geocodingService.reverseGeocode(-6.2088, 106.8456);

      expect(result).not.toBeNull();
      expect(result!.formatted).toBe('Jakarta, Indonesia');
      expect(result!.coordinates.lat).toBe(-6.2088);
      expect(result!.coordinates.lng).toBe(106.8456);
    });

    it('should return null for invalid coordinates', async () => {
      const mockResponse = {
        error: 'Unable to geocode'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geocodingService.reverseGeocode(0, 0);

      expect(result).toBeNull();
    });
  });

  describe('validateIndonesianAddress', () => {
    it('should validate correct Indonesian address', () => {
      const address = {
        original: 'Jakarta, Indonesia',
        formatted: 'Jakarta, Indonesia',
        components: {
          city: 'Jakarta',
          state: 'DKI Jakarta',
          postcode: '12345',
          country: 'Indonesia'
        },
        coordinates: { lat: -6.2088, lng: 106.8456 },
        confidence: 0.9
      };

      const validation = geocodingService.validateIndonesianAddress(address);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should reject non-Indonesian address', () => {
      const address = {
        original: 'New York, USA',
        formatted: 'New York, USA',
        components: {
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country: 'United States'
        },
        coordinates: { lat: 40.7128, lng: -74.0060 },
        confidence: 0.9
      };

      const validation = geocodingService.validateIndonesianAddress(address);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Address is not in Indonesia');
    });

    it('should reject invalid postcode', () => {
      const address = {
        original: 'Jakarta, Indonesia',
        formatted: 'Jakarta, Indonesia',
        components: {
          city: 'Jakarta',
          state: 'DKI Jakarta',
          postcode: '1234', // Invalid - should be 5 digits
          country: 'Indonesia'
        },
        coordinates: { lat: -6.2088, lng: 106.8456 },
        confidence: 0.9
      };

      const validation = geocodingService.validateIndonesianAddress(address);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Invalid Indonesian postcode format');
    });

    it('should handle missing city', () => {
      const address = {
        original: 'Indonesia',
        formatted: 'Indonesia',
        components: {
          state: 'DKI Jakarta',
          country: 'Indonesia'
        },
        coordinates: { lat: -6.2088, lng: 106.8456 },
        confidence: 0.9
      };

      const validation = geocodingService.validateIndonesianAddress(address);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('City is missing');
    });
  });

  describe('formatIndonesianAddress', () => {
    it('should format complete Indonesian address', () => {
      const address = {
        original: 'Test Address',
        formatted: 'Test Address',
        components: {
          house_number: '123',
          street: 'Jalan Test',
          suburb: 'Menteng',
          city: 'Jakarta',
          state: 'DKI Jakarta',
          postcode: '12345',
          country: 'Indonesia'
        },
        coordinates: { lat: -6.2088, lng: 106.8456 },
        confidence: 0.9
      };

      const formatted = geocodingService.formatIndonesianAddress(address);

      expect(formatted).toBe('123 Jalan Test, Menteng, Jakarta, DKI Jakarta, 12345, Indonesia');
    });

    it('should format partial address', () => {
      const address = {
        original: 'Test Address',
        formatted: 'Test Address',
        components: {
          street: 'Jalan Test',
          city: 'Jakarta',
          country: 'Indonesia'
        },
        coordinates: { lat: -6.2088, lng: 106.8456 },
        confidence: 0.9
      };

      const formatted = geocodingService.formatIndonesianAddress(address);

      expect(formatted).toBe('Jalan Test, Jakarta, Indonesia');
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location', async () => {
      const mockPosition = {
        coords: {
          latitude: -6.2088,
          longitude: 106.8456
        }
      };

      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => success(mockPosition))
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true
      });

      const result = await geocodingService.getCurrentLocation();

      expect(result).toEqual({
        lat: -6.2088,
        lng: 106.8456
      });
    });

    it('should return null when geolocation is not available', async () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true
      });

      const result = await geocodingService.getCurrentLocation();

      expect(result).toBeNull();
    });

    it('should return null on geolocation error', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success, error) => error(new Error('Location denied')))
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true
      });

      const result = await geocodingService.getCurrentLocation();

      expect(result).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache search results', async () => {
      const mockResponse = [
        {
          place_id: 123,
          display_name: 'Jakarta, Indonesia',
          lat: '-6.2088',
          lon: '106.8456',
          address: { city: 'Jakarta', country: 'Indonesia' },
          importance: 0.9
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call
      await geocodingService.searchAddresses('Jakarta');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await geocodingService.searchAddresses('Jakarta');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      const mockResponse = [
        {
          place_id: 123,
          display_name: 'Jakarta, Indonesia',
          lat: '-6.2088',
          lon: '106.8456',
          address: { city: 'Jakarta', country: 'Indonesia' },
          importance: 0.9
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call
      await geocodingService.searchAddresses('Jakarta');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      geocodingService.clearCache();

      // Second call should make new request
      await geocodingService.searchAddresses('Jakarta');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});