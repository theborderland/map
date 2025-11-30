import { REPOSITORY_URL } from '../../SETTINGS';

export class AdminAPI {
    private static ENTITY_API_ADDRESS = REPOSITORY_URL + '/api/v1/admin';

    public static async isEditAllowed(): Promise<boolean> {
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

    public static async getEditText(): Promise<string> {
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