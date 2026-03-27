Day 4 tasks for OpenClaw Manager project. Complete ALL of the following:

## Task 1: Fix Ant Design deprecated API warnings
Search all .tsx files and fix these deprecations:
- Steps: use `content` instead of `description` prop
- Space: use `orientation` instead of `direction` prop in compact mode
- Alert: use `title` instead of `message` prop

## Task 2: Implement M9 Health Monitor page
Create `src/pages/Health/index.tsx` with:
1. Diagnostics Panel: Check Node.js, OpenClaw, Gateway status (reusing existing system detection from M1)
2. Status Cards: Display results with OK/warning/error icons
3. One-click Fix button: For each issue found, with confirmation dialog before running
4. Log Viewer: Real-time log display panel (simple text area showing gateway logs)
5. Add route: `/health` in App.tsx
6. Add nav item in Layout sidebar
7. Create corresponding Tauri commands in `src-tauri/src/commands/health.rs`:
   - `run_diagnosis` - returns diagnostic results as JSON
   - `fix_issue(issue_id)` - attempts to fix a specific issue
   - `get_logs(lines)` - returns last N lines of gateway logs (sanitize API keys/tokens to `***`)
8. Register health commands in main.rs

## Task 3: Implement M10 Backup & Restore page
Create `src/pages/Backup/index.tsx` with:
1. Create Backup: Button to create encrypted backup with password input (show/hide toggle), progress bar, filename: `openclaw-backup-YYYY-MM-DD-HHmmss.ocbak`
2. Backup List: Show existing .ocbak files from a backups directory
3. Restore: Select backup file, enter password, confirm dialog. Must stop Gateway before restore, auto-restart after restore
4. Add route: `/backup` in App.tsx
5. Add nav item in Layout sidebar
6. Create Tauri commands in `src-tauri/src/commands/backup.rs`:
   - `create_backup(password)` - creates AES-256-GCM encrypted tar of openclaw dir (excluding node_modules, sessions, .git)
   - `list_backups()` - lists backup files with metadata
   - `restore_backup(file_path, password)` - decrypt and restore
   - `get_backup_progress()` - returns current backup progress percentage
7. Add dependencies to Cargo.toml: `aes-gcm`, `tar`
8. Register backup commands in main.rs

## Task 4: Setup page - restore Chinese text
Rewrite `src/pages/Setup/index.tsx` to use Chinese labels properly.

## Important constraints:
- TypeScript must compile with 0 errors
- Rust must pass `cargo check` with 0 errors
- Do NOT modify the chat page or routing
- Use Ant Design components consistently with existing pages
- Follow the existing code patterns (useAppStore, services/tauri.ts, types/)
- Write all files using UTF-8 encoding