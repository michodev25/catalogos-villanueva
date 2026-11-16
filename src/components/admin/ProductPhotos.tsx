import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import {
  maxPhotoBytes,
  maxProductPhotos,
  photoTypes,
  productImagePaths,
  productImageUrl,
  type Product,
} from "../../lib/catalog";

export type PhotoDraft = { path: string } | { file: File; id: string };

export function savedPhotos(product: Product): PhotoDraft[] {
  return productImagePaths(product).map((path) => ({ path }));
}

async function fitPhoto(file: File, maxBytes: number) {
  if (file.size <= maxBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      for (const reduction of [1, 0.75, 0.5, 0.4]) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale * reduction));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale * reduction));
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.86),
        );
        if (blob && blob.size <= maxBytes)
          return new File([blob], file.name, { type: blob.type });
      }
    } finally {
      bitmap.close();
    }
  } catch {
    // Decode and canvas failures need the same recovery in the editor.
  }
  throw new Error(`No se pudo preparar «${file.name}». Prueba con otra foto o reduce su tamaño.`);
}

export async function appendPhotoUploads(form: FormData, photos: PhotoDraft[]) {
  form.set("photoOrder", JSON.stringify(photos.map((photo) => "path" in photo ? photo.path : null)));
  const files = photos.flatMap((photo) => "file" in photo ? [photo.file] : []);
  // Leave room for multipart headers and the other form fields.
  const uploadBudget = 4_000_000;
  const needsCompression = files.reduce((total, file) => total + file.size, 0) > uploadBudget;
  for (const file of files) {
    form.append("photos", needsCompression ? await fitPhoto(file, uploadBudget / files.length) : file);
  }
}

function NewPhotoPreview({ file }: { file: File }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} alt="" /> : null;
}

export default function ProductPhotos({ product, photos, disabled, onChange, onError }: {
  product: Product;
  photos: PhotoDraft[];
  disabled: boolean;
  onChange: (photos: PhotoDraft[]) => void;
  onError: (message: string) => void;
}) {
  const originalPaths = productImagePaths(product);
  function move(from: number, to: number) {
    const next = [...photos];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  }
  return (
    <section className="form-section">
      <h2>Fotos del producto</h2>
      <p className="field-hint">La primera foto será la portada del catálogo.</p>
      {photos.length > 0 && (
        <ol className="admin-photo-list" aria-label="Orden de las fotos">
          {photos.map((photo, index) => {
            const position = index + 1;
            return (
              <li key={"path" in photo ? photo.path : photo.id}>
                <div className="admin-photo-thumb">
                  {"path" in photo ? (
                    <img src={productImageUrl(product, originalPaths.indexOf(photo.path), true)} alt="" />
                  ) : (
                    <NewPhotoPreview file={photo.file} />
                  )}
                </div>
                <span>{index === 0 ? "Foto principal" : `Foto ${position}`}</span>
                <div className="admin-photo-actions">
                  <button className="icon-button" type="button"
                    aria-label={`Adelantar foto ${position}`} title={`Adelantar foto ${position}`}
                    disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button className="icon-button" type="button"
                    aria-label={`Atrasar foto ${position}`} title={`Atrasar foto ${position}`}
                    disabled={disabled || index === photos.length - 1} onClick={() => move(index, index + 1)}>
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <button className="icon-button" type="button"
                    aria-label={`Quitar foto ${position}`} title={`Quitar foto ${position}`}
                    disabled={disabled} onClick={() => onChange(photos.filter((_, i) => i !== index))}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <label className="upload-label">
        <ImagePlus size={18} aria-hidden="true" />
        {photos.length === maxProductPhotos ? "Máximo de 3 fotos" : "Añadir fotos"}
        <input type="file" multiple accept={photoTypes.join(",")}
          aria-label="Subir foto del producto" aria-describedby="product-photo-hint"
          disabled={disabled || photos.length === maxProductPhotos}
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (!selected.length) return;
            if (photos.length + selected.length > maxProductPhotos) {
              onError("Puedes guardar hasta tres fotos por producto.");
            } else if (selected.some((file) => !file.size || file.size > maxPhotoBytes || !photoTypes.includes(file.type))) {
              onError("Elige fotos JPG, PNG o WebP de hasta 8 MB cada una.");
            } else {
              onChange([...photos, ...selected.map((file) => ({ file, id: crypto.randomUUID() }))]);
            }
          }}
        />
      </label>
      <p className="field-hint" id="product-photo-hint">Hasta 3 fotos JPG, PNG o WebP de 8 MB cada una.</p>
    </section>
  );
}
