// Coverage service for network availability checking and management

import { supabase } from './supabase';
import { geocodingService } from './geocoding';
import type { Package } from '../data/packages';

export interface CoverageZone {
  id: string;
  name: string;
  type: 'available' | 'coming_soon' | 'planned' | 'unavailable';
  description?: string;
  color: string;
  priority: number;
  estimated_available_date?: string;
  is_active: boolean;
}

export interface CoverageArea {
  id: string;
  zone_id: string;
  name: string;
  geometry: Record<string, unknown>; // GeoJSON geometry
  center_point: { lat: number; lng: number };
  address_data: Record<string, unknown>;
  installation_complexity: 'low' | 'medium' | 'high';
  estimated_installation_days: number;
  is_active: boolean;
}

export interface AvailabilityResult {
  is_available: boolean;
  zone?: CoverageZone;
  area?: CoverageArea;
  available_packages: AvailablePackage[];
  recommended_package?: AvailablePackage;
  estimated_installation_days?: number;
  estimated_available_date?: string;
  confidence: number;
}

export interface AvailablePackage {
  package_id: string;
  package_info?: Package;
  is_available: boolean;
  installation_fee: number;
  monthly_fee: number;
  max_speed: number;
  special_requirements?: string;
}

export interface CoverageCheck {
  id: string;
  address: string;
  formatted_address?: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  zone_id?: string;
  area_id?: string;
  available_packages: AvailablePackage[];
  recommended_package?: string;
  user_id?: string;
  created_at: string;
}

export interface CoverageLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  preferred_contact_method: 'email' | 'phone' | 'whatsapp';
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted';
  follow_up_date?: string;
  created_at: string;
}

class CoverageService {
  async getCoverageZones(): Promise<CoverageZone[]> {
    try {
      const { data, error } = await supabase
        .from('coverage_zones')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch coverage zones:', error);
      throw new Error('Unable to load coverage zones');
    }
  }

  async getCoverageAreas(zoneId?: string): Promise<CoverageArea[]> {
    try {
      let query = supabase
        .from('coverage_areas')
        .select(
          `
          *,
          coverage_zones (
            id,
            name,
            type,
            color,
            priority
          )
        `
        )
        .eq('is_active', true);

      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(area => ({
        ...area,
        center_point: {
          lat: area.center_point.coordinates[1],
          lng: area.center_point.coordinates[0],
        },
      }));
    } catch (error) {
      console.error('Failed to fetch coverage areas:', error);
      throw new Error('Unable to load coverage areas');
    }
  }

