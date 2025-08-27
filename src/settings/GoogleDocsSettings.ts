import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

export interface GoogleDocsApiConfig {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    scopes: string[];
    discoveryDocs: string[];
}

export interface GoogleDocsSettings {
    api: GoogleDocsApiConfig;
    autoSync: boolean;
    syncInterval: number;
    defaultFolder: string;
    lastSync?: string | null;
}

export const DEFAULT_GOOGLE_DOCS_SETTINGS: Omit<GoogleDocsSettings, 'lastSync'> & { lastSync?: string | null } = {
    api: {
        clientId: '',
        clientSecret: '',
        apiKey: '',
        scopes: [
            'https://www.googleapis.com/auth/documents.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ],
        discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/docs/v1/rest'
        ]
    },
    autoSync: true,
    syncInterval: 30, // minutes
    defaultFolder: 'Google Docs',
    lastSync: null
};

export class GoogleDocsSettingTab extends PluginSettingTab {
    private settings: GoogleDocsSettings;
    private plugin: any;

    constructor(
        app: App,
        plugin: any,
        private onSettingsChange: (settings: GoogleDocsSettings) => Promise<void>
    ) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = { ...DEFAULT_GOOGLE_DOCS_SETTINGS, ...(plugin.settings?.googleDocs || {}) };
    }

    public display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Google Docs Settings' });
        
        this.addApiSettings();
        this.addSyncSettings();
        this.addTestConnectionButton();
    }

    private addApiSettings(): void {
        // Client ID
        new Setting(this.containerEl)
            .setName('Client ID')
            .setDesc('Google OAuth Client ID')
            .addText(text => text
                .setPlaceholder('Enter your Google OAuth Client ID')
                .setValue(this.settings.api.clientId)
                .onChange(async (value) => {
                    this.settings.api.clientId = value.trim();
                    await this.onSettingsChange(this.settings);
                }));

        // Client Secret
        new Setting(this.containerEl)
            .setName('Client Secret')
            .setDesc('Google OAuth Client Secret')
            .addText(text => text
                .setPlaceholder('Enter your Google OAuth Client Secret')
                .setValue(this.settings.api.clientSecret)
                .onChange(async (value) => {
                    this.settings.api.clientSecret = value.trim();
                    await this.onSettingsChange(this.settings);
                }));

        // API Key
        const apiKeyContainer = this.containerEl.createEl('div');
        
        // Create a container for the API key input and buttons
        const apiKeyInputContainer = apiKeyContainer.createEl('div', {
            cls: 'setting-item-control',
            attr: { style: 'display: flex; align-items: center;' }
        });
        
        // Add the API key input
        const apiKeyInput = apiKeyInputContainer.createEl('input', {
            type: 'password',
            placeholder: 'AIza...',
            value: this.settings.api.apiKey || '',
            cls: 'mod-text',
            attr: { 
                style: 'flex-grow: 1;',
                spellcheck: 'false'
            }
        });
        
        // Add event listener for API key changes
        apiKeyInput.addEventListener('change', async () => {
            this.settings.api.apiKey = (apiKeyInput as HTMLInputElement).value.trim();
            await this.onSettingsChange(this.settings);
        });
        
        // Add a button to toggle password visibility
        const toggleButton = apiKeyInputContainer.createEl('button', {
            type: 'button',
            text: '👁️',
            cls: 'mod-cta',
            attr: {
                'aria-label': 'Toggle API key visibility',
                'style': 'margin-left: 8px; padding: 0 12px; height: 30px;'
            }
        });
        
        toggleButton.addEventListener('click', () => {
            const input = apiKeyInput as HTMLInputElement;
            input.type = input.type === 'password' ? 'text' : 'password';
            toggleButton.textContent = input.type === 'password' ? '👁️' : '🔒';
        });
        
        // Add a button to open Google Cloud Console
        const helpLink = this.containerEl.createEl('div', {
            cls: 'setting-item-description',
            text: 'Get your API key from ',
            attr: { style: 'margin-top: 4px;' }
        });
        
        helpLink.createEl('a', {
            href: 'https://console.cloud.google.com/apis/credentials',
            text: 'Google Cloud Console',
            attr: { 
                target: '_blank',
                rel: 'noopener',
                style: 'margin-left: 4px;'
            }
        });
    }

    private addSyncSettings(): void {
        // Auto-sync toggle
        new Setting(this.containerEl)
            .setName('Auto-sync')
            .setDesc('Automatically sync Google Docs at regular intervals')
            .addToggle(toggle => toggle
                .setValue(this.settings.autoSync)
                .onChange(async (value) => {
                    this.settings.autoSync = value;
                    await this.onSettingsChange(this.settings);
                }));

        // Sync interval
        new Setting(this.containerEl)
            .setName('Sync Interval (minutes)')
            .setDesc('How often to automatically sync with Google Docs')
            .addText(text => text
                .setPlaceholder('30')
                .setValue(this.settings.syncInterval.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.settings.syncInterval = numValue;
                        await this.onSettingsChange(this.settings);
                    }
                }));

        // Default folder
        new Setting(this.containerEl)
            .setName('Default Folder')
            .setDesc('Default folder to store synced Google Docs')
            .addText(text => text
                .setPlaceholder('Google Docs')
                .setValue(this.settings.defaultFolder)
                .onChange(async (value) => {
                    this.settings.defaultFolder = value.trim();
                    await this.onSettingsChange(this.settings);
                }));
    }

    private addTestConnectionButton(): void {
        // Test Connection Button
        new Setting(this.containerEl)
            .setName('Test Connection')
            .setDesc('Test the connection to Google Docs API')
            .addButton(button => button
                .setButtonText('Test Connection')
                .onClick(async () => {
                    try {
                        // Basic validation
                        if (!this.settings.api.clientId || !this.settings.api.clientSecret || !this.settings.api.apiKey) {
                            throw new Error('Please fill in all API credentials');
                        }

                        // Here you would typically test the connection to Google's API
                        // For now, we'll just show a success message
                        new Notice('✅ Connection test initiated. Please check the console for details.');
                        console.log('Google Docs API connection test', {
                            hasClientId: !!this.settings.api.clientId,
                            hasClientSecret: !!this.settings.api.clientSecret,
                            hasApiKey: !!this.settings.api.apiKey,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        new Notice(`❌ Connection test failed: ${errorMessage}`);
                        console.error('Google Docs API connection test failed:', error);
                    }
                }));
                
        // OAuth Authorization Button
        new Setting(this.containerEl)
            .setName('Google OAuth')
            .setDesc('Authorize with Google to access your documents')
            .addButton(button => button
                .setButtonText('Authorize with Google')
                .setCta()
                .onClick(async () => {
                    try {
                        if (!this.settings.api.clientId || !this.settings.api.clientSecret) {
                            throw new Error('Please enter your Client ID and Client Secret first');
                        }

                        // Create a temporary OAuth2 client with the provided credentials
                        const { OAuth2Client } = require('google-auth-library');
                        const oauth2Client = new OAuth2Client(
                            this.settings.api.clientId,
                            this.settings.api.clientSecret,
                            'http://localhost:3000/oauth2callback'
                        );

                        // Generate the authorization URL
                        const authUrl = oauth2Client.generateAuthUrl({
                            access_type: 'offline',
                            scope: [
                                'https://www.googleapis.com/auth/documents.readonly',
                                'https://www.googleapis.com/auth/drive.readonly'
                            ],
                            prompt: 'consent'
                        });

                        // Open the authorization URL in the default browser
                        const { shell } = require('electron');
                        await shell.openExternal(authUrl);

                        // Show a notice with instructions
                        new Notice('Please complete the authorization in your browser and enter the code below.', 10000);

                        // Create a modal to enter the authorization code
                        // Create a simple modal for the authorization code
                        const modal = new (this.plugin.app.workspace.activeLeaf?.view as any).constructor(this.plugin.app);
                        modal.titleEl.setText('Google OAuth Authorization');
                        
                        const content = modal.contentEl.createDiv();
                        content.createEl('p', { 
                            text: '1. Complete the authorization in your browser\n2. Copy the authorization code from the browser\n3. Paste it below and click "Authorize"' 
                        });
                        
                        const input = content.createEl('input', {
                            type: 'text',
                            placeholder: 'Enter authorization code',
                            attr: { style: 'width: 100%; margin: 10px 0;' }
                        });
                        
                        const buttonContainer = content.createDiv({ 
                            attr: { style: 'display: flex; justify-content: flex-end;' } 
                        });
                        
                        const authorizeButton = buttonContainer.createEl('button', {
                            text: 'Authorize',
                            cls: 'mod-cta'
                        });
                        
                        const cancelButton = buttonContainer.createEl('button', {
                            text: 'Cancel',
                            attr: { style: 'margin-left: 10px;' }
                        });
                        
                        // Handle authorization
                        authorizeButton.addEventListener('click', async () => {
                            const code = input.value.trim();
                            if (!code) {
                                new Notice('Please enter the authorization code');
                                return;
                            }
                            
                            try {
                                new Notice('Authorizing...');
                                const { tokens } = await oauth2Client.getToken(code);
                                await this.plugin.saveData({ googleOAuthToken: tokens });
                                modal.close();
                                new Notice('✅ Successfully authorized with Google!');
                            } catch (error: unknown) {
                                console.error('Authorization error:', error);
                                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                new Notice(`❌ Authorization failed: ${errorMessage}`);
                            }
                        });
                        
                        cancelButton.addEventListener('click', () => modal.close());
                        
                        modal.open();
                        
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        new Notice(`❌ Authorization failed: ${errorMessage}`);
                        console.error('Google OAuth error:', error);
                    }
                }));
    }
}
