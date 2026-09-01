/**
 * Client-side helper to upload any file (documents, logos, social media posters, media, attachments)
 * directly to Cloudflare R2 storage via our upload API.
 */

export interface UploadFileOptions {
  folder?: "documents" | "logos" | "posters" | "avatars" | "files" | "attachments" | string;
  workspaceId?: string;
  onProgress?: (percent: number) => void;
}

export interface UploadResult {
  success: boolean;
  fileUrl: string;
  url: string;
  key: string;
  name: string;
  size: number;
  type: string;
  error?: string;
}

export async function uploadFileToR2(
  file: File,
  options: UploadFileOptions = {}
): Promise<UploadResult> {
  const { folder = "files", workspaceId = "default", onProgress } = options;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("workspaceId", workspaceId);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            fileUrl: response.fileUrl || response.url,
            url: response.fileUrl || response.url,
            key: response.key,
            name: response.name || file.name,
            size: response.size || file.size,
            type: response.type || file.type,
          });
        } catch {
          resolve({
            success: false,
            fileUrl: "",
            url: "",
            key: "",
            name: file.name,
            size: file.size,
            type: file.type,
            error: "Failed to parse upload response",
          });
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          resolve({
            success: false,
            fileUrl: "",
            url: "",
            key: "",
            name: file.name,
            size: file.size,
            type: file.type,
            error: errRes.error || `Upload failed with status ${xhr.status}`,
          });
        } catch {
          resolve({
            success: false,
            fileUrl: "",
            url: "",
            key: "",
            name: file.name,
            size: file.size,
            type: file.type,
            error: `Upload failed with status ${xhr.status}`,
          });
        }
      }
    });

    xhr.addEventListener("error", () => {
      resolve({
        success: false,
        fileUrl: "",
        url: "",
        key: "",
        name: file.name,
        size: file.size,
        type: file.type,
        error: "Network error during upload",
      });
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}
