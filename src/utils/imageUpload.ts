import { POWER_IMAGE_UPLOAD_URL } from '../../SETTINGS'

interface UploadFileResponse {
    url: string;
    filename: string;
}
/**
 * Upload power diagram image to power team api
 * @param file 
 * @returns 
 */
export function uploadPowerImage(file: File): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return fetch(POWER_IMAGE_UPLOAD_URL, {
        method: "POST",
        body: formData,
    }).then((response) => {
        if (!response.ok) {
            return response.json().then((error) => {
                throw new Error(error.detail?.[0]?.msg ?? "Upload failed");
            });
        }
        return response.json() as Promise<UploadFileResponse>;
    });
}