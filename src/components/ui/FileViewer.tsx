import React from 'react';
import { FileText, Image as ImageIcon, Download, ExternalLink, History, Calendar, HardDrive } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Table } from './Table';

export interface FileVersion {
  version: number;
  modifiedTime: string;
  modifiedBy: string;
  size: string;
}

export interface FileData {
  id: string; // DOC0001
  name: string;
  mimeType: string;
  size: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime: string;
  owners?: string[];
  versionHistory?: FileVersion[];
  contentString?: string; // For txt, csv, md previews
}

interface FileViewerProps {
  file: FileData | null;
  onClose?: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, onClose }) => {
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-550">
        <FileText className="w-12 h-12 mb-3 stroke-[1.5]" />
        <p className="text-sm">Select a document to open file previewer</p>
      </div>
    );
  }

  const isImage = file.mimeType.startsWith('image/');
  const isCSV = file.mimeType === 'text/csv' || file.name.endsWith('.csv');
  const isText = file.mimeType === 'text/plain' || file.mimeType === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md');

  // If CSV, parse rows for table renderer
  const renderCSVContent = () => {
    if (!file.contentString) return <p className="text-xs text-slate-400">Empty CSV File</p>;
    
    const lines = file.contentString.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    const headers = lines[0].split(',');
    const rows = lines.slice(1).map((line, idx) => {
      const cells = line.split(',');
      const rowObj: Record<string, string> = { id: String(idx) };
      headers.forEach((h, hIdx) => {
        rowObj[h.trim()] = cells[hIdx]?.trim() || '';
      });
      return rowObj;
    });

    const columns = headers.map(h => ({
      key: h.trim(),
      header: h.trim()
    }));

    return (
      <div className="max-h-[300px] overflow-auto">
        <Table
          columns={columns}
          data={rows}
          rowIdKey="id"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* File Banner Card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 rounded-lg">
              {isImage ? <ImageIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-xs sm:max-w-md">
                {file.name}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {file.size} • {file.mimeType}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {file.webViewLink && (
              <a href={file.webViewLink} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-4 h-4" />}>
                  Open in Drive
                </Button>
              </a>
            )}
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>File Preview</CardTitle>
        </CardHeader>
        <CardContent className="bg-slate-50/50 dark:bg-slate-950/20 rounded-b-lg border-t border-slate-100 dark:border-slate-850 p-4">
          {isImage && (
            <div className="flex items-center justify-center bg-slate-900 rounded p-4 max-h-[350px]">
              {/* If it's a real file we can pass src, otherwise render placeholder */}
              <img 
                src={file.webViewLink || "https://images.unsplash.com/photo-1549007994-cb92ca818bc6?q=80&w=350&auto=format&fit=crop"} 
                alt={file.name} 
                className="max-h-[300px] object-contain rounded"
              />
            </div>
          )}

          {isCSV && renderCSVContent()}

          {isText && (
            <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-[300px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded font-mono whitespace-pre-wrap leading-relaxed">
              {file.contentString || 'Empty text document'}
            </pre>
          )}

          {!isImage && !isCSV && !isText && (
            <div className="text-center py-12 text-slate-400">
              <HardDrive className="w-10 h-10 mx-auto mb-2 text-slate-350 stroke-[1.5]" />
              <p className="text-xs">Direct preview not available for this file type.</p>
              {file.webViewLink && (
                <p className="text-xs mt-1">
                  Use{' '}
                  <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold hover:underline">
                    Google Drive Viewer
                  </a>{' '}
                  to read online.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History Section */}
      {file.versionHistory && file.versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Version History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {file.versionHistory.map((version) => (
              <div key={version.version} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                    v{version.version}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      Modified by {version.modifiedBy}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {version.modifiedTime}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                  {version.size}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