  async checkAvailability(address: string): Promise<AvailabilityResult> {
    try {
      // First, geocode the address
      const normalizedAddress = await geocodingService.geocodeAddress(address);
      if (!normalizedAddress) {
        throw new Error(
          'Address not found. Please check the address and try again.'
        );
      }

      // Validate Indonesian address
      const validation =
        geocodingService.validateIndonesianAddress(normalizedAddress);
      if (!validation.isValid) {
        throw new Error(
          `Address validation failed: ${validation.issues.join(', ')}`
        );
      }

      // Check coverage using the database function
      const { data: coverageData, error: coverageError } = await supabase.rpc(
        'check_coverage_at_point',
        {
          lat: normalizedAddress.coordinates.lat,
          lng: normalizedAddress.coordinates.lng,
        }
      );

      if (coverageError) throw coverageError;

      // Get available packages for this location
      const { data: packagesData, error: packagesError } = await supabase.rpc(
        'get_available_packages_at_point',
        {
          lat: normalizedAddress.coordinates.lat,
          lng: normalizedAddress.coordinates.lng,
        }
      );

      if (packagesError) throw packagesError;

      // Get package details
      const availablePackages: AvailablePackage[] = (packagesData || []).map(
        pkg => ({
          ...pkg,
          package_info: this.getPackageInfo(pkg.package_id),
        })
      );

      // Get zone details if available
      let zone: CoverageZone | undefined;
      if (coverageData && coverageData.length > 0) {
        const coverage = coverageData[0];
        const { data: zoneData } = await supabase
          .from('coverage_zones')
          .select('*')
          .eq('id', coverage.zone_id)
          .single();

        zone = zoneData;
      }

      // Get area details if available
      let area: CoverageArea | undefined;
      if (coverageData && coverageData.length > 0 && coverageData[0].area_id) {
        const { data: areaData } = await supabase
          .from('coverage_areas')
          .select('*')
          .eq('id', coverageData[0].area_id)
          .single();

        if (areaData) {
          area = {
            ...areaData,
            center_point: {
              lat: areaData.center_point.coordinates[1],
              lng: areaData.center_point.coordinates[0],
            },
          };
        }
      }

      // Determine recommended package
      const recommendedPackage = this.getRecommendedPackage(availablePackages);

      // Log the availability check
      await this.logAvailabilityCheck({
        address,
        formatted_address: normalizedAddress.formatted,
        latitude: normalizedAddress.coordinates.lat,
        longitude: normalizedAddress.coordinates.lng,
        is_available:
          coverageData && coverageData.length > 0
            ? coverageData[0].is_available
            : false,
        zone_id: zone?.id,
        area_id: area?.id,
        availablePackages: availablePackages.map(pkg => pkg.package_id),
        recommendedPackage: recommendedPackage?.package_id,
      });

      return {
        is_available:
          coverageData && coverageData.length > 0
            ? coverageData[0].is_available
            : false,
        zone,
        area,
        available_packages: availablePackages,
        recommended_package: recommendedPackage?.package_id,
        estimated_installation_days: area?.estimated_installation_days,
        estimated_available_date: zone?.estimated_available_date,
        confidence: normalizedAddress.confidence,
      };
    } catch (error) {
      console.error('Availability check failed:', error);
      throw error;
    }
  }

  async checkAvailabilityByCoordinates(
    lat: number,
    lng: number
  ): Promise<AvailabilityResult> {
    try {
      // Get address from coordinates
      const address = await geocodingService.reverseGeocode(lat, lng);

      // Check coverage using the database function
      const { data: coverageData, error: coverageError } = await supabase.rpc(
        'check_coverage_at_point',
        { lat, lng }
      );

      if (coverageError) throw coverageError;

      // Get available packages
      const { data: packagesData, error: packagesError } = await supabase.rpc(
        'get_available_packages_at_point',
        { lat, lng }
      );

      if (packagesError) throw packagesError;

      const availablePackages: AvailablePackage[] = (packagesData || []).map(
        pkg => ({
          ...pkg,
          package_info: this.getPackageInfo(pkg.package_id),
        })
      );

      // Get zone and area details
      let zone: CoverageZone | undefined;
      let area: CoverageArea | undefined;

      if (coverageData && coverageData.length > 0) {
        const coverage = coverageData[0];

        const { data: zoneData } = await supabase
          .from('coverage_zones')
          .select('*')
          .eq('id', coverage.zone_id)
          .single();

        zone = zoneData;

        if (coverage.area_id) {
          const { data: areaData } = await supabase
            .from('coverage_areas')
            .select('*')
            .eq('id', coverage.area_id)
            .single();

          if (areaData) {
            area = {
              ...areaData,
              center_point: {
                lat: areaData.center_point.coordinates[1],
                lng: areaData.center_point.coordinates[0],
              },
            };
          }
        }
      }

      const recommendedPackage = this.getRecommendedPackage(availablePackages);

      return {
        is_available:
          coverageData && coverageData.length > 0
            ? coverageData[0].is_available
            : false,
        zone,
        area,
        available_packages: availablePackages,
        recommended_package: recommendedPackage?.package_id,
        estimated_installation_days: area?.estimated_installation_days,
        estimated_available_date: zone?.estimated_available_date,
        confidence: address?.confidence || 0.5,
      };
    } catch (error) {
      console.error('Availability check by coordinates failed:', error);
      throw error;
    }
  }

