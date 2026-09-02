# GUDORIA ERP — Backup & Disaster Recovery Guide

---

## 1. System Components & Backup Strategies

| System Component | Backup Mechanism | Frequency | Restoration Procedure |
| :--- | :--- | :--- | :--- |
| **Application Source Code** | Git Repository (`master` branch) | Continuous | `git checkout master` / re-deploy static build |
| **Primary Spreadsheet Data** | Google Sheets Revision History | Automated by Google Cloud | Open Spreadsheet ➔ `File` ➔ `Version history` ➔ `See version history` |
| **Document Assets** | Google Drive Trash & Revision History | Automated by Google Drive | Open Drive ➔ `Trash` or right-click file ➔ `Manage versions` |
| **User & Audit Metadata** | Firestore Collections (`users`, `audit_logs`) | Automatic Cloud Firestore Backups | Firebase Console ➔ `Firestore Database` ➔ Import/Export |
| **Local Offline State** | Browser `localStorage` Cache | Instant | Exported via `StorageEngine` / Settings UI |

---

## 2. Disaster Recovery Protocol

### A. Corrupted Google Sheet Formulas
If a user manually edits cells or breaks sheet formulas (`#REF!`, `#VALUE!` errors):
1. Navigate to **Stock Checker** (`/stock-checker`).
2. Click **Fix #REF! Formulas** in the top action bar.
3. The ERP will automatically re-inject standard `SUMIFS` formulas across all 7 flavor columns.

### B. Full Spreadsheet Restoration
If a spreadsheet is accidentally deleted or overwritten:
1. Open Google Sheets.
2. Select **File ➔ Version History ➔ See Version History**.
3. Select the snapshot prior to corruption and click **Restore this version**.
4. Refresh GUDORIA ERP to sync live values.
