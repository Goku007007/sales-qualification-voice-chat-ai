import { Activity, BarChart3, Home, Monitor, ShoppingCart, type LucideIcon } from 'lucide-react';
import type { IndustryType } from '@/types';

export interface IndustryCatalogItem {
  id: IndustryType;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}

export const industryCatalog: IndustryCatalogItem[] = [
  {
    id: 'saas',
    name: 'SaaS',
    subtitle: 'B2B software qualification',
    icon: Monitor,
    color: '#3b82f6',
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    subtitle: 'Property inquiry & buyer',
    icon: Home,
    color: '#22c55e',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    subtitle: 'Clinic / service intake',
    icon: Activity,
    color: '#ef4444',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    subtitle: 'Online shop leads',
    icon: ShoppingCart,
    color: '#f59e0b',
  },
  {
    id: 'consulting',
    name: 'Consulting',
    subtitle: 'Business coaching & co...',
    icon: BarChart3,
    color: '#a855f7',
  },
];
