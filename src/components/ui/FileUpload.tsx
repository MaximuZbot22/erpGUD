import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { GoogleDriveService } from '../../services/google';
import { useAuth } from '../../context/AuthContext';
import { auditLogService } from '../../services/audit';

interface FileUploadProps {
  onUploadComplete?: (fileData: { id: string; name: string; mimeType: string; size: string; webViewLink?: string }) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
}

interface UploadQueueItem {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  allowedTypes,
  maxSizeMB = 15
}) => {
  const { profile, googleToken } = useAuth();
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadToDrive, setUploadToDrive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFiles = async (fileList: FileList) => {
    const newItems: UploadQueueItem[] = [];
    const filesToUpload: File[] = [];

    Array.from(fileList).forEach((file) => {
      // Validate type
      if (allowedTypes && !allowedTypes.includes(file.type)) {
        newItems.push({
          id: Math.random().toString(36).substring(2),
          name: file.name,
          size: formatSize(file.size),
          progress: 0,
          status: 'error',
          errorMessage: 'File type not allowed'
        });
        return;
      }

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        newItems.push({
          id: Math.random().toString(36).substring(2),
          name: file.name,
          size: formatSize(file.size),
          progress: 0,
          status: 'error',
          errorMessage: `File exceeds limit of ${maxSizeMB}MB`
        });
        return;
      }

      const itemId = Math.random().toString(36).substring(2);
      newItems.push({
        id: itemId,
        name: file.name,
        size: formatSize(file.size),
        progress: 0,
        status: 'idle'
      });
      filesToUpload.push(file);

      // Keep index mapping
      (file as any).queueId = itemId;
    });

    setQueue((prev) => [...prev, ...newItems]);

    // Start upload process
    for (const file of filesToUpload) {
      await processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    const queueId = (file as any).queueId;
    
    // Update status to uploading
    setQueue((prev) => 
      prev.map((item) => (item.id === queueId ? { ...item, status: 'uploading', progress: 10 } : item))
    );

    try {
      if (uploadToDrive && googleToken) {
        // Real upload to Google Drive using user's access token
        console.log(`[File Upload] Executing Google Drive REST Upload API for: ${file.name}`);
        
        // Simulating upload increments in UI
        let progressVal = 10;
        const progressInterval = setInterval(() => {
          progressVal = Math.min(80, progressVal + 15);
          setQueue((prev) => 
            prev.map((item) => (item.id === queueId ? { ...item, progress: progressVal } : item))
          );
        }, 150);

        const driveResult = await GoogleDriveService.uploadFile(googleToken, file);
        clearInterval(progressInterval);

        setQueue((prev) => 
          prev.map((item) => (item.id === queueId ? { ...item, status: 'completed', progress: 100 } : item))
        );

        if (profile) {
          await auditLogService.logActivity(
            { uid: profile.uid, email: profile.email, displayName: profile.displayName },
            `Uploaded document to Google Drive`,
            'documents',
            `File: ${file.name} (Drive ID: ${driveResult.id})`,
            `DOC-${driveResult.id?.substring(0, 4)}`
          );
        }

        if (onUploadComplete) {
          onUploadComplete({
            id: driveResult.id,
            name: file.name,
            mimeType: file.type,
            size: formatSize(file.size),
            webViewLink: driveResult.webViewLink || `https://drive.google.com/open?id=${driveResult.id}`
          });
        }
      } else {
        // Fallback local simulation (if Drive toggle off or token missing)
        let prog = 10;
        const interval = setInterval(() => {
          prog += 20;
          setQueue((prev) => 
            prev.map((item) => (item.id === queueId ? { ...item, progress: Math.min(prog, 100) } : item))
          );
          
          if (prog >= 100) {
            clearInterval(interval);
            setQueue((prev) => 
              prev.map((item) => (item.id === queueId ? { ...item, status: 'completed' } : item))
            );

            if (onUploadComplete) {
              onUploadComplete({
                id: `DOC${Math.floor(Math.random() * 9000 + 1000)}`,
                name: file.name,
                mimeType: file.type,
                size: formatSize(file.size)
              });
            }
          }
        }, 200);
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      setQueue((prev) => 
        prev.map((item) => (item.id === queueId ? { ...item, status: 'error', errorMessage: err.message || 'Upload failed' } : item))
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Settings / Integration State */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="driveSyncCheckbox"
            checked={uploadToDrive}
            onChange={(e) => setUploadToDrive(e.target.checked)}
            disabled={!googleToken}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
          />
          <label htmlFor="driveSyncCheckbox" className="font-semibold text-slate-700 dark:text-slate-350">
            Upload directly to Google Drive
          </label>
        </div>
        
        <div>
          {googleToken ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              ✓ Connected to Google Workspace
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-450 font-medium">
              ℹ Sign in with Google to enable Drive uploads
            </span>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver 
            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10' 
            : 'border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          multiple
          className="hidden"
        />
        
        <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Drag & drop files here, or <span className="text-emerald-700 dark:text-emerald-450 hover:underline">browse files</span>
        </p>
        <p className="text-xs text-slate-400 mt-1.5">
          Supports PDFs, CSVs, Images, and Docs up to {maxSizeMB}MB
        </p>
      </div>

      {/* Upload Queue List */}
      {queue.length > 0 && (
        <div className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900/60 max-h-[220px] overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upload Queue</h4>
          
          {queue.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 dark:border-slate-850 last:border-b-0">
              <div className="flex items-center gap-2.5 max-w-[70%]">
                <File className="w-4 h-4 text-slate-400" />
                <div className="truncate">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400">{item.size}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Progress Indicators */}
                {item.status === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span className="font-medium text-emerald-600">{item.progress}%</span>
                  </div>
                )}
                {item.status === 'completed' && (
                  <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Ready
                  </span>
                )}
                {item.status === 'error' && (
                  <span className="text-rose-600 flex items-center gap-1 font-semibold" title={item.errorMessage}>
                    <AlertCircle className="w-4 h-4" /> Failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
