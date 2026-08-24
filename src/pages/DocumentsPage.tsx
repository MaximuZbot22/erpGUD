import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  FolderArchive, Upload, Search, FileText, Image, Film, 
  FileCode, FileSpreadsheet, ExternalLink, RefreshCw, Download, CheckCircle2
} from 'lucide-react';
import { GoogleSheetsService, GoogleDriveService } from '../services/google';
import { auditLogService } from '../services/audit';

interface AssetRecord {
  id: string;
  name: string;
  category: string;
  module: string;
  driveLink: string;
  date: string;
}

// Initial curated asset repository (company registration forms under Legal category)
const INITIAL_ASSETS: AssetRecord[] = [
  {
    id: 'AST-1001',
    name: 'Gudoria Food Innovations Private Limited - Form GST Registration 06',
    category: 'Legal',
    module: 'Compliance',
    driveLink: 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
    date: '2026-01-15'
  },
  {
    id: 'AST-1002',
    name: 'FSSAI Central Food Safety License & Manufacturing Permit',
    category: 'Legal',
    module: 'Compliance',
    driveLink: 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
    date: '2026-02-10'
  },
  {
    id: 'AST-1003',
    name: 'Certificate of Incorporation (CIN - U10792KL2026PTC081290)',
    category: 'Legal',
    module: 'Compliance',
    driveLink: 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
    date: '2026-01-05'
  },
  {
    id: 'AST-1004',
    name: 'Company Permanent Account Number (PAN) Card & Tax Reg',
    category: 'Legal',
    module: 'Finance',
    driveLink: 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
    date: '2026-01-08'
  },
  {
    id: 'AST-1005',
    name: 'GUD Chocolates Official Product Catalog & Wholesale Tariff 2026',
    category: 'Marketing',
    module: 'Sales',
    driveLink: 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
    date: '2026-03-01'
  }
];

