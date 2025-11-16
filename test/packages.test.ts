import { describe, it, expect } from 'vitest';
import {
  allPackages,
  getMainPackages,
  getHomePackages,
  getSohoPackages,
  getCorporatePackages,
  getLandingPackages,
  getFeaturedPackages,
  getPopularPackages,
  getPackageById,
  validatePackage,
  validatePackages,
} from '../src/data/packages';

describe('Package Data Structure', () => {
  it('should have all packages with valid structure', () => {
    expect(allPackages.length).toBeGreaterThan(0);
    expect(validatePackages(allPackages)).toBe(true);
  });

  it('should return correct main packages', () => {
    const mainPackages = getMainPackages();
    expect(mainPackages.length).toBe(3); // home-access, soho, corporate
    expect(mainPackages.every(pkg => pkg.type === 'main')).toBe(true);
  });

  it('should return correct home packages', () => {
    const homePackages = getHomePackages();
    expect(homePackages.length).toBe(3); // home-a, home-b, home-c
    expect(
      homePackages.every(
        pkg => pkg.category === 'home' && pkg.type === 'detailed'
      )
    ).toBe(true);
  });

  it('should return correct SOHO packages', () => {
    const sohoPackages = getSohoPackages();
    expect(sohoPackages.length).toBe(3); // soho-pro, soho-business, soho-enterprise
    expect(
      sohoPackages.every(
        pkg => pkg.category === 'soho' && pkg.type === 'detailed'
      )
    ).toBe(true);
  });

  it('should return correct corporate packages', () => {
    const corporatePackages = getCorporatePackages();
    expect(corporatePackages.length).toBe(3); // corporate-business, corporate-enterprise, corporate-custom
    expect(
      corporatePackages.every(
        pkg => pkg.category === 'corporate' && pkg.type === 'detailed'
      )
    ).toBe(true);
  });

  it('should return correct landing packages', () => {
    const landingPackages = getLandingPackages();
    expect(landingPackages.length).toBe(3); // home-basic, home-premium, business-enterprise
    expect(landingPackages.every(pkg => pkg.type === 'landing')).toBe(true);
  });

  it('should return featured packages', () => {
    const featuredPackages = getFeaturedPackages();
    expect(featuredPackages.length).toBe(1); // soho package
    expect(featuredPackages[0].id).toBe('soho');
    expect(featuredPackages[0].featured).toBe(true);
  });

  it('should return popular packages', () => {
    const popularPackages = getPopularPackages();
    expect(popularPackages.length).toBe(1); // home-premium
    expect(popularPackages[0].id).toBe('home-premium');
    expect(popularPackages[0].popular).toBe(true);
  });

  it('should find package by ID', () => {
    const pkg = getPackageById('soho');
    expect(pkg).toBeDefined();
    expect(pkg?.name).toBe('SOHO');
    expect(pkg?.category).toBe('soho');
    expect(pkg?.type).toBe('main');
  });

  it('should return undefined for non-existent package ID', () => {
    const pkg = getPackageById('non-existent');
    expect(pkg).toBeUndefined();
  });

  it('should validate individual package', () => {
    const validPackage = allPackages[0];
    expect(validatePackage(validPackage)).toBe(true);

    const invalidPackage = { name: 'test' };
    expect(validatePackage(invalidPackage)).toBe(false);
  });

  it('should validate package array', () => {
    expect(validatePackages(allPackages)).toBe(true);
    expect(validatePackages([])).toBe(true);
    expect(validatePackages([null, 'invalid'])).toBe(false);
  });

  it('should maintain backward compatibility with legacy exports', async () => {
    // Test that legacy exports still work
    const {
      packages,
      homeAccessPackages,
      sohoPackages,
      corporatePackages,
      landingPackages,
    } = await import('../src/data/packages');

    expect(packages).toEqual(getMainPackages());
    expect(homeAccessPackages).toEqual(getHomePackages());
    expect(sohoPackages).toEqual(getSohoPackages());
    expect(corporatePackages).toEqual(getCorporatePackages());
    expect(landingPackages).toEqual(getLandingPackages());
  });
});
