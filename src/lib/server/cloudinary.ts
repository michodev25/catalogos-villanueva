const thumbnailTransform = { crop: "limit", width: 480, quality: "auto:good" };

function cloudinaryConfig(connectionUrl: string) {
  try {
    const url = new URL(connectionUrl);
    if (
      /^cloudinary:\/\//i.test(connectionUrl) &&
      url.username &&
      url.password &&
      /^[a-z0-9_-]+$/i.test(url.hostname)
    ) {
      return {
        cloud_name: url.hostname,
        api_key: decodeURIComponent(url.username),
        api_secret: decodeURIComponent(url.password),
      };
    }
  } catch {
    // Connection details are private. Return a message without the invalid value.
  }
  throw new Error("Configura CLOUDINARY_URL en el servidor para conectar las fotos.");
}

export function cloudinaryPublicId(path: string) {
  const id = /^cloudinary:([a-f0-9-]{36})$/.exec(path)?.[1];
  return id ? `villanueva/${id}` : null;
}

export async function cloudinaryDeliveryUrl(connectionUrl: string, publicId: string, thumbnail: boolean) {
  const config = cloudinaryConfig(connectionUrl);
  // The SDK reads CLOUDINARY_URL when it loads. Load it only after validation.
  const { v2: cloudinary } = await import("cloudinary");
  return cloudinary.url(publicId, {
    ...config,
    secure: true,
    type: "authenticated",
    sign_url: true,
    format: "webp",
    transformation: thumbnail ? [thumbnailTransform] : [],
  });
}

export async function uploadCloudinaryPhoto(connectionUrl: string, id: string, buffer: Buffer) {
  const path = `cloudinary:${id}`;
  const options = {
    ...cloudinaryConfig(connectionUrl),
    resource_type: "image" as const,
    type: "authenticated",
    public_id: cloudinaryPublicId(path)!,
    overwrite: false,
    eager: [{ ...thumbnailTransform, format: "webp" }],
  };
  const { v2: cloudinary } = await import("cloudinary");
  return new Promise<string>((resolve, reject) => {
    const fail = () => reject(new Error("No se pudo subir la foto a Cloudinary. Inténtalo de nuevo."));
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) fail();
      else resolve(path);
    });
    stream.once("error", fail).end(buffer);
  });
}

export async function removeCloudinaryPhoto(connectionUrl: string, publicId: string) {
  const config = cloudinaryConfig(connectionUrl);
  const { v2: cloudinary } = await import("cloudinary");
  await cloudinary.uploader.destroy(publicId, {
    ...config,
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
}
