export function setCookie(name: string, value: string, expiresInDays: number): void {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (expiresInDays !== undefined) {
        const expires = new Date();
        expires.setDate(expires.getDate() + expiresInDays);
        cookie += `; expires=${expires.toUTCString()}`;
    }

    cookie += `; path=/`;

    document.cookie = cookie;
}

export function getCookie(name: string): string | null {
    const match = document.cookie
        .split("; ")
        .find(row => row.startsWith(`${encodeURIComponent(name)}=`));

    return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function deleteCookie(name: string): void {
    setCookie(name, "", -1);
}