// src/config/businessConfig.ts

export interface BusinessConfig {
  name: string;
  legalName?: string;
  tagline?: string;
  address: string;
  contact: {
    phone: string;
    alternatePhone?: string;
    email: string;
    website?: string;
  };
  tax: {
    gstin: string;        // GST Identification Number
    fssai?: string;       // Food Safety License Number
    defaultGstRate: number; // e.g. 0.05 for 5%
  };
  receipt: {
    headerNote: string;
    footerNote: string;
    showGstNumber: boolean;
    showFssaiNumber: boolean;
  };
  currency: {
    symbol: string;
    code: string;
  };
}

export const businessConfig: BusinessConfig = {
  name: 'Samsara Bar and Restaurant',
  legalName: 'Samsara Club Phuentsholing',
  tagline: 'Commercial Counter POS',
  address: 'CR24 Phuensum Lam, Phuentsholing 21101, Bhutan',
  contact: {
    phone: '+975 17 90 90 01',
    email: '',
  },
  tax: {
    gstin: '07AAAAA0000A1Z5',
    fssai: '10020011000123',
    defaultGstRate: 0.05, // 5% GST
  },
  receipt: {
    headerNote: '',
    footerNote: 'Thank you for dining with us! Please visit again.',
    showGstNumber: true,
    showFssaiNumber: true,
  },
  currency: {
    symbol: '₹',
    code: 'INR',
  },
};