  async logAvailabilityCheck(checkData: {
    address: string;
    formatted_address?: string;
    latitude: number;
    longitude: number;
    is_available: boolean;
    zone_id?: string;
    area_id?: string;
    availablePackages: string[];
    recommendedPackage?: string;
    user_id?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('availability_checks').insert({
        address: checkData.address,
        formatted_address: checkData.formatted_address,
        latitude: checkData.latitude,
        longitude: checkData.longitude,
        is_available: checkData.is_available,
        zone_id: checkData.zone_id,
        area_id: checkData.area_id,
        available_packages: checkData.availablePackages,
        recommended_package: checkData.recommendedPackage,
        user_id: checkData.user_id,
        point: `POINT(${checkData.longitude} ${checkData.latitude})`,
        ip_address: await this.getClientIP(),
        user_agent:
          typeof window !== 'undefined' ? window.navigator.userAgent : null,
        session_id: this.getSessionId(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log availability check:', error);
      // Don't throw here as this is not critical for the main functionality
    }
  }

  async createLead(leadData: {
    name: string;
    email: string;
    phone?: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    preferred_contact_method?: 'email' | 'phone' | 'whatsapp';
  }): Promise<CoverageLead> {
    try {
      const { data, error } = await supabase
        .from('coverage_leads')
        .insert({
          ...leadData,
          preferred_contact_method:
            leadData.preferred_contact_method || 'email',
          point:
            leadData.latitude && leadData.longitude
              ? `POINT(${leadData.longitude} ${leadData.latitude})`
              : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create lead:', error);
      throw new Error('Unable to save your information. Please try again.');
    }
  }

  async getAvailabilityHistory(
    userId?: string,
    limit: number = 10
  ): Promise<CoverageCheck[]> {
    try {
      let query = supabase
        .from('availability_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch availability history:', error);
      return [];
    }
  }

  private getPackageInfo(packageId: string): Package | undefined {
    // This would typically fetch from your packages data
    // For now, return a basic structure
    const packages: Record<string, Package> = {
      'home-basic': {
        id: 'home-basic',
        name: 'Home Basic',
        description: 'Perfect for small households',
        price: 299000,
        speed: 50,
        features: ['50 Mbps', 'Unlimited Data', 'Free Installation'],
        popular: false,
      },
      'home-premium': {
        id: 'home-premium',
        name: 'Home Premium',
        description: 'Ideal for larger families and power users',
        price: 599000,
        speed: 100,
        features: [
          '100 Mbps',
          'Unlimited Data',
          'Free Installation',
          'Priority Support',
        ],
        popular: true,
      },
    };

    return packages[packageId];
  }

  private getRecommendedPackage(
    packages: AvailablePackage[]
  ): AvailablePackage | undefined {
    if (packages.length === 0) return undefined;

    // Simple recommendation logic: choose the package with best value (speed/price ratio)
    return packages.reduce((best, current) => {
      const currentValue = current.max_speed / current.monthly_fee;
      const bestValue = best.max_speed / best.monthly_fee;
      return currentValue > bestValue ? current : best;
    });
  }

  private async getClientIP(): Promise<string | null> {
    // In a real implementation, you might use a service like ipapi.co
    // For now, return null
    return null;
  }

  private getSessionId(): string {
    // Generate or retrieve session ID for tracking
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('coverage_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('coverage_session_id', sessionId);
      }
      return sessionId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getCoverageMapData(): Promise<{
    zones: CoverageZone[];
    areas: (CoverageArea & { zone: CoverageZone })[];
  }> {
    try {
      const zones = await this.getCoverageZones();
      const areas = await this.getCoverageAreas();

      const areasWithZones = areas.map(area => {
        const zone = zones.find(z => z.id === area.zone_id);
        return { ...area, zone: zone };
      });

      return { zones, areas: areasWithZones };
    } catch (error) {
      console.error('Failed to fetch coverage map data:', error);
      throw new Error('Unable to load coverage map data');
    }
  }
}

export const coverageService = new CoverageService();
export default coverageService;
