# Manufacturing Inventory Management System

A simple, cost-effective inventory management system built with Next.js and Airtable, featuring barcode scanning for manufacturing operations.

## 🎯 Features

### For Warehouse Users:
- ✅ Scan barcodes to receive raw materials
- ✅ Produce finished products (auto-deducts raw materials)
- ✅ View live stock levels
- ✅ Transaction history

### For Admins:
- ✅ Manage raw materials catalog
- ✅ Manage finished products catalog
- ✅ Configure recipes (Bill of Materials)
- ✅ Manual stock adjustments
- ✅ Cost reports and inventory valuation
- ✅ Low stock alerts

## 💰 Cost Breakdown

- **Airtable**: FREE (up to 1,200 records/base)
- **Hosting**: FREE (Vercel)
- **Domain** (optional): ~$12/year
- **Total**: $0-$50/year

## 📋 Prerequisites

1. **Airtable account** (free): https://airtable.com/signup
2. **Vercel account** (free): https://vercel.com/signup
3. **Node.js 18+** installed
4. **Basic coding knowledge** (to customize if needed)

## 🚀 Quick Setup (30 minutes)

### Step 1: Set Up Airtable Base (15 min)

1. **Create a new base** in Airtable called "Manufacturing Inventory"

2. **Follow the schema** in `airtable-schema.md`:
   - Create 4 tables: Raw Materials, Finished Products, Recipes, Transactions
   - Add all fields exactly as specified
   - Set up formulas, rollups, and lookups
   - Create the views

3. **Add sample data** to test:
   ```
   Raw Material example:
   - Material ID: RM001
   - Material Name: Aluminum Sheet
   - Barcode: 123456789
   - Unit: kg
   - Unit Cost: 15.50
   - Minimum Stock: 100
   
   Finished Product example:
   - Product ID: FP001
   - Product Name: Widget A
   - Barcode: 987654321
   - Selling Price: 50.00
   
   Recipe example:
   - Product: Widget A
   - Raw Material: Aluminum Sheet
   - Quantity Needed: 0.5
   ```

4. **Get your API credentials**:
   - API Key: https://airtable.com/account
   - Base ID: Go to https://airtable.com/api, select your base, copy the Base ID from the URL

### Step 2: Set Up the Web App (10 min)

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Airtable credentials:
   ```env
   NEXT_PUBLIC_AIRTABLE_API_KEY=your_api_key_here
   NEXT_PUBLIC_AIRTABLE_BASE_ID=your_base_id_here
   NEXT_PUBLIC_ADMIN_PASSWORD=your_password_here
   ```

4. **Run locally to test**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

### Step 3: Deploy to Vercel (5 min)

1. **Push code to GitHub** (create a new repository)

2. **Import to Vercel**:
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Add environment variables from `.env.local`
   - Click "Deploy"

3. **Your app is live!** 🎉
   - Access at: `your-app-name.vercel.app`
   - Works on mobile phones/tablets
   - Progressive Web App (can be installed to home screen)

## 📱 Mobile Usage

### Install as App (iOS/Android):
1. Open the site in Safari (iOS) or Chrome (Android)
2. Tap "Share" → "Add to Home Screen"
3. App icon appears on home screen
4. Works like a native app with camera access

### Barcode Scanning:
- Uses device camera (no special hardware needed)
- Works with standard barcodes and QR codes
- Point camera at barcode, it auto-scans

## 🔐 Security Notes

1. **Change default admin password** immediately after deployment
2. **API keys** are exposed in client-side code (this is normal for Airtable)
3. For higher security:
   - Use Airtable's access controls
   - Consider Airtable's authentication options
   - Or build a backend API layer (not included in this simple version)

## 📊 How It Works

### Receiving Raw Materials:
1. User scans barcode (or enters manually)
2. System finds material in Airtable
3. User enters quantity
4. System creates "Raw Material IN" transaction
5. Current Stock updates automatically (via rollup)

### Producing Products:
1. User selects finished product
2. System loads recipe from Airtable
3. System checks if enough raw materials available
4. If yes, creates:
   - "Production" transactions (deducting raw materials)
   - "Finished Product IN" transaction
5. Both raw material and finished product stocks update

### Admin Reports:
- Total inventory value (quantity × unit cost)
- Low stock alerts (automatic formula)
- Transaction history
- Cost analysis per product

## 🛠️ Customization Guide

### Adding New Fields:
1. Add field in Airtable
2. Update TypeScript interfaces in `lib/airtable.ts`
3. Update UI components to display/edit new field

### Changing Colors/Branding:
- Edit Tailwind classes in components
- Modify `tailwind.config.js` for theme colors

### Adding Features:
- Batch operations: Create new page, use Airtable batch API
- Reporting: Add new views in Airtable, create dashboard page
- Multiple warehouses: Add "Location" field, filter by location

## 📁 Project Structure

```
manufacturing-inventory/
├── app/
│   ├── page.tsx              # Home/login screen
│   ├── scan-material/        # Receive materials
│   ├── produce/              # Production page
│   ├── stocks/               # Inventory view
│   ├── history/              # Transactions
│   └── admin/                # Admin pages
├── components/
│   └── BarcodeScanner.tsx    # Camera scanning component
├── lib/
│   └── airtable.ts           # Airtable API functions
├── airtable-schema.md        # Database schema
└── package.json
```

## 🐛 Troubleshooting

### Camera not working:
- Ensure HTTPS (required for camera access)
- Grant camera permissions in browser
- Test on different device/browser

### Airtable API errors:
- Check API key and Base ID are correct
- Verify table names match exactly (case-sensitive)
- Check Airtable rate limits (5 requests/second)

### Stock not updating:
- Check rollup fields are configured correctly
- Verify linked records are set up properly
- Refresh the page (data may be cached)

## 📈 Scaling Up

### When you need more:
- **More records**: Upgrade Airtable ($20/month for Pro)
- **More users**: Consider Airtable's user management
- **More complex**: Migrate to dedicated database (PostgreSQL + Supabase)
- **Full ERP**: Consider Odoo or ERPNext

## 🤝 Support

For issues or questions:
1. Check Airtable API documentation: https://airtable.com/developers/web/api/introduction
2. Check Next.js documentation: https://nextjs.org/docs
3. Review the code comments

## 📝 License

MIT License - use freely for your business!

---

Built with ❤️ for small manufacturers who need simple, affordable inventory management.
