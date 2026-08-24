import { BusinessModule } from '../types/modules';

export const MODULE_REGISTRY: BusinessModule[] = [
  // ═══════════════════════════════════════
  // 🏠 COMMAND CENTER
  // ═══════════════════════════════════════
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
    requiredPermission: 'dashboard:read',
    description: 'Executive command center — live KPIs, today\'s schedule, and business insights.',
    status: 'active',
    category: 'command-center'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    path: '/calendar',
    iconName: 'CalendarRange',
    requiredPermission: 'calendar:read',
    description: 'Master aggregated calendar — production runs, legal renewals, meetings, and deadlines.',
    status: 'active',
    category: 'command-center'
  },
  {
    id: 'tasks',
    name: 'Tasks & Decisions',
    path: '/tasks',
    iconName: 'CheckSquare',
    requiredPermission: 'tasks:read',
    description: 'GUDORIA_TASKS spreadsheet — Action_Items (74) and Decision_Register (5).',
    status: 'google-sync-required',
    category: 'command-center'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    path: '/notifications',
    iconName: 'Bell',
    requiredPermission: 'notifications:read',
    description: 'System alerts — legal renewals, payment deadlines, production delays, and urgent tasks.',
    status: 'active',
    category: 'command-center'
  },

  // ═══════════════════════════════════════
  // 🤝 ORDERS & CUSTOMERS (Sheet 1)
  // ═══════════════════════════════════════
  {
    id: 'orders',
    name: 'Orders & Customers',
    path: '/orders',
    iconName: 'Users',
    requiredPermission: 'customers:read',
    description: 'GUDORIA_ORDERS spreadsheet — Customer_Master (73), Orders_Log (211), and Payments_Tracker (209).',
    status: 'google-sync-required',
    category: 'sales-customers'
  },
  {
    id: 'invoice-generator',
    name: 'Invoice Studio',
    path: '/invoice-generator',
    iconName: 'Receipt',
    requiredPermission: 'customers:read',
    description: 'Printable GST Invoice Studio with inclusive/exclusive tax calculations.',
    status: 'active',
    category: 'sales-customers'
  },

  // ═══════════════════════════════════════
  // 🏭 SUPPLY CHAIN & STOCK (Sheet 2)
  // ═══════════════════════════════════════
  {
    id: 'stock-checker',
    name: 'Stock Checker',
    path: '/stock-checker',
    iconName: 'Boxes',
    requiredPermission: 'production:read',
    description: 'Live chocolate inventory, batch clearance engine, FIFO alerts, and 2-way Google Sheet sync.',
    status: 'active',
    category: 'supply-chain'
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain & Stock',
    path: '/supply-chain',
    iconName: 'Factory',
    requiredPermission: 'production:read',
    description: 'GUDORIA_SUPPLY_CHAIN spreadsheet — Vendor_Master (4), Purchase_Orders (3), Goods_Received (2), and Live_Stock (24).',
    status: 'google-sync-required',
    category: 'supply-chain'
  },

  // ═══════════════════════════════════════
  // 📊 MARKETING (Sheet 3)
  // ═══════════════════════════════════════
  {
    id: 'marketing',
    name: 'Marketing & Campaigns',
    path: '/marketing',
    iconName: 'Megaphone',
    requiredPermission: 'marketing:read',
    description: 'GUDORIA_MARKETING spreadsheet — Campaigns (10), Content_Planner, and Events_Log (10).',
    status: 'google-sync-required',
    category: 'business-intel'
  },

  // ═══════════════════════════════════════
  // 💰 FINANCE (Sheet 4)
  // ═══════════════════════════════════════
  {
    id: 'finance',
    name: 'Finance & Ledger',
    path: '/finance',
    iconName: 'DollarSign',
    requiredPermission: 'finance:read',
    description: 'GUDORIA_FINANCE spreadsheet — Income_Expenses (214) and Cash_Flow (57).',
    status: 'google-sync-required',
    category: 'business-intel'
  },

  // ═══════════════════════════════════════
  // 📋 LEGAL & COMPLIANCE (Sheet 5)
  // ═══════════════════════════════════════
  {
    id: 'legal',
    name: 'Legal & Compliance',
    path: '/legal',
    iconName: 'Scale',
    requiredPermission: 'legal:read',
    description: 'GUDORIA_LEGAL spreadsheet — Legal_Master (10) and Renewal_Tracker (1).',
    status: 'google-sync-required',
    category: 'compliance-admin'
  },
  {
    id: 'documents',
    name: 'Digital Asset Library',
    path: '/documents',
    iconName: 'FolderArchive',
    requiredPermission: 'legal:read',
    description: 'Digital asset vault — 2-way Google Drive binary upload & Google Sheets catalog sync.',
    status: 'active',
    category: 'compliance-admin'
  },

  // ═══════════════════════════════════════
  // ⚙️ SYSTEM
  // ═══════════════════════════════════════
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    iconName: 'Settings',
    requiredPermission: 'settings:read',
    description: 'Platform configuration, Google Workspace sync, and notification preferences.',
    status: 'active',
    category: 'system'
  },
  {
    id: 'user-management',
    name: 'User Management',
    path: '/user-management',
    iconName: 'ShieldAlert',
    requiredPermission: 'users:read',
    description: 'Manage platform members and access.',
    status: 'active',
    category: 'system'
  }
];
