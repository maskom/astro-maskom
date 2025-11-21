// Geocoding service for address search and validation
// Uses OpenStreetMap Nominatim API for free geocoding

export interface GeocodingResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
  class: string;
  type: string;
  importance: number;
}

export interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  confidence: number;
}

export interface NormalizedAddress {
  original: string;
  formatted: string;
  components: {
    house_number?: string;
    street?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  confidence: number;
}

class GeocodingService {
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  private readonly REQUEST_DELAY = 1000; // 1 second between requests (rate limiting)
  private lastRequestTime = 0;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getCacheKey(query: string, params: Record<string, string> = {}): string {
    return `${query}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.requestCache.set(key, { data, timestamp: Date.now() });
    
    // Clean old cache entries
    if (this.requestCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.requestCache.entries()) {
        if (now - v.timestamp > this.CACHE_DURATION) {
          this.requestCache.delete(k);
        }
      }
    }
  }

  async searchAddresses(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const cacheKey = this.getCacheKey('search', { query, limit: limit.toString() });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: limit.toString(),
        countrycodes: 'id', // Limit to Indonesia
        accept: 'application/json'
      });

      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/search?${params}`,
        {
          headers: {
            'User-Agent': 'MaskomNetwork/1.0 (geocoding-service; contact@maskom.network)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const results: GeocodingResult[] = await response.json();
      
      const suggestions: AddressSuggestion[] = results.map(result => ({
        display_name: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        address: {
          house_number: result.address.house_number,
          road: result.address.road,
          suburb: result.address.suburb,
          city: result.address.city,
          state: result.address.state,
          postcode: result.address.postcode,
          country: result.address.country
        },
        confidence: result.importance
      }));

      this.setCache(cacheKey, suggestions);
      return suggestions;

    } catch (error) {
      console.error('Address search failed:', error);
      throw new Error('Failed to search addresses. Please try again.');
    }
  }

  async geocodeAddress(address: string): Promise<NormalizedAddress | null> {
    if (!address || address.trim().length < 3) {
      return null;
    }

    const cacheKey = this.getCacheKey('geocode', { address });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: 'id'
      });

      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/search?${params}`,
        {
          headers: {
            'User-Agent': 'MaskomNetwork/1.0 (geocoding-service; contact@maskom.network)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const results: GeocodingResult[] = await response.json();
      
      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      
      const normalized: NormalizedAddress = {
        original: address,
        formatted: result.display_name,
        components: {
          house_number: result.address.house_number,
          street: result.address.road,
          suburb: result.address.suburb,
          city: result.address.city || result.address.county,
          state: result.address.state,
          postcode: result.address.postcode,
          country: result.address.country
        },
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        confidence: result.importance
      };

      this.setCache(cacheKey, normalized);
      return normalized;

    } catch (error) {
      console.error('Address geocoding failed:', error);
      throw new Error('Failed to geocode address. Please check the address and try again.');
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<NormalizedAddress | null> {
    const cacheKey = this.getCacheKey('reverse', { lat: lat.toString(), lng: lng.toString() });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        zoom: '18'
      });

      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/reverse?${params}`,
        {
          headers: {
            'User-Agent': 'MaskomNetwork/1.0 (geocoding-service; contact@maskom.network)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result || result.error) {
        return null;
      }

      const normalized: NormalizedAddress = {
        original: `${lat}, ${lng}`,
        formatted: result.display_name,
        components: {
          house_number: result.address.house_number,
          street: result.address.road,
          suburb: result.address.suburb,
          city: result.address.city || result.address.county,
          state: result.address.state,
          postcode: result.address.postcode,
          country: result.address.country
        },
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        confidence: result.importance || 0.5
      };

      this.setCache(cacheKey, normalized);
      return normalized;

    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error('Failed to get address for coordinates. Please try again.');
    }
  }

  validateIndonesianAddress(address: NormalizedAddress): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check if country is Indonesia
    if (address.components.country !== 'Indonesia' && address.components.country !== 'Indonesia') {
      issues.push('Address is not in Indonesia');
    }

    // Check for required components
    if (!address.components.city) {
      issues.push('City is missing');
      suggestions.push('Please include the city name');
    }

    if (!address.components.state) {
      issues.push('State/province is missing');
      suggestions.push('Please include the state or province');
    }

    // Check Indonesian postcode format (5 digits)
    if (address.components.postcode && !/^\d{5}$/.test(address.components.postcode)) {
      issues.push('Invalid Indonesian postcode format');
      suggestions.push('Indonesian postcodes should be 5 digits');
    }

    // Common Indonesian city names for validation
    const indonesianCities = [
      'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar',
      'Palembang', 'Tangerang', 'South Tangerang', 'Depok', 'Bekasi',
      'Bogor', 'Batam', 'Pekanbaru', 'Bandar Lampung', 'Malang', 'Yogyakarta'
    ];

    if (address.components.city && !indonesianCities.some(city => 
      address.components.city?.toLowerCase().includes(city.toLowerCase()))) {
      suggestions.push('Verify the city name is correct');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  formatIndonesianAddress(address: NormalizedAddress): string {
    const parts: string[] = [];

    if (address.components.house_number && address.components.street) {
      parts.push(`${address.components.house_number} ${address.components.street}`);
    } else if (address.components.street) {
      parts.push(address.components.street);
    }

    if (address.components.suburb) {
      parts.push(address.components.suburb);
    }

    if (address.components.city) {
      parts.push(address.components.city);
    }

    if (address.components.state) {
      parts.push(address.components.state);
    }

    if (address.components.postcode) {
      parts.push(address.components.postcode);
    }

    if (address.components.country) {
      parts.push(address.components.country);
    }

    return parts.join(', ');
  }

  async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  clearCache(): void {
    this.requestCache.clear();
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;