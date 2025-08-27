import { Notice, Plugin, Editor, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { google } from 'googleapis';
import { SimpleGoogleAuth } from './src/utils/SimpleGoogleAuth';

// Environment variables are now handled by esbuild configuration
import { BacklinkUrlService } from './src/services/backlinkUrlService';
// Import modals
import { BatchDirectoryModal } from './src/modals/BatchDirectoryModal';
import { CurrentFileModal } from './src/modals/CurrentFileModal';
import { GoogleDocImportModal } from './src/modals/GoogleDocImportModal';
// Import settings
import { GoogleDocsSettings, DEFAULT_GOOGLE_DOCS_SETTINGS, GoogleDocsSettingTab } from './src/settings/GoogleDocsSettings';
// Import your utilities here
// import { yourUtility } from './src/utils/yourUtility';

interface GoogleDocsPluginSettings {
    googleDocs: GoogleDocsSettings;
}

export default class GoogleDocsPlugin extends Plugin {
    private settings: GoogleDocsPluginSettings = { googleDocs: { ...DEFAULT_GOOGLE_DOCS_SETTINGS } };
    
    private async loadSettings() {
        this.settings = Object.assign(
            { googleDocs: { ...DEFAULT_GOOGLE_DOCS_SETTINGS } },
            await this.loadData()
        );
    }
    
    private async saveSettings() {
        await this.saveData(this.settings);
    }
    
    private handleSettingsChange = async (settings: GoogleDocsSettings) => {
        this.settings.googleDocs = settings;
        await this.saveSettings();
    };
    
    private async openGoogleDocs() {
        new GoogleDocImportModal(this.app, this.importGoogleDoc.bind(this)).open();
    }

    private googleAuth!: SimpleGoogleAuth;

    async onload(): Promise<void> {
        console.log('Loading Google Docs plugin');
        
        // Initialize Google Auth
        this.googleAuth = new SimpleGoogleAuth(this);
        
        // Load settings
        await this.loadSettings();
        
        // Add settings tab
        this.addSettingTab(new GoogleDocsSettingTab(
            this.app,
            this,
            this.handleSettingsChange.bind(this)
        ));
        
        // Load CSS
        this.loadStyles();
        
        // Add ribbon icon for Google Docs
        const ribbonIconEl = this.addRibbonIcon(
            'file-text',
            'Open Google Docs',
            () => {
                this.openGoogleDocs();
            }
        );
        
        // Add command to import Google Doc
        this.addCommand({
            id: 'import-google-doc',
            name: 'Import Google Doc',
            callback: () => {
                new GoogleDocImportModal(this.app, this.importGoogleDoc.bind(this)).open();
            }
        });

        // Add command to process backlinks
        this.addCommand({
            id: 'process-backlink',
            name: 'Process Backlink',
            editorCallback: async (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
                const backlinkService = new BacklinkUrlService(this.app);
                const result = await backlinkService.processBacklinkAtCursor(editor);
                
                if (result.success) {
                    new Notice(result.message, 4000);
                } else {
                    new Notice(result.message, 5000);
                }
            }
        });
        
        if (ribbonIconEl) {
            ribbonIconEl.addClass('insert-backlink-url-ribbon-icon');
        }
        
        // Register command to open Batch Directory Modal
        this.addCommand({
            id: 'open-batch-directory-modal',
            name: 'Open Batch Directory Modal',
            callback: () => {
                new BatchDirectoryModal(this.app).open();
            }
        });

        // Register command to open Current File Modal
        this.addCommand({
            id: 'open-current-file-modal',
            name: 'Open Current File Modal',
            editorCallback: (editor: Editor) => {
                new CurrentFileModal(this.app, editor).open();
            }
        });
    }

    private async importGoogleDoc(docId: string) {
        try {
            new Notice(`Importing Google Doc: ${docId}...`);
            
            // Check if environment variables are set
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
                throw new Error('Missing required environment variables. Please check your .env file.');
            }

            // Get authenticated client
            const auth = await this.googleAuth.getAuthClient();
            const docs = google.docs({ version: 'v1', auth });
            
            // Get the document
            const doc = await docs.documents.get({
                documentId: docId
            });
            
            // Convert to markdown (simplified)
            const title = doc.data.title || 'Untitled Document';
            let content = `# ${title}\n\n`;
            
            // Process document content (you'll want to enhance this)
            if (doc.data.body?.content) {
                content += this.extractText(doc.data.body.content);
            }
            
            // Create a new note with the content
            const filePath = `${this.settings.googleDocs.defaultFolder}/${title}.md`;
            await this.app.vault.create(filePath, content);
            
            new Notice(`Successfully imported: ${title}`);
            
        } catch (error) {
            console.error('Error importing Google Doc:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`Error importing document: ${errorMessage}`);
        }
    }
    
    private extractText(content: any[]): string {
        // This is a simplified version - you'll want to enhance this
        // to handle different types of content (paragraphs, lists, etc.)
        return content
            .map(item => {
                if (item.paragraph) {
                    return item.paragraph.elements
                        .map((el: any) => el.textRun?.content || '')
                        .join('');
                }
                return '';
            })
            .join('\n\n');
    }
    
    private loadStyles() {
        // Obsidian automatically loads styles.css from the plugin directory
        // This method can be used to add additional dynamic styles if needed
        
        // Example of adding dynamic styles:
        // this.addStyle(`
        //     .my-plugin-class {
        //         color: var(--text-accent);
        //     }
        // `);
        
        console.log('Plugin styles loaded - styles.css is automatically loaded by Obsidian');
    }
}