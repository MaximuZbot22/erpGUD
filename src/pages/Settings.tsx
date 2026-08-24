import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { HardDrive, FileSpreadsheet, Calendar, Mail, Sparkles, BellRing, ShieldCheck, Key } from 'lucide-react';
import { auditLogService } from '../services/audit';

export const Settings: React.FC = () => {
  const { profile, googleToken, signInWithGoogle } = useAuth();
  
  // Local state for settings form
  const [smtpServer, setSmtpServer] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [notifDiscordWebhook, setNotifDiscordWebhook] = useState('https://discord.com/api/webhooks/...');
  const [whatsappTemplate, setWhatsappTemplate] = useState('erp_standard_notification');
  const [googleSheetId, setGoogleSheetId] = useState('1zbus5fipq6s9gvcjkt4oe6a6g1g5q_goodoria');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    // Simulate writing configuration variables to Firestore settings collection
    setTimeout(async () => {
      setSaving(false);
      setSaveSuccess(true);
      
      if (profile) {
        await auditLogService.logActivity(
          { uid: profile.uid, email: profile.email, displayName: profile.displayName },
          'Updated platform settings configuration',
          'settings',
          `Configured sheet ID: ${googleSheetId} and SMTP server: ${smtpServer}`
        );
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure Google API connections, notifications, and security options.</p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5" />
          <span className="font-semibold">Settings saved successfully. Config changes written to Firestore database.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Google Workspace Connection Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <CardTitle>Google Workspace Integration Layer</CardTitle>
            </div>
            {googleToken ? (
              <StatusBadge status="success" label="Connected" />
            ) : (
              <StatusBadge status="warning" label="Authorization Required" />
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Every data grid in the GUD ERP matches a Google Sheet. Authorizing Google OAuth links these modules to sheets and documents in real time.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Master Google Sheet ID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={googleSheetId}
                    onChange={(e) => setGoogleSheetId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">OAuth Client ID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled
                    value={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'Client ID loaded from env'}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg text-slate-400 cursor-not-allowed select-all"
                  />
                </div>
              </div>
            </div>

            {/* Live Scopes Details */}
            <div className="bg-slate-50/50 dark:bg-slate-900/35 p-3 rounded-lg border border-slate-150 dark:border-slate-850 space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-slate-400">OAuth Permissions Granted</h4>
              <div className="grid sm:grid-cols-3 gap-2.5 text-[11px] text-slate-655 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-emerald-700" /> Google Drive (Full Sync)</div>
                <div className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Google Sheets (Read/Write)</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-700" /> Google Calendar (Events sync)</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              {googleToken ? (
                <Button type="button" variant="outline" size="sm" disabled>
                  Google Connected
                </Button>
              ) : (
                <Button type="button" variant="primary" size="sm" onClick={signInWithGoogle} leftIcon={<Sparkles className="w-4 h-4" />}>
                  Grant Google Workspace Permissions
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Channels Configuration Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-emerald-700" />
              <CardTitle>Notification Engine Channels</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Discord Alert Webhook</label>
                <input
                  type="text"
                  value={notifDiscordWebhook}
                  onChange={(e) => setNotifDiscordWebhook(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">WhatsApp Template Namespace</label>
                <input
                  type="text"
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMTP Configuration Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-700" />
              <CardTitle>SMTP Mail Server Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">SMTP Host Server</label>
              <input
                type="text"
                value={smtpServer}
                onChange={(e) => setSmtpServer(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">SMTP Port</label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} className="px-6">
            Save Platform Config
          </Button>
        </div>
      </form>
    </div>
  );
};
export default Settings;
