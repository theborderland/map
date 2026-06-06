export function formatDate(
        timeStamp: any,
        styleDate: 'full' | 'long' | 'medium' | 'short' = 'short',
        styleTime: 'full' | 'long' | 'medium' | 'short' = 'short',
    ): string {
        let date = new Date(Date.parse(timeStamp));
        let formatted: string = date.toLocaleString('sv', { dateStyle: styleDate, timeStyle: styleTime });
        return formatted;
    }