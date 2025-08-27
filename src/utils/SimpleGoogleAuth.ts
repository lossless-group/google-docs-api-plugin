import { Notice } from 'obsidian';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as path from 'path';

export class SimpleGoogleAuth {
    private client: OAuth2Client;
    private tokenKey = 'google-docs-token';
    private plugin: any;

    constructor(plugin: any) {
        this.plugin = plugin;
        
        // Load environment variables
        const envPath = path.resolve(process.cwd(), '.env');
        dotenv.config({ path: envPath });
        
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
        
        if (!clientId || !clientSecret) {
            console.error('Missing required environment variables. Please check your .env file.');
            console.log('Current working directory:', process.cwd());
            console.log('Environment variables:', {
                GOOGLE_CLIENT_ID: clientId ? '*** (set)' : 'Not set',
                GOOGLE_CLIENT_SECRET: clientSecret ? '*** (set)' : 'Not set',
                GOOGLE_REDIRECT_URI: redirectUri
            });
            throw new Error('Missing required Google OAuth credentials. Please check your .env file.');
        }
        
        this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
    }

    public async getAuthClient(): Promise<OAuth2Client> {
        // Try to load token from plugin data
        const token = await this.plugin.loadData(this.tokenKey);
        if (token) {
            this.client.setCredentials(token);
            return this.client;
        }
        
        // If no token, start the OAuth flow
        return this.startOAuthFlow();
    }

    private async startOAuthFlow(): Promise<OAuth2Client> {
        const authUrl = this.client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/documents.readonly'],
            prompt: 'consent'
        });

        // Open the authorization URL in the default browser
        const { shell } = require('electron');
        await shell.openExternal(authUrl);

        // Use a simple prompt to get the authorization code
        const code = await new Promise<string>((resolve) => {
            const modal = new (this.plugin.app as any).plugins.plugins['google-docs'].Modal(this.plugin.app);
            
            modal.titleEl.setText('Google OAuth');
            modal.contentEl.createEl('p', { 
                text: 'Please authorize the app and enter the code from the browser window.' 
            });
            
            const input = modal.contentEl.createEl('input', {
                type: 'text',
                placeholder: 'Enter authorization code'
            });
            
            modal.contentEl.createEl('button', {
                text: 'Submit',
                cls: 'mod-cta'
            }).addEventListener('click', () => {
                const code = input.value.trim();
                if (code) {
                    resolve(code);
                    modal.close();
                }
            });
            
            modal.open();
        });

        try {
            const { tokens } = await this.client.getToken(code);
            await this.plugin.saveData(this.tokenKey, tokens);
            this.client.setCredentials(tokens);
            return this.client;
        } catch (error) {
            console.error('Error getting tokens:', error);
            new Notice('Failed to authenticate with Google. Please try again.');
            throw error;
        }
    }
}