export const DocumentsPage: React.FC = () => {
  const { profile, googleToken } = useAuth();
  const [assets, setAssets] = useState<AssetRecord[]>(INITIAL_ASSETS);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Form states
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Legal');
  const [relatedModule, setRelatedModule] = useState('Legal');

  const categories = [
    'All', 'Legal', 'Customers', 'Vendors', 'Finance', 
    'Marketing', 'Production', 'Packaging', 'Research', 'Meetings'
  ];

  // Unique list deduplication helper
  const deduplicateAssets = (list: AssetRecord[]): AssetRecord[] => {
    const seen = new Set<string>();
    return list.filter(item => {
      const key = `${item.id}-${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchAssetsList = async () => {
    if (!googleToken) return;
    setLoading(true);
    try {
      const assetSheetId = import.meta.env.VITE_GOOGLE_SHEET_ASSETS_ID || '1zRvVaAtnDDCR4Y6NQN0CZDEVqp_nZXQRrMsKwsD8BwQ';
      const response = await GoogleSheetsService.getSpreadsheetValues(
        googleToken,
        assetSheetId,
        'Asset Master!A2:F100'
      );
      
      if (response && response.values && response.values.length > 0) {
        const fetchedList: AssetRecord[] = response.values.map((row, idx) => ({
          id: row[0] || `AST-${1000 + idx}`,
          name: row[1] || 'Untitled Asset',
          category: row[2] || 'Legal',
          module: row[3] || 'General',
          driveLink: row[4] || 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY',
          date: row[5] || new Date().toLocaleDateString()
        }));
        
        // Merge with initial assets without duplicates
        setAssets(deduplicateAssets([...fetchedList, ...INITIAL_ASSETS]));
      } else {
        await loadFromDriveDirectly();
      }
    } catch (e) {
      console.warn('Documents failed to load from Asset Sheet. Fetching direct Drive list:', e);
      await loadFromDriveDirectly();
    } finally {
      setLoading(false);
    }
  };

  const loadFromDriveDirectly = async () => {
    if (!googleToken) return;
    try {
      const response = await GoogleDriveService.listFiles(googleToken, { maxResults: 40 });
      if (response && response.files && response.files.length > 0) {
        const driveList: AssetRecord[] = response.files.map((file) => ({
          id: file.id,
          name: file.name,
          category: 'Legal',
          module: 'General',
          driveLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          date: new Date(file.modifiedTime).toLocaleDateString()
        }));
        setAssets(deduplicateAssets([...driveList, ...INITIAL_ASSETS]));
      }
    } catch (err) {
      console.error('Failed to list files from Google Drive directly:', err);
    }
  };

  useEffect(() => {
    if (googleToken) {
      fetchAssetsList();
    }
  }, [googleToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setUploading(true);
    const newId = `AST-${Math.floor(Math.random() * 9000 + 1000)}`;
    let fileLink = 'https://drive.google.com/drive/folders/1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY';

    try {
      if (googleToken) {
        // 1. Upload binary file to target Drive folder 1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY
        const targetDriveFolder = import.meta.env.VITE_GOOGLE_DRIVE_ASSETS_FOLDER_ID || '1BmTkTxXnOkHkjkwEA0e1qOtZhH1TBqEY';
        const driveFile = await GoogleDriveService.uploadFile(googleToken, fileToUpload, targetDriveFolder);
        fileLink = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;
        
        // 2. Append metadata row to Google Sheet 1zRvVaAtnDDCR4Y6NQN0CZDEVqp_nZXQRrMsKwsD8BwQ
        const assetSheetId = import.meta.env.VITE_GOOGLE_SHEET_ASSETS_ID || '1zRvVaAtnDDCR4Y6NQN0CZDEVqp_nZXQRrMsKwsD8BwQ';
        const newRow = [
          newId,
          fileToUpload.name,
          uploadCategory,
          relatedModule,
          fileLink,
          new Date().toLocaleDateString()
        ];

        await GoogleSheetsService.appendSpreadsheetValues(
          googleToken,
          assetSheetId,
          'Asset Master!A:F',
          [newRow]
        );

        if (profile) {
          await auditLogService.logActivity(
            { uid: profile.uid, email: profile.email, displayName: profile.displayName },
            'Uploaded document to Google Drive & Asset Sheet',
            'documents',
            `File: ${fileToUpload.name} in category ${uploadCategory}`,
            newId
          );
        }
      }

      // Add to local state immediately
      const createdRecord: AssetRecord = {
        id: newId,
        name: fileToUpload.name,
        category: uploadCategory,
        module: relatedModule,
        driveLink: fileLink,
        date: new Date().toLocaleDateString()
      };

      setAssets(prev => deduplicateAssets([createdRecord, ...prev]));
      setFileToUpload(null);

    } catch (err) {
      console.error('File upload workflow failure:', err);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const size = "w-5 h-5";
    if (ext === 'pdf' || fileName.includes('Form') || fileName.includes('GST')) return <FileText className={`${size} text-rose-400`} />;
    if (['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(ext || '')) return <Image className={`${size} text-blue-400`} />;
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return <Film className={`${size} text-amber-400`} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className={`${size} text-emerald-400`} />;
    return <FileCode className={`${size} text-slate-400`} />;
  };

  // Filter Assets without duplicating
  const filteredAssets = deduplicateAssets(assets).filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || asset.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-[#408d6d]" />
            <span>Digital Asset Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            2-way bi-directional synchronization with Google Drive folder & Asset Master spreadsheet.
          </p>
        </div>

        {googleToken && (
          <Button 
            variant="outline" 
            size="xs" 
            onClick={fetchAssetsList} 
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Vault
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Left Side: Categories & Upload Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Uploader Card */}
          <Card className="border border-slate-800 bg-slate-900/90">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300">Ingest Document</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Select File</label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-[#408d6d] file:text-white hover:file:bg-[#306a52] cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Asset Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#408d6d] text-slate-100 font-semibold"
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Related Module</label>
                  <select
                    value={relatedModule}
                    onChange={(e) => setRelatedModule(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#408d6d] text-slate-100 font-semibold"
                  >
                    <option>Legal</option>
                    <option>General</option>
                    <option>Customers</option>
                    <option>Vendors</option>
                    <option>Production</option>
                    <option>Finance</option>
                    <option>Marketing</option>
                    <option>Meetings</option>
                  </select>
                </div>

                <Button type="submit" loading={uploading} className="w-full bg-[#408d6d] hover:bg-[#306a52] text-white font-bold" leftIcon={<Upload className="w-4 h-4" />}>
                  Upload File
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Navigation Category Filter List */}
          <Card className="border border-slate-800 bg-slate-900/90">
            <CardContent className="p-3 space-y-1">
              <span className="block text-[10px] uppercase font-bold text-slate-400 pl-2 mb-2 tracking-wider">Category Filter</span>
              {categories.map(cat => {
                const count = deduplicateAssets(assets).filter(a => cat === 'All' || a.category.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#408d6d] text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-2 py-0.2 rounded-full ${selectedCategory === cat ? 'bg-emerald-900 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Assets Directory Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search assets by file name or document ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#408d6d] text-slate-100 placeholder-slate-500 shadow-inner"
            />
          </div>

          {/* Files Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#408d6d]" />
              <span>Ingesting asset data from Google Drive & Sheets...</span>
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-md hover:border-[#408d6d] transition-all duration-200 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        {getFileIcon(asset.name)}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {asset.id}
                      </span>
                    </div>
                    
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-relaxed tracking-wide" title={asset.name}>
                      {asset.name}
                    </h4>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase">
                      <span className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded">
                        {asset.category}
                      </span>
                      <span className="bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        {asset.module}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">{asset.date}</span>
                      
                      {/* Direct Download & View Button */}
                      <a 
                        href={asset.driveLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408d6d] hover:bg-[#306a52] text-white rounded-lg font-bold text-[11px] shadow-sm transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/50 text-xs text-slate-400 space-y-2">
              <FolderArchive className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-semibold text-slate-200">No assets match your search or filter</p>
              <p className="text-[11px] text-slate-500">Select another category or upload a document.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default DocumentsPage;
