import { App, Modal, Setting } from 'obsidian';

export class GoogleDocImportModal extends Modal {
    private docId: string = '';
    private onImport: (docId: string) => Promise<void>;

    constructor(app: App, onImport: (docId: string) => Promise<void>) {
        super(app);
        this.onImport = onImport;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Import Google Doc' });

        new Setting(contentEl)
            .setName('Google Doc ID or URL')
            .setDesc('Paste the document ID or full URL')
            .addText(text => text
                .setPlaceholder('e.g., 1xYw... or https://docs.google.com/...')
                .onChange(value => {
                    this.docId = this.extractDocId(value);
                }));

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Import')
                .setCta()
                .onClick(async () => {
                    if (this.docId) {
                        await this.onImport(this.docId);
                        this.close();
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private extractDocId(input: string): string {
        // If it's a URL, extract the document ID
        const urlMatch = input.match(/[\/\-][\w-]{25,}(?!.*[\/\-][\w-]{25,})/);
        if (urlMatch) {
            return urlMatch[0].substring(1); // Remove the leading slash or dash
        }
        // Otherwise, assume it's already a document ID
        return input.trim();
    }
}
