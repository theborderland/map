import { REPOSITORY_URL_OVERRIDE } from '../../SETTINGS';

export class AdminAPI {
    private ENTITY_API_ADDRESS = (REPOSITORY_URL_OVERRIDE ? REPOSITORY_URL_OVERRIDE : process.env.API_URL) + '/api/v1/admin';

    public async isEditAllowed(): Promise<boolean> {
        try {
            const res = await fetch(this.ENTITY_API_ADDRESS + '/is-edit-enabled');
            if (!res.ok)
                throw new Error('Response not ok');

            const data = await res.json();

            if (typeof data !== 'boolean')
                throw new Error('Invalid data type');

            return data;
        } catch {
            return false;
        }
    }

    public async isEditButtonSecretSet(): Promise<boolean> {
        const res = await fetch(this.ENTITY_API_ADDRESS + '/edit-button-secret-set');
        if (!res.ok)
            throw new Error('Response not ok');

        const data = await res.json();

        if (typeof data !== 'boolean')
            throw new Error('Invalid data type');

        return data;
    }

    public async CheckIfSecretIsSet(secret: string): Promise<boolean> {
        try {
            const res = await fetch(this.ENTITY_API_ADDRESS + '/edit-button-secret', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(secret),
            });

            return res.ok;
        }
        catch {
            return false;
        }
    }

    public async getEditText(): Promise<string> {
        try {
            const res = await fetch(this.ENTITY_API_ADDRESS + '/edit-text');
            if (!res.ok)
                throw new Error('Response not ok');

            const data = await res.text();

            if (typeof data !== 'string')
                throw new Error('Invalid data type');

            return data;
        } catch {
            return '';
        }
    }
}